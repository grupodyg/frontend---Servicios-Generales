import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import useAuthStore from '../../stores/authStore'
import useNotificacionesStore from '../../stores/notificacionesStore'
import { getDevQuickAccessUsers } from '../../config/devQuickAccess'
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

const MySwal = withReactContent(Swal)

const Login = () => {
  const navigate = useNavigate()
  const { login, isLoading } = useAuthStore()
  const { fetchNotificaciones } = useNotificacionesStore()
  const [showPassword, setShowPassword] = useState(false)

  // Accesos rápidos SOLO en desarrollo local (lista vacía en producción)
  const accesosRapidos = useMemo(() => getDevQuickAccessUsers(), [])

  const {
    register,
    handleSubmit,
    setValue,
    setFocus,
    formState: { errors }
  } = useForm()

  const mostrarNotificacionesLogin = async (userId) => {
    try {
      const notificaciones = await fetchNotificaciones({ user_id: userId })
      const noLeidas = (notificaciones || []).filter(n => !n.leida)

      if (noLeidas.length === 0) return

      const tipoIcono = {
        'asignacion_orden': '📋',
        'asignacion_tecnico': '👷',
        'asignacion_visita': '🔍',
        'pendiente_aprobacion': '⏳',
        'orden_aprobada': '✅',
        'orden_rechazada': '❌'
      }

      const listaHtml = noLeidas.map(n => {
        const icono = tipoIcono[n.tipo] || '📬'
        return `<div class="flex items-start gap-2 p-2 border-b border-gray-100 last:border-0">
          <span class="text-lg mt-0.5">${icono}</span>
          <div class="text-left">
            <p class="font-medium text-gray-800 text-sm">${n.titulo}</p>
            <p class="text-gray-500 text-xs">${n.mensaje}</p>
          </div>
        </div>`
      }).join('')

      await MySwal.fire({
        title: `Tienes ${noLeidas.length} notificaci${noLeidas.length === 1 ? 'on' : 'ones'} pendiente${noLeidas.length === 1 ? '' : 's'}`,
        html: `<div class="max-h-60 overflow-y-auto divide-y divide-gray-100">${listaHtml}</div>`,
        icon: 'info',
        confirmButtonColor: '#1e40af',
        confirmButtonText: 'Entendido',
        width: '500px'
      })
    } catch (error) {
      console.error('Error cargando notificaciones post-login:', error)
    }
  }

  const onSubmit = async (data) => {
    try {
      const userData = await login(data)

      await MySwal.fire({
        title: '¡Bienvenido!',
        text: 'Has iniciado sesión correctamente',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      })

      // Mostrar notificaciones pendientes antes de navegar
      const userId = userData?.user?.id || userData?.id
      if (userId) {
        await mostrarNotificacionesLogin(userId)
      }

      navigate('/dashboard')
    } catch (error) {
      MySwal.fire({
        title: 'Error de acceso',
        text: error.message || 'Credenciales incorrectas',
        icon: 'error',
        confirmButtonColor: '#1e40af'
      })
    }
  }

  // Rellena el formulario con la cuenta elegida; si el .env local trae contraseña, envía directamente
  const handleAccesoRapido = (acceso) => {
    setValue('email', acceso.email, { shouldValidate: true })
    if (acceso.password) {
      setValue('password', acceso.password, { shouldValidate: true })
      handleSubmit(onSubmit)()
      return
    }
    setValue('password', '')
    setFocus('password')
  }

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Iniciar Sesión
        </h2>
        <p className="text-gray-600">
          Ingresa tus credenciales para acceder al sistema
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Correo electrónico
          </label>
          <input
            type="email"
            id="email"
            className={`input-field ${errors.email ? 'border-red-500' : ''}`}
            placeholder="tu@email.com"
            {...register('email', {
              required: 'El correo es requerido',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Correo electrónico inválido'
              }
            })}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Contraseña
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              className={`input-field pr-10 ${errors.password ? 'border-red-500' : ''}`}
              placeholder="••••••••"
              {...register('password', {
                required: 'La contraseña es requerida',
                minLength: {
                  value: 6,
                  message: 'La contraseña debe tener al menos 6 caracteres'
                }
              })}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
            >
              <span className="text-gray-400 hover:text-gray-600">
                {showPassword ? '🙈' : '👁️'}
              </span>
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full btn-primary ${
            isLoading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
        </button>
      </form>

      {/* Accesos rápidos: solo existen en desarrollo local. La comprobación inline de
          import.meta.env.DEV hace que Vite elimine este bloque del bundle de producción. */}
      {import.meta.env.DEV && accesosRapidos.length > 0 && (
        <div className="mt-6 border-t border-dashed border-amber-300 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-2">
            🛠️ Acceso rápido · solo entorno local
          </p>
          <div className="flex flex-wrap gap-2">
            {accesosRapidos.map((acceso) => (
              <button
                key={acceso.email}
                type="button"
                onClick={() => handleAccesoRapido(acceso)}
                disabled={isLoading}
                className="px-3 py-1.5 text-sm rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:opacity-50"
              >
                {acceso.label || acceso.email}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {accesosRapidos.some(a => a.password)
              ? 'Entra con un clic usando la contraseña de VITE_DEV_QUICK_PASSWORD del .env local.'
              : 'Define VITE_DEV_QUICK_PASSWORD en el .env local para entrar con un clic; ahora solo rellena el correo.'}
            {' '}No se incluye en compilaciones de producción.
          </p>
        </div>
      )}
    </div>
  )
}

export default Login
