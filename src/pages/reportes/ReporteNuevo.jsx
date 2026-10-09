import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import useReportesStore from '../../stores/reportesStore'
import useAuthStore from '../../stores/authStore'
import PhotoUpload from '../../components/ui/PhotoUpload'
import SelectorMateriales from '../../components/materiales/SelectorMateriales'
import { getCurrentTimestamp, getToday } from '../../utils/dateUtils'
import { aNumero } from '../../utils/numberInputUtils'
import notificationService from '../../services/notificationService'
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
  const [atsDocs, setAtsDocs] = useState([])
  const [aspectosAmbientalesDocs, setAspectosAmbientalesDocs] = useState([])
  const [ptrDocs, setPtrDocs] = useState([])
  const [materialesUtilizados, setMaterialesUtilizados] = useState([])
  const [instalacionSeleccionada, setInstalacionSeleccionada] = useState('')
  const [porcentajeAnterior, setPorcentajeAnterior] = useState(0)
  const [cargandoReportes, setCargandoReportes] = useState(false)

  // Limpiar blob URLs al desmontar para evitar memory leaks
  useEffect(() => {
    return () => {
      [atsDocs, ptrDocs, aspectosAmbientalesDocs].flat().forEach(doc => {
        if (doc?.url?.startsWith('blob:')) URL.revokeObjectURL(doc.url)
      })
    }
  }, [])

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
            text: `No se pueden crear nuevos reportes para la orden ${ordenId} porque su informe final ya fue firmado por el supervisor y quedó bloqueado. Si falta registrar algo, coordínalo con el supervisor o el administrador.`,
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
          notificationService.mostrarError(error, `No se pudieron cargar los reportes anteriores de la orden ${ordenId} (se usan para calcular el avance previo)`)
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

  // Un documento es un PDF o una imagen: en obra se adjunta tanto el escaneo
  // como la fotografía del papel tomada con el móvil. Sin tope de peso ni de
  // cantidad: una foto de móvil supera con facilidad cualquier límite fijo.
  const esDocumentoValido = (file) => file.type === 'application/pdf' || file.type.startsWith('image/')

  // Función para manejar la carga de múltiples documentos
  const handleDocumentUpload = (e, setDocuments, docType) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    const invalidType = files.find(f => !esDocumentoValido(f))
    if (invalidType) {
      MySwal.fire({
        title: 'Archivo no válido',
        text: `"${invalidType.name}" no es un PDF ni una imagen. En la sección ${docType === 'Aspectos' ? 'Aspectos Ambientales' : docType} solo se aceptan archivos PDF o imágenes (JPG, PNG, etc.). Conviértelo a uno de esos formatos o elige otro archivo.`,
        icon: 'warning',
        confirmButtonColor: '#1e40af'
      })
      e.target.value = ''
      return
    }

    const newDocs = files.map(file => ({
      file,
      name: file.name,
      type: file.type,
      size: file.size,
      url: URL.createObjectURL(file),
      fecha: getCurrentTimestamp()
    }))

    setDocuments(prev => [...prev, ...newDocs])
    e.target.value = '' // Reset input para permitir seleccionar los mismos archivos
  }

  // Función para eliminar un documento individual de la lista
  const handleRemoveDocument = (setDocuments, index) => {
    setDocuments(prev => {
      const removed = prev[index]
      if (removed?.url?.startsWith('blob:')) {
        URL.revokeObjectURL(removed.url)
      }
      return prev.filter((_, i) => i !== index)
    })
  }

  const onSubmit = async (data) => {
    // Etapa en curso y archivo que se estaba subiendo: permiten explicar con precisión qué falló
    let etapa = 'crear' // 'crear' | 'archivos' | 'recargar'
    let archivoEnCurso = ''
    let rollbackFallido = false
    try {
      // Validación de documentos obligatorios
      if (atsDocs.length === 0) {
        MySwal.fire({
          title: 'Falta el documento ATS',
          text: 'Todo reporte diario necesita al menos un documento ATS. Adjúntalo (PDF o imagen) en la sección "ATS (Analisis de Trabajo Seguro)" y vuelve a guardar el reporte.',
          icon: 'warning',
          confirmButtonColor: '#1e40af'
        })
        return
      }

      if (trabajoEnAltura && ptrDocs.length === 0) {
        MySwal.fire({
          title: 'Falta el documento PTR',
          text: 'Marcaste "Este trabajo incluye actividades en altura", así que debes adjuntar al menos un documento en la sección "PTR (Permiso de Trabajo de Riesgo)". Si no hubo trabajo en altura, desmarca esa opción.',
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
          // El campo de cantidad admite quedar vacío mientras se edita
          cantidad: aNumero(m.cantidad, 1),
          unidad: m.unidad || 'unidad'
        }))
      }

      const reporteCreado = await createReporte(reporteBaseData)
      const reporteId = reporteCreado.id

      // ========================================
      // OPCIÓN C: Transacción para fotos y documentos
      // Si falla algo después de crear el reporte, se elimina (rollback)
      // ========================================
      etapa = 'archivos'
      try {
        // PASO 2: Subir fotos ANTES (si existen)
        if (fotosAntes.length > 0) {
          archivoEnCurso = 'las fotos de "Fotos Antes del Trabajo"'
          await uploadReportPhotos(reporteId, fotosAntes, 'before')
        }

        // PASO 3: Subir fotos DESPUÉS (si existen)
        if (fotosDespues.length > 0) {
          archivoEnCurso = 'las fotos de "Fotos Después del Trabajo"'
          await uploadReportPhotos(reporteId, fotosDespues, 'after')
        }

        // PASO 4: Subir documentos ATS (múltiples)
        for (const doc of atsDocs) {
          if (doc.file) {
            archivoEnCurso = `el documento ATS "${doc.name}"`
            await uploadReportDocument(reporteId, doc.file, 'ats')
          }
        }

        // PASO 5: Subir documentos PTR (múltiples)
        for (const doc of ptrDocs) {
          if (doc.file) {
            archivoEnCurso = `el documento PTR "${doc.name}"`
            await uploadReportDocument(reporteId, doc.file, 'ptr')
          }
        }

        // PASO 6: Subir documentos Aspectos Ambientales (múltiples)
        for (const doc of aspectosAmbientalesDocs) {
          if (doc.file) {
            archivoEnCurso = `el documento de Aspectos Ambientales "${doc.name}"`
            await uploadReportDocument(reporteId, doc.file, 'environmental_aspects')
          }
        }
      } catch (uploadError) {
        // ROLLBACK: Si falla la subida de archivos, eliminar el reporte creado
        console.error('Error al subir archivos, ejecutando rollback:', uploadError)
        try {
          await deleteReporte(reporteId, ordenId)
          console.log('✅ Rollback ejecutado: reporte eliminado')
        } catch (rollbackError) {
          console.error('Error en rollback:', rollbackError)
          rollbackFallido = true
        }
        // Se relanza el error original para conservar el motivo real (servidor, conexión, validación...)
        throw uploadError
      }

      // PASO 7: Recargar datos
      etapa = 'recargar'
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
              ${atsDocs.length > 0 ? `<li>Documentos ATS: ${atsDocs.length} ✓</li>` : ''}
              ${ptrDocs.length > 0 ? `<li>Documentos PTR: ${ptrDocs.length} ✓</li>` : ''}
              ${aspectosAmbientalesDocs.length > 0 ? `<li>Documentos Aspectos Ambientales: ${aspectosAmbientalesDocs.length} ✓</li>` : ''}
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

      const ordenRef = ordenId || data.ordenId
      const deLaOrden = ordenRef ? ` de la orden ${ordenRef}` : ''
      const contextoPorEtapa = {
        crear: `No se pudo guardar el reporte diario${deLaOrden}`,
        archivos: rollbackFallido
          ? `No se pudo subir ${archivoEnCurso}. El reporte quedó guardado sin todos sus archivos: revísalo en la lista de reportes`
          : `No se pudo subir ${archivoEnCurso}, por eso el reporte no se guardó. Revisa ese archivo y vuelve a enviar el reporte`,
        recargar: `No se pudo recargar la lista de reportes${deLaOrden} (el reporte sí se guardó)`
      }
      notificationService.mostrarError(error, contextoPorEtapa[etapa])
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
              ATS (Analisis de Trabajo Seguro) *
            </h3>

            {/* Lista de documentos cargados */}
            {atsDocs.length > 0 && (
              <div className="space-y-2 mb-3">
                {atsDocs.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center min-w-0 flex-1">
                      <span className="text-green-600 mr-2 flex-shrink-0">&#10003;</span>
                      <p className="text-xs text-gray-700 truncate" title={doc.name}>{doc.name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveDocument(setAtsDocs, index)}
                      className="text-red-400 hover:text-red-600 ml-2 flex-shrink-0"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Zona de carga */}
            <div className="border-2 border-dashed rounded-lg p-4 text-center border-gray-300 bg-gray-50">
              <input
                type="file"
                id="ats-upload"
                className="hidden"
                accept=".pdf,image/*"
                multiple
                onChange={(e) => handleDocumentUpload(e, setAtsDocs, 'ATS')}
              />
              <label htmlFor="ats-upload" className="cursor-pointer">
                <span className="text-3xl text-gray-400 block mb-1">+</span>
                <span className="text-sm text-blue-600 hover:text-blue-800">
                  {atsDocs.length > 0 ? 'Agregar mas archivos' : 'Seleccionar Archivos'}
                </span>
              </label>
            </div>
          </div>

          {/* Aspectos Ambientales */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 md:p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Aspectos Ambientales
            </h3>

            {aspectosAmbientalesDocs.length > 0 && (
              <div className="space-y-2 mb-3">
                {aspectosAmbientalesDocs.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center min-w-0 flex-1">
                      <span className="text-green-600 mr-2 flex-shrink-0">&#10003;</span>
                      <p className="text-xs text-gray-700 truncate" title={doc.name}>{doc.name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveDocument(setAspectosAmbientalesDocs, index)}
                      className="text-red-400 hover:text-red-600 ml-2 flex-shrink-0"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="border-2 border-dashed rounded-lg p-4 text-center border-gray-300 bg-gray-50">
              <input
                type="file"
                id="aspectos-upload"
                className="hidden"
                accept=".pdf,image/*"
                multiple
                onChange={(e) => handleDocumentUpload(e, setAspectosAmbientalesDocs, 'Aspectos')}
              />
              <label htmlFor="aspectos-upload" className="cursor-pointer">
                <span className="text-3xl text-gray-400 block mb-1">+</span>
                <span className="text-sm text-blue-600 hover:text-blue-800">
                  {aspectosAmbientalesDocs.length > 0 ? 'Agregar mas archivos' : 'Seleccionar Archivos'}
                </span>
              </label>
            </div>
          </div>

          {/* PTR */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 md:p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              PTR (Permiso de Trabajo de Riesgo) {trabajoEnAltura && '*'}
            </h3>

            {ptrDocs.length > 0 && (
              <div className="space-y-2 mb-3">
                {ptrDocs.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center min-w-0 flex-1">
                      <span className="text-green-600 mr-2 flex-shrink-0">&#10003;</span>
                      <p className="text-xs text-gray-700 truncate" title={doc.name}>{doc.name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveDocument(setPtrDocs, index)}
                      className="text-red-400 hover:text-red-600 ml-2 flex-shrink-0"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className={`border-2 border-dashed rounded-lg p-4 text-center ${
              trabajoEnAltura && ptrDocs.length === 0 ? 'border-orange-300 bg-orange-50' : 'border-gray-300 bg-gray-50'
            }`}>
              <input
                type="file"
                id="ptr-upload"
                className="hidden"
                accept=".pdf,image/*"
                multiple
                onChange={(e) => handleDocumentUpload(e, setPtrDocs, 'PTR')}
              />
              <label htmlFor="ptr-upload" className="cursor-pointer">
                <span className="text-3xl text-gray-400 block mb-1">+</span>
                <span className="text-sm text-blue-600 hover:text-blue-800">
                  {ptrDocs.length > 0 ? 'Agregar mas archivos' : 'Seleccionar Archivos'}
                </span>
              </label>
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
              minLength: { value: 20, message: 'Describe el trabajo realizado con al menos 20 caracteres' }
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
              Puede agregar materiales manualmente o seleccionarlos del inventario.
              Los materiales del inventario se descontarán automáticamente del stock al guardar el reporte.
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