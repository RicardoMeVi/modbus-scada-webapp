using ModbusScada.Api.Models;

namespace ModbusScada.Api.Services.Modbus;

public enum TipoRegistroSitio { String, UInt16 }

// (nombre de la propiedad en Dispositivo, dirección Modbus real, tipo,
// largo en registros si es String). Direcciones tomadas de la
// especificación del Interrogador portátil (secciones 3.1-3.4). Los campos
// sin dirección documentada (ContrasenaUtd, SmsTipoMensaje, FtpTipoMensaje)
// quedan deliberadamente fuera de este mapa -- se siguen guardando solo en
// la base de datos local, no se inventa una dirección para ellos.
public record CampoSitio(string Propiedad, int Direccion, TipoRegistroSitio Tipo, int LongitudRegistros = 1);

public static class SiteRegisterMap
{
    public static readonly IReadOnlyList<CampoSitio> Campos = new[]
    {
        new CampoSitio(nameof(Dispositivo.Rfc), 31, TipoRegistroSitio.String, 13),
        new CampoSitio(nameof(Dispositivo.Nsm), 44, TipoRegistroSitio.String, 17),
        new CampoSitio(nameof(Dispositivo.Nsue), 61, TipoRegistroSitio.String, 17),
        new CampoSitio(nameof(Dispositivo.Nsut), 78, TipoRegistroSitio.String, 17),
        new CampoSitio(nameof(Dispositivo.Latitud), 95, TipoRegistroSitio.String, 11),
        new CampoSitio(nameof(Dispositivo.Longitud), 106, TipoRegistroSitio.String, 15),
        new CampoSitio(nameof(Dispositivo.UnidadVerificacion), 121, TipoRegistroSitio.UInt16),

        new CampoSitio(nameof(Dispositivo.SmsNumero), 122, TipoRegistroSitio.String, 10),
        new CampoSitio(nameof(Dispositivo.SmsHoraEnvio), 132, TipoRegistroSitio.UInt16),
        new CampoSitio(nameof(Dispositivo.SmsMinutoEnvio), 133, TipoRegistroSitio.UInt16),

        new CampoSitio(nameof(Dispositivo.FtpIpServidor), 431, TipoRegistroSitio.String, 13),
        new CampoSitio(nameof(Dispositivo.FtpUsuario), 149, TipoRegistroSitio.String, 17),
        new CampoSitio(nameof(Dispositivo.FtpContrasena), 184, TipoRegistroSitio.String, 17),
        new CampoSitio(nameof(Dispositivo.FtpCarpeta), 199, TipoRegistroSitio.String, 17),
        new CampoSitio(nameof(Dispositivo.FtpHoraEnvio), 239, TipoRegistroSitio.String, 11),
        new CampoSitio(nameof(Dispositivo.FtpMinutoEnvio), 240, TipoRegistroSitio.String, 15),
    };
}
