import { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { API_BASE_URL } from "../api";

// Se conecta al hub de SignalR del backend y acumula la última lectura
// recibida por cada registro Modbus (keyed por RegistroId). También expone
// el estado de la conexión (equivalente al indicador "COM" del HMI físico).
export function useModbusHub() {
  const [lecturas, setLecturas] = useState({});
  const [conectado, setConectado] = useState(false);
  // Aviso de que un guardado reciente (Datos del sitio/SMS/FTP) mostró
  // éxito al toque pero, en la revisión demorada en segundo plano, no se
  // sostuvo de verdad (ver RealSiteConfigWriter.RevisarDespuesAsync) --
  // llega unos segundos después del toast de éxito, así que es un aviso aparte,
  // no algo que reemplace ese toast.
  const [avisoNoSostenido, setAvisoNoSostenido] = useState(null);
  const connectionRef = useRef(null);

  useEffect(() => {
    // Reintentos largos: por defecto withAutomaticReconnect() se rinde
    // después de [0, 2, 10, 30]s y no vuelve a intentar solo. Si la laptop
    // se suspende o la pestaña queda en segundo plano un buen rato (más de
    // esos ~42s), la conexión queda muerta para siempre y hay que recargar
    // la página — con esta lista sigue reintentando cada 30s indefinidamente.
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/hubs/modbus`)
      .withAutomaticReconnect([0, 2000, 10000, 30000, 30000, 30000, 30000])
      .build();

    connection.on("lectura", (lectura) => {
      setLecturas((prev) => ({ ...prev, [lectura.registroId ?? lectura.RegistroId]: lectura }));
    });

    connection.on("guardadoNoSostenido", (aviso) => {
      setAvisoNoSostenido(aviso);
    });

    connection.onreconnecting(() => setConectado(false));
    connection.onreconnected(() => setConectado(true));
    connection.onclose(() => setConectado(false));

    function iniciar() {
      connection
        .start()
        .then(() => setConectado(true))
        .catch((err) => console.error("Error conectando a SignalR:", err));
    }

    // Red de seguridad: si igual se agotan los reintentos automáticos (o el
    // navegador congeló los timers mientras la pestaña estaba oculta),
    // forzar una reconexión manual apenas la pestaña vuelve a estar activa.
    function alVolverVisible() {
      if (document.visibilityState === "visible" && connection.state === signalR.HubConnectionState.Disconnected) {
        iniciar();
      }
    }

    document.addEventListener("visibilitychange", alVolverVisible);

    iniciar();
    connectionRef.current = connection;

    return () => {
      document.removeEventListener("visibilitychange", alVolverVisible);
      connection.stop();
    };
  }, []);

  return { lecturas, conectado, avisoNoSostenido, limpiarAvisoNoSostenido: () => setAvisoNoSostenido(null) };
}
