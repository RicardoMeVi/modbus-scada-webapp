using ModbusScada.Api.Models;

namespace ModbusScada.Api.Services.Modbus;

// Usado en modo simulador (Mocking:Enabled=true): no hay transporte Modbus
// real al que escribir, así que no hace nada. Devuelve true (no false) para
// no mostrar en la UI una advertencia de "no se pudo escribir en el
// equipo" que no tiene sentido en modo simulador -- el mock representa un
// sitio siempre funcional.
public class NullSiteConfigWriter : ISiteConfigWriter
{
    public Task<bool> EscribirAsync(Dispositivo dispositivo) => Task.FromResult(true);
}
