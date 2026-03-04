import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api, API_ENDPOINTS } from '../config/api'
import { getCurrentTimestamp, getToday, addDays, toDateOnly } from '../utils/dateUtils'

// 🔄 FUNCIONES DE TRANSFORMACIÓN DE DATOS (Backend ↔ Frontend)

// Mapeo de estados Backend (inglés) → Frontend (español)
const statusBackendToFrontend = {
  'pending': 'pendiente',
  'approved': 'aprobado',
  'rejected': 'rechazado',
  'cancelled': 'cancelado'
}

// Mapeo de estados Frontend (español) → Backend (inglés)
const statusFrontendToBackend = {
  'pendiente': 'pending',
  'aprobado': 'approved',
  'rechazado': 'rejected',
  'cancelado': 'cancelled'
}

// Transformar un item del backend al formato del frontend
const transformItemToFrontend = (item) => {
  return {
    id: item.id,
    tipo: item.item_type,
    descripcion: item.description,
    codigo: item.code,
    cantidad: parseFloat(item.quantity) || 0,
    unidad: item.unit,
    precioUnitario: parseFloat(item.unit_price) || 0,
    subtotal: parseFloat(item.subtotal) || 0,
    descripcionMateriales: item.material_description,
    manoObra: item.labor_description,
    equiposServicio: item.equipment_service,
    entregablesContratista: item.contractor_deliverables
  }
}

const transformBackendToFrontend = (backendQuotation) => {
  if (!backendQuotation) return null

  // Transformar items si existen
  const transformedItems = backendQuotation.items
    ? backendQuotation.items.map(transformItemToFrontend)
    : []

  // La columna 'client' es JSONB, extraer el nombre y guardar el objeto completo
  const clientData = backendQuotation.client || {}
  const clientName = typeof clientData === 'string' ? clientData : (clientData.nombre || '')

  return {
    id: backendQuotation.id,
    numero: backendQuotation.number,
    cliente: clientName,
    clienteData: typeof clientData === 'object' ? clientData : { nombre: clientData },
    fechaCotizacion: backendQuotation.quotation_date,
    fechaVencimiento: backendQuotation.expiration_date,
    validezDias: backendQuotation.validity_days,
    condicionesPago: backendQuotation.payment_conditions,
    margenGanancia: backendQuotation.profit_margin || 0,
    tienePreciosAsignados: backendQuotation.has_prices_assigned || false,
    subtotal: parseFloat(backendQuotation.subtotal) || 0,
    igv: parseFloat(backendQuotation.tax) || 0,
    total: parseFloat(backendQuotation.total) || 0,
    elaboradoPor: backendQuotation.prepared_by,
    aprobadoPor: backendQuotation.approved_by,
    fechaAprobacion: backendQuotation.approval_date,
    motivoRechazo: backendQuotation.rejection_reason,
    fechaRechazo: backendQuotation.rejection_date,
    observaciones: backendQuotation.observations,
    visitaTecnicaId: backendQuotation.technical_visit_id,
    ordenGenerada: backendQuotation.generated_order,
    estado: statusBackendToFrontend[backendQuotation.status] || backendQuotation.status,
    items: transformedItems,
    fechaCreacion: backendQuotation.date_time_registration
  }
}

// Transformar un item del frontend al formato del backend
const transformItemToBackend = (item) => {
  return {
    item_type: item.tipo || item.item_type || null,
    description: item.descripcion || item.description || null,
    code: item.codigo || item.code || null,
    quantity: item.cantidad || item.quantity || 0,
    unit: item.unidad || item.unit || null,
    unit_price: item.precioUnitario || item.unit_price || 0,
    subtotal: item.subtotal || 0,
    material_description: item.descripcionMateriales || item.material_description || null,
    labor_description: item.manoObra || item.labor_description || null,
    equipment_service: item.equiposServicio || item.equipment_service || null,
    contractor_deliverables: item.entregablesContratista || item.contractor_deliverables || null
  }
}

const transformFrontendToBackend = (frontendQuotation) => {
  if (!frontendQuotation) return null

  // Transformar items si existen
  const transformedItems = frontendQuotation.items
    ? frontendQuotation.items.map(transformItemToBackend)
    : []

  // La columna 'client' en la BD es JSONB, enviar el objeto clienteData
  const clientObject = frontendQuotation.clienteData || { nombre: frontendQuotation.cliente }

  return {
    client: clientObject,
    quotation_date: frontendQuotation.fechaCotizacion || null,
    expiration_date: frontendQuotation.fechaVencimiento || null,
    validity_days: frontendQuotation.validezDias || null,
    payment_conditions: frontendQuotation.condicionesPago || null,
    profit_margin: frontendQuotation.margenGanancia || 0,
    has_prices_assigned: frontendQuotation.tienePreciosAsignados || false,
    subtotal: frontendQuotation.subtotal || 0,
    tax: frontendQuotation.igv || 0,
    total: frontendQuotation.total || 0,
    prepared_by: frontendQuotation.elaboradoPor || null,
    approved_by: frontendQuotation.aprobadoPor || null,
    approval_date: frontendQuotation.fechaAprobacion || null,
    rejection_reason: frontendQuotation.motivoRechazo || null,
    rejection_date: frontendQuotation.fechaRechazo || null,
    observations: frontendQuotation.observaciones || null,
    technical_visit_id: frontendQuotation.visitaTecnicaId || null,
    generated_order: frontendQuotation.ordenGenerada || null,
    status: statusFrontendToBackend[frontendQuotation.estado] || frontendQuotation.estado || 'pending',
    items: transformedItems
  }
}

// Versión del esquema de datos (incrementar cuando cambie la estructura)
const SCHEMA_VERSION = 2

// Helper para obtener el nombre del cliente de forma segura
export const getClienteNombre = (presupuesto) => {
  if (!presupuesto) return ''

  // Si cliente es string, retornarlo directamente
  if (typeof presupuesto.cliente === 'string') {
    return presupuesto.cliente
  }

  // Si cliente es objeto, extraer el nombre
  if (typeof presupuesto.cliente === 'object' && presupuesto.cliente !== null) {
    return presupuesto.cliente.nombre || presupuesto.cliente.name || ''
  }

  // Fallback a clienteData
  if (presupuesto.clienteData) {
    return presupuesto.clienteData.nombre || ''
  }

  return ''
}

// Función para normalizar datos antiguos del localStorage
const normalizarPresupuesto = (presupuesto) => {
  if (!presupuesto) return presupuesto

  // Si cliente es un objeto, convertirlo a string y preservar en clienteData
  if (typeof presupuesto.cliente === 'object' && presupuesto.cliente !== null) {
    const clienteNombre = presupuesto.cliente.nombre || presupuesto.cliente.name || ''
    return {
      ...presupuesto,
      cliente: clienteNombre,
      clienteData: {
        nombre: clienteNombre,
        ruc: presupuesto.cliente.ruc || '',
        email: presupuesto.cliente.email || '',
        telefono: presupuesto.cliente.telefono || ''
      }
    }
  }

  // Si cliente es string pero no hay clienteData, crear uno básico
  if (typeof presupuesto.cliente === 'string' && !presupuesto.clienteData) {
    return {
      ...presupuesto,
      clienteData: {
        nombre: presupuesto.cliente
      }
    }
  }

  return presupuesto
}

// Función de limpieza de emergencia para datos corruptos
export const limpiarDatosCorruptos = () => {
  try {
    const storageKey = 'presupuestos-storage'
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed?.state?.presupuestos) {
        // Normalizar todos los presupuestos
        parsed.state.presupuestos = parsed.state.presupuestos.map(normalizarPresupuesto)
        parsed.state._version = SCHEMA_VERSION
        localStorage.setItem(storageKey, JSON.stringify(parsed))
        return true
      }
    }
  } catch (error) {
    console.error('❌ Error al normalizar datos:', error)
    // En caso de error, limpiar completamente
    localStorage.removeItem('presupuestos-storage')
    console.log('🗑️ LocalStorage de presupuestos limpiado')
    return false
  }
}

const usePresupuestosStore = create(
  persist(
    (set, get) => ({
      presupuestos: [],
      presupuestoActual: null,
      isLoading: false,
      filtros: {
        estado: 'todos',
        cliente: '',
        fechaInicio: null,
        fechaFin: null,
        busqueda: ''
      },

      // Obtener todos los presupuestos
      fetchPresupuestos: async (filters = {}) => {
        set({ isLoading: true })
        try {
          const params = new URLSearchParams()
          if (filters.status) params.append('status', filters.status)
          if (filters.search) params.append('search', filters.search)

          const url = `${API_ENDPOINTS.QUOTATIONS}${params.toString() ? '?' + params.toString() : ''}`
          const backendPresupuestos = await api.get(url)

          const presupuestos = backendPresupuestos.map(transformBackendToFrontend)

          set({ presupuestos, isLoading: false })
          return presupuestos
        } catch (error) {
          set({ isLoading: false })
          console.error('Error fetching presupuestos:', error)
          throw error
        }
      },

      // Crear nuevo presupuesto
      createPresupuesto: async (data) => {
        set({ isLoading: true })
        try {
          const backendData = transformFrontendToBackend(data)
          const response = await api.post(API_ENDPOINTS.QUOTATIONS, backendData)
          const createdPresupuesto = transformBackendToFrontend(response.data)

          await get().fetchPresupuestos()

          set({ isLoading: false })
          return createdPresupuesto
        } catch (error) {
          set({ isLoading: false })
          console.error('Error creating presupuesto:', error)
          throw error
        }
      },

      // Actualizar presupuesto
      updatePresupuesto: async (id, updates) => {
        set({ isLoading: true })
        try {
          const backendUpdates = transformFrontendToBackend(updates)

          // Filtrar campos que no deben enviarse al backend
          // Solo enviar campos que el usuario realmente quiere actualizar
          Object.keys(backendUpdates).forEach(key => {
            const value = backendUpdates[key]
            // Eliminar undefined y null
            if (value === undefined || value === null) {
              delete backendUpdates[key]
              return
            }
            // Eliminar arrays vacíos (como items: [])
            if (Array.isArray(value) && value.length === 0) {
              delete backendUpdates[key]
              return
            }
            // Eliminar objetos con todas las propiedades undefined (como client: { nombre: undefined })
            if (typeof value === 'object' && !Array.isArray(value)) {
              const allUndefined = Object.values(value).every(v => v === undefined)
              if (allUndefined) {
                delete backendUpdates[key]
                return
              }
            }
            // Solo eliminar 0/false si el campo NO fue explícitamente pasado en updates
            // Esto permite actualizar a 0 cuando es intencional
            const frontendKey = {
              profit_margin: 'margenGanancia',
              has_prices_assigned: 'tienePreciosAsignados',
              subtotal: 'subtotal',
              tax: 'igv',
              total: 'total'
            }[key]
            if (frontendKey && !(frontendKey in updates)) {
              if (value === 0 || value === false) {
                delete backendUpdates[key]
              }
            }
          })

          const response = await api.put(API_ENDPOINTS.QUOTATION_BY_ID(id), backendUpdates)
          const updatedPresupuesto = transformBackendToFrontend(response.data)

          await get().fetchPresupuestos()

          set({ isLoading: false })
          return updatedPresupuesto
        } catch (error) {
          set({ isLoading: false })
          console.error('Error updating presupuesto:', error)
          throw error
        }
      },

      // Eliminar presupuesto
      deletePresupuesto: async (id) => {
        set({ isLoading: true })
        try {
          await api.delete(API_ENDPOINTS.QUOTATION_BY_ID(id))

          await get().fetchPresupuestos()

          set({ isLoading: false })
        } catch (error) {
          set({ isLoading: false })
          console.error('Error deleting presupuesto:', error)
          throw error
        }
      },

      // Obtener presupuesto por ID
      fetchPresupuestoById: async (id) => {
        set({ isLoading: true })
        try {
          const backendPresupuesto = await api.get(API_ENDPOINTS.QUOTATION_BY_ID(id))
          const presupuesto = transformBackendToFrontend(backendPresupuesto)
          set({ presupuestoActual: presupuesto, isLoading: false })
          return presupuesto
        } catch (error) {
          set({ isLoading: false })
          console.error('Error fetching presupuesto by ID:', error)
          throw error
        }
      },

      // Obtener presupuesto por ID desde store local
      getPresupuestoById: (id) => {
        const presupuestos = get().presupuestos
        // Intentar encontrar por comparación estricta primero
        let found = presupuestos.find(p => p.id === id)
        // Si no se encuentra, intentar con conversión de tipos
        if (!found) {
          found = presupuestos.find(p => String(p.id) === String(id))
        }
        return found
      },

      // Aprobar presupuesto
      aprobarPresupuesto: async (id, aprobadoPor) => {
        const updates = {
          estado: 'approved',
          aprobadoPor: aprobadoPor,
          fechaAprobacion: getCurrentTimestamp()
        }
        return await get().updatePresupuesto(id, updates)
      },

      // Rechazar presupuesto
      rechazarPresupuesto: async (id, motivoRechazo) => {
        const updates = {
          estado: 'rejected',
          motivoRechazo: motivoRechazo,
          fechaRechazo: getCurrentTimestamp()
        }
        return await get().updatePresupuesto(id, updates)
      },

      // Generar orden desde presupuesto
      generarOrden: async (presupuestoId) => {
        const updates = {
          ordenGenerada: true
        }
        return await get().updatePresupuesto(presupuestoId, updates)
      },

      // Agregar precios al presupuesto (actualiza cotización + items)
      agregarPrecios: async (id, items, margenGanancia, configuracion = {}) => {
        set({ isLoading: true })
        try {
          // Calcular subtotal de items
          const subtotalItems = items.reduce((sum, item) => sum + (item.subtotal || 0), 0)
          // Aplicar margen de ganancia
          const margenAmount = subtotalItems * ((margenGanancia || 0) / 100)
          const subtotal = subtotalItems + margenAmount
          // Calcular IGV sobre el subtotal con margen
          const igv = subtotal * 0.18
          const total = subtotal + igv

          // Transformar items al formato backend
          const backendItems = items.map(item => ({
            id: item.id, // Importante: mantener el ID para actualizar items existentes
            item_type: item.tipo || item.item_type,
            description: item.descripcion || item.description,
            code: item.codigo || item.code,
            quantity: item.cantidad || item.quantity || 0,
            unit: item.unidad || item.unit,
            unit_price: item.precioUnitario || item.unit_price || 0,
            subtotal: item.subtotal || 0,
            material_description: item.descripcionMateriales || item.material_description,
            labor_description: item.manoObra || item.labor_description,
            equipment_service: item.equiposServicio || item.equipment_service,
            contractor_deliverables: item.entregablesContratista || item.contractor_deliverables
          }))

          // Calcular nueva fecha de vencimiento si se proporciona validezDias
          let expirationDate = null
          if (configuracion.validezDias) {
            const fechaHoy = new Date()
            const fechaVencimiento = new Date(fechaHoy)
            fechaVencimiento.setDate(fechaVencimiento.getDate() + configuracion.validezDias)
            expirationDate = fechaVencimiento.toISOString().split('T')[0]
          }

          const payload = {
            has_prices_assigned: true,
            subtotal: subtotal,
            tax: igv,
            total: total,
            profit_margin: margenGanancia || 0,
            items: backendItems,
            // Campos de configuración opcionales
            ...(configuracion.validezDias && { validity_days: configuracion.validezDias }),
            ...(expirationDate && { expiration_date: expirationDate }),
            ...(configuracion.condicionesPago && { payment_conditions: configuracion.condicionesPago }),
            ...(configuracion.observaciones !== undefined && { observations: configuracion.observaciones })
          }

          const response = await api.put(API_ENDPOINTS.QUOTATION_BY_ID(id), payload)
          const updatedPresupuesto = transformBackendToFrontend(response.data)

          await get().fetchPresupuestos()

          set({ isLoading: false })
          return updatedPresupuesto
        } catch (error) {
          set({ isLoading: false })
          console.error('Error en agregarPrecios:', error)
          throw error
        }
      },

      // Crear presupuesto desde visita técnica
      createPresupuestoDesdeVisita: async (datosVisita) => {
        const presupuestoData = {
          cliente: datosVisita.cliente,
          fechaCotizacion: getToday(),
          fechaVencimiento: toDateOnly(addDays(new Date(), datosVisita.validezDias || 30)),
          validezDias: datosVisita.validezDias || 30,
          condicionesPago: datosVisita.condicionesPago || 'A definir',
          observaciones: datosVisita.observaciones,
          elaboradoPor: datosVisita.elaboradoPor || 'Sistema',
          visitaTecnicaId: datosVisita.visitaId,
          tienePreciosAsignados: false,
          estado: 'pending'
        }

        return await get().createPresupuesto(presupuestoData)
      },

      // Filtrar presupuestos
      getPresupuestosFiltrados: () => {
        const { presupuestos, filtros } = get()
        let presupuestosFiltrados = [...presupuestos]

        if (filtros.estado !== 'todos') {
          presupuestosFiltrados = presupuestosFiltrados.filter(p => p.estado === filtros.estado)
        }

        if (filtros.cliente) {
          const clienteSearch = filtros.cliente.toLowerCase()
          presupuestosFiltrados = presupuestosFiltrados.filter(p =>
            p.cliente?.toLowerCase().includes(clienteSearch)
          )
        }

        if (filtros.fechaInicio) {
          presupuestosFiltrados = presupuestosFiltrados.filter(p =>
            p.fechaCotizacion >= filtros.fechaInicio
          )
        }

        if (filtros.fechaFin) {
          presupuestosFiltrados = presupuestosFiltrados.filter(p =>
            p.fechaCotizacion <= filtros.fechaFin
          )
        }

        if (filtros.busqueda) {
          const busqueda = filtros.busqueda.toLowerCase()
          presupuestosFiltrados = presupuestosFiltrados.filter(p =>
            p.numero?.toLowerCase().includes(busqueda) ||
            p.cliente?.toLowerCase().includes(busqueda)
          )
        }

        return presupuestosFiltrados
      },

      // Actualizar filtros
      setFiltros: (nuevosFiltros) => {
        set(state => ({
          filtros: { ...state.filtros, ...nuevosFiltros }
        }))
      },

      // Limpiar filtros
      limpiarFiltros: () => {
        set({
          filtros: {
            estado: 'todos',
            cliente: '',
            fechaInicio: null,
            fechaFin: null,
            busqueda: ''
          }
        })
      },

      // Obtener estadísticas de presupuestos
      getEstadisticas: () => {
        const presupuestos = get().presupuestos || []
        const total = presupuestos.length
        const aprobados = presupuestos.filter(p => p.estado === 'aprobado').length
        const pendientesList = presupuestos.filter(p => p.estado === 'pendiente')
        const pendientesSinPrecios = pendientesList.filter(p => !p.tienePreciosAsignados).length

        // Calcular montos
        const montoTotal = presupuestos.reduce((sum, p) => sum + (p.total || 0), 0)
        const montoAprobado = presupuestos
          .filter(p => p.estado === 'aprobado')
          .reduce((sum, p) => sum + (p.total || 0), 0)

        return {
          total,
          pendientes: pendientesList.length,
          pendientesSinPrecios,
          aprobados,
          rechazados: presupuestos.filter(p => p.estado === 'rechazado').length,
          conPrecios: presupuestos.filter(p => p.tienePreciosAsignados).length,
          sinPrecios: presupuestos.filter(p => !p.tienePreciosAsignados).length,
          montoTotal,
          montoAprobado,
          tasaConversion: total > 0 ? (aprobados / total) * 100 : 0
        }
      }
    }),
    {
      name: 'presupuestos-storage',
      version: SCHEMA_VERSION,
      partialize: (state) => ({
        presupuestos: state.presupuestos,
        filtros: state.filtros,
        _version: SCHEMA_VERSION
      }),
      // Migrar datos antiguos cuando se cargan desde localStorage
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Si la versión no coincide o no existe, limpiar y normalizar
          if (!state._version || state._version < SCHEMA_VERSION) {
            if (state.presupuestos && Array.isArray(state.presupuestos)) {
              state.presupuestos = state.presupuestos.map(normalizarPresupuesto)
            }
            state._version = SCHEMA_VERSION
          }
        }
      },
      // Migración automática cuando cambia la versión
      migrate: (persistedState, version) => {
        if (version < SCHEMA_VERSION && persistedState?.presupuestos) {
          return {
            ...persistedState,
            presupuestos: persistedState.presupuestos.map(normalizarPresupuesto),
            _version: SCHEMA_VERSION
          }
        }
        return persistedState
      }
    }
  )
)

export default usePresupuestosStore
