import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Image, Font } from '@react-pdf/renderer'
import { getCurrentDate, formatDate, formatTime } from './dateUtils'
import { getFileUrl } from '../config/api'
import useBrandingStore from '../stores/brandingStore'

const getBranding = () => {
  const { companyName, companySubtitle } = useBrandingStore.getState()
  return {
    companyName: companyName || '',
    companySubtitle: companySubtitle || ''
  }
}

// Registrar fuentes para mejor tipografía
Font.register({
  family: 'Helvetica-Bold',
  src: 'https://fonts.gstatic.com/s/helveticaneue/v1/HelveticaNeue-Bold.ttf'
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
const OrdenReportDocument = ({ orden, reportes = [], userRole }) => {
  const { companyName, companySubtitle } = getBranding()
  const brandLine = [companyName, companySubtitle].filter(Boolean).join(' - ')
  return (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <Text style={styles.header}>{`${companyName} - Reporte de Orden`}</Text>
      
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
        {`Reporte generado el ${formatDate(getCurrentDate())} • ${brandLine}`}
      </Text>
    </Page>
  </Document>
  )
}

// Documento PDF para Visita Técnica
// Estilos mejorados para Visita Técnica
const stylesVisitaTecnica = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 25,
    paddingBottom: 70, // Reserva espacio para el footer fijo (evita solapes en saltos de página)
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
    height: 180,
    // 'contain': muestra la foto completa sin recortarla (cover la recortaba para llenar el recuadro)
    objectFit: 'contain',
    backgroundColor: '#f9fafb'
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
  const { companyName, companySubtitle } = getBranding()
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
            {visita.solpe && (
              <View style={stylesVisitaTecnica.infoItem}>
                <Text style={stylesVisitaTecnica.infoLabel}>SOLPE</Text>
                <Text style={stylesVisitaTecnica.infoValue}>{visita.solpe}</Text>
              </View>
            )}
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
                  <Text style={stylesVisitaTecnica.bullet}>•</Text>
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
                    <Text style={stylesVisitaTecnica.bullet}>•</Text>
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
                      <Text style={stylesVisitaTecnica.bullet}>•</Text>
                      <Text style={stylesVisitaTecnica.listText}>
                        <Text style={{ fontWeight: 'bold' }}>Cantidad:</Text> {visita.personalRequerido.cantidad} personas
                      </Text>
                    </View>
                  )}
                  {visita.personalRequerido.diasEstimados && (
                    <View style={stylesVisitaTecnica.listItem}>
                      <Text style={stylesVisitaTecnica.bullet}>•</Text>
                      <Text style={stylesVisitaTecnica.listText}>
                        <Text style={{ fontWeight: 'bold' }}>Días estimados:</Text> {visita.personalRequerido.diasEstimados} días
                      </Text>
                    </View>
                  )}
                  {visita.personalRequerido.especialidades?.length > 0 && (
                    <View style={stylesVisitaTecnica.listItem}>
                      <Text style={stylesVisitaTecnica.bullet}>•</Text>
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
            {/* minPresenceAhead: si no quedan ~160pt libres tras el título, salta de página (evita título huérfano) */}
            <Text style={stylesVisitaTecnica.sectionTitle} minPresenceAhead={160}>📸 REGISTRO FOTOGRÁFICO</Text>
            <View style={stylesVisitaTecnica.photosContainer}>
              <Text style={[stylesVisitaTecnica.textContent, { marginBottom: 12 }]}>
                Se registraron {visita.estadoLugar.fotos.length} fotografías durante la visita técnica.
              </Text>

              <View style={stylesVisitaTecnica.photoGrid}>
                {visita.estadoLugar.fotos.slice(0, 8).map((foto, index) => (
                  // wrap={false}: si la foto no cabe en la página actual,
                  // pasa completa a la siguiente (evita que se corte)
                  <View key={index} style={stylesVisitaTecnica.photoItem} wrap={false}>
                    {foto.url && (
                      <Image
                        src={getFileUrl(foto.url)}
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

        {/* Footer fijo en todas las páginas */}
        <View style={stylesVisitaTecnica.footer} fixed>
          <View style={stylesVisitaTecnica.footerRow}>
            <View>
              <Text style={stylesVisitaTecnica.footerBrand}>{companySubtitle}</Text>
              <Text style={stylesVisitaTecnica.footerText}>{companyName}</Text>
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
        {({ loading }) =>
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
        {({ loading }) =>
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
        {({ loading }) =>
          loading ? '📄 Generando PDF...' : '📄 Descargar PDF'
        }
      </PDFDownloadLink>
    )
  }

  return {
    generateOrdenReport,
    generateVisitaTecnicaReport,
    generatePresupuestoReport
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
// ESTILOS PROFESIONALES PARA COTIZACIÓN PDF
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
  const { companyName, companySubtitle } = getBranding()
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
            <Text style={stylesCotizacion.companyName}>{companyName}</Text>
            <Text style={stylesCotizacion.companyTagline}>{companySubtitle}</Text>
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
              <Text style={stylesCotizacion.footerBrand}>{companyName}</Text>
              <Text style={stylesCotizacion.footerText}>www.diggroup.pe</Text>
            </View>
          </View>
          <View style={stylesCotizacion.footerBandBottom} />
        </View>
      </Page>
    </Document>
  )
}

export default OrdenReportDocument
