import { Component } from "react";
import { withTranslation } from "react-i18next";

// Sin esto, un error de render en cualquier sección deja el área de
// contenido en blanco para siempre (React desmonta ese árbol y no hay forma
// de recuperarse sin recargar la página completa). Con el boundary, el
// usuario puede reintentar sin perder la sesión ni la conexión de SignalR.
// Es un componente de clase (los boundaries de error no existen como hook
// todavía), por eso usa withTranslation en vez de useTranslation.
class ErrorBoundaryBase extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Error de render en el panel:", error, info);
  }

  render() {
    if (this.state.error) {
      const { t } = this.props;
      return (
        <div className="seccion-pendiente">
          <h2>{t("errorBoundary.titulo")}</h2>
          <p className="pendiente">{t("errorBoundary.mensaje")}</p>
          <button
            type="button"
            className="ficha-sitio-guardar"
            onClick={() => this.setState({ error: null })}
          >
            {t("errorBoundary.reintentar")}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export const ErrorBoundary = withTranslation()(ErrorBoundaryBase);
