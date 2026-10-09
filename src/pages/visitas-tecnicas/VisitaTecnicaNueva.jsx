import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import useVisitasTecnicasStore from '../../stores/visitasTecnicasStore'
import useClientesStore from '../../stores/clientesStore'
import useTecnicosStore from '../../stores/tecnicosStore'
import useAuthStore from '../../stores/authStore'
import { getEspecialidadColor } from '../../constants/visitasTecnicasConstants'
import { getToday } from '../../utils/dateUtils'
import notificationService from '../../services/notificationService'
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

const MySwal = withReactContent(Swal)

const VisitaTecnicaNueva = () => {
  const navigate = useNavigate()
  const { createVisitaTecnica, isLoading } = useVisitasTecnicasStore()
  const { clientes, fetchClientes } = useClientesStore()
  const { tecnicos, fetchTecnicos } = useTecnicosStore()
  const { user } = useAuthStore()

  const [tecnicosSeleccionados, setTecnicosSeleccionados] = useState([])
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)

  // Filtrar técnicos activos reactivamente
  const tecnicosDisponibles = tecnicos.filter(tecnico => tecnico.activo)

  // Debug: log técnicos disponibles
  console.log('🔧 Técnicos disponibles:', {
    total: tecnicos.length,
    activos: tecnicosDisponibles.length,
    tecnicos: tecnicosDisponibles
  })

  useEffect(() => {
    Promise.all([fetchClientes(), fetchTecnicos()]).catch(error => {
      console.error('Error cargando clientes o técnicos:', error)
      notificationService.mostrarError(error, 'No se pudieron cargar los clientes y técnicos del formulario')
    })

    // Verificar si hay datos de orden pendiente
    const datosOrdenPendiente = localStorage.getItem('datosOrdenPendiente')
    if (datosOrdenPendiente) {
      const datos = JSON.parse(datosOrdenPendiente)

      // Guardar datos para uso posterior
      setDatosOrdenPendiente(datos)
    }
  }, [fetchClientes, fetchTecnicos])

  const [datosOrdenPendiente, setDatosOrdenPendiente] = useState(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm({
    defaultValues: {
      fechaVisita: getToday(),
      horaVisita: '09:00',
      ...(datosOrdenPendiente && {
        descripcionServicio: datosOrdenPendiente.descripcion,
        tecnicoAsignado: datosOrdenPendiente.tecnicoAsignado
      })
    }
  })

  // Auto-completar datos del cliente cuando se selecciona
  const handleClienteChange = (e) => {
    const clienteId = e.target.value
    if (clienteId) {
      const cliente = clientes.find(c => c.id === parseInt(clienteId))
      if (cliente) {
        setClienteSeleccionado(cliente)

        // Auto-llenar campos
        setValue('cliente', cliente.nombre)
        setValue('direccion', cliente.direccion || '')

        if (cliente.tipo === 'empresa' && cliente.contactoPrincipal) {
          setValue('contacto', cliente.contactoPrincipal.nombre || '')
          setValue('telefono', cliente.contactoPrincipal.telefono || '')
          setValue('email', cliente.contactoPrincipal.email || '')
        } else {
          setValue('contacto', cliente.nombre || '')
          setValue('telefono', cliente.telefono || '')
          setValue('email', cliente.email || '')
        }
      }
    } else {
      setClienteSeleccionado(null)
      setValue('cliente', '')
      setValue('direccion', '')
      setValue('contacto', '')
      setValue('telefono', '')
      setValue('email', '')
    }
  }


  const onSubmit = async (data) => {
    try {
      // Validar que al menos un técnico esté seleccionado
      if (tecnicosSeleccionados.length === 0) {
        MySwal.fire({
          title: 'Falta asignar técnicos',
          text: tecnicosDisponibles.length === 0
            ? 'No hay técnicos ni supervisores activos para asignar, así que la visita no se puede crear. Pide a un administrador que registre o active usuarios con rol Técnico o Supervisor en Usuarios.'
            : 'En «Detalles de la Visita», marca al menos una casilla en «Técnicos y/o Supervisor asignado» y vuelve a pulsar «Crear Visita Técnica».',
          icon: 'warning',
          confirmButtonColor: '#1e40af'
        })
        return
      }

      const visitaData = {
        cliente: data.cliente,
        clienteId: clienteSeleccionado?.id || null,
        direccion: data.direccion,
        contacto: data.contacto,
        telefono: data.telefono,
        email: data.email,
        fechaVisita: data.fechaVisita,
        horaVisita: data.horaVisita,
        tecnicosAsignados: tecnicosSeleccionados,
        tipoServicio: data.tipoServicio,
        descripcionServicio: data.descripcionServicio,
        observaciones: data.observaciones,
        solpe: data.solpe,
        nombreProyecto: data.nombreProyecto || null,
        solicitadoPor: user.name
      }

      const nuevaVisita = await createVisitaTecnica(visitaData)
      
      // Si hay datos de orden pendiente, guardar la relación
      if (datosOrdenPendiente) {
        // Guardar el ID de la visita técnica para cuando se cree la orden
        const datosActualizados = {
          ...datosOrdenPendiente,
          visitaTecnicaId: nuevaVisita.id
        }
        localStorage.setItem('datosOrdenPendiente', JSON.stringify(datosActualizados))
      }
      
      MySwal.fire({
        title: '¡Visita técnica creada!',
        text: `Se ha creado la visita técnica ${nuevaVisita.id}`,
        icon: 'success',
        confirmButtonColor: '#1e40af'
      })

      navigate(`/visitas-tecnicas/${nuevaVisita.id}`)
    } catch (error) {
      console.error('Error al crear visita técnica:', error)
      notificationService.mostrarError(
        error,
        data.cliente ? `No se pudo crear la visita técnica para «${data.cliente}»` : 'No se pudo crear la visita técnica'
      )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Nueva Visita Técnica</h1>
          <p className="text-sm sm:text-base text-gray-600">
            Programar una nueva visita técnica para evaluación
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Información del Cliente */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Información del Cliente
            </h2>
            
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cliente *
                </label>
                <select
                  className={`input-field ${errors.cliente ? 'border-red-500' : ''}`}
                  onChange={handleClienteChange}
                  defaultValue=""
                >
                  <option value="">Seleccione un cliente</option>
                  {clientes.filter(c => c.estado === 'activo').map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nombre} {cliente.tipo === 'empresa' ? '(Empresa)' : '(Persona)'} - {cliente.ruc || cliente.dni}
                    </option>
                  ))}
                </select>

                {/* Campo oculto para el nombre del cliente (required por el backend) */}
                <input
                  type="hidden"
                  {...register('cliente', {
                    required: 'Selecciona un cliente de la lista. Si no existe, créalo con «+ Crear nuevo cliente».'
                  })}
                />

                {errors.cliente && (
                  <p className="mt-1 text-sm text-red-600">{errors.cliente.message}</p>
                )}

                {/* Botón para crear nuevo cliente */}
                <button
                  type="button"
                  onClick={() => navigate('/clientes/nuevo')}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <span className="mr-1">+</span> Crear nuevo cliente
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección de la visita *
                </label>
                <input
                  type="text"
                  className={`input-field ${errors.direccion ? 'border-red-500' : ''}`}
                  placeholder="Dirección donde se realizará la visita"
                  {...register('direccion', { required: 'Escribe la dirección donde se hará la visita.' })}
                />
                {errors.direccion && (
                  <p className="mt-1 text-sm text-red-600">{errors.direccion.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Persona de contacto *
                  </label>
                  <input
                    type="text"
                    className={`input-field ${errors.contacto ? 'border-red-500' : ''}`}
                    placeholder="Nombre del contacto"
                    {...register('contacto', { required: 'Escribe el nombre de la persona de contacto en el lugar.' })}
                  />
                  {errors.contacto && (
                    <p className="mt-1 text-sm text-red-600">{errors.contacto.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono de contacto *
                  </label>
                  <input
                    type="tel"
                    className={`input-field ${errors.telefono ? 'border-red-500' : ''}`}
                    placeholder="Teléfono"
                    {...register('telefono', { required: 'Escribe un teléfono para coordinar la visita con el contacto.' })}
                  />
                  {errors.telefono && (
                    <p className="mt-1 text-sm text-red-600">{errors.telefono.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email de contacto
                </label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="email@ejemplo.com"
                  {...register('email')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Proyecto (opcional)
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Nombre o código del proyecto..."
                  {...register('nombreProyecto')}
                />
              </div>

              {/* Campo SOLPE solo para admin/supervisor */}
              {(user?.role === 'admin' || user?.role === 'supervisor') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SOLPE
                  </label>
                  <input
                    type="text"
                    className="input-field max-w-xs"
                    placeholder="Ej: 12345-67890-12345"
                    {...register('solpe', {
                      validate: (value) => {
                        if (!value) return true;
                        if (!/^[\d-]+$/.test(value)) return 'La SOLPE solo admite números y guiones: quita letras, espacios u otros signos.';
                        const sinGuiones = value.replace(/-/g, '');
                        if (sinGuiones.length > 15) return `La SOLPE tiene ${sinGuiones.length} dígitos y el máximo es 15 (los guiones no cuentan). Quita los dígitos sobrantes.`;
                        return true;
                      }
                    })}
                    onKeyDown={(e) => {
                      const allowed = /[\d\-]/.test(e.key) || ['Backspace','Delete','ArrowLeft','ArrowRight','Tab','Home','End'].includes(e.key) || e.ctrlKey || e.metaKey;
                      if (!allowed) {
                        e.preventDefault();
                        return;
                      }
                      if (/\d/.test(e.key)) {
                        const current = e.target.value.replace(/-/g, '');
                        if (current.length >= 15) e.preventDefault();
                      }
                    }}
                    onPaste={(e) => {
                      const paste = e.clipboardData.getData('text');
                      const cleaned = paste.replace(/[^\d-]/g, '');
                      const digitsOnly = cleaned.replace(/-/g, '');
                      const currentDigits = e.target.value.replace(/-/g, '').length;
                      if (digitsOnly.length + currentDigits > 15) e.preventDefault();
                    }}
                  />
                  {errors.solpe && (
                    <p className="mt-1 text-sm text-red-600">{errors.solpe.message}</p>
                  )}
                  <p className="mt-1 text-sm text-gray-500">
                    Solicitud de pedido (máx. 15 dígitos, guiones permitidos)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Detalles de la Visita */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Detalles de la Visita
            </h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de visita *
                  </label>
                  <input
                    type="date"
                    className={`input-field ${errors.fechaVisita ? 'border-red-500' : ''}`}
                    min={getToday()}
                    {...register('fechaVisita', { required: 'Elige la fecha en que se hará la visita.' })}
                  />
                  {errors.fechaVisita && (
                    <p className="mt-1 text-sm text-red-600">{errors.fechaVisita.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hora de visita *
                  </label>
                  <input
                    type="time"
                    className={`input-field ${errors.horaVisita ? 'border-red-500' : ''}`}
                    {...register('horaVisita', { required: 'Elige la hora en que se hará la visita.' })}
                  />
                  {errors.horaVisita && (
                    <p className="mt-1 text-sm text-red-600">{errors.horaVisita.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de servicio *
                </label>
                <select
                  className={`input-field ${errors.tipoServicio ? 'border-red-500' : ''}`}
                  {...register('tipoServicio', { required: 'Elige en la lista el tipo de servicio que necesita el cliente.' })}
                >
                  <option value="">Seleccione el tipo de servicio</option>
                  <option value="Mantenimiento Preventivo">Mantenimiento Preventivo</option>
                  <option value="Mantenimiento Correctivo">Mantenimiento Correctivo</option>
                  <option value="Inspección y Diagnóstico">Inspección y Diagnóstico</option>
                  <option value="Diagnóstico de Fallas">Diagnóstico de Fallas</option>
                  <option value="Inspección Especializada">Inspección Especializada</option>
                  <option value="Instalación">Instalación</option>
                  <option value="Reparación">Reparación</option>
                  <option value="Actualización">Actualización</option>
                  <option value="Consultoría Técnica">Consultoría Técnica</option>
                  <option value="Emergencia">Emergencia</option>
                  <option value="Otro">Otro</option>
                </select>
                {errors.tipoServicio && (
                  <p className="mt-1 text-sm text-red-600">{errors.tipoServicio.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Técnicos y/o Supervisor asignado *
                </label>
                <div className="space-y-2">
                  {tecnicosDisponibles.map((tecnico) => (
                    <label key={tecnico.id} className="flex items-center space-x-3 p-2 border rounded-lg hover:bg-gray-50">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={tecnicosSeleccionados.some(t => t.id === tecnico.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setTecnicosSeleccionados([...tecnicosSeleccionados, tecnico])
                          } else {
                            setTecnicosSeleccionados(tecnicosSeleccionados.filter(t => t.id !== tecnico.id))
                          }
                        }}
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900">{tecnico.nombre}</span>
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${getEspecialidadColor(tecnico.especialidad)}`}>
                          {tecnico.especialidad}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
                {tecnicosSeleccionados.length === 0 && (
                  <p className="mt-1 text-sm text-red-600">Marca al menos un técnico o supervisor para la visita.</p>
                )}
                {tecnicosSeleccionados.length > 0 && (
                  <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700 font-medium">
                      Seleccionados ({tecnicosSeleccionados.length}):
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {tecnicosSeleccionados.map((tecnico) => (
                        <span key={tecnico.id} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                          {tecnico.nombre ? tecnico.nombre.split(' - ')[0] : 'Sin nombre'}
                          <button
                            type="button"
                            onClick={() => setTecnicosSeleccionados(tecnicosSeleccionados.filter(t => t.id !== tecnico.id))}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Descripción del Servicio */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Descripción del Servicio
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción del servicio requerido *
              </label>
              <textarea
                className={`input-field ${errors.descripcionServicio ? 'border-red-500' : ''}`}
                rows="4"
                placeholder="Describa el servicio que el cliente requiere..."
                {...register('descripcionServicio', { 
                  required: 'Describe el servicio que requiere el cliente (mínimo 20 caracteres).',
                  minLength: { value: 20, message: 'La descripción es muy corta: escribe al menos 20 caracteres para que el técnico sepa qué revisar.' }
                })}
              />
              {errors.descripcionServicio && (
                <p className="mt-1 text-sm text-red-600">{errors.descripcionServicio.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observaciones adicionales
              </label>
              <textarea
                className="input-field"
                rows="3"
                placeholder="Información adicional relevante para la visita..."
                {...register('observaciones')}
              />
            </div>
          </div>
        </div>

        {/* Nota informativa */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-blue-400 text-xl">ℹ️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Siguiente paso: Registro en campo
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                Durante la visita técnica, el técnico podrá registrar el estado del lugar, 
                tomar fotografías, crear la lista de materiales y herramientas necesarias, 
                y generar una pre-cotización que será utilizada para crear el presupuesto formal.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => navigate('/visitas-tecnicas')}
            className="btn-secondary w-full sm:w-auto"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className={`btn-primary w-full sm:w-auto ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Creando...' : 'Crear Visita Técnica'}
          </button>
        </div>
      </form>
      
    </div>
  )
}

export default VisitaTecnicaNueva