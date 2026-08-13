using Microsoft.AspNetCore.SignalR;

namespace ModbusScada.Api.Hubs;

// Hub SignalR: el BackgroundService de polling empuja lecturas nuevas a
// los clientes conectados (dashboard React) a través de este hub.
public class ModbusHub : Hub
{
}
