using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using ModbusScada.Api.Data;
using ModbusScada.Api.Hubs;
using ModbusScada.Api.Models;

namespace ModbusScada.Api.Services;

// Sustituto de ModbusPollingService para desarrollo sin hardware ni
// servidor Modbus real: simula el mismo comportamiento causa-efecto del
// modbus_servidor.py (nivel del tanque sube si la bomba está ON, baja si
// está OFF) y publica lecturas por SignalR igual que el polling real.
public class MockModbusPollingService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHubContext<ModbusHub> _hubContext;
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(2);

    private double _nivel = 50;
    private bool _bombaOn = true;

    public MockModbusPollingService(IServiceScopeFactory scopeFactory, IHubContext<ModbusHub> hubContext)
    {
        _scopeFactory = scopeFactory;
        _hubContext = hubContext;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(PollInterval);

        while (!stoppingToken.IsCancellationRequested &&
               await timer.WaitForNextTickAsync(stoppingToken))
        {
            await TickAsync(stoppingToken);
        }
    }

    private async Task TickAsync(CancellationToken stoppingToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var dispositivo = await db.Dispositivos.Include(d => d.Registros).FirstOrDefaultAsync(stoppingToken);
        if (dispositivo is null)
        {
            return;
        }

        // Bombea si el nivel baja de 20%, corta si sube de 90% (mismo umbral que el simulador Python).
        if (_nivel <= 20) _bombaOn = true;
        if (_nivel >= 90) _bombaOn = false;
        _nivel = Math.Clamp(_nivel + (_bombaOn ? 2 : -1), 0, 100);

        var valores = new Dictionary<string, double>
        {
            ["Nivel del tanque"] = _nivel,
            ["Bomba"] = _bombaOn ? 1 : 0,
            ["Setpoint"] = 90
        };

        foreach (var registro in dispositivo.Registros)
        {
            if (!valores.TryGetValue(registro.Nombre, out var valor))
            {
                continue;
            }

            db.LecturasHistoricas.Add(new LecturaHistorica
            {
                RegistroModbusId = registro.Id,
                Valor = valor,
                Timestamp = DateTime.UtcNow
            });

            await _hubContext.Clients
                .All
                .SendAsync("lectura", new
                {
                    dispositivo.Id,
                    RegistroId = registro.Id,
                    registro.Nombre,
                    Valor = valor,
                    Timestamp = DateTime.UtcNow
                }, stoppingToken);
        }

        await db.SaveChangesAsync(stoppingToken);
    }
}
