using Microsoft.Extensions.Logging;
using ModbusScada.Api.Models;
using NModbus;

namespace ModbusScada.Api.Services.Modbus;

// Traduce entre las columnas fijas de Dispositivo (Rfc, Nsm, SmsNumero,
// etc.) y los registros Modbus reales del UTD, usando SiteRegisterMap. La
// lectura alimenta la base de datos como caché (la usa ModbusPollingService
// en su ciclo); la escritura intenta reflejar en el equipo real lo que el
// usuario guardó desde la app. Ambas son "best effort" por campo: si uno
// falla (equipo apagado, cable desconectado), se registra y se sigue con
// los demás en vez de abortar todo.
public static class SiteConfigModbusIO
{
    public static async Task EscribirCamposAsync(IModbusMaster master, Dispositivo dispositivo, ILogger logger)
    {
        foreach (var campo in SiteRegisterMap.Campos)
        {
            try
            {
                await EscribirCampoAsync(master, dispositivo, campo);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "No se pudo escribir '{Campo}' (dirección {Direccion}) en el dispositivo {Nombre}",
                    campo.Propiedad, campo.Direccion, dispositivo.Nombre);
            }
        }
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
            var registros = ModbusStringCodec.PackAscii((string)valorActual, campo.LongitudRegistros);
            await master.WriteMultipleRegistersAsync(dispositivo.SlaveId, (ushort)campo.Direccion, registros);
        }
        else
        {
            ushort valorRegistro = propiedad.PropertyType == typeof(string)
                ? ushort.Parse((string)valorActual)
                : Convert.ToUInt16(valorActual);
            await master.WriteSingleRegisterAsync(dispositivo.SlaveId, (ushort)campo.Direccion, valorRegistro);
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
