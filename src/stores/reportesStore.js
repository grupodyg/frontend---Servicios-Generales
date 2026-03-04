import { create } from 'zustand'
import { api, API_ENDPOINTS, getAuthToken } from '../config/api'
import { getCurrentTimestamp, getToday } from '../utils/dateUtils'

const useReportesStore = create((set, get) => ({
  reportes: {}, // { ordenId: [reportes] }
  todosReportesTecnico: [], // Todos los reportes del técnico logueado
  reporteActual: null,
  isLoading: false,

  // Helper para obtener reportes de manera segura
  getReportesByOrdenId: (ordenId) => {
    const { reportes } = get()
    return Array.isArray(reportes[ordenId]) ? reportes[ordenId] : []
  },

  // Helper para normalizar documentos (JSONB) a estructura frontend
  normalizeDocument: (doc) => {
    if (!doc) return null

    // Si es string, intentar parsear
    if (typeof doc === 'string') {
      try {
        doc = JSON.parse(doc)
      } catch (e) {
        console.error('Error parseando documento:', e)
        return null
      }
    }

    // Normalizar propiedades: name -> nombre, uploadedAt -> fecha
    return {
      url: doc.url,
      nombre: doc.name || doc.nombre,
      fecha: doc.uploadedAt || doc.fecha,
      size: doc.size,
      type: doc.type
    }
  },

  // Helper para normalizar campos del backend (snake_case) a frontend (camelCase)
  normalizeReporteFromBackend: (reporte) => {
    // Normalizar fotos del backend
    let fotosAntes = []
    let fotosDespues = []

    if (Array.isArray(reporte.photos) && reporte.photos.length > 0) {
      // Normalizar fotos ANTES - soportar todos los posibles nombres de campos
      fotosAntes = reporte.photos.filter(p =>
        p.photo_type === 'before' ||
        p.type === 'before' ||
        p.type === 'antes'
      ).map(p => ({
        id: p.id,
        url: p.url || p.photo_url,
        nombre: p.name || p.nombre || p.photo_name || 'Foto',
        tipo: 'antes'
      }))

      // Normalizar fotos DESPUÉS - soportar todos los posibles nombres de campos
      fotosDespues = reporte.photos.filter(p =>
        p.photo_type === 'after' ||
        p.type === 'after' ||
        p.type === 'despues'
      ).map(p => ({
        id: p.id,
        url: p.url || p.photo_url,
        nombre: p.name || p.nombre || p.photo_name || 'Foto',
        tipo: 'despues'
      }))
    }

    // Normalizar materiales
    const materialesUtilizados = Array.isArray(reporte.materials)
      ? reporte.materials.map(m => ({
          nombre: m.material_name || m.nombre || m.name,
          cantidad: m.quantity || m.cantidad || 1,
          unidad: m.unit || m.unidad || 'unidad'
        }))
      : []

    const normalized = {
      // Mantener campos originales por compatibilidad
      ...reporte,
      // Mapear campos del backend a formato frontend
      id: reporte.id,
      ordenId: reporte.order_id || reporte.ordenId,
      instalacionId: reporte.installation_id || reporte.instalacionId,
      tipoReporte: reporte.report_type || reporte.tipoReporte,
      tecnico: reporte.technician || reporte.tecnico || 'Sin asignar',
      fecha: reporte.report_date || reporte.fecha || getToday(),
      horasIniciales: reporte.start_time || reporte.horasIniciales || '08:00',
      horasFinales: reporte.end_time || reporte.horasFinales || '17:00',
      descripcion: reporte.work_description || reporte.descripcion || reporte.descripcionTrabajo || '',
      porcentajeAvance: reporte.progress_percentage ?? reporte.porcentajeAvance ?? 0,
      trabajoEnAltura: reporte.work_at_height ?? reporte.trabajoEnAltura ?? false,
      // Normalizar documentos de seguridad con la estructura correcta (name -> nombre, uploadedAt -> fecha)
      atsDoc: get().normalizeDocument(reporte.ats_document || reporte.atsDocument),
      ptrDoc: get().normalizeDocument(reporte.ptr_document || reporte.ptrDocument),
      aspectosAmbientalesDoc: get().normalizeDocument(reporte.environmental_aspects_document || reporte.aspectosAmbientalesDocument),
      observaciones: reporte.observations || reporte.observaciones || '',
      proximasTareas: reporte.next_tasks || reporte.proximasTareas || '',
      horaCreacion: reporte.creation_time || reporte.horaCreacion,
      estado: reporte.status || reporte.estado || 'active',
      // Fotos normalizadas
      fotosAntes: fotosAntes.length > 0 ? fotosAntes : [],
      fotosDespues: fotosDespues.length > 0 ? fotosDespues : [],
      // Materiales normalizados
      materialesUtilizados: materialesUtilizados
    }

    return normalized
  },

  fetchReportesByOrden: async (ordenId) => {
    set({ isLoading: true })
    try {
      // Optimización: Filtrar en backend en lugar de traer todos los reportes
      const ordenReportesRaw = await api.get(`${API_ENDPOINTS.DAILY_REPORTS}?order_id=${ordenId}`)

      const { normalizeReporteFromBackend } = get()

      const ordenReportes = ordenReportesRaw.map(reporte => {
        const normalized = normalizeReporteFromBackend(reporte)
        return normalized
      })

      set(state => ({
        reportes: {
          ...state.reportes,
          [ordenId]: ordenReportes
        },
        isLoading: false
      }))

      return ordenReportes
    } catch (error) {
      console.error('❌ [reportesStore] Error al obtener reportes:', error)
      set({ isLoading: false })
      throw error
    }
  },

  // Obtener todos los reportes del técnico logueado
  fetchTodosReportesTecnico: async (nombreTecnico) => {
    set({ isLoading: true })
    try {
      // Obtener todos los reportes y filtrar por técnico en el frontend
      // El backend no tiene un endpoint específico para filtrar por técnico
      const todosReportesRaw = await api.get(`${API_ENDPOINTS.DAILY_REPORTS}`)

      const { normalizeReporteFromBackend } = get()

      // Normalizar todos los reportes
      const todosReportesNormalizados = todosReportesRaw.map(reporte => {
        return normalizeReporteFromBackend(reporte)
      })

      // Filtrar solo los reportes del técnico actual
      const reportesTecnico = todosReportesNormalizados.filter(reporte => {
        const tecnicoReporte = reporte.tecnico?.toLowerCase().trim()
        const tecnicoActual = nombreTecnico?.toLowerCase().trim()
        return tecnicoReporte === tecnicoActual
      })

      // Ordenar por fecha descendente (más recientes primero)
      reportesTecnico.sort((a, b) => {
        return new Date(b.fecha) - new Date(a.fecha)
      })

      set({
        todosReportesTecnico: reportesTecnico,
        isLoading: false
      })

      return reportesTecnico
    } catch (error) {
      console.error('❌ [reportesStore] Error al obtener reportes del técnico:', error)
      set({ isLoading: false })
      throw error
    }
  },

  createReporte: async (reporteData) => {
    set({ isLoading: true })
    try {
      // Convertir datos del frontend (camelCase) al formato del backend (snake_case)
      const backendPayload = {
        order_id: reporteData.order_id || reporteData.ordenId,
        installation_id: reporteData.installation_id || reporteData.instalacionId || null,
        report_type: reporteData.tipoReporte || 'daily',
        technician: reporteData.tecnico,
        report_date: reporteData.fecha || getToday(),
        start_time: reporteData.horasIniciales,
        end_time: reporteData.horasFinales,
        work_description: reporteData.descripcion || reporteData.descripcionTrabajo,
        progress_percentage: reporteData.porcentajeAvance || 0,
        work_at_height: reporteData.trabajoEnAltura || false,
        observations: reporteData.observaciones || null,
        next_tasks: reporteData.proximasTareas || null,
        status: reporteData.estado || 'active',
        // OPCIÓN A: Incluir materiales utilizados
        materials: reporteData.materials || []
      }

      const response = await api.post(API_ENDPOINTS.DAILY_REPORTS, backendPayload)

      const { normalizeReporteFromBackend } = get()
      const createdReporte = normalizeReporteFromBackend(response.data || response)

      set(state => {
        const ordenIdKey = reporteData.order_id || reporteData.ordenId
        const ordenReportes = state.reportes[ordenIdKey] || []
        return {
          reportes: {
            ...state.reportes,
            [ordenIdKey]: [...ordenReportes, createdReporte]
          },
          isLoading: false
        }
      })

      return createdReporte
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  // ========================================
  // UPLOAD DE FOTOS DE REPORTES
  // ========================================
  uploadReportPhotos: async (reportId, photos, photoType) => {
    set({ isLoading: true })
    try {
      if (!photos || photos.length === 0) {
        throw new Error('No hay fotos para subir')
      }

      const formData = new FormData()

      // Agregar cada foto al FormData
      photos.forEach((photo, index) => {
        if (!photo.file) {
          throw new Error(`Foto ${index + 1} no tiene File object`)
        }
        formData.append('photos', photo.file, photo.name)
      })

      formData.append('photoType', photoType) // 'before' o 'after'

      const token = getAuthToken()
      const API_BASE_URL = import.meta.env.VITE_API_URL

      if (!API_BASE_URL) {
        throw new Error('VITE_API_URL no está definido en las variables de entorno')
      }

      const response = await fetch(
        `${API_BASE_URL}/api/report-photos/report/${reportId}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
            // NO incluir Content-Type - el navegador lo establece automáticamente para FormData
          },
          body: formData
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const result = await response.json()

      set({ isLoading: false })
      return result.data || result
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  // ========================================
  // UPLOAD DE DOCUMENTOS DE REPORTES
  // ========================================
  uploadReportDocument: async (reportId, documentFile, docType) => {
    set({ isLoading: true })
    try {
      if (!documentFile) {
        throw new Error('No hay documento para subir')
      }

      if (!(documentFile instanceof File)) {
        throw new Error('El documento debe ser un File object')
      }

      const formData = new FormData()
      formData.append('file', documentFile, documentFile.name)
      formData.append('docType', docType) // 'ats', 'ptr', 'environmental_aspects'

      const token = getAuthToken()
      const API_BASE_URL = import.meta.env.VITE_API_URL

      if (!API_BASE_URL) {
        throw new Error('VITE_API_URL no está definido en las variables de entorno')
      }

      const response = await fetch(
        `${API_BASE_URL}/api/daily-reports/${reportId}/document`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const result = await response.json()

      set({ isLoading: false })
      return result.data || result
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  updateReporte: async (reporteId, updates) => {
    set({ isLoading: true })
    try {
      // Convertir actualizaciones del frontend (camelCase) al formato del backend (snake_case)
      const backendUpdates = {}

      if (updates.ordenId !== undefined) backendUpdates.order_id = updates.ordenId
      if (updates.instalacionId !== undefined) backendUpdates.installation_id = updates.instalacionId
      if (updates.tipoReporte !== undefined) backendUpdates.report_type = updates.tipoReporte
      if (updates.tecnico !== undefined) backendUpdates.technician = updates.tecnico
      if (updates.fecha !== undefined) backendUpdates.report_date = updates.fecha
      if (updates.horasIniciales !== undefined) backendUpdates.start_time = updates.horasIniciales
      if (updates.horasFinales !== undefined) backendUpdates.end_time = updates.horasFinales
      if (updates.descripcion !== undefined || updates.descripcionTrabajo !== undefined) {
        backendUpdates.work_description = updates.descripcion || updates.descripcionTrabajo
      }
      if (updates.porcentajeAvance !== undefined) backendUpdates.progress_percentage = updates.porcentajeAvance
      if (updates.trabajoEnAltura !== undefined) backendUpdates.work_at_height = updates.trabajoEnAltura
      if (updates.atsDocument !== undefined) backendUpdates.ats_document = updates.atsDocument
      if (updates.ptrDocument !== undefined) backendUpdates.ptr_document = updates.ptrDocument
      if (updates.aspectosAmbientalesDocument !== undefined) {
        backendUpdates.environmental_aspects_document = updates.aspectosAmbientalesDocument
      }
      if (updates.observaciones !== undefined) backendUpdates.observations = updates.observaciones
      if (updates.proximasTareas !== undefined) backendUpdates.next_tasks = updates.proximasTareas
      if (updates.estado !== undefined) backendUpdates.status = updates.estado

      const response = await api.put(API_ENDPOINTS.DAILY_REPORT_BY_ID(reporteId), backendUpdates)

      const { normalizeReporteFromBackend } = get()
      const updatedReporte = normalizeReporteFromBackend(response)

      set(state => {
        const newReportes = { ...state.reportes }

        // Actualizar en la estructura local
        Object.keys(newReportes).forEach(ordenId => {
          newReportes[ordenId] = newReportes[ordenId].map(reporte =>
            reporte.id === reporteId ? updatedReporte : reporte
          )
        })

        return {
          reportes: newReportes,
          reporteActual: state.reporteActual?.id === reporteId
            ? updatedReporte
            : state.reporteActual,
          isLoading: false
        }
      })

      return updatedReporte
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  deleteReporte: async (reporteId, ordenId) => {
    set({ isLoading: true })
    try {
      await api.delete(API_ENDPOINTS.DAILY_REPORT_BY_ID(reporteId))

      set(state => ({
        reportes: {
          ...state.reportes,
          [ordenId]: (state.reportes[ordenId] || []).filter(
            reporte => reporte.id !== reporteId
          )
        },
        reporteActual: state.reporteActual?.id === reporteId ? null : state.reporteActual,
        isLoading: false
      }))
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  // Establecer reporte actual
  setReporteActual: (reporte) => {
    set({ reporteActual: reporte })
  },

  getInstalacionesByEspecialidad: async (especialidad) => {
    try {
      const allInstalaciones = await api.get(API_ENDPOINTS.INSTALLATIONS)

      const instalacionesEspecialidad = allInstalaciones.filter(
        inst => inst.especialidad === especialidad || inst.specialty === especialidad
      )

      return instalacionesEspecialidad
    } catch (error) {
      return []
    }
  },

  createReporteInstalacion: async (reporteData) => {
    set({ isLoading: true })
    try {
      // Convertir datos del frontend (camelCase) al formato del backend (snake_case)
      const backendPayload = {
        order_id: null,
        installation_id: reporteData.instalacionId,
        report_type: 'installation',
        technician: reporteData.tecnico,
        report_date: reporteData.fecha || getToday(),
        start_time: reporteData.horasIniciales,
        end_time: reporteData.horasFinales,
        work_description: reporteData.descripcion || reporteData.descripcionTrabajo,
        progress_percentage: reporteData.porcentajeAvance || 0,
        work_at_height: reporteData.trabajoEnAltura || false,
        ats_document: reporteData.atsDocument || null,
        ptr_document: reporteData.ptrDocument || null,
        environmental_aspects_document: reporteData.aspectosAmbientalesDocument || null,
        observations: reporteData.observaciones || null,
        next_tasks: reporteData.proximasTareas || null,
        status: reporteData.estado || 'active'
      }

      const response = await api.post(API_ENDPOINTS.DAILY_REPORTS, backendPayload)

      const { normalizeReporteFromBackend } = get()
      const createdReporte = normalizeReporteFromBackend(response)

      set(state => {
        const instalacionReportes = state.reportes[`instalacion-${reporteData.instalacionId}`] || []
        return {
          reportes: {
            ...state.reportes,
            [`instalacion-${reporteData.instalacionId}`]: [...instalacionReportes, createdReporte]
          },
          isLoading: false
        }
      })

      return createdReporte
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  fetchReportesByInstalacion: async (instalacionId) => {
    set({ isLoading: true })
    try {
      // Optimización: Filtrar en backend en lugar de traer todos los reportes
      const reportesInstalacionRaw = await api.get(`${API_ENDPOINTS.DAILY_REPORTS}?installation_id=${instalacionId}`)
      const { normalizeReporteFromBackend } = get()

      const reportesInstalacion = reportesInstalacionRaw.map(reporte => normalizeReporteFromBackend(reporte))

      set(state => ({
        reportes: {
          ...state.reportes,
          [`instalacion-${instalacionId}`]: reportesInstalacion
        },
        isLoading: false
      }))

      return reportesInstalacion
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  // Obtener estadísticas de reportes
  getEstadisticasReportes: () => {
    const { reportes } = get()
    let totalReportes = 0
    let promedioAvance = 0
    let reportesHoy = 0
    
    const hoy = getToday()
    
    Object.values(reportes).forEach(ordenReportes => {
      // Verificar que ordenReportes sea un array
      if (Array.isArray(ordenReportes)) {
        totalReportes += ordenReportes.length
        ordenReportes.forEach(reporte => {
          promedioAvance += reporte.porcentajeAvance || 0
          if (reporte.fecha === hoy) {
            reportesHoy++
          }
        })
      }
    })

    if (totalReportes > 0) {
      promedioAvance = Math.round(promedioAvance / totalReportes)
    }

    return {
      totalReportes,
      promedioAvance,
      reportesHoy
    }
  },

  // Helper para transformar informe final de backend (snake_case) a frontend (camelCase)
  normalizeInformeFinalFromBackend: (informe) => {
    if (!informe) return null

    // Parsear JSON si vienen como strings
    let summary = informe.summary
    let signatures = informe.signatures

    if (typeof summary === 'string') {
      try { summary = JSON.parse(summary) } catch (e) { summary = {} }
    }
    if (typeof signatures === 'string') {
      try { signatures = JSON.parse(signatures) } catch (e) { signatures = {} }
    }

    return {
      id: informe.id,
      ordenId: informe.order_id,
      fechaGeneracion: informe.generation_date,
      resumen: summary || {},
      firmas: signatures || {},
      estado: informe.status,
      bloqueado: informe.blocked,
      reportesIncluidos: summary?.reportesIncluidos || [],
      fechaCreacion: informe.date_time_registration,
      fechaModificacion: informe.date_time_modification
    }
  },

  // Generar informe final
  generarInformeFinal: async (ordenId) => {
    set({ isLoading: true })
    try {
      const reportesOrden = get().reportes[ordenId] || []

      // Validación (preservada)
      if (reportesOrden.length === 0) {
        throw new Error('No hay reportes para generar el informe final')
      }

      // Consolidar materiales manteniendo toda la información (nombre, cantidad, unidad)
      const materialesConsolidados = []
      reportesOrden.forEach(reporte => {
        if (reporte.materialesUtilizados && Array.isArray(reporte.materialesUtilizados)) {
          reporte.materialesUtilizados.forEach(material => {
            // Buscar si el material ya existe en la lista consolidada
            const materialExistente = materialesConsolidados.find(m =>
              m.nombre === material.nombre || m.nombre === material
            )

            if (materialExistente) {
              // Si existe, sumar la cantidad
              if (typeof material === 'object' && material.cantidad) {
                materialExistente.cantidad += material.cantidad
              }
            } else {
              // Si no existe, agregarlo
              if (typeof material === 'object') {
                materialesConsolidados.push({
                  nombre: material.nombre,
                  cantidad: material.cantidad || 1,
                  unidad: material.unidad || 'unidad'
                })
              } else {
                // Si es solo un string (legacy), crear objeto con valores por defecto
                materialesConsolidados.push({
                  nombre: material,
                  cantidad: 1,
                  unidad: 'unidad'
                })
              }
            }
          })
        }
      })

      // Crear objeto resumen para guardar en summary (JSONB)
      const resumenData = {
        totalReportes: reportesOrden.length,
        fechaInicio: reportesOrden[0]?.fecha,
        fechaFin: reportesOrden[reportesOrden.length - 1]?.fecha,
        porcentajeFinal: reportesOrden[reportesOrden.length - 1]?.porcentajeAvance || 100,
        tecnicos: [...new Set(reportesOrden.map(r => r.tecnico).filter(Boolean))],
        materialesUtilizados: materialesConsolidados,
        totalFotos: reportesOrden.reduce((acc, r) =>
          acc + (r.fotosAntes?.length || 0) + (r.fotosDespues?.length || 0), 0
        ),
        reportesIncluidos: reportesOrden.map(r => ({
          id: r.id,
          fecha: r.fecha,
          descripcion: r.descripcion,
          porcentajeAvance: r.porcentajeAvance,
          tecnico: r.tecnico,
          fotosAntes: r.fotosAntes,
          fotosDespues: r.fotosDespues,
          materialesUtilizados: r.materialesUtilizados,
          observaciones: r.observaciones,
          atsDoc: r.atsDoc,
          ptrDoc: r.ptrDoc,
          aspectosAmbientalesDoc: r.aspectosAmbientalesDoc,
          trabajoEnAltura: r.trabajoEnAltura
        }))
      }

      // Datos en formato backend (snake_case)
      const informeDataBackend = {
        order_id: ordenId,
        generation_date: getCurrentTimestamp(),
        summary: resumenData, // El backend guarda esto como JSONB
        signatures: {
          tecnico: null,
          supervisor: null,
          administrador: null
        },
        status: 'pendiente_firma_tecnico',
        blocked: false
      }

      const response = await api.post(API_ENDPOINTS.FINAL_REPORTS, informeDataBackend)
      const backendInforme = response.data

      // Normalizar la respuesta del backend a formato frontend
      const { normalizeInformeFinalFromBackend } = get()
      const createdInforme = normalizeInformeFinalFromBackend(backendInforme)

      // Guardar informe final en el store
      set(state => ({
        reportes: {
          ...state.reportes,
          [`informe-final-${ordenId}`]: createdInforme
        },
        isLoading: false
      }))

      return createdInforme
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  firmarInforme: async (informeId, tipoFirma, firmaData) => {
    set({ isLoading: true })
    try {
      if (!['tecnico', 'supervisor', 'administrador'].includes(tipoFirma)) {
        throw new Error('Tipo de firma inválido')
      }

      // Obtener informe actual para obtener las firmas existentes
      const state = get()
      let ordenIdKey = null
      let informeActual = null

      Object.keys(state.reportes).forEach(key => {
        if (key.startsWith('informe-final-') && state.reportes[key]?.id === informeId) {
          ordenIdKey = key
          informeActual = state.reportes[key]
        }
      })

      if (!ordenIdKey || !informeActual) {
        throw new Error('Informe final no encontrado en el estado local')
      }

      // Construir el nuevo objeto de firmas
      const nuevasFirmas = {
        ...(informeActual.firmas || {}),
        [tipoFirma]: {
          nombre: firmaData.nombre,
          fecha: getCurrentTimestamp(),
          comentarios: firmaData.comentarios || '',
          firmaGrafica: firmaData.firmaGrafica || null
        }
      }

      // Determinar el nuevo estado según las firmas
      let nuevoEstado = 'pendiente_firma_tecnico'
      if (nuevasFirmas.tecnico && !nuevasFirmas.supervisor) {
        nuevoEstado = 'pendiente_firma_supervisor'
      } else if (nuevasFirmas.tecnico && nuevasFirmas.supervisor && !nuevasFirmas.administrador) {
        nuevoEstado = 'pendiente_firma_administrador'
      } else if (nuevasFirmas.tecnico && nuevasFirmas.supervisor && nuevasFirmas.administrador) {
        nuevoEstado = 'completado'
      }

      // Datos en formato backend
      const updateData = {
        signatures: nuevasFirmas,
        status: nuevoEstado,
        blocked: nuevoEstado === 'completado'
      }

      const response = await api.put(API_ENDPOINTS.FINAL_REPORT_BY_ID(informeId), updateData)
      const backendInforme = response.data

      // Normalizar la respuesta
      const { normalizeInformeFinalFromBackend } = get()
      const informeActualizado = normalizeInformeFinalFromBackend(backendInforme)

      set(state => ({
        reportes: {
          ...state.reportes,
          [ordenIdKey]: informeActualizado
        },
        isLoading: false
      }))

      return informeActualizado
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  // Obtener informe final por orden
  getInformeFinalByOrden: async (ordenId) => {
    const state = get()
    const localInforme = state.reportes[`informe-final-${ordenId}`]

    // Si existe localmente y ya está normalizado (tiene fechaGeneracion), retornar
    if (localInforme && localInforme.fechaGeneracion !== undefined) return localInforme

    // Si no existe o necesita normalización, fetch del backend
    try {
      const response = await api.get(`${API_ENDPOINTS.FINAL_REPORTS}?order_id=${ordenId}`)
      if (response && response.length > 0) {
        const backendInforme = response[0]

        // Normalizar del backend (snake_case) a frontend (camelCase)
        const { normalizeInformeFinalFromBackend } = get()
        const informe = normalizeInformeFinalFromBackend(backendInforme)

        // Guardar en store
        set(state => ({
          reportes: {
            ...state.reportes,
            [`informe-final-${ordenId}`]: informe
          }
        }))

        return informe
      }

      return null
    } catch (error) {
      return null
    }
  },

  // Verificar si se puede editar un reporte
  puedeEditarReporte: (ordenId) => {
    const state = get()
    // Buscar informe final solo en el store local (sin fetch)
    const informeFinal = state.reportes[`informe-final-${ordenId}`]
    return !informeFinal || !informeFinal.bloqueado
  },

  // ========================================
  // OBTENER ESTADÍSTICAS DE REPORTES (DATOS REALES)
  // ========================================
  fetchStatistics: async (days = 7) => {
    try {
      // Enviar periodo al backend
      const url = `${API_ENDPOINTS.DAILY_REPORTS_STATISTICS}?days=${days}`
      const statistics = await api.get(url)
      return statistics
    } catch (error) {
      console.error('Error al obtener estadísticas:', error)
      return {
        technicians: [],
        general: {
          total_reports: 0,
          reports_today: 0,
          reports_last_week: 0,
          reports_last_month: 0,
          avg_progress: 0,
          active_technicians: 0,
          orders_with_reports: 0
        },
        dailyProductivity: [],
        kpis: {
          completion_rate: 0,
          avg_days_per_order: 0,
          avg_cost_per_order: 0
        }
      }
    }
  }
}))

export default useReportesStore