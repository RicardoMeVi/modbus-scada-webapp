using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ModbusScada.Api.Data;
using ModbusScada.Api.Models;
using ModbusScada.Api.Services;
using ModbusScada.Api.Services.Modbus;

namespace ModbusScada.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DispositivosController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IModbusWriter _modbusWriter;
    private readonly ISiteConfigWriter _siteConfigWriter;
    private readonly IPuertoSerialDetector _puertoDetector;

    public DispositivosController(
        AppDbContext db,
        IModbusWriter modbusWriter,
        ISiteConfigWriter siteConfigWriter,
        IPuertoSerialDetector puertoDetector)
    {
        _db = db;
        _modbusWriter = modbusWriter;
        _siteConfigWriter = siteConfigWriter;
        _puertoDetector = puertoDetector;
    }

    [HttpGet]
    public async Task<ActionResult<List<Dispositivo>>> GetAll()
    {
        return await _db.Dispositivos.Include(d => d.Registros).ToListAsync();
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Dispositivo>> GetById(int id)
    {
        var dispositivo = await _db.Dispositivos.Include(d => d.Registros)
            .FirstOrDefaultAsync(d => d.Id == id);

        return dispositivo is null ? NotFound() : dispositivo;
    }

    [HttpPost]
    public async Task<ActionResult<Dispositivo>> Create(Dispositivo dispositivo)
    {
        _db.Dispositivos.Add(dispositivo);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = dispositivo.Id }, dispositivo);
    }

    // Actualiza los datos de identificación del sitio (pantalla "Datos del
    // sitio" del HMI físico): NSM, NSUE, NSUT, RFC, Unidad de verificación,
    // Contraseña UTD y coordenadas. Estos campos SÍ tienen registros Modbus
    // reales (ver SiteRegisterMap) -- todo o nada: se intenta escribir en el
    // equipo ANTES de persistir local, y solo se guarda si el equipo lo
    // confirmó. Si falla, no se guarda nada (ni local) -- se prefiere un
    // error claro y final a un estado intermedio de "guardado a medias"
    // que el usuario tendría que interpretar.
    [HttpPut("{id:int}/datos-sitio")]
    public async Task<IActionResult> ActualizarDatosSitio(int id, [FromBody] DatosSitioRequest request)
    {
        var dispositivo = await _db.Dispositivos.FindAsync(id);
        if (dispositivo is null)
        {
            return NotFound();
        }

        dispositivo.Nsm = request.Nsm;
        dispositivo.Nsue = request.Nsue;
        dispositivo.Nsut = request.Nsut;
        dispositivo.Rfc = request.Rfc;
        dispositivo.UnidadVerificacion = request.UnidadVerificacion;
        dispositivo.ContrasenaUtd = request.ContrasenaUtd;
        dispositivo.Latitud = request.Latitud;
        dispositivo.Longitud = request.Longitud;

        if (!await _siteConfigWriter.EscribirAsync(dispositivo))
        {
            return StatusCode(StatusCodes.Status502BadGateway, "El equipo no confirmó la escritura. No se guardó nada.");
        }

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // Actualiza la configuración de SMS (pantalla "SMS" del HMI físico):
    // número de teléfono, hora/minuto de envío automático y tipo de
    // mensaje (1 = UV, 3 = prueba). Mismo patrón todo-o-nada que
    // ActualizarDatosSitio.
    [HttpPut("{id:int}/sms")]
    public async Task<IActionResult> ActualizarSms(int id, [FromBody] SmsRequest request)
    {
        var dispositivo = await _db.Dispositivos.FindAsync(id);
        if (dispositivo is null)
        {
            return NotFound();
        }

        dispositivo.SmsNumero = request.Numero;
        dispositivo.SmsHoraEnvio = request.HoraEnvio;
        dispositivo.SmsMinutoEnvio = request.MinutoEnvio;
        dispositivo.SmsTipoMensaje = request.TipoMensaje;

        if (!await _siteConfigWriter.EscribirAsync(dispositivo))
        {
            return StatusCode(StatusCodes.Status502BadGateway, "El equipo no confirmó la escritura. No se guardó nada.");
        }

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // Actualiza la configuración de FTP (pantalla "FTP" del HMI físico):
    // IP servidor, usuario, contraseña, carpeta, hora/minuto de envío
    // automático y tipo de mensaje. Mismo patrón todo-o-nada que los dos
    // anteriores.
    [HttpPut("{id:int}/ftp")]
    public async Task<IActionResult> ActualizarFtp(int id, [FromBody] FtpRequest request)
    {
        var dispositivo = await _db.Dispositivos.FindAsync(id);
        if (dispositivo is null)
        {
            return NotFound();
        }

        dispositivo.FtpIpServidor = request.IpServidor;
        dispositivo.FtpUsuario = request.Usuario;
        dispositivo.FtpContrasena = request.Contrasena;
        dispositivo.FtpCarpeta = request.Carpeta;
        dispositivo.FtpHoraEnvio = request.HoraEnvio;
        dispositivo.FtpMinutoEnvio = request.MinutoEnvio;
        dispositivo.FtpTipoMensaje = request.TipoMensaje;

        if (!await _siteConfigWriter.EscribirAsync(dispositivo))
        {
            return StatusCode(StatusCodes.Status502BadGateway, "El equipo no confirmó la escritura. No se guardó nada.");
        }

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // Actualiza los datos de conexión Modbus (IP, puerto, slave id, TCP/RTU,
    // puerto serial). No hay pantalla dedicada en la app para esto -- se usa
    // vía Swagger la primera vez que se instala el equipo en un sitio real
    // (en modo "Campo", Swagger queda habilitado justo para este fin).
    [HttpPut("{id:int}/conexion")]
    public async Task<IActionResult> ActualizarConexion(int id, [FromBody] ConexionRequest request)
    {
        var dispositivo = await _db.Dispositivos.FindAsync(id);
        if (dispositivo is null)
        {
            return NotFound();
        }

        dispositivo.Nombre = request.Nombre;
        dispositivo.IpAddress = request.IpAddress;
        dispositivo.Puerto = request.Puerto;
        dispositivo.SlaveId = request.SlaveId;
        dispositivo.Conexion = request.Conexion;
        dispositivo.PuertoSerial = request.PuertoSerial;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // Puertos COM que Windows ve conectados ahora mismo -- respaldo manual
    // para cuando la detección automática (abajo) no encuentra nada.
    [HttpGet("puertos-disponibles")]
    public ActionResult<IReadOnlyList<string>> GetPuertosDisponibles()
    {
        return Ok(_puertoDetector.ListarPuertosDisponibles());
    }

    // Prueba cada puerto COM disponible con una lectura Modbus real hasta
    // encontrar el que responde -- ver PuertoSerialDetector. Puede tardar
    // unos segundos si hay varios puertos para probar.
    [HttpPost("{id:int}/detectar-puerto")]
    public async Task<ActionResult<DetectarPuertoResponse>> DetectarPuerto(int id, CancellationToken ct)
    {
        var dispositivo = await _db.Dispositivos.FindAsync([id], ct);
        if (dispositivo is null)
        {
            return NotFound();
        }

        var puertoEncontrado = await _puertoDetector.DetectarAsync(dispositivo.SlaveId, ct);
        return new DetectarPuertoResponse(puertoEncontrado is not null, puertoEncontrado);
    }

    // Estado de alarmas (pantalla "Alarmas" del HMI físico): registro 15
    // (bits 0-4) + registro 29 (bit 0, IHM), según la especificación del
    // Interrogador portátil. En vez de abrir una conexión Modbus aparte,
    // reutiliza el último valor ya leído por el ciclo de sondeo normal
    // (real o simulado) -- así funciona igual en modo mock y con hardware
    // real, sin duplicar la lógica de conexión. Requiere que el dispositivo
    // tenga registros llamados "Alarmas" (dirección 15) y "Alarma IHM"
    // (dirección 29) -- ver PlaceholderDeviceSeeder/MockDataSeeder.
    // Polaridad de los bits (1 = alarma activa) asumida, sin confirmar
    // contra hardware real todavía.
    [HttpGet("{id:int}/alarmas")]
    public async Task<ActionResult<AlarmasResponse>> GetAlarmas(int id)
    {
        var dispositivo = await _db.Dispositivos.Include(d => d.Registros).FirstOrDefaultAsync(d => d.Id == id);
        if (dispositivo is null)
        {
            return NotFound();
        }

        return await ObtenerAlarmasAsync(dispositivo);
    }

    private async Task<AlarmasResponse> ObtenerAlarmasAsync(Dispositivo dispositivo)
    {
        var registroAlarmas = dispositivo.Registros.FirstOrDefault(r => r.Nombre == "Alarmas");
        var registroIhm = dispositivo.Registros.FirstOrDefault(r => r.Nombre == "Alarma IHM");

        double? valorAlarmas = await UltimoValorAsync(registroAlarmas);
        double? valorIhm = await UltimoValorAsync(registroIhm);

        return new AlarmasResponse(
            Alimentacion: BitOSinDato(valorAlarmas, 0),
            Bateria: BitOSinDato(valorAlarmas, 1),
            ComunicacionTxCaudal: BitOSinDato(valorAlarmas, 2),
            GsmConectado: BitOSinDato(valorAlarmas, 3),
            GprsConectado: BitOSinDato(valorAlarmas, 4),
            Ihm: BitOSinDato(valorIhm, 0));
    }

    // "Foto" del sitio al momento de la visita: configuración actual +
    // últimas lecturas + estado de alarmas, para que un técnico se la lleve
    // como constancia sin depender de que otra notebook tenga la misma base
    // de datos local (cada notebook guarda su propio historial, no se
    // comparte entre equipos -- ver EJECUTABLE-CAMPO.md). Deliberadamente
    // NO incluye contraseñas (ContrasenaUtd, FtpContrasena): es un reporte
    // pensado para compartirse (correo, WhatsApp), no debe llevar
    // credenciales en texto plano.
    [HttpGet("{id:int}/reporte")]
    public async Task<ActionResult<ReporteSitioResponse>> GetReporte(int id)
    {
        var dispositivo = await _db.Dispositivos.Include(d => d.Registros).FirstOrDefaultAsync(d => d.Id == id);
        if (dispositivo is null)
        {
            return NotFound();
        }

        var alarmas = await ObtenerAlarmasAsync(dispositivo);

        var ultimasLecturas = new List<LecturaRegistroReporte>();
        foreach (var registro in dispositivo.Registros)
        {
            var lectura = await _db.LecturasHistoricas
                .Where(l => l.RegistroModbusId == registro.Id)
                .OrderByDescending(l => l.Timestamp)
                .FirstOrDefaultAsync();

            ultimasLecturas.Add(new LecturaRegistroReporte(
                registro.Nombre, lectura?.Valor, registro.Unidad, lectura?.Timestamp));
        }

        return new ReporteSitioResponse(
            dispositivo.Nombre,
            DateTime.UtcNow,
            dispositivo.IpAddress,
            dispositivo.Puerto,
            dispositivo.SlaveId,
            dispositivo.Conexion,
            dispositivo.PuertoSerial,
            dispositivo.Nsm,
            dispositivo.Nsue,
            dispositivo.Nsut,
            dispositivo.Rfc,
            dispositivo.UnidadVerificacion,
            dispositivo.Latitud,
            dispositivo.Longitud,
            dispositivo.SmsNumero,
            dispositivo.SmsHoraEnvio,
            dispositivo.SmsMinutoEnvio,
            dispositivo.SmsTipoMensaje,
            dispositivo.FtpIpServidor,
            dispositivo.FtpUsuario,
            dispositivo.FtpCarpeta,
            dispositivo.FtpHoraEnvio,
            dispositivo.FtpMinutoEnvio,
            dispositivo.FtpTipoMensaje,
            alarmas,
            ultimasLecturas);
    }

    // null explícito cuando todavía no hay ninguna lectura (equipo recién
    // configurado, o inalcanzable) -- distinto de "bit en 0". Sin esto, "sin
    // dato" y "sin alarma" se veían idénticos (ambos en verde), que es
    // justo la inconsistencia que se vio al probar contra RTU sin equipo
    // conectado: todo aparecía "Conectado" en vez de "sin dato".
    private static bool? BitOSinDato(double? valorRegistro, int bit) =>
        valorRegistro is null ? null : ModbusStringCodec.GetBit((ushort)valorRegistro.Value, bit);

    private async Task<double?> UltimoValorAsync(RegistroModbus? registro)
    {
        if (registro is null)
        {
            return null;
        }

        var lectura = await _db.LecturasHistoricas
            .Where(l => l.RegistroModbusId == registro.Id)
            .OrderByDescending(l => l.Timestamp)
            .FirstOrDefaultAsync();

        return lectura?.Valor;
    }

    [HttpGet("{id:int}/lecturas")]
    public async Task<ActionResult<List<LecturaHistorica>>> GetLecturas(int id, [FromQuery] int limite = 100)
    {
        return await _db.LecturasHistoricas
            .Where(l => l.RegistroModbus!.DispositivoId == id)
            .OrderByDescending(l => l.Timestamp)
            .Take(limite)
            .ToListAsync();
    }

    // Escribe un parámetro (Coil o Holding Register) del dispositivo, igual
    // que mover un valor desde el panel HMI físico (Kinco/ICH). Solo estas
    // dos tablas son escribibles en Modbus (funciones 05 y 06).
    [HttpPost("{dispositivoId:int}/registros/{registroId:int}/valor")]
    public async Task<IActionResult> EscribirValor(int dispositivoId, int registroId, [FromBody] EscribirValorRequest request)
    {
        var registro = await _db.RegistrosModbus
            .Include(r => r.Dispositivo)
            .FirstOrDefaultAsync(r => r.Id == registroId && r.DispositivoId == dispositivoId);

        if (registro is null)
        {
            return NotFound();
        }

        if (registro.Tabla is not (TipoTablaModbus.Coil or TipoTablaModbus.HoldingRegister))
        {
            return BadRequest("Este registro es de solo lectura.");
        }

        await _modbusWriter.EscribirAsync(registro.Dispositivo!, registro, request.Valor);
        return NoContent();
    }
}

public record EscribirValorRequest(double Valor);

public record DatosSitioRequest(
    string? Nsm,
    string? Nsue,
    string? Nsut,
    string? Rfc,
    string? UnidadVerificacion,
    string? ContrasenaUtd,
    string? Latitud,
    string? Longitud);

public record SmsRequest(
    string? Numero,
    int? HoraEnvio,
    int? MinutoEnvio,
    int? TipoMensaje);

public record FtpRequest(
    string? IpServidor,
    string? Usuario,
    string? Contrasena,
    string? Carpeta,
    string? HoraEnvio,
    string? MinutoEnvio,
    int? TipoMensaje);

public record AlarmasResponse(
    bool? Alimentacion,
    bool? Bateria,
    bool? ComunicacionTxCaudal,
    bool? GsmConectado,
    bool? GprsConectado,
    bool? Ihm);

public record ConexionRequest(
    string Nombre,
    string? IpAddress,
    int Puerto,
    byte SlaveId,
    TipoConexion Conexion,
    string? PuertoSerial);

public record DetectarPuertoResponse(bool Encontrado, string? PuertoSerial);

public record LecturaRegistroReporte(string Nombre, double? Valor, string? Unidad, DateTime? Timestamp);

public record ReporteSitioResponse(
    string Nombre,
    DateTime GeneradoEn,
    string? IpAddress,
    int Puerto,
    byte SlaveId,
    TipoConexion Conexion,
    string? PuertoSerial,
    string? Nsm,
    string? Nsue,
    string? Nsut,
    string? Rfc,
    string? UnidadVerificacion,
    string? Latitud,
    string? Longitud,
    string? SmsNumero,
    int? SmsHoraEnvio,
    int? SmsMinutoEnvio,
    int? SmsTipoMensaje,
    string? FtpIpServidor,
    string? FtpUsuario,
    string? FtpCarpeta,
    string? FtpHoraEnvio,
    string? FtpMinutoEnvio,
    int? FtpTipoMensaje,
    AlarmasResponse Alarmas,
    List<LecturaRegistroReporte> UltimasLecturas);
