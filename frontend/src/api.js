import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";

export const api = axios.create({ baseURL: API_BASE_URL });

export function getDispositivos() {
  return api.get("/api/dispositivos").then((res) => res.data);
}

export function escribirValor(dispositivoId, registroId, valor) {
  return api.post(`/api/dispositivos/${dispositivoId}/registros/${registroId}/valor`, { valor });
}

// Coincide con el orden del enum TipoTablaModbus en el backend.
export const TABLA_MODBUS = {
  COIL: 0,
  DISCRETE_INPUT: 1,
  HOLDING_REGISTER: 2,
  INPUT_REGISTER: 3,
};
