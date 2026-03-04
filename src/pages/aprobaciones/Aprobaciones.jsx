import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import useOrdenesStore from '../../stores/ordenesStore'
import useAuthStore from '../../stores/authStore'
import useNotificacionesStore from '../../stores/notificacionesStore'
import notificationService from '../../services/notificationService'
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

const MySwal = withReactContent(Swal)

const Aprobaciones = () => {
  const { ordenes, fetchOrdenes, aprobarOrden, rechazarOrden } = useOrdenesStore()
  const { user } = useAuthStore()
  const { notificarOrdenAprobada, notificarOrdenRechazada } = useNotificacionesStore()
  
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('pendientes')
  const [busqueda, setBusqueda] = useState('')
  const [ordenesParaAprobacion, setOrdenesParaAprobacion] = useState([])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        await fetchOrdenes()
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [fetchOrdenes])

  useEffect(() => {
    // Filtrar órdenes según el estado de aprobación
    const filteredOrdenes = ordenes.filter(orden => {
      if (filtro === 'pendientes') {
        return orden.estadoAprobacion === 'pendiente_aprobacion'
      } else if (filtro === 'aprobadas') {
        return orden.estadoAprobacion === 'aprobado'
      } else if (filtro === 'rechazadas') {
        return orden.estadoAprobacion === 'rechazado'
      }
      return true
    })

    // Aplicar búsqueda
    const searchFiltered = filteredOrdenes.filter(orden => 
      orden.id.toLowerCase().includes(busqueda.toLowerCase()) ||
      orden.cliente.toLowerCase().includes(busqueda.toLowerCase()) ||
      orden.tipoServicio.toLowerCase().includes(busqueda.toLowerCase())
    )

    setOrdenesParaAprobacion(searchFiltered)
  }, [ordenes, filtro, busqueda])

  const handleAprobar = async (orden) => {
    const result = await MySwal.fire({
      title: '¿Aprobar orden?',
      html: `
        <div class="text-left">
          <p class="mb-3">¿Estás seguro de aprobar la orden <strong>${orden.id}</strong>?</p>
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 class="font-semibold text-blue-800 mb-2">Detalles de la estimación:</h4>
            <p class="text-sm text-blue-700">
              • Materiales: ${orden.materialesEstimados?.length || 0} items<br>
              • Tiempo estimado: ${orden.tiempoEstimado?.descripcion || 'No especificado'}${
              user?.role === 'admin' ? `<br>• Costo estimado: $${orden.costoEstimado || 0}` : ''
            }
            </p>
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Aprobar',
      cancelButtonText: 'Cancelar'
    })

    if (result.isConfirmed) {
      try {
        await aprobarOrden(orden.id, user.name)
        
        // Notificar al técnico
        const tecnicoNombre = orden.tecnicoAsignado.split(' - ')[0]
        const tecnico = ordenes.find(o => o.tecnicoAsignado?.includes(tecnicoNombre))
        if (tecnico) {
          notificarOrdenAprobada(tecnico.id, orden.id)
        }
        
        await notificationService.ordenAprobada(orden.id)
        await fetchOrdenes()
      } catch (error) {
        await notificationService.error('Error', 'No se pudo aprobar la orden')
      }
    }
  }

  const handleRechazar = async (orden) => {
    const { value: motivo } = await MySwal.fire({
      title: 'Rechazar orden',
      html: `
        <div class="text-left">
          <p class="mb-3">¿Por qué rechazas la orden <strong>${orden.id}</strong>?</p>
          <textarea 
            id="motivo-rechazo" 
            class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent" 
            rows="4" 
            placeholder="Explica el motivo del rechazo..."
          ></textarea>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const motivoInput = document.getElementById('motivo-rechazo').value
        if (!motivoInput) {
          Swal.showValidationMessage('Debes proporcionar un motivo')
        }
        return motivoInput
      }
    })

    if (motivo) {
      try {
        await rechazarOrden(orden.id, user.name, motivo)
        
        // Notificar al técnico
        const tecnicoNombre = orden.tecnicoAsignado.split(' - ')[0]
        const tecnico = ordenes.find(o => o.tecnicoAsignado?.includes(tecnicoNombre))
        if (tecnico) {
          notificarOrdenRechazada(tecnico.id, orden.id, motivo)
        }
        
        await notificationService.ordenRechazada(orden.id, motivo)
        await fetchOrdenes()
      } catch (error) {
        await notificationService.error('Error', 'No se pudo rechazar la orden')
      }
    }
  }

  const getEstadoBadge = (estado) => {
    const estilos = {
      pendiente_aprobacion: 'bg-yellow-100 text-yellow-800',
      aprobado: 'bg-green-100 text-green-800',
      rechazado: 'bg-red-100 text-red-800'
    }
    
    const textos = {
      pendiente_aprobacion: 'Pendiente',
      aprobado: 'Aprobado',
      rechazado: 'Rechazado'
    }

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${estilos[estado] || ''}`}>
        {textos[estado] || estado}
      </span>
    )
  }

  const stats = {
    pendientes: ordenes.filter(o => o.estadoAprobacion === 'pendiente_aprobacion').length,
    aprobadas: ordenes.filter(o => o.estadoAprobacion === 'aprobado').length,
    rechazadas: ordenes.filter(o => o.estadoAprobacion === 'rechazado').length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando aprobaciones...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Aprobaciones de Proyectos</h1>
        <p className="text-gray-600">Gestiona las aprobaciones de órdenes de trabajo</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card bg-yellow-50 border-yellow-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">Pendientes</p>
              <p className="text-3xl font-bold text-yellow-900">{stats.pendientes}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-200 rounded-lg flex items-center justify-center">
              <span className="text-2xl">⏳</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card bg-green-50 border-green-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Aprobadas</p>
              <p className="text-3xl font-bold text-green-900">{stats.aprobadas}</p>
            </div>
            <div className="w-12 h-12 bg-green-200 rounded-lg flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card bg-red-50 border-red-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Rechazadas</p>
              <p className="text-3xl font-bold text-red-900">{stats.rechazadas}</p>
            </div>
            <div className="w-12 h-12 bg-red-200 rounded-lg flex items-center justify-center">
              <span className="text-2xl">❌</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Buscar por ID, cliente o tipo de servicio..."
              className="input-field"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setFiltro('pendientes')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filtro === 'pendientes'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pendientes
            </button>
            <button
              onClick={() => setFiltro('aprobadas')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filtro === 'aprobadas'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Aprobadas
            </button>
            <button
              onClick={() => setFiltro('rechazadas')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filtro === 'rechazadas'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Rechazadas
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Órdenes de trabajo */}
      <div className="card">
        {ordenesParaAprobacion.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No hay órdenes {filtro} para mostrar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">ID Orden</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Cliente</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Tipo Servicio</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Técnico</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Tiempo Est.</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Estado</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {ordenesParaAprobacion.map((orden) => (
                  <motion.tr
                    key={orden.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="py-4 px-4">
                      <span className="font-mono text-sm">{orden.id}</span>
                    </td>
                    <td className="py-4 px-4">{orden.cliente}</td>
                    <td className="py-4 px-4">{orden.tipoServicio}</td>
                    <td className="py-4 px-4">
                      {orden.tecnicoAsignado?.split(' - ')[0] || 'Sin asignar'}
                    </td>
                    <td className="py-4 px-4">
                      {orden.tiempoEstimado?.descripcion || '-'}
                    </td>
                    <td className="py-4 px-4">
                      {getEstadoBadge(orden.estadoAprobacion)}
                    </td>
                    <td className="py-4 px-4">
                      {orden.estadoAprobacion === 'pendiente_aprobacion' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAprobar(orden)}
                            className="text-green-600 hover:text-green-800 font-medium text-sm"
                          >
                            Aprobar
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            onClick={() => handleRechazar(orden)}
                            className="text-red-600 hover:text-red-800 font-medium text-sm"
                          >
                            Rechazar
                          </button>
                        </div>
                      )}
                      {orden.estadoAprobacion === 'aprobado' && (
                        <span className="text-sm text-gray-500">
                          Por: {orden.aprobadoPor}
                        </span>
                      )}
                      {orden.estadoAprobacion === 'rechazado' && (
                        <button
                          onClick={() => {
                            MySwal.fire({
                              title: 'Motivo del rechazo',
                              html: `
                                <div class="text-left">
                                  <p class="font-medium mb-2">Rechazado por: ${orden.rechazadoPor}</p>
                                  <div class="bg-red-50 border border-red-200 rounded-lg p-3">
                                    <p class="text-sm text-red-800">${orden.motivoRechazo}</p>
                                  </div>
                                </div>
                              `,
                              icon: 'info',
                              confirmButtonColor: '#1e40af'
                            })
                          }}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                        >
                          Ver motivo
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Aprobaciones