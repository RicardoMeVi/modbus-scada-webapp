using ModbusScada.Api.Models;

namespace ModbusScada.Api.Services;

public interface IModbusWriter
{
    Task EscribirAsync(Dispositivo dispositivo, RegistroModbus registro, double valor, CancellationToken ct = default);
}
