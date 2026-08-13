using ModbusScada.Api.Models;

namespace ModbusScada.Api.Services;

public class MockModbusWriter : IModbusWriter
{
    private readonly MockModbusPollingService _pollingService;

    public MockModbusWriter(MockModbusPollingService pollingService)
    {
        _pollingService = pollingService;
    }

    public Task EscribirAsync(Dispositivo dispositivo, RegistroModbus registro, double valor, CancellationToken ct = default)
    {
        _pollingService.EscribirValor(registro, valor);
        return Task.CompletedTask;
    }
}
