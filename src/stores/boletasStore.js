import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api, API_ENDPOINTS } from '../config/api'
import { getCurrentTimestamp, getCurrentYear, getCurrentMonth } from '../utils/dateUtils'

// Transformaciones para Boletas de Pago
const transformBackendToFrontend = (backendSlip) => {
  if (!backendSlip) return null

  // viewed_by puede ser null, un objeto JSON, o un array
  let vistaPor = []
  if (backendSlip.viewed_by) {
    if (Array.isArray(backendSlip.viewed_by)) {
      vistaPor = backendSlip.viewed_by
    } else if (typeof backendSlip.viewed_by === 'object') {
      // Si es un objeto JSON con datos, considerarlo como "visto"
      vistaPor = [backendSlip.viewed_by]
    }
  }

  return {
    id: backendSlip.id,
    empleadoId: backendSlip.employee_id,
    empleadoNombre: backendSlip.employee_name || backendSlip.name,
    cargo: backendSlip.position,
    año: backendSlip.year,
    mes: backendSlip.month,
    periodo: backendSlip.period,
    salarioBase: parseFloat(backendSlip.base_salary) || 0,
    horasExtras: backendSlip.overtime_hours || 0,
    bonificaciones: parseFloat(backendSlip.bonuses) || 0,
    deducciones: parseFloat(backendSlip.deductions) || 0,
    montoTotal: parseFloat(backendSlip.total_amount) || 0,
    archivoUrl: backendSlip.file_url,
    archivoNombre: backendSlip.file_name,
    archivoTamaño: backendSlip.file_size,
    subidoPor: backendSlip.uploaded_by,
    estado: backendSlip.status,
    vistaPor: vistaPor,
    fechaVista: backendSlip.view_date,
    fechaCreacion: backendSlip.date_time_registration
  }
}

const transformFrontendToBackend = (frontendSlip) => {
  if (!frontendSlip) return null

  // Solo incluir campos que realmente existen en el objeto de entrada
  // Esto evita sobrescribir valores existentes con "undefined" o valores por defecto
  const result = {}

  if ('empleadoId' in frontendSlip) result.employee_id = frontendSlip.empleadoId
  if ('empleadoNombre' in frontendSlip) result.employee_name = frontendSlip.empleadoNombre
  if ('cargo' in frontendSlip) result.position = frontendSlip.cargo
  if ('año' in frontendSlip) result.year = frontendSlip.año
  if ('mes' in frontendSlip) result.month = frontendSlip.mes
  if ('periodo' in frontendSlip) result.period = frontendSlip.periodo
  if ('salarioBase' in frontendSlip) result.base_salary = frontendSlip.salarioBase
  if ('horasExtras' in frontendSlip) result.overtime_hours = frontendSlip.horasExtras
  if ('bonificaciones' in frontendSlip) result.bonuses = frontendSlip.bonificaciones
  if ('deducciones' in frontendSlip) result.deductions = frontendSlip.deducciones
  if ('montoTotal' in frontendSlip) result.total_amount = frontendSlip.montoTotal
  if ('archivoUrl' in frontendSlip) result.file_url = frontendSlip.archivoUrl
  if ('archivoNombre' in frontendSlip) result.file_name = frontendSlip.archivoNombre
  if ('archivoTamaño' in frontendSlip) result.file_size = frontendSlip.archivoTamaño
  if ('subidoPor' in frontendSlip) result.uploaded_by = frontendSlip.subidoPor
  if ('estado' in frontendSlip) result.status = frontendSlip.estado
  if ('vistaPor' in frontendSlip) result.viewed_by = frontendSlip.vistaPor
  if ('fechaVista' in frontendSlip) result.view_date = frontendSlip.fechaVista

  return result
}

const useBoletasStore = create(
  persist(
    (set, get) => ({
      boletas: [],
      isLoading: false,

      fetchBoletas: async (filters = {}) => {
        set({ isLoading: true })
        try {
          const params = new URLSearchParams()
          if (filters.status) params.append('status', filters.status)
          if (filters.employee_id) params.append('employee_id', filters.employee_id)
          if (filters.period_month) params.append('period_month', filters.period_month)
          if (filters.period_year) params.append('period_year', filters.period_year)

          const url = `${API_ENDPOINTS.PAYROLL_SLIPS}${params.toString() ? '?' + params.toString() : ''}`
          const backendBoletas = await api.get(url)
          const boletas = backendBoletas.map(transformBackendToFrontend)

          set({ boletas, isLoading: false })
          return boletas
        } catch (error) {
          set({ isLoading: false })
          console.error('Error fetching boletas:', error)
          throw error
        }
      },

      uploadBoletaFile: async (file) => {
        try {
          const formData = new FormData()
          formData.append('file', file)
          const response = await api.upload(API_ENDPOINTS.PAYROLL_SLIP_UPLOAD, formData)
          return response.data
        } catch (error) {
          console.error('Error uploading boleta file:', error)
          throw error
        }
      },

      subirBoleta: async (boletaData) => {
        set({ isLoading: true })
        try {
          const backendData = transformFrontendToBackend(boletaData)
          const response = await api.post(API_ENDPOINTS.PAYROLL_SLIPS, backendData)
          const createdBoleta = transformBackendToFrontend(response.data)

          await get().fetchBoletas()

          set({ isLoading: false })
          return createdBoleta
        } catch (error) {
          set({ isLoading: false })
          console.error('Error creating boleta:', error)
          throw error
        }
      },

      updateBoleta: async (id, updates) => {
        set({ isLoading: true })
        try {
          const backendUpdates = transformFrontendToBackend(updates)
          Object.keys(backendUpdates).forEach(key =>
            (backendUpdates[key] === undefined || backendUpdates[key] === null) && delete backendUpdates[key]
          )

          const response = await api.put(API_ENDPOINTS.PAYROLL_SLIP_BY_ID(id), backendUpdates)
          const updatedBoleta = transformBackendToFrontend(response.data)

          await get().fetchBoletas()

          set({ isLoading: false })
          return updatedBoleta
        } catch (error) {
          set({ isLoading: false })
          console.error('Error updating boleta:', error)
          throw error
        }
      },

      marcarComoVista: async (boletaId, empleadoId) => {
        set({ isLoading: true })
        try {
          const boleta = get().boletas.find(b => b.id === boletaId)
          if (!boleta) {
            set({ isLoading: false })
            return
          }

          const vistaPor = boleta.vistaPor || []
          if (!vistaPor.includes(empleadoId)) {
            const updates = {
              vistaPor: [...vistaPor, empleadoId],
              estado: 'vista',
              fechaVista: getCurrentTimestamp()
            }
            await get().updateBoleta(boletaId, updates)
          }

          set({ isLoading: false })
        } catch (error) {
          set({ isLoading: false })
          console.error('Error marking boleta as viewed:', error)
          throw error
        }
      },

      obtenerBoletasPorEmpleado: (empleadoId) => {
        const boletas = get().boletas || []
        return boletas.filter(b => b.empleadoId === empleadoId)
      },

      obtenerBoletasPorPeriodo: (año, mes) => {
        const boletas = get().boletas || []
        return boletas.filter(b => b.año === año && b.mes === mes)
      },

      eliminarBoleta: async (boletaId) => {
        set({ isLoading: true })
        try {
          await api.delete(API_ENDPOINTS.PAYROLL_SLIP_BY_ID(boletaId))
          await get().fetchBoletas()
          set({ isLoading: false })
        } catch (error) {
          set({ isLoading: false })
          console.error('Error deleting boleta:', error)
          throw error
        }
      },

      obtenerEstadisticas: () => {
        const boletas = get().boletas || []
        const añoActual = getCurrentYear()
        const mesActual = getCurrentMonth()

        // No vistas: viewed_by es null o array vacío
        const noVistas = boletas.filter(b => !b.vistaPor || (Array.isArray(b.vistaPor) && b.vistaPor.length === 0))
        // Vistas: viewed_by tiene datos (no es null y tiene elementos)
        const vistas = boletas.filter(b => b.vistaPor && Array.isArray(b.vistaPor) && b.vistaPor.length > 0)

        return {
          total: boletas.length,
          nuevas: noVistas.length,
          vistas: vistas.length,
          esteMes: boletas.filter(b => b.año === añoActual && b.mes === mesActual).length,
          porMes: Array.from({ length: 12 }, (_, i) => ({
            mes: i + 1,
            cantidad: boletas.filter(b => b.año === añoActual && b.mes === i + 1).length
          }))
        }
      },

      getBoletaById: (id) => {
        const boletas = get().boletas || []
        return boletas.find(b => b.id === id)
      }
    }),
    {
      name: 'boletas-storage',
      partialize: (state) => ({ boletas: state.boletas })
    }
  )
)

export default useBoletasStore