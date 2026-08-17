using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ModbusScada.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Dispositivos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Nombre = table.Column<string>(type: "text", nullable: false),
                    IpAddress = table.Column<string>(type: "text", nullable: true),
                    Puerto = table.Column<int>(type: "integer", nullable: false),
                    SlaveId = table.Column<byte>(type: "smallint", nullable: false),
                    Conexion = table.Column<int>(type: "integer", nullable: false),
                    PuertoSerial = table.Column<string>(type: "text", nullable: true),
                    Nsm = table.Column<string>(type: "text", nullable: true),
                    Nsue = table.Column<string>(type: "text", nullable: true),
                    Nsut = table.Column<string>(type: "text", nullable: true),
                    Rfc = table.Column<string>(type: "text", nullable: true),
                    UnidadVerificacion = table.Column<string>(type: "text", nullable: true),
                    ContrasenaUtd = table.Column<string>(type: "text", nullable: true),
                    Latitud = table.Column<double>(type: "double precision", nullable: true),
                    Longitud = table.Column<double>(type: "double precision", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Dispositivos", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RegistrosModbus",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    DispositivoId = table.Column<int>(type: "integer", nullable: false),
                    Nombre = table.Column<string>(type: "text", nullable: false),
                    Tabla = table.Column<int>(type: "integer", nullable: false),
                    Direccion = table.Column<int>(type: "integer", nullable: false),
                    TipoDato = table.Column<int>(type: "integer", nullable: false),
                    Unidad = table.Column<string>(type: "text", nullable: true),
                    OrdenBytes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RegistrosModbus", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RegistrosModbus_Dispositivos_DispositivoId",
                        column: x => x.DispositivoId,
                        principalTable: "Dispositivos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LecturasHistoricas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    RegistroModbusId = table.Column<int>(type: "integer", nullable: false),
                    Valor = table.Column<double>(type: "double precision", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LecturasHistoricas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LecturasHistoricas_RegistrosModbus_RegistroModbusId",
                        column: x => x.RegistroModbusId,
                        principalTable: "RegistrosModbus",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LecturasHistoricas_RegistroModbusId",
                table: "LecturasHistoricas",
                column: "RegistroModbusId");

            migrationBuilder.CreateIndex(
                name: "IX_RegistrosModbus_DispositivoId",
                table: "RegistrosModbus",
                column: "DispositivoId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LecturasHistoricas");

            migrationBuilder.DropTable(
                name: "RegistrosModbus");

            migrationBuilder.DropTable(
                name: "Dispositivos");
        }
    }
}
