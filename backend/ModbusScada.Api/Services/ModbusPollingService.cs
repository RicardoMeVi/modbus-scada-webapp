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
        _ciclo++;

        foreach (var dispositivo in dispositivos)
        {
            try
            {
                await PollDeviceAsync(db, dispositivo, leerConfigSitio, stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Fallo al leer dispositivo {Nombre} ({Ip}:{Puerto})",
                    dispositivo.Nombre, dispositivo.IpAddress, dispositivo.Puerto);
            }
        }
    }

    private async Task PollDeviceAsync(AppDbContext db, Dispositivo dispositivo, bool leerConfigSitio, CancellationToken stoppingToken)
    {
        if (dispositivo.Conexion == TipoConexion.Rtu)
        {
            await PollDeviceRtuAsync(db, dispositivo, leerConfigSitio, stoppingToken);
            return;
        }

        using var tcpClient = new TcpClient();
        await tcpClient.ConnectAsync(dispositivo.IpAddress!, dispositivo.Puerto, stoppingToken);
        using IModbusMaster master = _modbusFactory.CreateMaster(tcpClient);

        await LeerYPublicarRegistrosAsync(db, dispositivo, master, leerConfigSitio, stoppingToken);
    }

    // A diferencia de TCP (conexión nueva y descartable por ciclo), el
    // master RTU es persistente -- lo entrega ModbusConnectionFactory, que
    // reutiliza el mismo SerialPort entre ciclos. Si algo falla durante la
    // lectura, se cierra la conexión para que el próximo ciclo la reabra
    // desde cero en vez de insistir con un puerto en mal estado.
    private async Task PollDeviceRtuAsync(AppDbContext db, Dispositivo dispositivo, bool leerConfigSitio, CancellationToken stoppingToken)
    {
        var master = _connectionFactory.ObtenerMasterRtu(dispositivo);

        try
        {
            await LeerYPublicarRegistrosAsync(db, dispositivo, master, leerConfigSitio, stoppingToken);
        }
        catch
        {
            _connectionFactory.CerrarConexionRtu(dispositivo.PuertoSerial!);
            throw;
        }
    }

    private async Task LeerYPublicarRegistrosAsync(
        AppDbContext db, Dispositivo dispositivo, IModbusMaster master, bool leerConfigSitio, CancellationToken stoppingToken)
    {
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
        }

        foreach (var registro in dispositivo.Registros)
        {
            double valor = await LeerRegistroAsync(master, dispositivo.SlaveId, registro);

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
