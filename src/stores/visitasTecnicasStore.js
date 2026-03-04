import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api, API_ENDPOINTS } from '../config/api'
import { normalizarEstado, normalizarEstadoBackendAFrontend, normalizarEstadoFrontendABackend, estadoABackend, VISITA_ESTADOS } from '../constants/visitasTecnicasConstants'
import { validarTransicion, validarReglaDeNegocio } from '../utils/visitasTecnicasValidations'
import { getCurrentTimestamp, getToday } from '../utils/dateUtils'

// 🔄 FUNCIONES DE TRANSFORMACIÓN DE DATOS (Backend ↔ Frontend)
const transformBackendToFrontend = (backendVisit) => {
  if (!backendVisit) return null

  // Parsear campos JSONB si vienen como string
  const parseJsonField = (field, defaultValue) => {
    if (!field) return defaultValue
    if (typeof field === 'string') {
      try {
        return JSON.parse(field)
      } catch (e) {
        return defaultValue
      }
    }
    return field
  }

  // Normalizar estado
  const estadoNormalizado = normalizarEstadoBackendAFrontend(backendVisit.status)

  return {
    id: backendVisit.id,
    cliente: backendVisit.client,
    clienteId: backendVisit.client_id,
    clienteNombre: backendVisit.client_name,
    direccion: backendVisit.address,
    contacto: backendVisit.contact,
    telefono: backendVisit.phone,
    email: backendVisit.email,
    fechaVisita: backendVisit.visit_date,
    horaVisita: backendVisit.visit_time,
    tipoServicio: backendVisit.service_type,
    descripcionServicio: backendVisit.service_description,
    observaciones: backendVisit.observations,
    tecnicoAsignado: backendVisit.assigned_technician,
    solicitadoPor: backendVisit.requested_by,
    nombreProyecto: backendVisit.project_name,
    coordenadasGPS: parseJsonField(backendVisit.gps_coordinates, { latitud: null, longitud: null }),
    materialesEstimados: parseJsonField(backendVisit.estimated_materials, []),
    herramientasRequeridas: parseJsonField(backendVisit.required_tools, []),
    personalRequerido: parseJsonField(backendVisit.required_personnel, { cantidad: 1, especialidades: [], diasEstimados: 1 }),
    listaPersonal: parseJsonField(backendVisit.personnel_list, []),
    estadoLugar: parseJsonField(backendVisit.place_status, { descripcion: '', fotos: [], observaciones: '' }),
    firmaTecnico: backendVisit.technician_signature,
    fechaCompletado: backendVisit.completed_date,
    fechaRegistroEstadoLugar: backendVisit.place_status_registration_date,
    presupuestoGenerado: backendVisit.generated_quotation,
    fechaGeneracionPresupuesto: backendVisit.quotation_generation_date,
    ordenGenerada: backendVisit.generated_order,
    fechaGeneracionOrden: backendVisit.order_generation_date,
    aprobacion: parseJsonField(backendVisit.approval, null),
    solpe: backendVisit.solpe,
    estado: estadoNormalizado, // Estado ya normalizado de inglés a español
    tecnicosAsignados: (backendVisit.technicians || []).map(tech => ({
      id: tech.technician_id || tech.id, // Usar technician_id (user.id) como ID principal
      nombre: tech.name,
      especialidad: tech.specialty,
      technicianId: tech.technician_id,
      rowId: tech.id, // ID de la fila en technical_visit_technicians (para referencia)
      status: tech.status
    })),
    fechaCreacion: backendVisit.date_time_registration
  }
}

const transformFrontendToBackend = (frontendVisit) => {
  if (!frontendVisit) return null

  // Serializar campos JSONB - PostgreSQL espera objetos, no strings
  const serializeJsonField = (field) => {
    if (!field) return null
    // Si ya es un objeto, retornarlo directamente (PostgreSQL manejará la serialización)
    return field
  }

  const result = {}

  // Solo transformar campos que existen en frontendVisit
  if ('cliente' in frontendVisit) result.client = frontendVisit.cliente
  if ('clienteId' in frontendVisit) result.client_id = frontendVisit.clienteId || null
  if ('direccion' in frontendVisit) result.address = frontendVisit.direccion || null
  if ('contacto' in frontendVisit) result.contact = frontendVisit.contacto || null
  if ('telefono' in frontendVisit) result.phone = frontendVisit.telefono || null
  if ('email' in frontendVisit) result.email = frontendVisit.email || null
  if ('fechaVisita' in frontendVisit) result.visit_date = frontendVisit.fechaVisita || null
  if ('horaVisita' in frontendVisit) result.visit_time = frontendVisit.horaVisita || null
  if ('tipoServicio' in frontendVisit) result.service_type = frontendVisit.tipoServicio || null
  if ('descripcionServicio' in frontendVisit) result.service_description = frontendVisit.descripcionServicio || null
  if ('observaciones' in frontendVisit) result.observations = frontendVisit.observaciones || null
  if ('tecnicoAsignado' in frontendVisit) result.assigned_technician = frontendVisit.tecnicoAsignado || null
  if ('solicitadoPor' in frontendVisit) result.requested_by = frontendVisit.solicitadoPor || null
  if ('nombreProyecto' in frontendVisit) result.project_name = frontendVisit.nombreProyecto || null
  if ('coordenadasGPS' in frontendVisit) result.gps_coordinates = serializeJsonField(frontendVisit.coordenadasGPS)
  if ('materialesEstimados' in frontendVisit) result.estimated_materials = serializeJsonField(frontendVisit.materialesEstimados)
  if ('herramientasRequeridas' in frontendVisit) result.required_tools = serializeJsonField(frontendVisit.herramientasRequeridas)
  if ('personalRequerido' in frontendVisit) result.required_personnel = serializeJsonField(frontendVisit.personalRequerido)
  if ('listaPersonal' in frontendVisit) result.personnel_list = serializeJsonField(frontendVisit.listaPersonal)
  if ('estadoLugar' in frontendVisit) result.place_status = serializeJsonField(frontendVisit.estadoLugar)
  if ('firmaTecnico' in frontendVisit) result.technician_signature = frontendVisit.firmaTecnico || null
  if ('fechaCompletado' in frontendVisit) result.completed_date = frontendVisit.fechaCompletado || null
  if ('fechaRegistroEstadoLugar' in frontendVisit) result.place_status_registration_date = frontendVisit.fechaRegistroEstadoLugar || null
  if ('presupuestoGenerado' in frontendVisit) result.generated_quotation = frontendVisit.presupuestoGenerado || null
  if ('fechaGeneracionPresupuesto' in frontendVisit) result.quotation_generation_date = frontendVisit.fechaGeneracionPresupuesto || null
  if ('ordenGenerada' in frontendVisit) result.generated_order = frontendVisit.ordenGenerada || null
  if ('fechaGeneracionOrden' in frontendVisit) result.order_generation_date = frontendVisit.fechaGeneracionOrden || null
  if ('aprobacion' in frontendVisit) result.approval = serializeJsonField(frontendVisit.aprobacion)
  if ('solpe' in frontendVisit) result.solpe = frontendVisit.solpe || null
  if ('estado' in frontendVisit) result.status = normalizarEstadoFrontendABackend(frontendVisit.estado) || 'pending' // Traducir estado de español a inglés
  if ('tecnicosAsignados' in frontendVisit) {
    const tecnicos = frontendVisit.tecnicosAsignados || []

    // Para tabla relacional - usar technicianId o id como el user.id del técnico
    result.technicians = tecnicos.map(tech => ({
      id: tech.technicianId || tech.id, // Asegurar que siempre enviamos el user.id correcto
      name: tech.nombre,
      specialty: tech.especialidad
    }))

    // Para campo legacy (concatenación de nombres para assigned_technician)
    if (tecnicos.length > 0) {
      result.assigned_technician = tecnicos
        .map(t => t.nombre || t.name)
        .filter(Boolean)
        .join(', ')
    } else {
      result.assigned_technician = null
    }
  }

  return result
}

const useVisitasTecnicasStore = create(
  persist(
    (set, get) => ({
      visitas: [],
      visitaActual: null,
      isLoading: false,
      filtros: {
        estado: 'todos',
        tecnico: 'todos',
        fechaInicio: null,
        fechaFin: null,
        busqueda: ''
      },

      // Obtener todas las visitas técnicas
      fetchVisitas: async (filters = {}) => {
        set({ isLoading: true })
        try {
          const params = new URLSearchParams()
          if (filters.status) params.append('status', filters.status)
          if (filters.client_id) params.append('client_id', filters.client_id)
          if (filters.assigned_technician) params.append('assigned_technician', filters.assigned_technician)
          if (filters.visit_date_from) params.append('visit_date_from', filters.visit_date_from)
          if (filters.visit_date_to) params.append('visit_date_to', filters.visit_date_to)
          if (filters.search) params.append('search', filters.search)

          // Cache busting para evitar lecturas obsoletas
          params.append('_t', Date.now())

          const url = `${API_ENDPOINTS.TECHNICAL_VISITS}${params.toString() ? '?' + params.toString() : ''}`
          const backendVisitas = await api.get(url)

          const visitas = backendVisitas.map(transformBackendToFrontend)

          set({ visitas, isLoading: false })
          return visitas
        } catch (error) {
          set({ isLoading: false })
          console.error('Error fetching visitas técnicas:', error)
          throw error
        }
      },

      // Obtener siguiente ID disponible
      fetchNextId: async () => {
        try {
          const response = await api.get(API_ENDPOINTS.TECHNICAL_VISIT_NEXT_ID)
          return response.next_id
        } catch (error) {
          console.error('Error fetching next ID:', error)
          throw error
        }
      },

      // Crear nueva visita técnica
      createVisitaTecnica: async (visitaData) => {
        set({ isLoading: true })
        try {
          // Calcular estado inicial automáticamente
          const tieneTecnicosAsignados = visitaData.tecnicosAsignados && visitaData.tecnicosAsignados.length > 0
          const estadoInicial = tieneTecnicosAsignados ? VISITA_ESTADOS.ASSIGNED : VISITA_ESTADOS.PENDING

          const visitaConEstado = {
            ...visitaData,
            estado: estadoInicial
          }

          const backendData = transformFrontendToBackend(visitaConEstado)
          const response = await api.post(API_ENDPOINTS.TECHNICAL_VISITS, backendData)
          const createdVisita = transformBackendToFrontend(response.data)

          await get().fetchVisitas()

          set({ isLoading: false })
          return createdVisita
        } catch (error) {
          set({ isLoading: false })
          console.error('Error creating visita técnica:', error)
          throw error
        }
      },

      // Actualizar visita técnica
      updateVisitaTecnica: async (id, updates) => {
        set({ isLoading: true })
        try {
          // Si se está actualizando el estado, validar la transición
          if ('estado' in updates) {
            const visitaActual = get().visitas.find(v => v.id === id)
            if (visitaActual) {
              const estadoActual = visitaActual.estado
              const estadoNuevo = updates.estado

              // Validar transición
              const transicionValida = validarTransicion(estadoActual, estadoNuevo)
              if (!transicionValida) {
                throw new Error(
                  `Transición de estado no permitida: ${estadoActual} → ${estadoNuevo}`
                )
              }

              // Validar reglas de negocio
              const visitaConCambios = { ...visitaActual, ...updates }
              const validacionNegocio = validarReglaDeNegocio(visitaConCambios, estadoNuevo)
              if (!validacionNegocio.valido) {
                throw new Error(validacionNegocio.mensaje)
              }
            }
          }

          const backendUpdates = transformFrontendToBackend(updates)

          Object.keys(backendUpdates).forEach(key =>
            (backendUpdates[key] === undefined || backendUpdates[key] === null) && delete backendUpdates[key]
          )

          const response = await api.put(API_ENDPOINTS.TECHNICAL_VISIT_BY_ID(id), backendUpdates)

          console.log('📦 Response from backend:', response)
          console.log('📦 response.data:', response.data)
          console.log('📦 response.data.approval:', response.data?.approval)
          console.log('📦 response.data.status:', response.data?.status)

          const updatedVisita = transformBackendToFrontend(response.data)

          console.log('🔄 Transformed visita:', updatedVisita)
          console.log('🔄 updatedVisita.aprobacion:', updatedVisita?.aprobacion)
          console.log('🔄 updatedVisita.estado:', updatedVisita?.estado)

          await get().fetchVisitas()

          set({ isLoading: false })
          return updatedVisita
        } catch (error) {
          set({ isLoading: false })
          console.error('Error updating visita técnica:', error)
          throw error
        }
      },

      // Verificar si se puede eliminar una visita técnica (dependencias)
      checkCanDeleteVisita: async (id) => {
        try {
          const response = await api.get(`${API_ENDPOINTS.TECHNICAL_VISIT_BY_ID(id)}/can-delete`)
          return response.data
        } catch (error) {
          console.error('Error checking visita técnica dependencies:', error)
          throw error
        }
      },

      // Eliminar visita técnica (solo administradores)
      deleteVisitaTecnica: async (id, reason) => {
        set({ isLoading: true })
        try {
          const response = await api.delete(API_ENDPOINTS.TECHNICAL_VISIT_BY_ID(id), {
            data: { reason }
          })

          await get().fetchVisitas()

          set({ isLoading: false })
          return response.data
        } catch (error) {
          set({ isLoading: false })
          console.error('Error deleting visita técnica:', error)
          throw error
        }
      },

      // Obtener visita por ID
      fetchVisitaById: async (id) => {
        set({ isLoading: true })
        try {
          const backendVisita = await api.get(API_ENDPOINTS.TECHNICAL_VISIT_BY_ID(id))
          const visita = transformBackendToFrontend(backendVisita)
          set({ visitaActual: visita, isLoading: false })
          return visita
        } catch (error) {
          set({ isLoading: false })
          console.error('Error fetching visita by ID:', error)
          throw error
        }
      },

      // Obtener visita por ID desde store local
      getVisitaById: (id) => {
        return get().visitas.find(v => v.id === id)
      },

      // Filtrar visitas
      getVisitasFiltradas: () => {
        const { visitas, filtros } = get()
        let visitasFiltradas = [...visitas]

        if (filtros.estado !== 'todos') {
          visitasFiltradas = visitasFiltradas.filter(v => v.estado === filtros.estado)
        }

        if (filtros.tecnico !== 'todos') {
          visitasFiltradas = visitasFiltradas.filter(v => v.tecnicoAsignado === filtros.tecnico)
        }

        if (filtros.fechaInicio) {
          visitasFiltradas = visitasFiltradas.filter(v => v.fechaVisita >= filtros.fechaInicio)
        }

        if (filtros.fechaFin) {
          visitasFiltradas = visitasFiltradas.filter(v => v.fechaVisita <= filtros.fechaFin)
        }

        if (filtros.busqueda) {
          const busqueda = filtros.busqueda.toLowerCase()
          visitasFiltradas = visitasFiltradas.filter(v =>
            v.cliente?.toLowerCase().includes(busqueda) ||
            v.nombreProyecto?.toLowerCase().includes(busqueda) ||
            v.id?.toLowerCase().includes(busqueda)
          )
        }

        return visitasFiltradas
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
            tecnico: 'todos',
            fechaInicio: null,
            fechaFin: null,
            busqueda: ''
          }
        })
      },

      // Completar visita
      completarVisita: async (id, datosCompletado) => {
        const updates = {
          ...datosCompletado,
          estado: VISITA_ESTADOS.COMPLETED,  // Usar constante en lugar de string literal
          fechaCompletado: getCurrentTimestamp()
        }
        return await get().updateVisitaTecnica(id, updates)
      },

      // Generar presupuesto desde visita
      generarPresupuesto: async (visitaId) => {
        const updates = {
          presupuestoGenerado: true,
          fechaGeneracionPresupuesto: getCurrentTimestamp()
        }
        return await get().updateVisitaTecnica(visitaId, updates)
      },

      // Generar orden desde visita
      generarOrden: async (visitaId) => {
        const updates = {
          ordenGenerada: true,
          fechaGeneracionOrden: getCurrentTimestamp()
        }
        return await get().updateVisitaTecnica(visitaId, updates)
      },

      // Marcar visita como usada para generar orden de trabajo
      marcarVisitaComoUsada: async (visitaId, ordenId) => {
        const updates = {
          ordenGenerada: ordenId,
          fechaGeneracionOrden: getCurrentTimestamp()
        }
        return await get().updateVisitaTecnica(visitaId, updates)
      },

      // Aceptar visita técnica (Admin/Supervisor)
      aceptarVisitaTecnica: async (visitaId, ordenCompra, userName) => {
        set({ isLoading: true })
        try {
          const updates = {
            aprobacion: {
              tipo: 'aceptada',
              ordenCompra: ordenCompra,
              aprobadoPor: userName,
              fecha: getCurrentTimestamp()
            },
            estado: VISITA_ESTADOS.APPROVED  // Cambiar estado automáticamente a 'aprobado'
          }

          const response = await get().updateVisitaTecnica(visitaId, updates)
          await get().fetchVisitas()

          set({ isLoading: false })
          return response
        } catch (error) {
          set({ isLoading: false })
          console.error('Error al aceptar visita:', error)
          throw error
        }
      },

      // Rechazar visita técnica (Admin/Supervisor)
      rechazarVisitaTecnica: async (visitaId, motivo, userName) => {
        set({ isLoading: true })
        try {
          const updates = {
            aprobacion: {
              tipo: 'rechazada',
              motivo: motivo,
              rechazadoPor: userName,
              fecha: getCurrentTimestamp()
            },
            estado: VISITA_ESTADOS.REJECTED  // Cambiar estado automáticamente a 'rechazado'
          }

          const response = await get().updateVisitaTecnica(visitaId, updates)
          await get().fetchVisitas()

          set({ isLoading: false })
          return response
        } catch (error) {
          set({ isLoading: false })
          console.error('Error al rechazar visita:', error)
          throw error
        }
      },

      // ========================================
      // FUNCIONES DE UPLOAD DE FOTOS
      // ========================================

      // Subir múltiples fotos para una visita técnica
      uploadVisitaPhotos: async (visitaId, files) => {
        try {
          const formData = new FormData()
          files.forEach((file) => {
            formData.append('photos', file)
          })

          const response = await api.upload(
            API_ENDPOINTS.TECHNICAL_VISIT_PHOTOS(visitaId),
            formData
          )

          console.log('✅ Fotos subidas:', response.data)
          return response.data // Array de fotos con URLs del servidor
        } catch (error) {
          console.error('Error al subir fotos:', error)
          throw error
        }
      },

      // Subir una sola foto
      uploadVisitaPhoto: async (visitaId, file) => {
        try {
          const formData = new FormData()
          formData.append('photo', file)

          const response = await api.upload(
            API_ENDPOINTS.TECHNICAL_VISIT_PHOTO(visitaId),
            formData
          )

          console.log('✅ Foto subida:', response.data)
          return response.data // Objeto de foto con URL del servidor
        } catch (error) {
          console.error('Error al subir foto:', error)
          throw error
        }
      },

      // Eliminar una foto del servidor
      deleteVisitaPhoto: async (visitaId, filename) => {
        try {
          await api.delete(API_ENDPOINTS.TECHNICAL_VISIT_PHOTO_DELETE(visitaId, filename))
          console.log('🗑️ Foto eliminada:', filename)
          return true
        } catch (error) {
          console.error('Error al eliminar foto:', error)
          throw error
        }
      },

      // Obtener fotos de una visita desde el servidor
      getVisitaPhotos: async (visitaId) => {
        try {
          const response = await api.get(API_ENDPOINTS.TECHNICAL_VISIT_PHOTOS(visitaId))
          return response.data || []
        } catch (error) {
          console.error('Error al obtener fotos:', error)
          return []
        }
      }
    }),
    {
      name: 'visitas-tecnicas-storage',
      partialize: (state) => ({
        visitas: state.visitas,
        filtros: state.filtros
      })
    }
  )
)

export default useVisitasTecnicasStore
