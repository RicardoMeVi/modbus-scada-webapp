# Pendientes

Lo que falta no es instalación de software (eso ya está resuelto — ver
`EJECUTABLE-CAMPO.md` para el ejecutable de campo, o `npm install` +
`dotnet restore` para desarrollo normal). La prueba real contra la UTD ya
se hizo y respondió con datos reales — ver `CONTEXTONuevo.md` versión 4
para el detalle completo de esa sesión. Lo que queda es afinar detalles
puntuales del mapa de registros y decisiones de producto menores.

## 1. Alarmas: offset y polaridad sin confirmar

Se descubrió (sección 3 de `CONTEXTONuevo.md`) que Datos del sitio/SMS/FTP
necesitaban un ajuste de dirección de **-1** respecto a lo que decía el
manual — confirmado con ModScan sobre la UTD real. **Alarmas (sección 3.5)
todavía no se retesteó con este hallazgo.** Si al leerlas da siempre cero
(el mismo síntoma que tenía NSM antes de corregirse), aplicarles el mismo
-1. También sigue sin confirmar la polaridad de los bits (asumida 1 =
alarma activa).

## 2. SMS y FTP: probar a fondo con la conexión directa

Datos del sitio (RFC, NSM, NSUE, NSUT, Latitud, Longitud, Unidad de
Verificación) ya se probó extensamente con la UTD real conectada directo
y el handshake de escritura activado. **SMS y FTP no se probaron con el
mismo nivel de detalle** — confirmar que lean y guarden bien con las
direcciones corregidas (`SiteRegisterMap.cs` ya las tiene actualizadas).

## 3. Medidores: orden de bytes sin confirmar

Caudal instantáneo/Totalizado (direcciones 9/11, confirmadas sin ajuste de
offset, sección 3.6) son valores de 32 bits — el manual no especifica el
orden de bytes (ABCD/DCBA/BADC/CDAB). Se asume float32 + ABCD por ahora,
sin confirmar contra un caudal real distinto de 0.

## 4. ~~Contraseña UV~~ — resuelto

~~Confirmar el valor, no solo que responda~~ — hecho. Dirección real: 250
(no 251, que fue el primer intento y no coincidía al escribir/releer). Ver
"Ya resuelto" abajo.

## 5. Handshake de control de escritura: automatizar si aparece la dirección

Confirmado que hace falta de verdad (sección 4 de `CONTEXTONuevo.md`) —
sin poner el campo de control en 1 en el menú secreto físico de la UTD,
las escrituras se revierten solas. Sigue siendo un paso manual porque el
manual no documenta la dirección Modbus de ese registro. Si en algún
momento se consigue esa dirección, se puede automatizar como parte del
flujo de escritura del backend.

## 6. Nivel del tanque / Bomba / Setpoint

No están en la especificación del Interrogador portátil — se sacaron del
dispositivo real (commit `2973dfd`), quedan solo en el simulador de
desarrollo. Si en algún momento se identifican los registros reales
equivalentes (si es que existen), agregarlos ahí.

## Ya resuelto (no repetir)

- **La prueba real con la UTD conectada**: hecha. Responde con datos
  reales, confirmados con ModScan y con la app.
- **Offset de direcciones**: corregido. Datos del sitio/SMS/FTP necesitan
  -1 respecto al manual (confirmado con ModScan real, ver
  `CONTEXTONuevo.md` sección 3). Fecha/Hora y Medidores confirmados
  correctos **sin** ese ajuste.
- **Contraseña UV**: dirección real confirmada en 250 (fuera del manual
  del Interrogador), con la misma prueba de escritura+relectura que NSM.
- **Relación Mobicon MT-151 / UTD**: aclarada del todo. Son sistemas
  separados, sin relación — el Mobicon nunca tuvo los datos de la UTD.
  El software no usa el Mobicon para nada; se conecta directo al conector
  de 5 pines de la UTD.
- **Handshake de control de escritura**: confirmado que hace falta,
  resuelto con un paso manual (ver punto 5 arriba).
- **Fecha/Hora "congelada"**: explicado (es una foto fija, no un reloj en
  vivo) y mitigado con un sincronizador automático cada ~5 min
  (`ModbusPollingService.CiclosPorSincronizarReloj`).
- **Bug de borrado silencioso de NSM/NSUE**: una lectura corrupta (glitch
  de comunicación) podía vaciar un campo y luego, en el siguiente guardado
  de cualquier campo de esa pantalla, esa cadena vacía se reescribía al
  equipo real, borrando el dato de verdad. Corregido: una lectura inválida
  ahora se descarta (el campo queda en null, no en el valor viejo ni en
  vacío persistente).
- **Badge "En línea" pegado al desconectar**: corregido, ahora se
  reevalúa periódicamente aunque no lleguen lecturas nuevas.
- **"Vuelve al valor viejo" por unos segundos después de guardar**: era
  una condición de carrera entre el guardado y el refresco periódico de
  `useDispositivos` — corregido en Datos del sitio, FTP y SMS.
- **`modbus_scada.db` de una instalación anterior no gana columnas
  nuevas sola**: `EnsureCreated()` no migra un archivo ya existente.
  Se agregó una auto-reparación de esquema en `Program.cs` para columnas
  nuevas simples (nullable) — no reemplaza una migración real para
  cambios más grandes (renombres, tipos, drops).
- Control de acceso humano (menú + contraseña del HMI físico): replicado
  como el modal "Unidad de Verificación" con PIN.
- Bloqueo de Kaspersky sobre `mbpoll.exe`: ya no aplica — el proyecto no
  depende de `mbpoll` para nada, la detección de puerto usa NModbus
  directo (`PuertoSerialDetector`).
