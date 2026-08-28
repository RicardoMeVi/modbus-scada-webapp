using System.Text.Json.Serialization;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.EntityFrameworkCore;
using ModbusScada.Api.Data;
using ModbusScada.Api.Hubs;
using ModbusScada.Api.Services;
using ModbusScada.Api.Services.Modbus;

// ContentRootPath explícito: por defecto ASP.NET Core usa el directorio de
// trabajo del proceso, no la carpeta del propio ejecutable. Al hacer doble
// clic desde el Explorador ambos coinciden "por accidente", pero un proceso
// lanzado por Tauri (sidecar) puede heredar otro directorio de trabajo, lo
// que rompería la ubicación de wwwroot/appsettings.Campo.json. Inocuo para
// Render/Docker, donde ya coinciden.
var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args,
    ContentRootPath = AppContext.BaseDirectory
});

const string FrontendCorsPolicy = "FrontendCors";

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

bool useMockData = builder.Configuration.GetValue("Mocking:Enabled", false);
// Independiente del simulador: si hay Postgres configurado (típicamente en
// appsettings.Development.json, que no se sube al repo), se usa como
// persistencia real aunque el simulador mock siga generando lecturas.
bool usarPostgres = builder.Configuration.GetValue("UsarPostgres", false);
// Ejecutable de campo (sin nube): persistencia en un archivo SQLite junto al
// propio ejecutable. La ruta se construye en código (no desde
// appsettings.Campo.json) para no depender del directorio de trabajo del
// proceso, igual que el ContentRootPath de arriba.
bool usarSqlite = builder.Configuration.GetValue("UsarSqlite", false);

builder.Services.AddDbContext<AppDbContext>(options =>
{
    if (usarPostgres)
    {
        options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"));
    }
    else if (usarSqlite)
    {
        var dbPath = Path.Combine(AppContext.BaseDirectory, "modbus_scada.db");
        options.UseSqlite($"Data Source={dbPath}");
    }
    else
    {
        options.UseInMemoryDatabase("ModbusScadaMock");
    }
});

builder.Services.AddSignalR();

// Disponible en ambos modos (mock y real): solo lista/prueba puertos COM
// del sistema operativo, no depende de si el sondeo de fondo es simulado.
builder.Services.AddSingleton<IPuertoSerialDetector, PuertoSerialDetector>();

// Purga periódica de LecturasHistoricas (ver HistorialPurgaService) -- solo
// tiene sentido con persistencia real (Sqlite/Postgres); con InMemory la
// base entera desaparece al cerrar la app, no hay nada que purgar.
if (usarSqlite || usarPostgres)
{
    builder.Services.AddHostedService<HistorialPurgaService>();
}

if (useMockData)
{
    builder.Services.AddSingleton<MockModbusPollingService>();
    builder.Services.AddHostedService(sp => sp.GetRequiredService<MockModbusPollingService>());
    builder.Services.AddSingleton<IModbusWriter, MockModbusWriter>();
    builder.Services.AddSingleton<ISiteConfigWriter, NullSiteConfigWriter>();
}
else
{
    builder.Services.AddSingleton<IModbusConnectionFactory, ModbusConnectionFactory>();
    builder.Services.AddHostedService<ModbusPollingService>();
    builder.Services.AddSingleton<IModbusWriter, RealModbusWriter>();
    builder.Services.AddSingleton<ISiteConfigWriter, RealSiteConfigWriter>();
}

builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCorsPolicy, policy =>
    {
        policy.WithOrigins(builder.Configuration.GetSection("FrontendOrigins").Get<string[]>()
                            ?? new[] { "http://localhost:5173" })
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Con Postgres real (Neon/Render), la base arranca vacía: hay que aplicar
// las migraciones de EF Core al iniciar para que existan las tablas antes
// de que el seeder o cualquier request intenten usarlas. Con InMemory no
// aplica (no tiene migraciones).
if (usarPostgres)
{
    using var migrationScope = app.Services.CreateScope();
    migrationScope.ServiceProvider.GetRequiredService<AppDbContext>().Database.Migrate();
}
else if (usarSqlite)
{
    // Sin migraciones para SQLite: las existentes tienen anotaciones
    // específicas de Npgsql que no aplican con este proveedor. EnsureCreated
    // alcanza para un archivo local de un solo sitio; si el esquema cambia
    // en el futuro, un modbus_scada.db ya desplegado en campo no se
    // actualiza solo.
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
    // EnsureCreated no hace nada si el archivo ya existía (no compara el
    // modelo actual contra el esquema real) -- así que un modbus_scada.db
    // de una instalación anterior nunca gana columnas nuevas solo, y
    // cualquier query que las use tira "no such column" y tumba el
    // BackgroundService entero (pasó con ConfiguracionSitioLeidaEn). Esto
    // agrega, best-effort, las columnas nullable que falten -- no es un
    // reemplazo de migraciones reales (no maneja renombres/tipos/drops),
    // solo cubre el caso común de sumar un campo opcional nuevo.
    AgregarColumnasFaltantes(db);
    PlaceholderDeviceSeeder.EnsureDispositivoExiste(db);
}

// Ver comentario en el bloque `usarSqlite` de arriba: EnsureCreated no
// actualiza el esquema de un modbus_scada.db que ya existía. Esta lista es
// el único lugar a tocar cuando se agregue una columna nullable nueva a
// Dispositivo/RegistroModbus -- un cambio de tipo, un rename o un drop
// necesitan más que esto (en ese caso sí hace falta una migración real).
void AgregarColumnasFaltantes(AppDbContext db)
{
    (string Tabla, string Columna, string TipoSql)[] columnasEsperadas =
    [
        ("Dispositivos", "ConfiguracionSitioLeidaEn", "TEXT"),
    ];

    var conexion = db.Database.GetDbConnection();
    conexion.Open();

    foreach (var (tabla, columna, tipoSql) in columnasEsperadas)
    {
        using var comandoInfo = conexion.CreateCommand();
        comandoInfo.CommandText = $"PRAGMA table_info(\"{tabla}\")";
        using var lector = comandoInfo.ExecuteReader();

        bool existe = false;
        while (lector.Read())
        {
            if (string.Equals(lector.GetString(1), columna, StringComparison.OrdinalIgnoreCase))
            {
                existe = true;
                break;
            }
        }
        lector.Close();

        if (!existe)
        {
            using var comandoAlter = conexion.CreateCommand();
            comandoAlter.CommandText = $"ALTER TABLE \"{tabla}\" ADD COLUMN \"{columna}\" {tipoSql} NULL";
            comandoAlter.ExecuteNonQuery();
        }
    }
}

if (useMockData)
{
    using var scope = app.Services.CreateScope();
    MockDataSeeder.Seed(scope.ServiceProvider.GetRequiredService<AppDbContext>());
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("Campo"))
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// El ejecutable de campo embebe el build de React en wwwroot y lo sirve
// desde el mismo proceso. Inocuo en Render/Docker (ahí no existe wwwroot).
//
// Todo archivo SIN hash de contenido en el nombre (index.html, icons.svg,
// favicon.svg -- cualquier cosa fuera de /assets/) nunca debe cachearse:
// solo los archivos de /assets/ que genera Vite llevan un hash que cambia
// solo si el contenido cambia, así que esos sí son seguros de cachear para
// siempre. El WebView2 que usa Tauri mantiene una caché en disco que
// sobrevive entre una ejecución de la app y la siguiente (no es como
// refrescar una pestaña) -- sin este header, después de generar una
// versión nueva del .exe la ventana puede seguir mostrando cualquiera de
// estos archivos sin hash tal como estaban en una ejecución anterior,
// aunque los archivos en disco ya estén actualizados (esto pasó de verdad
// con icons.svg: index.html apuntaba bien al bundle nuevo, pero el ícono
// nuevo agregado a icons.svg no aparecía porque ese archivo específico
// seguía cacheado).
void NoCachearSinHash(StaticFileResponseContext ctx)
{
    if (!ctx.Context.Request.Path.StartsWithSegments("/assets"))
    {
        ctx.Context.Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
    }
}

app.UseDefaultFiles();
app.UseStaticFiles(new StaticFileOptions { OnPrepareResponse = NoCachearSinHash });

// Sin certificado TLS en el sidecar local -- forzar HTTPS rompería todas
// las llamadas.
if (!app.Environment.IsEnvironment("Campo"))
{
    app.UseHttpsRedirection();
}

app.UseCors(FrontendCorsPolicy);

app.UseAuthorization();

// Señal de que el proceso ya levantó y la base de datos responde -- lo que
// el sidecar de Tauri consulta para saber cuándo mostrar la app real.
app.MapGet("/health", async (AppDbContext db) =>
    await db.Database.CanConnectAsync() ? Results.Ok(new { status = "ok" }) : Results.StatusCode(503));

app.MapControllers();
app.MapHub<ModbusHub>("/hubs/modbus");
app.MapFallbackToFile("index.html", new StaticFileOptions { OnPrepareResponse = NoCachearSinHash });

app.Run();
