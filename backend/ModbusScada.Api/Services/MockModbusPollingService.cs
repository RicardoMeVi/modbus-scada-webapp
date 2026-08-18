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
    private readonly object _lock = new();

    private double _nivel = 50;
    private bool _bombaOn = true;
    private double _setpoint = 90;
    private double _totalizado = 0;
    private DateTime _reloj = DateTime.Now;
    private readonly Random _random = new();

    public MockModbusPollingService(IServiceScopeFactory scopeFactory, IHubContext<ModbusHub> hubContext)
    {
        _scopeFactory = scopeFactory;
        _hubContext = hubContext;
    }

    // Aplica una escritura de un cliente (dashboard) al estado simulado del
    // dispositivo, igual que Write Single Coil / Write Single Register en
    // un esclavo Modbus real. Se identifica el parámetro por nombre porque
    // este servicio simula un único dispositivo fijo (ver MockDataSeeder).
    public void EscribirValor(RegistroModbus registro, double valor)
    {
        lock (_lock)
        {
            switch (registro.Nombre)
            {
                case "Setpoint":
                    _setpoint = Math.Clamp(valor, 0, 100);
                    break;
                case "Bomba":
                    _bombaOn = valor != 0;
                    break;
                case "Día":
                    _reloj = ConReloj(dia: (int)valor);
                    break;
                case "Mes":
                    _reloj = ConReloj(mes: (int)valor);
                    break;
                case "Año":
                    _reloj = ConReloj(anio: (int)valor);
                    break;
                case "Hora":
                    _reloj = ConReloj(hora: (int)valor);
                    break;
                case "Minutos":
                    _reloj = ConReloj(minuto: (int)valor);
                    break;
                case "Segundos":
                    _reloj = ConReloj(segundo: (int)valor);
                    break;
                default:
                    throw new InvalidOperationException($"El registro '{registro.Nombre}' no admite escritura en el mock.");
            }
        }
    }

    // Reconstruye _reloj reemplazando un solo campo (igual que escribir un
    // Holding Register individual de fecha/hora en el HMI real). El día se
    // recorta al máximo válido del mes/año resultante para evitar
    // ArgumentOutOfRangeException con combinaciones transitorias (p.ej.
    // escribir "31" antes de cambiar el mes a uno con 31 días).
    private DateTime ConReloj(int? anio = null, int? mes = null, int? dia = null, int? hora = null, int? minuto = null, int? segundo = null)
    {
        var nuevoAnio = anio ?? _reloj.Year;
        var nuevoMes = mes ?? _reloj.Month;
        var diasEnMes = DateTime.DaysInMonth(nuevoAnio, nuevoMes);
        var nuevoDia = Math.Clamp(dia ?? _reloj.Day, 1, diasEnMes);

        return new DateTime(
            nuevoAnio,
            nuevoMes,
            nuevoDia,
            hora ?? _reloj.Hour,
            minuto ?? _reloj.Minute,
            segundo ?? _reloj.Second);
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

        double nivel, setpoint, caudal, totalizado;
        bool bombaOn;
        DateTime reloj;

        lock (_lock)
        {
            _reloj = _reloj.AddSeconds(PollInterval.TotalSeconds);
            reloj = _reloj;

            // Arranca la bomba si el nivel cae por debajo del setpoint (con
            // margen de 70 puntos), corta al alcanzar el setpoint. Con el
            // setpoint por defecto (90) reproduce los umbrales 20/90 del
            // modbus_servidor.py original.
            var umbralArranque = Math.Max(_setpoint - 70, 5);
            if (_nivel <= umbralArranque) _bombaOn = true;
            if (_nivel >= _setpoint) _bombaOn = false;
            _nivel = Math.Clamp(_nivel + (_bombaOn ? 2 : -1), 0, 100);

            // Caudal instantáneo: solo hay flujo mientras la bomba está
            // bombeando hacia el tanque; el totalizado acumula ese caudal.
            caudal = _bombaOn ? 9.5 + _random.NextDouble() * 1.5 : 0;
            _totalizado += caudal * (PollInterval.TotalHours);

            nivel = _nivel;
            bombaOn = _bombaOn;
            setpoint = _setpoint;
            totalizado = _totalizado;
        }

        var valores = new Dictionary<string, double>
        {
            ["Nivel del tanque"] = nivel,
            ["Bomba"] = bombaOn ? 1 : 0,
            ["Setpoint"] = setpoint,
            ["Caudal instantáneo"] = Math.Round(caudal, 2),
            ["Totalizado"] = Math.Round(totalizado, 3),
            ["Día"] = reloj.Day,
            ["Mes"] = reloj.Month,
            ["Año"] = reloj.Year,
            ["Hora"] = reloj.Hour,
            ["Minutos"] = reloj.Minute,
            ["Segundos"] = reloj.Second,
            // Valor fijo de ejemplo: bits 3 y 4 (GSM/GPRS) activos, el resto
            // apagados -- coincide con el resto de la app (FichaSms/FichaFtp
            // ya muestran GSM/GPRS como "mal" porque este banco de pruebas
            // no tiene antena/chip conectado). Sirve para que la pantalla de
            // Alarmas tenga algo que mostrar en modo simulador.
            ["Alarmas"] = 0b11000,
            ["Alarma IHM"] = 0
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
