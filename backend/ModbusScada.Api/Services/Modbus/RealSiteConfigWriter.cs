using System.Net.Sockets;
using ModbusScada.Api.Models;
using NModbus;

namespace ModbusScada.Api.Services.Modbus;

public class RealSiteConfigWriter : ISiteConfigWriter
{
    private readonly IModbusConnectionFactory _connectionFactory;
    private readonly ILogger<RealSiteConfigWriter> _logger;
    private readonly ModbusFactory _modbusFactory = new();

    public RealSiteConfigWriter(IModbusConnectionFactory connectionFactory, ILogger<RealSiteConfigWriter> logger)
    {
        _connectionFactory = connectionFactory;
        _logger = logger;
    }

    public async Task<bool> EscribirAsync(Dispositivo dispositivo)
    {
        // Ver comentario en IModbusConnectionFactory.BloquearAsync: sin
        // esto, este guardado (llega por HTTP, en cualquier momento) podía
        // entrelazarse en el cable con el sondeo de fondo que corre cada
        // 5s -- caso real: un Guardar de Contraseña UTD confirmaba bien en
        // el momento, pero el equipo terminaba con otro valor.
        using var _ = await _connectionFactory.BloquearAsync(dispositivo.Id);

        try
        {
            if (dispositivo.Conexion == TipoConexion.Rtu)
            {
                var master = _connectionFactory.ObtenerMasterRtu(dispositivo);
                try
                {
                    return await SiteConfigModbusIO.EscribirCamposAsync(master, dispositivo, _logger);
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
            return await SiteConfigModbusIO.EscribirCamposAsync(masterTcp, dispositivo, _logger);
        }
        catch (Exception ex)
        {
            // No tira -- el controller decide qué hacer con el false
            // (ver DispositivosController: si esto es false, no persiste nada).
            _logger.LogWarning(ex, "No se pudo escribir la configuración de sitio en el dispositivo {Nombre}", dispositivo.Nombre);
            return false;
        }
    }
}
