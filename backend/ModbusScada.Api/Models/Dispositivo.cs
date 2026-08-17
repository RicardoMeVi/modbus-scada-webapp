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

    // Datos de identificación del sitio (pantalla "Datos del sitio" del HMI
    // físico). No son registros Modbus: son metadatos fijos del sitio/pozo.
    public string? Nsm { get; set; }
    public string? Nsue { get; set; }
    public string? Nsut { get; set; }
    public string? Rfc { get; set; }
    public string? UnidadVerificacion { get; set; }
    public string? ContrasenaUtd { get; set; }
    public double? Latitud { get; set; }
    public double? Longitud { get; set; }

    public ICollection<RegistroModbus> Registros { get; set; } = new List<RegistroModbus>();
}
