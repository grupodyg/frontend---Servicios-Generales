import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api, API_ENDPOINTS } from '../config/api'
import { getCurrentTimestamp } from '../utils/dateUtils'

// Transformaciones para Permisos de Empleados
const transformBackendToFrontend = (backend) => {
  if (!backend) return null

  return {
    id: backend.id,
    empleadoId: backend.employee_id,
    empleadoNombre: backend.employee_name,
    tipoPermiso: backend.permit_type,
    fechaInicio: backend.start_date,
    fechaFin: backend.end_date,
    diasSolicitados: backend.days_requested,
    motivo: backend.reason,
    documentacionAdjunta: backend.attached_documentation || null,
    estado: backend.status,
    aprobadoPor: backend.approved_by,
    fechaAprobacion: backend.approval_date,
    rechazadoPor: backend.rejected_by,
    fechaRechazo: backend.rejection_date,
    motivoRechazo: backend.rejection_reason,
    fechaSolicitud: backend.date_time_registration,
    fechaCreacion: backend.date_time_registration
  }
}

const transformFrontendToBackend = (frontend) => {
  if (!frontend) return null
  return {
    employee_id: frontend.empleadoId || null,
    employee_name: frontend.empleadoNombre || null,
    permit_type: frontend.tipoPermiso || null,
    start_date: frontend.fechaInicio || null,
    end_date: frontend.fechaFin || null,
    days_requested: frontend.diasSolicitados || null,
    reason: frontend.motivo || null,
    attached_documentation: frontend.documentacionAdjunta || null,
    status: frontend.estado || 'pending',
    approved_by: frontend.aprobadoPor || null,
    approval_date: frontend.fechaAprobacion || null,
    rejected_by: frontend.rechazadoPor || null,
    rejection_date: frontend.fechaRechazo || null,
    rejection_reason: frontend.motivoRechazo || null
  }
}

const usePermisosStore = create(
  persist(
    (set, get) => ({
      permisos: [],
      isLoading: false,

      fetchPermisos: async (filters = {}) => {
        set({ isLoading: true })
        try {
          const params = new URLSearchParams()
          if (filters.status) params.append('status', filters.status)
          if (filters.employee_id) params.append('employee_id', filters.employee_id)
          if (filters.permit_type) params.append('permit_type', filters.permit_type)

          const url = `${API_ENDPOINTS.EMPLOYEE_PERMITS}${params.toString() ? '?' + params.toString() : ''}`
          const backendPermisos = await api.get(url)
          const permisos = backendPermisos.map(transformBackendToFrontend)

          set({ permisos, isLoading: false })
          return permisos
        } catch (error) {
          set({ isLoading: false })
          console.error('Error fetching permisos:', error)
          throw error
        }
      },

      crearPermiso: async (permisoData) => {
        set({ isLoading: true })
        try {
          const backendData = transformFrontendToBackend(permisoData)
          const response = await api.post(API_ENDPOINTS.EMPLOYEE_PERMITS, backendData)
          const createdPermiso = transformBackendToFrontend(response.data)

          await get().fetchPermisos()

          set({ isLoading: false })
          return createdPermiso
        } catch (error) {
          set({ isLoading: false })
          console.error('Error creating permiso:', error)
          throw error
        }
      },

      updatePermiso: async (id, updates) => {
        set({ isLoading: true })
        try {
          const backendUpdates = transformFrontendToBackend(updates)
          Object.keys(backendUpdates).forEach(key =>
            (backendUpdates[key] === undefined || backendUpdates[key] === null) && delete backendUpdates[key]
          )

          const response = await api.put(API_ENDPOINTS.EMPLOYEE_PERMIT_BY_ID(id), backendUpdates)
          const updatedPermiso = transformBackendToFrontend(response.data)

          await get().fetchPermisos()

          set({ isLoading: false })
          return updatedPermiso
        } catch (error) {
          set({ isLoading: false })
          console.error('Error updating permiso:', error)
          throw error
        }
      },

      aprobarPermiso: async (id, aprobadoPor) => {
        const updates = {
          estado: 'approved',
          aprobadoPor: aprobadoPor,
          fechaAprobacion: getCurrentTimestamp()
        }
        return await get().updatePermiso(id, updates)
      },

      rechazarPermiso: async (id, rechazadoPor, motivoRechazo) => {
        const updates = {
          estado: 'rejected',
          rechazadoPor: rechazadoPor,
          motivoRechazo: motivoRechazo,
          fechaRechazo: getCurrentTimestamp()
        }
        return await get().updatePermiso(id, updates)
      },

      deletePermiso: async (id) => {
        set({ isLoading: true })
        try {
          await api.delete(API_ENDPOINTS.EMPLOYEE_PERMIT_BY_ID(id))
          await get().fetchPermisos()
          set({ isLoading: false })
        } catch (error) {
          set({ isLoading: false })
          console.error('Error deleting permiso:', error)
          throw error
        }
      },

      getPermisoById: (id) => {
        const permisos = get().permisos || []
        return permisos.find(p => p.id === id)
      },

      obtenerEstadisticas: () => {
        const permisos = get().permisos || []
        return {
          total: permisos.length,
          pendientes: permisos.filter(p => p.estado === 'pending').length,
          aprobados: permisos.filter(p => p.estado === 'approved').length,
          rechazados: permisos.filter(p => p.estado === 'rejected').length
        }
      },

      inicializarDatos: async () => {
        await get().fetchPermisos()
      },

      uploadPermisoFile: async (file) => {
        try {
          const formData = new FormData()
          formData.append('file', file)
          const response = await api.upload(API_ENDPOINTS.PERMIT_ATTACHMENT_UPLOAD, formData)
          return response.data
        } catch (error) {
          console.error('Error uploading permit file:', error)
          throw error
        }
      },

      fetchPermitAttachments: async (permitId) => {
        try {
          const url = `${API_ENDPOINTS.PERMIT_ATTACHMENTS}?permit_id=${encodeURIComponent(permitId)}`
          const attachments = await api.get(url)
          return (attachments || []).map(att => ({
            id: att.id,
            nombre: att.name,
            tipo: att.file_type,
            tamaño: att.size ? (att.size / 1024).toFixed(2) + 'KB' : null,
            url: att.url,
            fechaCarga: att.date_time_registration
          }))
        } catch (error) {
          console.error('Error fetching permit attachments:', error)
          return []
        }
      },

      agregarArchivoAdjunto: async (permisoId, archivoInfo) => {
        try {
          const response = await api.post(API_ENDPOINTS.PERMIT_ATTACHMENTS, {
            permit_id: permisoId,
            name: archivoInfo.nombre,
            file_type: archivoInfo.tipo,
            size: archivoInfo.size || null,
            url: archivoInfo.url
          })
          return response.data
        } catch (error) {
          console.error('Error creating permit attachment:', error)
          throw error
        }
      }
    }),
    {
      name: 'permisos-storage',
      partialize: (state) => ({ permisos: state.permisos })
    }
  )
)

export default usePermisosStore
