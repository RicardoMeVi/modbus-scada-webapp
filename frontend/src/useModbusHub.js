import { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { API_BASE_URL } from "./api";

// Se conecta al hub de SignalR del backend y acumula la última lectura
// recibida por cada registro Modbus (keyed por RegistroId).
export function useModbusHub() {
  const [lecturas, setLecturas] = useState({});
  const connectionRef = useRef(null);

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/hubs/modbus`)
      .withAutomaticReconnect()
      .build();

    connection.on("lectura", (lectura) => {
      setLecturas((prev) => ({ ...prev, [lectura.registroId ?? lectura.RegistroId]: lectura }));
    });

    connection.start().catch((err) => console.error("Error conectando a SignalR:", err));
    connectionRef.current = connection;

    return () => {
      connection.stop();
    };
  }, []);

  return lecturas;
}
