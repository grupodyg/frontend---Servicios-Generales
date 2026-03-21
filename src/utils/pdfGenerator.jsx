import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Image, Font } from '@react-pdf/renderer'
import { getCurrentDate, formatDate, formatTime, formatDateLong, getToday } from './dateUtils'
import { API_BASE_URL } from '../config/api'

// Helper: Convertir URL relativa a absoluta para @react-pdf/renderer
const getAbsoluteImageUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
    return url
  }
  const baseUrl = API_BASE_URL ? API_BASE_URL.replace(/\/api\/?$/, '') : ''
  const fullUrl = `${baseUrl}${url}`
  const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
  const hasValidExtension = validExtensions.some(ext => fullUrl.toLowerCase().endsWith(ext))
  if (hasValidExtension) return fullUrl
  return fullUrl + (fullUrl.includes('?') ? '&ext=.jpg' : '.jpg')
}

// Registrar fuentes para mejor tipografía
Font.register({
  family: 'Helvetica-Bold',
  src: 'https://fonts.gstatic.com/s/helveticaneue/v1/HelveticaNeue-Bold.ttf'
})

// Estilos para el PDF D&G Group
const stylesInforme = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 20,
    fontFamily: 'Helvetica',
    fontSize: 10
  },
  // Encabezado con logo y título
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    borderBottom: 2,
    borderBottomColor: '#003366',
    paddingBottom: 10
  },
  logoContainer: {
    width: 80,
    marginRight: 20
  },
  logo: {
    width: 80,
    height: 40
  },
  titleContainer: {
    flex: 1
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#003366',
    marginBottom: 3
  },
  subtitle: {
    fontSize: 12,
    color: '#666666'
  },
  // Información del reporte
  infoSection: {
    marginBottom: 15,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 3
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    width: 120,
    color: '#003366'
  },
  infoValue: {
    fontSize: 9,
    flex: 1,
    color: '#333333'
  },
  // Sección de fecha/reporte diario
  dateSection: {
    backgroundColor: '#003366',
    color: 'white',
    padding: 5,
    marginTop: 10,
    marginBottom: 8
  },
  dateText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: 'white'
  },
  // Grid de fotos
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10
  },
  photoContainer: {
    width: '24%',
    marginRight: '1%',
    marginBottom: 8,
    border: 1,
    borderColor: '#e0e0e0'
  },
  photo: {
    width: '100%',
    height: 100,
    objectFit: 'cover'
  },
  photoCaption: {
    fontSize: 7,
    padding: 2,
    textAlign: 'center',
    backgroundColor: '#f8f9fa',
    color: '#666666'
  },
  // Descripción de actividades
  activitySection: {
    marginTop: 8,
    marginBottom: 15,
    padding: 8,
    backgroundColor: '#ffffff',
    border: 1,
    borderColor: '#e0e0e0'
  },
  activityTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#003366',
    marginBottom: 5
  },
  activityText: {
    fontSize: 9,
    color: '#333333',
    lineHeight: 1.4
  },
  // Personal involucrado
  personnelSection: {
    marginTop: 5,
    paddingTop: 5,
    borderTop: 1,
    borderTopColor: '#e0e0e0'
  },
  personnelTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#003366',
    marginBottom: 3
  },
  personnelList: {
    fontSize: 8,
    color: '#666666'
  },
  // Pie de página
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    borderTop: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 8
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3
  },
  footerText: {
    fontSize: 8,
    color: '#666666'
  },
  createdBy: {
    fontSize: 8,
    fontStyle: 'italic',
    color: '#003366'
  },
  pageNumber: {
    fontSize: 8,
    color: '#666666'
  }
})

// Estilos originales para otros PDFs
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
    fontFamily: 'Helvetica'
  },
  header: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
    color: '#1e40af',
    fontWeight: 'bold'
  },
  subheader: {
    fontSize: 16,
    marginBottom: 15,
    color: '#374151',
    fontWeight: 'bold'
  },
  section: {
    margin: 10,
    padding: 10,
    flexGrow: 1
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
    width: '30%',
    color: '#6b7280'
  },
  value: {
    fontSize: 10,
    width: '70%',
    color: '#111827'
  },
  table: {
    display: 'table',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginTop: 10
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row'
  },
  tableColHeader: {
    width: '25%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: '#f3f4f6',
    padding: 5
  },
  tableCol: {
    width: '25%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 5
  },
  tableCellHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151'
  },
  tableCell: {
    fontSize: 9,
    color: '#111827'
  },
  footer: {
    marginTop: 30,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: '#e5e7eb',
    fontSize: 8,
    color: '#6b7280',
    textAlign: 'center'
  }
})

// Componente del documento PDF para reporte de orden
const OrdenReportDocument = ({ orden, reportes = [], userRole }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <Text style={styles.header}>DIG Group - Reporte de Orden</Text>
      
      {/* Información de la orden */}
      <View style={styles.section}>
        <Text style={styles.subheader}>Información General</Text>
        <View style={styles.row}>
          <Text style={styles.label}>ID de Orden:</Text>
          <Text style={styles.value}>{orden.id}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Cliente:</Text>
          <Text style={styles.value}>{orden.cliente}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Tipo de Servicio:</Text>
          <Text style={styles.value}>{orden.tipoServicio}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Estado:</Text>
          <Text style={styles.value}>{orden.estado}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Prioridad:</Text>
          <Text style={styles.value}>{orden.prioridad}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Técnico Asignado:</Text>
          <Text style={styles.value}>{orden.tecnicoAsignado}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Ubicación:</Text>
          <Text style={styles.value}>{orden.ubicacion}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Fecha de Creación:</Text>
          <Text style={styles.value}>{orden.fechaCreacion}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Fecha de Vencimiento:</Text>
          <Text style={styles.value}>{orden.fechaVencimiento}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Progreso:</Text>
          <Text style={styles.value}>{orden.porcentajeAvance}%</Text>
        </View>
        {userRole === 'admin' && (
          <View style={styles.row}>
            <Text style={styles.label}>Costo Estimado:</Text>
            <Text style={styles.value}>${orden.costoEstimado}</Text>
          </View>
        )}
      </View>

      {/* Descripción */}
      <View style={styles.section}>
        <Text style={styles.subheader}>Descripción del Trabajo</Text>
        <Text style={styles.value}>{orden.descripcion}</Text>
      </View>

      {/* Materiales */}
      {orden.materialesRequeridos && orden.materialesRequeridos.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.subheader}>Materiales Requeridos</Text>
          {orden.materialesRequeridos.map((material, index) => (
            <Text key={index} style={styles.value}>• {material}</Text>
          ))}
        </View>
      )}

      {/* Reportes */}
      {reportes.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.subheader}>Reportes de Progreso</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <View style={styles.tableColHeader}>
                <Text style={styles.tableCellHeader}>Fecha</Text>
              </View>
              <View style={styles.tableColHeader}>
                <Text style={styles.tableCellHeader}>Técnico</Text>
              </View>
              <View style={styles.tableColHeader}>
                <Text style={styles.tableCellHeader}>Progreso</Text>
              </View>
              <View style={styles.tableColHeader}>
                <Text style={styles.tableCellHeader}>Horas</Text>
              </View>
            </View>
            {reportes.map((reporte, index) => (
              <View key={index} style={styles.tableRow}>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>{reporte.fecha}</Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>{reporte.tecnico}</Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>{reporte.porcentajeAvance}%</Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>
                    {reporte.horasIniciales} - {reporte.horasFinales}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Footer */}
      <Text style={styles.footer}>
        {`Reporte generado el ${formatDate(getCurrentDate())} • DIG Group - Sistema de Gestión de Mantenimiento`}
      </Text>
    </Page>
  </Document>
)

// Documento PDF para Visita Técnica
// Estilos mejorados para Visita Técnica
const stylesVisitaTecnica = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 25,
    fontFamily: 'Helvetica',
    fontSize: 10
  },
  // Header profesional
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderBottom: 3,
    borderBottomColor: '#1e40af',
    paddingBottom: 15
  },
  titleSection: {
    flex: 1
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 4
  },
  visitaId: {
    fontSize: 14,
    color: '#374151',
    fontWeight: 'bold'
  },
  estadoBadge: {
    backgroundColor: '#10b981',
    color: 'white',
    padding: '6 12',
    borderRadius: 4,
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
    minWidth: 80
  },
  // Sección destacada
  infoBoxPrincipal: {
    backgroundColor: '#eff6ff',
    border: 2,
    borderColor: '#3b82f6',
    borderRadius: 6,
    padding: 12,
    marginBottom: 15
  },
  infoBoxTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 8,
    borderBottom: 1,
    borderBottomColor: '#93c5fd',
    paddingBottom: 4
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  infoItem: {
    width: '50%',
    marginBottom: 6
  },
  infoLabel: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 2,
    textTransform: 'uppercase',
    fontWeight: 'bold'
  },
  infoValue: {
    fontSize: 10,
    color: '#111827',
    fontWeight: 'bold'
  },
  // Secciones
  section: {
    marginBottom: 15
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: 2,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    padding: 6,
    borderRadius: 3
  },
  sectionContent: {
    padding: 8
  },
  textContent: {
    fontSize: 9,
    color: '#374151',
    lineHeight: 1.5,
    textAlign: 'justify'
  },
  // Tabla mejorada
  table: {
    marginTop: 8,
    borderRadius: 4,
    overflow: 'hidden'
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e40af',
    padding: 8
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: 'bold',
    color: 'white',
    textTransform: 'uppercase'
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: 1,
    borderBottomColor: '#e5e7eb',
    padding: 8,
    backgroundColor: '#ffffff'
  },
  tableRowAlt: {
    backgroundColor: '#f9fafb'
  },
  tableCell: {
    fontSize: 9,
    color: '#374151'
  },
  tableCellBold: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#111827'
  },
  // Lista con viñetas
  listItem: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingLeft: 8
  },
  bullet: {
    fontSize: 9,
    color: '#3b82f6',
    marginRight: 6,
    fontWeight: 'bold'
  },
  listText: {
    fontSize: 9,
    color: '#374151',
    flex: 1
  },
  // Box de resumen
  summaryBox: {
    backgroundColor: '#f0fdf4',
    border: 2,
    borderColor: '#10b981',
    borderRadius: 6,
    padding: 10,
    marginTop: 10
  },
  summaryTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#065f46',
    marginBottom: 6
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    paddingBottom: 4,
    borderBottom: 1,
    borderBottomColor: '#d1fae5'
  },
  summaryLabel: {
    fontSize: 9,
    color: '#047857'
  },
  summaryValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#065f46'
  },
  // Footer profesional
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 25,
    right: 25,
    borderTop: 2,
    borderTopColor: '#e5e7eb',
    paddingTop: 8
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  footerText: {
    fontSize: 7,
    color: '#6b7280'
  },
  footerBrand: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#1e40af'
  },
  // Fotos
  photosContainer: {
    marginTop: 10
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  photoItem: {
    width: '48%',
    marginBottom: 10,
    border: 1,
    borderColor: '#d1d5db',
    borderRadius: 4,
    overflow: 'hidden'
  },
  photo: {
    width: '100%',
    height: 140,
    objectFit: 'cover'
  },
  photoCaption: {
    fontSize: 7,
    color: '#6b7280',
    padding: 4,
    backgroundColor: '#f9fafb',
    textAlign: 'center'
  },
  // Badges de categoría
  categoryBadge: {
    fontSize: 7,
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    padding: '3 6',
    borderRadius: 3,
    marginBottom: 6,
    fontWeight: 'bold',
    textTransform: 'uppercase'
  }
})

const VisitaTecnicaDocument = ({ visita, fotos = [], userRole = 'admin' }) => {
  const esAdmin = userRole === 'admin'
  // Obtener color del estado
  const getEstadoColor = (estado) => {
    switch(estado) {
      case 'completada': return '#10b981'
      case 'aprobada': return '#3b82f6'
      case 'en_proceso': return '#f59e0b'
      case 'asignada': return '#8b5cf6'
      case 'rechazada': return '#ef4444'
      default: return '#6b7280'
    }
  }

  // Obtener etiqueta del estado
  const getEstadoLabel = (estado) => {
    switch(estado) {
      case 'completada': return 'COMPLETADA'
      case 'aprobada': return 'APROBADA'
      case 'en_proceso': return 'EN PROCESO'
      case 'asignada': return 'ASIGNADA'
      case 'rechazada': return 'RECHAZADA'
      default: return estado.toUpperCase()
    }
  }

  // Calcular total de materiales
  const totalMateriales = visita.materialesEstimados?.reduce((sum, m) =>
    sum + (m.subtotal || 0), 0) || 0

  return (
    <Document>
      <Page size="A4" style={stylesVisitaTecnica.page}>
        {/* Header profesional */}
        <View style={stylesVisitaTecnica.headerContainer}>
          <View style={stylesVisitaTecnica.titleSection}>
            <Text style={stylesVisitaTecnica.mainTitle}>REPORTE DE VISITA TÉCNICA</Text>
            <Text style={stylesVisitaTecnica.visitaId}>{visita.id}</Text>
          </View>
          <View style={[stylesVisitaTecnica.estadoBadge, {
            backgroundColor: getEstadoColor(visita.estado)
          }]}>
            <Text>{getEstadoLabel(visita.estado)}</Text>
          </View>
        </View>

        {/* Información Principal */}
        <View style={stylesVisitaTecnica.infoBoxPrincipal}>
          <Text style={stylesVisitaTecnica.infoBoxTitle}>📋 INFORMACIÓN GENERAL</Text>
          <View style={stylesVisitaTecnica.infoGrid}>
            <View style={stylesVisitaTecnica.infoItem}>
              <Text style={stylesVisitaTecnica.infoLabel}>Cliente</Text>
              <Text style={stylesVisitaTecnica.infoValue}>{visita.cliente}</Text>
            </View>
            <View style={stylesVisitaTecnica.infoItem}>
              <Text style={stylesVisitaTecnica.infoLabel}>Fecha de Visita</Text>
              <Text style={stylesVisitaTecnica.infoValue}>
                {new Date(visita.fechaVisita).toLocaleDateString('es-ES', {
                  timeZone: 'America/Lima', day: '2-digit', month: 'long', year: 'numeric'
                })}
              </Text>
            </View>
            <View style={stylesVisitaTecnica.infoItem}>
              <Text style={stylesVisitaTecnica.infoLabel}>Hora</Text>
              <Text style={stylesVisitaTecnica.infoValue}>{visita.horaVisita}</Text>
            </View>
            <View style={stylesVisitaTecnica.infoItem}>
              <Text style={stylesVisitaTecnica.infoLabel}>Técnico Asignado</Text>
              <Text style={stylesVisitaTecnica.infoValue}>{visita.tecnicoAsignado}</Text>
            </View>
            <View style={[stylesVisitaTecnica.infoItem, { width: '100%' }]}>
              <Text style={stylesVisitaTecnica.infoLabel}>Dirección</Text>
              <Text style={stylesVisitaTecnica.infoValue}>{visita.direccion}</Text>
            </View>
            <View style={stylesVisitaTecnica.infoItem}>
              <Text style={stylesVisitaTecnica.infoLabel}>Contacto</Text>
              <Text style={stylesVisitaTecnica.infoValue}>{visita.contacto}</Text>
            </View>
            <View style={stylesVisitaTecnica.infoItem}>
              <Text style={stylesVisitaTecnica.infoLabel}>Teléfono</Text>
              <Text style={stylesVisitaTecnica.infoValue}>{visita.telefono}</Text>
            </View>
          </View>
        </View>

        {/* Descripción del Servicio */}
        <View style={stylesVisitaTecnica.section}>
          <Text style={stylesVisitaTecnica.sectionTitle}>🔧 DESCRIPCIÓN DEL SERVICIO</Text>
          <View style={stylesVisitaTecnica.sectionContent}>
            <Text style={stylesVisitaTecnica.textContent}>{visita.descripcionServicio}</Text>
            {visita.observaciones && (
              <>
                <Text style={[stylesVisitaTecnica.infoLabel, { marginTop: 8 }]}>Observaciones:</Text>
                <Text style={stylesVisitaTecnica.textContent}>{visita.observaciones}</Text>
              </>
            )}
          </View>
        </View>

        {/* Estado del Lugar */}
        {visita.estadoLugar?.descripcion && (
          <View style={stylesVisitaTecnica.section}>
            <Text style={stylesVisitaTecnica.sectionTitle}>📍 ESTADO DEL LUGAR</Text>
            <View style={stylesVisitaTecnica.sectionContent}>
              <Text style={stylesVisitaTecnica.textContent}>{visita.estadoLugar.descripcion}</Text>
              {visita.estadoLugar.observaciones && (
                <>
                  <Text style={[stylesVisitaTecnica.infoLabel, { marginTop: 8 }]}>Observaciones:</Text>
                  <Text style={stylesVisitaTecnica.textContent}>{visita.estadoLugar.observaciones}</Text>
                </>
              )}
            </View>
          </View>
        )}

        {/* Materiales Estimados */}
        {visita.materialesEstimados && visita.materialesEstimados.length > 0 && (
          <View style={stylesVisitaTecnica.section}>
            <Text style={stylesVisitaTecnica.sectionTitle}>📦 MATERIALES ESTIMADOS</Text>
            <View style={stylesVisitaTecnica.table}>
              {/* Header */}
              <View style={stylesVisitaTecnica.tableHeader}>
                <Text style={[stylesVisitaTecnica.tableHeaderCell, { width: esAdmin ? '50%' : '60%' }]}>Material</Text>
                <Text style={[stylesVisitaTecnica.tableHeaderCell, { width: esAdmin ? '15%' : '20%', textAlign: 'center' }]}>Cant.</Text>
                <Text style={[stylesVisitaTecnica.tableHeaderCell, { width: esAdmin ? '15%' : '20%', textAlign: 'center' }]}>Unidad</Text>
                {esAdmin && (
                  <Text style={[stylesVisitaTecnica.tableHeaderCell, { width: '20%', textAlign: 'right' }]}>Subtotal</Text>
                )}
              </View>
              {/* Rows */}
              {visita.materialesEstimados.map((material, index) => (
                <View
                  key={index}
                  style={[
                    stylesVisitaTecnica.tableRow,
                    index % 2 === 1 && stylesVisitaTecnica.tableRowAlt
                  ]}
                >
                  <Text style={[stylesVisitaTecnica.tableCell, { width: esAdmin ? '50%' : '60%' }]}>{material.nombre}</Text>
                  <Text style={[stylesVisitaTecnica.tableCell, { width: esAdmin ? '15%' : '20%', textAlign: 'center' }]}>{material.cantidad}</Text>
                  <Text style={[stylesVisitaTecnica.tableCell, { width: esAdmin ? '15%' : '20%', textAlign: 'center' }]}>{material.unidad}</Text>
                  {esAdmin && (
                    <Text style={[stylesVisitaTecnica.tableCellBold, { width: '20%', textAlign: 'right' }]}>
                      {material.subtotal ? `S/ ${material.subtotal.toFixed(2)}` : 'N/A'}
                    </Text>
                  )}
                </View>
              ))}
              {/* Total - solo visible para admin */}
              {esAdmin && (
                <View style={[stylesVisitaTecnica.tableRow, { backgroundColor: '#1e40af', padding: 10 }]}>
                  <Text style={[stylesVisitaTecnica.tableHeaderCell, { width: '80%', textAlign: 'right' }]}>TOTAL ESTIMADO:</Text>
                  <Text style={[stylesVisitaTecnica.tableHeaderCell, { width: '20%', textAlign: 'right', fontSize: 11 }]}>
                    S/ {totalMateriales.toFixed(2)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Herramientas Requeridas */}
        {visita.herramientasRequeridas && visita.herramientasRequeridas.length > 0 && (
          <View style={stylesVisitaTecnica.section}>
            <Text style={stylesVisitaTecnica.sectionTitle}>🔨 HERRAMIENTAS REQUERIDAS</Text>
            <View style={stylesVisitaTecnica.sectionContent}>
              {visita.herramientasRequeridas.map((herramienta, index) => (
                <View key={index} style={stylesVisitaTecnica.listItem}>
                  <Text style={stylesVisitaTecnica.bullet}>●</Text>
                  <Text style={stylesVisitaTecnica.listText}>
                    {typeof herramienta === 'string' ? herramienta :
                      `${herramienta.nombre} (${herramienta.cantidad} ${herramienta.unidad})`}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Personal Requerido */}
        {((visita.personalRequerido && (visita.personalRequerido.cantidad > 0 || visita.personalRequerido.especialidades?.length > 0)) || (visita.listaPersonal && visita.listaPersonal.length > 0)) && (
          <View style={stylesVisitaTecnica.section}>
            <Text style={stylesVisitaTecnica.sectionTitle}>👥 PERSONAL REQUERIDO</Text>
            <View style={stylesVisitaTecnica.sectionContent}>
              {visita.listaPersonal && visita.listaPersonal.length > 0 ? (
                visita.listaPersonal.map((persona, index) => (
                  <View key={index} style={stylesVisitaTecnica.listItem}>
                    <Text style={stylesVisitaTecnica.bullet}>●</Text>
                    <Text style={stylesVisitaTecnica.listText}>
                      <Text style={{ fontWeight: 'bold' }}>{persona.especialidad}:</Text> {persona.diasEstimados} {persona.diasEstimados === 1 ? 'día' : 'días'}
                      {persona.observaciones && ` - ${persona.observaciones}`}
                    </Text>
                  </View>
                ))
              ) : visita.personalRequerido && (
                <>
                  {visita.personalRequerido.cantidad && (
                    <View style={stylesVisitaTecnica.listItem}>
                      <Text style={stylesVisitaTecnica.bullet}>●</Text>
                      <Text style={stylesVisitaTecnica.listText}>
                        <Text style={{ fontWeight: 'bold' }}>Cantidad:</Text> {visita.personalRequerido.cantidad} personas
                      </Text>
                    </View>
                  )}
                  {visita.personalRequerido.diasEstimados && (
                    <View style={stylesVisitaTecnica.listItem}>
                      <Text style={stylesVisitaTecnica.bullet}>●</Text>
                      <Text style={stylesVisitaTecnica.listText}>
                        <Text style={{ fontWeight: 'bold' }}>Días estimados:</Text> {visita.personalRequerido.diasEstimados} días
                      </Text>
                    </View>
                  )}
                  {visita.personalRequerido.especialidades?.length > 0 && (
                    <View style={stylesVisitaTecnica.listItem}>
                      <Text style={stylesVisitaTecnica.bullet}>●</Text>
                      <Text style={stylesVisitaTecnica.listText}>
                        <Text style={{ fontWeight: 'bold' }}>Especialidades:</Text> {visita.personalRequerido.especialidades.join(', ')}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
        )}

        {/* Información de Completado */}
        {visita.estado === 'completada' && (
          <View style={stylesVisitaTecnica.summaryBox}>
            <Text style={stylesVisitaTecnica.summaryTitle}>✓ INFORMACIÓN DE COMPLETADO</Text>
            {visita.nombreProyecto && (
              <View style={stylesVisitaTecnica.summaryItem}>
                <Text style={stylesVisitaTecnica.summaryLabel}>Nombre del Proyecto:</Text>
                <Text style={stylesVisitaTecnica.summaryValue}>{visita.nombreProyecto}</Text>
              </View>
            )}
            {visita.fechaCompletada && (
              <View style={stylesVisitaTecnica.summaryItem}>
                <Text style={stylesVisitaTecnica.summaryLabel}>Fecha de Completado:</Text>
                <Text style={stylesVisitaTecnica.summaryValue}>
                  {new Date(visita.fechaCompletada).toLocaleDateString('es-ES', { timeZone: 'America/Lima' })} - {new Date(visita.fechaCompletada).toLocaleTimeString('es-ES', { timeZone: 'America/Lima' })}
                </Text>
              </View>
            )}
            {visita.coordenadasGPS?.latitud && visita.coordenadasGPS?.longitud && (
              <View style={stylesVisitaTecnica.summaryItem}>
                <Text style={stylesVisitaTecnica.summaryLabel}>Coordenadas GPS:</Text>
                <Text style={stylesVisitaTecnica.summaryValue}>
                  {visita.coordenadasGPS.latitud.toFixed(6)}, {visita.coordenadasGPS.longitud.toFixed(6)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Registro Fotográfico - Ahora en la misma página */}
        {visita.estadoLugar?.fotos && visita.estadoLugar.fotos.length > 0 && (
          <View style={stylesVisitaTecnica.section}>
            <Text style={stylesVisitaTecnica.sectionTitle}>📸 REGISTRO FOTOGRÁFICO</Text>
            <View style={stylesVisitaTecnica.photosContainer}>
              <Text style={[stylesVisitaTecnica.textContent, { marginBottom: 12 }]}>
                Se registraron {visita.estadoLugar.fotos.length} fotografías durante la visita técnica.
              </Text>

              <View style={stylesVisitaTecnica.photoGrid}>
                {visita.estadoLugar.fotos.slice(0, 8).map((foto, index) => (
                  <View key={index} style={stylesVisitaTecnica.photoItem}>
                    {foto.url && (
                      <Image
                        src={getAbsoluteImageUrl(foto.url)}
                        style={stylesVisitaTecnica.photo}
                      />
                    )}
                    <Text style={stylesVisitaTecnica.photoCaption}>
                      {foto.descripcion || foto.comentario || `Foto ${index + 1}`}
                    </Text>
                  </View>
                ))}
              </View>

              {visita.estadoLugar.fotos.length > 8 && (
                <Text style={[stylesVisitaTecnica.textContent, { marginTop: 12, fontStyle: 'italic' }]}>
                  + {visita.estadoLugar.fotos.length - 8} fotografías adicionales disponibles en el sistema.
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={stylesVisitaTecnica.footer}>
          <View style={stylesVisitaTecnica.footerRow}>
            <View>
              <Text style={stylesVisitaTecnica.footerBrand}>Sistema de Gestión de Servicios Generales</Text>
              <Text style={stylesVisitaTecnica.footerText}>DIG Group - Servicios Profesionales</Text>
            </View>
            <View>
              <Text style={stylesVisitaTecnica.footerText}>
                Generado: {formatDate(getCurrentDate())} {formatTime(getCurrentDate())}
              </Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}

// Hook para generar enlaces de descarga de PDF
export const usePDFGenerator = () => {
  const generateOrdenReport = (orden, reportes = [], userRole) => {
    return (
      <PDFDownloadLink
        document={<OrdenReportDocument orden={orden} reportes={reportes} userRole={userRole} />}
        fileName={`reporte-${orden.id}.pdf`}
        className="btn-primary inline-flex items-center"
      >
        {({ blob, url, loading, error }) =>
          loading ? '📄 Generando PDF...' : '📄 Descargar PDF'
        }
      </PDFDownloadLink>
    )
  }

  const generateVisitaTecnicaReport = (visita, fotos = [], userRole = 'admin') => {
    return (
      <PDFDownloadLink
        document={<VisitaTecnicaDocument visita={visita} fotos={fotos} userRole={userRole} />}
        fileName={`visita-tecnica-${visita.id}.pdf`}
        className="btn-primary inline-flex items-center"
      >
        {({ blob, url, loading, error }) =>
          loading ? '📄 Generando PDF...' : '📄 Exportar PDF'
        }
      </PDFDownloadLink>
    )
  }

  const generatePresupuestoReport = (presupuesto, userRole = 'admin') => {
    return (
      <PDFDownloadLink
        document={<PresupuestoDocument presupuesto={presupuesto} userRole={userRole} />}
        fileName={`cotizacion-${presupuesto.numero}.pdf`}
        className="btn-secondary inline-flex items-center"
      >
        {({ blob, url, loading, error }) =>
          loading ? '📄 Generando PDF...' : '📄 Descargar PDF'
        }
      </PDFDownloadLink>
    )
  }

  const generateInformeSimple = (orden, informeFinal, reportes = []) => {
    return (
      <PDFDownloadLink
        document={<InformeSimpleDocument orden={orden} informeFinal={informeFinal} reportes={reportes} />}
        fileName={`informe-simple-${orden?.id || 'orden'}.pdf`}
        className="btn-primary w-full inline-flex items-center justify-center"
      >
        {({ blob, url, loading, error }) =>
          loading ? '⏳ Generando PDF...' : '📥 Descargar PDF Simple'
        }
      </PDFDownloadLink>
    )
  }

  const generateInformeCompleto = (orden, informeFinal, reportes = []) => {
    return (
      <PDFDownloadLink
        document={<InformeCompletoDocument orden={orden} informeFinal={informeFinal} reportes={reportes} />}
        fileName={`informe-completo-${orden?.id || 'orden'}.pdf`}
        className="btn-primary w-full inline-flex items-center justify-center"
      >
        {({ blob, url, loading, error }) =>
          loading ? '⏳ Generando PDF...' : '📥 Descargar PDF Completo'
        }
      </PDFDownloadLink>
    )
  }

  return {
    generateOrdenReport,
    generateVisitaTecnicaReport,
    generatePresupuestoReport,
    generateInformeSimple,
    generateInformeCompleto
  }
}

// Helper para obtener nombre del cliente de forma segura
const getClienteNombreSeguro = (presupuesto) => {
  if (!presupuesto) return 'No especificado'

  // Si cliente es string, retornarlo
  if (typeof presupuesto.cliente === 'string' && presupuesto.cliente) {
    return presupuesto.cliente
  }

  // Si cliente es objeto, extraer nombre
  if (typeof presupuesto.cliente === 'object' && presupuesto.cliente !== null) {
    return presupuesto.cliente.nombre || presupuesto.cliente.name || 'No especificado'
  }

  // Fallback a clienteData
  if (presupuesto.clienteData?.nombre) {
    return presupuesto.clienteData.nombre
  }

  return 'No especificado'
}

// ============================================================================
// ESTILOS PROFESIONALES PARA COTIZACIÓN PDF - D&G GROUP
// ============================================================================
const stylesCotizacion = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 0,
    fontFamily: 'Helvetica',
    fontSize: 9
  },
  // Header corporativo con banda de color
  headerBand: {
    backgroundColor: '#1e3a5f',
    height: 8
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 20,
    paddingRight: 30,
    paddingBottom: 15,
    paddingLeft: 30,
    borderBottom: 2,
    borderBottomColor: '#e5e7eb'
  },
  logoSection: {
    width: '45%'
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e3a5f',
    letterSpacing: 0.5
  },
  companyTagline: {
    fontSize: 8,
    color: '#64748b',
    marginTop: 2,
    letterSpacing: 1,
    textTransform: 'uppercase'
  },
  companyInfo: {
    fontSize: 8,
    color: '#475569',
    marginTop: 6,
    lineHeight: 1.4
  },
  quotationBadge: {
    backgroundColor: '#1e3a5f',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 4,
    alignItems: 'center'
  },
  quotationLabel: {
    fontSize: 9,
    color: '#94a3b8',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4
  },
  quotationNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 1
  },
  // Contenedor principal
  mainContent: {
    paddingHorizontal: 30
  },
  // Grid de información (cliente + cotización lado a lado)
  infoGrid: {
    flexDirection: 'row',
    marginTop: 20
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    padding: 12,
    border: 1,
    borderColor: '#e2e8f0',
    marginRight: 8
  },
  infoCardLast: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    padding: 12,
    border: 1,
    borderColor: '#e2e8f0',
    marginLeft: 8
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottom: 1,
    borderBottomColor: '#e2e8f0'
  },
  infoCardIcon: {
    width: 20,
    height: 20,
    backgroundColor: '#1e3a5f',
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  infoCardTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1e3a5f',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 5
  },
  infoLabel: {
    fontSize: 8,
    color: '#64748b',
    width: '35%'
  },
  infoValue: {
    fontSize: 9,
    color: '#1e293b',
    width: '65%',
    fontWeight: 'bold'
  },
  infoValueLight: {
    fontSize: 9,
    color: '#475569',
    width: '65%'
  },
  // Sección de observaciones/descripción
  descriptionSection: {
    marginTop: 15,
    backgroundColor: '#fffbeb',
    border: 1,
    borderColor: '#fcd34d',
    borderRadius: 6,
    padding: 12
  },
  descriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  descriptionIcon: {
    width: 16,
    height: 16,
    backgroundColor: '#f59e0b',
    borderRadius: 3,
    marginRight: 8
  },
  descriptionTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#92400e',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  descriptionText: {
    fontSize: 9,
    color: '#78350f',
    lineHeight: 1.5
  },
  // Tabla de items - diseño profesional
  tableSection: {
    marginTop: 20
  },
  tableTitleBar: {
    backgroundColor: '#1e3a5f',
    paddingVertical: 8,
    paddingHorizontal: 12
  },
  tableTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  table: {
    border: 1,
    borderColor: '#e2e8f0',
    borderTop: 0
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottom: 1,
    borderBottomColor: '#cbd5e1'
  },
  tableHeaderCell: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    fontSize: 8,
    fontWeight: 'bold',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.3
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: 1,
    borderBottomColor: '#f1f5f9'
  },
  tableRowAlt: {
    backgroundColor: '#fafafa'
  },
  tableCell: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    fontSize: 9,
    color: '#334155'
  },
  tableCellBold: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    fontSize: 9,
    color: '#1e293b',
    fontWeight: 'bold'
  },
  tableCellRight: {
    textAlign: 'right'
  },
  tableCellCenter: {
    textAlign: 'center'
  },
  // Detalle técnico
  technicalSection: {
    marginTop: 15,
    border: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden'
  },
  technicalHeader: {
    backgroundColor: '#64748b',
    paddingVertical: 6,
    paddingHorizontal: 10
  },
  technicalTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  technicalGrid: {
    padding: 10
  },
  technicalItem: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottom: 1,
    borderBottomColor: '#f1f5f9'
  },
  technicalItemHeader: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#1e3a5f',
    marginBottom: 4
  },
  technicalRow: {
    flexDirection: 'row',
    marginBottom: 3
  },
  technicalLabel: {
    fontSize: 7,
    color: '#64748b',
    width: '25%'
  },
  technicalValue: {
    fontSize: 8,
    color: '#334155',
    width: '75%'
  },
  // Totales - diseño elegante
  totalsContainer: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  totalsBox: {
    width: 220,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    border: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden'
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottom: 1,
    borderBottomColor: '#e2e8f0'
  },
  totalsLabel: {
    fontSize: 9,
    color: '#64748b'
  },
  totalsValue: {
    fontSize: 9,
    color: '#334155',
    fontWeight: 'bold'
  },
  totalsFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#1e3a5f'
  },
  totalsFinalLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff'
  },
  totalsFinalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#34d399'
  },
  // Notas/Observaciones
  notesSection: {
    marginTop: 15,
    backgroundColor: '#f0fdf4',
    border: 1,
    borderColor: '#86efac',
    borderRadius: 6,
    padding: 12
  },
  notesTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#166534',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  notesText: {
    fontSize: 9,
    color: '#15803d',
    lineHeight: 1.5
  },
  // Footer profesional
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 30,
    backgroundColor: '#f8fafc',
    borderTop: 1,
    borderTopColor: '#e2e8f0'
  },
  footerLeft: {
    flex: 1
  },
  footerText: {
    fontSize: 7,
    color: '#64748b'
  },
  footerValidez: {
    fontSize: 8,
    color: '#1e3a5f',
    fontWeight: 'bold',
    marginTop: 2
  },
  footerRight: {
    alignItems: 'flex-end'
  },
  footerBrand: {
    fontSize: 8,
    color: '#1e3a5f',
    fontWeight: 'bold'
  },
  footerBandBottom: {
    backgroundColor: '#1e3a5f',
    height: 4
  }
})

// Helpers para datos seguros del cliente
const getClienteData = (presupuesto, field, defaultValue = '-') => {
  if (!presupuesto) return defaultValue

  // Intentar desde clienteData primero
  if (presupuesto.clienteData && presupuesto.clienteData[field]) {
    return presupuesto.clienteData[field]
  }

  // Intentar desde cliente si es objeto
  if (typeof presupuesto.cliente === 'object' && presupuesto.cliente !== null) {
    return presupuesto.cliente[field] || defaultValue
  }

  return defaultValue
}

const formatFechaCotizacion = (fecha) => {
  if (!fecha) return '-'
  try {
    const date = new Date(fecha)
    if (isNaN(date.getTime())) return '-'
    return date.toLocaleDateString('es-PE', {
      timeZone: 'America/Lima',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  } catch {
    return '-'
  }
}

// Componente del documento PDF para presupuesto/cotización - REDISEÑADO
const PresupuestoDocument = ({ presupuesto, userRole }) => {
  // Datos seguros del cliente
  const clienteNombre = getClienteNombreSeguro(presupuesto)
  const clienteTipo = getClienteData(presupuesto, 'tipo', '')
  const clienteRuc = getClienteData(presupuesto, 'ruc', '-')
  const clienteDireccion = getClienteData(presupuesto, 'direccion', '-')
  const clienteContacto = getClienteData(presupuesto, 'contacto', '-')
  const clienteTelefono = getClienteData(presupuesto, 'telefono', '-')
  const clienteEmail = getClienteData(presupuesto, 'email', '-')
  const esEmpresa = clienteTipo === 'empresa'

  // Datos de la cotización con fallbacks seguros
  const validezDias = presupuesto?.validezDias || 30
  const condicionesPago = presupuesto?.condicionesPago || 'A definir'
  const observaciones = presupuesto?.observaciones || ''
  const items = presupuesto?.items || []

  // Totales seguros (evitar NaN)
  const safeNumber = (value) => {
    const num = parseFloat(value)
    return isNaN(num) ? 0 : num
  }
  const subtotal = safeNumber(presupuesto?.subtotal)
  const igv = safeNumber(presupuesto?.igv)
  const total = safeNumber(presupuesto?.total)

  // Verificar si hay detalles técnicos
  const tieneDetallesTecnicos = items.some(item =>
    item.descripcionMateriales || item.manoObra || item.equiposServicio || item.entregablesContratista
  )

  return (
    <Document>
      <Page size="A4" style={stylesCotizacion.page}>
        {/* Banda superior de color */}
        <View style={stylesCotizacion.headerBand} />

        {/* Header con logo e información */}
        <View style={stylesCotizacion.headerContainer}>
          <View style={stylesCotizacion.logoSection}>
            <Text style={stylesCotizacion.companyName}>DIG Group S.A.C.</Text>
            <Text style={stylesCotizacion.companyTagline}>Servicios Generales y Mantenimiento</Text>
            <Text style={stylesCotizacion.companyInfo}>
              RUC: 20123456789{'\n'}
              Av. Los Ingenieros 123, Lima - Perú{'\n'}
              Tel: (01) 234-5678 | ventas@diggroup.pe
            </Text>
          </View>

          <View style={stylesCotizacion.quotationBadge}>
            <Text style={stylesCotizacion.quotationLabel}>Cotización</Text>
            <Text style={stylesCotizacion.quotationNumber}>{presupuesto?.numero || 'S/N'}</Text>
          </View>
        </View>

        {/* Contenido principal */}
        <View style={stylesCotizacion.mainContent}>
          {/* Grid de información: Cliente + Cotización */}
          <View style={stylesCotizacion.infoGrid}>
            {/* Tarjeta del Cliente */}
            <View style={stylesCotizacion.infoCard}>
              <View style={stylesCotizacion.infoCardHeader}>
                <View style={stylesCotizacion.infoCardIcon} />
                <Text style={stylesCotizacion.infoCardTitle}>Datos del Cliente</Text>
              </View>
              <View style={stylesCotizacion.infoRow}>
                <Text style={stylesCotizacion.infoLabel}>Razón Social:</Text>
                <Text style={stylesCotizacion.infoValue}>{clienteNombre}</Text>
              </View>
              <View style={stylesCotizacion.infoRow}>
                <Text style={stylesCotizacion.infoLabel}>RUC/DNI:</Text>
                <Text style={stylesCotizacion.infoValueLight}>{clienteRuc}</Text>
              </View>
              <View style={stylesCotizacion.infoRow}>
                <Text style={stylesCotizacion.infoLabel}>Dirección:</Text>
                <Text style={stylesCotizacion.infoValueLight}>{clienteDireccion}</Text>
              </View>
              {esEmpresa && (
                <View style={stylesCotizacion.infoRow}>
                  <Text style={stylesCotizacion.infoLabel}>Contacto:</Text>
                  <Text style={stylesCotizacion.infoValueLight}>{clienteContacto}</Text>
                </View>
              )}
              <View style={stylesCotizacion.infoRow}>
                <Text style={stylesCotizacion.infoLabel}>Teléfono:</Text>
                <Text style={stylesCotizacion.infoValueLight}>{clienteTelefono}</Text>
              </View>
              {clienteEmail !== '-' && (
                <View style={stylesCotizacion.infoRow}>
                  <Text style={stylesCotizacion.infoLabel}>Email:</Text>
                  <Text style={stylesCotizacion.infoValueLight}>{clienteEmail}</Text>
                </View>
              )}
            </View>

            {/* Tarjeta de la Cotización */}
            <View style={stylesCotizacion.infoCardLast}>
              <View style={stylesCotizacion.infoCardHeader}>
                <View style={stylesCotizacion.infoCardIcon} />
                <Text style={stylesCotizacion.infoCardTitle}>Datos de la Cotización</Text>
              </View>
              <View style={stylesCotizacion.infoRow}>
                <Text style={stylesCotizacion.infoLabel}>Fecha:</Text>
                <Text style={stylesCotizacion.infoValue}>
                  {formatFechaCotizacion(presupuesto?.fechaCotizacion)}
                </Text>
              </View>
              <View style={stylesCotizacion.infoRow}>
                <Text style={stylesCotizacion.infoLabel}>Validez:</Text>
                <Text style={stylesCotizacion.infoValueLight}>{validezDias} días</Text>
              </View>
              <View style={stylesCotizacion.infoRow}>
                <Text style={stylesCotizacion.infoLabel}>Vence:</Text>
                <Text style={stylesCotizacion.infoValueLight}>
                  {formatFechaCotizacion(presupuesto?.fechaVencimiento)}
                </Text>
              </View>
              <View style={stylesCotizacion.infoRow}>
                <Text style={stylesCotizacion.infoLabel}>Pago:</Text>
                <Text style={stylesCotizacion.infoValueLight}>{condicionesPago}</Text>
              </View>
              <View style={stylesCotizacion.infoRow}>
                <Text style={stylesCotizacion.infoLabel}>Elaborado:</Text>
                <Text style={stylesCotizacion.infoValueLight}>
                  {presupuesto?.elaboradoPor || 'Sistema'}
                </Text>
              </View>
            </View>
          </View>

          {/* Sección de observaciones/descripción - CORREGIDO: usa 'observaciones' */}
          {observaciones && (
            <View style={stylesCotizacion.descriptionSection}>
              <View style={stylesCotizacion.descriptionHeader}>
                <View style={stylesCotizacion.descriptionIcon} />
                <Text style={stylesCotizacion.descriptionTitle}>Descripción / Observaciones</Text>
              </View>
              <Text style={stylesCotizacion.descriptionText}>{observaciones}</Text>
            </View>
          )}

          {/* Tabla de Items */}
          <View style={stylesCotizacion.tableSection}>
            <View style={stylesCotizacion.tableTitleBar}>
              <Text style={stylesCotizacion.tableTitle}>Detalle de la Cotización</Text>
            </View>

            <View style={stylesCotizacion.table}>
              {/* Header de tabla */}
              <View style={stylesCotizacion.tableHeader}>
                <Text style={[stylesCotizacion.tableHeaderCell, { width: '8%', textAlign: 'center' }]}>#</Text>
                <Text style={[stylesCotizacion.tableHeaderCell, { width: userRole === 'admin' ? '37%' : '52%' }]}>Descripción</Text>
                <Text style={[stylesCotizacion.tableHeaderCell, { width: '10%', textAlign: 'center' }]}>Cant.</Text>
                <Text style={[stylesCotizacion.tableHeaderCell, { width: '12%', textAlign: 'center' }]}>Unidad</Text>
                {userRole === 'admin' && (
                  <>
                    <Text style={[stylesCotizacion.tableHeaderCell, { width: '15%', textAlign: 'right' }]}>P. Unit.</Text>
                    <Text style={[stylesCotizacion.tableHeaderCell, { width: '18%', textAlign: 'right' }]}>Subtotal</Text>
                  </>
                )}
              </View>

              {/* Filas de items */}
              {items.map((item, index) => (
                <View
                  key={index}
                  style={[
                    stylesCotizacion.tableRow,
                    index % 2 === 1 && stylesCotizacion.tableRowAlt
                  ]}
                >
                  <Text style={[stylesCotizacion.tableCell, { width: '8%', textAlign: 'center' }]}>
                    {index + 1}
                  </Text>
                  <Text style={[stylesCotizacion.tableCellBold, { width: userRole === 'admin' ? '37%' : '52%' }]}>
                    {item.descripcion || '-'}
                  </Text>
                  <Text style={[stylesCotizacion.tableCell, { width: '10%', textAlign: 'center' }]}>
                    {safeNumber(item.cantidad)}
                  </Text>
                  <Text style={[stylesCotizacion.tableCell, { width: '12%', textAlign: 'center' }]}>
                    {item.unidad || '-'}
                  </Text>
                  {userRole === 'admin' && (
                    <>
                      <Text style={[stylesCotizacion.tableCell, { width: '15%', textAlign: 'right' }]}>
                        S/ {safeNumber(item.precioUnitario).toFixed(2)}
                      </Text>
                      <Text style={[stylesCotizacion.tableCellBold, { width: '18%', textAlign: 'right' }]}>
                        S/ {safeNumber(item.subtotal).toFixed(2)}
                      </Text>
                    </>
                  )}
                </View>
              ))}
            </View>
          </View>

          {/* Detalles técnicos (si existen) */}
          {tieneDetallesTecnicos && (
            <View style={stylesCotizacion.technicalSection}>
              <View style={stylesCotizacion.technicalHeader}>
                <Text style={stylesCotizacion.technicalTitle}>Detalle Técnico de Servicios</Text>
              </View>
              <View style={stylesCotizacion.technicalGrid}>
                {items.map((item, index) => {
                  if (item.descripcionMateriales || item.manoObra || item.equiposServicio || item.entregablesContratista) {
                    return (
                      <View key={index} style={stylesCotizacion.technicalItem}>
                        <Text style={stylesCotizacion.technicalItemHeader}>
                          Item {index + 1}: {item.descripcion || '-'}
                        </Text>
                        {item.descripcionMateriales && (
                          <View style={stylesCotizacion.technicalRow}>
                            <Text style={stylesCotizacion.technicalLabel}>Materiales:</Text>
                            <Text style={stylesCotizacion.technicalValue}>{item.descripcionMateriales}</Text>
                          </View>
                        )}
                        {item.manoObra && (
                          <View style={stylesCotizacion.technicalRow}>
                            <Text style={stylesCotizacion.technicalLabel}>Mano de Obra:</Text>
                            <Text style={stylesCotizacion.technicalValue}>{item.manoObra}</Text>
                          </View>
                        )}
                        {item.equiposServicio && (
                          <View style={stylesCotizacion.technicalRow}>
                            <Text style={stylesCotizacion.technicalLabel}>Equipos:</Text>
                            <Text style={stylesCotizacion.technicalValue}>{item.equiposServicio}</Text>
                          </View>
                        )}
                        {item.entregablesContratista && (
                          <View style={stylesCotizacion.technicalRow}>
                            <Text style={stylesCotizacion.technicalLabel}>Entregables:</Text>
                            <Text style={stylesCotizacion.technicalValue}>{item.entregablesContratista}</Text>
                          </View>
                        )}
                      </View>
                    )
                  }
                  return null
                })}
              </View>
            </View>
          )}

          {/* Totales (solo admin) */}
          {userRole === 'admin' && (
            <View style={stylesCotizacion.totalsContainer}>
              <View style={stylesCotizacion.totalsBox}>
                <View style={stylesCotizacion.totalsRow}>
                  <Text style={stylesCotizacion.totalsLabel}>Subtotal</Text>
                  <Text style={stylesCotizacion.totalsValue}>S/ {subtotal.toFixed(2)}</Text>
                </View>
                <View style={stylesCotizacion.totalsRow}>
                  <Text style={stylesCotizacion.totalsLabel}>IGV (18%)</Text>
                  <Text style={stylesCotizacion.totalsValue}>S/ {igv.toFixed(2)}</Text>
                </View>
                <View style={stylesCotizacion.totalsFinal}>
                  <Text style={stylesCotizacion.totalsFinalLabel}>TOTAL</Text>
                  <Text style={stylesCotizacion.totalsFinalValue}>S/ {total.toFixed(2)}</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Footer profesional */}
        <View style={stylesCotizacion.footer}>
          <View style={stylesCotizacion.footerContent}>
            <View style={stylesCotizacion.footerLeft}>
              <Text style={stylesCotizacion.footerText}>
                Documento generado el {formatDate(getCurrentDate())}
              </Text>
              <Text style={stylesCotizacion.footerValidez}>
                Esta cotización tiene validez de {validezDias} días
              </Text>
            </View>
            <View style={stylesCotizacion.footerRight}>
              <Text style={stylesCotizacion.footerBrand}>DIG Group S.A.C.</Text>
              <Text style={stylesCotizacion.footerText}>www.diggroup.pe</Text>
            </View>
          </View>
          <View style={stylesCotizacion.footerBandBottom} />
        </View>
      </Page>
    </Document>
  )
}

// Documento PDF para Informe Simple (Solo Servicio) - Formato D&G Group
const InformeSimpleDocument = ({ orden, informeFinal, reportes }) => {
  // Obtener fecha actual formateada
  const fechaHoy = formatDateLong(getCurrentDate())
  
  // Obtener el usuario actual (simulado)
  const creadoPor = localStorage.getItem('currentUserName') || 'Sandra Juarez'
  
  return (
    <Document>
      <Page size="A4" style={stylesInforme.page}>
        {/* Encabezado con logo y título */}
        <View style={stylesInforme.headerContainer}>
          <View style={stylesInforme.logoContainer}>
            {/* Logo D&G Group */}
            <View style={{ 
              backgroundColor: '#003366', 
              padding: 8, 
              borderRadius: 3,
              alignItems: 'center'
            }}>
              <Text style={{ 
                fontSize: 16, 
                fontWeight: 'bold', 
                color: 'white' 
              }}>D&G</Text>
              <Text style={{ 
                fontSize: 8, 
                color: 'white' 
              }}>GROUP OF</Text>
              <Text style={{ 
                fontSize: 8, 
                color: 'white' 
              }}>COMPANIES</Text>
            </View>
          </View>
          <View style={stylesInforme.titleContainer}>
            <Text style={stylesInforme.mainTitle}>
              D&G GROUP OF COMPANIES SAC
            </Text>
            <Text style={stylesInforme.subtitle}>
              Reporte fotográfico
            </Text>
          </View>
        </View>

        {/* Información del reporte */}
        <View style={stylesInforme.infoSection}>
          <View style={stylesInforme.infoRow}>
            <Text style={stylesInforme.infoLabel}>DIRECCIÓN:</Text>
            <Text style={stylesInforme.infoValue}>
              {orden?.ubicacion || 'NESTLE PERÚ S.A. CHOCOLATES'}
            </Text>
          </View>
          <View style={stylesInforme.infoRow}>
            <Text style={stylesInforme.infoLabel}>PERSONAL RESPONSABLE:</Text>
            <Text style={stylesInforme.infoValue}>
              {orden?.tecnicoAsignado || 'Personal asignado'}
            </Text>
          </View>
          <View style={stylesInforme.infoRow}>
            <Text style={stylesInforme.infoLabel}>CLIENTE:</Text>
            <Text style={stylesInforme.infoValue}>
              {orden?.cliente || 'N/A'}
            </Text>
          </View>
        </View>

        {/* Reportes diarios con fotos */}
        {reportes?.map((reporte, index) => (
          <View key={index} style={{ marginBottom: 20 }}>
            {/* Fecha del reporte */}
            <View style={stylesInforme.dateSection}>
              <Text style={stylesInforme.dateText}>
                {reporte.fecha || `${fechaHoy} ${reporte.horaInicio || ''} ${reporte.horaFin ? `al ${reporte.horaFin}` : ''}`}
              </Text>
            </View>

            {/* Grid de fotos 4x */}
            <View style={stylesInforme.photoGrid}>
              {/* Fotos Antes */}
              {reporte.fotosAntes?.length > 0 && (
                <>
                  <Text style={{ 
                    width: '100%', 
                    fontSize: 9, 
                    fontWeight: 'bold',
                    color: '#003366',
                    marginBottom: 5 
                  }}>
                    ANTES:
                  </Text>
                  {reporte.fotosAntes.slice(0, 4).map((foto, fotoIndex) => (
                    <View key={`antes-${fotoIndex}`} style={stylesInforme.photoContainer}>
                      <View style={{ 
                        height: 100, 
                        backgroundColor: '#f0f0f0',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Text style={{ fontSize: 8, color: '#999' }}>
                          Foto {fotoIndex + 1}
                        </Text>
                      </View>
                      <Text style={stylesInforme.photoCaption}>
                        {foto.descripcion || `Imagen ${fotoIndex + 1}`}
                      </Text>
                    </View>
                  ))}
                </>
              )}
            
            {/* Fotos Después */}
            {reporte.fotosDespues?.length > 0 && (
              <>
                <Text style={{ 
                  width: '100%', 
                  fontSize: 9, 
                  fontWeight: 'bold',
                  color: '#003366',
                  marginBottom: 5,
                  marginTop: 10
                }}>
                  DESPUÉS:
                </Text>
                {reporte.fotosDespues.slice(0, 4).map((foto, fotoIndex) => (
                  <View key={`despues-${fotoIndex}`} style={stylesInforme.photoContainer}>
                    <View style={{ 
                      height: 100, 
                      backgroundColor: '#f0f0f0',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Text style={{ fontSize: 8, color: '#999' }}>
                        Foto {fotoIndex + 1}
                      </Text>
                    </View>
                    <Text style={stylesInforme.photoCaption}>
                      {foto.descripcion || `Imagen ${fotoIndex + 1}`}
                    </Text>
                  </View>
                ))}
              </>
            )}
            </View>

            {/* Descripción de actividades */}
            <View style={stylesInforme.activitySection}>
              <Text style={stylesInforme.activityTitle}>
                ACTIVIDADES REALIZADAS:
              </Text>
              <Text style={stylesInforme.activityText}>
                {reporte.descripcion || 'Sin descripción'}
              </Text>
              
              {/* Personal involucrado */}
              <View style={stylesInforme.personnelSection}>
                <Text style={stylesInforme.personnelTitle}>
                  Personal asignado:
                </Text>
                <Text style={stylesInforme.personnelList}>
                  • {reporte.tecnico || orden?.tecnicoAsignado || 'Técnico asignado'}
                </Text>
                {reporte.personalApoyo && (
                  <Text style={stylesInforme.personnelList}>
                    • {reporte.personalApoyo}
                  </Text>
                )}
              </View>
              
              {/* Materiales utilizados si existen */}
              {reporte.materialesUsados?.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  <Text style={stylesInforme.personnelTitle}>
                    Materiales utilizados:
                  </Text>
                  {reporte.materialesUsados.map((material, idx) => (
                    <Text key={idx} style={stylesInforme.personnelList}>
                      • {material.nombre} - Cantidad: {material.cantidad}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          </View>
        ))}

        {/* Resumen final si existe */}
        {informeFinal && (
          <View style={{ marginTop: 20, padding: 10, backgroundColor: '#f8f9fa' }}>
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#003366', marginBottom: 8 }}>
              RESUMEN FINAL DEL SERVICIO
            </Text>
            <View style={{ marginBottom: 5 }}>
              <Text style={{ fontSize: 9, fontWeight: 'bold' }}>
                Observaciones finales:
              </Text>
              <Text style={{ fontSize: 9, marginTop: 3 }}>
                {informeFinal.observaciones || 'Sin observaciones adicionales'}
              </Text>
              
              {informeFinal.recomendaciones && (
                <View style={{ marginTop: 5 }}>
                  <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 3 }}>
                    Recomendaciones:
                  </Text>
                  <Text style={{ fontSize: 9 }}>
                    {informeFinal.recomendaciones}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Footer con firma y datos de creación */}
        <View style={stylesInforme.footer}>
          <View style={stylesInforme.footerRow}>
            <Text style={stylesInforme.createdBy}>
              Creado por: {creadoPor}
            </Text>
            <Text style={stylesInforme.footerText}>
              {fechaHoy}
            </Text>
          </View>
          <View style={stylesInforme.footerRow}>
            <Text style={stylesInforme.footerText}>
              D&G GROUP OF COMPANIES SAC
            </Text>
            <Text style={stylesInforme.pageNumber}>
              Página 1
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

// Documento PDF para Informe Completo (Con Documentación) - Formato D&G Group
const InformeCompletoDocument = ({ orden, informeFinal, reportes }) => {
  const fechaHoy = formatDateLong(getCurrentDate())
  
  const creadoPor = localStorage.getItem('currentUserName') || 'Sandra Juarez'
  
  return (
    <Document>
      {/* Primera página - Contenido del informe simple */}
      <Page size="A4" style={stylesInforme.page}>
        {/* Encabezado con logo y título */}
        <View style={stylesInforme.headerContainer}>
          <View style={stylesInforme.logoContainer}>
            {/* Logo D&G Group */}
            <View style={{ 
              backgroundColor: '#003366', 
              padding: 8, 
              borderRadius: 3,
              alignItems: 'center'
            }}>
              <Text style={{ 
                fontSize: 16, 
                fontWeight: 'bold', 
                color: 'white' 
              }}>D&G</Text>
              <Text style={{ 
                fontSize: 8, 
                color: 'white' 
              }}>GROUP OF</Text>
              <Text style={{ 
                fontSize: 8, 
                color: 'white' 
              }}>COMPANIES</Text>
            </View>
          </View>
          <View style={stylesInforme.titleContainer}>
            <Text style={stylesInforme.mainTitle}>
              D&G GROUP OF COMPANIES SAC
            </Text>
            <Text style={stylesInforme.subtitle}>
              Reporte fotográfico con documentación completa
            </Text>
          </View>
        </View>
        {/* Información del reporte */}
        <View style={stylesInforme.infoSection}>
          <View style={stylesInforme.infoRow}>
            <Text style={stylesInforme.infoLabel}>DIRECCIÓN:</Text>
            <Text style={stylesInforme.infoValue}>
              {orden?.ubicacion || 'NESTLE PERÚ S.A. CHOCOLATES'}
            </Text>
          </View>
          <View style={stylesInforme.infoRow}>
            <Text style={stylesInforme.infoLabel}>PERSONAL RESPONSABLE:</Text>
            <Text style={stylesInforme.infoValue}>
              {orden?.tecnicoAsignado || 'Personal asignado'}
            </Text>
          </View>
          <View style={stylesInforme.infoRow}>
            <Text style={stylesInforme.infoLabel}>CLIENTE:</Text>
            <Text style={stylesInforme.infoValue}>
              {orden?.cliente || 'N/A'}
            </Text>
          </View>
        </View>

        {/* Resumen de reportes con fotos (versión compacta) */}
        {reportes?.slice(0, 2).map((reporte, index) => (
          <View key={index} style={{ marginBottom: 15 }}>
            <View style={stylesInforme.dateSection}>
              <Text style={stylesInforme.dateText}>
                {reporte.fecha} - Reporte {index + 1}
              </Text>
            </View>
            
            {/* Grid compacto de fotos */}
            <View style={stylesInforme.photoGrid}>
              {reporte.fotosAntes?.slice(0, 2).map((foto, fotoIndex) => (
                <View key={`antes-${fotoIndex}`} style={stylesInforme.photoContainer}>
                  <View style={{ 
                    height: 80, 
                    backgroundColor: '#f0f0f0',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Text style={{ fontSize: 7, color: '#999' }}>
                      Antes {fotoIndex + 1}
                    </Text>
                  </View>
                </View>
              ))}
              {reporte.fotosDespues?.slice(0, 2).map((foto, fotoIndex) => (
                <View key={`despues-${fotoIndex}`} style={stylesInforme.photoContainer}>
                  <View style={{ 
                    height: 80, 
                    backgroundColor: '#f0f0f0',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Text style={{ fontSize: 7, color: '#999' }}>
                      Después {fotoIndex + 1}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
            
            <Text style={{ fontSize: 8, marginTop: 5, color: '#666' }}>
              {reporte.descripcion?.substring(0, 100)}...
            </Text>
          </View>
        ))}
        
        {reportes?.length > 2 && (
          <Text style={{ fontSize: 8, fontStyle: 'italic', color: '#666', marginBottom: 10 }}>
            Ver {reportes.length - 2} reportes adicionales en las siguientes páginas...
          </Text>
        )}

        {/* Footer */}
        <View style={stylesInforme.footer}>
          <View style={stylesInforme.footerRow}>
            <Text style={stylesInforme.createdBy}>
              Creado por: {creadoPor}
            </Text>
            <Text style={stylesInforme.footerText}>
              {fechaHoy}
            </Text>
          </View>
          <View style={stylesInforme.footerRow}>
            <Text style={stylesInforme.footerText}>
              D&G GROUP OF COMPANIES SAC
            </Text>
            <Text style={stylesInforme.pageNumber}>
              Página 1
            </Text>
          </View>
        </View>
      </Page>

      {/* Segunda página - Documentación de Seguridad */}
      <Page size="A4" style={stylesInforme.page}>
        {/* Encabezado */}
        <View style={stylesInforme.headerContainer}>
          <View style={stylesInforme.logoContainer}>
            <View style={{ 
              backgroundColor: '#003366', 
              padding: 8, 
              borderRadius: 3,
              alignItems: 'center'
            }}>
              <Text style={{ 
                fontSize: 16, 
                fontWeight: 'bold', 
                color: 'white' 
              }}>D&G</Text>
              <Text style={{ 
                fontSize: 8, 
                color: 'white' 
              }}>GROUP OF</Text>
              <Text style={{ 
                fontSize: 8, 
                color: 'white' 
              }}>COMPANIES</Text>
            </View>
          </View>
          <View style={stylesInforme.titleContainer}>
            <Text style={stylesInforme.mainTitle}>
              DOCUMENTACIÓN DE SEGURIDAD Y MEDIO AMBIENTE
            </Text>
            <Text style={stylesInforme.subtitle}>
              Documentos adjuntos al servicio
            </Text>
          </View>
        </View>
        
        <View style={stylesInforme.infoSection}>
          <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#003366', marginBottom: 10 }}>
            DOCUMENTOS INCLUIDOS EN ESTE INFORME:
          </Text>
          
          {/* Lista de documentos por reporte */}
          {reportes?.map((reporte, index) => (
            <View key={index} style={{ marginBottom: 15, padding: 8, backgroundColor: '#f9f9f9', borderRadius: 3 }}>
              <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#003366', marginBottom: 8 }}>
                📅 Reporte {index + 1} - {reporte.fecha}
              </Text>
              
              {/* ATS */}
              {reporte.atsDocument && (
                <View style={{ marginBottom: 5 }}>
                  <Text style={{ fontSize: 9, color: '#333' }}>
                    ✅ ATS (Análisis de Trabajo Seguro) - Adjunto
                  </Text>
                  <Text style={{ fontSize: 8, color: '#666', marginLeft: 20 }}>
                    Archivo: {reporte.atsDocument.name || 'ats_documento.pdf'}
                  </Text>
                </View>
              )}
              
              {/* Aspectos Ambientales */}
              {reporte.aspectosAmbientalesDocument && (
                <View style={{ marginBottom: 5 }}>
                  <Text style={{ fontSize: 9, color: '#333' }}>
                    ✅ Aspectos Ambientales - Adjunto
                  </Text>
                  <Text style={{ fontSize: 8, color: '#666', marginLeft: 20 }}>
                    Archivo: {reporte.aspectosAmbientalesDocument.name || 'aspectos_ambientales.pdf'}
                  </Text>
                </View>
              )}
              
              {/* PTR */}
              {reporte.ptrDocument && (
                <View style={{ marginBottom: 5 }}>
                  <Text style={{ fontSize: 9, color: '#333' }}>
                    ✅ PTR (Permiso de Trabajo de Riesgo) - Adjunto
                  </Text>
                  <Text style={{ fontSize: 8, color: '#666', marginLeft: 20 }}>
                    Archivo: {reporte.ptrDocument.name || 'ptr_documento.pdf'}
                  </Text>
                </View>
              )}
              
              {/* Si no hay documentos */}
              {!reporte.atsDocument && !reporte.aspectosAmbientalesDocument && !reporte.ptrDocument && (
                <Text style={{ fontSize: 8, fontStyle: 'italic', color: '#999' }}>
                  Sin documentos de seguridad adjuntos
                </Text>
              )}
            </View>
          ))}
          
          {/* Resumen de documentación final */}
          {informeFinal && (
            <View style={{ marginTop: 20, padding: 10, backgroundColor: '#e8f4f8', borderRadius: 3 }}>
              <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#003366', marginBottom: 8 }}>
                📋 DOCUMENTACIÓN FINAL DEL SERVICIO
              </Text>
              
              {informeFinal.atsDocument && (
                <Text style={{ fontSize: 9, color: '#333', marginBottom: 3 }}>
                  ✅ ATS Final - {informeFinal.atsDocument.name || 'Adjunto'}
                </Text>
              )}
              
              {informeFinal.aspectosAmbientalesDocument && (
                <Text style={{ fontSize: 9, color: '#333', marginBottom: 3 }}>
                  ✅ Aspectos Ambientales Final - {informeFinal.aspectosAmbientalesDocument.name || 'Adjunto'}
                </Text>
              )}
              
              {informeFinal.ptrDocument && (
                <Text style={{ fontSize: 9, color: '#333', marginBottom: 3 }}>
                  ✅ PTR Final - {informeFinal.ptrDocument.name || 'Adjunto'}
                </Text>
              )}
              
              <Text style={{ fontSize: 8, fontStyle: 'italic', color: '#666', marginTop: 10 }}>
                Nota: Los documentos originales están adjuntos a este informe y pueden ser 
                visualizados con un lector de PDF compatible.
              </Text>
            </View>
          )}
        </View>
        
        {/* Footer */}
        <View style={stylesInforme.footer}>
          <View style={stylesInforme.footerRow}>
            <Text style={stylesInforme.createdBy}>
              Creado por: {creadoPor}
            </Text>
            <Text style={stylesInforme.footerText}>
              {fechaHoy}
            </Text>
          </View>
          <View style={stylesInforme.footerRow}>
            <Text style={stylesInforme.footerText}>
              D&G GROUP OF COMPANIES SAC
            </Text>
            <Text style={stylesInforme.pageNumber}>
              Página 2
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

export default OrdenReportDocument