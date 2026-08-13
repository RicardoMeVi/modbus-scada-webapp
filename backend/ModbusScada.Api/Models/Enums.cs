namespace ModbusScada.Api.Models;

public enum TipoConexion
{
    Tcp,
    Rtu
}

public enum TipoTablaModbus
{
    Coil,             // 1 bit, lectura/escritura       -> funciones 01 / 05 / 15
    DiscreteInput,    // 1 bit, solo lectura             -> función 02
    HoldingRegister,  // 16 bits, lectura/escritura       -> funciones 03 / 06 / 16
    InputRegister     // 16 bits, solo lectura            -> función 04
}

public enum TipoDatoModbus
{
    UInt16,
    Int16,
    UInt32,
    Int32,
    Float32,
    String
}
