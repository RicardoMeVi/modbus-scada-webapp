# Modbus SCADA Webapp

Sistema tipo SCADA/HMI web para monitoreo y control remoto de dispositivos
industriales que hablan protocolo **Modbus** (TCP y/o RTU), pensado para ser
escalable a múltiples clientes/plantas sin modificar código para cada nuevo
dispositivo.

Ver [CONTEXTO.md](./CONTEXTO.md) para el detalle completo de arquitectura,
decisiones técnicas y aprendizajes de Modbus.

## Estructura del repositorio

- `backend/` — API en .NET (ASP.NET Core) + NModbus + SignalR
- `frontend/` — Dashboard en React

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React |
| Backend | .NET (ASP.NET Core) |
| Comunicación Modbus | NModbus |
| Tiempo real | SignalR |
| Base de datos | PostgreSQL / SQL Server (EF Core) |
