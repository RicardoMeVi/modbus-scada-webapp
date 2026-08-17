using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ModbusScada.Api.Data;
using ModbusScada.Api.Models;
using ModbusScada.Api.Services;

namespace ModbusScada.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DispositivosController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IModbusWriter _modbusWriter;

    public DispositivosController(AppDbContext db, IModbusWriter modbusWriter)
    {
        _db = db;
        _modbusWriter = modbusWriter;
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
        return NoContent();
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
    double? Latitud,
    double? Longitud);
