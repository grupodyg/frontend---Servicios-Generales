import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import useAuthStore from '../../stores/authStore'
import useHerramientasStore from '../../stores/herramientasStore'
import { canViewPrices } from '../../utils/permissionsUtils'
import { getToday } from '../../utils/dateUtils'
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

const MySwal = withReactContent(Swal)

const HerramientaNueva = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { createHerramienta, categorias, fetchCategorias } = useHerramientasStore()
  const [isLoading, setIsLoading] = useState(false)
  const [categoriasLoading, setCategoriasLoading] = useState(true)
  const [showMarcasModal, setShowMarcasModal] = useState(false)
  const [nuevaMarca, setNuevaMarca] = useState('')
  const [marcaEditando, setMarcaEditando] = useState(null)
  const [marcaEditandoNombre, setMarcaEditandoNombre] = useState('')
  const [marcasPersonalizadas, setMarcasPersonalizadas] = useState([])
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm({
    defaultValues: {
      cantidad: 1
    }
  })

  // Cargar categorías al montar el componente
  useEffect(() => {
    const cargarCategorias = async () => {
      try {
        setCategoriasLoading(true)
        await fetchCategorias()
      } catch (error) {
        console.error('Error cargando categorías:', error)
      } finally {
        setCategoriasLoading(false)
      }
    }
    cargarCategorias()
  }, [fetchCategorias])

  const marcasBase = [
    'Bosch', 'Makita', 'DeWalt', 'Stanley', 'Black & Decker',
    'Hilti', 'Milwaukee', 'Festool', 'Ryobi', 'Craftsman',
    'Fluke', 'Klein Tools', 'Irwin'
  ]

  // Combinar marcas base con marcas personalizadas
  const marcas = [...marcasBase, ...marcasPersonalizadas].sort()

  const handleAddMarca = async () => {
    if (!nuevaMarca.trim()) {
      MySwal.fire({
        title: 'Error',
        text: 'El nombre de la marca no puede estar vacío',
        icon: 'error',
        confirmButtonColor: '#1e40af'
      })
      return
    }

    const marcaExists = [...marcasBase, ...marcasPersonalizadas]
      .map(m => m.toLowerCase())
      .includes(nuevaMarca.trim().toLowerCase())

    if (marcaExists) {
      MySwal.fire({
        title: 'Error',
        text: 'Esta marca ya existe',
        icon: 'error',
        confirmButtonColor: '#1e40af'
      })
      return
    }

    try {
      const nuevasMarcas = [...marcasPersonalizadas, nuevaMarca.trim()]
      setMarcasPersonalizadas(nuevasMarcas)
      
      MySwal.fire({
        title: '¡Marca agregada!',
        text: `La marca "${nuevaMarca}" ha sido agregada correctamente`,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      })
      setNuevaMarca('')
    } catch (error) {
      MySwal.fire({
        title: 'Error',
        text: 'No se pudo agregar la marca',
        icon: 'error',
        confirmButtonColor: '#1e40af'
      })
    }
  }

  const handleEditMarca = async () => {
    if (!marcaEditandoNombre.trim()) {
      MySwal.fire({
        title: 'Error',
        text: 'El nombre de la marca no puede estar vacío',
        icon: 'error',
        confirmButtonColor: '#1e40af'
      })
      return
    }

    const marcaExists = [...marcasBase, ...marcasPersonalizadas.filter(m => m !== marcaEditando)]
      .map(m => m.toLowerCase())
      .includes(marcaEditandoNombre.trim().toLowerCase())

    if (marcaExists) {
      MySwal.fire({
        title: 'Error',
        text: 'Esta marca ya existe',
        icon: 'error',
        confirmButtonColor: '#1e40af'
      })
      return
    }

    try {
      const nuevasMarcas = marcasPersonalizadas.map(marca => 
        marca === marcaEditando ? marcaEditandoNombre.trim() : marca
      )
      setMarcasPersonalizadas(nuevasMarcas)
      
      MySwal.fire({
        title: '¡Marca actualizada!',
        text: 'La marca ha sido actualizada correctamente',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      })
      setMarcaEditando(null)
      setMarcaEditandoNombre('')
    } catch (error) {
      MySwal.fire({
        title: 'Error',
        text: 'No se pudo actualizar la marca',
        icon: 'error',
        confirmButtonColor: '#1e40af'
      })
    }
  }

  const handleDeleteMarca = async (marca) => {
    const result = await MySwal.fire({
      title: '¿Eliminar marca?',
      text: `Se eliminará la marca "${marca}". Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    })

    if (result.isConfirmed) {
      try {
        setMarcasPersonalizadas(marcasPersonalizadas.filter(m => m !== marca))
        MySwal.fire({
          title: '¡Marca eliminada!',
          text: 'La marca ha sido eliminada correctamente',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        })
      } catch (error) {
        MySwal.fire({
          title: 'Error',
          text: 'No se pudo eliminar la marca',
          icon: 'error',
          confirmButtonColor: '#1e40af'
        })
      }
    }
  }

  const startEditMarca = (marca) => {
    setMarcaEditando(marca)
    setMarcaEditandoNombre(marca)
  }

  const cancelEditMarca = () => {
    setMarcaEditando(null)
    setMarcaEditandoNombre('')
  }

  const onSubmit = async (data) => {
    setIsLoading(true)

    try {
      // Generar código automático
      const numeroAleatorio = Math.floor(Math.random() * 9000) + 1000
      const codigoGenerado = `HER-${numeroAleatorio}`

      const herramientaData = {
        ...data,
        codigo: codigoGenerado,
        categoriaId: data.categoriaId ? parseInt(data.categoriaId) : null,
        fechaAdmision: getToday(),
        creadoPor: user.name,
        estado: 'disponible'
      }

      console.log('Datos de herramienta a crear:', herramientaData)

      // Crear herramienta en la API
      const nuevaHerramienta = await createHerramienta(herramientaData)
      console.log('Herramienta creada:', nuevaHerramienta)

      MySwal.fire({
        title: '¡Herramienta creada!',
        html: `
          <div class="text-left">
            <p><strong>Nombre:</strong> ${data.nombre}</p>
            <p><strong>Código:</strong> ${codigoGenerado}</p>
            <p><strong>Marca:</strong> ${data.marca || 'No especificada'}</p>
            <p><strong>Cantidad:</strong> ${data.cantidad}</p>
            ${data.valor && canViewPrices(user) ? `<p><strong>Valor:</strong> S/ ${data.valor.toFixed(2)}</p>` : ''}
          </div>
        `,
        icon: 'success',
        confirmButtonColor: '#1e40af',
        confirmButtonText: 'Ver Herramientas'
      }).then(() => {
        navigate('/herramientas')
      })

    } catch (error) {
      console.error('Error creando herramienta:', error)
      MySwal.fire({
        title: 'Error',
        text: 'No se pudo crear la herramienta. Inténtalo de nuevo.',
        icon: 'error',
        confirmButtonColor: '#1e40af'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Nueva Herramienta</h1>
          <p className="text-gray-600 text-sm sm:text-base hidden sm:block">Agregar una nueva herramienta al inventario</p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/herramientas')}
          className="btn-secondary text-sm"
        >
          ← Volver
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Formulario Simple */}
        <div className="card max-w-2xl mx-auto p-3 sm:p-4 md:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">
            🔧 Información de la Herramienta
          </h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de la Herramienta *
              </label>
              <input
                type="text"
                className={`input-field ${errors.nombre ? 'border-red-500' : ''}`}
                placeholder="ej: Taladro eléctrico, Destornillador Phillips, Llave inglesa..."
                {...register('nombre', { 
                  required: 'El nombre de la herramienta es requerido',
                  minLength: { value: 3, message: 'Mínimo 3 caracteres' }
                })}
              />
              {errors.nombre && (
                <p className="mt-1 text-sm text-red-600">{errors.nombre.message}</p>
              )}
            </div>

            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-1">
                <label className="block text-sm font-medium text-gray-700">
                  Marca *
                </label>
                <button
                  type="button"
                  onClick={() => setShowMarcasModal(true)}
                  className="text-xs sm:text-sm px-2 sm:px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors"
                  title="Gestionar marcas"
                >
                  🏷️ Gestionar Marcas
                </button>
              </div>
              <select
                className={`input-field ${errors.marca ? 'border-red-500' : ''}`}
                {...register('marca', { required: 'La marca es requerida' })}
              >
                <option value="">Seleccionar marca...</option>
                {marcas.map(marca => (
                  <option key={marca} value={marca}>{marca}</option>
                ))}
              </select>
              {errors.marca && (
                <p className="mt-1 text-sm text-red-600">{errors.marca.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoría *
              </label>
              <select
                className={`input-field ${errors.categoriaId ? 'border-red-500' : ''}`}
                {...register('categoriaId', { required: 'La categoría es requerida' })}
                disabled={categoriasLoading}
              >
                <option value="">Seleccionar categoría...</option>
                {categorias.map(categoria => (
                  <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>
                ))}
              </select>
              {errors.categoriaId && (
                <p className="mt-1 text-sm text-red-600">{errors.categoriaId.message}</p>
              )}
              {categoriasLoading && (
                <p className="mt-1 text-xs text-gray-500">Cargando categorías...</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Modelo <span className="text-gray-500">(Opcional)</span>
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="ej: GSB 18V-21, Professional, HD201..."
                {...register('modelo')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cantidad *
              </label>
              <input
                type="number"
                min="1"
                className={`input-field ${errors.cantidad ? 'border-red-500' : ''}`}
                placeholder="1"
                {...register('cantidad', {
                  required: 'La cantidad es requerida',
                  valueAsNumber: true,
                  min: { value: 1, message: 'La cantidad debe ser al menos 1' }
                })}
              />
              {errors.cantidad && (
                <p className="mt-1 text-sm text-red-600">{errors.cantidad.message}</p>
              )}
            </div>

            {canViewPrices(user) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor (S/) <span className="text-gray-500">(Opcional)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={`input-field ${errors.valor ? 'border-red-500' : ''}`}
                  placeholder="0.00"
                  {...register('valor', {
                    valueAsNumber: true,
                    min: { value: 0, message: 'El valor no puede ser negativo' }
                  })}
                />
                {errors.valor && (
                  <p className="mt-1 text-sm text-red-600">{errors.valor.message}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  💡 Valor monetario de la herramienta para control de inventario
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex flex-col sm:flex-row justify-center gap-2 sm:space-x-4 max-w-2xl mx-auto">
          <button
            type="button"
            onClick={() => navigate('/herramientas')}
            className="btn-secondary text-sm"
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className={`btn-primary text-sm ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Creando...' : '🔧 Crear Herramienta'}
          </button>
        </div>
      </form>

      {/* Gestión de Marcas Modal */}
      {showMarcasModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                  🏷️ Gestión de Marcas
                </h3>
                <button
                  onClick={() => {
                    setShowMarcasModal(false)
                    setNuevaMarca('')
                    setMarcaEditando(null)
                    setMarcaEditandoNombre('')
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* Agregar nueva marca */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">
                  ➕ Agregar Nueva Marca
                </h4>
                <div className="flex flex-col sm:flex-row gap-2 sm:space-x-3">
                  <input
                    type="text"
                    value={nuevaMarca}
                    onChange={(e) => setNuevaMarca(e.target.value)}
                    placeholder="Nombre de la nueva marca..."
                    className="flex-1 input-field"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddMarca()}
                  />
                  <button
                    onClick={handleAddMarca}
                    className="btn-primary text-sm flex-shrink-0"
                    disabled={!nuevaMarca.trim()}
                  >
                    Agregar
                  </button>
                </div>
              </div>

              {/* Lista de marcas */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">
                  📋 Marcas Disponibles
                </h4>
                
                {/* Marcas predeterminadas */}
                {marcasBase.length > 0 && (
                  <div className="mb-4">
                    <h5 className="text-sm font-medium text-gray-600 mb-2">Marcas Predeterminadas ({marcasBase.length})</h5>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {marcasBase.map((marca) => (
                        <div key={marca} className="bg-gray-100 p-2 rounded-lg text-center">
                          <span className="text-xs sm:text-sm text-gray-700">{marca}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Marcas personalizadas */}
                {marcasPersonalizadas.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-600 mb-2">Marcas Personalizadas ({marcasPersonalizadas.length})</h5>
                    <div className="space-y-2">
                      {marcasPersonalizadas.map((marca) => (
                        <div key={marca} className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                          <div className="flex items-center justify-between">
                            {marcaEditando === marca ? (
                              // Edit mode
                              <div className="flex-1 flex space-x-3">
                                <input
                                  type="text"
                                  value={marcaEditandoNombre}
                                  onChange={(e) => setMarcaEditandoNombre(e.target.value)}
                                  className="flex-1 px-3 py-1 border border-gray-300 rounded-md"
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') handleEditMarca()
                                    if (e.key === 'Escape') cancelEditMarca()
                                  }}
                                  autoFocus
                                />
                                <div className="flex space-x-2">
                                  <button
                                    onClick={handleEditMarca}
                                    className="text-sm px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg transition-colors"
                                  >
                                    ✓
                                  </button>
                                  <button
                                    onClick={cancelEditMarca}
                                    className="text-sm px-3 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            ) : (
                              // Display mode
                              <>
                                <div className="flex-1 min-w-0">
                                  <span className="font-medium text-gray-900 text-sm">{marca}</span>
                                </div>
                                <div className="flex space-x-2 flex-shrink-0">
                                  <button
                                    onClick={() => startEditMarca(marca)}
                                    className="text-xs sm:text-sm px-2 sm:px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors"
                                    title="Editar marca"
                                  >
                                    ✏️ <span className="hidden sm:inline">Editar</span>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteMarca(marca)}
                                    className="text-xs sm:text-sm px-2 sm:px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors"
                                    title="Eliminar marca"
                                  >
                                    🗑️ <span className="hidden sm:inline">Eliminar</span>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {marcasPersonalizadas.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    No hay marcas personalizadas. Agrega una nueva marca usando el formulario de arriba.
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end pt-6 border-t mt-6">
                <button
                  onClick={() => {
                    setShowMarcasModal(false)
                    setNuevaMarca('')
                    setMarcaEditando(null)
                    setMarcaEditandoNombre('')
                  }}
                  className="btn-secondary"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HerramientaNueva