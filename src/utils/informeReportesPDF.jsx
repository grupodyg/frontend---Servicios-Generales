/**
 * Informe PDF de reportes diarios y fotografías de una orden de trabajo.
 *
 * Se usa desde la pestaña "Reportes y Fotografías" del detalle de la orden en
 * dos modos, ambos con la misma plantilla:
 *  - Consolidado: todos los reportes de la orden.
 *  - Individual: un único reporte.
 *
 * La identidad de la empresa (logo, nombre) y los datos del trabajo provienen
 * de la configuración y de la orden; el documento no contiene datos fijos.
 */
import { Document, Page, Text, View, StyleSheet, Image, pdf } from '@react-pdf/renderer'
import { getFileUrl } from '../config/api'
import { formatDate, formatDateLong, getToday } from './dateUtils'
import { loadPdfBranding, rasterizePhotos } from './pdfBranding'

const COLORS = {
  texto: '#1f2937',
  textoSuave: '#6b7280',
  borde: '#d1d5db',
  bordeSuave: '#e5e7eb',
  fondoSuave: '#f9fafb',
  acento: '#1d4ed8',
  antes: '#b91c1c',
  despues: '#047857'
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 36,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: COLORS.texto,
    backgroundColor: '#ffffff'
  },

  // Cabecera corporativa
  marca: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.acento,
    paddingBottom: 10,
    marginBottom: 18
  },
  marcaLogo: {
    height: 46,
    maxWidth: 150,
    objectFit: 'contain',
    marginRight: 12
  },
  marcaTextos: {
    flexGrow: 1
  },
  marcaNombre: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.texto
  },
  marcaSubtitulo: {
    fontSize: 8,
    color: COLORS.textoSuave,
    marginTop: 2
  },
  marcaEtiqueta: {
    fontSize: 8,
    color: COLORS.textoSuave,
    textAlign: 'right'
  },

  // Cabecera repetida en las páginas de reportes
  cabeceraFija: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bordeSuave,
    paddingBottom: 6,
    marginBottom: 14
  },
  cabeceraFijaLogo: {
    height: 22,
    maxWidth: 80,
    objectFit: 'contain',
    marginRight: 8
  },
  cabeceraFijaTexto: {
    fontSize: 8,
    color: COLORS.textoSuave,
    flexGrow: 1
  },

  // Portada
  portadaTitulo: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4
  },
  portadaTrabajo: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.acento,
    marginBottom: 16
  },
  fichaFila: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bordeSuave,
    paddingVertical: 5
  },
  fichaEtiqueta: {
    width: 130,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.textoSuave
  },
  fichaValor: {
    flexGrow: 1,
    fontSize: 9
  },
  resumen: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 22
  },
  resumenItem: {
    flexGrow: 1,
    width: '25%',
    borderWidth: 1,
    borderColor: COLORS.bordeSuave,
    backgroundColor: COLORS.fondoSuave,
    borderRadius: 3,
    padding: 8
  },
  resumenValor: {
    fontSize: 15,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.acento
  },
  resumenEtiqueta: {
    fontSize: 7,
    color: COLORS.textoSuave,
    marginTop: 3
  },

  // Reporte
  reporteTitulo: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3
  },
  reporteMeta: {
    fontSize: 8,
    color: COLORS.textoSuave,
    marginBottom: 10
  },
  bloque: {
    marginBottom: 10
  },
  bloqueTitulo: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4
  },
  bloqueTexto: {
    fontSize: 9,
    lineHeight: 1.4,
    textAlign: 'justify'
  },
  bloqueTextoSuave: {
    fontSize: 9,
    lineHeight: 1.4,
    color: COLORS.textoSuave
  },
  lista: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bordeSuave,
    paddingVertical: 3
  },
  listaTexto: {
    fontSize: 9
  },

  // Documentación de seguridad
  docsFila: {
    flexDirection: 'row',
    gap: 8
  },
  docsItem: {
    width: '32%',
    borderWidth: 1,
    borderColor: COLORS.bordeSuave,
    borderRadius: 3,
    padding: 6
  },
  docsNombre: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold'
  },
  docsEstado: {
    fontSize: 7,
    color: COLORS.textoSuave,
    marginTop: 2
  },

  // Fotografías
  fotoGrupoTitulo: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6
  },
  fotoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  fotoItem: {
    width: '48%',
    borderWidth: 1,
    borderColor: COLORS.borde,
    borderRadius: 3,
    padding: 4,
    marginBottom: 8
  },
  foto: {
    width: '100%',
    height: 140,
    objectFit: 'cover'
  },
  fotoPie: {
    fontSize: 7,
    color: COLORS.textoSuave,
    marginTop: 3
  },

  pie: {
    position: 'absolute',
    bottom: 22,
    left: 36,
    right: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.bordeSuave,
    paddingTop: 5,
    fontSize: 7,
    color: COLORS.textoSuave
  }
})

const SIN_DATO = 'No registrado'

/** Normaliza una fecha del backend a 'YYYY-MM-DD' para evitar desfases de zona horaria. */
const soloFecha = (fecha) => (fecha ? String(fecha).split('T')[0] : '')

/** Normaliza una hora del backend ('HH:mm:ss' o ISO) a 'HH:mm'. */
const soloHora = (hora) => {
  if (!hora) return ''
  const texto = String(hora)
  const desdeISO = texto.includes('T') ? texto.split('T')[1] : texto
  return desdeISO.slice(0, 5)
}

const rangoFechas = (reportes) => {
  const fechas = reportes.map((reporte) => soloFecha(reporte.fecha)).filter(Boolean).sort()
  if (fechas.length === 0) return SIN_DATO
  const inicio = formatDateLong(fechas[0])
  const fin = formatDateLong(fechas[fechas.length - 1])
  return inicio === fin ? inicio : `${inicio} al ${fin}`
}

const horasTrabajadas = (reportes) =>
  reportes.reduce((total, reporte) => {
    const inicio = soloHora(reporte.horasIniciales)
    const fin = soloHora(reporte.horasFinales)
    if (!inicio || !fin) return total

    const [horaInicio, minutoInicio] = inicio.split(':').map(Number)
    const [horaFin, minutoFin] = fin.split(':').map(Number)
    const minutos = horaFin * 60 + minutoFin - (horaInicio * 60 + minutoInicio)
    return minutos > 0 ? total + minutos / 60 : total
  }, 0)

const contarFotos = (reportes) =>
  reportes.reduce(
    (total, reporte) => total + (reporte.fotosAntes?.length || 0) + (reporte.fotosDespues?.length || 0),
    0
  )

const avancePromedio = (reportes) =>
  reportes.length > 0
    ? Math.round(reportes.reduce((suma, reporte) => suma + (reporte.porcentajeAvance || 0), 0) / reportes.length)
    : 0

/** Reúne las URLs de todas las fotografías de un conjunto de reportes. */
const urlsDeFotos = (reportes) =>
  reportes.flatMap((reporte) =>
    [...(reporte.fotosAntes || []), ...(reporte.fotosDespues || [])].map((foto) => getFileUrl(foto?.url || foto))
  )

const Ficha = ({ etiqueta, valor }) => (
  <View style={styles.fichaFila}>
    <Text style={styles.fichaEtiqueta}>{etiqueta}</Text>
    <Text style={styles.fichaValor}>{valor || SIN_DATO}</Text>
  </View>
)

const ResumenItem = ({ valor, etiqueta }) => (
  <View style={styles.resumenItem}>
    <Text style={styles.resumenValor}>{valor}</Text>
    <Text style={styles.resumenEtiqueta}>{etiqueta}</Text>
  </View>
)

const Marca = ({ branding, etiqueta }) => (
  <View style={styles.marca}>
    {branding.logo && <Image style={styles.marcaLogo} src={branding.logo.dataUrl} />}
    <View style={styles.marcaTextos}>
      {!!branding.companyName && <Text style={styles.marcaNombre}>{branding.companyName}</Text>}
      {!!branding.companySubtitle && <Text style={styles.marcaSubtitulo}>{branding.companySubtitle}</Text>}
    </View>
    <Text style={styles.marcaEtiqueta}>{etiqueta}</Text>
  </View>
)

const CabeceraFija = ({ branding, nombreTrabajo, ordenId }) => (
  <View style={styles.cabeceraFija} fixed>
    {branding.logo && <Image style={styles.cabeceraFijaLogo} src={branding.logo.dataUrl} />}
    <Text style={styles.cabeceraFijaTexto}>{nombreTrabajo}</Text>
    <Text style={styles.cabeceraFijaTexto}>{ordenId}</Text>
  </View>
)

const Pie = ({ emitidoEl }) => (
  <View style={styles.pie} fixed>
    <Text>Emitido el {emitidoEl}</Text>
    <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
  </View>
)

const GrupoFotos = ({ titulo, color, fotos, fotosPreparadas }) => {
  const disponibles = (fotos || [])
    .map((foto) => ({
      dataUrl: fotosPreparadas.get(getFileUrl(foto?.url || foto)),
      nombre: foto?.nombre || foto?.descripcion || ''
    }))
    .filter((foto) => Boolean(foto.dataUrl))

  if (disponibles.length === 0) return null

  return (
    <View style={styles.bloque}>
      <Text style={{ ...styles.fotoGrupoTitulo, color }}>
        {titulo} ({disponibles.length})
      </Text>
      <View style={styles.fotoGrid}>
        {disponibles.map((foto, index) => (
          <View key={index} style={styles.fotoItem} wrap={false}>
            <Image style={styles.foto} src={foto.dataUrl} />
            <Text style={styles.fotoPie}>{foto.nombre || `Fotografía ${index + 1}`}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const DocumentoSeguridad = ({ nombre, documentos, requerido }) => {
  const adjuntados = documentos || []
  const estado = adjuntados.length > 0
    ? adjuntados.map((documento) => documento.nombre || 'Documento adjunto').join(', ')
    : requerido
      ? 'Requerido — no adjuntado'
      : 'No adjuntado'

  return (
    <View style={styles.docsItem}>
      <Text style={styles.docsNombre}>{nombre}</Text>
      <Text style={styles.docsEstado}>{estado}</Text>
    </View>
  )
}

const PaginaReporte = ({ reporte, orden, branding, fotosPreparadas, emitidoEl, nombreTrabajo }) => {
  const fecha = soloFecha(reporte.fecha)
  const inicio = soloHora(reporte.horasIniciales)
  const fin = soloHora(reporte.horasFinales)
  const materiales = reporte.materialesUtilizados || []
  const tieneFotos =
    (reporte.fotosAntes?.length || 0) + (reporte.fotosDespues?.length || 0) > 0

  return (
    <Page size="A4" style={styles.page}>
      <CabeceraFija branding={branding} nombreTrabajo={nombreTrabajo} ordenId={orden?.id} />

      <Text style={styles.reporteTitulo}>
        Reporte del {fecha ? formatDateLong(fecha) : SIN_DATO}
      </Text>
      <Text style={styles.reporteMeta}>
        Técnico: {reporte.tecnico || SIN_DATO}
        {inicio && fin ? `   |   Horario: ${inicio} - ${fin}` : ''}
        {`   |   Avance: ${reporte.porcentajeAvance ?? 0}%`}
        {reporte.trabajoEnAltura ? '   |   Trabajo en altura' : ''}
      </Text>

      <View style={styles.bloque}>
        <Text style={styles.bloqueTitulo}>Descripción del trabajo</Text>
        <Text style={styles.bloqueTexto}>{reporte.descripcion || SIN_DATO}</Text>
      </View>

      {!!reporte.observaciones && (
        <View style={styles.bloque}>
          <Text style={styles.bloqueTitulo}>Observaciones</Text>
          <Text style={styles.bloqueTexto}>{reporte.observaciones}</Text>
        </View>
      )}

      {!!reporte.proximasTareas && (
        <View style={styles.bloque}>
          <Text style={styles.bloqueTitulo}>Próximas tareas</Text>
          <Text style={styles.bloqueTexto}>{reporte.proximasTareas}</Text>
        </View>
      )}

      {materiales.length > 0 && (
        <View style={styles.bloque}>
          <Text style={styles.bloqueTitulo}>Materiales utilizados</Text>
          {materiales.map((material, index) => (
            <View key={index} style={styles.lista}>
              <Text style={styles.listaTexto}>{material.nombre}</Text>
              <Text style={styles.listaTexto}>
                {material.cantidad} {material.unidad}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.bloque}>
        <Text style={styles.bloqueTitulo}>Documentación de seguridad y medio ambiente</Text>
        <View style={styles.docsFila}>
          <DocumentoSeguridad nombre="ATS" documentos={reporte.atsDocs} requerido />
          <DocumentoSeguridad nombre="Aspectos ambientales" documentos={reporte.aspectosAmbientalesDocs} />
          <DocumentoSeguridad nombre="PTR" documentos={reporte.ptrDocs} requerido={reporte.trabajoEnAltura} />
        </View>
      </View>

      <GrupoFotos
        titulo="Fotografías ANTES"
        color={COLORS.antes}
        fotos={reporte.fotosAntes}
        fotosPreparadas={fotosPreparadas}
      />
      <GrupoFotos
        titulo="Fotografías DESPUÉS"
        color={COLORS.despues}
        fotos={reporte.fotosDespues}
        fotosPreparadas={fotosPreparadas}
      />

      {!tieneFotos && (
        <Text style={styles.bloqueTextoSuave}>Este reporte no registra fotografías.</Text>
      )}

      <Pie emitidoEl={emitidoEl} />
    </Page>
  )
}

/**
 * Documento del informe. Recibe las fotografías ya convertidas a data URL
 * porque @react-pdf/renderer no puede resolverlas de forma asíncrona.
 */
export const InformeReportesDocumento = ({
  orden,
  reportes,
  branding,
  fotosPreparadas,
  emitidoEl,
  esIndividual
}) => {
  const nombreTrabajo = orden?.nombreProyecto || orden?.descripcion || `Orden ${orden?.id || ''}`.trim()
  const titulo = esIndividual ? 'Reporte de trabajo y fotografías' : 'Informe de reportes y fotografías'

  return (
    <Document
      title={`${titulo} - ${nombreTrabajo}`}
      author={branding.companyName || undefined}
      subject={nombreTrabajo}
    >
      {/* Portada */}
      <Page size="A4" style={styles.page}>
        <Marca branding={branding} etiqueta={`Emitido el ${emitidoEl}`} />

        <Text style={styles.portadaTitulo}>{titulo}</Text>
        <Text style={styles.portadaTrabajo}>{nombreTrabajo}</Text>

        <Ficha etiqueta="Orden de trabajo" valor={orden?.id} />
        <Ficha etiqueta="Cliente" valor={orden?.cliente} />
        <Ficha etiqueta="Tipo de servicio" valor={orden?.tipoServicio} />
        <Ficha etiqueta="Ubicación" valor={orden?.ubicacion} />
        <Ficha etiqueta="Técnico asignado" valor={orden?.tecnicoAsignado} />
        <Ficha etiqueta="Solicitado por" valor={orden?.solicitadoPor} />
        <Ficha etiqueta="Período reportado" valor={rangoFechas(reportes)} />

        <View style={styles.resumen}>
          <ResumenItem valor={reportes.length} etiqueta={esIndividual ? 'Reporte' : 'Reportes'} />
          <ResumenItem valor={contarFotos(reportes)} etiqueta="Fotografías" />
          <ResumenItem valor={`${horasTrabajadas(reportes).toFixed(1)} h`} etiqueta="Horas registradas" />
          <ResumenItem valor={`${avancePromedio(reportes)}%`} etiqueta="Avance promedio" />
        </View>

        <Pie emitidoEl={emitidoEl} />
      </Page>

      {/* Una página por reporte */}
      {reportes.map((reporte) => (
        <PaginaReporte
          key={reporte.id}
          reporte={reporte}
          orden={orden}
          branding={branding}
          fotosPreparadas={fotosPreparadas}
          emitidoEl={emitidoEl}
          nombreTrabajo={nombreTrabajo}
        />
      ))}
    </Document>
  )
}

const normalizarNombreArchivo = (texto) =>
  String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60)

/**
 * Genera y descarga el informe PDF de reportes y fotografías.
 *
 * @param {{ orden: object, reportes: object[], reporte?: object }} params
 *        `reporte` genera el informe de un único reporte; en su ausencia se
 *        consolidan todos los de `reportes`.
 * @returns {Promise<void>}
 */
export const descargarInformeReportes = async ({ orden, reportes, reporte }) => {
  const seleccionados = reporte ? [reporte] : reportes || []
  if (seleccionados.length === 0) {
    throw new Error('No hay reportes para exportar')
  }

  const [branding, fotosPreparadas] = await Promise.all([
    loadPdfBranding(),
    rasterizePhotos(urlsDeFotos(seleccionados))
  ])

  const emitidoEl = formatDate(getToday())
  const documento = (
    <InformeReportesDocumento
      orden={orden}
      reportes={seleccionados}
      branding={branding}
      fotosPreparadas={fotosPreparadas}
      emitidoEl={emitidoEl}
      esIndividual={Boolean(reporte)}
    />
  )

  const blob = await pdf(documento).toBlob()
  const nombreTrabajo = normalizarNombreArchivo(orden?.nombreProyecto || orden?.tipoServicio || 'Trabajo')
  const nombreArchivo = reporte
    ? `Reporte_${orden?.id || ''}_${reporte.id}_${nombreTrabajo}.pdf`
    : `Informe_Reportes_${orden?.id || ''}_${nombreTrabajo}.pdf`

  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombreArchivo
  document.body.appendChild(enlace)
  enlace.click()
  document.body.removeChild(enlace)
  URL.revokeObjectURL(url)
}

export default InformeReportesDocumento
