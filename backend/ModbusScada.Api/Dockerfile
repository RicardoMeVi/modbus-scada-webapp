# Build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY *.csproj ./
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app --no-restore

# Runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app ./

# Render (y la mayoria de los PaaS) asignan el puerto en runtime via la
# variable de entorno PORT, no en build time -- por eso el ENTRYPOINT usa
# forma shell (sin corchetes), que sí permite sustituir ${PORT} al arrancar
# el contenedor. 10000 es el valor por defecto de Render si PORT no llega.
EXPOSE 10000
ENTRYPOINT dotnet ModbusScada.Api.dll --urls http://0.0.0.0:${PORT:-10000}
