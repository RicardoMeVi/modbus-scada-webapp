using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using ModbusScada.Api.Data;
using ModbusScada.Api.Hubs;
using ModbusScada.Api.Services;

var builder = WebApplication.CreateBuilder(args);

const string FrontendCorsPolicy = "FrontendCors";

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

bool useMockData = builder.Configuration.GetValue("Mocking:Enabled", false);

builder.Services.AddDbContext<AppDbContext>(options =>
{
    if (useMockData)
    {
        options.UseInMemoryDatabase("ModbusScadaMock");
    }
    else
    {
        options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"));
    }
});

builder.Services.AddSignalR();

if (useMockData)
{
    builder.Services.AddSingleton<MockModbusPollingService>();
    builder.Services.AddHostedService(sp => sp.GetRequiredService<MockModbusPollingService>());
    builder.Services.AddSingleton<IModbusWriter, MockModbusWriter>();
}
else
{
    builder.Services.AddHostedService<ModbusPollingService>();
    builder.Services.AddSingleton<IModbusWriter, RealModbusWriter>();
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

if (useMockData)
{
    using var scope = app.Services.CreateScope();
    MockDataSeeder.Seed(scope.ServiceProvider.GetRequiredService<AppDbContext>());
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors(FrontendCorsPolicy);

app.UseAuthorization();

app.MapControllers();
app.MapHub<ModbusHub>("/hubs/modbus");

app.Run();
