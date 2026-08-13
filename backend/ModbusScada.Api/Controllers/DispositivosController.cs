using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ModbusScada.Api.Data;
using ModbusScada.Api.Models;

namespace ModbusScada.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DispositivosController : ControllerBase
{
    private readonly AppDbContext _db;

    public DispositivosController(AppDbContext db)
    {
        _db = db;
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

    [HttpGet("{id:int}/lecturas")]
    public async Task<ActionResult<List<LecturaHistorica>>> GetLecturas(int id, [FromQuery] int limite = 100)
    {
        return await _db.LecturasHistoricas
            .Where(l => l.RegistroModbus!.DispositivoId == id)
            .OrderByDescending(l => l.Timestamp)
            .Take(limite)
            .ToListAsync();
    }
}
