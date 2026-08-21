# Ejecutable de campo (Tauri + SQLite)

Guía de referencia para el modo "sin nube" del proyecto: una app de
escritorio nativa (Windows) que no necesita internet, pensada para que un
técnico la use en el sitio del pozo con la notebook conectada al equipo
real por RS-485.

## Cómo funciona

Son tres piezas que terminan en **un solo `.exe` instalable**:

1. **Backend (.NET)** — el mismo código de siempre, con un modo nuevo
   llamado `Campo`. En ese modo:
   - Guarda los datos en un archivo SQLite local (`modbus_scada.db`), no en
     Postgres/Neon.
   - Sirve la interfaz web (el build de React) él mismo, como archivos
     estáticos — no hace falta un servidor de frontend aparte.
   - Habla Modbus **RTU sobre RS-485** con el equipo real (además de TCP,
     que sigue existiendo para el modo nube/simulador).
2. **Frontend (React)** — se compila a archivos planos (HTML/CSS/JS) que el
   backend sirve directamente. Con URLs relativas (no apunta a ninguna URL
   fija), para que funcione sin importar en qué puerto quede corriendo.
3. **Tauri** — envuelve todo en una ventana de escritorio nativa. Al abrir
   la app:
   1. Tauri arranca el `.exe` del backend, escondido, como proceso hijo.
   2. Espera a que el puerto `127.0.0.1:5136` responda.
   3. Abre la ventana apuntando a esa misma dirección — ahí el backend ya
      está sirviendo la interfaz completa.
   4. Al cerrar la ventana, mata también el proceso del backend (no se
      queda corriendo de fondo).

Todo pasa en la misma máquina, sin internet. El código fuente de esto está
en `frontend/src-tauri/` (la parte de Tauri/Rust) y en
`backend/ModbusScada.Api/appsettings.Campo.json` + las clases bajo
`Services/Modbus/` (la parte de RTU y del modo Campo del backend).

### Importante: esto no es "recargar y ya está"

El `.exe` es un build congelado. Si cambiás código del backend o del
frontend, **el `.exe` que ya generaste no cambia solo** — hay que volver a
generarlo (ver abajo). El flujo normal de desarrollo día a día (sin
recompilar el `.exe` cada vez) sigue siendo `dotnet run` en una terminal +
`npm run dev` en otra, como siempre.

## Generar una versión nueva del `.exe`

Después de cambiar algo en `backend/` o `frontend/`, **son dos pasos, no
uno** -- `tauri build` NO vuelve a publicar el backend por su cuenta, solo
empaqueta lo que ya esté copiado en `frontend/src-tauri/binaries/`. Si
saltás el primer paso, vas a generar un instalador con el backend viejo
(esto pasó durante el desarrollo: se corrigió un bug, se corrió
`tauri:build` solo, y el `.exe` nuevo seguía con el bug porque el sidecar
no se había vuelto a publicar).

```powershell
# 1. Republica el backend + frontend embebido dentro de src-tauri/binaries/
powershell -File scripts/build-campo.ps1

# 2. Empaqueta la app de escritorio con eso adentro
cd frontend
npm run tauri:build
```

Esto deja los instaladores en:

```
frontend/src-tauri/target/release/bundle/msi/ModbusScadaCampo_<version>_x64_en-US.msi
frontend/src-tauri/target/release/bundle/nsis/ModbusScadaCampo_<version>_x64-setup.exe
```

Cualquiera de los dos instala la app (crea el acceso directo, la registra
en "Agregar o quitar programas", etc.). El `.exe` suelto sin instalar
también existe en `frontend/src-tauri/target/release/app.exe`, útil para
probar rápido sin instalar nada.

### Variantes útiles durante desarrollo

| Quiero... | Comando |
|---|---|
| Probar rápido sin generar instalador | `cd frontend && npm run tauri:dev` |
| Solo el backend publicado (sin Tauri) | `powershell -File scripts/build-campo.ps1` |
| Correr ese backend publicado a mano | `powershell -File scripts/run-campo.ps1` |

Ni `npm run tauri:dev` ni `npm run tauri:build` reconstruyen el backend/
frontend por su cuenta — los dos solo usan lo que ya esté copiado en
`src-tauri/binaries/`. Si tocaste `backend/` o `frontend/src/`, corré
siempre primero `powershell -File scripts/build-campo.ps1`.

## Cómo se arma el instalador por dentro (por si algo falla)

`scripts/build-campo.ps1` hace los primeros 4 pasos; `tauri build` (paso 2
del flujo de arriba) hace el 5to usando lo que haya dejado el script:

1. Compila el frontend con URLs relativas (`vite build --mode campo`, usa
   `frontend/.env.campo`).
2. Copia ese build a `backend/ModbusScada.Api/wwwroot/`.
3. Publica el backend como `.exe` autocontenido para Windows (no necesita
   .NET instalado en la máquina destino).
4. Copia ese `.exe` + `wwwroot/` + `appsettings*.json` a
   `frontend/src-tauri/binaries/` (ahí es donde Tauri busca el "sidecar").
5. **Recién acá entra `tauri build`**: compila la app de Tauri (Rust) y
   arma los instaladores con lo que encuentra en `binaries/` en ese
   momento -- si ese contenido quedó viejo (no corriste el paso 1 antes),
   el instalador sale con un backend desactualizado sin ningún aviso ni
   error, así que conviene correr siempre los dos pasos en orden.

Si `tauri build` falla buscando el sidecar directamente (sin haber corrido
`build-campo.ps1` nunca), fijate que exista
`frontend/src-tauri/binaries/modbus-scada-api-x86_64-pc-windows-msvc.exe`.

## Número de versión

La versión que se ve en la app (abajo del menú lateral, "v0.1.0") sale de
**una sola fuente**: el campo `"version"` de `frontend/package.json`. Vite
la inyecta al compilar (ver `vite.config.js`, variable `__APP_VERSION__`).

`frontend/src-tauri/tauri.conf.json` tiene **su propio** campo `"version"`
(el que usan los instaladores para nombrar el archivo y para que Windows
sepa que es una versión distinta) — no se sincroniza solo, hay que
actualizarlo a mano junto con `package.json` cuando corresponda:

```json
// frontend/package.json
"version": "0.2.0",
```
```json
// frontend/src-tauri/tauri.conf.json
"version": "0.2.0",
```

Después de cambiar cualquiera de los dos, `npm run tauri:build` para
generar el instalador con el número nuevo.

## Ícono de la app

Sale de `frontend/src/assets/Logo.png` (el isotipo, sin texto). Para
regenerar los íconos si el logo cambia:

```powershell
cd frontend
npx tauri icon ruta\a\logo-cuadrado.png
```

`tauri icon` necesita una imagen **cuadrada** de buena resolución (idealmente
1024×1024) — si el logo no es cuadrado, hay que centrarlo primero en un
lienzo cuadrado (con fondo blanco o transparente) antes de pasárselo, si no
sale estirado/recortado raro. El comando genera automáticamente también
íconos de iOS/Android que esta app no usa — se pueden borrar tranquilos las
carpetas `frontend/src-tauri/icons/android/` e `icons/ios/` si aparecen de
nuevo.

## Problemas comunes al probar

- **"address already in use" en el puerto 5136**: quedó un proceso viejo
  corriendo (de una prueba anterior, instalada o no). Buscarlo y matarlo:
  ```powershell
  Get-Process -Name 'app','modbus-scada-api','ModbusScada.Api' -ErrorAction SilentlyContinue | Stop-Process -Force
  ```
- **La base de datos quedó con datos viejos de una prueba anterior**:
  borrar `modbus_scada.db` (y los archivos `-shm`/`-wal` que la acompañan)
  de la carpeta donde corriste el backend, y volver a arrancar — se re-crea
  sola con el dispositivo de ejemplo.
- **Cambié código pero la app instalada sigue igual**: hay que desinstalar
  la versión vieja (o instalar la nueva encima, el instalador la reemplaza)
  y generar un `.exe`/instalador nuevo — ver arriba, no se actualiza sola.
- **Reinstalé la versión nueva, la app ya estaba cerrada, y AUN ASÍ sigue
  mostrando lo viejo**: esto pasó una vez y la causa fue caché del
  navegador interno (WebView2), no un archivo desactualizado. A diferencia
  de una pestaña de navegador normal, el perfil de WebView2 de Tauri **sí
  persiste en disco entre una apertura de la app y la siguiente** — carpeta
  `%LOCALAPPDATA%\<identifier del tauri.conf.json>\` (ej.
  `C:\Users\<usuario>\AppData\Local\mx.ich.modbusscada.campo\`). El backend
  ya manda `Cache-Control: no-cache` para `index.html` (ver `Program.cs`)
  para que esto no vuelva a pasar, pero si alguna vez reaparece, borrar esa
  carpeta a mano con la app cerrada fuerza que arranque de cero.

## Configurar la conexión real del equipo (RTU)

Sección propia del sidebar, "Conexión" (no vive dentro de "Datos del
sitio" — son cosas distintas: identidad del sitio vs. transporte). El
botón "Detectar automáticamente" prueba cada puerto COM que Windows ve
conectado con una lectura Modbus real (registro 15) hasta encontrar el
que responde, y lo selecciona solo. Si no encuentra nada, el campo sigue
siendo un `<select>` editable con los puertos que ve Windows (nombres que
no matchean `COM<número>` se descartan — ver `PuertoSerialDetector`). En
ambos casos hay que tocar "Guardar" para persistirlo.

Guardar Datos del sitio/SMS/FTP es todo o nada: si el equipo no confirma
la escritura (apagado, desconectado), no se guarda nada, ni siquiera
local — mejor un error claro que un estado a medias.
