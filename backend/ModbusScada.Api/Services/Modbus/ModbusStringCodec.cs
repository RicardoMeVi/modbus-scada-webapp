namespace ModbusScada.Api.Services.Modbus;

// Codificación usada por el UTD real para los campos de texto (RFC, NSM,
// IP de FTP, etc.): 1 carácter ASCII por registro de 16 bits (sección 3.2 y
// 3.3 de la especificación del Interrogador portátil). El relleno para
// cadenas más cortas que el largo declarado se asume 0x00 (el documento no
// lo aclara explícitamente) -- a confirmar en cuanto haya hardware real para
// leer un registro sin usar y ver qué deja el firmware.
public static class ModbusStringCodec
{
    public static ushort[] PackAscii(string valor, int longitudRegistros)
    {
        var registros = new ushort[longitudRegistros];

        for (int i = 0; i < longitudRegistros; i++)
        {
            registros[i] = i < valor.Length ? (ushort)valor[i] : (ushort)0;
        }

        return registros;
    }

    public static string UnpackAscii(ushort[] registros)
    {
        var caracteres = registros
            .TakeWhile(r => r != 0)
            .Select(r => (char)(r & 0xFF));

        return new string(caracteres.ToArray());
    }

    public static bool GetBit(ushort valorRegistro, int bit) => (valorRegistro & (1 << bit)) != 0;

    public static ushort SetBit(ushort valorRegistro, int bit, bool encendido) =>
        encendido
            ? (ushort)(valorRegistro | (1 << bit))
            : (ushort)(valorRegistro & ~(1 << bit));
}
