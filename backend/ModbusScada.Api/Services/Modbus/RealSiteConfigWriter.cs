using System.Diagnostics;
using System.Net.Sockets;
using Microsoft.AspNetCore.SignalR;
using ModbusScada.Api.Data;
using ModbusScada.Api.Hubs;
using ModbusScada.Api.Models;
using NModbus;

namespace ModbusScada.Api.Services.Modbus;

public class RealSiteConfigWriter : ISiteConfigWriter
{
    private readonly IModbusConnectionFactory _connectionFactory;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHubContext<ModbusHub> _hubContext;
    private readonly ILogger<RealSiteConfigWriter> _logger;
    private readonly ModbusFactory _modbusFactory = new();

    public RealSiteConfigWriter(
        IModbusConnectionFactory connectionFactory,
        IServiceScopeFactory scopeFactory,
        IHubContext<ModbusHub> hubContext,
        ILogger<RealSiteConfigWriter> logger)
    {
        _connectionFactory = connectionFactory;
        _scopeFactory = scopeFactory;
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task<bool> EscribirAsync(Dispositivo dispositivo, IReadOnlySet<string> camposModificados)
    {
        // Instrumentación temporal para medir en campo dónde se va el
        // tiempo de un guardado -- cuánto se esperó el candado del puerto
        // (contención con el sondeo de fondo, que lo toma cada 5s) vs.
        // cuánto tardó la escritura Modbus en sí (candado de escritura +
        // campos + confirmaciones). Sacar cuando ya no haga falta medir.
        var cronometroTotal = Stopwatch.StartNew();

        // Ver comentario en IModbusConnectionFactory.BloquearAsync: sin
        // esto, este guardado (llega por HTTP, en cualquier momento) podía
        // entrelazarse en el cable con el sondeo de fondo que corre cada
        // 5s -- caso real: un Guardar de Contraseña UTD confirmaba bien en
        // el momento, pero el equipo terminaba con otro valor.
        using var bloqueo = await _connectionFactory.BloquearAsync(dispositivo.Id);
        var esperaBloqueoMs = cronometroTotal.ElapsedMilliseconds;

        (bool Exito, IReadOnlyList<string> CamposAVigilar) resultado;
        try
        {
            resultado = await EjecutarConMasterAsync(dispositivo,
                master => SiteConfigModbusIO.EscribirCamposAsync(master, dispositivo, camposModificados, _logger));
        }
        catch (Exception ex)
        {
            // No tira -- el controller decide qué hacer con el false
            // (ver DispositivosController: si esto es false, no persiste nada).
            _logger.LogWarning(ex, "No se pudo escribir la configuración de sitio en el dispositivo {Nombre}", dispositivo.Nombre);
            return false;
        }
        finally
        {
            _logger.LogInformation(
                "Guardado de '{Dispositivo}' ({Campos}): {TotalMs}ms total (espera de candado del puerto: {EsperaMs}ms, resto -- escritura Modbus + confirmaciones: {EscrituraMs}ms).",
                dispositivo.Nombre, string.Join(", ", camposModificados), cronometroTotal.ElapsedMilliseconds,
                esperaBloqueoMs, cronometroTotal.ElapsedMilliseconds - esperaBloqueoMs);
        }

        if (resultado.Exito && resultado.CamposAVigilar.Count > 0)
        {
            // Fire-and-forget a propósito -- no bloquea la respuesta al
            // usuario (ver comentario grande en RevisarDespuesAsync). El
            // `dispositivo`/lock de arriba no sobreviven más allá de este
            // método, así que la revisión demorada abre su propia
            // conexión y candado cuando le toque correr.
            _ = RevisarDespuesAsync(dispositivo.Id, resultado.CamposAVigilar);
        }

        return resultado.Exito;
    }

    // Corre en segundo plano, después de ya haber respondido al HTTP que
    // pidió el guardado -- por eso el guardado se siente rápido (solo
    // espera la reconfirmación CORTA de EscribirCamposAsync) sin resignar
    // la reconfirmación LARGA que haría falta para atrapar un revert más
    // lento. Si algo no se sostuvo pasado este tiempo más largo, se avisa
    // por SignalR ("guardadoNoSostenido") en vez de silenciarlo -- el
    // técnico ya vio el toast de éxito, así que un aviso aparte es la
    // única forma honesta de decirle que en realidad no quedó.
    private async Task RevisarDespuesAsync(int dispositivoId, IReadOnlyList<string> campos)
    {
        try
        {
            await Task.Delay(SiteConfigModbusIO.EsperaLarga);

            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var dispositivo = await db.Dispositivos.FindAsync(dispositivoId);
            if (dispositivo is null)
            {
                return;
            }

            using var _ = await _connectionFactory.BloquearAsync(dispositivoId);

            IReadOnlyList<string> fallidos;
            try
            {
                fallidos = await EjecutarConMasterAsync(dispositivo,
                    master => SiteConfigModbusIO.RevisarCamposAsync(master, dispositivo, campos, _logger));
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "No se pudo hacer la revisión demorada del dispositivo {Nombre}", dispositivo.Nombre);
                return;
            }

            if (fallidos.Count > 0)
            {
                await _hubContext.Clients.All.SendAsync("guardadoNoSostenido", new
                {
                    dispositivoId,
                    dispositivoNombre = dispositivo.Nombre,
                    campos = fallidos,
                });
            }
        }
        catch (Exception ex)
        {
            // Fire-and-forget: si esto no se atrapa acá, se pierde en
            // silencio (una excepción no observada de una Task que nadie
            // espera). Mejor un warning en el log que nada.
            _logger.LogWarning(ex, "Falló la revisión demorada del dispositivo {DispositivoId}", dispositivoId);
        }
    }

    // RTU reutiliza la conexión persistente (ver IModbusConnectionFactory);
    // TCP abre una descartable por llamada. Compartido entre el guardado
    // principal y la revisión demorada para no duplicar el manejo de
    // errores/`using` de cada rama.
    private async Task<T> EjecutarConMasterAsync<T>(Dispositivo dispositivo, Func<IModbusMaster, Task<T>> accion)
    {
        if (dispositivo.Conexion == TipoConexion.Rtu)
        {
            var master = _connectionFactory.ObtenerMasterRtu(dispositivo);
            try
            {
                return await accion(master);
            }
            catch (Exception)
            {
                _connectionFactory.CerrarConexionRtu(dispositivo.PuertoSerial!);
                throw;
            }
        }

        using var tcpClient = new TcpClient();
        await tcpClient.ConnectAsync(dispositivo.IpAddress!, dispositivo.Puerto);
        using IModbusMaster masterTcp = _modbusFactory.CreateMaster(tcpClient);
        return await accion(masterTcp);
    }
}
