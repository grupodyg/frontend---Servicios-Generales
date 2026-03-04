import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import useAuthStore from '../../stores/authStore'
import useBoletasStore from '../../stores/boletasStore'
import useTecnicosStore from '../../stores/tecnicosStore'
import notificationService from '../../services/notificationService'
import { generarBoletaPDF } from '../../utils/boletaPDF'
import { hasAdminPermissions } from '../../utils/roleUtils'
import { getCurrentYear, getCurrentMonth } from '../../utils/dateUtils'

const Boletas = () => {
  const { user } = useAuthStore()
  const {
    boletas,
    isLoading,
    fetchBoletas,
    subirBoleta,
    uploadBoletaFile,
    marcarComoVista,
    obtenerBoletasPorEmpleado,
    obtenerBoletasPorPeriodo,
    eliminarBoleta,
    obtenerEstadisticas
  } = useBoletasStore()
  const { getTecnicosActivos, fetchTecnicos } = useTecnicosStore()

  const [filtroAño, setFiltroAño] = useState(getCurrentYear())
  const [filtroMes, setFiltroMes] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [boletaSeleccionada, setBoletaSeleccionada] = useState(null)
  const [formData, setFormData] = useState({
    empleadoId: '',
    empleadoNombre: '',
    cargo: '',
    mes: getCurrentMonth(),
    año: getCurrentYear(),
    salarioBase: '',
    horasExtras: 0,
    bonificaciones: 0,
    deducciones: 0,
    archivo: null
  })

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        await fetchBoletas()
        await fetchTecnicos()
      } catch (error) {
        console.error('Error cargando datos:', error)
      }
    }
    cargarDatos()
  }, [])

  // Cerrar modales con tecla Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (showModal) setShowModal(false)
        if (boletaSeleccionada) setBoletaSeleccionada(null)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [showModal, boletaSeleccionada])

  const estadisticas = obtenerEstadisticas()
  const isAdmin = hasAdminPermissions(user)
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  const tecnicosActivos = getTecnicosActivos()

  // Filtrar boletas
  const boletasFiltradas = (boletas || []).filter(boleta => {
    // Si no es admin, solo ver sus propias boletas
    if (!isAdmin && boleta.empleadoId !== user?.id) return false

    const matchAño = boleta.año === filtroAño
    const matchMes = filtroMes === 'todos' || boleta.mes === parseInt(filtroMes)
    const matchBusqueda = busqueda === '' ||
      (boleta.empleadoNombre && boleta.empleadoNombre.toLowerCase().includes(busqueda.toLowerCase())) ||
      (boleta.id && boleta.id.toString().toLowerCase().includes(busqueda.toLowerCase()))

    return matchAño && matchMes && matchBusqueda
  })

  const handleNuevaBoleta = () => {
    setFormData({
      empleadoId: '',
      empleadoNombre: '',
      cargo: '',
      mes: getCurrentMonth(),
      año: getCurrentYear(),
      salarioBase: '',
      horasExtras: 0,
      bonificaciones: 0,
      deducciones: 0,
      archivo: null
    })
    setShowModal(true)
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setFormData({
        ...formData,
        archivo: {
          file,
          nombre: file.name,
          tipo: file.type,
          tamaño: file.size,
          tamañoFormateado: (file.size / 1024).toFixed(2) + ' KB',
          url: URL.createObjectURL(file)
        }
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      // Calcular valor de la hora: (salarioBase / 30 dias) / 8 horas = salarioBase / 240
      const salarioBase = parseFloat(formData.salarioBase) || 0
      const horasExtras = parseInt(formData.horasExtras) || 0
      const bonificaciones = parseFloat(formData.bonificaciones) || 0
      const deducciones = parseFloat(formData.deducciones) || 0

      const valorHora = salarioBase / 240
      const montoHorasExtras = horasExtras * valorHora

      const montoNeto = salarioBase + bonificaciones + montoHorasExtras - deducciones

      // Subir archivo a S3 primero
      let archivoUrl = null
      let archivoNombre = null
      let archivoTamaño = null

      if (formData.archivo?.file) {
        const uploadResult = await uploadBoletaFile(formData.archivo.file)
        archivoUrl = uploadResult.url
        archivoNombre = uploadResult.name
        archivoTamaño = uploadResult.size
      }

      await subirBoleta({
        empleadoId: formData.empleadoId,
        empleadoNombre: formData.empleadoNombre,
        cargo: formData.cargo,
        mes: parseInt(formData.mes),
        año: parseInt(formData.año),
        periodo: `${formData.año}-${String(formData.mes).padStart(2, '0')}`,
        salarioBase: salarioBase,
        horasExtras: horasExtras,
        bonificaciones: bonificaciones,
        deducciones: deducciones,
        montoTotal: montoNeto,
        archivoUrl,
        archivoNombre,
        archivoTamaño
      })

      await notificationService.success(
        'Boleta subida',
        'La boleta de pago ha sido subida correctamente',
        2000
      )

      setShowModal(false)
    } catch (error) {
      await notificationService.error('Error', 'No se pudo subir la boleta')
    }
  }

  const handleVerBoleta = async (boleta) => {
    setBoletaSeleccionada(boleta)

    // Marcar como vista si el empleado está viendo su propia boleta
    const vistaPor = boleta.vistaPor || []
    if (!isAdmin && user?.id === boleta.empleadoId && !vistaPor.includes(user.id)) {
      await marcarComoVista(boleta.id, user.id)
    }
  }

  const handleEliminar = async (boleta) => {
    const result = await notificationService.confirm(
      '¿Eliminar boleta?',
      `¿Eliminar la boleta de ${boleta.empleadoNombre} de ${boleta.periodo}?`,
      'Eliminar',
      'Cancelar'
    )

    if (result.isConfirmed) {
      try {
        await eliminarBoleta(boleta.id)
        await notificationService.success('Boleta eliminada', 'La boleta se ha eliminado correctamente', 2000)
      } catch (error) {
        console.error('Error eliminando boleta:', error)
        await notificationService.error('Error', 'No se pudo eliminar la boleta')
      }
    }
  }

  const handleDescargarPDF = async (boleta) => {
    try {
      // Generar PDF con todos los datos de la boleta
      const blob = await generarBoletaPDF(boleta)

      // Crear URL temporal del Blob
      const url = URL.createObjectURL(blob)

      // Crear enlace temporal y descargar
      const link = document.createElement('a')
      link.href = url
      link.download = `Boleta_${boleta.periodo.replace(' ', '_')}_${boleta.empleadoNombre.replace(' ', '_')}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Limpiar URL después de la descarga
      setTimeout(() => URL.revokeObjectURL(url), 100)

      notificationService.success('PDF descargado', 'La boleta se ha descargado correctamente', 2000)
    } catch (error) {
      console.error('Error generando PDF:', error)
      notificationService.error('Error', 'No se pudo generar el PDF de la boleta')
    }
  }

  const getEstadoBadge = (boleta) => {
    const vistaPor = boleta.vistaPor || []
    if (isAdmin) {
      const visto = vistaPor.length > 0
      return (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          visto ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {visto ? 'Vista' : 'No vista'}
        </span>
      )
    } else {
      const vistaPorMi = vistaPor.includes(user?.id)
      return (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          vistaPorMi ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
        }`}>
          {vistaPorMi ? 'Vista' : 'Nueva'}
        </span>
      )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            {isAdmin ? 'Gestión de Boletas de Pago' : 'Mis Boletas de Pago'}
          </h1>
          <p className="text-sm text-gray-600">
            {isAdmin ? 'Administra las boletas de pago del personal' : 'Consulta tus boletas de pago mensuales'}
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleNuevaBoleta}
            className="btn-primary self-start sm:self-auto"
          >
            + Subir Boleta
          </button>
        )}
      </div>

      {/* Estadísticas - Solo para admin */}
      {isAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card bg-blue-50 border-blue-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Boletas</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-900">{estadisticas.total}</p>
              </div>
              <span className="text-2xl sm:text-3xl">📊</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card bg-yellow-50 border-yellow-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">No Vistas</p>
                <p className="text-xl sm:text-2xl font-bold text-yellow-900">{estadisticas.nuevas}</p>
              </div>
              <span className="text-2xl sm:text-3xl">👁️</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card bg-green-50 border-green-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Vistas</p>
                <p className="text-xl sm:text-2xl font-bold text-green-900">{estadisticas.vistas}</p>
              </div>
              <span className="text-2xl sm:text-3xl">✅</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card bg-purple-50 border-purple-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Este Mes</p>
                <p className="text-xl sm:text-2xl font-bold text-purple-900">{estadisticas.esteMes}</p>
              </div>
              <span className="text-2xl sm:text-3xl">📅</span>
            </div>
          </motion.div>
        </div>
      )}

      {/* Filtros */}
      <div className="card">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {isAdmin && (
            <div>
              <input
                type="text"
                placeholder="Buscar por técnico..."
                className="input-field"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          )}
          
          <div>
            <select
              className="input-field"
              value={filtroAño}
              onChange={(e) => setFiltroAño(parseInt(e.target.value))}
            >
              {Array.from({ length: 5 }, (_, i) => getCurrentYear() - i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          
          <div>
            <select
              className="input-field"
              value={filtroMes}
              onChange={(e) => setFiltroMes(e.target.value)}
            >
              <option value="todos">Todos los meses</option>
              {meses.map((mes, index) => (
                <option key={index} value={index + 1}>{mes}</option>
              ))}
            </select>
          </div>
          
          <div>
            <button
              onClick={() => {
                setBusqueda('')
                setFiltroMes('todos')
              }}
              className="btn-secondary w-full"
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      </div>

      {/* Lista de boletas - Mobile cards */}
      <div className="md:hidden space-y-3">
        {boletasFiltradas.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-gray-500">No se encontraron boletas con los filtros aplicados</p>
          </div>
        ) : (
          boletasFiltradas.map((boleta) => (
            <motion.div
              key={boleta.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs text-gray-500">{boleta.id}</span>
                {getEstadoBadge(boleta)}
              </div>
              {isAdmin && <p className="font-medium text-gray-900 mb-1">{boleta.empleadoNombre}</p>}
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">{boleta.periodo}</span>
                <span className="font-semibold text-green-600">S/ {(boleta.montoTotal || 0).toFixed(2)}</span>
              </div>
              <div className="text-xs text-gray-500 mb-2">
                {boleta.fechaCreacion ? new Date(boleta.fechaCreacion).toLocaleDateString() : 'N/A'}
              </div>
              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button onClick={() => handleVerBoleta(boleta)} className="text-blue-600 hover:text-blue-800 font-medium text-sm">Ver detalles</button>
                {isAdmin && (
                  <button onClick={() => handleEliminar(boleta)} className="text-red-600 hover:text-red-800 font-medium text-sm">Eliminar</button>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Lista de boletas - Desktop table */}
      <div className="hidden md:block card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">ID</th>
                {isAdmin && <th className="text-left py-3 px-4 font-medium text-gray-700">Técnico</th>}
                <th className="text-left py-3 px-4 font-medium text-gray-700">Periodo</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Monto Neto</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Estado</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Fecha Subida</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {boletasFiltradas.map((boleta) => (
                <motion.tr
                  key={boleta.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50"
                >
                  <td className="py-4 px-4">
                    <span className="font-mono text-sm">{boleta.id}</span>
                  </td>
                  {isAdmin && (
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{boleta.empleadoNombre}</p>
                      </div>
                    </td>
                  )}
                  <td className="py-4 px-4">
                    <span className="font-medium">{boleta.periodo}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="font-semibold text-green-600">
                      S/ {(boleta.montoTotal || 0).toFixed(2)}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    {getEstadoBadge(boleta)}
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-500">
                    {boleta.fechaCreacion ? new Date(boleta.fechaCreacion).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleVerBoleta(boleta)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                      >
                        Ver detalles
                      </button>

                      {isAdmin && (
                        <>
                          <span className="text-gray-300">|</span>
                          <button
                            onClick={() => handleEliminar(boleta)}
                            className="text-red-600 hover:text-red-800 font-medium text-sm"
                          >
                            Eliminar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {boletasFiltradas.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No se encontraron boletas con los filtros aplicados</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de nueva boleta - Solo admin */}
      {showModal && isAdmin && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Subir Nueva Boleta de Pago
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Técnico *
                  </label>
                  <select
                    className="input-field"
                    value={formData.empleadoId}
                    onChange={(e) => {
                      const selectedTecnico = tecnicosActivos.find(t => t.id.toString() === e.target.value)
                      setFormData({ 
                        ...formData, 
                        empleadoId: e.target.value,
                        empleadoNombre: selectedTecnico ? selectedTecnico.nombre : '',
                        cargo: selectedTecnico ? `Técnico ${selectedTecnico.especialidad}` : ''
                      })
                    }}
                    required
                  >
                    <option value="">Seleccionar técnico...</option>
                    {tecnicosActivos.map((tecnico) => (
                      <option key={tecnico.id} value={tecnico.id}>
                        {tecnico.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                
                {formData.empleadoId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cargo
                    </label>
                    <input
                      type="text"
                      className="input-field bg-gray-50"
                      value={formData.cargo}
                      readOnly
                    />
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mes *
                    </label>
                    <select
                      className="input-field"
                      value={formData.mes}
                      onChange={(e) => setFormData({ ...formData, mes: e.target.value })}
                      required
                    >
                      {meses.map((mes, index) => (
                        <option key={index} value={index + 1}>{mes}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Año *
                    </label>
                    <select
                      className="input-field"
                      value={formData.año}
                      onChange={(e) => setFormData({ ...formData, año: e.target.value })}
                      required
                    >
                      {Array.from({ length: 5 }, (_, i) => getCurrentYear() - i).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <h4 className="font-medium text-gray-900">Detalles del Pago</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Salario Base *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="input-field"
                        value={formData.salarioBase}
                        onChange={(e) => setFormData({ ...formData, salarioBase: e.target.value })}
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Horas Extras
                      </label>
                      <input
                        type="number"
                        className="input-field"
                        value={formData.horasExtras}
                        onChange={(e) => setFormData({ ...formData, horasExtras: e.target.value })}
                      />
                      {formData.horasExtras > 0 && formData.salarioBase > 0 && (
                        <p className="mt-1 text-sm text-green-600 font-medium">
                          + S/ {((parseFloat(formData.salarioBase) / 240) * parseFloat(formData.horasExtras)).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bonificaciones
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="input-field"
                        value={formData.bonificaciones}
                        onChange={(e) => setFormData({ ...formData, bonificaciones: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Deducciones
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="input-field"
                        value={formData.deducciones}
                        onChange={(e) => setFormData({ ...formData, deducciones: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Archivo PDF *
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="input-field"
                    required
                  />
                  {formData.archivo && (
                    <p className="mt-2 text-sm text-green-600">
                      ✓ {formData.archivo.nombre} ({formData.archivo.tamañoFormateado})
                    </p>
                  )}
                </div>
                
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Subiendo...' : 'Subir Boleta'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalles */}
      {boletaSeleccionada && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setBoletaSeleccionada(null)}
        >
          <div
            className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Boleta de Pago - {boletaSeleccionada.periodo}
                </h3>
                <button
                  onClick={() => setBoletaSeleccionada(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* Informacion del empleado */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Empleado</p>
                      <p className="text-gray-900 font-medium">{boletaSeleccionada.empleadoNombre}</p>
                    </div>
                    {boletaSeleccionada.cargo && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Cargo</p>
                        <p className="text-gray-900">{boletaSeleccionada.cargo}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-500">ID Boleta</p>
                      <p className="text-gray-900 font-mono">{boletaSeleccionada.id}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Periodo</p>
                      <p className="text-gray-900">{boletaSeleccionada.periodo}</p>
                    </div>
                  </div>

                  {/* Desglose de pagos */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-3">Detalle de Pago</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Salario Base:</span>
                        <span className="text-gray-900">S/ {(boletaSeleccionada.salarioBase || 0).toFixed(2)}</span>
                      </div>
                      {(boletaSeleccionada.horasExtras > 0) && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Horas Extras ({boletaSeleccionada.horasExtras}h):</span>
                          <span className="text-gray-900">S/ {((boletaSeleccionada.salarioBase / 240) * boletaSeleccionada.horasExtras).toFixed(2)}</span>
                        </div>
                      )}
                      {(boletaSeleccionada.bonificaciones > 0) && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Bonificaciones:</span>
                          <span className="text-green-600">+ S/ {(boletaSeleccionada.bonificaciones || 0).toFixed(2)}</span>
                        </div>
                      )}
                      {(boletaSeleccionada.deducciones > 0) && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Deducciones:</span>
                          <span className="text-red-600">- S/ {(boletaSeleccionada.deducciones || 0).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between">
                          <span className="font-medium text-blue-900">Total a Pagar:</span>
                          <span className="font-bold text-lg text-green-600">S/ {(boletaSeleccionada.montoTotal || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {isAdmin && (boletaSeleccionada.vistaPor || []).length > 0 && boletaSeleccionada.fechaVista && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-green-800">
                      Esta boleta fue vista por el empleado el {new Date(boletaSeleccionada.fechaVista).toLocaleDateString()}
                    </p>
                  </div>
                )}

                <div className="border-t pt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Archivo Adjunto</p>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📄</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{boletaSeleccionada.archivoNombre || 'boleta.pdf'}</p>
                          <p className="text-xs text-gray-500">{boletaSeleccionada.archivoTamaño ? `${(boletaSeleccionada.archivoTamaño / 1024).toFixed(2)} KB` : 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDescargarPDF(boletaSeleccionada)}
                      className="btn-primary"
                    >
                      Descargar PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Boletas