using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ModbusScada.Api.Data;
using ModbusScada.Api.Models;

namespace ModbusScada.Api.Controllers;

[ApiController]
[Route("api/verificacion")]
public class VerificacionController : ControllerBase
{
    private readonly AppDbContext _db;

    public VerificacionController(AppDbContext db)
    {
        _db = db;
    }

    // El PIN de este modal es el mismo campo "Contraseña UTD" de "Datos del
    // sitio" (ContrasenaUtd, dirección Modbus 250 -- ver SiteRegisterMap.cs)
    // -- no un valor de configuración aparte. Si el técnico lo cambia desde
    // ahí (se escribe al equipo real y se persiste local), la próxima vez
    // que se abra la app hay que entrar con el valor nuevo. Un sitio recién
    // instalado arranca en Dispositivo.ContrasenaUtdPorDefecto (ver
    // PlaceholderDeviceSeeder).
    [HttpPost("validar")]
    public async Task<IActionResult> Validar([FromBody] ValidarPinRequest request)
    {
        var dispositivo = await _db.Dispositivos.FirstOrDefaultAsync();
        var pinValido = dispositivo?.ContrasenaUtd ?? Dispositivo.ContrasenaUtdPorDefecto;
        return request.Pin == pinValido ? Ok() : Unauthorized();
    }
}

public record ValidarPinRequest(string Pin);
