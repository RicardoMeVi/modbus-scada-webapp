import { useTranslation } from "react-i18next";

// Placeholder para las secciones del HMI que todavía no se definen en
// detalle (ver CONTEXTO.md, sección 3: se detallan una a la vez). Solo
// existe el esqueleto de navegación por ahora.
export function SeccionPendiente({ titulo }) {
  const { t } = useTranslation();
  return (
    <div>
      <h2>{titulo}</h2>
      <p className="pendiente">{t("seccionPendiente.mensaje")}</p>
    </div>
  );
}
