# Contexto del Proyecto — Sistema SCADA/IoT Modbus (React + .NET)

> Este documento resume todas las decisiones de arquitectura, aprendizajes y
> contexto técnico definidos antes de empezar la implementación. Está pensado
> para que cualquier desarrollador (o una IA como Claude Code) pueda retomar
> el proyecto sin perder contexto.
>
> **Versión 2** — corrige y confirma decisiones de arquitectura que en la
> v1 estaban como hipótesis.

## 1. Objetivo del proyecto

Construir un sistema tipo SCADA/HMI web para monitoreo y control remoto de
un sistema de **extracción de agua de pozos**, que actualmente usa paneles
HMI industriales dedicados y fijos ("la lonchera" — apodo interno del
sistema viejo a reemplazar). El nuevo sistema debe:

- Reemplazar los paneles HMI físicos fijos (Kinco GL070, y posibles otros)
  por un dashboard web accesible desde cualquier dispositivo (notebook,
  tablet, celular).
- Ser **escalable a múltiples pozos/sitios** sin modificar código para cada
  nuevo dispositivo — solo agregar configuración.
- Desarrollarse en VS Code (indicación directa del responsable del
  proyecto), lo que confirma que la vía es **programar el sistema propio**,
  no configurar una herramienta HMI de terceros (se descarta usar Kinco
  DTools o Ignition como producto final; Ignition solo se usó como entorno
  de aprendizaje/prototipo de la teoría Modbus).

## 2. Arquitectura de conexión con el hardware — CONFIRMADA

**Decisión confirmada:** el backend se conecta al **RTU Mobicon MT-151**
(Inventia), **NO directamente a cada sensor individual** (caudal, nivel,
presión, etc.).

Razón: el Mobicon es un RTU (Remote Terminal Unit) diseñado justamente para
centralizar todas las señales de un pozo/sitio (sensores analógicos,
digitales, seriales) y exponerlas de forma unificada vía Modbus. Conectarse
sensor por sensor duplicaría ese trabajo, sería más frágil, y perdería la
resiliencia que el Mobicon ya ofrece (buffer local, SD card, capacidad
celular para sitios remotos).

```
Pozo de extracción
  │
  ├── Sensor de caudal ──┐
  ├── Sensor de nivel ────┤──→ Mobicon MT-151 (centraliza todo el sitio)
  ├── Sensor de presión ──┤         │
  └── Estado de bomba ────┘         │  Modbus TCP/RTU (un solo punto de conexión por sitio)
                                     │
                                     ▼
                          Backend .NET (NModbus + BackgroundService)
                                     │
                                     │  SignalR (tiempo real) + REST API
                                     ▼
                            Front React (dashboard)
```

Si en el futuro hay múltiples pozos, cada uno tendría su propio Mobicon:
el modelo de datos (sección 5) ya contempla esto — cada Mobicon es una fila
en la tabla `Dispositivo`, no hace falta rediseñar nada para escalar a
varios sitios.

## 3. Referencia visual para el Front (React) — estructura a replicar

El panel HMI actual (**Kinco GL070**, 7", programado con **Kinco DTools**)
tiene una pantalla de menú principal con la siguiente estructura de
navegación, que sirve como **punto de partida de referencia** para el
diseño de navegación del nuevo front en React:

| Icono/Sección en el HMI actual | Función que representa (a definir en detalle después) |
|---|---|
| **Datos del sitio** | Información general/identificación del sitio o pozo monitoreado |
| **Mensaje (SMS)** | Envío/recepción de mensajes SMS del sistema (probablemente ligado a la capacidad GSM del Mobicon) |
| **FTP** | Transferencia de archivos (posible descarga de logs/históricos guardados en SD card del Mobicon) |
| **Fecha / Hora** | Configuración de reloj del sistema |
| **Alarmas** | Visualización/gestión de alarmas del sitio |
| Indicadores de estado (COM, CPU, PWR) | Estado de comunicación, procesamiento y alimentación del propio HMI |

**Nota importante:** estas secciones son la referencia de **qué existía en
el sistema viejo**, no una especificación cerrada. Cada sección se
detallará **una a la vez, en conversaciones futuras**, definiendo qué datos
Modbus exactos debe mostrar/permitir modificar cada una. No se debe
implementar el detalle interno de cada sección todavía — solo la estructura
de navegación general (por ejemplo, un menú o sidebar con estas 5
secciones) puede dejarse como esqueleto inicial del front.

También existe un segundo panel (identificado en fotos como marca "ICH" en
pantalla, aunque el hardware físico también resultó ser un Kinco) que
mostraba una vista de **Caudal instantáneo (m3/h)** y **Totalizado (m3)** —
esta vista es candidata a integrarse dentro de alguna de las secciones de
arriba (posiblemente dentro de "Datos del sitio" o como vista principal del
dashboard), pero también queda pendiente de definir con detalle.

## 4. Stack tecnológico definido

| Capa | Tecnología | Notas |
|---|---|---|
| Frontend | **React** | Dashboard en tiempo real, gráficas, control. Estructura de navegación inicial inspirada en el HMI Kinco actual (ver sección 3) |
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

## 5. Modelo de datos sugerido (clave para la escalabilidad)

El mapa de registros Modbus **NO debe hardcodearse en código**. Debe vivir
en la base de datos, para que agregar un nuevo pozo/sitio/dispositivo sea
solo insertar filas, no tocar código.

```csharp
public class Dispositivo
{
    public int Id { get; set; }
    public string Nombre { get; set; }       // ej. "Pozo 1 - Mobicon"
    public string IpAddress { get; set; }    // null si es RTU serial
    public int Puerto { get; set; }          // 502 por defecto en TCP
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

## 6. Fundamentos de Modbus ya validados en pruebas (no repetir investigación)

Todo esto fue estudiado a fondo desde la especificación oficial
(MODBUS Application Protocol Specification V1.1b3) y **probado en la
práctica** con un servidor Python simulado + Ignition + mbpoll:

### 6.1 Las 4 tablas de datos
| Tabla | Tamaño | Acceso | Ejemplo real |
|---|---|---|---|
| Coil | 1 bit | Lectura/Escritura | Bomba ON/OFF |
| Discrete Input | 1 bit | Solo lectura | Sensor de fin de carrera |
| Holding Register | 16 bits | Lectura/Escritura | Setpoint de temperatura |
| Input Register | 16 bits | Solo lectura | Lectura de sensor (caudal, temp) |

### 6.2 Funciones Modbus principales
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

### 6.3 Regla del offset (fuente #1 de bugs en integraciones reales)
> Un dato Modbus numerado como **X** (numeración de aplicación/manual del
> fabricante, base 1) se direcciona en el **PDU real como X-1** (base 0).

Ejemplo: "Holding Register 40001" del datasheet de un fabricante ==
dirección PDU `0` en el paquete real. **Siempre verificar en la
documentación del dispositivo si la numeración que dan es base-0 o base-1.**

### 6.4 Big-endian y tipos de dato de 32 bits
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

### 6.5 Diagrama de validación que sigue todo servidor Modbus
1. ¿Función soportada? → si no, error `ILLEGAL FUNCTION` (0x01)
2. ¿Dirección válida? → si no, error `ILLEGAL DATA ADDRESS` (0x02)
3. ¿Valor válido? → si no, error `ILLEGAL DATA VALUE` (0x03)
4. Ejecutar → si falla, error `SERVER DEVICE FAILURE` (0x04)
5. Responder con dato (éxito) o con excepción (function code + 0x80)

## 7. Dispositivos y hardware identificados

### 7.1 Servidor de pruebas simulado (ya construido, en Python)
Existe un `modbus_servidor.py` funcional (pymodbus 3.7.4) que simula un
tanque con bomba, con lógica causa-efecto real:
- `Coil 0` = Bomba ON/OFF
- `Holding Register 0` = Setpoint deseado
- `Input Register 0` = Nivel del tanque (sube si bomba ON, baja si OFF)

Sirve como servidor de prueba mientras no hay acceso completo al Mobicon
real. Se recomienda **reimplementar un equivalente en .NET con NModbus**
para tener un simulador nativo del mismo stack del backend.

### 7.2 RTU real: Mobicon MT-151 (Inventia) — punto de conexión principal confirmado
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
- **Este es el dispositivo al que el backend .NET debe conectarse**, NO a
  los sensores individuales (ver sección 2).

### 7.3 Paneles HMI existentes ("la lonchera" — sistema a reemplazar)
- **Kinco GL070**: HMI táctil de 7", 800x480px, ARM RISC 32-bit,
  programable con **Kinco DTools** (v3.3+). Puertos: USB Host, USB Slave,
  COM1/COM2 (serial, RS232/485/422), COM1/CAN, alimentación 24VDC. El
  modelo GL070 base no incluye Ethernet (existe variante GL070E que sí);
  la carcasa física puede ser compartida entre variantes — pendiente
  confirmar en el propio dispositivo si el puerto Ethernet visible está
  realmente habilitado.
- Al menos un panel Kinco tenía cargado un proyecto identificado en
  pantalla como "ICH" (posiblemente nombre interno del proyecto/empresa,
  no fabricante — el hardware detrás es Kinco, confirmado por etiqueta).
- Estos paneles **no se reprogramarán ni se usarán como base** — se
  reemplazan completamente por el nuevo sistema React + .NET, que leerá
  los mismos datos directo desde el Mobicon.
- La estructura de navegación que mostraban (ver sección 3) sí sirve como
  referencia de diseño para el nuevo front.

### 7.4 Sensor de humedad con Arduino (pendiente de definir modelo exacto)
Plan: usar como segundo dispositivo de prueba real (no simulado), sin
relación directa con el sistema de pozos — es un dispositivo aparte para
practicar/validar el stack con hardware físico propio. Según el
microcontrolador:
- **ESP32/ESP8266** (con WiFi) → Modbus TCP directo, mismo patrón que el
  servidor Python de pruebas.
- **Arduino UNO/Nano** (sin red) → requiere módulo MAX485 para Modbus RTU
  serial, o USB-RS485.

## 8. Entorno de desarrollo ya configurado

- **Mac**: Python 3.13 (vía Homebrew), Java (para Ignition), Git, VS Code.
- **Windows**: Python 3.12, VS Code, Visual Studio Build Tools (C++),
  CMake, mbpoll.exe compilado manualmente (nota: bloqueado actualmente por
  Kaspersky Endpoint Security gestionado por TI institucional — pendiente
  solicitar excepción para el ejecutable o el puerto TCP 502/5020).
- **Ignition** (SCADA comercial, usado para aprender/prototipar): instalado
  en Mac, con Device Connection Modbus TCP funcional contra el servidor
  Python de pruebas. Sirve como referencia de "qué debe poder hacer" el
  sistema propio, no como parte del stack final.

## 9. Pendientes para avanzar con el hardware real

1. Conseguir el manual completo / memory map del Mobicon MT-151 y acceso
   al software MTManager.
2. Confirmar si las pruebas contra el Mobicon serán por Ethernet (TCP) o
   serial (RTU), y obtener la IP o parámetros seriales configurados.
3. Definir modelo exacto de Arduino/sensor de humedad para las pruebas de
   hardware propio (independiente del proyecto de pozos).
4. Confirmar con el responsable del proyecto el detalle de cada sección
   del front (Datos del sitio, Mensaje/SMS, FTP, Fecha/Hora, Alarmas) —
   se definirán **una a la vez**, no todas juntas.
5. Resolver bloqueo de Kaspersky en Windows (solicitar excepción a TI) para
   poder usar mbpoll.exe libremente en esa máquina.

## 10. Próximos pasos técnicos sugeridos (implementación)

1. Crear el backend .NET (ASP.NET Core Web API + SignalR Hub).
2. Implementar el `BackgroundService` de polling Modbus con NModbus,
   leyendo la configuración de dispositivos/registros desde la base de
   datos (no hardcodeado).
3. Migrar el servidor de pruebas simulado de Python a un equivalente en
   .NET (o mantenerlo en Python solo como servidor de prueba externo,
   ya que Modbus es agnóstico al lenguaje del otro extremo).
4. Levantar el esqueleto de React con:
   - Conexión SignalR y consumo de la API REST.
   - Estructura de navegación inicial inspirada en el HMI Kinco actual
     (5 secciones: Datos del sitio, Mensaje, FTP, Fecha/Hora, Alarmas),
     como esqueleto vacío — el contenido interno de cada sección se
     define después, una por una.
5. Una vez resuelto el punto 9.1 y 9.2, apuntar el backend al Mobicon real
   en lugar del servidor de pruebas simulado.