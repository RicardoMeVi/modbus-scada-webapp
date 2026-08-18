use std::net::{SocketAddr, TcpStream};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

const SIDECAR_URL: &str = "http://127.0.0.1:5136";
const SIDECAR_ADDR: &str = "127.0.0.1:5136";

// Guarda el proceso hijo del backend para poder matarlo al cerrar la
// ventana -- Tauri no lo hace solo (gotcha conocido de sidecars).
struct SidecarProcess(Mutex<Option<CommandChild>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(SidecarProcess(Mutex::new(None)))
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let (mut rx, child) = app
                .shell()
                .sidecar("modbus-scada-api")
                .expect("no se encontró el sidecar del backend")
                .env("ASPNETCORE_ENVIRONMENT", "Campo")
                .env("ASPNETCORE_URLS", SIDECAR_URL)
                .spawn()
                .expect("no se pudo iniciar el backend");

            app.state::<SidecarProcess>()
                .0
                .lock()
                .unwrap()
                .replace(child);

            // Registra la salida del backend en el log de Tauri -- ayuda a
            // diagnosticar si el sidecar falla al arrancar.
            tauri::async_runtime::spawn(async move {
                while let Some(event) = rx.recv().await {
                    match event {
                        CommandEvent::Stderr(line) => {
                            log::warn!("[backend] {}", String::from_utf8_lossy(&line));
                        }
                        CommandEvent::Stdout(line) => {
                            log::info!("[backend] {}", String::from_utf8_lossy(&line));
                        }
                        _ => {}
                    }
                }
            });

            // No se crea la ventana hasta que el backend responda -- evita
            // mostrar una pantalla de "conexión rechazada" mientras
            // EnsureCreated()/Kestrel siguen arrancando. En este backend
            // ambos terminan antes de que el puerto acepte conexiones, así
            // que un simple connect es suficiente como señal de "listo".
            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                let addr: SocketAddr = SIDECAR_ADDR.parse().expect("dirección inválida");
                let deadline = Instant::now() + Duration::from_secs(30);

                while Instant::now() < deadline {
                    if TcpStream::connect_timeout(&addr, Duration::from_millis(300)).is_ok() {
                        break;
                    }
                    std::thread::sleep(Duration::from_millis(200));
                }

                WebviewWindowBuilder::new(
                    &app_handle,
                    "main",
                    WebviewUrl::External(SIDECAR_URL.parse().expect("URL inválida")),
                )
                .title("ICH - Panel de sitio")
                .inner_size(1200.0, 800.0)
                .build()
                .expect("no se pudo crear la ventana principal");
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                if let Some(child) = window
                    .app_handle()
                    .state::<SidecarProcess>()
                    .0
                    .lock()
                    .unwrap()
                    .take()
                {
                    let _ = child.kill();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
