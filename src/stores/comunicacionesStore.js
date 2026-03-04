import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api, API_ENDPOINTS } from '../config/api'
import { getCurrentTimestamp, parseISODate } from '../utils/dateUtils'

// Transformaciones para Comunicaciones
const transformBackendToFrontend = (backendComm) => {
  if (!backendComm) return null
  return {
    id: backendComm.id,
    ordenId: backendComm.order_id,
    clienteId: backendComm.client_id,
    cliente: backendComm.client,
    tipo: backendComm.communication_type,
    asunto: backendComm.subject,
    contenido: backendComm.content,
    remitente: backendComm.sender,
    destinatario: backendComm.recipient,
    fecha: backendComm.communication_date,
    estado: backendComm.status,
    leida: backendComm.read || false,
    esInterna: backendComm.is_internal || false,
    archivosAdjuntos: backendComm.attachments || [],
    observaciones: backendComm.observations,
    creadoPor: backendComm.created_by,
    fechaCreacion: backendComm.date_time_registration
  }
}

const transformFrontendToBackend = (frontendComm) => {
  if (!frontendComm) return null
  return {
    order_id: frontendComm.ordenId || null,
    client_id: frontendComm.clienteId || null,
    client: frontendComm.cliente || null,
    communication_type: frontendComm.tipo || null,
    subject: frontendComm.asunto || null,
    content: frontendComm.contenido || null,
    sender: frontendComm.remitente || null,
    recipient: frontendComm.destinatario || null,
    communication_date: frontendComm.fecha || getCurrentTimestamp(),
    status: frontendComm.estado || 'pendiente',
    read: frontendComm.leida || false,
    is_internal: frontendComm.esInterna || false,
    attachments: frontendComm.archivosAdjuntos || null,
    observations: frontendComm.observaciones || null,
    created_by: frontendComm.creadoPor || null
  }
}

const useComunicacionesStore = create(
  persist(
    (set, get) => ({
      comunicaciones: [],
      isLoading: false,

      fetchComunicaciones: async (filters = {}) => {
        set({ isLoading: true })
        try {
          const params = new URLSearchParams()
          if (filters.order_id) params.append('order_id', filters.order_id)
          if (filters.client_id) params.append('client_id', filters.client_id)
          if (filters.communication_type) params.append('communication_type', filters.communication_type)
          if (filters.status) params.append('status', filters.status)
          if (filters.read !== undefined) params.append('read', filters.read)

          const url = `${API_ENDPOINTS.COMMUNICATIONS}${params.toString() ? '?' + params.toString() : ''}`
          const backendComunicaciones = await api.get(url)
          const comunicaciones = backendComunicaciones.map(transformBackendToFrontend)

          set({ comunicaciones, isLoading: false })
          return comunicaciones
        } catch (error) {
          set({ isLoading: false })
          console.error('Error fetching comunicaciones:', error)
          throw error
        }
      },

      agregarComunicacion: async (comunicacion) => {
        set({ isLoading: true })
        try {
          const backendData = transformFrontendToBackend(comunicacion)
          const response = await api.post(API_ENDPOINTS.COMMUNICATIONS, backendData)
          const createdComunicacion = transformBackendToFrontend(response.data)

          await get().fetchComunicaciones()

          set({ isLoading: false })
          return createdComunicacion
        } catch (error) {
          set({ isLoading: false })
          console.error('Error creating comunicacion:', error)
          throw error
        }
      },

      updateComunicacion: async (id, updates) => {
        set({ isLoading: true })
        try {
          const backendUpdates = transformFrontendToBackend(updates)
          Object.keys(backendUpdates).forEach(key =>
            (backendUpdates[key] === undefined || backendUpdates[key] === null) && delete backendUpdates[key]
          )

          const response = await api.put(API_ENDPOINTS.COMMUNICATION_BY_ID(id), backendUpdates)
          const updatedComunicacion = transformBackendToFrontend(response.data)

          await get().fetchComunicaciones()

          set({ isLoading: false })
          return updatedComunicacion
        } catch (error) {
          set({ isLoading: false })
          console.error('Error updating comunicacion:', error)
          throw error
        }
      },

      obtenerComunicacionesPorOrden: (ordenId) => {
        const { comunicaciones } = get()
        return comunicaciones
          .filter(com => com.ordenId === ordenId)
          .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      },

      obtenerComunicacionesPorCliente: (cliente) => {
        const { comunicaciones } = get()
        return comunicaciones
          .filter(com => com.cliente === cliente)
          .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      },

      marcarComoLeida: async (id) => {
        const updates = { leida: true }
        return await get().updateComunicacion(id, updates)
      },

      actualizarEstadoComunicacion: async (id, nuevoEstado) => {
        const updates = { estado: nuevoEstado }
        return await get().updateComunicacion(id, updates)
      },
      
      // Tipos de comunicación
      tiposComunicacion: {
        'correo_entrada': { nombre: 'Correo Recibido', icon: '📧', color: 'blue' },
        'correo_salida': { nombre: 'Correo Enviado', icon: '📤', color: 'green' },
        'llamada_entrada': { nombre: 'Llamada Recibida', icon: '📞', color: 'purple' },
        'llamada_salida': { nombre: 'Llamada Realizada', icon: '☎️', color: 'indigo' },
        'whatsapp': { nombre: 'WhatsApp', icon: '💬', color: 'green' },
        'reunion': { nombre: 'Reunión', icon: '🤝', color: 'orange' },
        'nota_interna': { nombre: 'Nota Interna', icon: '📝', color: 'gray' }
      },
      
      // Estados de comunicación
      estadosComunicacion: {
        'pendiente': { nombre: 'Pendiente', color: 'yellow' },
        'en_proceso': { nombre: 'En Proceso', color: 'blue' },
        'respondido': { nombre: 'Respondido', color: 'green' },
        'cerrado': { nombre: 'Cerrado', color: 'gray' }
      },
      
      // Crear comunicación de correo entrante
      crearCorreoEntrada: (datos) => {
        return get().agregarComunicacion({
          tipo: 'correo_entrada',
          estado: 'pendiente',
          leida: false,
          ...datos
        })
      },
      
      // Crear comunicación de correo salida
      crearCorreoSalida: (datos) => {
        return get().agregarComunicacion({
          tipo: 'correo_salida',
          estado: 'respondido',
          leida: true,
          ...datos
        })
      },
      
      // Crear nota interna
      crearNotaInterna: (datos) => {
        return get().agregarComunicacion({
          tipo: 'nota_interna',
          estado: 'cerrado',
          leida: true,
          esInterna: true,
          ...datos
        })
      },
      
      // Obtener resumen de comunicaciones
      obtenerResumenComunicaciones: (ordenId) => {
        const comunicaciones = get().obtenerComunicacionesPorOrden(ordenId)
        return {
          total: comunicaciones.length,
          pendientes: comunicaciones.filter(c => c.estado === 'pending' || c.estado === 'pendiente').length,
          sinLeer: comunicaciones.filter(c => !c.leida).length,
          ultimaComunicacion: comunicaciones[0]?.fecha || null
        }
      },
      
      eliminarComunicacion: async (id) => {
        set({ isLoading: true })
        try {
          await api.delete(API_ENDPOINTS.COMMUNICATION_BY_ID(id))
          await get().fetchComunicaciones()
          set({ isLoading: false })
        } catch (error) {
          set({ isLoading: false })
          console.error('Error deleting comunicacion:', error)
          throw error
        }
      },

      getComunicacionById: (id) => {
        return get().comunicaciones.find(c => c.id === id)
      }
    }),
    {
      name: 'comunicaciones-storage',
      partialize: (state) => ({ comunicaciones: state.comunicaciones })
    }
  )
)

export default useComunicacionesStore