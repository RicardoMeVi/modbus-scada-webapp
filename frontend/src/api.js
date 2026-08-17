import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";

// Timeout explícito: sin esto, si el backend no responde (reiniciando,
// caído, etc.) un pedido puede quedar colgado indefinidamente y la UI
// parece "congelada" (ver ModalVerificacion, que deshabilita el form
// mientras espera).
export const api = axios.create({ baseURL: API_BASE_URL, timeout: 8000 });

export function getDispositivos() {
  return api.get("/api/dispositivos").then((res) => res.data);
}

export function getDispositivo(id) {
  return api.get(`/api/dispositivos/${id}`).then((res) => res.data);
}

export function escribirValor(dispositivoId, registroId, valor) {
  return api.post(`/api/dispositivos/${dispositivoId}/registros/${registroId}/valor`, { valor });
}

// Devuelve { ok: true } si el PIN es correcto. Si no, distingue { ok:
// false, motivo: "incorrecto" } (el backend respondió que el PIN está mal)
// de { ok: false, motivo: "conexion" } (no hubo respuesta: backend caído,
// reiniciando, timeout) para poder mostrar un mensaje claro en cada caso.
export function validarPin(pin) {
  return api
    .post("/api/verificacion/validar", { pin })
    .then(() => ({ ok: true }))
    .catch((error) => ({
      ok: false,
      motivo: error.response ? "incorrecto" : "conexion",
    }));
}

// Coincide con el orden del enum TipoTablaModbus en el backend.
export const TABLA_MODBUS = {
  COIL: 0,
  DISCRETE_INPUT: 1,
  HOLDING_REGISTER: 2,
  INPUT_REGISTER: 3,
};
