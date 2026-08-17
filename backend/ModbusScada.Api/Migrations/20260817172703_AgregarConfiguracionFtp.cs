using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ModbusScada.Api.Migrations
{
    /// <inheritdoc />
    public partial class AgregarConfiguracionFtp : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FtpCarpeta",
                table: "Dispositivos",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FtpContrasena",
                table: "Dispositivos",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "FtpHoraEnvio",
                table: "Dispositivos",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FtpIpServidor",
                table: "Dispositivos",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "FtpMinutoEnvio",
                table: "Dispositivos",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "FtpTipoMensaje",
                table: "Dispositivos",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FtpUsuario",
                table: "Dispositivos",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FtpCarpeta",
                table: "Dispositivos");

            migrationBuilder.DropColumn(
                name: "FtpContrasena",
                table: "Dispositivos");

            migrationBuilder.DropColumn(
                name: "FtpHoraEnvio",
                table: "Dispositivos");

            migrationBuilder.DropColumn(
                name: "FtpIpServidor",
                table: "Dispositivos");

            migrationBuilder.DropColumn(
                name: "FtpMinutoEnvio",
                table: "Dispositivos");

            migrationBuilder.DropColumn(
                name: "FtpTipoMensaje",
                table: "Dispositivos");

            migrationBuilder.DropColumn(
                name: "FtpUsuario",
                table: "Dispositivos");
        }
    }
}
