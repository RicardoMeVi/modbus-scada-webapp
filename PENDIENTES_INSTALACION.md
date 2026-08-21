# Pendientes

Lo que falta no es instalación de software (eso ya está resuelto — ver
`EJECUTABLE-CAMPO.md` para el ejecutable de campo, o `npm install` +
`dotnet restore` para desarrollo normal). Lo que queda son cosas que solo
se pueden confirmar con el MOBICON real conectado.

## 1. La prueba real

Conectar el adaptador USB-RS485, cablear el MOBICON por **PORT1/PORT2**
(RS-485, no por su puerto USB — ver `CONTEXTONuevo.md` sección 2) y
confirmar que "Detectar automáticamente" (pantalla "Conexión") encuentra
el equipo y que los datos empiezan a fluir.

## 2. Supuestos del mapa de registros sin confirmar

El manual trae capturas de modscan (sección 3 de `CONTEXTONuevo.md`) que
ya confirman función 03 (Holding Register) y que las direcciones se usan
sin ajuste de offset para Fecha/hora, Datos del sitio, SMS y FTP. Lo que
sigue sin confirmar, solo con el equipo real respondiendo:

- Tabla Modbus de **Alarmas y Medidores** específicamente — sin captura
  de modscan para estas dos secciones. Ojo: el código asume Holding
  Register para ambas, pero el manual originalmente sugería Input
  Register para Medidores -- ninguna confirmada.
- Polaridad de los bits de alarma (asumida 1 = alarma activa).
- Si "EnvioFTP"/"EnvioSMS" son un bit específico dentro de un registro o
  el registro completo tratado como bandera.
- Orden de bytes (ABCD/DCBA/BADC/CDAB) de Caudal instantáneo y Totalizado
  (32 bits) — se asume ABCD + float32, sin confirmar.
- Si el handshake de control de escritura (menú secreto de la UTD, ver
  `CONTEXTONuevo.md` sección 4) hace falta de verdad o alcanza con dejar
  la UTD configurada una vez.

## 3. Nivel del tanque / Bomba / Setpoint

No están en la especificación del Interrogador portátil — se sacaron del
dispositivo real (commit `2973dfd`), quedan solo en el simulador de
desarrollo. Si en algún momento se identifican los registros reales
equivalentes (si es que existen), agregarlos ahí.

## Ya resuelto (no repetir)

- Offset de direcciones (base-0 vs base-1): confirmado sin ajuste, ver
  capturas de modscan en `CONTEXTONuevo.md` sección 3.
- Función Modbus de Fecha/hora, Datos del sitio, SMS y FTP: confirmada
  Holding Register (03) por las mismas capturas.
- Relación Mobicon MT-151 / UTD: en la práctica, el software se conecta
  directo a los terminales PORT1/PORT2 del MOBICON — no hace falta seguir
  aclarando la terminología del manual para que esto funcione.
- Control de acceso humano (menú + contraseña del HMI físico): replicado
  como el modal "Unidad de Verificación" con PIN.
- Bloqueo de Kaspersky sobre `mbpoll.exe`: ya no aplica — el proyecto no
  depende de `mbpoll` para nada, la detección de puerto usa NModbus
  directo (`PuertoSerialDetector`).
