namespace ModbusScada.Api.Models;

public class RegistroModbus
{
    public int Id { get; set; }
    public int DispositivoId { get; set; }
    public Dispositivo? Dispositivo { get; set; }

    public string Nombre { get; set; } = string.Empty;   // "Caudal instantáneo"
    public TipoTablaModbus Tabla { get; set; }
    public int Direccion { get; set; }                    // dirección PDU (base 0, ¡ojo con offsets!)
    public TipoDatoModbus TipoDato { get; set; }
    public string? Unidad { get; set; }                    // "m3/h"
    public string? OrdenBytes { get; set; }                // ABCD/DCBA/BADC/CDAB (para 32-bit)
}
