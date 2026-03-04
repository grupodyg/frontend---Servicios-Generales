import { useEffect, useRef } from 'react'
import useNotificacionesStore from '../stores/notificacionesStore'
import useAuthStore from '../stores/authStore'
import notificationService from '../services/notificationService'

const useRealtimeNotifications = (intervalo = 30000) => { // 30 segundos por defecto
  const { user } = useAuthStore()
  const {
    getNotificacionesNoLeidas,
    notificaciones,
    createNotificacion,
    fetchNotificaciones
  } = useNotificacionesStore()
  
  const ultimaNotificacionRef = useRef(null)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!user) return

    // Cargar notificaciones iniciales del usuario
    const loadNotifications = async () => {
      try {
        await fetchNotificaciones({ user_id: user.id })
      } catch (error) {
        console.error('Error loading notifications:', error)
      }
    }

    loadNotifications()

    // Función para verificar nuevas notificaciones
    const checkNewNotifications = () => {
      const noLeidas = getNotificacionesNoLeidas()

      // Obtener la notificación más reciente no leída
      const notificacionMasReciente = noLeidas.length > 0 ? noLeidas[0] : null

      // Si hay una nueva notificación que no hemos mostrado
      if (notificacionMasReciente &&
          notificacionMasReciente.id !== ultimaNotificacionRef.current &&
          !notificacionMasReciente.leida) {

        // Actualizar referencia
        ultimaNotificacionRef.current = notificacionMasReciente.id

        // Mostrar notificación toast
        mostrarNotificacionToast(notificacionMasReciente)
      }
    }

    // Función para mostrar notificación tipo toast
    const mostrarNotificacionToast = (notificacion) => {
      const tipoIcono = {
        'asignacion_tecnico': '👷',
        'pendiente_aprobacion': '⏳',
        'orden_aprobada': '✅',
        'orden_rechazada': '❌'
      }

      notificationService.html(
        `${tipoIcono[notificacion.tipo] || '📬'} ${notificacion.titulo}`,
        `
          <div class="text-left">
            <p class="text-gray-600 mb-2">${notificacion.mensaje}</p>
            ${notificacion.datos?.accionRequerida ? `
              <div class="bg-amber-50 border border-amber-200 rounded p-2 mt-2">
                <p class="text-xs text-amber-800">⚠️ Acción requerida</p>
              </div>
            ` : ''}
          </div>
        `,
        'info'
      )
    }

    // Simular recepción de notificaciones en tiempo real
    const simularNotificacionesRealtime = () => {
      // En producción, esto sería reemplazado por WebSockets o Server-Sent Events
      // Por ahora, simulamos con algunos eventos aleatorios para testing
      
      const eventosSimulados = [
        {
          tipo: 'asignacion_tecnico',
          probabilidad: 0.1,
          crear: () => ({
            tipo: 'asignacion_tecnico',
            usuarioId: user.id,
            titulo: 'Nueva Orden Asignada (Simulada)',
            mensaje: `Se te ha asignado la orden #OT-${Date.now().toString().slice(-4)}`,
            datos: {
              ordenId: `OT-${Date.now().toString().slice(-4)}`,
              tipoServicio: 'Mantenimiento Preventivo',
              cliente: 'Cliente Demo',
              accionRequerida: true,
              acciones: ['Revisar detalles', 'Crear estimación']
            }
          })
        },
        {
          tipo: 'pendiente_aprobacion',
          probabilidad: 0.05,
          crear: () => ({
            tipo: 'pendiente_aprobacion',
            usuarioId: 'admin',
            titulo: 'Orden Pendiente de Aprobación (Simulada)',
            mensaje: `La orden #OT-${Date.now().toString().slice(-4)} requiere aprobación`,
            datos: {
              ordenId: `OT-${Date.now().toString().slice(-4)}`,
              tecnicoNombre: 'Técnico Demo',
              accionRequerida: true
            }
          })
        }
      ]

      // Solo simular si estamos en modo desarrollo
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.02) { // 2% probabilidad
        const evento = eventosSimulados[Math.floor(Math.random() * eventosSimulados.length)]
        if (Math.random() < evento.probabilidad) {
          const nuevaNotificacion = evento.crear()
          createNotificacion(nuevaNotificacion).catch(err => {
            console.error('Error creating simulated notification:', err)
          })
        }
      }
    }

    // Verificar inmediatamente
    checkNewNotifications()

    // Configurar intervalo de verificación
    intervalRef.current = setInterval(() => {
      checkNewNotifications()
      simularNotificacionesRealtime()
    }, intervalo)

    // Limpiar al desmontar
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
    // Removemos 'notificaciones' de las dependencias para evitar bucle infinito
    // Solo necesitamos ejecutar cuando cambia el usuario o el intervalo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, intervalo])

  return {
    notificacionesNoLeidas: user ? getNotificacionesNoLeidas().length : 0
  }
}

export default useRealtimeNotifications