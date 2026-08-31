# Contexto del Proyecto — Sistema SCADA/IoT Modbus (React + .NET)

> Este documento resume todas las decisiones de arquitectura, aprendizajes y
> contexto técnico definidos antes de empezar la implementación. Está pensado
> para que cualquier desarrollador (o una IA como Claude Code) pueda retomar
> el proyecto sin perder contexto.
>
> **Versión 4** — primera sesión con la UTD real conectada y respondiendo.
> Confirma con hardware (ModScan) que las direcciones Modbus de Datos del
> sitio/SMS/FTP necesitan un ajuste de **-1** respecto a lo que decía la
> versión anterior de este documento (ver sección 3), aclara que el
> **Mobicon nunca tuvo los datos de la UTD** (son dos sistemas separados,
> no relacionados), y confirma que el handshake de control de escritura de
> la sección 4 sí hace falta en la práctica.
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
| **Interrogador Portátil** | Maestro (Master) | HMI Kinco portátil que un técnico conecta manualmente vía cable RS-485 al sitio, para leer/editar datos operativos. Herramienta de mantenimiento humano, no permanente. Es la que "se manipulan los datos, fecha, dirección, etc." en las fotos del sitio -- **este es el rol que el sistema nuevo reemplaza**, la UTD (fila de abajo) no se toca. |
| **UTD (Unidad Terminal de Datos)** | Esclavo (Slave) | HMI Kinco fija en el sitio, con ID Modbus = 1. Contiene los datos reales del pozo -- es "donde solo se ven los cambios hechos" en las fotos del sitio. **Confirmado con hardware real: NO tiene relación con el Mobicon MT-151** (ver nota más abajo) -- es un equipo aparte, de otro fabricante. |

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
Modbus RTU serial**, no TCP. El backend .NET necesita un adaptador
USB-RS485 (probado: Manhattan USB→Serial RS-232 + conversor ADAM-4522
RS-232→RS-485) conectado **directo al conector de 5 pines de la UTD**
(Pin 1 = B, Pin 6 = A) para funcionar.

**Nota sobre el Mobicon MT-151 — CONFIRMADO, resuelve la duda de versiones
anteriores:** el Mobicon **no tiene ninguna relación con la UTD ni con sus
datos**. Son dos sistemas de fabricantes distintos que conviven en el
mismo gabinete del pozo:
- El Mobicon es un módulo de telemetría GSM/GPRS de Inventia. Su Port1
  (terminales de tornillo, RS-232/485) normalmente actúa como **maestro**
  Modbus hacia **otros** equipos del sitio (medidores de caudal/eléctricos
  -- confirmado con el instalador original del equipo), sin relación con
  la UTD. Su Port2 (RJ-12, RS-232) responde como **esclavo**, con la Kinco
  como maestro leyendo esos mismos datos de medidores para mostrarlos en
  su pantalla.
- Se probó extensamente usar el Mobicon como puente (Port1↔Port2 en modo
  Transparent) para llegar a la UTD indirectamente -- funcionó de forma
  intermitente, pero **nunca hizo falta**: conectando el adaptador
  USB-RS485 directo al conector de 5 pines de la UTD (el mismo que usa el
  Interrogador Portátil) se llega a los datos reales sin ningún salto
  extra, con muchísima más estabilidad.
- **Decisión final: el software de este proyecto no usa el Mobicon para
  nada.** Si en el futuro alguien migra el control del pozo al Mobicon
  (proyecto de automatización aparte, con recableo de sensores/bomba), eso
  requeriría un mapa de registros completamente nuevo y una decisión de
  arquitectura distinta -- no es una extensión de lo que hay hoy.

## 3. Mapa de variables Modbus — CONFIRMADO (fuente: manual oficial)

Fuente: "Especificaciones Interrogador Portátil — ICH PSI". Estas son las
direcciones reales que el backend .NET debe usar con NModbus para
leer/escribir en la UTD (Slave ID 1).

**Offset: CORREGIDO en esta versión -- las tablas 3.2/3.3/3.4 de abajo YA
tienen el ajuste aplicado (-1 respecto a la "Dirección Modbus" que trae el
manual original).** Versiones anteriores de este documento decían "sin
ajuste", basado en una mala lectura de las capturas de modscan del propio
manual: el campo de entrada de esas capturas decía `Address: 0699` /
`Address: 0031`, pero la fila de resultado se etiquetaba `40700` / `40032`
(ModScan/ModScan32 le suman 1 a la dirección cruda solo para mostrar la
etiqueta en formato "4xxxx"). Se interpretó esa etiqueta como "se consultó
700/32 tal cual", cuando en realidad ya se había consultado 699/31 -- el
ajuste -1 **ya estaba aplicado** en las propias capturas del manual, solo
que mal leído.

**Confirmado con hardware real** (no solo reinterpretando el manual):
ModScan32 sobre la UTD real, campo NSM -- el primer carácter de un valor
de prueba ("h" de "holaaa") apareció en la dirección cruda **43**, no 44
(la "Dirección Modbus" que documenta el manual para NSM). 43 es
exactamente el número de la columna "Dirección HMI UTD" (RW) de esa misma
fila de la tabla -- es decir, **la columna "RW" es la dirección Modbus
real a usar, no la columna "Dirección Modbus"** (que en realidad está en
numeración 1-based/PLC-style, no en la numeración base-0 del PDU).

**Ojo, esto NO aplica parejo a todo el mapa:** Fecha/Hora (3.1) y
Medidores (3.6) sí se confirmaron correctos **tal cual** los documenta el
manual (sin este ajuste) -- probado con hardware real, fecha/hora
coincidiendo con la fecha real del día. El offset -1 confirmado aplica
solo a **Datos del sitio, SMS y FTP** (3.2, 3.3, 3.4) -- ya reflejado en
`SiteRegisterMap.cs` y en las tablas de abajo. Alarmas (3.5) no se
retesteo todavía con este hallazgo -- ver `PENDIENTES_INSTALACION.md`.

### 3.1 Fecha y hora
**Estas direcciones NO llevan el ajuste -1** -- confirmadas correctas tal
cual con hardware real (se leyó la fecha/hora real del día en estas
direcciones exactas, sin ajuste).

| Variable | Dir. Modbus | Dir. HMI UTD | Tipo | Observación |
|---|---|---|---|---|
| Día | 700 | LW10003 | 16 bits | Registro interno del sistema |
| Mes | 701 | LW10004 | 16 bits | Registro interno del sistema |
| Año | 702 | LW10005 | 16 bits | Registro interno del sistema |
| Hora | 703 | LW10002 | 16 bits | Registro interno del sistema |
| Minutos | 705 | LW10001 | 16 bits | Registro interno del sistema |
| Segundos | 707 | LW10000 | 16 bits | Registro interno del sistema |

**Confirmado con hardware real: este registro es una foto fija, no un
reloj en vivo.** La UTD no lo actualiza sola con el paso del tiempo -- solo
cambia cuando algo le escribe un valor nuevo explícitamente (el flujo
"Modificar" → "OK" del Interrogador/de la app). Por eso, aunque el panel
físico de la UTD sí tickea segundo a segundo (lee su reloj interno
directo, sin pasar por este registro espejo), lo que se lee acá por Modbus
se queda congelado hasta la próxima escritura. `ModbusPollingService`
implementa un "sincronizador" que le escribe la hora actual cada ~5
minutos (`CiclosPorSincronizarReloj`) para que no se desfase demasiado,
imitando el mismo gesto manual del Interrogador -- ver comentario en el
código para el porqué de ese intervalo (no pisar ediciones manuales
recientes del usuario).

### 3.2 Datos del sitio
La columna "Dir. Modbus" ya trae el ajuste -1 aplicado (ver nota de offset
arriba) -- coincide con la columna "Dir. HMI UTD (RW)" del manual original.

| Variable | Dir. Modbus (real, -1) | Dir. Modbus (manual original) | Tipo | Observación |
|---|---|---|---|---|
| RFC | 30 | 31 | String 13 car. | 1 carácter por registro de 16 bits |
| NSM | 43 | 44 | String 17 car. | 1 carácter por registro de 16 bits -- confirmado con ModScan real |
| NSUE | 60 | 61 | String 17 car. | 1 carácter por registro de 16 bits |
| NSUT | 77 | 78 | String 17 car. | 1 carácter por registro de 16 bits |
| Latitud | 94 | 95 | String 11 car. | 1 carácter por registro de 16 bits |
| Longitud | 105 | 106 | String 15 car. | 1 carácter por registro de 16 bits |
| Unidad De Verificación | 120 | 121 | 16 bits | Registro de control (ver sección 4) |
| Contraseña UV | 250 | — | 16 bits | No está en el manual del Interrogador (era LW10026, interno, sin dirección) -- dirección conseguida por otro lado, ver nota abajo |

**Contraseña UV -- ACTUALIZACIÓN:** a diferencia de lo que decían
versiones anteriores de este documento, **ya se consiguió una dirección
Modbus confirmada: 250** (fuera del manual del Interrogador). Se probó
primero con 251 (respondía algo, pero no coincidía al escribir un valor
de prueba y releerlo) y después con 250, que sí coincidió -- misma prueba
de escritura+relectura que validó el offset de NSM. Con esto, la
recomendación anterior de "sacar el campo del formulario" queda
**revertida** -- ya tiene sentido mantenerlo, en `SiteRegisterMap.cs` como
cualquier otro campo, ahora que sí sincroniza con algo real y confirmado.

**Nota de tipo de dato string:** el manual especifica "1 carácter por cada
registro de 16 bits" — a diferencia de la convención común de 2 caracteres
ASCII por registro de 16 bits. Respetar esta particularidad tal como está
documentada, no asumir el estándar genérico.

### 3.3 FTP
Mismo ajuste -1 que 3.2. `kID2`/`EnvioFTP` no están implementados en
`SiteRegisterMap.cs` -- si se llegan a necesitar, aplicarles el mismo -1
antes de usarlos (sin confirmar con hardware todavía, por analogía).

| Variable | Dir. Modbus (real, -1) | Dir. Modbus (manual original) | Tipo | Observación |
|---|---|---|---|---|
| IP Servidor | 430 | 431 | String 13 car. | 1 carácter por registro |
| Usuario | 148 | 149 | String 17 car. | 1 carácter por registro |
| Contraseña | 183 | 184 | String 17 car. | 1 carácter por registro |
| Carpeta de almacenamiento | 198 | 199 | String 17 car. | 1 carácter por registro |
| Hora envío automático | 238 | 239 | String 11 car. | 1 carácter por registro |
| Minuto envío automático | 239 | 240 | String 15 car. | 1 carácter por registro |
| kID2 (sin implementar) | 24* | 25 | 16 bits | *sin confirmar |
| EnvioFTP (sin implementar) | 27* | 28 | Bit | *sin confirmar |

### 3.4 SMS
Mismo ajuste -1 que 3.2. `kID`/`EnvioSMS` no están implementados, mismo
caveat que arriba.

| Variable | Dir. Modbus (real, -1) | Dir. Modbus (manual original) | Tipo | Observación |
|---|---|---|---|---|
| Número de teléfono | 121 | 122 | String 10 car. | 1 carácter por registro |
| Hora envío automático | 131 | 132 | 16 bits | |
| Minuto envío automático | 132 | 133 | 16 bits | |
| kID (sin implementar) | 23* | 24 | 16 bits | *sin confirmar |
| EnvioSMS (sin implementar) | 25* | 26 | Bit | *sin confirmar |

### 3.5 Alarmas
**Direcciones sin re-testear con el hallazgo del offset -1** -- a
diferencia de 3.2/3.3/3.4, todavía no se probaron con ModScan sobre la UTD
real después de descubrir el ajuste. Se dejan tal cual el manual por
ahora; si al probarlas dan siempre cero (el mismo síntoma que tenía NSM
antes de corregirlo), aplicarles el mismo -1.

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
**Direcciones SIN el ajuste -1** -- se leyeron en pantalla del propio panel
Kinco físico (mostrando "0.00 m3/h" en vivo) confirmando que están bien
tal cual, igual que Fecha/Hora.

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

## 4. Mecanismo de control de escritura — CONFIRMADO que hace falta, sin automatizar

**Confirmado con hardware real:** sin este handshake, las escrituras desde
la app se "confirman" al toque (escribe, relee, coincide) pero la UTD las
revierte poco después -- síntoma real observado con RFC/NSM antes de este
hallazgo. Poniendo el campo de control en **1** manualmente, en el menú
secreto físico de la UTD, las escrituras desde la app empezaron a
persistir de verdad. Esto confirma la hipótesis que tenían versiones
anteriores de este documento (que "probablemente pesaba menos de lo que
parecía") -- en realidad sí hace falta, al menos en este equipo.

**El backend .NET sigue sin automatizarlo** -- no hay ningún código que
escriba este registro de control. Sigue siendo un paso **manual, físico,
en el menú secreto de la UTD**, hecho una sola vez. No se automatizó
porque **el manual no documenta la dirección Modbus de ese registro de
control** (solo se ve como un campo en la pantalla "Tipo de dato" de la
Figura 5, sin número de dirección) -- escribirle a una dirección adivinada
sería riesgoso (podría pisar otra cosa). Si en algún momento se consigue
esa dirección (preguntándole a quien programó la UTD, o probando con
ModScan alrededor de los registros de Medidores/"Tipo de dato"), se puede
automatizar el paso 1 de la lista de abajo.

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

**Corregido en la versión 4 de este documento** (ver sección 3 para el
detalle completo): Datos del sitio/SMS/FTP **sí necesitan el ajuste -1**
respecto a la "Dirección Modbus" que documenta el manual -- confirmado con
ModScan sobre hardware real. Fecha/Hora y Medidores, en cambio, se
confirmaron correctos **sin** el ajuste. La regla general de este párrafo
(base 1 → PDU en base 0) sigue siendo válida como concepto -- lo que
cambió es cuál de las dos columnas de la tabla del manual es la que ya
está en base 0.

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

### 10.2 RTU Mobicon MT-151 (Inventia) — CONFIRMADO: no relacionado con la UTD
- Tiene puerto Ethernet (Modbus TCP) y 2 puertos seriales: **Port1**
  (terminales de tornillo, RS-232/RS-485) y **Port2** (RJ-12, solo
  RS-232).
- **Rol real (confirmado con el instalador original):** Port1 = maestro
  Modbus hacia medidores de caudal/eléctricos del sitio (equipos aparte,
  sin relación con la UTD). Port2 = esclavo, con la Kinco como maestro
  leyendo esos mismos datos de medidores.
- **No tiene ni expone los datos de la UTD** (RFC, NSM, Fecha/Hora, etc.)
  -- se probó extensamente como puente hacia la UTD (Port1↔Port2 en modo
  Transparent) y funcionó de forma intermitente, pero resultó innecesario:
  la UTD tiene su propio conector de 5 pines (el mismo del Interrogador
  Portátil) directamente accesible, sin pasar por el Mobicon.
- Software oficial de configuración: MTManager (Inventia) — usado durante
  la sesión de diagnóstico, ya no hace falta para la operación normal del
  sistema.

### 10.3 UTD (Unidad Terminal de Datos) — dispositivo Modbus objetivo confirmado
- Implementada mediante HMI Kinco, actúa como **esclavo Modbus RTU**,
  Slave ID = 1.
- Parámetros de comunicación confirmados en sección 2.
- Mapa de registros completo confirmado en sección 3 (con el ajuste -1
  para Datos del sitio/SMS/FTP).
- **Este es el único dispositivo real al que el backend .NET se conecta**
  -- directo, sin pasar por el Mobicon (ver 10.2).
- El handshake de control de escritura (sección 4) hace falta de verdad en
  este equipo -- se activa manualmente en el menú secreto físico de la
  UTD, poniendo el campo de control en 1.

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

1. **Hecho** -- la UTD real responde, conectada directo (sin Mobicon).
   Handshake de control confirmado necesario y resuelto manualmente
   (sección 4).
2. Tabla Modbus de Alarmas (Coil/Holding/Input) y polaridad -- sin
   re-testear con el hallazgo del offset -1 (sección 3.5). Medidores ya
   confirmados sin ajuste (sección 3.6).
3. Confirmar lecturas/escrituras de SMS y FTP con la conexión directa
   (Datos del sitio ya se probó a fondo; SMS/FTP no tanto).
4. Decidir qué hacer con "Contraseña UV" (sin dirección Modbus documentada,
   queda solo local) -- ver sección 3.2.

## 13. Estado de la implementación

El plan de esta sección (crear el backend, el polling, el front, etc.)
ya se ejecutó por completo — ver `EJECUTABLE-CAMPO.md` para cómo correr y
empaquetar el resultado. Lo único que ese plan original no logró prever
(porque dependía de tener el equipo real) es todo lo que quedó en la
sección 12 de arriba.
