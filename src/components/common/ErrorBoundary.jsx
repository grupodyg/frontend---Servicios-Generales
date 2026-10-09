import { Component } from 'react'

/**
 * Barrera de errores de toda la aplicación. Si una pantalla falla al dibujarse,
 * en lugar de dejar la página en blanco explica qué pasó y cómo continuar.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('🔴 Error de renderizado en la aplicación:', error, info?.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    const detalle = `${error.name || 'Error'}: ${error.message || 'sin detalle'}`

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-lg w-full bg-white rounded-xl shadow-md border border-red-100 p-6">
          <h1 className="text-xl font-bold text-red-700">Error interno de la aplicación</h1>
          <p className="mt-3 text-gray-800">
            Esta pantalla no se pudo mostrar por un fallo inesperado en la aplicación.
            No es un problema de los datos que ingresaste.
          </p>
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
            <strong>¿Qué puedes hacer?</strong> Recarga la página. Si vuelve a ocurrir, regresa al
            inicio y avisa al administrador del sistema indicando qué estabas haciendo y la
            pantalla en la que estabas.
          </div>
          <p className="mt-4 text-xs text-gray-500 break-words">
            Pantalla: {window.location.pathname} · Detalle técnico: {detalle}
          </p>
          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => { window.location.href = '/dashboard' }}
            >
              Ir al inicio
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => window.location.reload()}
            >
              Recargar la página
            </button>
          </div>
        </div>
      </div>
    )
  }
}

export default ErrorBoundary
