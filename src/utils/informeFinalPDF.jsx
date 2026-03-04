import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer'
import { API_BASE_URL } from '../config/api'

// Registrar fuentes si es necesario
Font.register({
  family: 'Roboto',
  src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf'
})

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff'
  },
  // Portada
  coverPage: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: '100%'
  },
  headerText: {
    fontSize: 11,
    marginBottom: 3,
    color: '#000'
  },
  logo: {
    width: 500,
    height: 180,
    marginTop: 80,
    marginBottom: 30,
    alignSelf: 'center'
  },
  informeNumero: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 30,
    textDecoration: 'underline'
  },
  infoSection: {
    marginBottom: 15,
    backgroundColor: '#FFD700',
    padding: 20,
    borderRadius: 5
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    width: 100
  },
  infoValue: {
    fontSize: 11,
    flex: 1
  },
  objetivoSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#FFD700'
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    textDecoration: 'underline'
  },
  objetivoText: {
    fontSize: 10,
    lineHeight: 1.5,
    textAlign: 'justify'
  },
  // Páginas internas
  contentPage: {
    padding: 40
  },
  pageHeader: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'center'
  },
  smallLogo: {
    width: 120,
    height: 40
  },
  pageNumber: {
    position: 'absolute',
    bottom: 20,
    right: 40,
    fontSize: 9,
    color: '#666'
  },
  contentSectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10
  },
  table: {
    marginTop: 10,
    marginBottom: 20
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#4472C4',
    padding: 8,
    fontWeight: 'bold',
    color: 'white'
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    padding: 8,
    minHeight: 30
  },
  tableCell: {
    flex: 1,
    fontSize: 9,
    textAlign: 'center'
  },
  tableCellLeft: {
    flex: 1,
    fontSize: 9,
    textAlign: 'left'
  },
  tableCellWide: {
    flex: 2,
    fontSize: 9,
    textAlign: 'left'
  },
  bulletList: {
    marginLeft: 20,
    marginTop: 5
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 5
  },
  bullet: {
    width: 15,
    fontSize: 10
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 1.4
  },
  photoSection: {
    marginTop: 20,
    marginBottom: 20
  },
  photoTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    padding: 8,
    backgroundColor: '#4472C4',
    color: 'white'
  },
  photoContainer: {
    marginBottom: 15,
    alignItems: 'center'
  },
  photo: {
    width: 450,
    height: 300,
    objectFit: 'contain'
  },
  dateLabel: {
    fontSize: 9,
    color: '#666',
    textAlign: 'right',
    marginBottom: 10
  },
  approvalSection: {
    marginTop: 30
  },
  approvalTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: '#B4C7E7',
    padding: 10,
    marginBottom: 20
  },
  approvalTable: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#000'
  },
  approvalCell: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#000',
    padding: 20,
    minHeight: 120,
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  approvalCellLast: {
    flex: 1,
    padding: 20,
    minHeight: 120,
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  approvalSignature: {
    fontSize: 9,
    marginBottom: 10
  },
  approvalName: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  approvalLabel: {
    fontSize: 9,
    textAlign: 'center',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingTop: 5
  }
})

const InformeFinalPDF = ({ ordenData, reportes, formularioData, clienteContacto }) => {
  // Formatear fecha
  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: '2-digit' })
  }

  const formatDateFull = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

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

  return (
    <Document>
      {/* PÁGINA 1: PORTADA */}
      <Page size="A4" style={styles.page}>
        <View style={styles.coverPage}>
          {/* Información Superior */}
          <View>
            <Text style={styles.headerText}>INFORME N° {ordenData.id}</Text>
            <Text style={styles.headerText}>Señor: {clienteContacto?.nombre || 'N/A'}</Text>
            <Text style={styles.headerText}>Cliente: {ordenData.cliente}</Text>
            <Text style={styles.headerText}>Asunto: {formularioData.asunto}</Text>
            <Text style={styles.headerText}>Área: {formularioData.area}</Text>
            <Text style={styles.headerText}>Ubicado: {ordenData.ubicacion}</Text>
            <Text style={styles.headerText}>Fecha: {formatDate(formularioData.fechaFin)}</Text>
            <Text style={styles.headerText}>O.C {ordenData.numeroOrdenCompra || 'N/A'}</Text>
          </View>

          {/* Logo Central */}
          <View>
            <Text style={styles.informeNumero}>INFORME N° {ordenData.id}</Text>

            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Señor</Text>
                <Text style={styles.infoValue}>: {clienteContacto?.nombre || 'N/A'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Cliente</Text>
                <Text style={styles.infoValue}>: {ordenData.cliente}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Asunto</Text>
                <Text style={styles.infoValue}>: {formularioData.asunto}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Área</Text>
                <Text style={styles.infoValue}>: {formularioData.area}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Ubicado</Text>
                <Text style={styles.infoValue}>: {ordenData.ubicacion}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Fecha</Text>
                <Text style={styles.infoValue}>: {formatDate(formularioData.fechaFin)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>O.C</Text>
                <Text style={styles.infoValue}>{ordenData.numeroOrdenCompra || 'N/A'}</Text>
              </View>
            </View>
          </View>

          {/* Objetivo */}
          <View style={styles.objetivoSection}>
            <Text style={styles.sectionTitle}>Objetivo:</Text>
            <Text style={styles.objetivoText}>
              Detallar la metodología empleada en el servicio, así como los equipos, materiales e
              insumos que fueron empleados en esta actividad.
            </Text>
            <Text style={styles.objetivoText}>
              Reportar las observaciones no conformes en el servicio. Dar a conocer al cliente las
              recomendaciones que debe seguir para evitar daños en futuro y realizar un mantenimiento
              correctivo y preventivo dentro de los plazos correctos.
            </Text>
          </View>
        </View>
      </Page>

      {/* PÁGINA 2: ESQUEMA DE TRABAJO Y METODOLOGÍA */}
      <Page size="A4" style={styles.contentPage}>
        <Text style={styles.contentSectionTitle}>1. ESQUEMA DE TRABAJO:</Text>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableCell}>INTERVENCIÓN</Text>
            <Text style={styles.tableCellWide}>DESCRIPCIÓN DE ACTIVIDAD</Text>
            <Text style={styles.tableCell}>ESTATUS</Text>
            <Text style={styles.tableCellWide}>OBSERVACIONES</Text>
          </View>

          {formularioData.intervenciones.map((intervencion, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.tableCell}>{formatDateFull(intervencion.fecha)}</Text>
              <Text style={styles.tableCellWide}>{intervencion.descripcion}</Text>
              <Text style={styles.tableCell}>{intervencion.estatus}</Text>
              <Text style={styles.tableCellWide}>{intervencion.observaciones}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.contentSectionTitle}>2. METODOLOGÍA:</Text>
        <View style={styles.bulletList}>
          <View style={styles.bulletItem}>
            <Text style={styles.bullet}>✓</Text>
            <Text style={styles.bulletText}>
              Los trabajos se realizaron desde el {formatDateFull(formularioData.fechaInicio)} hasta el {formatDateFull(formularioData.fechaFin)}
            </Text>
          </View>
        </View>

        <Text style={styles.contentSectionTitle}>3. EQUIPOS Y MÁQUINAS EMPLEADOS PARA LA ACTIVIDAD:</Text>
        <View style={styles.bulletList}>
          {formularioData.equiposYMaquinas.map((equipo, index) => (
            <View key={index} style={styles.bulletItem}>
              <Text style={styles.bullet}>✓</Text>
              <Text style={styles.bulletText}>{equipo.nombre}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.contentSectionTitle}>4. MATERIALES E INSUMOS:</Text>
        <View style={styles.bulletList}>
          {formularioData.materialesInsumos.map((material, index) => (
            <View key={index} style={styles.bulletItem}>
              <Text style={styles.bullet}>✓</Text>
              <Text style={styles.bulletText}>
                {material.cantidad} {material.unidad} {material.nombre}
              </Text>
            </View>
          ))}
        </View>
      </Page>

      {/* PÁGINA 3: SEGURIDAD Y PROCESO */}
      <Page size="A4" style={styles.contentPage}>
        <Text style={styles.contentSectionTitle}>5. EQUIPOS DE SEGURIDAD COLECTIVO:</Text>
        <View style={styles.bulletList}>
          {formularioData.equiposSeguridad.map((equipo, index) => (
            <View key={index} style={styles.bulletItem}>
              <Text style={styles.bullet}>✓</Text>
              <Text style={styles.bulletText}>{equipo}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.contentSectionTitle}>6. PROCESO DE INTERVENCIÓN:</Text>
        <Text style={styles.bulletText}>{formularioData.procesoIntervencion}</Text>
      </Page>

      {/* PÁGINAS DE FOTOS ANTES */}
      {reportes.map((reporte, repIndex) => (
        reporte.fotosAntes && reporte.fotosAntes.length > 0 && (
          <Page key={`antes-${repIndex}`} size="A4" style={styles.contentPage}>
            <Text style={styles.dateLabel}>{formatDate(reporte.fecha)}</Text>
            <View style={styles.photoSection}>
              <Text style={styles.photoTitle}>7. IMÁGENES DEL ANTES:</Text>
              {reporte.fotosAntes.map((foto, fotoIndex) => (
                <View key={fotoIndex} style={styles.photoContainer}>
                  <Image src={getAbsoluteImageUrl(foto.url)} style={styles.photo} />
                </View>
              ))}
            </View>
          </Page>
        )
      ))}

      {/* PÁGINAS DE FOTOS DURANTE/PROCESO */}
      {reportes.map((reporte, repIndex) => (
        reporte.fotosDespues && reporte.fotosDespues.length > 0 && (
          <Page key={`proceso-${repIndex}`} size="A4" style={styles.contentPage}>
            <Text style={styles.dateLabel}>{formatDate(reporte.fecha)}</Text>
            <View style={styles.photoSection}>
              <Text style={styles.photoTitle}>IMÁGENES DEL PROCESO:</Text>
              {reporte.fotosDespues.map((foto, fotoIndex) => (
                <View key={fotoIndex} style={styles.photoContainer}>
                  <Image src={getAbsoluteImageUrl(foto.url)} style={styles.photo} />
                </View>
              ))}
            </View>
          </Page>
        )
      ))}

      {/* PÁGINA FINAL: APROBACIONES */}
      <Page size="A4" style={styles.contentPage}>
        <View style={styles.approvalSection}>
          <Text style={styles.approvalTitle}>APROBACIONES</Text>

          <View style={styles.approvalTable}>
            <View style={styles.approvalCell}>
              <View>
                <Text style={styles.approvalSignature}>[Firma]</Text>
                <Text style={styles.approvalName}>{formularioData.planificador.nombre}</Text>
              </View>
              <Text style={styles.approvalLabel}>V.B PLANIFICADOR</Text>
            </View>

            <View style={styles.approvalCell}>
              <View>
                <Text style={styles.approvalSignature}>[Firma]</Text>
                <Text style={styles.approvalName}>{formularioData.ejecutor.nombre}</Text>
              </View>
              <Text style={styles.approvalLabel}>V.B EJECUTOR</Text>
            </View>

            <View style={styles.approvalCellLast}>
              <View>
                <Text style={styles.approvalSignature}>[Firma]</Text>
                <Text style={styles.approvalName}>{formularioData.solicitante.nombre}</Text>
              </View>
              <Text style={styles.approvalLabel}>V.B SOLICITANTE</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}

export default InformeFinalPDF