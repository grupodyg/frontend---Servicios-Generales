import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { API_BASE_URL } from '../config/api'

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
    flexDirection: 'column'
  },
  logo: {
    width: 200,
    height: 80,
    alignSelf: 'center',
    marginBottom: 30
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'left',
    marginBottom: 5
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'left',
    marginBottom: 3
  },
  dateRange: {
    fontSize: 11,
    textAlign: 'right',
    position: 'absolute',
    top: 120,
    right: 40
  },
  projectTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 20
  },
  // Páginas de contenido
  daySection: {
    marginBottom: 25,
    pageBreakInside: 'avoid'
  },
  dayHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    marginTop: 15
  },
  timeRange: {
    fontSize: 10,
    marginBottom: 8,
    fontWeight: 'bold'
  },
  projectLine: {
    fontSize: 10,
    marginBottom: 8
  },
  sectionLabel: {
    fontSize: 10,
    marginTop: 8,
    marginBottom: 3
  },
  nameList: {
    fontSize: 10,
    marginLeft: 0,
    marginBottom: 2
  },
  activityText: {
    fontSize: 10,
    marginBottom: 3,
    lineHeight: 1.4
  },
  createdBy: {
    fontSize: 9,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10
  },
  photoContainer: {
    width: '48%',
    marginBottom: 10
  },
  photo: {
    width: '100%',
    height: 150,
    objectFit: 'cover'
  },
  photoCaption: {
    fontSize: 8,
    marginTop: 3,
    fontStyle: 'italic',
    color: '#666'
  },
  separator: {
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    marginVertical: 15
  }
})

const ReporteFotograficoEstandar = ({ ordenData, reportes }) => {
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

  // Formatear fecha completa
  const formatDateFull = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    return `${dias[date.getDay()]} ${date.getDate()} ${meses[date.getMonth()]} ${date.getFullYear()}`
  }

  // Formatear hora
  const formatTime = (dateStr) => {
    if (!dateStr) return '00:00:00'
    const date = new Date(dateStr)
    return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  // Obtener rango de fechas
  const getRangoFechas = () => {
    if (!reportes || reportes.length === 0) return ''
    const fechas = reportes.map(r => new Date(r.fecha)).sort((a, b) => a - b)
    const inicio = fechas[0]
    const fin = fechas[fechas.length - 1]
    return `${inicio.getDate()} de ${['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][inicio.getMonth()]} ${inicio.getFullYear()} al ${fin.getDate()} de ${['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][fin.getMonth()]} ${fin.getFullYear()}`
  }

  // Agrupar reportes por fecha
  const reportesPorFecha = reportes.reduce((acc, reporte) => {
    const fecha = new Date(reporte.fecha).toDateString()
    if (!acc[fecha]) {
      acc[fecha] = []
    }
    acc[fecha].push(reporte)
    return acc
  }, {})

  return (
    <Document>
      {/* PÁGINA 1: PORTADA */}
      <Page size="A4" style={styles.page}>
        <View style={styles.coverPage}>
          <Text style={styles.title}>D&G GROUP OF COMPANIES SAC</Text>
          <Text style={styles.subtitle}>Reporte fotográfico</Text>
          <Text style={styles.dateRange}>{getRangoFechas()}</Text>
          <Text style={styles.projectTitle}>Proyecto: {ordenData?.id}/{ordenData?.cliente} - {ordenData?.tipoServicio}</Text>
        </View>

        {/* Primer día en la portada */}
        {Object.entries(reportesPorFecha).slice(0, 1).map(([fecha, reportesDia], diaIndex) => {
          // Obtener rango de horas del día
          const horas = reportesDia.map(r => new Date(r.fecha))
          const horaInicio = new Date(Math.min(...horas))
          const horaFin = new Date(Math.max(...horas))

          return (
            <View key={diaIndex} style={styles.daySection}>
              <Text style={styles.dayHeader}>{formatDateFull(reportesDia[0].fecha)}</Text>
              <Text style={styles.timeRange}>
                {formatTime(horaInicio)} a {formatTime(horaFin)}
              </Text>

              {reportesDia.map((reporte, repIndex) => (
                <View key={repIndex}>
                  <Text style={styles.projectLine}>
                    {ordenData?.id}/{ordenData?.cliente} - {ordenData?.tipoServicio} - {repIndex + 1} Avance de actividades
                  </Text>

                  {reporte.personal && reporte.personal.length > 0 && (
                    <>
                      <Text style={styles.sectionLabel}>Personal que intervino:</Text>
                      {reporte.personal.map((persona, pIndex) => (
                        <Text key={pIndex} style={styles.nameList}>{persona}</Text>
                      ))}
                    </>
                  )}

                  {reporte.descripcion && (
                    <>
                      <Text style={styles.sectionLabel}>Actividades:</Text>
                      <Text style={styles.activityText}>{reporte.descripcion}</Text>
                    </>
                  )}

                  {reporte.observaciones && (
                    <>
                      <Text style={styles.sectionLabel}>Conclusión:</Text>
                      <Text style={styles.activityText}>{reporte.observaciones}</Text>
                    </>
                  )}

                  <Text style={styles.createdBy}>Creado por: {reporte.tecnico || 'N/A'}</Text>

                  {/* Fotografías */}
                  {reporte.fotosAntes && reporte.fotosAntes.length > 0 && (
                    <View style={styles.photoGrid}>
                      {reporte.fotosAntes.slice(0, 4).map((foto, fIndex) => (
                        <View key={fIndex} style={styles.photoContainer}>
                          <Image src={getAbsoluteImageUrl(foto.url)} style={styles.photo} />
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )
        })}
      </Page>

      {/* PÁGINAS SIGUIENTES: Resto de días */}
      {Object.entries(reportesPorFecha).slice(1).map(([fecha, reportesDia], diaIndex) => {
        // Obtener rango de horas del día
        const horas = reportesDia.map(r => new Date(r.fecha))
        const horaInicio = new Date(Math.min(...horas))
        const horaFin = new Date(Math.max(...horas))

        return (
          <Page key={diaIndex + 1} size="A4" style={styles.page}>
            <View style={styles.daySection}>
              <Text style={styles.dayHeader}>{formatDateFull(reportesDia[0].fecha)}</Text>
              <Text style={styles.timeRange}>
                {formatTime(horaInicio)} a {formatTime(horaFin)}
              </Text>

              {reportesDia.map((reporte, repIndex) => (
                <View key={repIndex}>
                  <Text style={styles.projectLine}>
                    {ordenData?.id}/{ordenData?.cliente} - {ordenData?.tipoServicio} - {repIndex + 1} Avance de actividades
                  </Text>

                  {reporte.personal && reporte.personal.length > 0 && (
                    <>
                      <Text style={styles.sectionLabel}>Personal que intervino:</Text>
                      {reporte.personal.map((persona, pIndex) => (
                        <Text key={pIndex} style={styles.nameList}>{persona}</Text>
                      ))}
                    </>
                  )}

                  {reporte.descripcion && (
                    <>
                      <Text style={styles.sectionLabel}>Actividades:</Text>
                      <Text style={styles.activityText}>{reporte.descripcion}</Text>
                    </>
                  )}

                  {reporte.observaciones && (
                    <>
                      <Text style={styles.sectionLabel}>Conclusión:</Text>
                      <Text style={styles.activityText}>{reporte.observaciones}</Text>
                    </>
                  )}

                  <Text style={styles.createdBy}>Creado por: {reporte.tecnico || 'N/A'}</Text>

                  {/* Fotografías */}
                  {reporte.fotosAntes && reporte.fotosAntes.length > 0 && (
                    <View style={styles.photoGrid}>
                      {reporte.fotosAntes.slice(0, 4).map((foto, fIndex) => (
                        <View key={fIndex} style={styles.photoContainer}>
                          <Image src={getAbsoluteImageUrl(foto.url)} style={styles.photo} />
                        </View>
                      ))}
                    </View>
                  )}

                  {reporte.fotosDespues && reporte.fotosDespues.length > 0 && (
                    <View style={styles.photoGrid}>
                      {reporte.fotosDespues.slice(0, 4).map((foto, fIndex) => (
                        <View key={fIndex} style={styles.photoContainer}>
                          <Image src={getAbsoluteImageUrl(foto.url)} style={styles.photo} />
                        </View>
                      ))}
                    </View>
                  )}

                  {repIndex < reportesDia.length - 1 && <View style={styles.separator} />}
                </View>
              ))}
            </View>
          </Page>
        )
      })}
    </Document>
  )
}

export default ReporteFotograficoEstandar