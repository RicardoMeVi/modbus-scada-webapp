using System.Net.Sockets;
using ModbusScada.Api.Models;
using NModbus;

namespace ModbusScada.Api.Services;

public class RealModbusWriter : IModbusWriter
{
    private readonly ModbusFactory _modbusFactory = new();

    public async Task EscribirAsync(Dispositivo dispositivo, RegistroModbus registro, double valor, CancellationToken ct = default)
    {
        using var tcpClient = new TcpClient();
        await tcpClient.ConnectAsync(dispositivo.IpAddress!, dispositivo.Puerto, ct);
        using IModbusMaster master = _modbusFactory.CreateMaster(tcpClient);

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
