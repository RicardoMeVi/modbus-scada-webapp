using System.IO.Ports;
using NModbus.IO;

namespace ModbusScada.Api.Services.Modbus;

// NModbus necesita un IStreamResource para armar un transporte RTU, pero la
// librería no trae uno para System.IO.Ports.SerialPort (sí para TcpClient/
// Socket/UdpClient) -- este adaptador delega cada miembro directo al puerto
// serial real.
public class SerialPortStreamAdapter : IStreamResource
{
    private readonly SerialPort _puerto;

    public SerialPortStreamAdapter(SerialPort puerto)
    {
        _puerto = puerto;
    }

    public int InfiniteTimeout => SerialPort.InfiniteTimeout;

    public int ReadTimeout
    {
        get => _puerto.ReadTimeout;
        set => _puerto.ReadTimeout = value;
    }

    public int WriteTimeout
    {
        get => _puerto.WriteTimeout;
        set => _puerto.WriteTimeout = value;
    }

    public void DiscardInBuffer() => _puerto.DiscardInBuffer();

    public int Read(byte[] buffer, int offset, int count) => _puerto.Read(buffer, offset, count);

    public void Write(byte[] buffer, int offset, int count) => _puerto.Write(buffer, offset, count);

    // IStreamResource exige IDisposable, pero acá es deliberadamente un
    // no-op: el puerto es persistente y lo cierra ModbusConnectionFactory
    // explícitamente (CerrarConexionRtu), no el Dispose() del IModbusMaster
    // que lo envuelve -- si este Dispose cerrara el SerialPort, el próximo
    // ciclo de sondeo se quedaría con una conexión muerta.
    public void Dispose()
    {
        GC.SuppressFinalize(this);
    }
}
