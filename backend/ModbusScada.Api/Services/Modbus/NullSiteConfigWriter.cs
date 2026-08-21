using ModbusScada.Api.Models;

namespace ModbusScada.Api.Services.Modbus;

// Modo simulador (Mocking:Enabled=true): no hay transporte Modbus real al
// que escribir. Devuelve true (no false) para que el controller sí
// persista -- el mock representa un sitio siempre funcional, no uno que
// rechaza cada guardado.
public class NullSiteConfigWriter : ISiteConfigWriter
{
    public Task<bool> EscribirAsync(Dispositivo dispositivo) => Task.FromResult(true);
}
