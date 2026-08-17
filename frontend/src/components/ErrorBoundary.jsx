import { Component } from "react";

// Sin esto, un error de render en cualquier sección deja el área de
// contenido en blanco para siempre (React desmonta ese árbol y no hay forma
// de recuperarse sin recargar la página completa). Con el boundary, el
// usuario puede reintentar sin perder la sesión ni la conexión de SignalR.
export class ErrorBoundary extends Component {
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
      return (
        <div className="seccion-pendiente">
          <h2>Ocurrió un error al mostrar esta sección</h2>
          <p className="pendiente">
            Probá de nuevo. Si el problema sigue, recargá la página.
          </p>
          <button
            type="button"
            className="ficha-sitio-guardar"
            onClick={() => this.setState({ error: null })}
          >
            Reintentar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
