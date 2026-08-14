using ModbusScada.Api.Data;
using ModbusScada.Api.Models;

namespace ModbusScada.Api.Services;

// Siembra un dispositivo de prueba equivalente al modbus_servidor.py
// (tanque con bomba) descrito en CONTEXTO.md, para poder probar el
// frontend sin hardware Modbus real ni base de datos externa.
public static class MockDataSeeder
{
    public static void Seed(AppDbContext db)
    {
        if (db.Dispositivos.Any())
        {
            return;
        }

        var tanque = new Dispositivo
        {
            Nombre = "UTD ICH PSI",
            IpAddress = "127.0.0.1",
            Puerto = 502,
            SlaveId = 1,
            Conexion = TipoConexion.Tcp,
            Registros = new List<RegistroModbus>
            {
                new()
                {
                    Nombre = "Nivel del tanque",
                    Tabla = TipoTablaModbus.InputRegister,
                    Direccion = 0,
                    TipoDato = TipoDatoModbus.UInt16,
                    Unidad = "%"
                },
                new()
                {
                    Nombre = "Bomba",
                    Tabla = TipoTablaModbus.Coil,
                    Direccion = 0,
                    TipoDato = TipoDatoModbus.UInt16,
                    Unidad = "ON/OFF"
                },
                new()
                {
                    Nombre = "Setpoint",
                    Tabla = TipoTablaModbus.HoldingRegister,
                    Direccion = 0,
                    TipoDato = TipoDatoModbus.UInt16,
                    Unidad = "%"
                },
                new()
                {
                    Nombre = "Caudal instantáneo",
                    Tabla = TipoTablaModbus.InputRegister,
                    Direccion = 1,
                    TipoDato = TipoDatoModbus.Float32,
                    Unidad = "m3/h"
                },
                new()
                {
                    Nombre = "Totalizado",
                    Tabla = TipoTablaModbus.InputRegister,
                    Direccion = 3,
                    TipoDato = TipoDatoModbus.Float32,
                    Unidad = "m3"
                }
            }
        };

        db.Dispositivos.Add(tanque);
        db.SaveChanges();
    }
}
