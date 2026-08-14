# Pendientes de instalación / configuración manual

Este entorno no tiene acceso a internet, así que no pude correr instalaciones.
Nada de lo que hice agregó dependencias nuevas (ni en `package.json` ni en el
`.csproj`), pero como el checkout no tiene `node_modules` ni se restauraron
los paquetes de NuGet, hace falta correr esto manualmente antes de levantar
el proyecto.

## 1. Frontend

```bash
cd frontend
npm install
cp .env.example .env   # si todavía no existe .env
npm run dev
```

Cambios hechos en esta sesión (sin dependencias nuevas): se agregó un
esqueleto de navegación lateral con las 5 secciones del HMI Kinco original
(Datos del sitio, Mensaje/SMS, FTP, Fecha/Hora, Alarmas) — ver
`frontend/src/sections.js`, `frontend/src/components/`. Solo "Datos del
sitio" tiene contenido real (el dashboard de dispositivos/registros que ya
existía); las otras 4 secciones son placeholders a definir en conversaciones
futuras (ver `CONTEXTO.md`, sección 3).

## 2. Backend

```bash
cd backend/ModbusScada.Api
dotnet restore
dotnet build
dotnet run
```

Por defecto corre en **modo mock** (`Mocking:Enabled: true` en
`appsettings.json`): usa una base en memoria y un simulador de tanque, no
necesita PostgreSQL ni el Mobicon real. No se tocó nada del backend en esta
sesión.

### Cuando se quiera conectar contra PostgreSQL real (modo no-mock)

1. Tener PostgreSQL corriendo y ajustar `ConnectionStrings:DefaultConnection`
   en `appsettings.json`.
2. Poner `Mocking:Enabled` en `false`.
3. Generar las migraciones de EF Core (todavía no existen):
   ```bash
   dotnet tool install --global dotnet-ef   # si no está instalado
   dotnet ef migrations add InitialCreate
   dotnet ef database update
   ```

## 3. Pendientes de hardware (fuera del código, ver CONTEXTO.md sección 9)

Estos no son instalaciones de software del repo, pero quedan anotados porque
son bloqueantes para probar contra el Mobicon real:

- Conseguir el software **MTManager** (Inventia) para configurar el Mobicon
  MT-151 y leer su memory map real.
- Conseguir el manual completo / memory map en PDF del Mobicon MT-151.
- En la máquina Windows: `mbpoll.exe` está bloqueado por Kaspersky Endpoint
  Security (gestionado por TI institucional) — pedir excepción para el
  ejecutable o el puerto TCP 502/5020.
