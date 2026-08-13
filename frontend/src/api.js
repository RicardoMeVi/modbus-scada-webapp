import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";

export const api = axios.create({ baseURL: API_BASE_URL });

export function getDispositivos() {
  return api.get("/api/dispositivos").then((res) => res.data);
}
