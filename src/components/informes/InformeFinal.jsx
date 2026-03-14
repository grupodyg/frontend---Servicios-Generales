import { useState, useEffect, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { pdf } from '@react-pdf/renderer'
import useReportesStore from '../../stores/reportesStore'
import useAuthStore from '../../stores/authStore'
import useOrdenesStore from '../../stores/ordenesStore'
import useVisitasTecnicasStore from '../../stores/visitasTecnicasStore'
import notificationService from '../../services/notificationService'
import useComunicacionesStore from '../../stores/comunicacionesStore'
import FormularioInformeFinal from '../reportes/FormularioInformeFinal'
import InformeFinalPDF from '../../utils/informeFinalPDF'
import { getCurrentDate, getCurrentTimestamp, getToday, formatDate, formatDateTime } from '../../utils/dateUtils'
import ReporteFotograficoEstandar from '../../utils/reporteFotograficoEstandar'
import SignatureCanvas from '../common/SignatureCanvas'
import { getFileUrl } from '../../config/api'

const InformeFinal = ({ ordenId, onClose }) => {
  const { user } = useAuthStore()
  const {
    getInformeFinalByOrden,
    generarInformeFinal,
    firmarInforme,
    fetchReportesByOrden,
    reportes,
    isLoading
  } = useReportesStore()
  const { getOrdenById, fetchOrdenes } = useOrdenesStore()
  const { visitas, fetchVisitas } = useVisitasTecnicasStore()
  const { crearCorreoSalida } = useComunicacionesStore()

  const [informeFinal, setInformeFinal] = useState(null)
  const [visitaTecnica, setVisitaTecnica] = useState(null)
  const [showFirmaModal, setShowFirmaModal] = useState(false)
  const [firmaComentarios, setFirmaComentarios] = useState('')
  const [firmaGrafica, setFirmaGrafica] = useState(null)
  const [firmando, setFirmando] = useState(false)
  const [expandedReporte, setExpandedReporte] = useState(null)
  const [showCorreoModal, setShowCorreoModal] = useState(false)
  const [correoData, setCorreoData] = useState({
    destinatario: '',
    asunto: '',
    mensaje: '',
    adjuntarPDF: true
  })
  const [showFormularioInformeFinal, setShowFormularioInformeFinal] = useState(false)
  const [generandoPDF, setGenerandoPDF] = useState(false)
  const [generandoInforme, setGenerandoInforme] = useState(false)
  const [generandoPDFSimple, setGenerandoPDFSimple] = useState(false)
  const [generandoPDFDG, setGenerandoPDFDG] = useState(false)

  const orden = getOrdenById(ordenId)

  useEffect(() => {
    const loadInforme = async () => {
      // Sincronizar informe final desde el store (con lazy loading)
      const informe = await getInformeFinalByOrden(ordenId)
      setInformeFinal(informe)
    }

    loadInforme()

    // Sincronizar visita técnica desde el store (sin fetch)
    if (orden?.visitaTecnicaId && visitas.length > 0) {
      const visita = visitas.find(v => v.id === orden.visitaTecnicaId)
      if (visita) {
        setVisitaTecnica(visita)
      }
    }
  }, [ordenId, getInformeFinalByOrden, orden?.visitaTecnicaId, visitas])

  // Función para descargar documentos por tipo
  const handleDownloadDocumentsByType = async (tipo) => {
    const reportesOrden = reportes[ordenId] || []
    const documentos = []
    
    // Recopilar documentos según el tipo
    reportesOrden.forEach((reporte, index) => {
      let documento = null
      let nombreArchivo = ''
      
      switch(tipo) {
        case 'ats':
          documento = reporte.atsDoc
          nombreArchivo = `ATS_Reporte_${index + 1}_${reporte.fecha || ''}.pdf`
          break
        case 'ptr':
          documento = reporte.ptrDoc
          nombreArchivo = `PTR_Reporte_${index + 1}_${reporte.fecha || ''}.pdf`
          break
        case 'aspectos':
          documento = reporte.aspectosAmbientalesDoc
          nombreArchivo = `AspectosAmbientales_Reporte_${index + 1}_${reporte.fecha || ''}.pdf`
          break
      }

      if (documento) {
        documentos.push({
          url: documento.url || documento,
          nombre: documento.nombre || documento.name || nombreArchivo,
          reporteIndex: index + 1,
          fecha: reporte.fecha
        })
      }
    })
    
    if (documentos.length === 0) {
      await notificationService.warning(
        'Sin documentos',
        `No hay documentos ${tipo === 'ats' ? 'ATS' : tipo === 'ptr' ? 'PTR' : 'de Aspectos Ambientales'} disponibles para descargar`,
        3000
      )
      return
    }
    
    // Descargar cada documento
    for (const doc of documentos) {
      try {
        // Crear un enlace temporal para descargar
        const link = document.createElement('a')
        link.href = getFileUrl(doc.url)
        link.download = doc.nombre
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        // Pequeña pausa entre descargas para evitar bloqueos del navegador
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        console.error(`Error descargando ${doc.nombre}:`, error)
      }
    }
    
    await notificationService.success(
      'Descarga iniciada',
      `Se están descargando ${documentos.length} documento(s) ${tipo === 'ats' ? 'ATS' : tipo === 'ptr' ? 'PTR' : 'de Aspectos Ambientales'}`,
      3000
    )
  }

  const handleGenerarInforme = async () => {
    try {
      // Validar que exista al menos un reporte con 100% de avance
      const reportesOrden = reportes[ordenId] || []
      const reporteCompleto = reportesOrden.find(r => r.porcentajeAvance >= 100)

      if (!reporteCompleto) {
        await notificationService.warning(
          'Reporte incompleto',
          'Para generar el informe final, debe existir al menos un reporte con 100% de avance.',
          4000
        )
        return
      }

      const result = await notificationService.confirm(
        '¿Generar Informe Final?',
        'Se recopilará toda la información de los reportes realizados para esta orden. La orden se marcará como completada.',
        'Generar',
        'Cancelar'
      )

      if (result.isConfirmed) {
        setGenerandoInforme(true)
        const nuevoInforme = await generarInformeFinal(ordenId)
        setInformeFinal(nuevoInforme)

        // Refrescar las órdenes para actualizar el estado en la UI
        await fetchOrdenes()

        setGenerandoInforme(false)

        await notificationService.success(
          'Informe generado',
          'El informe final ha sido creado exitosamente y la orden ha sido marcada como completada.',
          3000
        )
      }
    } catch (error) {
      setGenerandoInforme(false)
      await notificationService.error(
        'Error',
        error.message || 'No se pudo generar el informe final'
      )
    }
  }

  const handleFirmar = async () => {
    try {
      // Validar que exista la firma gráfica
      if (!firmaGrafica) {
        await notificationService.warning(
          'Firma requerida',
          'Por favor dibuja tu firma en el recuadro antes de continuar'
        )
        return
      }

      setFirmando(true)

      const tipoFirma =
        user.role === 'tecnico' ? 'tecnico' :
        user.role === 'supervisor' ? 'supervisor' :
        user.role === 'admin' ? 'administrador' : null

      if (!tipoFirma) {
        throw new Error('No tienes permisos para firmar este informe')
      }

      const informeActualizado = await firmarInforme(informeFinal.id, tipoFirma, {
        nombre: user.name,
        comentarios: firmaComentarios,
        firmaGrafica: firmaGrafica // Enviar la firma gráfica en base64
      })

      setInformeFinal(informeActualizado)
      setShowFirmaModal(false)
      setFirmaComentarios('')
      setFirmaGrafica(null)

      await notificationService.success(
        'Informe firmado',
        'Tu firma ha sido registrada exitosamente',
        2000
      )

      // TODO: Implementar notificaciones al siguiente nivel cuando se agregue endpoint de usuarios por rol
      // Actualmente el sistema de notificaciones requiere user_id específico
      // Se necesita:
      // 1. Endpoint para obtener usuarios por rol (supervisor/admin)
      // 2. Crear notificación para cada usuario del rol correspondiente

      console.info('✅ Firma registrada exitosamente:', {
        tipo: tipoFirma,
        usuario: user.name,
        informeId: informeFinal.id,
        ordenId,
        firmaGraficaCapturada: !!firmaGrafica
      })
    } catch (error) {
      await notificationService.error(
        'Error',
        error.message || 'No se pudo firmar el informe'
      )
    } finally {
      setFirmando(false)
    }
  }

  const handleGenerarInformeDG = async () => {
    // Verificar que el informe esté completado
    if (!informeFinal || informeFinal.estado !== 'completado') {
      notificationService.warning(
        'Informe no completado',
        'El informe debe estar completamente firmado antes de poder generar el informe D&G'
      )
      return
    }

    // Preguntar si desea llenar el formulario
    const result = await notificationService.confirm(
      '¿Desea llenar el formulario?',
      'Puede completar información adicional para el informe o generar uno estándar con los datos actuales.',
      'Sí, llenar formulario',
      'No, generar estándar'
    )

    if (result.isConfirmed) {
      // Usuario eligió SÍ - Abrir el formulario
      setShowFormularioInformeFinal(true)
    } else if (result.isDismissed) {
      // Usuario eligió NO - Generar PDF estándar directamente
      await handleGenerarPDFEstandar()
    }
  }

  const handleGenerarPDFEstandar = async () => {
    try {
      setGenerandoPDF(true)

      // Obtener reportes de la orden
      const reportesOrden = reportes[ordenId] || []

      // Generar el PDF de Reporte Fotográfico Estándar
      const pdfDocument = <ReporteFotograficoEstandar
        ordenData={orden}
        reportes={reportesOrden}
      />

      const asPdf = pdf(pdfDocument)
      const blob = await asPdf.toBlob()

      // Descargar el PDF con formato de nombre similar al ejemplo
      const ahora = getCurrentDate()
      const nombreArchivo = `Reporte_${ahora.getFullYear()}${String(ahora.getMonth() + 1).padStart(2, '0')}${String(ahora.getDate()).padStart(2, '0')}_${String(ahora.getHours()).padStart(2, '0')}${String(ahora.getMinutes()).padStart(2, '0')}${String(ahora.getSeconds()).padStart(2, '0')}.pdf`

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = nombreArchivo
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      await notificationService.success(
        'Reporte Generado',
        'El reporte fotográfico estándar ha sido descargado exitosamente',
        3000
      )
    } catch (error) {
      console.error('Error generando reporte estándar:', error)
      await notificationService.error(
        'Error',
        'No se pudo generar el reporte fotográfico'
      )
    } finally {
      setGenerandoPDF(false)
    }
  }

  const handleGenerarPDFConFormulario = async (formularioData) => {
    try {
      setGenerandoPDF(true)

      // Obtener reportes de la orden
      const reportesOrden = reportes[ordenId] || []

      // Obtener materiales utilizados de todos los reportes
      const todosLosMateriales = reportesOrden.reduce((acc, rep) => {
        if (rep.materialesUtilizados && Array.isArray(rep.materialesUtilizados)) {
          return [...acc, ...rep.materialesUtilizados]
        }
        return acc
      }, [])

      // Obtener información del contacto del cliente (esto debería venir de clientesStore)
      const clienteContacto = {
        nombre: orden?.contactoPrincipal?.nombre || 'Cliente'
      }

      // Generar el PDF
      const pdfDocument = <InformeFinalPDF
        ordenData={orden}
        reportes={reportesOrden}
        formularioData={formularioData}
        clienteContacto={clienteContacto}
      />

      const asPdf = pdf(pdfDocument)
      const blob = await asPdf.toBlob()

      // Descargar el PDF
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Informe_Final_${ordenId}_${getToday()}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      await notificationService.success(
        'PDF Generado',
        'El informe final D&G ha sido descargado exitosamente',
        3000
      )

      setShowFormularioInformeFinal(false)
    } catch (error) {
      console.error('Error generando PDF:', error)
      await notificationService.error(
        'Error',
        'No se pudo generar el PDF del informe final'
      )
    } finally {
      setGenerandoPDF(false)
    }
  }

  // Función para generar PDF Simple bajo demanda
  const handleDescargarPDFSimple = async () => {
    try {
      setGenerandoPDFSimple(true)
      const reportesOrden = reportes[ordenId] || []

      const pdfDocument = <ReporteFotograficoEstandar
        ordenData={orden}
        reportes={reportesOrden}
      />

      const asPdf = pdf(pdfDocument)
      const blob = await asPdf.toBlob()

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `informe-simple-${ordenId}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      await notificationService.success('PDF Descargado', 'El PDF simple se descargó correctamente', 2000)
    } catch (error) {
      console.error('Error generando PDF simple:', error)
      await notificationService.error('Error', 'No se pudo generar el PDF simple')
    } finally {
      setGenerandoPDFSimple(false)
    }
  }

  // Función para abrir formulario y generar PDF Completo
  const handleDescargarPDFCompleto = () => {
    // El PDF completo requiere datos adicionales del formulario
    // Abrir el modal del formulario
    setShowFormularioInformeFinal(true)
  }

  // Función para generar PDF Fotográfico D&G bajo demanda
  const handleDescargarPDFDG = async () => {
    try {
      setGenerandoPDFDG(true)
      const reportesOrden = reportes[ordenId] || []

      // Importar dinámicamente el componente
      const ReporteFotograficoDG = (await import('../../utils/reporteFotograficoDG')).default

      const pdfDocument = <ReporteFotograficoDG
        orden={orden}
        reportes={reportesOrden}
      />

      const asPdf = pdf(pdfDocument)
      const blob = await asPdf.toBlob()

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Reporte_Fotografico_DG_${ordenId}_${getToday()}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      await notificationService.success('PDF Descargado', 'El reporte fotográfico D&G se descargó correctamente', 2000)
    } catch (error) {
      console.error('Error generando PDF D&G:', error)
      await notificationService.error('Error', 'No se pudo generar el PDF D&G')
    } finally {
      setGenerandoPDFDG(false)
    }
  }

  const handleEnviarPorCorreo = () => {
    // Verificar que el informe esté completado
    if (!informeFinal || informeFinal.estado !== 'completado') {
      notificationService.warning(
        'Informe no completado',
        'El informe debe estar completamente firmado antes de poder enviarlo por correo'
      )
      return
    }

    // Inicializar datos del correo con información de la orden
    setCorreoData({
      destinatario: '',
      asunto: `Informe Final Completado - Orden ${ordenId}`,
      mensaje: '',
      adjuntarPDF: true
    })
    setShowCorreoModal(true)
  }

  const handleEnviarCorreo = async () => {
    try {
      // Validaciones
      if (!correoData.destinatario) {
        await notificationService.warning('Campo requerido', 'Debe ingresar el destinatario')
        return
      }
      if (!correoData.asunto) {
        await notificationService.warning('Campo requerido', 'Debe ingresar el asunto')
        return
      }
      if (!correoData.mensaje) {
        await notificationService.warning('Campo requerido', 'Debe ingresar el mensaje')
        return
      }

      // Crear el correo en el historial de comunicaciones
      const datosCorreo = {
        ordenId,
        cliente: orden?.cliente || 'Cliente',
        asunto: correoData.asunto,
        mensaje: correoData.mensaje + (correoData.adjuntarPDF ? '\n\n📎 Adjunto: Informe Final (PDF)' : ''),
        remitente: user.name,
        destinatario: correoData.destinatario,
        tipo: 'correo_salida'
      }

      crearCorreoSalida(datosCorreo)

      await notificationService.success(
        'Correo registrado',
        'El correo con el informe final ha sido registrado en el historial de comunicaciones',
        3000
      )

      setShowCorreoModal(false)
      setCorreoData({
        destinatario: '',
        asunto: '',
        mensaje: '',
        adjuntarPDF: true
      })
    } catch (error) {
      await notificationService.error('Error', 'No se pudo registrar el correo')
    }
  }

  const puedeGenerar = useMemo(() => {
    return !informeFinal && reportes && reportes[ordenId]?.length > 0
  }, [informeFinal, reportes, ordenId])

  const puedeFirmar = useMemo(() => {
    if (!informeFinal || !user) return false

    // Cada rol SOLO puede firmar en su turno específico
    // Admin NO puede firmar por el técnico o supervisor
    if (user.role === 'tecnico') {
      return informeFinal.estado === 'pendiente_firma_tecnico' && !informeFinal.firmas?.tecnico
    }

    if (user.role === 'supervisor') {
      return informeFinal.estado === 'pendiente_firma_supervisor' && !informeFinal.firmas?.supervisor
    }

    if (user.role === 'admin') {
      return informeFinal.estado === 'pendiente_firma_administrador' && !informeFinal.firmas?.administrador
    }

    return false
  }, [informeFinal, user])

  const getEstadoBadge = (estado) => {
    const badgeClasses = {
      'pendiente_firma_tecnico': 'bg-yellow-100 text-yellow-800',
      'pendiente_firma_supervisor': 'bg-orange-100 text-orange-800',
      'pendiente_firma_administrador': 'bg-blue-100 text-blue-800',
      'completado': 'bg-green-100 text-green-800'
    }

    const badgeTexts = {
      'pendiente_firma_tecnico': 'Pendiente firma técnico',
      'pendiente_firma_supervisor': 'Pendiente firma supervisor',
      'pendiente_firma_administrador': 'Pendiente firma administrador',
      'completado': 'Completado'
    }

    const classes = badgeClasses[estado] || 'bg-gray-100 text-gray-800'
    const text = badgeTexts[estado] || 'Desconocido'

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${classes}`}>
        {text}
      </span>
    )
  }

  // Verificaciones de parámetros
  if (!ordenId) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">ID de orden no proporcionado</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Usuario no autenticado</p>
      </div>
    )
  }

  if (!orden) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Orden no encontrada</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Informe Final</h2>
          <p className="text-gray-600">Orden {ordenId} - {orden?.cliente || 'Cliente no disponible'}</p>
        </div>
        
        <div className="flex items-center gap-3">
          {informeFinal && getEstadoBadge(informeFinal.estado)}
          
          {puedeGenerar && (
            <button
              onClick={handleGenerarInforme}
              className="btn-primary"
              disabled={generandoInforme}
            >
              {generandoInforme ? 'Generando...' : 'Generar Informe Final'}
            </button>
          )}
          
          {puedeFirmar && (
            <button
              onClick={() => setShowFirmaModal(true)}
              className="btn-primary"
            >
              ✍️ Firmar Informe
            </button>
          )}
          
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
      </div>

      {!informeFinal && (!reportes || !reportes[ordenId] || reportes[ordenId].length === 0) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            No hay reportes disponibles para generar el informe final
          </p>
        </div>
      )}

      {/* Mensaje cuando hay reportes pero no se ha generado el informe final */}
      {!informeFinal && reportes && reportes[ordenId]?.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start">
            <span className="text-blue-500 text-3xl mr-4">📋</span>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 text-lg mb-2">
                Informe Final Pendiente de Generación
              </h3>
              <p className="text-blue-800 mb-4">
                Esta orden tiene <strong>{reportes[ordenId].length}</strong> reporte(s) disponible(s).
                Para poder exportar los documentos finales, primero debe generar el Informe Final.
              </p>
              <div className="bg-white border border-blue-200 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-gray-900 mb-2">Requisitos para generar:</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li className="flex items-center">
                    {reportes[ordenId].some(r => r.porcentajeAvance >= 100) ? (
                      <span className="text-green-500 mr-2">✓</span>
                    ) : (
                      <span className="text-red-500 mr-2">✗</span>
                    )}
                    Al menos un reporte con 100% de avance
                  </li>
                </ul>
              </div>
              <button
                onClick={handleGenerarInforme}
                disabled={generandoInforme || !reportes[ordenId].some(r => r.porcentajeAvance >= 100)}
                className="btn-primary"
              >
                {generandoInforme ? 'Generando...' : '📄 Generar Informe Final'}
              </button>
            </div>
          </div>
        </div>
      )}

      {informeFinal && (
        <div className="space-y-6">
          {/* Información del informe */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Información General</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
              <div>
                <p className="text-gray-500">ID del Informe</p>
                <p className="font-mono">{informeFinal.id}</p>
              </div>
              <div>
                <p className="text-gray-500">Fecha de Generación</p>
                <p>{informeFinal.fechaGeneracion ? formatDateTime(new Date(informeFinal.fechaGeneracion)) : '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Periodo de Trabajo</p>
                <p>{informeFinal.resumen?.fechaInicio || '-'} - {informeFinal.resumen?.fechaFin || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Progreso Final</p>
                <p className="font-semibold text-green-600">{informeFinal.resumen?.porcentajeFinal || 0}%</p>
              </div>
            </div>
          </div>

          {/* Resumen estadístico */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card bg-blue-50 border-blue-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Reportes</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-900">{informeFinal.resumen?.totalReportes || 0}</p>
                </div>
                <span className="text-3xl">📋</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card bg-green-50 border-green-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Técnicos</p>
                  <p className="text-xl sm:text-2xl font-bold text-green-900">{informeFinal.resumen?.tecnicos?.length || 0}</p>
                </div>
                <span className="text-3xl">👷</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card bg-purple-50 border-purple-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Materiales</p>
                  <p className="text-xl sm:text-2xl font-bold text-purple-900">{informeFinal.resumen?.materialesUtilizados?.length || 0}</p>
                </div>
                <span className="text-3xl">🔧</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card bg-orange-50 border-orange-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">Fotografías</p>
                  <p className="text-xl sm:text-2xl font-bold text-orange-900">{informeFinal.resumen?.totalFotos || 0}</p>
                </div>
                <span className="text-3xl">📸</span>
              </div>
            </motion.div>
          </div>

          {/* Reportes incluidos */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">
              Reportes Incluidos ({informeFinal.reportesIncluidos?.length || 0})
            </h3>
            <div className="space-y-3">
              {informeFinal.reportesIncluidos && informeFinal.reportesIncluidos.map((reporte) => (
                <div
                  key={reporte.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setExpandedReporte(
                    expandedReporte === reporte.id ? null : reporte.id
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{reporte.id}</p>
                      <p className="text-sm text-gray-600">
                        {reporte.fecha} - {reporte.tecnico}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-500">
                        Avance: {reporte.porcentajeAvance}%
                      </span>
                      <span className="text-gray-400">
                        {expandedReporte === reporte.id ? '▼' : '▶'}
                      </span>
                    </div>
                  </div>
                  
                  {expandedReporte === reporte.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-4 space-y-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-700">Descripción:</p>
                        <p className="text-sm text-gray-600">{reporte.descripcion}</p>
                      </div>
                      
                      {reporte.observaciones && (
                        <div>
                          <p className="text-sm font-medium text-gray-700">Observaciones:</p>
                          <p className="text-sm text-gray-600">{reporte.observaciones}</p>
                        </div>
                      )}
                      
                      {reporte.materialesUtilizados?.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700">Materiales:</p>
                          <ul className="text-sm text-gray-600 list-disc list-inside">
                            {reporte.materialesUtilizados.map((material, idx) => (
                              <li key={idx}>{material}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Sección de Documentos de Seguridad y Medio Ambiente */}
                      <div className="border-t pt-3 mt-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">📄 Documentos de Seguridad:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {reporte.atsDoc && (
                            <div className="bg-green-50 p-2 rounded">
                              <p className="text-xs font-medium text-gray-600">ATS:</p>
                              <a href={getFileUrl(reporte.atsDoc.url)} target="_blank" rel="noopener noreferrer"
                                 className="text-xs text-blue-600 hover:text-blue-800">
                                📎 {reporte.atsDoc.nombre}
                              </a>
                            </div>
                          )}
                          {reporte.aspectosAmbientalesDoc && (
                            <div className="bg-green-50 p-2 rounded">
                              <p className="text-xs font-medium text-gray-600">Aspectos Amb.:</p>
                              <a href={getFileUrl(reporte.aspectosAmbientalesDoc.url)} target="_blank" rel="noopener noreferrer"
                                 className="text-xs text-blue-600 hover:text-blue-800">
                                📎 {reporte.aspectosAmbientalesDoc.nombre}
                              </a>
                            </div>
                          )}
                          {reporte.ptrDoc && (
                            <div className="bg-green-50 p-2 rounded">
                              <p className="text-xs font-medium text-gray-600">PTR:</p>
                              <a href={getFileUrl(reporte.ptrDoc.url)} target="_blank" rel="noopener noreferrer"
                                 className="text-xs text-blue-600 hover:text-blue-800">
                                📎 {reporte.ptrDoc.nombre}
                              </a>
                            </div>
                          )}
                        </div>
                        {reporte.trabajoEnAltura && (
                          <p className="text-xs text-orange-600 font-medium mt-2">
                            ⚠️ Trabajo en altura realizado
                          </p>
                        )}
                      </div>
                      
                      <div className="flex gap-4">
                        {reporte.fotosAntes?.length > 0 && (
                          <p className="text-sm text-gray-500">
                            📷 {reporte.fotosAntes?.length || 0} fotos antes
                          </p>
                        )}
                        {reporte.fotosDespues?.length > 0 && (
                          <p className="text-sm text-gray-500">
                            📷 {reporte.fotosDespues?.length || 0} fotos después
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Resumen de Seguridad y Medio Ambiente */}
          <div className="card bg-yellow-50 border-yellow-200">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">🛡️</span>
              Resumen de Seguridad y Medio Ambiente
            </h3>
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-3 border border-yellow-200">
                <p className="text-sm font-medium text-gray-700 mb-2">Trabajos en Altura Realizados:</p>
                <p className="text-sm text-gray-600">
                  {informeFinal.reportesIncluidos?.filter(r => r.trabajoEnAltura).length || 0} de {informeFinal.reportesIncluidos?.length || 0} reportes
                </p>
              </div>
              
              <div className="bg-white rounded-lg p-3 border border-yellow-200">
                <p className="text-sm font-medium text-gray-700 mb-1">Cumplimiento de Seguridad:</p>
                <div className="space-y-1">
                  <p className="text-sm text-green-600">
                    ✓ ATS completado en todos los reportes
                  </p>
                  <p className="text-sm text-green-600">
                    ✓ Aspectos ambientales documentados
                  </p>
                  <p className="text-sm text-green-600">
                    ✓ PTR registrados según requerimiento
                  </p>
                </div>
              </div>
              
              <div className="text-xs text-yellow-700 italic">
                * Este informe cumple con todos los requisitos de seguridad y medio ambiente establecidos
              </div>
            </div>
          </div>

          {/* Firma de Visita Técnica (si existe) */}
          {visitaTecnica && visitaTecnica.firmaTecnico && (
            <div className="card bg-blue-50 border-blue-200">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">✍️</span>
                Firma de Visita Técnica
              </h3>
              <div className="bg-white rounded-lg p-4 border border-blue-300">
                <p className="text-sm text-gray-700 mb-3">
                  Firma del técnico registrada durante la visita técnica:
                </p>
                <div className="flex justify-center mb-4">
                  <img
                    src={visitaTecnica.firmaTecnico}
                    alt="Firma del técnico en visita técnica"
                    className="max-h-32 border-2 border-gray-300 bg-white rounded shadow-sm"
                  />
                </div>
                <div className="mt-3 text-xs text-gray-600 bg-gray-50 p-3 rounded">
                  <p className="mb-1"><strong>ID Visita:</strong> {visitaTecnica.id}</p>
                  <p className="mb-1"><strong>Técnico:</strong> {visitaTecnica.tecnicoAsignado || Array.isArray(visitaTecnica.tecnicosAsignados) ? visitaTecnica.tecnicosAsignados.map(t => t.nombre).join(', ') : 'N/A'}</p>
                  <p><strong>Fecha de completado:</strong> {visitaTecnica.fechaCompletada ? new Date(visitaTecnica.fechaCompletada).toLocaleString() : 'N/A'}</p>
                </div>
                <div className="mt-3 p-3 bg-blue-100 rounded-lg flex items-start">
                  <span className="text-blue-600 mr-2 flex-shrink-0">🔒</span>
                  <p className="text-xs text-blue-800">
                    <strong>Nota:</strong> Esta firma es de solo lectura y no puede ser modificada en el informe final.
                    Fue registrada por el técnico durante la visita técnica inicial y forma parte del registro permanente del proyecto.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Firmas */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Firmas del Informe Final</h3>
            <div className="space-y-4">
              {/* Firma Técnico */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Firma del Técnico</p>
                    {informeFinal.firmas?.tecnico ? (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600">
                          ✓ Firmado por: {informeFinal.firmas.tecnico.nombre}
                        </p>
                        <p className="text-xs text-gray-500">
                          {informeFinal.firmas.tecnico.fecha ? formatDateTime(new Date(informeFinal.firmas.tecnico.fecha)) : '-'}
                        </p>
                        {informeFinal.firmas.tecnico.comentarios && (
                          <p className="text-sm text-gray-600 mt-1 italic">
                            "{informeFinal.firmas.tecnico.comentarios}"
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 mt-1">Pendiente</p>
                    )}
                  </div>
                  <span className={`text-2xl ${informeFinal.firmas?.tecnico ? 'text-green-600' : 'text-gray-300'}`}>
                    ✍️
                  </span>
                </div>
              </div>

              {/* Firma Supervisor */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Firma del Supervisor</p>
                    {informeFinal.firmas?.supervisor ? (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600">
                          ✓ Firmado por: {informeFinal.firmas.supervisor.nombre}
                        </p>
                        <p className="text-xs text-gray-500">
                          {informeFinal.firmas.supervisor.fecha ? formatDateTime(new Date(informeFinal.firmas.supervisor.fecha)) : '-'}
                        </p>
                        {informeFinal.firmas.supervisor.comentarios && (
                          <p className="text-sm text-gray-600 mt-1 italic">
                            "{informeFinal.firmas.supervisor.comentarios}"
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 mt-1">
                        {informeFinal.firmas?.tecnico ? 'Esperando firma' : 'Requiere firma del técnico primero'}
                      </p>
                    )}
                  </div>
                  <span className={`text-2xl ${informeFinal.firmas?.supervisor ? 'text-green-600' : 'text-gray-300'}`}>
                    ✍️
                  </span>
                </div>
              </div>

              {/* Firma Administrador */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Firma del Administrador</p>
                    {informeFinal.firmas?.administrador ? (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600">
                          ✓ Firmado por: {informeFinal.firmas.administrador.nombre}
                        </p>
                        <p className="text-xs text-gray-500">
                          {informeFinal.firmas.administrador.fecha ? formatDateTime(new Date(informeFinal.firmas.administrador.fecha)) : '-'}
                        </p>
                        {informeFinal.firmas.administrador.comentarios && (
                          <p className="text-sm text-gray-600 mt-1 italic">
                            "{informeFinal.firmas.administrador.comentarios}"
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 mt-1">
                        {informeFinal.firmas?.supervisor ? 'Esperando firma' : 'Requiere firma del supervisor primero'}
                      </p>
                    )}
                  </div>
                  <span className={`text-2xl ${informeFinal.firmas?.administrador ? 'text-green-600' : 'text-gray-300'}`}>
                    ✍️
                  </span>
                </div>
              </div>
            </div>

            {informeFinal.bloqueado && (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  🔒 Este informe está bloqueado y no se pueden realizar más ediciones
                </p>
              </div>
            )}
          </div>

          {/* Acciones - Mostrar siempre que exista el informe */}
          {informeFinal && (
            <div className="space-y-4">
              {/* Alerta si el informe no está completamente firmado */}
              {informeFinal.estado !== 'completado' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <span className="text-amber-500 text-xl mr-3">⚠️</span>
                    <div>
                      <h4 className="font-medium text-amber-800">Informe pendiente de firmas</h4>
                      <p className="text-sm text-amber-700 mt-1">
                        El informe aún no ha sido firmado por todos los responsables.
                        Puede descargar los documentos, pero estos serán marcados como "BORRADOR" hasta que se complete el proceso de firmas.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Opciones de Descarga</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* PDF Simple */}
                  <div className="border border-gray-200 rounded-lg p-3 bg-white">
                    <div className="mb-2">
                      <p className="font-medium text-gray-900">📄 PDF Solo Servicio</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Incluye panel fotográfico y reportes diarios
                      </p>
                    </div>
                    <button
                      onClick={handleDescargarPDFSimple}
                      disabled={generandoPDFSimple}
                      className="btn-primary w-full inline-flex items-center justify-center"
                    >
                      {generandoPDFSimple ? '⏳ Generando PDF...' : '📥 Descargar PDF Simple'}
                    </button>
                  </div>
                  
                  {/* PDF Completo */}
                  <div className="border border-blue-200 rounded-lg p-3 bg-blue-50">
                    <div className="mb-2">
                      <p className="font-medium text-gray-900">📄 PDF con Documentación</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Incluye todo + ATS, PTR y Aspectos Ambientales
                      </p>
                    </div>
                    <button
                      onClick={handleDescargarPDFCompleto}
                      className="btn-primary w-full inline-flex items-center justify-center"
                    >
                      📝 Completar Formulario
                    </button>
                  </div>

                  {/* Reporte Fotográfico D&G */}
                  <div className="border border-green-200 rounded-lg p-3 bg-green-50">
                    <div className="mb-2">
                      <p className="font-medium text-gray-900">📸 Reporte Fotográfico D&G</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Formato profesional D&G con datos actuales
                      </p>
                    </div>
                    <button
                      onClick={handleDescargarPDFDG}
                      disabled={generandoPDFDG}
                      className="btn-primary w-full inline-flex items-center justify-center gap-2"
                    >
                      {generandoPDFDG ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Generando PDF...</span>
                        </>
                      ) : (
                        '📥 Descargar Reporte Fotográfico'
                      )}
                    </button>
                  </div>
                </div>

                {/* Informe Final D&G - Nueva opción */}
                <div className="mt-4 border border-purple-200 rounded-lg p-4 bg-purple-50">
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-gray-900 text-lg">📋 Informe Final D&G</p>
                      <span className="px-2 py-1 bg-purple-200 text-purple-800 text-xs font-semibold rounded">NUEVO</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Informe final completo con formato profesional D&G Group. Incluye esquema de trabajo, metodología, materiales, equipos, proceso de intervención y fotografías con aprobaciones.
                    </p>
                  </div>
                  <button
                    onClick={handleGenerarInformeDG}
                    disabled={generandoPDF}
                    className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {generandoPDF ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Generando PDF...</span>
                      </>
                    ) : (
                      <>
                        <span>📝</span>
                        <span>Generar Informe Final D&G</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Sección de descarga de documentos de seguridad */}
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <span className="mr-2">🛡️</span>
                  Documentos de Seguridad
                </h4>
                <p className="text-sm text-gray-600 mb-4">
                  Descarga selectiva de documentación de seguridad y medio ambiente
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Botón ATS */}
                  <button 
                    onClick={() => handleDownloadDocumentsByType('ats')}
                    className="flex flex-col items-center justify-center p-4 bg-white border-2 border-amber-300 rounded-lg hover:bg-amber-50 transition-colors"
                  >
                    <span className="text-2xl mb-2">📋</span>
                    <span className="font-medium text-gray-900">Todos los ATS</span>
                    <span className="text-xs text-gray-600 mt-1">
                      {(() => {
                        const count = (reportes[ordenId] || []).filter(r => r.atsDocument).length
                        return `${count} documento${count !== 1 ? 's' : ''} disponible${count !== 1 ? 's' : ''}`
                      })()}
                    </span>
                  </button>
                  
                  {/* Botón PTR */}
                  <button 
                    onClick={() => handleDownloadDocumentsByType('ptr')}
                    className="flex flex-col items-center justify-center p-4 bg-white border-2 border-amber-300 rounded-lg hover:bg-amber-50 transition-colors"
                  >
                    <span className="text-2xl mb-2">⚠️</span>
                    <span className="font-medium text-gray-900">Todos los PTR</span>
                    <span className="text-xs text-gray-600 mt-1">
                      {(() => {
                        const count = (reportes[ordenId] || []).filter(r => r.ptrDocument).length
                        return `${count} documento${count !== 1 ? 's' : ''} disponible${count !== 1 ? 's' : ''}`
                      })()}
                    </span>
                  </button>
                  
                  {/* Botón Aspectos Ambientales */}
                  <button 
                    onClick={() => handleDownloadDocumentsByType('aspectos')}
                    className="flex flex-col items-center justify-center p-4 bg-white border-2 border-amber-300 rounded-lg hover:bg-amber-50 transition-colors"
                  >
                    <span className="text-2xl mb-2">🌱</span>
                    <span className="font-medium text-gray-900">Aspectos Ambientales</span>
                    <span className="text-xs text-gray-600 mt-1">
                      {(() => {
                        const count = (reportes[ordenId] || []).filter(r => r.aspectosAmbientalesDocument).length
                        return `${count} documento${count !== 1 ? 's' : ''} disponible${count !== 1 ? 's' : ''}`
                      })()}
                    </span>
                  </button>
                </div>
                
                {/* Información adicional */}
                <div className="mt-4 p-3 bg-amber-100 rounded-lg">
                  <p className="text-xs text-amber-800">
                    <strong>Nota:</strong> Los documentos se descargarán individualmente en tu carpeta de descargas. 
                    Cada archivo está nombrado con el tipo de documento, número de reporte y fecha.
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={handleEnviarPorCorreo}
                  className="btn-secondary"
                >
                  📧 Enviar por correo
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de firma */}
      {showFirmaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Firmar Informe Final
            </h3>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Al firmar este informe, confirmas que:
                </p>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                  <li>Has revisado toda la información incluida</li>
                  <li>Los datos reportados son correctos y completos</li>
                  {user.role === 'supervisor' && (
                    <li className="text-amber-600 font-medium">
                      El informe quedará bloqueado para edición
                    </li>
                  )}
                </ul>
              </div>

              {/* Campo de firma gráfica */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Firma Digital <span className="text-red-500">*</span>
                </label>
                <SignatureCanvas
                  onSignatureChange={setFirmaGrafica}
                  width={600}
                  height={200}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comentarios (opcional)
                </label>
                <textarea
                  className="input-field"
                  rows="3"
                  value={firmaComentarios}
                  onChange={(e) => setFirmaComentarios(e.target.value)}
                  placeholder="Agrega cualquier observación adicional..."
                />
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>Firmante:</strong> {user.name}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Rol:</strong> {user.role}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Fecha:</strong> {formatDateTime(getCurrentDate())}
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowFirmaModal(false)
                  setFirmaComentarios('')
                  setFirmaGrafica(null)
                }}
                className="btn-secondary"
                disabled={firmando}
              >
                Cancelar
              </button>
              <button
                onClick={handleFirmar}
                className="btn-primary"
                disabled={firmando}
              >
                {firmando ? 'Firmando...' : '✍️ Firmar Informe'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de envío por correo */}
      {showCorreoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              📧 Enviar Informe por Correo
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Asunto *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input-field flex-1"
                    value={correoData.asunto}
                    onChange={(e) => setCorreoData(prev => ({ ...prev, asunto: e.target.value }))}
                    placeholder="Asunto del correo"
                    required
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(correoData.asunto)
                      notificationService.success('Copiado', 'Asunto copiado al portapapeles', 1500)
                    }}
                    className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md text-sm font-medium transition-colors"
                    disabled={!correoData.asunto}
                  >
                    📋 Copiar
                  </button>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Mensaje *
                  </label>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(correoData.mensaje)
                      notificationService.success('Copiado', 'Mensaje copiado al portapapeles', 1500)
                    }}
                    className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md text-sm font-medium transition-colors"
                    disabled={!correoData.mensaje}
                  >
                    📋 Copiar
                  </button>
                </div>
                <textarea
                  className="input-field"
                  rows="8"
                  value={correoData.mensaje}
                  onChange={(e) => setCorreoData(prev => ({ ...prev, mensaje: e.target.value }))}
                  placeholder="Escriba el mensaje del correo aquí..."
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Puede editar el contenido generado por la plantilla
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="adjuntarPDF"
                  checked={correoData.adjuntarPDF}
                  onChange={(e) => setCorreoData(prev => ({ ...prev, adjuntarPDF: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="adjuntarPDF" className="text-sm text-gray-700">
                  📎 Indicar adjunto del informe final (PDF)
                </label>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Información del informe:</strong>
                </p>
                <ul className="text-sm text-blue-700 list-disc list-inside space-y-1 mt-2">
                  <li>Orden: {ordenId}</li>
                  <li>Cliente: {orden?.cliente}</li>
                  <li>Preparado por: {user?.name}</li>
                  <li>Estado del informe: {informeFinal?.estado === 'completado' ? 'Completado ✓' : 'Pendiente'}</li>
                </ul>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-800">
                  <strong>Nota:</strong> Este modal te ayuda a crear el contenido del correo. Copia y pega la información en tu cliente de correo electrónico para enviar el informe manualmente. El PDF del informe debe adjuntarse por separado.
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCorreoModal(false)
                  setCorreoData({
                    destinatario: '',
                    asunto: '',
                    mensaje: '',
                    adjuntarPDF: true
                  })
                }}
                className="btn-primary"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal del Formulario de Informe Final D&G */}
      {showFormularioInformeFinal && (
        <FormularioInformeFinal
          ordenData={orden}
          reportes={reportes[ordenId] || []}
          materialesUtilizados={reportes[ordenId]?.reduce((acc, rep) => {
            if (rep.materialesUtilizados && Array.isArray(rep.materialesUtilizados)) {
              return [...acc, ...rep.materialesUtilizados]
            }
            return acc
          }, []) || []}
          onGenerar={handleGenerarPDFConFormulario}
          onCancelar={() => setShowFormularioInformeFinal(false)}
        />
      )}
    </div>
  )
}

export default InformeFinal