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

    public DispositivosController(AppDbContext db, IModbusWriter modbusWriter, ISiteConfigWriter siteConfigWriter)
    {
        _db = db;
        _modbusWriter = modbusWriter;
        _siteConfigWriter = siteConfigWriter;
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
    // Contraseña UTD y coordenadas. No son registros Modbus.
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

        await _db.SaveChangesAsync();
        await _siteConfigWriter.EscribirAsync(dispositivo);
        return NoContent();
    }

    // Actualiza la configuración de SMS (pantalla "SMS" del HMI físico):
    // número de teléfono, hora/minuto de envío automático y tipo de
    // mensaje (1 = UV, 3 = prueba). No son registros Modbus.
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

        await _db.SaveChangesAsync();
        await _siteConfigWriter.EscribirAsync(dispositivo);
        return NoContent();
    }

    // Actualiza la configuración de FTP (pantalla "FTP" del HMI físico):
    // IP servidor, usuario, contraseña, carpeta, hora/minuto de envío
    // automático y tipo de mensaje. No son registros Modbus.
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

        await _db.SaveChangesAsync();
        await _siteConfigWriter.EscribirAsync(dispositivo);
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

        var registroAlarmas = dispositivo.Registros.FirstOrDefault(r => r.Nombre == "Alarmas");
        var registroIhm = dispositivo.Registros.FirstOrDefault(r => r.Nombre == "Alarma IHM");

        ushort valorAlarmas = (ushort)await UltimoValorAsync(registroAlarmas);
        ushort valorIhm = (ushort)await UltimoValorAsync(registroIhm);

        return new AlarmasResponse(
            Alimentacion: ModbusStringCodec.GetBit(valorAlarmas, 0),
            Bateria: ModbusStringCodec.GetBit(valorAlarmas, 1),
            ComunicacionTxCaudal: ModbusStringCodec.GetBit(valorAlarmas, 2),
            GsmConectado: ModbusStringCodec.GetBit(valorAlarmas, 3),
            GprsConectado: ModbusStringCodec.GetBit(valorAlarmas, 4),
            Ihm: ModbusStringCodec.GetBit(valorIhm, 0));
    }

    private async Task<double> UltimoValorAsync(RegistroModbus? registro)
    {
        if (registro is null)
        {
            return 0;
        }

        var lectura = await _db.LecturasHistoricas
            .Where(l => l.RegistroModbusId == registro.Id)
            .OrderByDescending(l => l.Timestamp)
            .FirstOrDefaultAsync();

        return lectura?.Valor ?? 0;
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
    bool Alimentacion,
    bool Bateria,
    bool ComunicacionTxCaudal,
    bool GsmConectado,
    bool GprsConectado,
    bool Ihm);

public record ConexionRequest(
    string Nombre,
    string? IpAddress,
    int Puerto,
    byte SlaveId,
    TipoConexion Conexion,
    string? PuertoSerial);
