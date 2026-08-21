# Contexto del Proyecto — Sistema SCADA/IoT Modbus (React + .NET)

> Este documento resume todas las decisiones de arquitectura, aprendizajes y
> contexto técnico definidos antes de empezar la implementación. Está pensado
> para que cualquier desarrollador (o una IA como Claude Code) pueda retomar
> el proyecto sin perder contexto.
>
> **Versión 3** — incorpora el mapa de registros Modbus REAL de la UTD,
> obtenido del "Manual de Especificaciones — Interrogador Portátil ICH PSI".
> Ya no son suposiciones: son direcciones confirmadas por documentación
> oficial del sistema actual.
>
> **Estado actual:** el sistema descrito acá ya está implementado y
> compila/corre (ver `EJECUTABLE-CAMPO.md` para el ejecutable de campo).
> Las secciones 12 y 13 de abajo describían el plan *antes* de programar
> nada — quedan como referencia histórica; lo que realmente falta hoy está
> en `PENDIENTES_INSTALACION.md`.

## 1. Objetivo del proyecto

Construir un sistema tipo SCADA/HMI web para monitoreo y control remoto de
un sistema de **extracción de agua de pozos**, que actualmente usa un
esquema de HMIs Kinco dedicadas ("la lonchera" — apodo interno del sistema
viejo a reemplazar). El nuevo sistema debe:

- Reemplazar el flujo manual/portátil actual (ver sección 2) por un
  dashboard web permanente y remoto, accesible desde cualquier dispositivo.
- Ser **escalable a múltiples pozos/sitios** sin modificar código para cada
  nuevo dispositivo — solo agregar configuración.
- Desarrollarse en VS Code (indicación directa del responsable del
  proyecto): la vía es **programar el sistema propio**, no configurar una
  herramienta HMI de terceros (se descarta Kinco DTools o Ignition como
  producto final; Ignition solo se usó como entorno de aprendizaje de la
  teoría Modbus).

## 2. Arquitectura de comunicación real — CONFIRMADA (con matiz importante)

Existen **dos dispositivos Kinco distintos** en el sistema actual, y es
clave no confundirlos:

| Dispositivo | Rol Modbus | Descripción |
|---|---|---|
| **Interrogador Portátil** | Maestro (Master) | HMI Kinco portátil que un técnico conecta manualmente vía cable RS-485 al sitio, para leer/editar datos operativos. Herramienta de mantenimiento humano, no permanente. |
| **UTD (Unidad Terminal de Datos)** | Esclavo (Slave) | HMI Kinco fija en el sitio (posiblemente integrada/asociada al RTU Mobicon MT-151), con ID Modbus = 1. Contiene los datos reales del pozo. |

**Decisión de arquitectura confirmada:** el nuevo backend .NET debe actuar
como **maestro Modbus, conectándose directamente a la UTD** — es decir,
el sistema propio **reemplaza el rol del Interrogador Portátil**, pero de
forma permanente, remota y automatizada (polling continuo), en vez de una
conexión manual y esporádica por parte de un técnico.

```
                    (sistema viejo, manual)
[Interrogador Portátil - Kinco] --RS-485/Modbus RTU--> [UTD - Kinco, Slave ID 1]
                                                                  │
                    (sistema nuevo, a construir)                 │
[Backend .NET - NModbus] -----------RS-485/Modbus RTU------------┘
         │
         │ SignalR (tiempo real) + REST API
         ▼
   Front React (dashboard)
```

### Parámetros de comunicación serial CONFIRMADOS

```
Protocolo:    Modbus RTU
Interfaz:     RS-485
Slave ID:     1 (UTD)
Baud Rate:    9600
Data Bits:    8
Parity:       None
Stop Bits:    1
Pines:        Pin 1 = B, Pin 6 = A (polaridad crítica)
```

Esto resuelve el pendiente que existía sobre si sería TCP o RTU: **es
Modbus RTU serial**, no TCP. El backend .NET necesitará un adaptador
USB-RS485 (o el puerto serial nativo si el servidor corre en el mismo
sitio) para conectarse físicamente a la UTD.

**Nota sobre el Mobicon MT-151:** su relación exacta con la "UTD" descrita
en este manual (¿son el mismo concepto nombrado distinto, o el Mobicon es
el "cerebro" y la UTD su interfaz?) nunca se terminó de aclarar a nivel
de terminología — pero en la práctica no bloquea nada: el software se
conecta directo a los terminales **PORT1/PORT2** del MOBICON (ver fotos
del equipo real), que es lo único que importa para que funcione.

## 3. Mapa de variables Modbus — CONFIRMADO (fuente: manual oficial)

Fuente: "Especificaciones Interrogador Portátil — ICH PSI". Estas son las
direcciones reales que el backend .NET debe usar con NModbus para
leer/escribir en la UTD (Slave ID 1).

**Offset: CONFIRMADO, sin ajuste.** El manual incluye capturas de modscan
(secciones 3.1 y 3.2) que muestran la dirección de la tabla usada
directamente como dirección de consulta -- ej. `Address: 0699` devuelve
`40700: <12>` para "Día" (dirección 700 en la tabla), un valor de día
plausible, sin ningún +1/-1. Confirmado también con RFC (`Address: 0031`
→ decodifica a un RFC con formato válido). Las direcciones de la sección
3 se usan tal cual, ya así está implementado en `SiteRegisterMap.cs`.

### 3.1 Fecha y hora
| Variable | Dir. Modbus | Dir. HMI UTD | Tipo | Observación |
|---|---|---|---|---|
| Día | 700 | LW10003 | 16 bits | Registro interno del sistema |
| Mes | 701 | LW10004 | 16 bits | Registro interno del sistema |
| Año | 702 | LW10005 | 16 bits | Registro interno del sistema |
| Hora | 703 | LW10002 | 16 bits | Registro interno del sistema |
| Minutos | 705 | LW10001 | 16 bits | Registro interno del sistema |
| Segundos | 707 | LW10000 | 16 bits | Registro interno del sistema |

### 3.2 Datos del sitio
| Variable | Dir. Modbus | Dir. HMI UTD | Tipo | Observación |
|---|---|---|---|---|
| RFC | 31 | RW30 | String 13 car. | 1 carácter por registro de 16 bits |
| NSM | 44 | RW43 | String 17 car. | 1 carácter por registro de 16 bits |
| NSUE | 61 | RW60 | String 17 car. | 1 carácter por registro de 16 bits |
| NSUT | 78 | RW77 | String 17 car. | 1 carácter por registro de 16 bits |
| Latitud | 95 | RW94 | String 11 car. | 1 carácter por registro de 16 bits |
| Longitud | 106 | RW105 | String 15 car. | 1 carácter por registro de 16 bits |
| Unidad De Verificación | 121 | RW120 | 16 bits | Registro de control (ver sección 4) |
| Contraseña UV | — | LW10026 | 16 bits | Registro interno del sistema |

**Nota de tipo de dato string:** el manual especifica "1 carácter por cada
registro de 16 bits" — a diferencia de la convención común de 2 caracteres
ASCII por registro de 16 bits. Respetar esta particularidad tal como está
documentada, no asumir el estándar genérico.

### 3.3 FTP
| Variable | Dir. Modbus | Dir. HMI UTD | Tipo | Observación |
|---|---|---|---|---|
| IP Servidor | 431 | RW430 | String 13 car. | 1 carácter por registro |
| Usuario | 149 | RW148 | String 17 car. | 1 carácter por registro |
| Contraseña | 184 | RW183 | String 17 car. | 1 carácter por registro |
| Carpeta de almacenamiento | 199 | RW198 | String 17 car. | 1 carácter por registro |
| Hora envío automático | 239 | RW238 | String 11 car. | 1 carácter por registro |
| Minuto envío automático | 240 | RW239 | String 15 car. | 1 carácter por registro |
| kID2 | 25 | LW24 | 16 bits | |
| EnvioFTP | 28 | LW.B16.5 | Bit | |

### 3.4 SMS
| Variable | Dir. Modbus | Dir. HMI UTD | Tipo | Observación |
|---|---|---|---|---|
| Número de teléfono | 122 | RW121 | String 10 car. | 1 carácter por registro |
| Hora envío automático | 132 | RW131 | 16 bits | |
| Minuto envío automático | 133 | RW132 | 16 bits | |
| kID | 24 | LW23 | 16 bits | |
| EnvioSMS | 26 | LW.B16.4 | Bit | |

### 3.5 Alarmas
| Variable | Dir. Modbus | Dir. HMI UTD | Tipo | Observación |
|---|---|---|---|---|
| Alarma alimentación | 15 | LW.B15.0 | Bit | |
| Alarma batería | 15 | LW.B15.1 | Bit | |
| Alarma comunicación | 15 | LW.B15.2 | Bit | |
| Alarma GSM | 15 | LW.B15.3 | Bit | |
| Alarma GPRS | 15 | LW.B15.4 | Bit | |
| Alarma IHM | 29 | LW.B29.0 | Bit | |
| Guardar bitácora | 1001 | LB1000 | Byte | |
| Expulsar bitácora | 122 | LB9154 | Byte | Registro interno del sistema |

**Nota:** varias alarmas comparten la misma dirección Modbus (15) pero
distinto bit dentro del registro (`LW.B15.0`, `LW.B15.1`, etc.) — es un
registro de 16 bits usado como bitmask/bandera. Al implementar en NModbus,
leer el registro completo y hacer máscara de bits en el backend, no asumir
que cada alarma tiene su propia dirección independiente.

### 3.6 Medidores (la pantalla "Caudal instantáneo / Totalizado" ya vista)
| Variable | Dir. Modbus | Dir. HMI UTD | Tipo | Observación |
|---|---|---|---|---|
| Caudal instantáneo | 9 | LW8 | 32 bits | Solo lectura |
| Totalizado | 11 | LW10 | 32 bits | Solo lectura |

**Pendiente:** el manual no especifica el orden de bytes (ABCD/DCBA/BADC/
CDAB, ver sección 6.4) ni si es entero o float32 para estos valores de 32
bits. Dado que en pantalla se ve como "0.00 m3/h" (con decimales), lo más
probable es que sea **float32 IEEE 754**, pero debe validarse empíricamente
comparando el valor crudo leído contra el valor mostrado en pantalla.

### Nota general sobre "registros espejo"
Los registros internos del sistema de la UTD no son accesibles
directamente mediante Modbus. Se implementó un mecanismo de copia de
datos hacia **registros intermedios ("registros espejo")** que sí son
visibles vía Modbus. Esto explica por qué las direcciones Modbus y las
direcciones internas de HMI (`LW`, `RW`, `LB`) son distintas — el mapa de
arriba ya da la dirección Modbus correcta a usar, no la interna.

## 4. Mecanismo de control de escritura — descrito en el manual, NO implementado

**El backend .NET todavía NO lo implementa** (no hay ningún código que
escriba `LB9154`). Lo que sí está implementado es más simple: escribir el
valor y releer para confirmar (ver `SiteConfigModbusIO.EscribirCampoAsync`),
sin el paso previo de "tomar el control".

**Relectura del manual (páginas 10-11): esto probablemente pesa menos de
lo que parecía.** El toggle 0/1 vive en el **menú secreto de la HMI de la
UTD** — una pantalla física en el equipo mismo, no algo que el
Interrogador escriba por Modbus antes de cada parámetro. La "señal de
habilitación" que sí manda el Interrogador al entrar a "Unidad de
Verificación" parece ser interna de su propio software (equivalente a
nuestro modal de PIN, ya implementado), no una escritura Modbus aparte.
Hipótesis: si la UTD queda configurada una vez (físicamente, al instalar)
con "Interrogador tiene el control", nuestro backend no necesitaría tocar
este handshake nunca. Sigue pendiente confirmarlo con hardware real.

El sistema (manual) implementa un **handshake de control** que define quién tiene
permiso de escribir en un momento dado, para evitar conflictos de
escritura simultánea entre la UTD y quien se conecta como maestro
(actualmente el Interrogador Portátil; en el futuro, el backend .NET).

- Registro de control: dentro de "Tipo de dato" (relacionado con dirección
  `LB9154` / contexto de "Datos del sitio").
- **Valor 0** → la UTD toma el control (escribe hacia el maestro).
- **Valor 1** → el maestro (Interrogador / futuro backend) toma el control,
  habilitando la escritura de datos hacia la UTD.

**Implicación directa para el backend .NET:** antes de escribir cualquier
parámetro (fecha/hora, configuración de sitio, etc.), el backend debe:
1. Escribir el registro de control con el valor que solicita el control
   (equivalente a "1").
2. Realizar la escritura de los parámetros deseados.
3. Realizar una lectura de confirmación para verificar que el valor se
   aplicó correctamente (tal como hace el Interrogador Portátil actual con
   fecha/hora: escribe, luego relee para confirmar).

Además, existe una capa adicional de control de acceso en el flujo humano
actual (menú "Unidad de Verificación" + contraseña) — **ya implementada**:
el modal "Unidad de Verificación" con PIN (`POST /api/verificacion/validar`)
replica ese mismo gate, sin relación con el handshake Modbus de arriba
(protocolos distintos, no confundir uno con otro).

## 5. Referencia visual para el Front (React) — estructura a replicar

Confirmado con el manual: la estructura de navegación del HMI Kinco
(vista en fotos) se corresponde exactamente con las categorías del mapa de
variables Modbus real:

| Sección (vista en HMI / a replicar en React) | Datos Modbus reales que debe mostrar/editar |
|---|---|
| **Datos del sitio** | RFC, NSM, NSUE, NSUT, Latitud, Longitud, Unidad de Verificación (sección 3.2) |
| **Mensaje (SMS)** | Número de teléfono, hora/minuto de envío automático (sección 3.4) |
| **FTP** | IP servidor, usuario, contraseña, carpeta, hora/minuto de envío (sección 3.3) |
| **Fecha / Hora** | Día, mes, año, hora, minutos, segundos (sección 3.1) — con flujo de edición: modificar → OK → escritura → lectura de confirmación |
| **Alarmas** | Alarma alimentación, batería, comunicación, GSM, GPRS, IHM; guardar/expulsar bitácora (sección 3.5) |
| **Medidores** (vista "ICH" ya fotografiada) | Caudal instantáneo, Totalizado (sección 3.6) |

**Nota:** ahora que existe el mapa de registros real, el detalle interno de
cada sección **ya puede definirse en profundidad cuando se aborde una por
una** — antes era información pendiente, ahora es información disponible,
solo falta implementarla. Se sigue recomendando avanzar sección por
sección, no todas a la vez.

## 6. Stack tecnológico definido

| Capa | Tecnología | Notas |
|---|---|---|
| Frontend | **React** | Dashboard en tiempo real, gráficas, control. Navegación basada en las 6 secciones de la sección 5 |
| Backend | **.NET (ASP.NET Core)** | Elegido por escalabilidad empresarial |
| Comunicación Modbus | **NModbus** | Modbus RTU sobre RS-485 (ver parámetros exactos en sección 2) |
| Tiempo real Front↔Back | **SignalR** | Preferido sobre WebSockets crudos: reconexión automática, fallback, grupos |
| Base de datos | **PostgreSQL o SQL Server** | Vía Entity Framework Core |
| Polling de dispositivos | **BackgroundService (.NET)** | Lee la UTD periódicamente; maneja el handshake de escritura (sección 4) |

### Por qué esta arquitectura (importante para no repetir el error)

Un navegador web **no puede hablar Modbus directamente** (no tiene acceso a
sockets TCP crudos ni puertos seriales por seguridad del navegador). Por eso
es obligatorio un backend intermedio que:
1. Hable Modbus con los dispositivos reales (NModbus)
2. Exponga esos datos al front vía HTTP (REST) y tiempo real (SignalR)

## 7. Modelo de datos sugerido (clave para la escalabilidad)

El mapa de registros Modbus **NO debe hardcodearse en código**. Debe vivir
en la base de datos, para que agregar un nuevo pozo/sitio/dispositivo sea
solo insertar filas, no tocar código. La tabla `RegistroModbus` de abajo
puede poblarse directamente con los valores confirmados en la sección 3.

**El código real (`Models/Dispositivo.cs`) terminó con más campos que
esto** (Rfc/Nsm/Nsue/Nsut/Ftp*/Sms* directo en `Dispositivo`, no solo en
`RegistroModbus`) — el esqueleto de abajo sigue siendo válido como idea
general, no como definición exacta de las clases actuales.

```csharp
public class Dispositivo
{
    public int Id { get; set; }
    public string Nombre { get; set; }        // ej. "Pozo 1 - UTD"
    public TipoConexion Conexion { get; set; } // TCP o RTU (confirmado: RTU)
    public string PuertoSerial { get; set; }   // COM3, /dev/ttyUSB0, etc.
    public int BaudRate { get; set; } = 9600;
    public int DataBits { get; set; } = 8;
    public string Parity { get; set; } = "None";
    public int StopBits { get; set; } = 1;
    public byte SlaveId { get; set; } = 1;
}

public enum TipoTablaModbus
{
    Coil, DiscreteInput, HoldingRegister, InputRegister
}

public enum TipoDatoModbus
{
    UInt16, Int16, UInt32, Int32, Float32, String, Bit
}

public class RegistroModbus
{
    public int Id { get; set; }
    public int DispositivoId { get; set; }
    public string Categoria { get; set; }       // "Fecha y hora", "Datos del sitio", etc.
    public string Nombre { get; set; }          // "Caudal instantáneo"
    public TipoTablaModbus Tabla { get; set; }
    public int Direccion { get; set; }          // dirección Modbus (ver nota de offset, sección 3)
    public TipoDatoModbus TipoDato { get; set; }
    public int? BitIndex { get; set; }           // para banderas tipo LW.B15.0 (alarmas)
    public int? LongitudString { get; set; }      // para strings (13, 17, etc. caracteres)
    public string Unidad { get; set; }           // "m3/h"
    public bool SoloLectura { get; set; }
}

public class LecturaHistorica
{
    public int Id { get; set; }
    public int RegistroModbusId { get; set; }
    public double Valor { get; set; }
    public DateTime Timestamp { get; set; }
}
```

## 8. Fundamentos de Modbus ya validados en pruebas (no repetir investigación)

Todo esto fue estudiado a fondo desde la especificación oficial
(MODBUS Application Protocol Specification V1.1b3) y **probado en la
práctica** con un servidor Python simulado + Ignition + mbpoll:

### 8.1 Las 4 tablas de datos
| Tabla | Tamaño | Acceso | Ejemplo real (proyecto) |
|---|---|---|---|
| Coil | 1 bit | Lectura/Escritura | No identificado en el mapa real |
| Discrete Input | 1 bit | Solo lectura | No identificado en el mapa real |
| Holding Register | 16 bits | Lectura/Escritura | **Confirmado por modscan** (manual, secciones 3.1-3.4): Fecha/hora, Datos del sitio, SMS, FTP |
| Input Register | 16 bits | Solo lectura | Caudal instantáneo, Totalizado -- sin capturas de modscan, sigue sin confirmar |

**Nota:** el manual trae capturas de modscan que confirman función 03
(Holding Register) para Fecha/hora, Datos del sitio, SMS y FTP -- ya
coincide con lo implementado. Para Alarmas y Medidores (Caudal/
Totalizado) no hay captura -- **ojo:** el código (`PlaceholderDeviceSeeder`)
asume Holding Register para ambos, pero este documento originalmente
apuntaba a Input Register para Medidores; ninguna de las dos está
confirmada, hay que probarlo con hardware real antes de confiar en
cualquiera de las dos suposiciones.

### 8.2 Funciones Modbus principales
| Función | Código | Uso |
|---|---|---|
| Read Coils | 01 (0x01) | Leer bits R/W |
| Read Discrete Inputs | 02 (0x02) | Leer bits solo lectura |
| Read Holding Registers | 03 (0x03) | Leer registros R/W |
| Read Input Registers | 04 (0x04) | Leer registros solo lectura |
| Write Single Coil | 05 (0x05) | Escribir 1 bit (`0xFF00`=ON, `0x0000`=OFF) |
| Write Single Register | 06 (0x06) | Escribir 1 registro de 16 bits |
| Write Multiple Coils | 15 (0x0F) | Escribir varios bits de una vez |
| Write Multiple Registers | 16 (0x10) | Escribir varios registros de una vez (útil para strings/32-bit) |

### 8.3 Regla del offset (fuente #1 de bugs en integraciones reales)
> Un dato Modbus numerado como **X** (numeración de aplicación/manual del
> fabricante, base 1) se direcciona en el **PDU real como X-1** (base 0).

**Ya confirmado para el mapa de la sección 3** (ver esa sección): las
direcciones documentadas se usan directo, sin el ajuste -1 -- las
capturas de modscan del manual lo demuestran.

### 8.4 Big-endian y tipos de dato de 32 bits
- Modbus transmite en **big-endian**: byte más significativo primero.
- Los valores de 32 bits del mapa real (Caudal instantáneo, Totalizado)
  usan 2 registros consecutivos — validar orden de bytes (ABCD/DCBA/BADC/
  CDAB) empíricamente, comparando contra el valor mostrado en pantalla.

### 8.5 Diagrama de validación que sigue todo servidor Modbus
1. ¿Función soportada? → si no, error `ILLEGAL FUNCTION` (0x01)
2. ¿Dirección válida? → si no, error `ILLEGAL DATA ADDRESS` (0x02)
3. ¿Valor válido? → si no, error `ILLEGAL DATA VALUE` (0x03)
4. Ejecutar → si falla, error `SERVER DEVICE FAILURE` (0x04)
5. Responder con dato (éxito) o con excepción (function code + 0x80)

## 9. Manejo de errores (documentado en el manual oficial)

Cuando la comunicación falla (direccionamiento incorrecto, parámetros
seriales distintos, ID Modbus incorrecto, o falla física de cable/RS-485),
el sistema actual muestra: **"PLCxx no response"**. El nuevo backend debe
contemplar un manejo de error equivalente (timeout, reintentos, indicador
de estado de conexión en el front) — buena referencia de UX a replicar o
mejorar en React.

## 10. Dispositivos y hardware identificados

### 10.1 Servidor de pruebas simulado (ya construido, en Python)
Existe un `modbus_servidor.py` funcional (pymodbus 3.7.4) que simula un
tanque con bomba (Coil/Holding/Input Register), útil para practicar el
stack mientras no hay acceso físico a la UTD real. **Nota:** este simulador
usa Modbus TCP; para simular más fielmente el sistema real habría que
adaptarlo a Modbus RTU serial (o usar un simulador de puerto serial
virtual).

### 10.2 RTU Mobicon MT-151 (Inventia)
- Tiene puerto Ethernet (Modbus TCP) y 2 puertos seriales RS-232/RS-232-485.
- Su relación exacta con la "UTD" del manual del Interrogador está
  pendiente de aclarar (ver nota en sección 2).
- Software oficial de configuración: MTManager (Inventia) — pendiente
  acceso.

### 10.3 UTD (Unidad Terminal de Datos) — dispositivo Modbus objetivo confirmado
- Implementada mediante HMI Kinco, actúa como **esclavo Modbus RTU**,
  Slave ID = 1.
- Parámetros de comunicación confirmados en sección 2.
- Mapa de registros completo confirmado en sección 3.
- **Este es el dispositivo real al que el backend .NET debe conectarse.**

### 10.4 Interrogador Portátil — referencia de comportamiento a replicar
- HMI Kinco portátil, actúa como maestro Modbus RTU.
- Su lógica de operación (lectura inicial, habilitación de escritura vía
  menú + contraseña, handshake de control, lectura de confirmación tras
  escribir) es la referencia funcional que el backend .NET debe replicar
  de forma automatizada y remota.

### 10.5 Paneles HMI Kinco físicos ya fotografiados
- **Kinco GL070**: HMI táctil 7", programable con Kinco DTools v3.3+.
  Es muy probable que sea el hardware físico detrás de la UTD y/o el
  Interrogador Portátil descritos en el manual — pendiente confirmar cuál
  es cuál entre las unidades fotografiadas.
- Estos paneles **no se reprogramarán** — se reemplazan por el nuevo
  sistema, que hablará Modbus RTU directo a la UTD.

### 10.6 Sensor de humedad con Arduino (proyecto de práctica aparte)
Sin relación directa con el sistema de pozos — dispositivo de práctica
personal para validar el stack con hardware propio. Pendiente definir
modelo exacto (ESP32/ESP8266 para TCP directo, o Arduino UNO/Nano +
MAX485 para RTU).

## 11. Entorno de desarrollo ya configurado

- **Mac**: Python 3.13 (vía Homebrew), Java (para Ignition), Git, VS Code.
- **Windows**: Python 3.12, VS Code, Visual Studio Build Tools (C++),
  CMake, mbpoll.exe compilado manualmente (bloqueado actualmente por
  Kaspersky Endpoint Security gestionado por TI institucional — pendiente
  solicitar excepción para el ejecutable o el puerto TCP 502/5020; nota:
  esto era para pruebas Modbus TCP con el simulador — para RTU serial
  contra la UTD real este bloqueo específico no debería aplicar, al no
  ser tráfico de red).
- **Ignition** (SCADA comercial, usado para aprender/prototipar): instalado
  en Mac, con Device Connection Modbus TCP funcional contra el servidor
  Python de pruebas. Sirve como referencia de "qué debe poder hacer" el
  sistema propio, no como parte del stack final.

## 12. Pendientes

Lista corta acá; el detalle vive en `PENDIENTES_INSTALACION.md` (se
actualiza ahí, no acá, para no tener dos fuentes divergiendo con el
tiempo):

1. La prueba real: conectar el adaptador USB-RS485 y confirmar que
   "Detectar automáticamente" (pantalla Conexión) encuentra el equipo.
2. Tabla Modbus de Alarmas y Medidores (Coil/Holding/Input) y polaridad de
   alarmas — sin capturas de modscan en el manual, sigue sin confirmar
   (a diferencia de Fecha/hora/Datos del sitio/SMS/FTP, ya confirmados
   por las capturas del propio manual, sección 3).
3. Confirmar si el handshake de control de escritura (sección 4) hace
   falta de verdad, o si alcanza con dejar la UTD configurada una vez.

## 13. Estado de la implementación

El plan de esta sección (crear el backend, el polling, el front, etc.)
ya se ejecutó por completo — ver `EJECUTABLE-CAMPO.md` para cómo correr y
empaquetar el resultado. Lo único que ese plan original no logró prever
(porque dependía de tener el equipo real) es todo lo que quedó en la
sección 12 de arriba.
