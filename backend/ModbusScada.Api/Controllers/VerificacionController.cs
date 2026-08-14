using Microsoft.AspNetCore.Mvc;

namespace ModbusScada.Api.Controllers;

// Valida el PIN de la "Unidad de Verificación" que desbloquea la edición de
// parámetros en el dashboard (equivalente al login del panel HMI físico).
// El PIN hoy vive en configuración (mock); más adelante puede reemplazarse
// por un mecanismo de autenticación real sin tocar el contrato del endpoint.
[ApiController]
[Route("api/verificacion")]
public class VerificacionController : ControllerBase
{
    private readonly IConfiguration _config;

    public VerificacionController(IConfiguration config)
    {
        _config = config;
    }

    [HttpPost("validar")]
    public IActionResult Validar([FromBody] ValidarPinRequest request)
    {
        var pinValido = _config["Verificacion:Pin"] ?? "1234";
        return request.Pin == pinValido ? Ok() : Unauthorized();
    }
}

public record ValidarPinRequest(string Pin);
