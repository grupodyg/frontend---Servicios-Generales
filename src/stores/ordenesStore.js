import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api, API_ENDPOINTS } from '../config/api'
import { getCurrentTimestamp } from '../utils/dateUtils'

// 🔄 FUNCIONES DE TRANSFORMACIÓN DE DATOS (Backend ↔ Frontend)
const transformBackendToFrontend = (backendOrder) => {
  if (!backendOrder) return null

  return {
    id: backendOrder.id,
    cliente: backendOrder.client,
    clienteId: backendOrder.client_id,
    clienteNombre: backendOrder.client_name,
    tipoServicio: backendOrder.service_type,
    tipoVisita: backendOrder.visit_type,
    visitaTecnicaId: backendOrder.technical_visit_id,
    basadoEnVisitaTecnica: backendOrder.based_on_technical_visit || false,
    descripcion: backendOrder.description,
    ubicacion: backendOrder.location,
    prioridad: backendOrder.priority,
    fechaVencimiento: backendOrder.due_date,
    costoEstimado: parseFloat(backendOrder.estimated_cost) || 0,
    tecnicoAsignado: backendOrder.assigned_technician,
    solicitadoPor: backendOrder.requested_by,
    porcentajeAvance: backendOrder.progress_percentage || 0,
    estadoAprobacion: backendOrder.approval_status,
    fechaEstimacion: backendOrder.estimation_date,
    fechaAprobacion: backendOrder.approval_date,
    aprobadoPor: backendOrder.approved_by,
    fechaRechazo: backendOrder.rejection_date,
    rechazadoPor: backendOrder.rejected_by,
    motivoRechazo: backendOrder.rejection_reason,
    materialesEstimados: backendOrder.estimated_materials || [],
    tiempoEstimado: backendOrder.estimated_time || {},
    herramientasRequeridas: backendOrder.required_tools || [],
    coordenadasGPS: backendOrder.gps_coordinates || { latitud: null, longitud: null },
    nombreProyecto: backendOrder.project_name,
    listaPersonal: backendOrder.personnel_list || [],
    numeroOrdenCompra: backendOrder.purchase_order_number,
    documentoOrdenCompra: backendOrder.purchase_order_document || {},
    primeraVisitaCompletada: backendOrder.first_visit_completed || false,
    fechaPrimeraVisita: backendOrder.first_visit_date,
    fechaReasignacion: backendOrder.reassignment_date,
    reasignadoPor: backendOrder.reassigned_by,
    recursos: backendOrder.resources || {},
    materialesSeleccionados: backendOrder.selected_materials || [],
    herramientasSeleccionadas: backendOrder.selected_tools || [],
    solpe: backendOrder.solpe,
    fechaActualizacionRecursos: backendOrder.resources_update_date,
    estado: backendOrder.status,
    fechaCreacion: backendOrder.date_time_registration,
    fechaModificacion: backendOrder.date_time_modification
  }
}

const transformFrontendToBackend = (frontendOrder) => {
  if (!frontendOrder) return null

  return {
    client: frontendOrder.cliente,
    client_id: frontendOrder.clienteId || null,
    service_type: frontendOrder.tipoServicio,
    visit_type: frontendOrder.tipoVisita || 'sin_visita',
    technical_visit_id: frontendOrder.visitaTecnicaId || null,
    based_on_technical_visit: frontendOrder.basadoEnVisitaTecnica || false,
    description: frontendOrder.descripcion || null,
    location: frontendOrder.ubicacion || null,
    priority: frontendOrder.prioridad || 'media',
    due_date: frontendOrder.fechaVencimiento || null,
    estimated_cost: frontendOrder.costoEstimado || null,
    assigned_technician: frontendOrder.tecnicoAsignado || null,
    requested_by: frontendOrder.solicitadoPor || null,
    progress_percentage: frontendOrder.porcentajeAvance || 0,
    approval_status: frontendOrder.estadoAprobacion || 'unassigned',
    estimation_date: frontendOrder.fechaEstimacion || null,
    approval_date: frontendOrder.fechaAprobacion || null,
    approved_by: frontendOrder.aprobadoPor || null,
    rejection_date: frontendOrder.fechaRechazo || null,
    rejected_by: frontendOrder.rechazadoPor || null,
    rejection_reason: frontendOrder.motivoRechazo || null,
    estimated_materials: frontendOrder.materialesEstimados || null,
    estimated_time: frontendOrder.tiempoEstimado || null,
    required_tools: frontendOrder.herramientasRequeridas || null,
    gps_coordinates: frontendOrder.coordenadasGPS || null,
    project_name: frontendOrder.nombreProyecto || null,
    personnel_list: frontendOrder.listaPersonal || null,
    purchase_order_number: frontendOrder.numeroOrdenCompra || null,
    purchase_order_document: frontendOrder.documentoOrdenCompra || null,
    first_visit_completed: frontendOrder.primeraVisitaCompletada || false,
    first_visit_date: frontendOrder.fechaPrimeraVisita || null,
    reassignment_date: frontendOrder.fechaReasignacion || null,
    reassigned_by: frontendOrder.reasignadoPor || null,
    resources: frontendOrder.recursos || null,
    selected_materials: frontendOrder.materialesSeleccionados || null,
    selected_tools: frontendOrder.herramientasSeleccionadas || null,
    solpe: frontendOrder.solpe || null,
    resources_update_date: frontendOrder.fechaActualizacionRecursos || null,
    status: frontendOrder.estado // No usar valor por defecto - mantener undefined para que COALESCE preserve el valor actual
  }
}

const useOrdenesStore = create(
  persist(
    (set, get) => ({
      ordenes: [],
      ordenActual: null,
      isLoading: false,
      filtros: {
        estado: 'todos',
        tipo: 'todos',
        tipoVisita: 'todos',
        tecnico: 'todos',
        cliente: '',
        fechaInicio: null,
        fechaFin: null,
        busqueda: '',
        estadoAprobacion: 'todos',
        prioridad: 'todos'
      },

      // Obtener todas las órdenes
      fetchOrdenes: async (filters = {}) => {
        set({ isLoading: true })
        try {
          const params = new URLSearchParams()
          if (filters.status) params.append('status', filters.status)
          if (filters.approval_status) params.append('approval_status', filters.approval_status)
          if (filters.assigned_technician) params.append('assigned_technician', filters.assigned_technician)
          if (filters.client_id) params.append('client_id', filters.client_id)
          if (filters.priority) params.append('priority', filters.priority)
          if (filters.search) params.append('search', filters.search)

          const url = `${API_ENDPOINTS.WORK_ORDERS}${params.toString() ? '?' + params.toString() : ''}`
          const backendOrdenes = await api.get(url)

          const ordenes = backendOrdenes.map(transformBackendToFrontend)

          set({ ordenes, isLoading: false })
          return ordenes
        } catch (error) {
          set({ isLoading: false })
          console.error('Error fetching órdenes:', error)
          throw error
        }
      },

      // Obtener siguiente ID disponible
      fetchNextId: async () => {
        try {
          const response = await api.get(API_ENDPOINTS.WORK_ORDER_NEXT_ID)
          return response.next_id
        } catch (error) {
          console.error('Error fetching next ID:', error)
          throw error
        }
      },

      // Crear nueva orden
      createOrden: async (ordenData) => {
        set({ isLoading: true })
        try {
          const backendData = transformFrontendToBackend(ordenData)
          const response = await api.post(API_ENDPOINTS.WORK_ORDERS, backendData)
          const createdOrden = transformBackendToFrontend(response.data)

          await get().fetchOrdenes()

          set({ isLoading: false })
          return createdOrden
        } catch (error) {
          set({ isLoading: false })
          console.error('Error creating orden:', error)
          throw error
        }
      },

      // Actualizar orden
      updateOrden: async (id, updates) => {
        set({ isLoading: true })
        try {
          const backendUpdates = transformFrontendToBackend(updates)

          Object.keys(backendUpdates).forEach(key =>
            (backendUpdates[key] === undefined || backendUpdates[key] === null) && delete backendUpdates[key]
          )

          const response = await api.put(API_ENDPOINTS.WORK_ORDER_BY_ID(id), backendUpdates)
          const updatedOrden = transformBackendToFrontend(response.data)

          await get().fetchOrdenes()

          set({ isLoading: false })
          return updatedOrden
        } catch (error) {
          set({ isLoading: false })
          console.error('Error updating orden:', error)
          throw error
        }
      },

      // Verificar si se puede eliminar una orden (dependencias)
      checkCanDeleteOrden: async (id) => {
        try {
          const response = await api.get(`${API_ENDPOINTS.WORK_ORDER_BY_ID(id)}/can-delete`)
          return response.data
        } catch (error) {
          console.error('Error checking orden dependencies:', error)
          throw error
        }
      },

      // Eliminar orden (solo administradores)
      deleteOrden: async (id, reason) => {
        set({ isLoading: true })
        try {
          const response = await api.delete(API_ENDPOINTS.WORK_ORDER_BY_ID(id), {
            data: { reason }
          })

          await get().fetchOrdenes()

          set({ isLoading: false })
          return response.data
        } catch (error) {
          set({ isLoading: false })
          console.error('Error deleting orden:', error)
          throw error
        }
      },

      // Obtener orden por ID
      fetchOrdenById: async (id) => {
        set({ isLoading: true })
        try {
          const backendOrden = await api.get(API_ENDPOINTS.WORK_ORDER_BY_ID(id))
          const orden = transformBackendToFrontend(backendOrden)
          set({ ordenActual: orden, isLoading: false })
          return orden
        } catch (error) {
          set({ isLoading: false })
          console.error('Error fetching orden by ID:', error)
          throw error
        }
      },

      // Obtener orden por ID desde store local
      getOrdenById: (id) => {
        return get().ordenes.find(o => o.id === id)
      },

      // Reasignar orden
      reasignarOrden: async (ordenId, nuevoTecnico, reasignadoPor) => {
        const updates = {
          tecnicoAsignado: nuevoTecnico,
          reasignadoPor: reasignadoPor,
          fechaReasignacion: getCurrentTimestamp()
        }
        return await get().updateOrden(ordenId, updates)
      },

      // Actualizar progreso
      actualizarProgreso: async (ordenId, progreso) => {
        const updates = {
          porcentajeAvance: progreso
        }
        return await get().updateOrden(ordenId, updates)
      },

      // Aprobar orden
      aprobarOrden: async (ordenId, aprobadoPor) => {
        const updates = {
          estadoAprobacion: 'approved',
          aprobadoPor: aprobadoPor,
          fechaAprobacion: getCurrentTimestamp()
        }
        return await get().updateOrden(ordenId, updates)
      },

      // Rechazar orden
      rechazarOrden: async (ordenId, rechazadoPor, motivoRechazo) => {
        const updates = {
          estadoAprobacion: 'rejected',
          rechazadoPor: rechazadoPor,
          motivoRechazo: motivoRechazo,
          fechaRechazo: getCurrentTimestamp()
        }
        return await get().updateOrden(ordenId, updates)
      },

      // Cambiar estado de orden
      cambiarEstado: async (ordenId, nuevoEstado) => {
        const updates = {
          estado: nuevoEstado
        }
        return await get().updateOrden(ordenId, updates)
      },

      // Completar primera visita
      completarPrimeraVisita: async (ordenId) => {
        const updates = {
          primeraVisitaCompletada: true,
          fechaPrimeraVisita: getCurrentTimestamp()
        }
        return await get().updateOrden(ordenId, updates)
      },

      // Actualizar recursos
      actualizarRecursos: async (ordenId, recursos) => {
        const updates = {
          recursos: recursos,
          fechaActualizacionRecursos: getCurrentTimestamp()
        }
        return await get().updateOrden(ordenId, updates)
      },

      // Filtrar órdenes
      getOrdenesFiltradas: () => {
        const { ordenes, filtros } = get()
        let ordenesFiltradas = [...ordenes]

        if (filtros.estado !== 'todos') {
          ordenesFiltradas = ordenesFiltradas.filter(o => o.estado === filtros.estado)
        }

        if (filtros.estadoAprobacion !== 'todos') {
          ordenesFiltradas = ordenesFiltradas.filter(o => o.estadoAprobacion === filtros.estadoAprobacion)
        }

        if (filtros.prioridad !== 'todos') {
          ordenesFiltradas = ordenesFiltradas.filter(o => o.prioridad === filtros.prioridad)
        }

        if (filtros.tipo !== 'todos') {
          ordenesFiltradas = ordenesFiltradas.filter(o => o.tipoServicio === filtros.tipo)
        }

        if (filtros.tipoVisita !== 'todos') {
          ordenesFiltradas = ordenesFiltradas.filter(o => o.tipoVisita === filtros.tipoVisita)
        }

        if (filtros.tecnico !== 'todos') {
          ordenesFiltradas = ordenesFiltradas.filter(o => o.tecnicoAsignado === filtros.tecnico)
        }

        if (filtros.cliente) {
          const clienteSearch = filtros.cliente.toLowerCase()
          ordenesFiltradas = ordenesFiltradas.filter(o =>
            o.cliente?.toLowerCase().includes(clienteSearch)
          )
        }

        if (filtros.busqueda) {
          const busqueda = filtros.busqueda.toLowerCase()
          ordenesFiltradas = ordenesFiltradas.filter(o =>
            o.id?.toLowerCase().includes(busqueda) ||
            o.cliente?.toLowerCase().includes(busqueda) ||
            o.nombreProyecto?.toLowerCase().includes(busqueda)
          )
        }

        return ordenesFiltradas
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
            tipo: 'todos',
            tipoVisita: 'todos',
            tecnico: 'todos',
            cliente: '',
            fechaInicio: null,
            fechaFin: null,
            busqueda: '',
            estadoAprobacion: 'todos',
            prioridad: 'todos'
          }
        })
      },

      // Validar si puede subir fotos
      puedeSubirFotos: (orden) => {
        if (!orden) {
          return { permitido: false, motivo: 'Orden no válida' }
        }

        // Si la orden tiene visita técnica, debe completar la primera visita
        if (orden.tipoVisita === 'con_visita' && !orden.primeraVisitaCompletada) {
          return {
            permitido: false,
            motivo: 'Debe completar la primera visita técnica antes de subir fotos'
          }
        }

        // Si la orden está completada, no se pueden subir más fotos
        if (orden.estado === 'completed') {
          return {
            permitido: false,
            motivo: 'La orden ya está completada'
          }
        }

        return { permitido: true, motivo: '' }
      },

      // Marcar primera visita como completada
      marcarPrimeraVisita: async (ordenId) => {
        return await get().completarPrimeraVisita(ordenId)
      },

      // Obtener historial de una orden
      fetchHistorial: async (ordenId) => {
        try {
          const historial = await api.get(API_ENDPOINTS.WORK_ORDER_HISTORY(ordenId))
          return historial || []
        } catch (error) {
          console.error('Error al obtener historial de la orden:', error)
          throw error
        }
      }
    }),
    {
      name: 'ordenes-storage',
      partialize: (state) => ({
        ordenes: state.ordenes,
        filtros: state.filtros
      })
    }
  )
)

export default useOrdenesStore
