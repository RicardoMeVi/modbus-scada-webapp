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

    // Devuelve true si se pudo leer y validar al menos un campo -- lo usa
    // ModbusPollingService para decidir si esta lectura cuenta como
    // "config de sitio fresca" (ConfiguracionSitioLeidaEn) o si el ciclo
    // entero fue puro ruido y no hay que confiar en nada de lo que quedó
    // en el objeto Dispositivo.
    public static async Task<bool> LeerCamposAsync(IModbusMaster master, Dispositivo dispositivo, ILogger logger)
    {
        bool huboExito = false;

        foreach (var campo in SiteRegisterMap.Campos)
        {
            if (campo.ExcluirDeSondeoPasivo)
            {
                continue;
            }

            try
            {
                await LeerCampoAsync(master, dispositivo, campo);
                huboExito = true;
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "No se pudo leer '{Campo}' (dirección {Direccion}) del dispositivo {Nombre}",
                    campo.Propiedad, campo.Direccion, dispositivo.Nombre);
            }
        }

        return huboExito;
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

        // Descarta una lectura inválida: deja el campo en null (no en el
        // valor viejo) y recién ahí tira. A pedido explícito -- el front
        // nunca debe mostrar como "actual" algo que no se pudo confirmar en
        // este ciclo, ni siquiera el último valor bueno conocido. `null` (no
        // "") es clave para que siga siendo seguro: EscribirCampoAsync
        // salta los campos null al guardar, así que esto no reintroduce el
        // bug de borrado real que motivó el chequeo de vacío (ver más abajo).
        void Descartar(string motivo)
        {
            propiedad.SetValue(dispositivo, null);
            throw new InvalidOperationException(motivo);
        }

        if (campo.Tipo == TipoRegistroSitio.String)
        {
            var registros = await master.ReadHoldingRegistersAsync(
                dispositivo.SlaveId, (ushort)campo.Direccion, (ushort)campo.LongitudRegistros);
            var valor = ModbusStringCodec.UnpackAscii(registros);

            // Un bus RS-485 al límite puede devolver un CRC válido con un
            // registro individual corrupto (ver caso real: registro que
            // debía ser '.' llegó como 2136 en vez de 46) -- UnpackAscii no
            // tiene forma de detectarlo solo, así que se valida acá antes
            // de aceptar el valor.
            if (!ModbusStringCodec.EsAsciiImprimible(valor))
            {
                Descartar($"Lectura descartada: '{campo.Propiedad}' contiene caracteres no imprimibles (posible glitch de comunicación).");
            }

            // Un string vacío pasa el chequeo de arriba por vacuidad (no hay
            // ningún carácter que lo reviente) -- pero un campo entero de 17
            // registros leyendo 0x0000 en todos es exactamente la firma que
            // ya vimos cuando la conexión estaba rota de verdad (ver
            // CONTEXTONuevo.md/PENDIENTES: direcciones reales devolviendo
            // puro cero con Err=0), no un dato real del equipo.
            if (valor.Length == 0)
            {
                Descartar($"Lectura descartada: '{campo.Propiedad}' vino completamente vacía (probable desconexión, no un valor real).");
            }

            // Chequeo de formato adicional cuando existe (ver comentario en
            // SiteRegisterMap): un registro corrupto enmascarado a 1 byte
            // puede seguir siendo "imprimible" (ej. un contador interno que
            // decodifica como ':', ';', etc.) sin dejar de ser basura.
            if (campo.ValidadorAdicional is not null && !campo.ValidadorAdicional(valor))
            {
                Descartar($"Lectura descartada: '{campo.Propiedad}' = '{valor}' no tiene el formato esperado.");
            }

            propiedad.SetValue(dispositivo, valor);
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
