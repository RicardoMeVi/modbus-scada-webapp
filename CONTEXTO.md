# Contexto del Proyecto — Sistema SCADA/IoT Modbus (React + .NET)

> Este documento resume todas las decisiones de arquitectura, aprendizajes y
> contexto técnico definidos antes de empezar la implementación. Está pensado
> para que cualquier desarrollador (o una IA como Claude Code) pueda retomar
> el proyecto sin perder contexto.

## 1. Objetivo del proyecto

Construir un sistema tipo SCADA/HMI web para monitoreo y control remoto de
dispositivos industriales que hablan **protocolo Modbus** (TCP y/o RTU),
pensado para ser **escalable a múltiples clientes/plantas** sin necesidad de
modificar código para cada nuevo dispositivo.

Caso de uso real que origina el proyecto: modernizar un sistema de
telemetría de agua (caudal, totalizado, presión) que actualmente usa paneles
HMI industriales dedicados y fijos (marcas Kinco, ICH, RTU Mobicon MT-151 de
Inventia), migrando hacia un dashboard web accesible desde cualquier
dispositivo (tablet, notebook, celular).

## 2. Stack tecnológico definido

| Capa | Tecnología | Notas |
|---|---|---|
| Frontend | **React** | Dashboard en tiempo real, gráficas, control |
| Backend | **.NET (ASP.NET Core)** | Elegido por escalabilidad empresarial |
| Comunicación Modbus | **NModbus** | Librería .NET para Modbus TCP/RTU (cliente y servidor) |
| Tiempo real Front↔Back | **SignalR** | Preferido sobre WebSockets crudos: reconexión automática, fallback, grupos |
| Base de datos | **PostgreSQL o SQL Server** | Vía Entity Framework Core |
| Polling de dispositivos | **BackgroundService (.NET)** | Lee dispositivos Modbus periódicamente |

### Por qué esta arquitectura (importante para no repetir el error)

Un navegador web **no puede hablar Modbus directamente** (no tiene acceso a
sockets TCP crudos ni puertos seriales por seguridad del navegador). Por eso
es obligatorio un backend intermedio que:
1. Hable Modbus con los dispositivos reales (NModbus)
2. Exponga esos datos al front vía HTTP (REST) y tiempo real (SignalR)

```
[Dispositivo Modbus] <--Modbus TCP/RTU--> [Backend .NET] <--SignalR/REST--> [Front React]
   (Mobicon, Arduino,        (NModbus +                      (navegador)
    servidores de prueba)     BackgroundService)
```

## 3. Modelo de datos sugerido (clave para la escalabilidad)

El mapa de registros Modbus **NO debe hardcodearse en código**. Debe vivir
en la base de datos, para que agregar un nuevo cliente/dispositivo sea solo
insertar filas, no tocar código.

```csharp
public class Dispositivo
{
    public int Id { get; set; }
    public string Nombre { get; set; }
    public string IpAddress { get; set; }   // null si es RTU serial
    public int Puerto { get; set; }         // 502 por defecto en TCP
    public byte SlaveId { get; set; }
    public TipoConexion Conexion { get; set; } // TCP o RTU
    public string PuertoSerial { get; set; }   // COM3, /dev/ttyUSB0, etc (si RTU)
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
    UInt16, Int16, UInt32, Int32, Float32, String
}

public class RegistroModbus
{
    public int Id { get; set; }
    public int DispositivoId { get; set; }
    public string Nombre { get; set; }          // "Caudal instantáneo"
    public TipoTablaModbus Tabla { get; set; }
    public int Direccion { get; set; }          // dirección PDU (base 0, ¡ojo con offsets!)
    public TipoDatoModbus TipoDato { get; set; }
    public string Unidad { get; set; }          // "m3/h"
    public string OrdenBytes { get; set; }       // ABCD/DCBA/BADC/CDAB (para 32-bit)
}

public class LecturaHistorica
{
    public int Id { get; set; }
    public int RegistroModbusId { get; set; }
    public double Valor { get; set; }
    public DateTime Timestamp { get; set; }
}
```

## 4. Fundamentos de Modbus ya validados en pruebas (no repetir investigación)

Todo esto fue estudiado a fondo desde la especificación oficial
(MODBUS Application Protocol Specification V1.1b3) y **probado en la
práctica** con un servidor Python simulado + Ignition + mbpoll:

### 4.1 Las 4 tablas de datos
| Tabla | Tamaño | Acceso | Ejemplo real |
|---|---|---|---|
| Coil | 1 bit | Lectura/Escritura | Bomba ON/OFF |
| Discrete Input | 1 bit | Solo lectura | Sensor de fin de carrera |
| Holding Register | 16 bits | Lectura/Escritura | Setpoint de temperatura |
| Input Register | 16 bits | Solo lectura | Lectura de sensor (caudal, temp) |

### 4.2 Funciones Modbus principales
| Función | Código | Uso |
|---|---|---|
| Read Coils | 01 (0x01) | Leer bits R/W |
| Read Discrete Inputs | 02 (0x02) | Leer bits solo lectura |
| Read Holding Registers | 03 (0x03) | Leer registros R/W |
| Read Input Registers | 04 (0x04) | Leer registros solo lectura |
| Write Single Coil | 05 (0x05) | Escribir 1 bit (`0xFF00`=ON, `0x0000`=OFF) |
| Write Single Register | 06 (0x06) | Escribir 1 registro de 16 bits |
| Write Multiple Coils | 15 (0x0F) | Escribir varios bits de una vez |
| Write Multiple Registers | 16 (0x10) | Escribir varios registros de una vez |

### 4.3 Regla del offset (fuente #1 de bugs en integraciones reales)
> Un dato Modbus numerado como **X** (numeración de aplicación/manual del
> fabricante, base 1) se direcciona en el **PDU real como X-1** (base 0).

Ejemplo: "Holding Register 40001" del datasheet de un fabricante ==
dirección PDU `0` en el paquete real. **Siempre verificar en la
documentación del dispositivo si la numeración que dan es base-0 o base-1.**

### 4.4 Big-endian y tipos de dato de 32 bits
- Modbus transmite en **big-endian**: byte más significativo primero.
- Un registro de 16 bits solo llega a 65535. Para números más grandes o
  decimales, los fabricantes combinan **2 registros consecutivos** como
  `int32` o `float32` (IEEE 754).
- El **orden de combinación de esos 2 registros varía por fabricante**:
  ABCD (estándar), DCBA, BADC, CDAB. Si el valor leído no tiene sentido,
  sospechar primero de esto antes que de un error de conexión.
- **Siempre consultar el datasheet del fabricante** para saber el tipo de
  dato exacto y el orden de bytes de cada registro — Modbus como protocolo
  no lo comunica, es responsabilidad de la aplicación saberlo de antemano.

### 4.5 Diagrama de validación que sigue todo servidor Modbus
1. ¿Función soportada? → si no, error `ILLEGAL FUNCTION` (0x01)
2. ¿Dirección válida? → si no, error `ILLEGAL DATA ADDRESS` (0x02)
3. ¿Valor válido? → si no, error `ILLEGAL DATA VALUE` (0x03)
4. Ejecutar → si falla, error `SERVER DEVICE FAILURE` (0x04)
5. Responder con dato (éxito) o con excepción (function code + 0x80)

## 5. Dispositivos objetivo del proyecto

### 5.1 Servidor de pruebas simulado (ya construido, en Python)
Existe un `modbus_servidor.py` funcional (pymodbus 3.7.4) que simula un
tanque con bomba, con lógica causa-efecto real:
- `Coil 0` = Bomba ON/OFF
- `Holding Register 0` = Setpoint deseado
- `Input Register 0` = Nivel del tanque (sube si bomba ON, baja si OFF)

Sirve como servidor de prueba mientras no hay hardware físico disponible.
Se recomienda **reimplementar un equivalente en .NET con NModbus** para
tener un simulador nativo del mismo stack del backend.

### 5.2 RTU real: Mobicon MT-151 (Inventia)
- Tiene puerto Ethernet (Modbus TCP) y 2 puertos seriales RS-232/RS-232-485
  (Modbus RTU/ASCII).
- Divide sus datos en Input Registers (solo lectura) y Holding Registers
  (lectura/escritura), igual que el estándar.
- Registros desde dirección 1024 e Input Registers se resetean a cero al
  reiniciar el módulo; registros hasta 1023 son no volátiles.
- Software oficial de configuración: **MTManager** (Inventia) — pendiente
  conseguir acceso para configurar IP y ver el mapa de registros real.
- Manual completo con "Memory map" (mapa de registros) pendiente de
  conseguir en PDF completo.
- Unidad actualmente es de pruebas (sin antena/chip GSM conectados, no está
  en producción) — seguro para experimentar con lectura/escritura.

### 5.3 Sensor de humedad con Arduino (pendiente de definir modelo exacto)
Plan: usar como segundo dispositivo de prueba real (no simulado). Según
el microcontrolador:
- **ESP32/ESP8266** (con WiFi) → Modbus TCP directo, mismo patrón que el
  servidor Python de pruebas.
- **Arduino UNO/Nano** (sin red) → requiere módulo MAX485 para Modbus RTU
  serial, o USB-RS485.

## 6. Entorno de desarrollo ya configurado

- **Mac**: Python 3.13 (vía Homebrew), Java (para Ignition), Git, VS Code.
- **Windows**: Python 3.12, VS Code, Visual Studio Build Tools (C++),
  CMake, mbpoll.exe compilado manualmente (nota: bloqueado actualmente por
  Kaspersky Endpoint Security gestionado por TI institucional — pendiente
  solicitar excepción para el ejecutable o el puerto TCP 502/5020).
- **Ignition** (SCADA comercial, usado para aprender/prototipar): instalado
  en Mac, con Device Connection Modbus TCP funcional contra el servidor
  Python de pruebas. Sirve como referencia de "qué debe poder hacer" el
  sistema propio, no como parte del stack final.

## 7. Próximos pasos sugeridos

1. Crear el backend .NET (ASP.NET Core Web API + SignalR Hub).
2. Implementar el `BackgroundService` de polling Modbus con NModbus,
   leyendo la configuración de dispositivos/registros desde la base de
   datos (no hardcodeado).
3. Migrar el servidor de pruebas simulado de Python a un equivalente en
   .NET (o mantenerlo en Python solo como servidor de prueba externo,
   ya que Modbus es agnóstico al lenguaje del otro extremo).
4. Levantar el esqueleto de React con conexión SignalR y consumo de la
   API REST.
5. Conseguir el manual completo / memory map del Mobicon MT-151 y el
   software MTManager para pruebas contra hardware real.
6. Definir sensor Arduino exacto (modelo de microcontrolador y sensor) para
   sumarlo como segundo dispositivo real de prueba.
