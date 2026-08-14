using Microsoft.AspNetCore.Mvc;

namespace ModbusScada.Api.Controllers;


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
