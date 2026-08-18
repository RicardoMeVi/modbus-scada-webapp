using ModbusScada.Api.Models;

namespace ModbusScada.Api.Services.Modbus;

// Usado en modo simulador (Mocking:Enabled=true): no hay transporte Modbus
// real al que escribir, así que no hace nada.
public class NullSiteConfigWriter : ISiteConfigWriter
{
    public Task EscribirAsync(Dispositivo dispositivo) => Task.CompletedTask;
}
