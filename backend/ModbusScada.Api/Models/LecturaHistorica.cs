namespace ModbusScada.Api.Models;

public class LecturaHistorica
{
    public int Id { get; set; }
    public int RegistroModbusId { get; set; }
    public RegistroModbus? RegistroModbus { get; set; }

    public double Valor { get; set; }
    public DateTime Timestamp { get; set; }
}
