# Modbus SCADA Webapp

Sistema tipo SCADA/HMI web para monitoreo y control remoto de dispositivos
industriales que hablan protocolo **Modbus** (TCP y/o RTU), pensado para ser
escalable a múltiples clientes/plantas sin modificar código para cada nuevo
dispositivo.

Ver [CONTEXTO.md](./CONTEXTO.md) para el detalle completo de arquitectura,
decisiones técnicas y aprendizajes de Modbus.

## Estructura del repositorio

- `backend/ModbusScada.Api/` — API en .NET (ASP.NET Core) + NModbus + SignalR + EF Core
- `frontend/` — Dashboard en React (Vite)

## Cómo correrlo en desarrollo

### Backend

```bash
cd backend/ModbusScada.Api
dotnet run
```

Requiere una base PostgreSQL corriendo (ver `ConnectionStrings:DefaultConnection`
en `appsettings.json`). Migraciones de EF Core aún no generadas.

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React |
| Backend | .NET (ASP.NET Core) |
| Comunicación Modbus | NModbus |
| Tiempo real | SignalR |
| Base de datos | PostgreSQL / SQL Server (EF Core) |
