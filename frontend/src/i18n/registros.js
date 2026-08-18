// Los RegistroModbus tienen su `nombre` fijo en español porque así están
// sembrados en el backend (ver MockDataSeeder.cs) y se usan para emparejar
// datos, no solo para mostrar texto. Este mapa traduce SOLO para mostrar en
// pantalla (Dashboard, Medidores) sin tocar la lógica de matching. Si el
// nombre no está en el mapa (registro nuevo todavía no traducido), se
// muestra tal cual viene del backend en vez de romper.
const CLAVE_POR_NOMBRE = {
  "Nivel del tanque": "registros.nivelTanque",
  Bomba: "registros.bomba",
  "Caudal instantáneo": "registros.caudalInstantaneo",
  Totalizado: "registros.totalizado",
};

export function traducirNombreRegistro(t, nombre) {
  const clave = CLAVE_POR_NOMBRE[nombre];
  return clave ? t(clave) : nombre;
}
