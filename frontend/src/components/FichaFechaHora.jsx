import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { escribirValor } from "../api";
import { Toast } from "./Toast";
import { IconoSeccion } from "./icons/IconoSeccion";

// `nombre` tiene que quedarse en español: es el nombre real del
// RegistroModbus en el backend (ver MockDataSeeder.cs) y se usa para
// emparejar con `registros`/`lecturas`, no es solo texto de UI. `labelKey`
// es lo único que se traduce para mostrar en pantalla.
//
// El `min`/`max` de un <input type="number"> no bloquea nada de verdad (se
// puede tipear o pegar cualquier valor igual, solo cambia las flechitas del
// spinner) -- por eso además se recorta a mano en actualizarCampo. "dia" y
// "anio" son la excepción: no se recortan mientras se tipea, se validan
// como error en su lugar. A "dia" no se le puede aplicar un mínimo (depende
// de mes/año, que pueden no estar completos todavía) y a "anio" un mínimo
// de 4 cifras (2000) rompe la escritura letra por letra -- apenas se
// tipeaba el primer dígito, se recortaba para arriba a "2000" y el resto de
// lo que el usuario seguía escribiendo se le sumaba atrás, terminando
// siempre en 2099. Con solo un tope de longitud (4 dígitos) y validación de
// rango al final, se puede tipear un año de forma normal.
const CAMPOS = [
  { nombre: "Año", labelKey: "fechaHora.anio", clave: "anio", min: 2000, max: 2099, maxDigitos: 4 },
  { nombre: "Hora", labelKey: "fechaHora.hora", clave: "hora", min: 0, max: 23 },
  { nombre: "Mes", labelKey: "fechaHora.mes", clave: "mes", min: 1, max: 12 },
  { nombre: "Minutos", labelKey: "fechaHora.minutos", clave: "minutos", min: 0, max: 59 },
  { nombre: "Día", labelKey: "fechaHora.dia", clave: "dia", min: 1, max: 31 },
  { nombre: "Segundos", labelKey: "fechaHora.segundos", clave: "segundos", min: 0, max: 59 },
];

// Campos que se validan como error al terminar de tipear, en vez de
// recortarse en cada tecla (ver comentario de arriba).
const CAMPOS_SIN_RECORTE = new Set(["dia", "anio"]);

// Máximo día real del mes/año elegidos (28-31), igual que el recorte que ya
// hace el backend simulado (MockModbusPollingService.ConReloj) para no
// terminar con una fecha imposible como 31 de febrero.
function diasEnMes(anio, mes) {
  const anioNum = Number(anio);
  const mesNum = Number(mes);
  if (!anioNum || !mesNum || mesNum < 1 || mesNum > 12) {
    return 31;
  }
  return new Date(anioNum, mesNum, 0).getDate();
}

// Configuración de fecha/hora, igual a la pantalla "Configuración Fecha /
// Hora" del HMI físico (Kinco/ICH): reloj interno de la UTD (sección 3.1 de
// CONTEXTONuevo.md), con flujo de edición "modificar → escritura → lectura
// de confirmación" (cada campo es un Holding Register individual).
// Clave de localStorage para el ancla del reloj visual (ver más abajo) --
// una por dispositivo, para no pisar el ancla de otro sitio si algún día
// hay más de uno.
function claveAnclaReloj(registros) {
  return `relojFechaHora:${registros[0]?.dispositivoId ?? "unico"}`;
}

export function FichaFechaHora({ registros, lecturas }) {
  const { t } = useTranslation();
  const registroPorNombre = Object.fromEntries(registros.map((r) => [r.nombre, r]));

  const [editando, setEditando] = useState(false);
  const [campos, setCampos] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [estado, setEstado] = useState(null);
  // Input nativo de fecha oculto: el ícono de calendario solo abre el
  // selector del sistema operativo/navegador (showPicker), no se muestra el
  // input en sí -- así no hay que mantener un date picker propio.
  const fechaInputRef = useRef(null);
  // Momento de la última escritura exitosa. Hasta que no llegue por SignalR
  // una lectura posterior a ese momento (la "lectura de confirmación" del
  // flujo real del HMI), se sigue mostrando lo recién guardado en vez de
  // pisarlo con la última lectura en vivo, que puede ser previa a la
  // escritura y "revertir" visualmente el cambio que se acaba de confirmar.
  const ultimaEscrituraRef = useRef(null);

  // El registro Modbus de Fecha/Hora es una foto fija que la UTD no
  // actualiza sola con el tiempo real (ver manual del Interrogador,
  // "Operación": "tampoco realizará la actualización automática de la
  // fecha y hora conforme transcurra el tiempo") -- por eso hace falta este
  // reloj puramente visual: ancla la última lectura real (+ el momento en
  // que llegó) y de ahí en más suma tiempo local para que en pantalla se
  // vea avanzar como en el panel Kinco físico. `valorReal` guarda la última
  // tupla real ya anclada -- sin compararla, cada lectura repetida del
  // mismo valor estático (llega cada ~5s aunque no haya cambiado nada) iba
  // a pisar el reloj visual y hacerlo "saltar" para atrás.
  const baseRelojRef = useRef(null);

  // Mientras no se está editando, los campos siguen el reloj en vivo
  // (llega por SignalR, igual que Caudal/Totalizado en Medidores). Si los
  // seis campos llegaron y son iguales a lo ya anclado, no se toca `campos`
  // -- se deja avanzar solo al tick visual de abajo.
  useEffect(() => {
    if (editando) return;

    const valorReal = {};
    let completo = true;
    for (const { nombre, clave } of CAMPOS) {
      const registro = registroPorNombre[nombre];
      const lectura = registro ? lecturas[registro.id] : null;
      const timestamp = lectura && new Date(lectura.timestamp ?? lectura.Timestamp);
      const esConfirmacionFresca =
        !ultimaEscrituraRef.current || (timestamp && timestamp >= ultimaEscrituraRef.current);

      if (lectura && esConfirmacionFresca) {
        valorReal[clave] = lectura.valor ?? lectura.Valor;
      } else {
        completo = false;
      }
    }

    if (!completo) {
      // Sin datos reales todavía (o parciales): mostrar lo que haya, sin
      // arrancar el reloj visual.
      setCampos((prev) => ({ ...prev, ...valorReal }));
      return;
    }

    const yaAnclado = baseRelojRef.current?.valorReal;
    const esIgual = yaAnclado && CAMPOS.every(({ clave }) => String(yaAnclado[clave]) === String(valorReal[clave]));
    if (esIgual) return; // mismo valor estático de siempre -- no pisar el tick visual

    // El componente se remonta al cambiar de sección o al reabrir la app --
    // sin esto, cada remontaje perdía baseRelojRef (es un ref, vive y muere
    // con el componente) y el reloj visual "rebobinaba" al valor original y
    // volvía a contar desde ahí, en vez de seguir avanzando como si nunca
    // se hubiera interrumpido. Si el valor real es el mismo que la última
    // vez que se ancló (aunque haya sido en otro montaje/otra sesión de la
    // app), se reutiliza el `capturadoEn` guardado en vez de reiniciarlo a
    // "ahora".
    const clave = claveAnclaReloj(registros);
    let capturadoEn = Date.now();
    try {
      const guardado = JSON.parse(localStorage.getItem(clave) ?? "null");
      if (guardado && CAMPOS.every(({ clave: c }) => String(guardado.valorReal[c]) === String(valorReal[c]))) {
        capturadoEn = guardado.capturadoEn;
      }
    } catch {
      // localStorage no disponible o dato corrupto -- seguir con "ahora".
    }

    const { anio, mes, dia, hora, minutos, segundos } = valorReal;
    baseRelojRef.current = {
      valorReal,
      fecha: new Date(Number(anio), Number(mes) - 1, Number(dia), Number(hora), Number(minutos), Number(segundos)),
      capturadoEn,
    };
    try {
      localStorage.setItem(clave, JSON.stringify({ valorReal, capturadoEn }));
    } catch {
      // Best-effort: sin persistencia el reloj visual sigue andando, solo
      // vuelve a arrancar desde el valor real si se remonta el componente.
    }
    setCampos(valorReal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editando, lecturas]);

  // Tick puramente visual: no vuelve a preguntarle nada al equipo, solo
  // suma tiempo local sobre la última ancla real. Usar un objeto Date real
  // (en vez de sumar dígitos a mano) para que el acarreo entre
  // segundos/minutos/horas/día/mes/año salga bien solo.
  useEffect(() => {
    const id = setInterval(() => {
      if (editando || !baseRelojRef.current) return;
      const { fecha, capturadoEn } = baseRelojRef.current;
      const visual = new Date(fecha.getTime() + (Date.now() - capturadoEn));
      setCampos({
        anio: String(visual.getFullYear()),
        mes: String(visual.getMonth() + 1),
        dia: String(visual.getDate()),
        hora: String(visual.getHours()),
        minutos: String(visual.getMinutes()),
        segundos: String(visual.getSeconds()),
      });
    }, 1000);
    return () => clearInterval(id);
  }, [editando]);

  const maxDia = diasEnMes(campos.anio, campos.mes);
  const diaInvalido = campos.dia !== "" && campos.dia !== undefined && Number(campos.dia) > maxDia;
  const anioInvalido = campos.anio !== "" && campos.anio !== undefined && (Number(campos.anio) < 2000 || Number(campos.anio) > 2099);
  const hayErrores = diaInvalido || anioInvalido;

  function actualizarCampo(clave, valor, min, max, maxDigitos) {
    // Al primer cambio se congela el seguimiento en vivo (ver el efecto de
    // arriba) para que un tick de SignalR no pise lo que se está tipeando.
    setEditando(true);
    setEstado(null);

    const digitos = valor.replace(/\D/g, "");
    if (digitos === "") {
      setCampos((prev) => ({ ...prev, [clave]: "" }));
      return;
    }

    if (CAMPOS_SIN_RECORTE.has(clave)) {
      const recortado = maxDigitos ? digitos.slice(0, maxDigitos) : digitos;
      setCampos((prev) => ({ ...prev, [clave]: String(Number(recortado)) }));
      return;
    }

    const numero = Math.min(max, Math.max(min, Number(digitos)));
    setCampos((prev) => ({ ...prev, [clave]: String(numero) }));
  }

  // Al elegir una fecha del selector nativo (formato "YYYY-MM-DD"), llena
  // Día/Mes/Año directo -- son valores ya válidos (el propio calendario no
  // deja elegir un 31 de febrero), no hace falta pasarlos por el recorte.
  function seleccionarFecha(valorFecha) {
    if (!valorFecha) return;
    const [anio, mes, dia] = valorFecha.split("-").map(Number);
    setEditando(true);
    setEstado(null);
    setCampos((prev) => ({ ...prev, anio: String(anio), mes: String(mes), dia: String(dia) }));
  }

  async function modificar() {
    if (hayErrores) return;
    setGuardando(true);
    setEstado(null);
    try {
      for (const { nombre, clave } of CAMPOS) {
        const registro = registroPorNombre[nombre];
        if (!registro || campos[clave] === "") continue;
        await escribirValor(registro.dispositivoId, registro.id, Number(campos[clave]));
      }
      ultimaEscrituraRef.current = new Date();
      setEstado("ok");
      setEditando(false);
    } catch {
      setEstado("error");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="ficha-sitio">
      <div className="ficha-fecha-acciones-top">
        <button
          type="button"
          className="boton-calendario"
          onClick={() => fechaInputRef.current?.showPicker?.()}
          aria-label={t("fechaHora.abrirCalendario")}
        >
          <IconoSeccion id="calendar-icon" size={16} />
          {t("fechaHora.usarCalendario")}
        </button>
        {/* Oculto: solo existe para que el botón de arriba dispare el
            selector nativo del sistema y volcar lo elegido en Día/Mes/Año. */}
        <input
          ref={fechaInputRef}
          type="date"
          className="input-fecha-oculto"
          onChange={(e) => seleccionarFecha(e.target.value)}
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>

      <div className="ficha-fecha-grid">
          {CAMPOS.map(({ labelKey, clave, min, max, maxDigitos }) => {
            const invalido = (clave === "dia" && diaInvalido) || (clave === "anio" && anioInvalido);
            return (
              <label key={clave}>
                {t(labelKey).toUpperCase()}
                <input
                  type="text"
                  inputMode="numeric"
                  className={invalido ? "campo-invalido" : undefined}
                  value={campos[clave] ?? ""}
                  onChange={(e) => actualizarCampo(clave, e.target.value, min, max, maxDigitos)}
                />
                {clave === "dia" && diaInvalido && (
                  <span className="campo-error">{t("fechaHora.diaInvalido")}</span>
                )}
                {clave === "anio" && anioInvalido && (
                  <span className="campo-error">{t("fechaHora.anioInvalido")}</span>
                )}
              </label>
            );
          })}
      </div>

      <div className="ficha-sitio-acciones">
        <button
          type="button"
          className="ficha-sitio-guardar"
          onClick={modificar}
          disabled={guardando || hayErrores}
          title={hayErrores ? t("fechaHora.diaInvalido") : undefined}
        >
          {guardando ? t("comun.guardando") : t("comun.modificar")}
        </button>
      </div>

      {estado && (
        <Toast
          tipo={estado}
          mensaje={estado === "ok" ? t("fechaHora.toastOk") : t("fechaHora.toastError")}
          onCerrar={() => setEstado(null)}
        />
      )}
    </div>
  );
}

export const NOMBRES_FECHA_HORA = CAMPOS.map((c) => c.nombre);
