using Microsoft.EntityFrameworkCore;
using ModbusScada.Api.Data;

namespace ModbusScada.Api.Services;

// LecturasHistoricas crece sin límite: el sondeo (real o mock) inserta una
// fila por registro cada pocos segundos, todo el tiempo que la app está
// abierta, para siempre. Sin esto, un sitio en uso continuo durante meses
// termina con una base local pesada. Corre una vez al arrancar y después
// cada IntervaloEntrePurgas, sin importar el modo (mock o real) -- ambos
// insertan al mismo DbSet.
public class HistorialPurgaService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<HistorialPurgaService> _logger;
    private readonly int _retencionDias;
    private static readonly TimeSpan IntervaloEntrePurgas = TimeSpan.FromHours(6);

    public HistorialPurgaService(
        IServiceScopeFactory scopeFactory,
        ILogger<HistorialPurgaService> logger,
        IConfiguration config)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _retencionDias = config.GetValue("Historico:RetencionDias", 30);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(IntervaloEntrePurgas);

        // Corre una vez de entrada -- si la app rara vez queda abierta 6h
        // seguidas (uso típico: se prende, se usa, se cierra), esperar al
        // primer tick del timer podría significar que nunca se purga nada.
        await PurgarAsync(stoppingToken);

        while (!stoppingToken.IsCancellationRequested &&
               await timer.WaitForNextTickAsync(stoppingToken))
        {
            await PurgarAsync(stoppingToken);
        }
    }

    private async Task PurgarAsync(CancellationToken stoppingToken)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var limite = DateTime.UtcNow.AddDays(-_retencionDias);
            var borradas = await db.LecturasHistoricas
                .Where(l => l.Timestamp < limite)
                .ExecuteDeleteAsync(stoppingToken);

            if (borradas > 0)
            {
                _logger.LogInformation(
                    "Purga de histórico: {Cantidad} lecturas anteriores a {Limite:yyyy-MM-dd} eliminadas.",
                    borradas, limite);
            }
        }
        catch (Exception ex)
        {
            // Best-effort: si falla la purga, no debe tumbar el resto de la
            // app -- se reintenta en el próximo ciclo.
            _logger.LogWarning(ex, "No se pudo purgar el histórico de lecturas.");
        }
    }
}
