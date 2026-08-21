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
    // físico). Todos menos ContrasenaUtd tienen registro Modbus real (ver
    // SiteRegisterMap) y se escriben al equipo al guardar.
    public string? Nsm { get; set; }
    public string? Nsue { get; set; }
    public string? Nsut { get; set; }
    public string? Rfc { get; set; }
    public string? UnidadVerificacion { get; set; }
    public string? ContrasenaUtd { get; set; }
    // El equipo real las guarda como cadena (String 11 / String 15
    // caracteres, sección 3.2 de la especificación), no como número --
    // formato exacto sin confirmar hasta poder leer un valor real.
    public string? Latitud { get; set; }
    public string? Longitud { get; set; }

    // Configuración de SMS (pantalla "SMS" del HMI físico). Todos menos
    // SmsTipoMensaje tienen registro Modbus real (sin dirección documentada
    // para este). SmsTipoMensaje: 1 = Mensaje de UV, 3 = Mensaje de prueba.
    public string? SmsNumero { get; set; }
    public int? SmsHoraEnvio { get; set; }
    public int? SmsMinutoEnvio { get; set; }
    public int? SmsTipoMensaje { get; set; }

    // Configuración de FTP (pantalla "FTP" del HMI físico). Todos menos
    // FtpTipoMensaje tienen registro Modbus real (sin dirección documentada
    // para este).
    public string? FtpIpServidor { get; set; }
    public string? FtpUsuario { get; set; }
    public string? FtpContrasena { get; set; }
    public string? FtpCarpeta { get; set; }
    // A diferencia de SMS (registros de 16 bits simples), en FTP la
    // especificación dice String 11 / String 15 caracteres para estos dos.
    public string? FtpHoraEnvio { get; set; }
    public string? FtpMinutoEnvio { get; set; }
    public int? FtpTipoMensaje { get; set; }

    public ICollection<RegistroModbus> Registros { get; set; } = new List<RegistroModbus>();
}
