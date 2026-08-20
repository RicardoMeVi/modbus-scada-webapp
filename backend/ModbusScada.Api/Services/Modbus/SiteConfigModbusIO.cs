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
    // Devuelve false si al menos un campo falló al escribirse -- best-effort
    // por campo (uno que falle no aborta los demás), pero el llamador
    // necesita saber si TODO se reflejó en el equipo o no, para que la UI
    // pueda avisarle al usuario en vez de asumir que "guardado" significa
    // "confirmado en el equipo".
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

    // Escribe y relee el mismo campo para confirmar -- una escritura Modbus
    // puede recibir ACK a nivel protocolo (sin excepción) sin que el valor
    // haya quedado realmente grabado del otro lado (interferencia en el
    // bus, el equipo se queda sin resolver justo en ese instante, etc.).
    // Si lo releído no coincide con lo que se mandó, se trata como fallo de
    // este campo (tira, el llamador ya lo cuenta como error) en vez de
    // darlo por bueno solo porque el maestro no vio una excepción. Mismo
    // patrón que ya documenta la especificación para Fecha/Hora
    // ("modificar → OK → escritura → lectura de confirmación").
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
