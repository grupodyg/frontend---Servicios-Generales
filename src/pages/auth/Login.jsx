import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import useAuthStore from '../../stores/authStore'
import useNotificacionesStore from '../../stores/notificacionesStore'
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

const MySwal = withReactContent(Swal)

const Login = () => {
  const navigate = useNavigate()
  const { login, isLoading } = useAuthStore()
  const { fetchNotificaciones } = useNotificacionesStore()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
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
    </div>
  )
}

export default Login
