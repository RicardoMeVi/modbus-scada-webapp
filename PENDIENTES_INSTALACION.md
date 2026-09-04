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
Verificación) ya se probó extensamente con la UTD real conectada directo,
con el handshake de escritura ya automatizado (ver "Ya resuelto" abajo).
**SMS no se probó con el mismo nivel de detalle todavía.**

FTP sí se empezó a probar y ya salió un bug real (resuelto, ver "Ya
resuelto"): Hora/Minuto de envío automático estaban mal declarados como
strings largos en vez de registros de 16 bits simples, y se pisaban entre
sí. Sigue pendiente:
- **Contraseña/Carpeta de FTP**: sus rangos declarados se superponen
  (183-199 y 198-214) -- mismo patrón de bug que Hora/Minuto, sin
  confirmar todavía si se manifiesta en la práctica (depende del largo
  real de los valores). Probar con una contraseña larga (14+ caracteres)
  y ver si corrompe la carpeta.
- IP Servidor y Usuario, sin probar a fondo con guardado real.

## 3. Medidores: orden de bytes sin confirmar

Caudal instantáneo/Totalizado (direcciones 9/11, confirmadas sin ajuste de
offset, sección 3.6) son valores de 32 bits — el manual no especifica el
orden de bytes (ABCD/DCBA/BADC/CDAB). Se asume float32 + ABCD por ahora,
sin confirmar contra un caudal real distinto de 0.

## 4. Nivel del tanque / Bomba / Setpoint

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
- **Contraseña UV -- escritura resuelta**: dirección real confirmada en
  250. Una escritura aislada (un solo write) nunca persistía; la solución
  fue replicar el flujo del Interrogador portátil (reafirmar la
  contraseña vigente antes de escribir la nueva -- dos writes en
  secuencia, `SiteConfigModbusIO.EscribirContrasenaUtdAsync`). Confirmado
  con hardware real, probando muchas veces seguidas desde la app: persiste
  ~9 de cada 10 veces. La falla ocasional que queda la atrapa la
  reconfirmación general (ver más abajo) -- ya no está excluida de esa
  reconfirmación como al principio.
- **Se reescribía todo el formulario en cada guardado**: antes, guardar
  "Datos del sitio"/SMS/FTP reescribía TODOS los campos con valor, aunque
  el usuario solo hubiera tocado uno -- más lento y más exposición
  innecesaria al bug de abajo en campos que ni se querían cambiar. Ahora
  `DispositivosController` calcula qué campos realmente cambiaron y solo
  esos se escriben (`ISiteConfigWriter.EscribirAsync` recibe el set de
  nombres modificados) -- calcado del propio equipo real, que tampoco
  reescribe un campo si no lo editaste.
- **Guardado con falso positivo**: `EscribirCampoAsync` confirmaba con una
  relectura inmediata, pero eso podía dar éxito falso si el equipo
  "flasheaba" el valor nuevo un instante y lo revertía después (visto con
  Contraseña UTD, y reproducido con Hora/Minuto de FTP en un campo sin
  ninguna relación). Solución en dos etapas, para no elegir entre rápido y
  confiable:
  1. Reconfirmación corta y sincrónica (300ms, `SiteConfigModbusIO.EsperaCorta`)
     antes de responder al guardado -- atrapa la mayoría de los reverts sin
     sentirse lento.
  2. Revisión demorada en segundo plano (~1.7s más, `EsperaLarga`, corre
     después de ya haber respondido -- `RealSiteConfigWriter.RevisarDespuesAsync`)
     que relee de nuevo; si algo se escapó de la corta, avisa aparte por
     SignalR (`guardadoNoSostenido`, escuchado en `useModbusHub`/`App.jsx`).
  Aplica a todos los campos de Datos del sitio/SMS/FTP, incluida
  Contraseña UTD (dejó de estar excluida una vez que se confirmó que su
  escritura persiste la gran mayoría de las veces -- ver más abajo).
- **Hora/Minuto de envío automático de FTP**: estaban declarados como
  strings de 11/15 registros (copiado por error de Latitud/Longitud en el
  manual) -- en realidad son registros de 16 bits simples, igual que en
  SMS. Confirmado con hardware real: la pantalla física de la UTD muestra
  el valor crudo sin decodificar ("48 : 53 hrs"). El largo viejo hacía que
  guardar la hora pisara el registro del minuto. Corregido en
  `SiteRegisterMap.cs` (la dirección ya estaba bien, solo el tipo estaba
  mal).
- **La app instalada nunca escribió logs**: el plugin de logging de Tauri
  (`src-tauri/src/lib.rs`) solo se registraba `if cfg!(debug_assertions)`
  -- pero `tauri build`/`tauri:build` (lo que genera el `.exe` de campo)
  siempre es release, así que nunca se creaba ningún archivo de log en una
  instalación real, para nada (no era específico de esta medición de
  tiempos). Corregido: el plugin se activa siempre. Los logs quedan en
  `%LOCALAPPDATA%\mx.ich.modbusscada.campo\logs\`.
- **Relación Mobicon MT-151 / UTD**: aclarada del todo. Son sistemas
  separados, sin relación — el Mobicon nunca tuvo los datos de la UTD.
  El software no usa el Mobicon para nada; se conecta directo al conector
  de 5 pines de la UTD.
- **Handshake de control de escritura**: confirmado que hace falta, y
  totalmente automatizado. Dirección real encontrada por prueba directa
  (diff de holding registers antes/después de mover el toggle físico):
  registro 26. El backend ahora lo prende antes de escribir cualquier
  campo de Datos del sitio/SMS/FTP y lo devuelve a la UTD al terminar —
  ya no hace falta ningún paso manual en el menú secreto de la UTD (ver
  sección 4 de `CONTEXTONuevo.md`).
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
