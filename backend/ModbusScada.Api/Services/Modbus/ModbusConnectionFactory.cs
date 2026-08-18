using System.Collections.Concurrent;
using System.IO.Ports;
using ModbusScada.Api.Models;
using NModbus;

namespace ModbusScada.Api.Services.Modbus;

public class ModbusConnectionFactory : IModbusConnectionFactory, IDisposable
{
    // Parámetros seriales del UTD real: 9600-8-N-1, según la especificación
    // del Interrogador portátil (sección "Arquitectura de comunicación").
    private const int BaudRate = 9600;
    private const int DataBits = 8;
    private const Parity ParidadPuerto = Parity.None;
    private const StopBits BitsDeParada = StopBits.One;

    private readonly ModbusFactory _modbusFactory = new();
    private readonly ConcurrentDictionary<string, (SerialPort Puerto, IModbusMaster Master)> _conexiones = new();

    public IModbusMaster ObtenerMasterRtu(Dispositivo dispositivo)
    {
        var puertoNombre = dispositivo.PuertoSerial
            ?? throw new InvalidOperationException(
                $"El dispositivo '{dispositivo.Nombre}' está configurado como RTU pero no tiene PuertoSerial.");

        if (_conexiones.TryGetValue(puertoNombre, out var existente))
        {
            return existente.Master;
        }

        var puerto = new SerialPort(puertoNombre, BaudRate, ParidadPuerto, DataBits, BitsDeParada)
        {
            ReadTimeout = 1000,
            WriteTimeout = 1000
        };
        puerto.Open();

        var transporte = _modbusFactory.CreateRtuTransport(new SerialPortStreamAdapter(puerto));
        IModbusMaster master = _modbusFactory.CreateMaster(transporte);

        _conexiones[puertoNombre] = (puerto, master);
        return master;
    }

    public void CerrarConexionRtu(string puertoSerial)
    {
        if (!_conexiones.TryRemove(puertoSerial, out var conexion))
        {
            return;
        }

        try
        {
            conexion.Puerto.Close();
        }
        catch
        {
            // Best-effort: si ya estaba en mal estado (cable desconectado),
            // cerrar puede fallar igual -- lo que importa es que se sacó del
            // diccionario para que el próximo intento abra uno nuevo.
        }

        conexion.Puerto.Dispose();
    }

    public void Dispose()
    {
        foreach (var puertoNombre in _conexiones.Keys.ToList())
        {
            CerrarConexionRtu(puertoNombre);
        }
    }
}
