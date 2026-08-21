using Microsoft.AspNetCore.Mvc;

namespace ModbusScada.Api.Controllers;


[ApiController]
[Route("api/verificacion")]
public class VerificacionController : ControllerBase
{
    private const string PinDeFabrica = "1234";

    private readonly IConfiguration _config;

    public VerificacionController(IConfiguration config)
    {
        _config = config;
    }

    [HttpPost("validar")]
    public IActionResult Validar([FromBody] ValidarPinRequest request)
    {
        var pinValido = _config["Verificacion:Pin"] ?? PinDeFabrica;
        return request.Pin == pinValido ? Ok() : Unauthorized();
    }

    // Nunca devuelve el PIN real -- solo si sigue siendo el de fábrica, para
    // que el frontend pueda avisar antes de dejar el equipo en un sitio real
    // sin que nadie lo haya cambiado.
    [HttpGet("estado")]
    public ActionResult<EstadoVerificacionResponse> GetEstado()
    {
        var pinActual = _config["Verificacion:Pin"] ?? PinDeFabrica;
        return new EstadoVerificacionResponse(pinActual == PinDeFabrica);
    }
}

public record ValidarPinRequest(string Pin);

public record EstadoVerificacionResponse(bool PinPorDefecto);
