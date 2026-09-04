using System.Text.RegularExpressions;
using ModbusScada.Api.Models;

namespace ModbusScada.Api.Services.Modbus;

public enum TipoRegistroSitio { String, UInt16, UInt32 }

// (nombre de la propiedad en Dispositivo, dirección Modbus real, tipo,
// largo en registros si es String, validación adicional opcional).
// Direcciones tomadas de la especificación del Interrogador portátil
// (secciones 3.1-3.4), con el ajuste -1 confirmado con hardware real (ver
// comentario más abajo, arriba de `Campos`). Los campos sin dirección
// confirmada (SmsTipoMensaje, FtpTipoMensaje) quedan deliberadamente fuera
// de este mapa -- se siguen guardando solo en la base de datos local, no
// se inventa una dirección para ellos. ContrasenaUtd (dirección 250) no
// venía en el manual del Interrogador -- se consiguió por otro lado y se
// confirmó con la misma prueba de escritura+relectura que NSM (251, la
// primera dirección probada, no coincidía con lo escrito -- 250 sí).
    //
// `ValidadorAdicional`: SiteConfigModbusIO ya descarta cualquier lectura
// con caracteres no imprimibles, pero eso no alcanza para todos los casos
// -- se confirmó con hardware real que el registro 442 (dentro del rango
// declarado de FtpIpServidor, 431-443) es en realidad un contador interno
// que sube solo (313, 314, 315...), no relleno en 0x00 como asumía
// ModbusStringCodec. Enmascarado a 1 byte, esos valores caen en rango
// imprimible igual (':', ';', etc.), así que sin un chequeo de formato
// específico por campo esa lectura corrupta se aceptaba igual. Por ahora
// solo IP de FTP tiene un formato lo bastante estricto como para validarlo
// así -- el resto de los campos de texto no tienen un formato conocido
// para chequear más allá de "es imprimible".
// `ExcluirDeSondeoPasivo`: no se relee en el sondeo de fondo automático
// (SiteConfigModbusIO.LeerCamposAsync, cada ~30s) -- solo se lee/escribe
// cuando el usuario guarda explícitamente desde "Datos del sitio"
// (EscribirCamposAsync, que ya hace escritura + relectura de confirmación
// antes de persistir). Pensado para ContrasenaUtd: como también es el PIN
// del modal de acceso a la app, un glitch de comunicación puntual en el
// sondeo pasivo podía pisarlo con basura sin que el usuario tocara nada,
// dejándolo afuera de su propia app con el PIN "correcto" que él mismo
// puso. A diferencia de Fecha/Hora (donde un valor fuera de rango se
// puede detectar y descartar), un PIN puede ser cualquier número -- no
// hay forma de distinguir "esto es basura" de "esto es un PIN real", así
// que la única defensa real es no releerlo pasivamente en absoluto.
public record CampoSitio(
    string Propiedad,
    int Direccion,
    TipoRegistroSitio Tipo,
    int LongitudRegistros = 1,
    Func<string, bool>? ValidadorAdicional = null,
    bool ExcluirDeSondeoPasivo = false);

public static class SiteRegisterMap
{
    // Registro de control de escritura -- "Tipo de dato" -> "Escritura
    // Kinco a Interrogador" en el menú físico secreto de la UTD (0 = la
    // UTD tiene el control y escribe hacia el maestro, 1 = el maestro
    // toma el control y puede escribir hacia la UTD). Encontrado por
    // prueba directa (diff de un rango de holding registers antes/después
    // de mover el toggle físico), no por el manual -- ahí no tiene
    // dirección asignada, solo aparece como campo visual en la pantalla
    // "Tipo de dato" (Figura 5). El manual sí describe el comportamiento
    // esperado (sección "Escritura de datos hacia la UTD" / "Consideraciones
    // de seguridad"): el Interrogador prende este candado al entrar a la
    // pantalla con contraseña "Unidad de Verificación" y lo apaga al
    // salir, dejando el equipo en modo lectura el resto del tiempo --
    // EscribirCamposAsync replica ese mismo prender/apagar alrededor de
    // cada guardado, en vez de depender de que alguien lo deje fijo a mano.
    public const int RegistroControlEscritura = 26;

    private static readonly Regex Ipv4Regex =
        new(@"^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$", RegexOptions.Compiled);

    // Mismo formato que valida el frontend (FichaSitio.jsx): 3-4 letras +
    // 6 dígitos de fecha + 3 caracteres de homoclave.
    private static readonly Regex RfcRegex =
        new(@"^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$", RegexOptions.Compiled);

    // OJO -- direcciones corregidas -1 respecto a la "Dirección Modbus" que
    // documenta el manual del Interrogador (secciones 3.2-3.4). Confirmado
    // con hardware real (ModScan, campo NSM): el primer carácter de un
    // string aparecía en la dirección cruda "Dirección Modbus - 1" (que
    // coincide con la columna "Dirección HMI UTD"/RW de esa misma tabla).
    // Fecha/Hora y Medidores NO llevan este ajuste (confirmados correctos
    // tal cual documenta el manual) -- ver CONTEXTONuevo.md sección 3 para
    // el detalle completo de por qué.
    public static readonly IReadOnlyList<CampoSitio> Campos = new[]
    {
        new CampoSitio(nameof(Dispositivo.Rfc), 30, TipoRegistroSitio.String, 13, RfcRegex.IsMatch),
        new CampoSitio(nameof(Dispositivo.Nsm), 43, TipoRegistroSitio.String, 17),
        new CampoSitio(nameof(Dispositivo.Nsue), 60, TipoRegistroSitio.String, 17),
        new CampoSitio(nameof(Dispositivo.Nsut), 77, TipoRegistroSitio.String, 17),
        new CampoSitio(nameof(Dispositivo.Latitud), 94, TipoRegistroSitio.String, 11),
        new CampoSitio(nameof(Dispositivo.Longitud), 105, TipoRegistroSitio.String, 15),
        new CampoSitio(nameof(Dispositivo.UnidadVerificacion), 120, TipoRegistroSitio.UInt16),
        // Dirección conseguida aparte (no está en el manual del
        // Interrogador) -- confirmada con prueba de escritura+relectura
        // (mismo método que NSM): 251 daba un valor que no coincidía con
        // lo recién guardado, 250 sí. Esa prueba original se hizo con un
        // PIN corto (cabe en 16 bits) y llevó a mapear esto como UInt16 de
        // un solo registro -- pero la UTD acepta contraseñas de hasta 9
        // dígitos (hasta 999999999), que no entran en 16 bits. Confirmado
        // con un caso real: al poner "123456789" directo en la UTD, el
        // sistema (que solo leía el registro 250) mostraba "52501" --
        // exactamente 123456789 mod 65536, es decir la palabra BAJA de
        // 123456789 (0x075BCD15 -> bajo=0xCD15=52501, alto=0x075B=1883).
        // Eso indica que la UTD guarda esto como un valor de 32 bits en dos
        // registros consecutivos, 250=palabra baja / 251=palabra alta (por
        // eso 251 "no coincidía" en la prueba original: para un PIN corto
        // la palabra alta vale 0, y en ese momento se interpretó como "esta
        // no es la dirección correcta" en vez de "esta es la otra mitad").
        // Confirmado matemáticamente a partir de una lectura real; falta
        // todavía una prueba de escritura de ida y vuelta con un PIN largo
        // en equipo real para confirmar el orden de palabras al escribir
        // (ver EscribirContrasenaUtdAsync en SiteConfigModbusIO).
        // ExcluirDeSondeoPasivo=true porque también es el PIN de acceso a
        // la app -- ver comentario en CampoSitio arriba.
        new CampoSitio(nameof(Dispositivo.ContrasenaUtd), 250, TipoRegistroSitio.UInt32, LongitudRegistros: 2, ExcluirDeSondeoPasivo: true),

        new CampoSitio(nameof(Dispositivo.SmsNumero), 121, TipoRegistroSitio.String, 10),
        new CampoSitio(nameof(Dispositivo.SmsHoraEnvio), 131, TipoRegistroSitio.UInt16),
        new CampoSitio(nameof(Dispositivo.SmsMinutoEnvio), 132, TipoRegistroSitio.UInt16),

        new CampoSitio(nameof(Dispositivo.FtpIpServidor), 430, TipoRegistroSitio.String, 13, Ipv4Regex.IsMatch),
        new CampoSitio(nameof(Dispositivo.FtpUsuario), 148, TipoRegistroSitio.String, 17),
        new CampoSitio(nameof(Dispositivo.FtpContrasena), 183, TipoRegistroSitio.String, 17),
        new CampoSitio(nameof(Dispositivo.FtpCarpeta), 198, TipoRegistroSitio.String, 17),
        // El manual dice "String 11"/"String 15 caracteres" para estos dos
        // (copiado por error de Latitud/Longitud, un par de filas arriba en
        // la misma tabla) -- confirmado con hardware real que en realidad
        // son registros numéricos de 16 bits simples, igual que en SMS: la
        // propia pantalla física de la UTD muestra el valor crudo del
        // registro sin decodificar ("48 : 53 hrs" en vez de "0 : 5"), y el
        // largo declarado (11/15) hacía que escribir la hora pisara 11
        // registros de golpe, incluyendo el del minuto.
        new CampoSitio(nameof(Dispositivo.FtpHoraEnvio), 238, TipoRegistroSitio.UInt16),
        new CampoSitio(nameof(Dispositivo.FtpMinutoEnvio), 239, TipoRegistroSitio.UInt16),
    };
}
