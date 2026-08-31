using System.Text.RegularExpressions;
using ModbusScada.Api.Models;

namespace ModbusScada.Api.Services.Modbus;

public enum TipoRegistroSitio { String, UInt16 }

// (nombre de la propiedad en Dispositivo, dirección Modbus real, tipo,
// largo en registros si es String, validación adicional opcional).
// Direcciones tomadas de la especificación del Interrogador portátil
// (secciones 3.1-3.4). Los campos sin dirección documentada (ContrasenaUtd,
// SmsTipoMensaje, FtpTipoMensaje) quedan deliberadamente fuera de este mapa
// -- se siguen guardando solo en la base de datos local, no se inventa una
// dirección para ellos.
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
public record CampoSitio(
    string Propiedad,
    int Direccion,
    TipoRegistroSitio Tipo,
    int LongitudRegistros = 1,
    Func<string, bool>? ValidadorAdicional = null);

public static class SiteRegisterMap
{
    private static readonly Regex Ipv4Regex =
        new(@"^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$", RegexOptions.Compiled);

    
    private static readonly Regex RfcRegex =
        new(@"^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$", RegexOptions.Compiled);

    
    public static readonly IReadOnlyList<CampoSitio> Campos = new[]
    {
        new CampoSitio(nameof(Dispositivo.Rfc), 30, TipoRegistroSitio.String, 13, RfcRegex.IsMatch),
        new CampoSitio(nameof(Dispositivo.Nsm), 43, TipoRegistroSitio.String, 17),
        new CampoSitio(nameof(Dispositivo.Nsue), 60, TipoRegistroSitio.String, 17),
        new CampoSitio(nameof(Dispositivo.Nsut), 77, TipoRegistroSitio.String, 17),
        new CampoSitio(nameof(Dispositivo.Latitud), 94, TipoRegistroSitio.String, 11),
        new CampoSitio(nameof(Dispositivo.Longitud), 105, TipoRegistroSitio.String, 15),
        new CampoSitio(nameof(Dispositivo.UnidadVerificacion), 120, TipoRegistroSitio.UInt16),
 
        new CampoSitio(nameof(Dispositivo.SmsNumero), 121, TipoRegistroSitio.String, 10),
        new CampoSitio(nameof(Dispositivo.SmsHoraEnvio), 131, TipoRegistroSitio.UInt16),
        new CampoSitio(nameof(Dispositivo.SmsMinutoEnvio), 132, TipoRegistroSitio.UInt16),

        new CampoSitio(nameof(Dispositivo.FtpIpServidor), 430, TipoRegistroSitio.String, 13, Ipv4Regex.IsMatch),
        new CampoSitio(nameof(Dispositivo.FtpUsuario), 148, TipoRegistroSitio.String, 17),
        new CampoSitio(nameof(Dispositivo.FtpContrasena), 183, TipoRegistroSitio.String, 17),
        new CampoSitio(nameof(Dispositivo.FtpCarpeta), 198, TipoRegistroSitio.String, 17),
        new CampoSitio(nameof(Dispositivo.FtpHoraEnvio), 238, TipoRegistroSitio.String, 11),
        new CampoSitio(nameof(Dispositivo.FtpMinutoEnvio), 239, TipoRegistroSitio.String, 15),
    };
}
