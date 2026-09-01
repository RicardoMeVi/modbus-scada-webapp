using System.Net.Sockets;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using ModbusScada.Api.Data;
using ModbusScada.Api.Hubs;
using ModbusScada.Api.Models;
using ModbusScada.Api.Services.Modbus;
using NModbus;

namespace ModbusScada.Api.Services;

// Lee periódicamente los dispositivos Modbus (TCP o RTU) configurados en la
// base de datos (tabla Dispositivos/RegistrosModbus) y publica cada lectura
// a los clientes conectados vía SignalR, además de persistirla como
// histórico.
public class ModbusPollingService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHubContext<ModbusHub> _hubContext;
    private readonly ILogger<ModbusPollingService> _logger;
    private readonly IModbusConnectionFactory _connectionFactory;
    private readonly ModbusFactory _modbusFactory = new();
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(5);

    // Los campos de Datos del sitio/SMS/FTP casi no cambian (se editan una
    // vez por sitio, no varían solos) -- a diferencia de los registros
    // dinámicos, no hace falta leerlos cada 5s. Sumarles ~16 lecturas extra
    // a cada ciclo saturaría innecesariamente un bus RS-485 compartido.
    // Se leen 1 de cada 6 ciclos (~cada 30s).
    private const int CiclosPorLecturaDeSitio = 6;

    // El registro Modbus de Fecha/Hora de la UTD es una foto fija -- el
    // manual del Interrogador documenta que la UTD NO lo actualiza sola con
    // el tiempo real, solo cuando alguien le escribe un valor nuevo
    // explícitamente (flujo "Modificar"/"OK"). Sin esto, lo que se ve acá
    // nunca coincide con el reloj real de la pantalla física de la UTD,
    // que sí tickea solo (lee su reloj interno directo, sin pasar por el
    // espejo). Cada tantos ciclos, el backend hace de "Interrogador
    // automático": le escribe la hora actual, imitando el mismo gesto
    // manual. Cada ~5 min (no cada ciclo) para no pisar una edición manual
    // reciente del usuario ni saturar el bus con escrituras constantes.
    private const int CiclosPorSincronizarReloj = 60;
    private int _ciclo;

    public ModbusPollingService(
        IServiceScopeFactory scopeFactory,
        IHubContext<ModbusHub> hubContext,
        ILogger<ModbusPollingService> logger,
        IModbusConnectionFactory connectionFactory)
    {
        _scopeFactory = scopeFactory;
        _hubContext = hubContext;
        _logger = logger;
        _connectionFactory = connectionFactory;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(PollInterval);

        while (!stoppingToken.IsCancellationRequested &&
               await timer.WaitForNextTickAsync(stoppingToken))
        {
            await PollAllDevicesAsync(stoppingToken);
        }
    }

    private async Task PollAllDevicesAsync(CancellationToken stoppingToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var dispositivos = await db.Dispositivos
            .Include(d => d.Registros)
            .ToListAsync(stoppingToken);

        bool leerConfigSitio = _ciclo % CiclosPorLecturaDeSitio == 0;
        bool sincronizarReloj = _ciclo % CiclosPorSincronizarReloj == 0;
        _ciclo++;

        foreach (var dispositivo in dispositivos)
        {
            try
            {
                await PollDeviceAsync(db, dispositivo, leerConfigSitio, sincronizarReloj, stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Fallo al leer dispositivo {Nombre} ({Ip}:{Puerto})",
                    dispositivo.Nombre, dispositivo.IpAddress, dispositivo.Puerto);
            }
        }
    }

    private async Task PollDeviceAsync(AppDbContext db, Dispositivo dispositivo, bool leerConfigSitio, bool sincronizarReloj, CancellationToken stoppingToken)
    {
        if (dispositivo.Conexion == TipoConexion.Rtu)
        {
            await PollDeviceRtuAsync(db, dispositivo, leerConfigSitio, sincronizarReloj, stoppingToken);
            return;
        }

        using var tcpClient = new TcpClient();
        await tcpClient.ConnectAsync(dispositivo.IpAddress!, dispositivo.Puerto, stoppingToken);
        using IModbusMaster master = _modbusFactory.CreateMaster(tcpClient);

        await LeerYPublicarRegistrosAsync(db, dispositivo, master, leerConfigSitio, sincronizarReloj, stoppingToken);
    }

    // A diferencia de TCP (conexión nueva y descartable por ciclo), el
    // master RTU es persistente -- lo entrega ModbusConnectionFactory, que
    // reutiliza el mismo SerialPort entre ciclos. Si algo falla durante la
    // lectura, se cierra la conexión para que el próximo ciclo la reabra
    // desde cero en vez de insistir con un puerto en mal estado.
    private async Task PollDeviceRtuAsync(AppDbContext db, Dispositivo dispositivo, bool leerConfigSitio, bool sincronizarReloj, CancellationToken stoppingToken)
    {
        var master = _connectionFactory.ObtenerMasterRtu(dispositivo);

        try
        {
            await LeerYPublicarRegistrosAsync(db, dispositivo, master, leerConfigSitio, sincronizarReloj, stoppingToken);
        }
        catch
        {
            _connectionFactory.CerrarConexionRtu(dispositivo.PuertoSerial!);
            throw;
        }
    }

    // Nombre -> cómo convertir DateTime.Now a lo que espera ese registro
    // (ver PlaceholderDeviceSeeder/MockDataSeeder para las direcciones:
    // Día=700, Mes=701, Año=702, Hora=703, Minutos=705, Segundos=707).
    private static readonly Dictionary<string, Func<DateTime, ushort>> CamposReloj = new()
    {
        ["Día"] = ahora => (ushort)ahora.Day,
        ["Mes"] = ahora => (ushort)ahora.Month,
        ["Año"] = ahora => (ushort)ahora.Year,
        ["Hora"] = ahora => (ushort)ahora.Hour,
        ["Minutos"] = ahora => (ushort)ahora.Minute,
        ["Segundos"] = ahora => (ushort)ahora.Second,
    };

    // Rango plausible por nombre de registro -- ver comentario donde se usa
    // (LeerYPublicarRegistrosAsync). Año va hasta 2099 nomás porque un
    // registro de 16 bits corrupto puede devolver cualquier cosa hasta
    // 65535; cualquier año fuera de este rango es obviamente un glitch, no
    // un valor real de la UTD.
    private static readonly Dictionary<string, (double Min, double Max)> RangosPlausibles = new()
    {
        ["Día"] = (1, 31),
        ["Mes"] = (1, 12),
        ["Año"] = (2000, 2099),
        ["Hora"] = (0, 23),
        ["Minutos"] = (0, 59),
        ["Segundos"] = (0, 59),
    };

    // Escribe la hora actual en los registros de Fecha/Hora del dispositivo
    // -- ver comentario de CiclosPorSincronizarReloj. Best-effort por campo,
    // igual que el resto de las escrituras de config: si el dispositivo no
    // tiene alguno de estos registros (ej. el simulador mock), simplemente
    // no hay nada que escribir para ese nombre.
    private async Task SincronizarRelojAsync(IModbusMaster master, Dispositivo dispositivo)
    {
        var ahora = DateTime.Now;

        foreach (var registro in dispositivo.Registros)
        {
            if (!CamposReloj.TryGetValue(registro.Nombre, out var obtenerValor)
                || registro.Tabla != TipoTablaModbus.HoldingRegister)
            {
                continue;
            }

            try
            {
                await master.WriteSingleRegisterAsync(dispositivo.SlaveId, (ushort)registro.Direccion, obtenerValor(ahora));
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "No se pudo sincronizar '{Campo}' (dirección {Direccion}) del dispositivo {Nombre}",
                    registro.Nombre, registro.Direccion, dispositivo.Nombre);
            }
        }
    }

    private async Task LeerYPublicarRegistrosAsync(
        AppDbContext db, Dispositivo dispositivo, IModbusMaster master, bool leerConfigSitio, bool sincronizarReloj, CancellationToken stoppingToken)
    {
        if (sincronizarReloj)
        {
            // Antes de leer, para que la lectura de este mismo ciclo (más
            // abajo) ya publique la hora recién sincronizada por SignalR,
            // en vez de esperar al próximo ciclo.
            await SincronizarRelojAsync(master, dispositivo);
        }

        if (leerConfigSitio)
        {
            // Actualiza las columnas fijas (Rfc, Nsm, SmsNumero, etc.) desde
            // el equipo real -- sin esto, esos campos solo reflejarían lo
            // último que alguien guardó desde la app, nunca lo que el
            // equipo realmente tiene. Best-effort por campo (ver
            // SiteConfigModbusIO), no aborta el resto del ciclo si falla.
            // Solo se marca como "fresca" (ConfiguracionSitioLeidaEn) si al
            // menos un campo se leyó y validó de verdad -- el front usa esa
            // marca para no mostrar como si fuera actual algo que en
            // realidad quedó guardado de una sesión vieja.
            if (await SiteConfigModbusIO.LeerCamposAsync(master, dispositivo, _logger))
            {
                dispositivo.ConfiguracionSitioLeidaEn = DateTime.UtcNow;
            }

            // ContrasenaUtd queda afuera de LeerCamposAsync (ver
            // ExcluirDeSondeoPasivo) porque también es el PIN de acceso a
            // la app -- esta función aparte sí la revisa, pero con doble
            // confirmación antes de aceptar un cambio (ver comentario en
            // SiteConfigModbusIO).
            await SiteConfigModbusIO.VerificarCambioDeContrasenaAsync(master, dispositivo, _logger);
        }

        foreach (var registro in dispositivo.Registros)
        {
            double valor = await LeerRegistroAsync(master, dispositivo.SlaveId, registro);

            // A diferencia de los campos de texto (SiteConfigModbusIO ya
            // valida formato/imprimibilidad), los registros numéricos como
            // Fecha/Hora no tenían ningún chequeo -- un glitch de un solo
            // registro (bit flip en RS-485) se aceptaba y publicaba igual.
            // Caso real: Año leyendo 2075 mientras Día/Mes/Hora/Min/Seg
            // daban valores plausibles -- el resto del mensaje llegó bien,
            // solo ese registro se corrompió. Mejor no publicar esta
            // lectura puntual (se reintenta el próximo ciclo, 5s después)
            // que mostrar una fecha imposible.
            if (RangosPlausibles.TryGetValue(registro.Nombre, out var rango) && (valor < rango.Min || valor > rango.Max))
            {
                _logger.LogWarning(
                    "Lectura descartada: '{Campo}' = {Valor} fuera de rango plausible ({Min}-{Max}), posible glitch de comunicación.",
                    registro.Nombre, valor, rango.Min, rango.Max);
                continue;
            }

            db.LecturasHistoricas.Add(new LecturaHistorica
            {
                RegistroModbusId = registro.Id,
                Valor = valor,
                Timestamp = DateTime.UtcNow
            });

            await _hubContext.Clients
                .All
                .SendAsync("lectura", new
                {
                    dispositivo.Id,
                    RegistroId = registro.Id,
                    registro.Nombre,
                    Valor = valor,
                    Timestamp = DateTime.UtcNow
                }, stoppingToken);
        }

        await db.SaveChangesAsync(stoppingToken);
    }

    private static async Task<double> LeerRegistroAsync(IModbusMaster master, byte slaveId, RegistroModbus registro)
    {
        ushort numRegistros = registro.TipoDato is TipoDatoModbus.UInt32 or TipoDatoModbus.Int32 or TipoDatoModbus.Float32
            ? (ushort)2
            : (ushort)1;

        ushort[] crudos = registro.Tabla switch
        {
            TipoTablaModbus.HoldingRegister => await master.ReadHoldingRegistersAsync(slaveId, (ushort)registro.Direccion, numRegistros),
            TipoTablaModbus.InputRegister => await master.ReadInputRegistersAsync(slaveId, (ushort)registro.Direccion, numRegistros),
            TipoTablaModbus.Coil => new[] { (await master.ReadCoilsAsync(slaveId, (ushort)registro.Direccion, 1))[0] ? (ushort)1 : (ushort)0 },
            TipoTablaModbus.DiscreteInput => new[] { (await master.ReadInputsAsync(slaveId, (ushort)registro.Direccion, 1))[0] ? (ushort)1 : (ushort)0 },
            _ => throw new NotSupportedException($"Tabla Modbus no soportada: {registro.Tabla}")
        };

        return ConvertirValor(crudos, registro.TipoDato, registro.OrdenBytes);
    }

    // Combina 1-2 registros de 16 bits según el tipo de dato y el orden de
    // bytes del fabricante (ABCD por defecto). Ver sección 4.4 de CONTEXTO.md.
    private static double ConvertirValor(ushort[] registros, TipoDatoModbus tipoDato, string? ordenBytes)
    {
        if (registros.Length == 1)
        {
            return tipoDato == TipoDatoModbus.Int16 ? (short)registros[0] : registros[0];
        }

        var (hi, lo) = (ordenBytes ?? "ABCD").ToUpperInvariant() switch
        {
            "DCBA" => (registros[1], registros[0]),
            _ => (registros[0], registros[1]) // ABCD (estándar)
        };

        uint combinado = ((uint)hi << 16) | lo;

        return tipoDato switch
        {
            TipoDatoModbus.Int32 => (int)combinado,
            TipoDatoModbus.Float32 => BitConverter.Int32BitsToSingle((int)combinado),
            _ => combinado // UInt32
        };
    }
}
