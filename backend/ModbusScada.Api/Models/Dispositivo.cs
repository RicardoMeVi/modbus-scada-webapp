namespace ModbusScada.Api.Models;

public class Dispositivo
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? IpAddress { get; set; }      // null si es RTU serial
    public int Puerto { get; set; } = 502;      // 502 por defecto en TCP
    public byte SlaveId { get; set; }
    public TipoConexion Conexion { get; set; }
    public string? PuertoSerial { get; set; }   // COM3, /dev/ttyUSB0, etc (si RTU)

    public ICollection<RegistroModbus> Registros { get; set; } = new List<RegistroModbus>();
}
