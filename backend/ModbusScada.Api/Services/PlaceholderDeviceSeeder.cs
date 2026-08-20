using ModbusScada.Api.Data;
using ModbusScada.Api.Models;

namespace ModbusScada.Api.Services;

// Para el ejecutable de campo (SQLite, hardware real): a diferencia de
// MockDataSeeder, este no simula datos -- crea el dispositivo con el mismo
// mapa Modbus real del equipo (UTD ICH PSI) pero con un puerto serial de
// ejemplo ("COM3"), para que la pantalla no aparezca vacía la primera vez
// que se instala en un sitio. Quien instale el equipo corrige el puerto
// real via PUT /api/Dispositivos/{id}/conexion (expuesto en Swagger en
// este modo).
public static class PlaceholderDeviceSeeder
{
    public static void EnsureDispositivoExiste(AppDbContext db)
    {
        if (db.Dispositivos.Any())
        {
            return;
        }

        db.Dispositivos.Add(new Dispositivo
        {
            Nombre = "UTD ICH PSI",
            // El equipo real (UTD/MOBICON) solo habla Modbus RTU sobre
            // RS-485 -- ver especificación del Interrogador portátil.
            // "COM3" es un placeholder; se corrige al instalar en un sitio
            // real vía PUT /api/Dispositivos/{id}/conexion (Swagger, modo
            // Campo).
            Conexion = TipoConexion.Rtu,
            PuertoSerial = "COM3",
            Puerto = 502,
            SlaveId = 1,
            Registros = new List<RegistroModbus>
            {
                // Caudal instantáneo/Totalizado: direcciones 9/11 según la
                // especificación (sección "Medidores"), no 1/3 como en el
                // simulador original. La tabla (HoldingRegister) es una
                // suposición -- el documento no lo aclara para estos dos
                // específicamente, pero todos los demás ejemplos modscan del
                // documento (fecha/hora, RFC, IP de FTP) usan función 03
                // (Holding Register); a confirmar con hardware real.
                new()
                {
                    Nombre = "Caudal instantáneo",
                    Tabla = TipoTablaModbus.HoldingRegister,
                    Direccion = 9,
                    TipoDato = TipoDatoModbus.Float32,
                    Unidad = "m3/h"
                },
                new()
                {
                    Nombre = "Totalizado",
                    Tabla = TipoTablaModbus.HoldingRegister,
                    Direccion = 11,
                    TipoDato = TipoDatoModbus.Float32,
                    Unidad = "m3"
                },
                new() { Nombre = "Día", Tabla = TipoTablaModbus.HoldingRegister, Direccion = 700, TipoDato = TipoDatoModbus.UInt16 },
                new() { Nombre = "Mes", Tabla = TipoTablaModbus.HoldingRegister, Direccion = 701, TipoDato = TipoDatoModbus.UInt16 },
                new() { Nombre = "Año", Tabla = TipoTablaModbus.HoldingRegister, Direccion = 702, TipoDato = TipoDatoModbus.UInt16 },
                new() { Nombre = "Hora", Tabla = TipoTablaModbus.HoldingRegister, Direccion = 703, TipoDato = TipoDatoModbus.UInt16 },
                new() { Nombre = "Minutos", Tabla = TipoTablaModbus.HoldingRegister, Direccion = 705, TipoDato = TipoDatoModbus.UInt16 },
                new() { Nombre = "Segundos", Tabla = TipoTablaModbus.HoldingRegister, Direccion = 707, TipoDato = TipoDatoModbus.UInt16 },
                new() { Nombre = "Alarmas", Tabla = TipoTablaModbus.HoldingRegister, Direccion = 15, TipoDato = TipoDatoModbus.UInt16 },
                new() { Nombre = "Alarma IHM", Tabla = TipoTablaModbus.HoldingRegister, Direccion = 29, TipoDato = TipoDatoModbus.UInt16 }
            }
        });

        db.SaveChanges();
    }
}
