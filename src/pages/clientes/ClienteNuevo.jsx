import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import useClientesStore from '../../stores/clientesStore'
import notificationService from '../../services/notificationService'

const ClienteNuevo = () => {
  const navigate = useNavigate()
  const { createCliente, isLoading } = useClientesStore()
  const [tipoCliente, setTipoCliente] = useState('empresa')
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm({
    defaultValues: {
      tipo: 'empresa',
      categoria: 'regular',
      estado: 'activo'
    }
  })

  const categoria = watch('categoria')

  const onSubmit = async (data) => {
    try {
      const clienteData = {
        ...data,
        tipo: tipoCliente
      }

      // Si es empresa, agregar contacto principal
      if (tipoCliente === 'empresa' && data.contactoNombre) {
        clienteData.contactoPrincipal = {
          nombre: data.contactoNombre,
          cargo: data.contactoCargo,
          email: data.contactoEmail,
          telefono: data.contactoTelefono
        }
      }

      // Limpiar campos no necesarios
      delete clienteData.contactoNombre
      delete clienteData.contactoCargo
      delete clienteData.contactoEmail
      delete clienteData.contactoTelefono

      await createCliente(clienteData)
      
      await notificationService.success(
        'Cliente creado',
        'El cliente ha sido registrado exitosamente',
        2000
      )
      
      navigate('/clientes')
    } catch (error) {
      await notificationService.error(
        'Error',
        'No se pudo crear el cliente'
      )
    }
  }

  const getCategoriaInfo = (cat) => {
    const info = {
      premium: {
        icon: '⭐',
        color: 'text-purple-600',
        description: 'Clientes con alto volumen de órdenes y facturación'
      },
      regular: {
        icon: '🔵',
        color: 'text-blue-600',
        description: 'Clientes con actividad regular y estable'
      },
      basico: {
        icon: '⚪',
        color: 'text-gray-600',
        description: 'Clientes ocasionales o nuevos'
      }
    }
    return info[cat] || info.regular
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Nuevo Cliente</h1>
          <p className="text-gray-600">Registra un nuevo cliente en el sistema</p>
        </div>

        <Link to="/clientes" className="btn-secondary">
          ← Volver
        </Link>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Tipo de cliente */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Tipo de Cliente
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setTipoCliente('empresa')}
              className={`p-4 rounded-lg border-2 transition-all ${
                tipoCliente === 'empresa'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="text-2xl mb-2 block">🏢</span>
              <p className="font-medium text-gray-900">Empresa</p>
              <p className="text-sm text-gray-500">Persona jurídica con RUC</p>
            </button>

            <button
              type="button"
              onClick={() => setTipoCliente('persona')}
              className={`p-4 rounded-lg border-2 transition-all ${
                tipoCliente === 'persona'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="text-2xl mb-2 block">👤</span>
              <p className="font-medium text-gray-900">Persona Natural</p>
              <p className="text-sm text-gray-500">Persona natural con DNI</p>
            </button>
          </div>
        </div>

        {/* Información básica */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Información Básica
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {tipoCliente === 'empresa' ? 'Razón Social' : 'Nombre Completo'} *
              </label>
              <input
                type="text"
                className={`input-field ${errors.nombre ? 'border-red-500' : ''}`}
                {...register('nombre', { 
                  required: `${tipoCliente === 'empresa' ? 'La razón social' : 'El nombre'} es requerido` 
                })}
              />
              {errors.nombre && (
                <p className="mt-1 text-sm text-red-600">{errors.nombre.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {tipoCliente === 'empresa' ? 'RUC' : 'DNI'} *
              </label>
              <input
                type="text"
                className={`input-field ${errors[tipoCliente === 'empresa' ? 'ruc' : 'dni'] ? 'border-red-500' : ''}`}
                {...register(tipoCliente === 'empresa' ? 'ruc' : 'dni', { 
                  required: `El ${tipoCliente === 'empresa' ? 'RUC' : 'DNI'} es requerido`,
                  pattern: {
                    value: tipoCliente === 'empresa' ? /^\d{11}$/ : /^\d{8}$/,
                    message: `El ${tipoCliente === 'empresa' ? 'RUC debe tener 11 dígitos' : 'DNI debe tener 8 dígitos'}`
                  }
                })}
                placeholder={tipoCliente === 'empresa' ? '20123456789' : '12345678'}
                maxLength={tipoCliente === 'empresa' ? 11 : 8}
              />
              {errors[tipoCliente === 'empresa' ? 'ruc' : 'dni'] && (
                <p className="mt-1 text-sm text-red-600">
                  {errors[tipoCliente === 'empresa' ? 'ruc' : 'dni'].message}
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría *
              </label>
              <select
                className="input-field"
                {...register('categoria', { required: 'La categoría es requerida' })}
              >
                <option value="premium">⭐ Premium</option>
                <option value="regular">🔵 Regular</option>
                <option value="basico">⚪ Básico</option>
              </select>
              {categoria && (
                <p className={`mt-1 text-sm ${getCategoriaInfo(categoria).color}`}>
                  {getCategoriaInfo(categoria).description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Información de contacto */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Información de Contacto
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                className={`input-field ${errors.email ? 'border-red-500' : ''}`}
                {...register('email', { 
                  required: 'El email es requerido',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Email inválido'
                  }
                })}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono *
              </label>
              <input
                type="text"
                className={`input-field ${errors.telefono ? 'border-red-500' : ''}`}
                {...register('telefono', { required: 'El teléfono es requerido' })}
                placeholder="01-1234567 o 999888777"
              />
              {errors.telefono && (
                <p className="mt-1 text-sm text-red-600">{errors.telefono.message}</p>
              )}
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dirección *
              </label>
              <input
                type="text"
                className={`input-field ${errors.direccion ? 'border-red-500' : ''}`}
                {...register('direccion', { required: 'La dirección es requerida' })}
                placeholder="Av. Principal 123, Distrito, Ciudad"
              />
              {errors.direccion && (
                <p className="mt-1 text-sm text-red-600">{errors.direccion.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Contacto principal (solo para empresas) */}
        {tipoCliente === 'empresa' && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Contacto Principal (Opcional)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Contacto
                </label>
                <input
                  type="text"
                  className="input-field"
                  {...register('contactoNombre')}
                  placeholder="Juan Pérez"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cargo
                </label>
                <input
                  type="text"
                  className="input-field"
                  {...register('contactoCargo')}
                  placeholder="Gerente de Operaciones"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email del Contacto
                </label>
                <input
                  type="email"
                  className="input-field"
                  {...register('contactoEmail')}
                  placeholder="contacto@empresa.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono del Contacto
                </label>
                <input
                  type="text"
                  className="input-field"
                  {...register('contactoTelefono')}
                  placeholder="999888777"
                />
              </div>
            </div>
          </div>
        )}

        {/* Notas adicionales */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Información Adicional
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas (Opcional)
            </label>
            <textarea
              className="input-field"
              rows="3"
              {...register('notas')}
              placeholder="Información relevante sobre el cliente, preferencias, requisitos especiales..."
            />
          </div>
        </div>

        {/* Acciones */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
          <Link to="/clientes" className="btn-secondary text-center">
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary"
          >
            {isLoading ? 'Creando...' : 'Crear Cliente'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ClienteNuevo