using System.IO.Ports;
using System.Text.RegularExpressions;
using NModbus;

namespace ModbusScada.Api.Services.Modbus;

public interface IPuertoSerialDetector
{
    IReadOnlyList<string> ListarPuertosDisponibles();
    Task<string?> DetectarAsync(byte slaveId, CancellationToken ct);
}

// Para la config inicial de un sitio real: prueba cada puerto serial con
// una lectura Modbus real (registro 15, "Alarmas") y usa el primero que
// responda, en vez de pedirle al técnico que adivine el COM. Cada intento
// abre su propio SerialPort de corta duración -- no reutiliza el de
// ModbusConnectionFactory (ese mantiene abierto el sondeo de fondo) para
// no pisarlo ni depender de una conexión que todavía no existe.
public class PuertoSerialDetector : IPuertoSerialDetector
{
    private const int BaudRate = 9600;
    private const int DataBits = 8;
    private const Parity ParidadPuerto = Parity.None;
    private const StopBits BitsDeParada = StopBits.One;
    private const int TimeoutPorPuertoMs = 500;
    private const int RegistroSonda = 15;

    // "COM" + número, sin nada más -- SerialPort.GetPortNames() lee del
    // registro de Windows (HKLM\HARDWARE\DEVICEMAP\SERIALCOMM) y puede
    // devolver entradas huérfanas/corruptas de drivers mal desinstalados
    // (ej. "3COM3" en vez de "COM3"). Se descartan en vez de ofrecérselas
    // al técnico como si fueran puertos reales.
    private static readonly Regex NombrePuertoValido = new(@"^COM\d+$", RegexOptions.IgnoreCase);

    public IReadOnlyList<string> ListarPuertosDisponibles()
    {
        return SerialPort.GetPortNames()
            .Where(p => NombrePuertoValido.IsMatch(p))
            .Distinct()
            .OrderBy(p => int.Parse(p[3..]))
            .ToList();
    }

    public async Task<string?> DetectarAsync(byte slaveId, CancellationToken ct)
    {
        var modbusFactory = new ModbusFactory();

        foreach (var nombrePuerto in ListarPuertosDisponibles())
        {
            ct.ThrowIfCancellationRequested();

            SerialPort? puerto = null;
            try
            {
                puerto = new SerialPort(nombrePuerto, BaudRate, ParidadPuerto, DataBits, BitsDeParada)
                {
                    ReadTimeout = TimeoutPorPuertoMs,
                    WriteTimeout = TimeoutPorPuertoMs
                };
                puerto.Open();

                var transporte = modbusFactory.CreateRtuTransport(new SerialPortStreamAdapter(puerto));
                var master = modbusFactory.CreateMaster(transporte);
                await master.ReadHoldingRegistersAsync(slaveId, RegistroSonda, 1);

                return nombrePuerto;
            }
            catch
            {
                // Puerto ocupado, nada conectado, o no es el UTD -- se
                // prueba el siguiente sin abortar la búsqueda entera.
            }
            finally
            {
                try
                {
                    puerto?.Close();
                }
                catch
                {
                    // Best-effort.
                }

                puerto?.Dispose();
            }
        }

        return null;
    }
}
