namespace ModbusScada.Api.Models;

public class Dispositivo
{
    // Valor inicial de ContrasenaUtd para un sitio recién instalado (ver
    // PlaceholderDeviceSeeder) -- es también el PIN por defecto del modal
    // "Unidad de Verificación" (VerificacionController), porque son el
    // mismo campo: cambiarlo desde "Datos del sitio" cambia con qué PIN
    // hay que entrar la próxima vez que se abra la app
    public const string ContrasenaUtdPorDefecto = "1";

    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? IpAddress { get; set; }      // null si es RTU serial
    public int Puerto { get; set; } = 502;      // 502 por defecto en TCP
    public byte SlaveId { get; set; }
    public TipoConexion Conexion { get; set; }
    public string? PuertoSerial { get; set; }   // COM3, /dev/ttyUSB0, etc (si RTU)

    // Datos de identificación del sitio (pantalla "Datos del sitio" del HMI
    // físico). Todos tienen registro Modbus real (ver SiteRegisterMap) y
    // se escriben al equipo al guardar -- ContrasenaUtd (dirección 250) es
    // además el PIN del modal "Unidad de Verificación", ver
    // ContrasenaUtdPorDefecto arriba.
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

    // Momento de la última lectura de "config de sitio" (Datos del
    // sitio/SMS/FTP) que efectivamente trajo al menos un campo válido del
    // equipo real (ver SiteConfigModbusIO/ModbusPollingService). A
    // diferencia de Fecha/Hora (que llega por SignalR y arranca vacía en
    // cada apertura), estos campos viven en columnas fijas que se guardan
    // en la base -- sin esto, el front no puede distinguir "esto lo trajo
    // el equipo hace unos segundos" de "esto quedó de la última vez que
    // hubo conexión, quién sabe cuándo".
    public DateTime? ConfiguracionSitioLeidaEn { get; set; }

    public ICollection<RegistroModbus> Registros { get; set; } = new List<RegistroModbus>();
}
