using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ModbusScada.Api.Migrations
{
    /// <inheritdoc />
    public partial class AgregarConfiguracionSms : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SmsHoraEnvio",
                table: "Dispositivos",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SmsMinutoEnvio",
                table: "Dispositivos",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SmsNumero",
                table: "Dispositivos",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SmsTipoMensaje",
                table: "Dispositivos",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SmsHoraEnvio",
                table: "Dispositivos");

            migrationBuilder.DropColumn(
                name: "SmsMinutoEnvio",
                table: "Dispositivos");

            migrationBuilder.DropColumn(
                name: "SmsNumero",
                table: "Dispositivos");

            migrationBuilder.DropColumn(
                name: "SmsTipoMensaje",
                table: "Dispositivos");
        }
    }
}
