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
