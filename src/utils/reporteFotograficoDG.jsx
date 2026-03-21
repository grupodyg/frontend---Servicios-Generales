import React from 'react'
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Image, Font } from '@react-pdf/renderer'
import { getCurrentDate, getToday } from './dateUtils'
import { API_BASE_URL } from '../config/api'

// Registrar fuente para mejor apariencia
Font.register({
  family: 'Helvetica-Bold',
  fontWeight: 'bold',
});

// Estilos que replican el formato D&G original
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
    fontFamily: 'Helvetica',
  },
  // Header con logo y título
  header: {
    marginBottom: 20,
    borderBottom: '2pt solid #003d7a',
    paddingBottom: 15,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  logoBox: {
    backgroundColor: '#003d7a',
    padding: 8,
    marginRight: 15,
    borderRadius: 3,
  },
  logoText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  companyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#003d7a',
  },
  reportTitle: {
    fontSize: 14,
    color: '#333',
    marginTop: 5,
  },
  projectInfo: {
    fontSize: 10,
    color: '#555',
    marginTop: 3,
  },
  dateRange: {
    fontSize: 10,
    color: '#666',
    textAlign: 'right',
    marginTop: 10,
  },
  // Sección de reporte diario
  dailyReport: {
    marginBottom: 25,
    borderLeft: '3pt solid #003d7a',
    paddingLeft: 10,
  },
  dateHeader: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#003d7a',
    marginBottom: 5,
  },
  timeInfo: {
    fontSize: 10,
    color: '#555',
    marginBottom: 3,
  },
  activityCode: {
    fontSize: 10,
    color: '#666',
    marginBottom: 5,
  },
  activityText: {
    fontSize: 10,
    color: '#333',
    marginBottom: 3,
    lineHeight: 1.3,
  },
  personalSection: {
    marginTop: 5,
    marginBottom: 5,
  },
  personalTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  personalItem: {
    fontSize: 10,
    color: '#555',
    marginLeft: 10,
  },
  createdBy: {
    fontSize: 9,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
    marginBottom: 10,
  },
  // Grid de fotos
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    marginBottom: 10,
  },
  photoContainer: {
    width: '23%',
    height: 100,
    border: '1pt solid #ddd',
    padding: 2,
  },
  photo: {
    width: '100%',
    height: '85%',
    objectFit: 'cover',
  },
  photoCaption: {
    fontSize: 7,
    color: '#666',
    textAlign: 'center',
    marginTop: 2,
  },
  conclusionSection: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 3,
  },
  conclusionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  conclusionText: {
    fontSize: 9,
    color: '#555',
    lineHeight: 1.4,
  },
  pageNumber: {
    position: 'absolute',
    fontSize: 9,
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#999',
  },
})

// Función para formatear fecha al estilo del PDF original
// Usa Intl API con timeZone explícito para evitar desfase en producción (Railway/UTC)
const TIMEZONE = 'America/Lima'

const formatearFecha = (fecha) => {
  if (!fecha) return ''
  const date = new Date(fecha)

  // Obtener componentes en timezone de Lima para evitar desfase
  const parts = new Intl.DateTimeFormat('es-PE', {
    timeZone: TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).formatToParts(date)

  const get = (type) => parts.find(p => p.type === type)?.value || ''
  const weekday = get('weekday')
  const day = get('day')
  const month = get('month')
  const year = get('year')

  // Capitalizar primera letra del día y mes
  const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1)

  return `${capitalize(weekday)} ${day} ${capitalize(month)} ${year}`
}

// Función para agrupar reportes por fecha
const agruparReportesPorFecha = (reportes) => {
  const grupos = {}
  reportes?.forEach(reporte => {
    const fecha = reporte.fecha?.split('T')[0] || getToday()
    if (!grupos[fecha]) {
      grupos[fecha] = []
    }
    grupos[fecha].push(reporte)
  })
  return grupos
}

// Componente del documento PDF con formato D&G
const ReporteFotograficoDG = ({ orden, reportes }) => {
  // Helper: Convertir URL relativa a absoluta y asegurar extensión válida
  const getAbsoluteImageUrl = (url) => {
    if (!url) return ''

    // Si ya es URL absoluta, retornarla
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
      return url
    }

    // Construir URL absoluta desde ruta relativa
    const baseUrl = API_BASE_URL ? API_BASE_URL.replace(/\/api\/?$/, '') : ''
    const fullUrl = `${baseUrl}${url}`

    // Verificar extensión válida
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
    const urlLower = fullUrl.toLowerCase()
    const hasValidExtension = validExtensions.some(ext => urlLower.endsWith(ext))

    if (hasValidExtension) {
      return fullUrl
    }

    // Agregar .jpg si falta extensión
    return fullUrl + (fullUrl.includes('?') ? '&ext=.jpg' : '.jpg')
  }

  const reportesAgrupados = agruparReportesPorFecha(reportes)
  const fechas = Object.keys(reportesAgrupados).sort()

  // Calcular rango de fechas
  const fechaInicio = fechas[0] ? formatearFecha(fechas[0]) : 'Sin fecha'
  const fechaFin = fechas[fechas.length - 1] ? formatearFecha(fechas[fechas.length - 1]) : 'Sin fecha'
  
  // Dividir reportes en páginas (2-3 reportes por página)
  const reportesPorPagina = []
  let paginaActual = []
  let contadorReportes = 0
  
  fechas.forEach(fecha => {
    const reportesDelDia = reportesAgrupados[fecha]
    reportesDelDia.forEach(reporte => {
      paginaActual.push({ fecha, reporte })
      contadorReportes++
      
      // 2 reportes por página para la primera página, 3 para las demás
      const limite = reportesPorPagina.length === 0 ? 2 : 3
      if (contadorReportes >= limite) {
        reportesPorPagina.push([...paginaActual])
        paginaActual = []
        contadorReportes = 0
      }
    })
  })
  
  // Agregar reportes restantes
  if (paginaActual.length > 0) {
    reportesPorPagina.push(paginaActual)
  }

  return (
    <Document>
      {reportesPorPagina.map((reportesPagina, pageIndex) => (
        <Page key={pageIndex} size="A4" style={styles.page}>
          {/* Header solo en la primera página */}
          {pageIndex === 0 && (
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <View style={styles.logoBox}>
                  <Text style={styles.logoText}>D&G</Text>
                  <Text style={{ ...styles.logoText, fontSize: 8 }}>GROUP OF</Text>
                  <Text style={{ ...styles.logoText, fontSize: 8 }}>COMPANIES</Text>
                </View>
                <View>
                  <Text style={styles.companyName}>D&G GROUP OF COMPANIES SAC</Text>
                  <Text style={styles.reportTitle}>Reporte fotográfico</Text>
                  <Text style={styles.projectInfo}>
                    Proyecto: {orden?.proyecto || orden?.tipoServicio || 'Servicio de Mantenimiento'}
                  </Text>
                </View>
              </View>
              <Text style={styles.dateRange}>
                {fechaInicio} al {fechaFin}
              </Text>
            </View>
          )}

          {/* Reportes del día */}
          {reportesPagina.map((item, index) => (
            <View key={index} style={styles.dailyReport}>
              {/* Fecha y hora */}
              <Text style={styles.dateHeader}>
                {formatearFecha(item.fecha)}
              </Text>
              
              <Text style={styles.timeInfo}>
                {item.reporte.horaInicio || item.reporte.horasIniciales || '08:00'} a {' '}
                {item.reporte.horaFin || item.reporte.horasFinales || '17:00'}
              </Text>

              {/* Código y actividad */}
              <Text style={styles.activityCode}>
                {orden?.proyecto || orden?.id || 'ORD-001'} - Avance de actividades
              </Text>

              {/* Descripción de actividades */}
              {item.reporte.descripcionTrabajo || item.reporte.descripcion ? (
                <View>
                  <Text style={styles.activityText}>
                    Actividades: {item.reporte.descripcionTrabajo || item.reporte.descripcion}
                  </Text>
                </View>
              ) : null}

              {/* Personal que intervino */}
              {(item.reporte.tecnicos || item.reporte.tecnico) && (
                <View style={styles.personalSection}>
                  <Text style={styles.personalTitle}>Personal que intervino:</Text>
                  {item.reporte.tecnicos ? (
                    item.reporte.tecnicos.map((tecnico, idx) => (
                      <Text key={idx} style={styles.personalItem}>• {tecnico}</Text>
                    ))
                  ) : (
                    <Text style={styles.personalItem}>• {item.reporte.tecnico}</Text>
                  )}
                </View>
              )}

              {/* Observaciones/Conclusión */}
              {item.reporte.observaciones && (
                <View style={styles.conclusionSection}>
                  <Text style={styles.conclusionTitle}>
                    {item.reporte.observaciones.length > 100 ? 'Conclusión:' : 'Observaciones:'}
                  </Text>
                  <Text style={styles.conclusionText}>
                    {item.reporte.observaciones}
                  </Text>
                </View>
              )}

              {/* Creado por */}
              <Text style={styles.createdBy}>
                Creado por: {item.reporte.creadoPor || item.reporte.tecnico || 'Sistema'}
              </Text>

              {/* Grid de fotos */}
              {(item.reporte.fotosAntes?.length > 0 || item.reporte.fotosDespues?.length > 0) && (
                <View style={styles.photoGrid}>
                  {/* Primero las fotos de antes */}
                  {item.reporte.fotosAntes?.slice(0, 4).map((foto, fotoIdx) => (
                    <View key={`antes-${fotoIdx}`} style={styles.photoContainer}>
                      <Image
                        style={styles.photo}
                        src={getAbsoluteImageUrl(foto.url || foto)}
                      />
                      <Text style={styles.photoCaption}>
                        {foto.caption || 'Antes'}
                      </Text>
                    </View>
                  ))}
                  
                  {/* Luego las fotos de después */}
                  {item.reporte.fotosDespues?.slice(0, 4 - (item.reporte.fotosAntes?.length || 0)).map((foto, fotoIdx) => (
                    <View key={`despues-${fotoIdx}`} style={styles.photoContainer}>
                      <Image
                        style={styles.photo}
                        src={getAbsoluteImageUrl(foto.url || foto)}
                      />
                      <Text style={styles.photoCaption}>
                        {foto.caption || 'Después'}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
          
          {/* Número de página */}
          <Text style={styles.pageNumber}>
            Página {pageIndex + 1}
          </Text>
        </Page>
      ))}
    </Document>
  )
}

// Datos de demo para la presentación
const generarDatosDemo = () => {
  const fechaBase = getCurrentDate()
  const reportesDemo = []
  
  // Generar 6 días de reportes (como el PDF original)
  for (let i = 0; i < 6; i++) {
    const fecha = new Date(fechaBase)
    fecha.setDate(fecha.getDate() - (5 - i))
    
    const actividades = [
      'Lijado de escalera metálica y preparación de superficie',
      'Aplicación de base anticorrosiva y primera capa de pintura',
      'Descascarado de pintura existente, lijado y pintado de escalera',
      'Pintado completo de escalera con cintas de seguridad en peldaños',
      'Culminación de pintado y colocación de cintas antideslizantes',
      'Pintado de 2 escaleras pequeñas del área de concha'
    ]
    
    const observaciones = [
      'Se realizó el trabajo según los estándares de seguridad establecidos',
      'Se completó el pintado pero falta aplicar las cintas de peligro en los pasos',
      'Trabajo realizado sin novedades. Personal cumplió con EPPs completos',
      'Se culminaron 2 escaleras pendientes del área de refinado',
      'Escaleras entregadas al área correspondiente con documentación',
      'Se culminó el trabajo programado para esta semana'
    ]
    
    reportesDemo.push({
      id: `REP-DEMO-${i + 1}`,
      fecha: fecha.toISOString(),
      horaInicio: '08:00',
      horaFin: `${17 + Math.floor(Math.random() * 3)}:${Math.random() > 0.5 ? '30' : '00'}`,
      descripcionTrabajo: actividades[i],
      observaciones: i % 2 === 0 ? observaciones[i] : null,
      porcentajeAvance: Math.min(100, (i + 1) * 17),
      tecnico: ['Martin Garay', 'Renzo Figuerez', 'Jorge Mendoza'][Math.floor(Math.random() * 3)],
      tecnicos: i % 2 === 0 ? ['Martin Garay', 'Renzo Figuerez'] : ['Jorge Mendoza', 'Martin Garay'],
      // Usar rutas relativas para las imágenes locales
      fotosAntes: [
        '/ilovepdf_pages-to-jpg/Reporte_20240822_100256 (1)_pages-to-jpg-0001.jpg',
        '/ilovepdf_pages-to-jpg/Reporte_20240822_100256 (1)_pages-to-jpg-0002.jpg',
        '/ilovepdf_pages-to-jpg/Reporte_20240822_100256 (1)_pages-to-jpg-0001.jpg',
        '/ilovepdf_pages-to-jpg/Reporte_20240822_100256 (1)_pages-to-jpg-0003.jpg'
      ].slice(0, 2 + Math.floor(Math.random() * 2)),
      fotosDespues: [
        '/ilovepdf_pages-to-jpg/Reporte_20240822_100256 (1)_pages-to-jpg-0002.jpg',
        '/ilovepdf_pages-to-jpg/Reporte_20240822_100256 (1)_pages-to-jpg-0003.jpg',
        '/ilovepdf_pages-to-jpg/Reporte_20240822_100256 (1)_pages-to-jpg-0001.jpg',
        '/ilovepdf_pages-to-jpg/Reporte_20240822_100256 (1)_pages-to-jpg-0002.jpg'
      ].slice(0, 2 + Math.floor(Math.random() * 2)),
      creadoPor: 'Sandra Juarez'
    })
  }
  
  return reportesDemo
}

// Hook para usar el generador de reporte fotográfico D&G
export const useReporteFotograficoDG = () => {
  const generateReporteFotograficoDG = (orden, reportes) => {
    // Si no hay reportes, usar datos de demo
    let reportesParaUsar = reportes
    let ordenParaUsar = orden
    
    if (!reportes || reportes.length === 0) {
      reportesParaUsar = generarDatosDemo()
      ordenParaUsar = {
        ...orden,
        id: orden?.id || 'OT-2024-004',
        proyecto: orden?.proyecto || '4802440332/ERV PINT ESCALE REFINADO CHOCOLATE',
        cliente: orden?.cliente || 'REFINERÍA CHOCOLATE',
        tipoServicio: orden?.tipoServicio || 'Mantenimiento de Escaleras'
      }
    }

    return (
      <PDFDownloadLink
        document={<ReporteFotograficoDG orden={ordenParaUsar} reportes={reportesParaUsar} />}
        fileName={`Reporte_Fotografico_DG_${ordenParaUsar?.id || 'demo'}_${getToday()}.pdf`}
        className="btn-primary inline-flex items-center gap-2"
      >
        {({ blob, url, loading, error }) =>
          loading ? (
            <>
              <span className="animate-spin">⏳</span>
              Generando PDF...
            </>
          ) : (
            <>
              📥 Descargar Reporte Fotográfico
            </>
          )
        }
      </PDFDownloadLink>
    )
  }

  return { generateReporteFotograficoDG }
}

export default ReporteFotograficoDG