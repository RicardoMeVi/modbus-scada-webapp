using Microsoft.EntityFrameworkCore;
using ModbusScada.Api.Models;

namespace ModbusScada.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Dispositivo> Dispositivos => Set<Dispositivo>();
    public DbSet<RegistroModbus> RegistrosModbus => Set<RegistroModbus>();
    public DbSet<LecturaHistorica> LecturasHistoricas => Set<LecturaHistorica>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Dispositivo>()
            .HasMany(d => d.Registros)
            .WithOne(r => r.Dispositivo)
            .HasForeignKey(r => r.DispositivoId);

        modelBuilder.Entity<RegistroModbus>()
            .HasMany<LecturaHistorica>()
            .WithOne(l => l.RegistroModbus)
            .HasForeignKey(l => l.RegistroModbusId);
    }
}
