import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import useReportesStore from '../../stores/reportesStore'
import useAuthStore from '../../stores/authStore'
import PhotoUpload from '../../components/ui/PhotoUpload'
import SelectorMateriales from '../../components/materiales/SelectorMateriales'
import { getCurrentTimestamp, getToday } from '../../utils/dateUtils'
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

const MySwal = withReactContent(Swal)

const ReporteNuevo = () => {
  const { ordenId } = useParams()
  const navigate = useNavigate()
  const {
    createReporte,
    deleteReporte,
    uploadReportPhotos,
    uploadReportDocument,
    isLoading,
    puedeEditarReporte,
    getInstalacionesByEspecialidad,
    getReportesByOrdenId,
    fetchReportesByOrden
  } = useReportesStore()
  const { user } = useAuthStore()
  const [fotosAntes, setFotosAntes] = useState([])
  const [fotosDespues, setFotosDespues] = useState([])
  const [bloqueado, setBloqueado] = useState(false)
  const [trabajoEnAltura, setTrabajoEnAltura] = useState(false)
  const [atsDoc, setAtsDoc] = useState(null)
  const [aspectosAmbientalesDoc, setAspectosAmbientalesDoc] = useState(null)
  const [ptrDoc, setPtrDoc] = useState(null)
  const [materialesUtilizados, setMaterialesUtilizados] = useState([])
  const [instalacionSeleccionada, setInstalacionSeleccionada] = useState('')
  const [porcentajeAnterior, setPorcentajeAnterior] = useState(0)
  const [cargandoReportes, setCargandoReportes] = useState(false)

  // Obtener instalaciones basadas en la especialidad del técnico
  const instalaciones = getInstalacionesByEspecialidad(user?.especialidad || 'HVAC') || []

  // Inicializar useForm ANTES del useEffect
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm({
    defaultValues: {
      porcentajeAvance: 0,
      horaInicio: '08:00',
      horaFin: '17:00',
      ordenId: ordenId || ''
    }
  })

  // Verificar si puede editar y obtener porcentaje anterior
  useEffect(() => {
    const cargarDatos = async () => {
      if (ordenId) {
        // Verificar si puede editar
        const puedeEditar = puedeEditarReporte(ordenId)
        if (!puedeEditar) {
          setBloqueado(true)
          MySwal.fire({
            title: 'Informe bloqueado',
            text: 'No se pueden crear nuevos reportes porque el informe final ya ha sido firmado por el supervisor',
            icon: 'warning',
            confirmButtonColor: '#1e40af'
          }).then(() => {
            navigate('/reportes')
          })
          return
        }

        // Cargar reportes de la orden
        setCargandoReportes(true)
        try {
          await fetchReportesByOrden(ordenId)

          // Obtener el último reporte de esta orden
          const reportesOrden = getReportesByOrdenId(ordenId)
          if (reportesOrden && reportesOrden.length > 0) {
            // Ordenar por fecha y obtener el último
            const ultimoReporte = reportesOrden[reportesOrden.length - 1]
            const porcentajePrevio = ultimoReporte.porcentajeAvance || 0
            setPorcentajeAnterior(porcentajePrevio)
            setValue('porcentajeAvance', porcentajePrevio)
          } else {
            // Es el primer reporte, empieza en 0%
            setPorcentajeAnterior(0)
            setValue('porcentajeAvance', 0)
          }
        } catch (error) {
          console.error('Error al cargar reportes:', error)
        } finally {
          setCargandoReportes(false)
        }
      }
    }

    cargarDatos()
  }, [ordenId, puedeEditarReporte, navigate, getReportesByOrdenId, fetchReportesByOrden, setValue])

  const porcentajeAvance = watch('porcentajeAvance')
  const ordenSeleccionada = watch('ordenId')

  // Calcular el cambio en el porcentaje
  const cambioPorcentaje = porcentajeAvance - porcentajeAnterior

  // Función para manejar la carga de documentos
  const handleDocumentUpload = (e, setDocument, docType) => {
    const file = e.target.files[0]
    if (file) {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
      if (!allowedTypes.includes(file.type)) {
        MySwal.fire({
          title: 'Archivo no válido',
          text: 'Solo se permiten archivos PDF o imágenes (JPG, PNG)',
          icon: 'error',
          confirmButtonColor: '#1e40af'
        })
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        MySwal.fire({
          title: 'Archivo muy grande',
          text: 'El archivo no debe exceder 5MB',
          icon: 'error',
          confirmButtonColor: '#1e40af'
        })
        return
      }

      const fileData = {
        file: file,
        name: file.name,
        type: file.type,
        size: file.size,
        url: URL.createObjectURL(file),
        fecha: getCurrentTimestamp()
      }

      setDocument(fileData)
    }
  }

  const onSubmit = async (data) => {
    try {
      // Validación de documentos obligatorios
      if (!atsDoc || !atsDoc.file) {
        MySwal.fire({
          title: 'Documento requerido',
          text: 'El documento ATS es obligatorio',
          icon: 'warning',
          confirmButtonColor: '#1e40af'
        })
        return
      }

      if (trabajoEnAltura && (!ptrDoc || !ptrDoc.file)) {
        MySwal.fire({
          title: 'Documento requerido',
          text: 'El PTR es obligatorio cuando hay trabajo en altura',
          icon: 'warning',
          confirmButtonColor: '#1e40af'
        })
        return
      }

      // Mostrar loading
      MySwal.fire({
        title: 'Guardando reporte...',
        text: 'Por favor espere mientras se suben los archivos',
        icon: 'info',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
          MySwal.showLoading()
        }
      })

      // PASO 1: Crear reporte base (sin archivos)
      const reporteBaseData = {
        order_id: ordenId || data.ordenId || null,
        installation_id: instalacionSeleccionada || null,
        tecnico: user.name,
        fecha: getToday(),
        horasIniciales: data.horaInicio,
        horasFinales: data.horaFin,
        descripcion: data.descripcion,
        porcentajeAvance: data.porcentajeAvance,
        observaciones: data.observaciones || null,
        proximasTareas: data.proximasTareas || null,
        trabajoEnAltura: trabajoEnAltura,
        // OPCIÓN A: Incluir materiales utilizados
        materials: materialesUtilizados.map(m => ({
          nombre: m.nombre,
          cantidad: m.cantidad,
          unidad: m.unidad || 'unidad'
        }))
      }

      const reporteCreado = await createReporte(reporteBaseData)
      const reporteId = reporteCreado.id

      // ========================================
      // OPCIÓN C: Transacción para fotos y documentos
      // Si falla algo después de crear el reporte, se elimina (rollback)
      // ========================================
      try {
        // PASO 2: Subir fotos ANTES (si existen)
        if (fotosAntes.length > 0) {
          await uploadReportPhotos(reporteId, fotosAntes, 'before')
        }

        // PASO 3: Subir fotos DESPUÉS (si existen)
        if (fotosDespues.length > 0) {
          await uploadReportPhotos(reporteId, fotosDespues, 'after')
        }

        // PASO 4: Subir documento ATS
        if (atsDoc && atsDoc.file) {
          await uploadReportDocument(reporteId, atsDoc.file, 'ats')
        }

        // PASO 5: Subir documento PTR (si existe)
        if (ptrDoc && ptrDoc.file) {
          await uploadReportDocument(reporteId, ptrDoc.file, 'ptr')
        }

        // PASO 6: Subir documento Aspectos Ambientales (si existe)
        if (aspectosAmbientalesDoc && aspectosAmbientalesDoc.file) {
          await uploadReportDocument(reporteId, aspectosAmbientalesDoc.file, 'environmental_aspects')
        }
      } catch (uploadError) {
        // ROLLBACK: Si falla la subida de archivos, eliminar el reporte creado
        console.error('Error al subir archivos, ejecutando rollback:', uploadError)
        try {
          await deleteReporte(reporteId, ordenId)
          console.log('✅ Rollback ejecutado: reporte eliminado')
        } catch (rollbackError) {
          console.error('Error en rollback:', rollbackError)
        }
        throw new Error('Error al subir archivos: ' + uploadError.message + '. El reporte no fue guardado.')
      }

      // PASO 7: Recargar datos
      if (ordenId) {
        await fetchReportesByOrden(ordenId)
      }

      // Cerrar loading y mostrar éxito
      MySwal.close()

      MySwal.fire({
        title: '¡Reporte creado!',
        html: `
          <div class="text-left">
            <p class="mb-2">El reporte y todos sus archivos han sido guardados exitosamente:</p>
            <ul class="list-disc list-inside text-sm text-gray-700">
              <li>Reporte base: ✓</li>
              ${fotosAntes.length > 0 ? `<li>Fotos antes: ${fotosAntes.length} ✓</li>` : ''}
              ${fotosDespues.length > 0 ? `<li>Fotos después: ${fotosDespues.length} ✓</li>` : ''}
              ${atsDoc ? '<li>Documento ATS: ✓</li>' : ''}
              ${ptrDoc ? '<li>Documento PTR: ✓</li>' : ''}
              ${aspectosAmbientalesDoc ? '<li>Documento Aspectos Ambientales: ✓</li>' : ''}
              ${materialesUtilizados.length > 0 ? `<li>Materiales: ${materialesUtilizados.length} ✓</li>` : ''}
            </ul>
          </div>
        `,
        icon: 'success',
        confirmButtonColor: '#1e40af'
      })

      navigate('/reportes')
    } catch (error) {
      console.error('Error completo al guardar reporte:', error)

      MySwal.close()

      MySwal.fire({
        title: 'Error al guardar',
        text: error.message || 'No se pudo crear el reporte. Por favor, intente nuevamente.',
        icon: 'error',
        confirmButtonColor: '#1e40af'
      })
    }
  }

  // Mostrar indicador de carga mientras se obtienen los datos
  if (cargandoReportes) {
    return (
      <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Cargando datos del último reporte...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Nuevo Reporte Diario</h1>
        {porcentajeAnterior > 0 && (
          <p className="text-sm text-gray-600 mt-1">
            Continuando desde el último reporte con {porcentajeAnterior}% de avance
          </p>
        )}
        {porcentajeAnterior === 0 && ordenId && (
          <p className="text-sm text-gray-600 mt-1">
            Este es el primer reporte de esta orden de trabajo
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
        {/* Información General */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 md:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Información General</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Hora de Inicio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hora de Inicio *
              </label>
              <input
                type="time"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...register('horaInicio', { required: 'Hora de inicio requerida' })}
              />
              {errors.horaInicio && (
                <p className="mt-1 text-sm text-red-600">{errors.horaInicio.message}</p>
              )}
            </div>

            {/* Hora de Fin */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hora de Fin *
              </label>
              <input
                type="time"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...register('horaFin', { required: 'Hora de fin requerida' })}
              />
              {errors.horaFin && (
                <p className="mt-1 text-sm text-red-600">{errors.horaFin.message}</p>
              )}
            </div>

            {/* Porcentaje de Avance */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Porcentaje de Avance *
              </label>

              {/* Información del porcentaje anterior */}
              <div className="mb-3 p-3 bg-gray-50 rounded-md border border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    Avance del último reporte:
                  </span>
                  <span className="font-semibold text-gray-900">
                    {porcentajeAnterior}%
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">0</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  className="flex-1"
                  {...register('porcentajeAvance', {
                    required: 'Porcentaje requerido',
                    valueAsNumber: true
                  })}
                />
                <span className="text-sm text-gray-500">100%</span>
                <span className="text-lg font-bold text-blue-600 min-w-[50px] text-right">
                  {porcentajeAvance}%
                </span>
              </div>

              {/* Indicador de cambio */}
              {cambioPorcentaje !== 0 && (
                <div className={`mt-3 p-3 rounded-md border ${
                  cambioPorcentaje > 0
                    ? 'bg-green-50 border-green-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <div className="flex items-center space-x-2">
                    {cambioPorcentaje > 0 ? (
                      <>
                        <span className="text-green-600 text-xl">↑</span>
                        <span className="text-sm font-medium text-green-800">
                          Incremento de {cambioPorcentaje}%
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-yellow-600 text-xl">↓</span>
                        <span className="text-sm font-medium text-yellow-800">
                          Reducción de {Math.abs(cambioPorcentaje)}%
                        </span>
                      </>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-gray-600">
                    {cambioPorcentaje > 0
                      ? 'Se registra un avance positivo en el proyecto'
                      : 'Se registra una reducción en el avance. Considera documentar el motivo en observaciones.'
                    }
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Seguridad y Medio Ambiente */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <span className="text-yellow-600 text-xl">⚠️</span>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="mr-2 w-4 h-4 text-yellow-600 border-yellow-300 rounded focus:ring-yellow-500"
                {...register('trabajoEnAltura')}
                onChange={(e) => setTrabajoEnAltura(e.target.checked)}
              />
              <span className="font-medium text-gray-800">
                Este trabajo incluye actividades en altura
              </span>
            </label>
          </div>
          <p className="text-sm text-gray-600 mt-2 ml-8">
            Marque esta opción si realizó trabajos a más de 1.8 metros de altura
          </p>
        </div>

        {/* Documentos ATS, Aspectos Ambientales y PTR */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {/* ATS */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 md:p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              📋 ATS (Análisis de Trabajo Seguro) *
            </h3>
            <div className={`border-2 border-dashed rounded-lg p-4 sm:p-6 md:p-8 text-center ${
              atsDoc ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-gray-50'
            }`}>
              {atsDoc ? (
                <div className="space-y-2">
                  <span className="text-green-600 text-xl sm:text-2xl">✓</span>
                  <p className="text-sm font-medium text-gray-700 break-all line-clamp-2" title={atsDoc.name}>
                    {atsDoc.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => setAtsDoc(null)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Eliminar
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="file"
                    id="ats-upload"
                    className="hidden"
                    accept=".pdf,image/*"
                    onChange={(e) => handleDocumentUpload(e, setAtsDoc, 'ATS')}
                  />
                  <label htmlFor="ats-upload" className="cursor-pointer">
                    <span className="text-4xl text-gray-400 block mb-2">📎</span>
                    <span className="text-sm text-blue-600 hover:text-blue-800">
                      Seleccionar Archivo
                    </span>
                  </label>
                </>
              )}
            </div>
          </div>

          {/* Aspectos Ambientales */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 md:p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              🌱 Aspectos Ambientales
            </h3>
            <div className={`border-2 border-dashed rounded-lg p-4 sm:p-6 md:p-8 text-center ${
              aspectosAmbientalesDoc ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-gray-50'
            }`}>
              {aspectosAmbientalesDoc ? (
                <div className="space-y-2">
                  <span className="text-green-600 text-2xl">✓</span>
                  <p className="text-sm font-medium text-gray-700 break-all line-clamp-2" title={aspectosAmbientalesDoc.name}>
                    {aspectosAmbientalesDoc.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => setAspectosAmbientalesDoc(null)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Eliminar
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="file"
                    id="aspectos-upload"
                    className="hidden"
                    accept=".pdf,image/*"
                    onChange={(e) => handleDocumentUpload(e, setAspectosAmbientalesDoc, 'Aspectos')}
                  />
                  <label htmlFor="aspectos-upload" className="cursor-pointer">
                    <span className="text-4xl text-gray-400 block mb-2">📎</span>
                    <span className="text-sm text-blue-600 hover:text-blue-800">
                      Seleccionar Archivo
                    </span>
                  </label>
                </>
              )}
            </div>
          </div>

          {/* PTR */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 md:p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              ⚠️ PTR (Permiso de Trabajo de Riesgo) {trabajoEnAltura && '*'}
            </h3>
            <div className={`border-2 border-dashed rounded-lg p-4 sm:p-6 md:p-8 text-center ${
              ptrDoc ? 'border-green-300 bg-green-50' : 
              trabajoEnAltura ? 'border-orange-300 bg-orange-50' : 
              'border-gray-300 bg-gray-50'
            }`}>
              {ptrDoc ? (
                <div className="space-y-2">
                  <span className="text-green-600 text-2xl">✓</span>
                  <p className="text-sm font-medium text-gray-700 break-all line-clamp-2" title={ptrDoc.name}>
                    {ptrDoc.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => setPtrDoc(null)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Eliminar
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="file"
                    id="ptr-upload"
                    className="hidden"
                    accept=".pdf,image/*"
                    onChange={(e) => handleDocumentUpload(e, setPtrDoc, 'PTR')}
                  />
                  <label htmlFor="ptr-upload" className="cursor-pointer">
                    <span className="text-4xl text-gray-400 block mb-2">📎</span>
                    <span className="text-sm text-blue-600 hover:text-blue-800">
                      Seleccionar Archivo
                    </span>
                  </label>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Nota informativa */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Nota:</strong> En el informe final, todos estos campos serán obligatorios. 
            Completarlos ahora facilitará la generación del informe.
          </p>
        </div>

        {/* Descripción del Trabajo */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 md:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
            Descripción del Trabajo Realizado
          </h2>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="5"
            placeholder="Describa detalladamente el trabajo realizado durante el día..."
            {...register('descripcion', { 
              required: 'La descripción es requerida',
              minLength: { value: 20, message: 'Mínimo 20 caracteres' }
            })}
          />
          {errors.descripcion && (
            <p className="mt-1 text-sm text-red-600">{errors.descripcion.message}</p>
          )}
        </div>

        {/* Observaciones y Próximas Tareas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 md:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
              Observaciones
            </h2>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="4"
              placeholder="Observaciones generales..."
              {...register('observaciones')}
            />
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 md:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
              Próximas Tareas
            </h2>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="4"
              placeholder="Tareas pendientes para realizar..."
              {...register('proximasTareas')}
            />
          </div>
        </div>

        {/* Materiales Utilizados */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 md:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
            🧱 Materiales Utilizados
          </h2>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              Seleccione los materiales del inventario. Los materiales seleccionados se descontarán 
              automáticamente del inventario cuando se guarde el reporte.
            </p>
          </div>

          <SelectorMateriales
            materialesSeleccionados={materialesUtilizados}
            onMaterialesChange={setMaterialesUtilizados}
          />
        </div>

        {/* Fotografías */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Fotos Antes */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 md:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
              📷 Fotos Antes del Trabajo
            </h2>
            <PhotoUpload
              photos={fotosAntes}
              onPhotosChange={setFotosAntes}
              label="Agregar fotos del estado inicial"
              maxPhotos={8}
            />
          </div>

          {/* Fotos Después */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 md:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
              📷 Fotos Después del Trabajo
            </h2>
            <PhotoUpload
              photos={fotosDespues}
              onPhotosChange={setFotosDespues}
              label="Agregar fotos del trabajo terminado"
              maxPhotos={8}
            />
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-4 pt-4 sm:pt-6">
          <button
            type="button"
            onClick={() => navigate('/reportes')}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 w-full sm:w-auto"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
          >
            {isLoading ? 'Guardando...' : 'Guardar Reporte'}
          </button>
        </div>
      </form>

      {/* Sección de Ayuda */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">
          💡 Consejos para un buen reporte
        </h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Describe detalladamente el trabajo realizado</li>
          <li>• Incluye fotos antes y después para documentar el progreso</li>
          <li>• Especifica materiales utilizados con cantidades exactas</li>
          <li>• Anota cualquier problema o observación importante</li>
          <li>• Actualiza el porcentaje de avance de forma realista</li>
        </ul>
      </div>
    </div>
  )
}

export default ReporteNuevo