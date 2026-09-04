using Microsoft.Extensions.Logging;
using ModbusScada.Api.Models;
using NModbus;

namespace ModbusScada.Api.Services.Modbus;

// Traduce entre las columnas fijas de Dispositivo (Rfc, Nsm, SmsNumero,
// etc.) y los registros Modbus reales del UTD, usando SiteRegisterMap. La
// lectura alimenta la base de datos como caché; la escritura relee para
// confirmar en tres momentos -- al toque (EscribirCampoAsync), corto
// después (EsperaCorta, todavía sincrónico, adentro de EscribirCamposAsync)
// y de nuevo más tarde en segundo plano (EsperaLarga, ver
// RealSiteConfigWriter.RevisarDespuesAsync) -- porque confirmado con
// hardware real que una sola relectura inmediata puede dar un falso
// positivo si el equipo revierte el valor poco después. Best-effort por
// campo -- uno que falle no aborta los demás, pero el bool que devuelve
// EscribirCamposAsync es lo que el controller usa para decidir si persiste
// algo (ver DispositivosController: todo o nada).
public static class SiteConfigModbusIO
{
    // Candidato pendiente de confirmar por dispositivo, para
    // VerificarCambioDeContrasenaAsync -- ver comentario ahí. En memoria
    // nomás (no en la base): si el backend se reinicia justo en el medio,
    // como mucho se pierde el candidato pendiente y hace falta un ciclo
    // más para confirmar un cambio real hecho en la UTD -- no hay nada
    // crítico que perder.
    private static readonly Dictionary<int, uint> _candidatosContrasena = new();

    // ContrasenaUtd ocupa 2 registros consecutivos (250=palabra baja,
    // 251=palabra alta) -- ver comentario en SiteRegisterMap sobre cómo se
    // dedujo este orden. Estos dos helpers son los únicos que conocen ese
    // orden; todo el resto del archivo pasa por acá en vez de armar el
    // uint a mano.
    private static uint CombinarUInt32(ushort bajo, ushort alto) => ((uint)alto << 16) | bajo;

    private static (ushort Bajo, ushort Alto) DescomponerUInt32(uint valor) => ((ushort)(valor & 0xFFFF), (ushort)(valor >> 16));

    // ContrasenaUtd está marcada ExcluirDeSondeoPasivo (no la toca
    // LeerCamposAsync) porque también es el PIN de acceso a la app -- un
    // valor corrupto aceptado de una sola lectura dejaba al usuario
    // afuera. Pero el usuario SÍ quiere que un cambio hecho directo en el
    // menú físico de la UTD (sin pasar por la app) eventualmente se
    // refleje acá. Esta función concilia ambas cosas: exige ver el MISMO
    // valor distinto dos ciclos seguidos antes de aceptarlo como un
    // cambio real -- un glitch aislado de comunicación prácticamente
    // nunca se repite idéntico dos veces seguidas, a diferencia de un
    // cambio deliberado (que se mantiene estable hasta el próximo cambio).
    public static async Task VerificarCambioDeContrasenaAsync(IModbusMaster master, Dispositivo dispositivo, ILogger logger)
    {
        var campo = SiteRegisterMap.Campos.First(c => c.Propiedad == nameof(Dispositivo.ContrasenaUtd));

        uint leido;
        try
        {
            var registros = await master.ReadHoldingRegistersAsync(dispositivo.SlaveId, (ushort)campo.Direccion, (ushort)campo.LongitudRegistros);
            leido = CombinarUInt32(registros[0], registros[1]);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "No se pudo leer Contraseña UTD (dirección {Direccion}) del dispositivo {Nombre}",
                campo.Direccion, dispositivo.Nombre);
            return;
        }

        if (dispositivo.ContrasenaUtd is not null
            && uint.TryParse(dispositivo.ContrasenaUtd, out var actual)
            && actual == leido)
        {
            _candidatosContrasena.Remove(dispositivo.Id);
            return; // sigue igual que lo que ya tenemos -- nada que hacer
        }

        if (_candidatosContrasena.TryGetValue(dispositivo.Id, out var candidatoAnterior) && candidatoAnterior == leido)
        {
            // Mismo valor distinto dos veces seguidas: se acepta como
            // cambio real hecho en la UTD.
            dispositivo.ContrasenaUtd = leido.ToString();
            _candidatosContrasena.Remove(dispositivo.Id);
            logger.LogInformation(
                "Contraseña UTD del dispositivo {Nombre} actualizada -- cambio confirmado directo en el equipo.",
                dispositivo.Nombre);
        }
        else
        {
            // Primera vez que se ve este valor distinto -- todavía no se
            // acepta, se guarda como candidato para el próximo ciclo. Log
            // a propósito (investigación en curso): para reconstruir en el
            // archivo de log, con hora exacta, qué vio cada ciclo del
            // sondeo -- si un valor recién escrito por la app aparece acá
            // como candidato y después nunca se confirma, es la prueba de
            // que revirtió antes del siguiente ciclo (~5s).
            logger.LogInformation(
                "ContrasenaUtd[{Dispositivo}]: sondeo de fondo vio {Leido} (actual confirmado: {Actual}) -- candidato nuevo, falta ver si se repite el próximo ciclo.",
                dispositivo.Nombre, leido, dispositivo.ContrasenaUtd ?? "null");
            _candidatosContrasena[dispositivo.Id] = leido;
        }
    }

    // Dos reconfirmaciones, no una -- para no elegir entre "rápido" y
    // "confiable": una corta y sincrónica (adentro de EscribirCamposAsync,
    // el usuario espera esto) que atrapa la mayoría de los reverts sin
    // sentirse lenta, y otra más larga que corre en segundo plano después
    // de responder (ver RealSiteConfigWriter.RevisarDespuesAsync) para
    // atrapar los más lentos, avisando aparte si algo se escapa de la
    // corta. Los tiempos son un margen de seguridad sobre lo observado con
    // hardware real (Contraseña UTD y Hora/Minuto de FTP revierten en
    // menos de un segundo), no una medición precisa.
    private static readonly TimeSpan EsperaCorta = TimeSpan.FromMilliseconds(300);
    public static readonly TimeSpan EsperaLarga = TimeSpan.FromMilliseconds(1700);

    // Replica el flujo del Interrogador original (ver comentario de
    // SiteRegisterMap.RegistroControlEscritura): toma el control antes de
    // escribir y lo devuelve a la UTD al terminar, pase lo que pase --
    // "entrar/salir de Unidad de Verificación" acá es cada guardado, no
    // una sesión larga. Si ni siquiera se puede tomar el control, no tiene
    // sentido intentar escribir ningún campo (fallarían todos igual).
    // Devuelve (Exito, CamposAVigilar): CamposAVigilar son los campos que
    // pasaron la reconfirmación corta y quedan candidatos para la revisión
    // demorada en segundo plano (RealSiteConfigWriter.RevisarDespuesAsync)
    // -- vacío si hubo error (ya se sabe que falló) o si no había nada que
    // escribir.
    public static async Task<(bool Exito, IReadOnlyList<string> CamposAVigilar)> EscribirCamposAsync(
        IModbusMaster master, Dispositivo dispositivo, IReadOnlySet<string> camposModificados, ILogger logger)
    {
        // Si no cambió nada, no hay nada que escribir -- ni vale la pena
        // tomar el control de escritura para no hacer nada con él.
        if (camposModificados.Count == 0)
        {
            return (true, Array.Empty<string>());
        }

        if (!await TomarControlEscrituraAsync(master, dispositivo, logger))
        {
            return (false, Array.Empty<string>());
        }

        try
        {
            bool huboError = false;
            var camposParaReconfirmar = new List<CampoSitio>();

            foreach (var campo in SiteRegisterMap.Campos)
            {
                if (!camposModificados.Contains(campo.Propiedad))
                {
                    continue; // el usuario no tocó este campo -- no se reescribe
                }

                var propiedad = typeof(Dispositivo).GetProperty(campo.Propiedad)!;
                if (propiedad.GetValue(dispositivo) is null)
                {
                    continue; // nada configurado -- no hay nada que escribir ni reconfirmar
                }

                try
                {
                    // ContrasenaUtd ya NO queda afuera de la reconfirmación:
                    // con la secuencia de reafirmar+nuevo (EscribirContrasenaUtdAsync)
                    // persiste la gran mayoría de las veces (confirmado con
                    // hardware real, ~9 de cada 10) -- la falla ocasional que
                    // queda es exactamente el patrón "confirma al toque pero
                    // revierte después" que esta reconfirmación existe para
                    // atrapar, así que tiene sentido incluirla como cualquier
                    // otro campo en vez de excluirla.
                    if (campo.Propiedad == nameof(Dispositivo.ContrasenaUtd))
                    {
                        await EscribirContrasenaUtdAsync(master, dispositivo, campo, logger);
                    }
                    else
                    {
                        await EscribirCampoAsync(master, dispositivo, campo);
                    }

                    camposParaReconfirmar.Add(campo);
                }
                catch (Exception ex)
                {
                    huboError = true;
                    logger.LogWarning(ex, "No se pudo escribir '{Campo}' (dirección {Direccion}) en el dispositivo {Nombre}",
                        campo.Propiedad, campo.Direccion, dispositivo.Nombre);
                }
            }

            if (huboError || camposParaReconfirmar.Count == 0)
            {
                return (!huboError, Array.Empty<string>());
            }

            // La escritura+relectura inmediata de EscribirCampoAsync puede
            // dar un falso positivo: confirmado con hardware real que un
            // valor puede "flashear" el nuevo dato un instante y revertir
            // al viejo poco después (visto primero con Contraseña UTD, y
            // reproducido después con Hora/Minuto de envío automático de
            // FTP -- un campo sin ninguna relación con el anterior, así
            // que el problema no es específico de un registro puntual).
            // Se espera un poco (corto, esto todavía es sincrónico) y se
            // relee de nuevo antes de dar el guardado por bueno -- el resto
            // del margen de seguridad lo cubre la revisión demorada en
            // segundo plano del llamador, no acá.
            await Task.Delay(EsperaCorta);

            var camposAVigilar = new List<string>();
            foreach (var campo in camposParaReconfirmar)
            {
                try
                {
                    await ConfirmarCampoAsync(master, dispositivo, campo);
                    camposAVigilar.Add(campo.Propiedad);
                }
                catch (Exception ex)
                {
                    huboError = true;
                    logger.LogWarning(ex, "'{Campo}' (dirección {Direccion}) no se sostuvo pasado un instante en el dispositivo {Nombre}",
                        campo.Propiedad, campo.Direccion, dispositivo.Nombre);
                }
            }

            return (!huboError, huboError ? Array.Empty<string>() : camposAVigilar);
        }
        finally
        {
            await DevolverControlEscrituraAsync(master, dispositivo, logger);
        }
    }

    // Revisión demorada: relee los campos que ya pasaron la reconfirmación
    // corta, pasado más tiempo (ver RealSiteConfigWriter.RevisarDespuesAsync,
    // que llama esto en segundo plano, con su propia conexión y candado,
    // después de ya haber respondido al usuario). Devuelve los que NO se
    // sostuvieron, para que el llamador decida cómo avisar.
    public static async Task<IReadOnlyList<string>> RevisarCamposAsync(
        IModbusMaster master, Dispositivo dispositivo, IReadOnlyCollection<string> campos, ILogger logger)
    {
        var fallidos = new List<string>();

        foreach (var nombrePropiedad in campos)
        {
            var campo = SiteRegisterMap.Campos.FirstOrDefault(c => c.Propiedad == nombrePropiedad);
            if (campo is null)
            {
                continue;
            }

            try
            {
                await ConfirmarCampoAsync(master, dispositivo, campo);
            }
            catch (Exception ex)
            {
                fallidos.Add(nombrePropiedad);
                logger.LogWarning(ex, "'{Campo}' (dirección {Direccion}) no se sostuvo en la revisión demorada del dispositivo {Nombre}",
                    nombrePropiedad, campo.Direccion, dispositivo.Nombre);
            }
        }

        return fallidos;
    }

    // Escribe 1 y relee para confirmar -- igual que con cualquier campo de
    // datos, un ACK a nivel protocolo no garantiza que haya quedado
    // grabado. Si no confirma, no tiene caso intentar escribir los campos:
    // la UTD todavía tiene el control y los pisaría igual que antes de
    // conocer este registro.
    private static async Task<bool> TomarControlEscrituraAsync(IModbusMaster master, Dispositivo dispositivo, ILogger logger)
    {
        try
        {
            await master.WriteSingleRegisterAsync(dispositivo.SlaveId, (ushort)SiteRegisterMap.RegistroControlEscritura, 1);
            var leido = await master.ReadHoldingRegistersAsync(dispositivo.SlaveId, (ushort)SiteRegisterMap.RegistroControlEscritura, 1);
            if (leido[0] != 1)
            {
                logger.LogWarning(
                    "No se pudo tomar el control de escritura del dispositivo {Nombre}: el registro {Direccion} quedó en {Valor}, no en 1.",
                    dispositivo.Nombre, SiteRegisterMap.RegistroControlEscritura, leido[0]);
                return false;
            }

            return true;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "No se pudo escribir el registro de control de escritura ({Direccion}) del dispositivo {Nombre}",
                SiteRegisterMap.RegistroControlEscritura, dispositivo.Nombre);
            return false;
        }
    }

    // Best-effort: si esto falla (ej. el equipo se desconectó justo
    // después de escribir los campos), no hay mucho más que hacer acá --
    // ya se registra el warning, y el próximo guardado vuelve a intentar
    // tomar el control desde cero.
    private static async Task DevolverControlEscrituraAsync(IModbusMaster master, Dispositivo dispositivo, ILogger logger)
    {
        try
        {
            await master.WriteSingleRegisterAsync(dispositivo.SlaveId, (ushort)SiteRegisterMap.RegistroControlEscritura, 0);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "No se pudo devolver el control de escritura a la UTD (registro {Direccion}) del dispositivo {Nombre}",
                SiteRegisterMap.RegistroControlEscritura, dispositivo.Nombre);
        }
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
    // La comparación en sí está en ConfirmarCampoAsync, compartida con la
    // reconfirmación demorada de EscribirCamposAsync.
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
        else if (campo.Tipo == TipoRegistroSitio.UInt32)
        {
            uint valorEsperado = propiedad.PropertyType == typeof(string)
                ? uint.Parse((string)valorActual)
                : Convert.ToUInt32(valorActual);
            var (bajo, alto) = DescomponerUInt32(valorEsperado);
            await master.WriteMultipleRegistersAsync(dispositivo.SlaveId, (ushort)campo.Direccion, new[] { bajo, alto });
        }
        else
        {
            ushort valorEsperado = propiedad.PropertyType == typeof(string)
                ? ushort.Parse((string)valorActual)
                : Convert.ToUInt16(valorActual);
            await master.WriteSingleRegisterAsync(dispositivo.SlaveId, (ushort)campo.Direccion, valorEsperado);
        }

        await ConfirmarCampoAsync(master, dispositivo, campo);
    }

    // Relee el campo y compara contra el valor ya cargado en `dispositivo`
    // (el que EscribirCampoAsync acaba de intentar escribir) -- separado
    // para poder llamarlo dos veces: una vez al toque de escribir (adentro
    // de EscribirCampoAsync) y otra vez pasado un rato (reconfirmación
    // demorada en EscribirCamposAsync), sin duplicar la lógica.
    private static async Task ConfirmarCampoAsync(IModbusMaster master, Dispositivo dispositivo, CampoSitio campo)
    {
        var propiedad = typeof(Dispositivo).GetProperty(campo.Propiedad)!;
        var valorActual = propiedad.GetValue(dispositivo)!;

        if (campo.Tipo == TipoRegistroSitio.String)
        {
            var valorEsperado = (string)valorActual;
            var registrosLeidos = await master.ReadHoldingRegistersAsync(
                dispositivo.SlaveId, (ushort)campo.Direccion, (ushort)campo.LongitudRegistros);
            var valorConfirmado = ModbusStringCodec.UnpackAscii(registrosLeidos);

            if (valorConfirmado != valorEsperado)
            {
                throw new InvalidOperationException(
                    $"No se confirmó la escritura: se mandó '{valorEsperado}' pero el equipo tiene '{valorConfirmado}'.");
            }
        }
        else if (campo.Tipo == TipoRegistroSitio.UInt32)
        {
            uint valorEsperado = propiedad.PropertyType == typeof(string)
                ? uint.Parse((string)valorActual)
                : Convert.ToUInt32(valorActual);
            var registrosLeidos = await master.ReadHoldingRegistersAsync(dispositivo.SlaveId, (ushort)campo.Direccion, (ushort)campo.LongitudRegistros);
            var valorConfirmado = CombinarUInt32(registrosLeidos[0], registrosLeidos[1]);

            if (valorConfirmado != valorEsperado)
            {
                throw new InvalidOperationException(
                    $"No se confirmó la escritura: se mandó {valorEsperado} pero el equipo tiene {valorConfirmado}.");
            }
        }
        else
        {
            ushort valorEsperado = propiedad.PropertyType == typeof(string)
                ? ushort.Parse((string)valorActual)
                : Convert.ToUInt16(valorActual);
            var registrosLeidos = await master.ReadHoldingRegistersAsync(dispositivo.SlaveId, (ushort)campo.Direccion, 1);

            if (registrosLeidos[0] != valorEsperado)
            {
                throw new InvalidOperationException(
                    $"No se confirmó la escritura: se mandó {valorEsperado} pero el equipo tiene {registrosLeidos[0]}.");
            }
        }
    }

    // Contraseña UTD (dirección 250): escribir el valor nuevo directo (un
    // solo write) nunca persistía (confirmado con hardware real -- ACK
    // válido, pero relee 0 al toque). Hipótesis confirmada con hardware
    // real, calcada del flujo del Interrogador portátil (que sí logra
    // cambiarla): para entrar a "Unidad de Verificación" hace falta
    // escribir/confirmar la contraseña VIGENTE primero -- la UTD exige ese
    // mismo "reafirmar lo actual" antes de aceptar un valor distinto, no
    // acepta cualquier valor nuevo de una. Con esta secuencia (reafirmar +
    // nuevo) persiste ~9 de cada 10 veces -- la falla ocasional que queda
    // la atrapa la reconfirmación de EscribirCamposAsync, igual que
    // cualquier otro campo. Por eso acá, a diferencia de
    // EscribirCampoAsync (un solo write), se lee el valor real actual, se
    // reescribe tal cual (paso 1, "reafirmar"), y recién después se
    // escribe el valor nuevo (paso 2).
    private static async Task EscribirContrasenaUtdAsync(IModbusMaster master, Dispositivo dispositivo, CampoSitio campo, ILogger logger)
    {
        var propiedad = typeof(Dispositivo).GetProperty(campo.Propiedad)!;
        var valorActual = propiedad.GetValue(dispositivo);
        if (valorActual is null)
        {
            return; // nada configurado todavía -- no hay qué escribir
        }

        var valorNuevo = uint.Parse((string)valorActual);
        var (bajoNuevo, altoNuevo) = DescomponerUInt32(valorNuevo);

        // Logs detallados a propósito (no solo el genérico de arriba) --
        // esto sigue en investigación (ver comentario grande abajo), así
        // que cada paso queda visible con su hora exacta en el log para
        // poder reconstruir la secuencia completa después.
        var enElEquipo = await master.ReadHoldingRegistersAsync(dispositivo.SlaveId, (ushort)campo.Direccion, (ushort)campo.LongitudRegistros);
        var actualEnElEquipo = CombinarUInt32(enElEquipo[0], enElEquipo[1]);
        logger.LogInformation(
            "ContrasenaUtd[{Dispositivo}]: leído actual={Actual}, se va a reafirmar y escribir nuevo={Nuevo}.",
            dispositivo.Nombre, actualEnElEquipo, valorNuevo);

        // Paso 1: reafirmar la contraseña vigente (si ya coincide con la
        // nueva, este paso no cambia nada, pero repetirlo no hace daño).
        // Se escriben las dos palabras juntas (mismo registro Modbus,
        // ambos words) para no dejar una combinación mitad vieja/mitad
        // nueva entre medio.
        await master.WriteMultipleRegistersAsync(dispositivo.SlaveId, (ushort)campo.Direccion, new[] { enElEquipo[0], enElEquipo[1] });
        logger.LogInformation("ContrasenaUtd[{Dispositivo}]: paso 1 (reafirmar {Actual}) enviado.",
            dispositivo.Nombre, actualEnElEquipo);

        // Paso 2: recién ahora el valor nuevo.
        await master.WriteMultipleRegistersAsync(dispositivo.SlaveId, (ushort)campo.Direccion, new[] { bajoNuevo, altoNuevo });
        logger.LogInformation("ContrasenaUtd[{Dispositivo}]: paso 2 (nuevo {Nuevo}) enviado.",
            dispositivo.Nombre, valorNuevo);

        var registrosLeidos = await master.ReadHoldingRegistersAsync(dispositivo.SlaveId, (ushort)campo.Direccion, (ushort)campo.LongitudRegistros);
        var leido = CombinarUInt32(registrosLeidos[0], registrosLeidos[1]);
        logger.LogInformation("ContrasenaUtd[{Dispositivo}]: relectura inmediata={Leido} (esperado {Nuevo}).",
            dispositivo.Nombre, leido, valorNuevo);

        if (leido != valorNuevo)
        {
            throw new InvalidOperationException(
                $"No se confirmó la escritura: se mandó {valorNuevo} pero el equipo tiene {leido}.");
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
        else if (campo.Tipo == TipoRegistroSitio.UInt32)
        {
            var registros = await master.ReadHoldingRegistersAsync(dispositivo.SlaveId, (ushort)campo.Direccion, (ushort)campo.LongitudRegistros);
            var combinado = CombinarUInt32(registros[0], registros[1]);
            object valor = propiedad.PropertyType == typeof(string)
                ? combinado.ToString()
                : (long)combinado;
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
