using Microsoft.Extensions.Logging;
using ModbusScada.Api.Models;
using NModbus;

namespace ModbusScada.Api.Services.Modbus;

// Traduce entre las columnas fijas de Dispositivo (Rfc, Nsm, SmsNumero,
// etc.) y los registros Modbus reales del UTD, usando SiteRegisterMap. La
// lectura alimenta la base de datos como caché; la escritura escribe y
// relee cada campo para confirmar (ver EscribirCampoAsync). Best-effort
// por campo -- uno que falle no aborta los demás, pero el bool que
// devuelve EscribirCamposAsync es lo que el controller usa para decidir
// si persiste algo (ver DispositivosController: todo o nada).
public static class SiteConfigModbusIO
{
    public static async Task<bool> EscribirCamposAsync(IModbusMaster master, Dispositivo dispositivo, ILogger logger)
    {
        bool huboError = false;

        foreach (var campo in SiteRegisterMap.Campos)
        {
            try
            {
                await EscribirCampoAsync(master, dispositivo, campo);
            }
            catch (Exception ex)
            {
                huboError = true;
                logger.LogWarning(ex, "No se pudo escribir '{Campo}' (dirección {Direccion}) en el dispositivo {Nombre}",
                    campo.Propiedad, campo.Direccion, dispositivo.Nombre);
            }
        }

        return !huboError;
    }

    public static async Task LeerCamposAsync(IModbusMaster master, Dispositivo dispositivo, ILogger logger)
    {
        foreach (var campo in SiteRegisterMap.Campos)
        {
            try
            {
                await LeerCampoAsync(master, dispositivo, campo);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "No se pudo leer '{Campo}' (dirección {Direccion}) del dispositivo {Nombre}",
                    campo.Propiedad, campo.Direccion, dispositivo.Nombre);
            }
        }
    }

    // Escribe y relee para confirmar -- un ACK a nivel protocolo no
    // garantiza que el valor haya quedado grabado del otro lado. Si lo
    // releído no coincide, tira (el llamador lo cuenta como fallo de este
    // campo). Mismo patrón que documenta la especificación para Fecha/Hora.
    private static async Task EscribirCampoAsync(IModbusMaster master, Dispositivo dispositivo, CampoSitio campo)
    {
        var propiedad = typeof(Dispositivo).GetProperty(campo.Propiedad)!;
        var valorActual = propiedad.GetValue(dispositivo);
        if (valorActual is null)
        {
            return; // nada configurado todavía para este campo -- no hay qué escribir
        }

        if (campo.Tipo == TipoRegistroSitio.String)
        {
            var valorEsperado = (string)valorActual;
            var registros = ModbusStringCodec.PackAscii(valorEsperado, campo.LongitudRegistros);
            await master.WriteMultipleRegistersAsync(dispositivo.SlaveId, (ushort)campo.Direccion, registros);

            var registrosLeidos = await master.ReadHoldingRegistersAsync(
                dispositivo.SlaveId, (ushort)campo.Direccion, (ushort)campo.LongitudRegistros);
            var valorConfirmado = ModbusStringCodec.UnpackAscii(registrosLeidos);

            if (valorConfirmado != valorEsperado)
            {
                throw new InvalidOperationException(
                    $"No se confirmó la escritura: se mandó '{valorEsperado}' pero el equipo tiene '{valorConfirmado}'.");
            }
        }
        else
        {
            ushort valorEsperado = propiedad.PropertyType == typeof(string)
                ? ushort.Parse((string)valorActual)
                : Convert.ToUInt16(valorActual);
            await master.WriteSingleRegisterAsync(dispositivo.SlaveId, (ushort)campo.Direccion, valorEsperado);

            var registrosLeidos = await master.ReadHoldingRegistersAsync(dispositivo.SlaveId, (ushort)campo.Direccion, 1);

            if (registrosLeidos[0] != valorEsperado)
            {
                throw new InvalidOperationException(
                    $"No se confirmó la escritura: se mandó {valorEsperado} pero el equipo tiene {registrosLeidos[0]}.");
            }
        }
    }

    private static async Task LeerCampoAsync(IModbusMaster master, Dispositivo dispositivo, CampoSitio campo)
    {
        var propiedad = typeof(Dispositivo).GetProperty(campo.Propiedad)!;

        if (campo.Tipo == TipoRegistroSitio.String)
        {
            var registros = await master.ReadHoldingRegistersAsync(
                dispositivo.SlaveId, (ushort)campo.Direccion, (ushort)campo.LongitudRegistros);
            propiedad.SetValue(dispositivo, ModbusStringCodec.UnpackAscii(registros));
        }
        else
        {
            var registros = await master.ReadHoldingRegistersAsync(dispositivo.SlaveId, (ushort)campo.Direccion, 1);
            object valor = propiedad.PropertyType == typeof(string)
                ? registros[0].ToString()
                : (int)registros[0];
            propiedad.SetValue(dispositivo, valor);
        }
    }
}
