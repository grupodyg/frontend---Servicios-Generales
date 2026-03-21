import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'
import { getCurrentDate, formatDate, formatTime } from './dateUtils'

// Estilos para el PDF de Boleta
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 40,
    fontFamily: 'Helvetica'
  },
  header: {
    marginBottom: 30,
    borderBottom: 3,
    borderBottomColor: '#1e40af',
    paddingBottom: 15
  },
  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 5
  },
  documentTitle: {
    fontSize: 16,
    color: '#374151',
    fontWeight: 'bold'
  },
  section: {
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottom: 1,
    borderBottomColor: '#e5e7eb'
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
    width: '40%',
    color: '#6b7280'
  },
  value: {
    fontSize: 10,
    width: '60%',
    color: '#111827'
  },
  table: {
    marginTop: 15,
    border: 1,
    borderColor: '#e5e7eb'
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: 1,
    borderBottomColor: '#e5e7eb',
    minHeight: 30,
    alignItems: 'center'
  },
  tableHeader: {
    backgroundColor: '#f3f4f6',
    fontWeight: 'bold'
  },
  tableCell: {
    fontSize: 10,
    padding: 8,
    flex: 1
  },
  tableCellRight: {
    fontSize: 10,
    padding: 8,
    flex: 1,
    textAlign: 'right'
  },
  tableCellBold: {
    fontSize: 11,
    padding: 8,
    flex: 1,
    fontWeight: 'bold'
  },
  totalSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f0fdf4',
    border: 2,
    borderColor: '#10b981',
    borderRadius: 5
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#065f46'
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669'
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTop: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10
  },
  footerText: {
    fontSize: 8,
    color: '#6b7280',
    textAlign: 'center'
  },
  watermark: {
    fontSize: 8,
    color: '#9ca3af',
    marginTop: 5,
    textAlign: 'center',
    fontStyle: 'italic'
  }
})

// Componente del documento PDF para Boleta
export const BoletaPDFDocument = ({ boleta }) => {
  // Usar campos directos de la boleta
  const salarioBase = boleta.salarioBase || 0
  const horasExtras = boleta.horasExtras || 0
  const bonificaciones = boleta.bonificaciones || 0
  const deducciones = boleta.deducciones || 0

  // Calcular monto de horas extras (evitar division por cero)
  const montoHorasExtras = salarioBase > 0 ? (horasExtras * (salarioBase / 240)).toFixed(2) : '0.00'

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.companyName}>DIG GROUP S.A.C.</Text>
          <Text style={styles.documentTitle}>BOLETA DE PAGO</Text>
        </View>

        {/* Información del Empleado */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>INFORMACIÓN DEL EMPLEADO</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Nombre:</Text>
            <Text style={styles.value}>{boleta.empleadoNombre || 'No especificado'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Cargo:</Text>
            <Text style={styles.value}>{boleta.cargo || 'No especificado'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>ID Empleado:</Text>
            <Text style={styles.value}>{boleta.empleadoId || 'N/A'}</Text>
          </View>
        </View>

        {/* Información del Periodo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PERIODO DE PAGO</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Periodo:</Text>
            <Text style={styles.value}>{boleta.periodo || 'No especificado'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Fecha de Emisión:</Text>
            <Text style={styles.value}>
              {boleta.fechaSubida ? new Date(boleta.fechaSubida).toLocaleDateString('es-ES', {
                timeZone: 'America/Lima',
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              }) : 'No especificada'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>ID Boleta:</Text>
            <Text style={styles.value}>{boleta.id || 'N/A'}</Text>
          </View>
        </View>

        {/* Detalle de Remuneraciones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DETALLE DE REMUNERACIONES Y DESCUENTOS</Text>

          <View style={styles.table}>
            {/* Header */}
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.tableCell}>CONCEPTO</Text>
              <Text style={styles.tableCellRight}>MONTO (S/)</Text>
            </View>

            {/* Ingresos */}
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Salario Base</Text>
              <Text style={styles.tableCellRight}>
                {salarioBase.toFixed(2)}
              </Text>
            </View>

            {horasExtras > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>
                  Horas Extras ({horasExtras}h)
                </Text>
                <Text style={styles.tableCellRight}>
                  {montoHorasExtras}
                </Text>
              </View>
            )}

            {bonificaciones > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>Bonificaciones</Text>
                <Text style={styles.tableCellRight}>
                  {bonificaciones.toFixed(2)}
                </Text>
              </View>
            )}

            {/* Subtotal de Ingresos */}
            <View style={[styles.tableRow, { backgroundColor: '#f9fafb' }]}>
              <Text style={styles.tableCellBold}>Subtotal Ingresos</Text>
              <Text style={[styles.tableCellBold, { textAlign: 'right' }]}>
                {(salarioBase + parseFloat(montoHorasExtras) + bonificaciones).toFixed(2)}
              </Text>
            </View>

            {/* Descuentos */}
            {deducciones > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>Deducciones</Text>
                <Text style={[styles.tableCellRight, { color: '#ef4444' }]}>
                  -{deducciones.toFixed(2)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Total Neto a Pagar */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>NETO A PAGAR:</Text>
            <Text style={styles.totalValue}>
              S/ {(boleta.montoTotal || 0).toFixed(2)}
            </Text>
          </View>
          <Text style={{ fontSize: 8, color: '#065f46', textAlign: 'center', marginTop: 5 }}>
            Son: {numeroALetras(boleta.montoTotal || 0)} SOLES
          </Text>
        </View>

        {/* Observaciones */}
        <View style={styles.section}>
          <Text style={{ fontSize: 8, color: '#6b7280', fontStyle: 'italic' }}>
            Esta boleta de pago es un documento oficial y debe ser conservada para sus registros personales.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            DIG GROUP S.A.C. - Sistema de Gestión de Recursos Humanos
          </Text>
          <Text style={styles.footerText}>
            Documento generado el {formatDate(getCurrentDate())} a las {formatTime(getCurrentDate())}
          </Text>
          <Text style={styles.watermark}>
            Este documento es una representación impresa de la boleta de pago electrónica.
          </Text>
        </View>
      </Page>
    </Document>
  )
}

// Función auxiliar para convertir número a letras (simplificada)
function numeroALetras(numero) {
  const entero = Math.floor(numero)
  const decimal = Math.round((numero - entero) * 100)

  // Conversión básica (puedes expandir esto para números más grandes)
  const unidades = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE']
  const decenas = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA']
  const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE']
  const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS']

  let resultado = ''

  if (entero === 0) {
    resultado = 'CERO'
  } else if (entero < 10) {
    resultado = unidades[entero]
  } else if (entero < 20) {
    resultado = especiales[entero - 10]
  } else if (entero < 100) {
    const dec = Math.floor(entero / 10)
    const uni = entero % 10
    resultado = decenas[dec] + (uni > 0 ? ' Y ' + unidades[uni] : '')
  } else if (entero < 1000) {
    const cent = Math.floor(entero / 100)
    const resto = entero % 100
    resultado = (entero === 100 ? 'CIEN' : centenas[cent])
    if (resto > 0) {
      if (resto < 10) {
        resultado += ' ' + unidades[resto]
      } else if (resto < 20) {
        resultado += ' ' + especiales[resto - 10]
      } else {
        const dec = Math.floor(resto / 10)
        const uni = resto % 10
        resultado += ' ' + decenas[dec] + (uni > 0 ? ' Y ' + unidades[uni] : '')
      }
    }
  } else {
    // Para números mayores a 1000, una versión simplificada
    const miles = Math.floor(entero / 1000)
    const resto = entero % 1000
    resultado = (miles === 1 ? 'MIL' : unidades[miles] + ' MIL')
    if (resto > 0) {
      resultado += ' ' + numeroALetras(resto)
    }
  }

  return resultado + (decimal > 0 ? ` CON ${decimal}/100` : '')
}

// Función para generar el PDF como Blob
export const generarBoletaPDF = async (boleta) => {
  const blob = await pdf(<BoletaPDFDocument boleta={boleta} />).toBlob()
  return blob
}
