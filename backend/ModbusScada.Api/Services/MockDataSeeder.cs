using Microsoft.EntityFrameworkCore;
using ModbusScada.Api.Data;
using ModbusScada.Api.Models;

namespace ModbusScada.Api.Services;

// Siembra un dispositivo de prueba equivalente al modbus_servidor.py
// (tanque con bomba) descrito en CONTEXTO.md, para poder probar el
// frontend sin hardware Modbus real ni base de datos externa.
public static class MockDataSeeder
{
    // Dirección Modbus de cada registro de fecha/hora (sección 3.1 de
    // CONTEXTONuevo.md). Se usa tanto para el seed inicial como para
    // completar bases de datos existentes que se crearon antes de que
    // se agregara esta sección.
    private static readonly (string Nombre, int Direccion)[] RegistrosFechaHora =
    {
        ("Día", 700),
        ("Mes", 701),
        ("Año", 702),
        ("Hora", 703),
        ("Minutos", 705),
        ("Segundos", 707)
    };

    public static void Seed(AppDbContext db)
    {
        if (!db.Dispositivos.Any())
        {
            db.Dispositivos.Add(CrearDispositivoDePrueba());
            db.SaveChanges();
        }

        AsegurarRegistrosFechaHora(db);
    }

    // Agrega los registros de fecha/hora al primer dispositivo si faltan
    // (base de datos existente sembrada antes de que esta sección se
    // implementara). Sin esto, una base ya sembrada nunca vuelve a pasar
    // por CrearDispositivoDePrueba() y se quedaría sin estos registros.
    private static void AsegurarRegistrosFechaHora(AppDbContext db)
    {
        var dispositivo = db.Dispositivos.Include(d => d.Registros).First();
        var faltantes = RegistrosFechaHora
            .Where(rfh => dispositivo.Registros.All(r => r.Nombre != rfh.Nombre))
            .ToList();

        if (faltantes.Count == 0)
        {
            return;
        }

        foreach (var (nombre, direccion) in faltantes)
        {
            dispositivo.Registros.Add(new RegistroModbus
            {
                Nombre = nombre,
                Tabla = TipoTablaModbus.HoldingRegister,
                Direccion = direccion,
                TipoDato = TipoDatoModbus.UInt16
            });
        }

        db.SaveChanges();
    }

    private static Dispositivo CrearDispositivoDePrueba()
    {
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
                },
                // Bits de alarma (sección 3.5 de la especificación): registro
                // 15 = alimentación/batería/comunicación/GSM/GPRS (bits 0-4),
                // registro 29 = IHM (bit 0). Usados por GET .../alarmas.
                new()
                {
                    Nombre = "Alarmas",
                    Tabla = TipoTablaModbus.HoldingRegister,
                    Direccion = 15,
                    TipoDato = TipoDatoModbus.UInt16
                },
                new()
                {
                    Nombre = "Alarma IHM",
                    Tabla = TipoTablaModbus.HoldingRegister,
                    Direccion = 29,
                    TipoDato = TipoDatoModbus.UInt16
                }
                // Los registros de fecha/hora se agregan en AsegurarRegistrosFechaHora.
            }
        };

        return tanque;
    }
}
