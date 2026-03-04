import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createJSONStorage } from 'zustand/middleware'
import { api, API_ENDPOINTS } from '../config/api'
import { getToday } from '../utils/dateUtils'

// 🔄 FUNCIONES DE TRANSFORMACIÓN DE DATOS (Backend ↔ Frontend)
const transformBackendToFrontend = (backendClient) => {
  if (!backendClient) return null

  // Mapear type del backend (empresa/persona o juridico/natural) al frontend
  let tipo = 'persona'
  if (backendClient.type === 'empresa' || backendClient.type === 'juridico') {
    tipo = 'empresa'
  }

  // Obtener contacto principal de los contactos
  const contactos = backendClient.contacts || []
  const contactoPrincipal = contactos.find(c => c.is_primary) || null

  return {
    id: backendClient.id,
    tipo: tipo,
    nombre: backendClient.name,
    ruc: backendClient.ruc,
    dni: backendClient.dni,
    email: backendClient.email,
    telefono: backendClient.phone,
    direccion: backendClient.address,
    categoria: backendClient.category,
    notas: backendClient.notes,
    estado: backendClient.status === 'active' ? 'activo' : 'inactivo',
    totalOrdenes: backendClient.total_orders || 0,
    ordenesActivas: backendClient.active_orders || 0,
    ordenesCompletadas: backendClient.completed_orders || 0,
    montoTotal: parseFloat(backendClient.total_amount) || 0,
    ultimaOrden: backendClient.last_order_date,
    fechaRegistro: backendClient.date_time_registration,
    contactos: contactos,
    contactoPrincipal: contactoPrincipal ? {
      id: contactoPrincipal.id,
      nombre: contactoPrincipal.name,
      cargo: contactoPrincipal.position,
      email: contactoPrincipal.email,
      telefono: contactoPrincipal.phone
    } : null
  }
}

const transformFrontendToBackend = (frontendClient) => {
  if (!frontendClient) return null

  // Mapear tipo frontend (empresa/persona) al backend (juridico/natural)
  const backendType = frontendClient.tipo === 'empresa' ? 'juridico' : 'natural'

  // Determinar qué campo de identificación usar según el tipo
  const isEmpresa = frontendClient.tipo === 'empresa'

  return {
    type: backendType,
    name: frontendClient.nombre,
    // Si es empresa, enviar ruc y asegurar que dni sea null
    // Si es persona, enviar dni y asegurar que ruc sea null
    ruc: isEmpresa ? (frontendClient.ruc || null) : null,
    dni: !isEmpresa ? (frontendClient.dni || null) : null,
    email: frontendClient.email || null,
    phone: frontendClient.telefono || null,
    address: frontendClient.direccion || null,
    category: frontendClient.categoria || null,
    notes: frontendClient.notas || null,
    status: frontendClient.estado === 'activo' ? 'active' : 'inactive'
  }
}

const useClientesStore = create(
  persist(
    (set, get) => ({
      clientes: [],
      isLoading: false,

      // Inicializar con datos de ejemplo
      inicializarDatos: () => {
        // Ya no necesario - datos vienen del backend
      },

      // Obtener todos los clientes desde el backend
      fetchClientes: async (filters = {}) => {
        set({ isLoading: true })
        try {
          // Construir query params
          const params = new URLSearchParams()
          // Por defecto traer TODOS los clientes (activos e inactivos) para poder filtrar en el frontend
          params.append('status', filters.status || 'all')
          if (filters.type) params.append('type', filters.type)
          if (filters.category) params.append('category', filters.category)
          if (filters.search) params.append('search', filters.search)

          const url = `${API_ENDPOINTS.CLIENTS}${params.toString() ? '?' + params.toString() : ''}`
          const backendClientes = await api.get(url)

          // 🔄 Transformar datos del backend al frontend
          const clientes = backendClientes.map(transformBackendToFrontend)

          set({ clientes, isLoading: false })
          return clientes
        } catch (error) {
          set({ isLoading: false })
          console.error('Error fetching clientes:', error)
          throw error
        }
      },

      // Crear nuevo cliente en el backend
      createCliente: async (clienteData) => {
        set({ isLoading: true })
        try {
          // 🔄 Transformar datos del frontend al backend
          const backendData = transformFrontendToBackend(clienteData)

          const response = await api.post(API_ENDPOINTS.CLIENTS, backendData)
          const createdCliente = transformBackendToFrontend(response.data)

          // Refrescar lista de clientes
          await get().fetchClientes()

          set({ isLoading: false })
          return createdCliente
        } catch (error) {
          set({ isLoading: false })
          console.error('Error creating cliente:', error)
          throw error
        }
      },

      // Actualizar cliente en el backend
      actualizarCliente: async (clienteId, updates) => {
        set({ isLoading: true })
        try {
          console.log('🔄 Actualizando cliente en store:', { clienteId, updates })

          // 🔄 Transformar datos del frontend al backend
          const backendUpdates = transformFrontendToBackend(updates)

          console.log('📤 Datos transformados a enviar al backend:', backendUpdates)

          // ⚠️ NO eliminar campos null - permitir limpiar campos opcionales
          // Solo eliminar undefined (campos no presentes en el update)
          Object.keys(backendUpdates).forEach(key =>
            backendUpdates[key] === undefined && delete backendUpdates[key]
          )

          console.log('📦 Payload final después de limpieza:', backendUpdates)

          // Actualizar cliente
          const response = await api.put(API_ENDPOINTS.CLIENT_BY_ID(clienteId), backendUpdates)

          console.log('✅ Respuesta del backend:', response)

          // Si hay contacto principal, actualizarlo o crearlo
          let contactUpdateStatus = { success: true, message: '' }
          if (updates.contactoPrincipal && updates.tipo === 'empresa') {
            const contactoPrincipal = updates.contactoPrincipal

            try {
              // Obtener contactos actuales del cliente
              const contactosActuales = await api.get(`${API_ENDPOINTS.CLIENT_CONTACTS}/client/${clienteId}`)
              const contactoPrincipalExistente = contactosActuales.find(c => c.is_primary)

              const contactoData = {
                client_id: clienteId,
                name: contactoPrincipal.nombre || '',
                position: contactoPrincipal.cargo || null,
                email: contactoPrincipal.email || null,
                phone: contactoPrincipal.telefono || null,
                is_primary: true
              }

              // Si el contacto principal tiene todos los campos vacíos, eliminarlo si existe
              const allFieldsEmpty = !contactoData.name && !contactoData.position && !contactoData.email && !contactoData.phone

              if (allFieldsEmpty && contactoPrincipalExistente) {
                // Eliminar contacto principal si todos los campos están vacíos
                await api.delete(API_ENDPOINTS.CLIENT_CONTACT_BY_ID(contactoPrincipalExistente.id))
                contactUpdateStatus.message = 'Contacto principal eliminado'
              } else if (!allFieldsEmpty) {
                // Actualizar o crear contacto principal
                if (contactoPrincipalExistente) {
                  await api.put(API_ENDPOINTS.CLIENT_CONTACT_BY_ID(contactoPrincipalExistente.id), contactoData)
                  contactUpdateStatus.message = 'Contacto principal actualizado'
                } else if (contactoData.name) {
                  // Solo crear si al menos tiene nombre
                  await api.post(API_ENDPOINTS.CLIENT_CONTACTS, contactoData)
                  contactUpdateStatus.message = 'Contacto principal creado'
                }
              }
              console.log('✅ Contacto principal:', contactUpdateStatus.message)
            } catch (contactError) {
              console.error('❌ Error updating contact:', contactError)
              contactUpdateStatus = {
                success: false,
                message: `Advertencia: El cliente se actualizó pero hubo un error con el contacto: ${contactError.message}`
              }
              // No lanzar error, continuar con la actualización del cliente
            }
          }

          // Refrescar lista de clientes
          await get().fetchClientes()

          set({ isLoading: false })

          // Retornar resultado con información de contacto
          const result = transformBackendToFrontend(response.data)
          return {
            ...result,
            _contactUpdateStatus: contactUpdateStatus
          }
        } catch (error) {
          set({ isLoading: false })
          console.error('Error updating cliente:', error)
          throw error
        }
      },
      
      // Obtener cliente por ID
      getClienteById: (clienteId) => {
        return get().clientes.find(c => c.id === clienteId)
      },
      
      // Buscar clientes
      searchClientes: (query) => {
        const clientes = get().clientes
        const queryLower = query.toLowerCase()
        
        return clientes.filter(cliente => 
          cliente.nombre.toLowerCase().includes(queryLower) ||
          cliente.email?.toLowerCase().includes(queryLower) ||
          cliente.ruc?.includes(query) ||
          cliente.dni?.includes(query) ||
          cliente.contactoPrincipal?.nombre.toLowerCase().includes(queryLower)
        )
      },
      
      // Filtrar clientes por categoría
      getClientesPorCategoria: (categoria) => {
        if (categoria === 'todos') return get().clientes
        return get().clientes.filter(c => c.categoria === categoria)
      },
      
      // Filtrar clientes por estado
      getClientesPorEstado: (estado) => {
        if (estado === 'todos') return get().clientes
        return get().clientes.filter(c => c.estado === estado)
      },
      
      // Obtener estadísticas de clientes
      getEstadisticasClientes: () => {
        const clientes = get().clientes
        const activos = clientes.filter(c => c.estado === 'activo')
        const inactivos = clientes.filter(c => c.estado === 'inactivo')
        
        const totalOrdenes = clientes.reduce((sum, c) => sum + (c.totalOrdenes || 0), 0)
        const totalFacturado = clientes.reduce((sum, c) => sum + (c.montoTotal || 0), 0)
        
        const clientesPorCategoria = {
          premium: clientes.filter(c => c.categoria === 'premium').length,
          regular: clientes.filter(c => c.categoria === 'regular').length,
          basico: clientes.filter(c => c.categoria === 'basico').length
        }
        
        const clientesPorTipo = {
          empresa: clientes.filter(c => c.tipo === 'empresa').length,
          persona: clientes.filter(c => c.tipo === 'persona').length
        }
        
        // Top 5 clientes por facturación
        const topClientes = [...clientes]
          .sort((a, b) => (b.montoTotal || 0) - (a.montoTotal || 0))
          .slice(0, 5)
        
        return {
          total: clientes.length,
          activos: activos.length,
          inactivos: inactivos.length,
          totalOrdenes,
          totalFacturado,
          clientesPorCategoria,
          clientesPorTipo,
          topClientes,
          promedioOrdenesPorCliente: clientes.length > 0 ? (totalOrdenes / clientes.length).toFixed(1) : 0,
          promedioFacturacionPorCliente: clientes.length > 0 ? (totalFacturado / clientes.length).toFixed(2) : 0
        }
      },
      
      // Actualizar estadísticas de órdenes del cliente
      actualizarEstadisticasCliente: async (clienteId, nuevaOrden) => {
        const cliente = get().getClienteById(clienteId)
        if (!cliente) return

        const updates = {
          totalOrdenes: (cliente.totalOrdenes || 0) + 1,
          ordenesActivas: (cliente.ordenesActivas || 0) + 1,
          montoTotal: (cliente.montoTotal || 0) + (nuevaOrden.costoEstimado || 0),
          ultimaOrden: getToday()
        }

        await get().actualizarCliente(clienteId, updates)
      },

      // Eliminar cliente (soft delete en el backend)
      deleteCliente: async (clienteId) => {
        set({ isLoading: true })
        try {
          await api.delete(API_ENDPOINTS.CLIENT_BY_ID(clienteId))

          // Refrescar lista de clientes
          await get().fetchClientes()

          set({ isLoading: false })
        } catch (error) {
          set({ isLoading: false })
          console.error('Error deleting cliente:', error)
          throw error
        }
      },

      // Cambiar estado del cliente
      cambiarEstadoCliente: async (clienteId, nuevoEstado) => {
        await get().actualizarCliente(clienteId, { estado: nuevoEstado })
      },

      // Obtener cliente por ID desde el backend
      fetchClienteById: async (clienteId) => {
        set({ isLoading: true })
        try {
          const backendCliente = await api.get(API_ENDPOINTS.CLIENT_BY_ID(clienteId))
          const cliente = transformBackendToFrontend(backendCliente)
          set({ isLoading: false })
          return cliente
        } catch (error) {
          set({ isLoading: false })
          console.error('Error fetching cliente by ID:', error)
          throw error
        }
      }
    }),
    {
      name: 'clientes-storage',
      storage: createJSONStorage(() => localStorage)
    }
  )
)

export default useClientesStore