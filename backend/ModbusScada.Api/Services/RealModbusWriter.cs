using System.Net.Sockets;
using ModbusScada.Api.Models;
using ModbusScada.Api.Services.Modbus;
using NModbus;

namespace ModbusScada.Api.Services;

public class RealModbusWriter : IModbusWriter
{
    private readonly ModbusFactory _modbusFactory = new();
    private readonly IModbusConnectionFactory _connectionFactory;

    public RealModbusWriter(IModbusConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task EscribirAsync(Dispositivo dispositivo, RegistroModbus registro, double valor, CancellationToken ct = default)
    {
        if (dispositivo.Conexion == TipoConexion.Rtu)
        {
            var master = _connectionFactory.ObtenerMasterRtu(dispositivo);
            try
            {
                await EscribirEnMasterAsync(master, dispositivo, registro, valor);
            }
            catch
            {
                _connectionFactory.CerrarConexionRtu(dispositivo.PuertoSerial!);
                throw;
            }
            return;
        }

        using var tcpClient = new TcpClient();
        await tcpClient.ConnectAsync(dispositivo.IpAddress!, dispositivo.Puerto, ct);
        using IModbusMaster masterTcp = _modbusFactory.CreateMaster(tcpClient);
        await EscribirEnMasterAsync(masterTcp, dispositivo, registro, valor);
    }

    private static async Task EscribirEnMasterAsync(IModbusMaster master, Dispositivo dispositivo, RegistroModbus registro, double valor)
    {
        switch (registro.Tabla)
        {
            case TipoTablaModbus.Coil:
                await master.WriteSingleCoilAsync(dispositivo.SlaveId, (ushort)registro.Direccion, valor != 0);
                break;
            case TipoTablaModbus.HoldingRegister:
                await master.WriteSingleRegisterAsync(dispositivo.SlaveId, (ushort)registro.Direccion, (ushort)valor);
                break;
            default:
                throw new InvalidOperationException($"La tabla {registro.Tabla} es de solo lectura.");
        }
    }
}
