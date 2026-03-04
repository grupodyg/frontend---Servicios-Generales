import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import useComunicacionesStore from '../../stores/comunicacionesStore'
import useAuthStore from '../../stores/authStore'
import notificationService from '../../services/notificationService'
import { getCurrentDate, formatDate } from '../../utils/dateUtils'

const HistorialComunicaciones = ({ ordenId, cliente }) => {
  const { user } = useAuthStore()
  const {
    obtenerComunicacionesPorOrden,
    agregarComunicacion,
    marcarComoLeida,
    actualizarEstadoComunicacion,
    tiposComunicacion,
    estadosComunicacion,
    crearCorreoSalida,
    crearNotaInterna
  } = useComunicacionesStore()

  const [comunicaciones, setComunicaciones] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('correo')
  const [formData, setFormData] = useState({
    asunto: '',
    mensaje: '',
    tipo: 'correo_salida',
    destinatario: ''
  })

  useEffect(() => {
    if (ordenId) {
      const comms = obtenerComunicacionesPorOrden(ordenId)
      setComunicaciones(comms)
      
      // Marcar como leídas las comunicaciones no leídas
      comms.forEach(com => {
        if (!com.leida) {
          marcarComoLeida(com.id)
        }
      })
    }
  }, [ordenId, obtenerComunicacionesPorOrden, marcarComoLeida])

  const handleNuevaComunicacion = (tipo) => {
    setModalType(tipo)
    setFormData({
      asunto: '',
      mensaje: '',
      tipo: tipo === 'correo' ? 'correo_salida' : 'nota_interna',
      destinatario: tipo === 'correo' ? cliente : ''
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      const datos = {
        ordenId,
        cliente,
        asunto: formData.asunto,
        mensaje: formData.mensaje,
        remitente: user.name,
        destinatario: formData.destinatario
      }
      
      if (modalType === 'correo') {
        crearCorreoSalida(datos)
        await notificationService.success('Correo registrado', 'El correo ha sido registrado en el historial', 2000)
      } else {
        crearNotaInterna(datos)
        await notificationService.success('Nota agregada', 'La nota interna ha sido agregada', 2000)
      }
      
      // Actualizar lista
      setComunicaciones(obtenerComunicacionesPorOrden(ordenId))
      setShowModal(false)
    } catch (error) {
      await notificationService.error('Error', 'No se pudo registrar la comunicación')
    }
  }

  const handleCambiarEstado = async (comId, nuevoEstado) => {
    actualizarEstadoComunicacion(comId, nuevoEstado)
    setComunicaciones(obtenerComunicacionesPorOrden(ordenId))
    await notificationService.success('Estado actualizado', '', 1000)
  }

  const formatearFecha = (fecha) => {
    const date = new Date(fecha)
    const ahora = getCurrentDate()
    const diff = ahora - date
    const dias = Math.floor(diff / 86400000)
    
    if (dias === 0) {
      return `Hoy, ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
    } else if (dias === 1) {
      return `Ayer, ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
    } else if (dias < 7) {
      return `Hace ${dias} días`
    } else {
      return date.toLocaleDateString('es-ES', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      })
    }
  }

  return (
    <div className="space-y-4">
      {/* Header con acciones */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Historial de Comunicaciones
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => handleNuevaComunicacion('correo')}
            className="btn-secondary text-sm"
          >
            📧 Registrar Correo
          </button>
          <button
            onClick={() => handleNuevaComunicacion('nota')}
            className="btn-secondary text-sm"
          >
            📝 Agregar Nota
          </button>
        </div>
      </div>

      {/* Lista de comunicaciones */}
      {comunicaciones.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-500">No hay comunicaciones registradas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comunicaciones.map((com, index) => {
            const tipo = tiposComunicacion[com.tipo]
            const estado = estadosComunicacion[com.estado]
            
            return (
              <motion.div
                key={com.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-white border rounded-lg p-4 ${
                  com.esInterna ? 'border-gray-300 bg-gray-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className={`w-10 h-10 rounded-lg bg-${tipo.color}-100 text-${tipo.color}-600 flex items-center justify-center flex-shrink-0`}>
                      <span className="text-xl">{tipo.icon}</span>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900">{com.asunto}</h4>
                        {com.esInterna && (
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                            Nota Interna
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">{com.mensaje}</p>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>De: {com.remitente}</span>
                        {com.destinatario && <span>Para: {com.destinatario}</span>}
                        <span>{formatearFecha(com.fecha)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {!com.esInterna && (
                    <select
                      value={com.estado}
                      onChange={(e) => handleCambiarEstado(com.id, e.target.value)}
                      className={`text-xs px-2 py-1 rounded border bg-${estado.color}-50 text-${estado.color}-700 border-${estado.color}-200`}
                    >
                      {Object.entries(estadosComunicacion).map(([key, value]) => (
                        <option key={key} value={key}>{value.nombre}</option>
                      ))}
                    </select>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Modal para nueva comunicación */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {modalType === 'correo' ? 'Registrar Correo' : 'Agregar Nota Interna'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {modalType === 'correo' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Destinatario
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.destinatario}
                    onChange={(e) => setFormData({ ...formData, destinatario: e.target.value })}
                    required
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Asunto
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.asunto}
                  onChange={(e) => setFormData({ ...formData, asunto: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mensaje
                </label>
                <textarea
                  className="input-field"
                  rows="4"
                  value={formData.mensaje}
                  onChange={(e) => setFormData({ ...formData, mensaje: e.target.value })}
                  required
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  {modalType === 'correo' ? 'Registrar Correo' : 'Agregar Nota'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default HistorialComunicaciones