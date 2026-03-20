import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts'
import useReportesStore from '../../stores/reportesStore'
import useOrdenesStore from '../../stores/ordenesStore'
import useMaterialesStore from '../../stores/materialesStore'
import useClientesStore from '../../stores/clientesStore'
import useAuthStore from '../../stores/authStore'
import { canViewPrices } from '../../utils/permissionsUtils'
import { usePDFGenerator } from '../../utils/pdfGenerator.jsx'
import { format, subDays, startOfMonth, endOfMonth, differenceInDays, isWithinInterval, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { getCurrentDate, formatDateTime } from '../../utils/dateUtils'
import DateRangePicker from '../../components/ui/DateRangePicker'

const Reportes = () => {
  const navigate = useNavigate()
  const { hasPermission, user } = useAuthStore()
  const { reportes, fetchReportesByOrden, fetchStatistics } = useReportesStore()
  const { ordenes, fetchOrdenes } = useOrdenesStore()
  const { getEstadisticasMateriales, getMaterialesBajoStock, fetchMateriales, fetchSolicitudes } = useMaterialesStore()
  const { clientes, fetchClientes } = useClientesStore()
  const { generateOrdenReport } = usePDFGenerator()

  const [activeTab, setActiveTab] = useState('resumen')
  const [dateRange, setDateRange] = useState('semana')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [selectedClient, setSelectedClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Estado para rango de fechas personalizado en Productividad
  const [productivityDateRange, setProductivityDateRange] = useState({
    startDate: null,
    endDate: null
  })
  const [productivityPeriod, setProductivityPeriod] = useState('semana') // 'semana', 'mes', 'trimestre', 'personalizado'

  // Estado para estadísticas reales de técnicos
  const [technicianStats, setTechnicianStats] = useState([])
  const [generalStats, setGeneralStats] = useState(null)
  const [dailyProductivityData, setDailyProductivityData] = useState([])
  const [kpisData, setKpisData] = useState(null)

  // Convertir periodo a días
  const getPeriodDays = (period) => {
    switch (period) {
      case 'semana': return 7
      case 'mes': return 30
      case 'trimestre': return 90
      default: return 7
    }
  }

  // Cargar datos iniciales
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('📊 Cargando reportes y estadísticas...')
        const days = getPeriodDays(dateRange)

        const [fetchedOrdenes, statistics] = await Promise.all([
          fetchOrdenes(),
          fetchStatistics(days, selectedClient),
          fetchMateriales(),
          fetchSolicitudes(),
          fetchClientes()
        ])

        console.log(`✅ ${fetchedOrdenes?.length || 0} órdenes cargadas`)
        console.log('📈 Estadísticas cargadas:', statistics)

        // Actualizar estado con datos reales
        if (statistics) {
          setTechnicianStats(statistics.technicians || [])
          setGeneralStats(statistics.general || null)
          setDailyProductivityData(statistics.dailyProductivity || [])
          setKpisData(statistics.kpis || null)
        }
      } catch (error) {
        console.error('❌ Error cargando reportes:', error)
      } finally {
        setLoading(false)
        setInitialLoadDone(true)
      }
    }
    loadData()
  }, [fetchOrdenes, fetchStatistics, fetchMateriales, fetchSolicitudes, fetchClientes])

  // Recargar estadísticas cuando cambia el periodo o el cliente
  useEffect(() => {
    if (!initialLoadDone) return
    const reloadStats = async () => {
      try {
        const days = getPeriodDays(dateRange)
        const statistics = await fetchStatistics(days, selectedClient)
        if (statistics) {
          setTechnicianStats(statistics.technicians || [])
          setGeneralStats(statistics.general || null)
          setDailyProductivityData(statistics.dailyProductivity || [])
          setKpisData(statistics.kpis || null)
        }
      } catch (error) {
        console.error('Error recargando estadísticas:', error)
      }
    }
    reloadStats()
  }, [dateRange, selectedClient, fetchStatistics, initialLoadDone])

  // Recargar productividad cuando cambia el período de productividad
  useEffect(() => {
    if (!initialLoadDone || activeTab !== 'productividad') return
    const reloadProductivityStats = async () => {
      try {
        let days
        if (productivityPeriod === 'personalizado' && productivityDateRange.startDate && productivityDateRange.endDate) {
          days = differenceInDays(productivityDateRange.endDate, productivityDateRange.startDate) + 1
        } else {
          days = getPeriodDays(productivityPeriod)
        }
        const statistics = await fetchStatistics(days, selectedClient)
        if (statistics) {
          setDailyProductivityData(statistics.dailyProductivity || [])
        }
      } catch (error) {
        console.error('Error recargando productividad:', error)
      }
    }
    reloadProductivityStats()
  }, [productivityPeriod, productivityDateRange, selectedClient, fetchStatistics, initialLoadDone, activeTab])

  // Usar datos reales de productividad - SIN datos inventados
  const productivityData = useMemo(() => {
    // Solo usar datos reales de productividad diaria
    if (dailyProductivityData && dailyProductivityData.length > 0) {
      let filteredData = dailyProductivityData

      // Si hay un rango personalizado, filtrar por fechas
      if (productivityPeriod === 'personalizado' && productivityDateRange.startDate && productivityDateRange.endDate) {
        filteredData = dailyProductivityData.filter(day => {
          const dayDate = new Date(day.date)
          return isWithinInterval(dayDate, {
            start: productivityDateRange.startDate,
            end: productivityDateRange.endDate
          })
        })
      }

      return filteredData.map(day => ({
        fecha: format(new Date(day.date), 'dd/MM', { locale: es }),
        reportes: parseInt(day.reports_count) || 0,
        tecnicosActivos: parseInt(day.technicians_active) || 0,
        promedioAvance: parseInt(day.avg_progress) || 0
      })).reverse() // Ordenar de más antiguo a más reciente
    }
    // Si no hay datos reales, devolver arreglo vacío (NO inventar datos)
    return []
  }, [dateRange, dailyProductivityData, productivityPeriod, productivityDateRange])

  // Helper para obtener etiqueta en español
  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pendiente',
      in_progress: 'En Proceso',
      completed: 'Completada',
      cancelled: 'Cancelada'
    }
    return labels[status] || status
  }

  // Órdenes filtradas por cliente seleccionado
  const filteredOrdenes = useMemo(() => {
    return selectedClient
      ? ordenes.filter(o => o.clienteId === selectedClient)
      : ordenes
  }, [ordenes, selectedClient])

  // Datos de órdenes por estado (normalizado)
  const ordenesEstado = useMemo(() => {
    return [
      {
        name: 'Completadas',
        value: filteredOrdenes.filter(o => o.estado === 'completed').length,
        color: '#059669'
      },
      {
        name: 'En Proceso',
        value: filteredOrdenes.filter(o => o.estado === 'in_progress').length,
        color: '#3b82f6'
      },
      {
        name: 'Pendientes',
        value: filteredOrdenes.filter(o => o.estado === 'pending').length,
        color: '#6b7280'
      },
    ]
  }, [filteredOrdenes])

  // Usar datos REALES de eficiencia por técnico (del backend)
  const eficienciaTecnicos = useMemo(() => {
    if (technicianStats && technicianStats.length > 0) {
      return technicianStats.map(tech => ({
        tecnico: tech.technician || 'Sin nombre',
        specialty: tech.specialty || 'General',
        ordenes: parseInt(tech.total_orders) || 0,
        completadas: parseInt(tech.completed_orders) || 0,
        enProgreso: parseInt(tech.in_progress_orders) || 0,
        totalReportes: parseInt(tech.total_reports) || 0,
        eficiencia: parseInt(tech.efficiency) || 0,
        promedioAvance: parseInt(tech.avg_progress) || 0
      }))
    }
    // Fallback vacío si no hay datos
    return []
  }, [technicianStats])

  const estadisticasMateriales = getEstadisticasMateriales()
  const materialesBajoStock = getMaterialesBajoStock()

  // Estadísticas por Cliente (calculadas dinámicamente)
  const estadisticasPorCliente = useMemo(() => {
    return clientes
      .filter(c => c.estado === 'activo')
      .map(cliente => {
        const ordenesCliente = ordenes.filter(o => o.clienteId === cliente.id)
        const completadas = ordenesCliente.filter(o => o.estado === 'completed').length
        const enProceso = ordenesCliente.filter(o => o.estado === 'in_progress').length
        const pendientes = ordenesCliente.filter(o => o.estado === 'pending').length

        // Calcular montos
        const montoTotal = ordenesCliente.reduce((sum, o) => {
          const costo = o.costoEstimado || 0
          return sum + (isNaN(costo) ? 0 : costo)
        }, 0)

        // Obtener última actividad (fecha más reciente de orden o modificación)
        const fechasActividad = ordenesCliente
          .map(o => o.fechaModificacion || o.fechaCreacion)
          .filter(Boolean)
          .map(f => new Date(f))
          .filter(d => !isNaN(d.getTime()))

        const ultimaActividad = fechasActividad.length > 0
          ? new Date(Math.max(...fechasActividad))
          : null

        return {
          id: cliente.id,
          nombre: cliente.nombre,
          tipo: cliente.tipo,
          totalOrdenes: ordenesCliente.length,
          completadas,
          enProceso,
          pendientes,
          montoTotal,
          montoPromedio: ordenesCliente.length > 0 ? montoTotal / ordenesCliente.length : 0,
          ultimaActividad,
          tasaCumplimiento: ordenesCliente.length > 0
            ? Math.round((completadas / ordenesCliente.length) * 100)
            : 0
        }
      })
      .filter(c => c.totalOrdenes > 0) // Solo mostrar clientes con órdenes
      .sort((a, b) => b.montoTotal - a.montoTotal) // Ordenar por mayor facturación
  }, [clientes, ordenes])

  // Función para exportar reporte completo
  const handleExportarCompleto = async () => {
    try {
      setExporting(true)

      // Crear documento PDF (jsPDF ya está importado estáticamente)
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      let yPos = 20

      // Logo y Header
      doc.setFontSize(20)
      doc.setTextColor(0, 51, 102) // Corporate blue
      doc.text('DIG Group - Reporte Administrativo Completo', pageWidth / 2, yPos, { align: 'center' })

      yPos += 10
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.text(`Generado: ${format(getCurrentDate(), 'dd/MM/yyyy HH:mm', { locale: es })}`, pageWidth / 2, yPos, { align: 'center' })
      doc.text(`Periodo: ${dateRange === 'semana' ? 'Última Semana' : dateRange === 'mes' ? 'Último Mes' : 'Último Trimestre'}`, pageWidth / 2, yPos + 5, { align: 'center' })

      yPos += 15
      doc.setDrawColor(0, 51, 102)
      doc.setLineWidth(0.5)
      doc.line(20, yPos, pageWidth - 20, yPos)
      yPos += 10

      // Sección 1: Resumen Ejecutivo
      doc.setFontSize(14)
      doc.setTextColor(0, 51, 102)
      doc.text('1. Resumen Ejecutivo', 20, yPos)
      yPos += 10

      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)

      const resumenData = [
        ['Total Órdenes de Trabajo', filteredOrdenes.length.toString()],
        ['Reportes Diarios', (generalStats?.total_reports || 0).toString()],
        ['Reportes Hoy', (generalStats?.reports_today || 0).toString()],
        ['Avance Promedio', `${generalStats?.avg_progress || 0}%`],
        ['Alertas Materiales', materialesBajoStock.length.toString()],
      ]

      autoTable(doc, {
        startY: yPos,
        head: [['Indicador', 'Valor']],
        body: resumenData,
        theme: 'grid',
        headStyles: { fillColor: [0, 51, 102], textColor: 255 },
        styles: { fontSize: 10 },
        columnStyles: {
          0: { fontStyle: 'bold' },
          1: { halign: 'center' }
        }
      })

      yPos = doc.lastAutoTable.finalY + 15

      // Sección 2: Estado de Órdenes
      if (yPos > pageHeight - 80) {
        doc.addPage()
        yPos = 20
      }

      doc.setFontSize(14)
      doc.setTextColor(0, 51, 102)
      doc.text('2. Estado de Ordenes de Trabajo', 20, yPos)
      yPos += 10

      const ordenesData = ordenesEstado.map(item => [
        item.name,
        item.value.toString(),
        `${filteredOrdenes.length > 0 ? ((item.value / filteredOrdenes.length) * 100).toFixed(1) : '0.0'}%`
      ])

      autoTable(doc, {
        startY: yPos,
        head: [['Estado', 'Cantidad', 'Porcentaje']],
        body: ordenesData,
        theme: 'grid',
        headStyles: { fillColor: [0, 51, 102], textColor: 255 },
        styles: { fontSize: 10 }
      })

      yPos = doc.lastAutoTable.finalY + 15

      // Sección 3: Rendimiento por Técnico
      if (yPos > pageHeight - 100) {
        doc.addPage()
        yPos = 20
      }

      doc.setFontSize(14)
      doc.setTextColor(0, 51, 102)
      doc.text('3. Rendimiento por Tecnico', 20, yPos)
      yPos += 10

      // Usar datos reales de técnicos
      const tecnicosData = eficienciaTecnicos.length > 0
        ? eficienciaTecnicos.map(tecnico => [
            tecnico.tecnico,
            tecnico.specialty || 'General',
            tecnico.ordenes.toString(),
            tecnico.completadas.toString(),
            tecnico.totalReportes.toString(),
            `${tecnico.eficiencia}%`,
            tecnico.eficiencia >= 90 ? 'Excelente' : tecnico.eficiencia >= 70 ? 'Bueno' : tecnico.eficiencia > 0 ? 'Mejorable' : 'Sin datos'
          ])
        : [['Sin datos de técnicos disponibles', '', '', '', '', '', '']]

      autoTable(doc, {
        startY: yPos,
        head: [['Técnico', 'Especialidad', 'Órdenes', 'Completadas', 'Reportes', 'Eficiencia', 'Estado']],
        body: tecnicosData,
        theme: 'grid',
        headStyles: { fillColor: [0, 51, 102], textColor: 255 },
        styles: { fontSize: 8 }
      })

      yPos = doc.lastAutoTable.finalY + 15

      // Sección 4: Resumen por Cliente (NUEVO)
      if (yPos > pageHeight - 100) {
        doc.addPage()
        yPos = 20
      }

      doc.setFontSize(14)
      doc.setTextColor(0, 51, 102)
      doc.text('4. Resumen por Cliente', 20, yPos)
      yPos += 10

      // Determinar columnas según permisos
      const showPrices = canViewPrices(user)

      const clientesData = estadisticasPorCliente.length > 0
        ? estadisticasPorCliente.slice(0, 15).map(cliente => {
            const row = [
              cliente.nombre,
              cliente.tipo === 'empresa' ? 'Empresa' : 'Persona',
              cliente.totalOrdenes.toString(),
              cliente.completadas.toString(),
              cliente.enProceso.toString(),
              cliente.pendientes.toString()
            ]
            if (showPrices) {
              row.push(`S/ ${cliente.montoTotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`)
            }
            row.push(`${cliente.tasaCumplimiento}%`)
            return row
          })
        : [[showPrices ? 'Sin datos de clientes disponibles' : 'Sin datos de clientes disponibles', '', '', '', '', '', '', '']]

      const clientesHeaders = showPrices
        ? [['Cliente', 'Tipo', 'Total', 'OK', 'Proceso', 'Pend.', 'Monto', 'Cumpl.']]
        : [['Cliente', 'Tipo', 'Total', 'Completadas', 'En Proceso', 'Pendientes', 'Cumplimiento']]

      autoTable(doc, {
        startY: yPos,
        head: clientesHeaders,
        body: clientesData,
        theme: 'grid',
        headStyles: { fillColor: [0, 51, 102], textColor: 255 },
        styles: { fontSize: 7 },
        columnStyles: showPrices ? {
          6: { halign: 'right' }, // Monto
          7: { halign: 'center' } // Cumplimiento
        } : {}
      })

      // Agregar totales de facturación si tiene permisos
      if (showPrices && estadisticasPorCliente.length > 0) {
        const totalFacturacion = estadisticasPorCliente.reduce((sum, c) => sum + c.montoTotal, 0)
        yPos = doc.lastAutoTable.finalY + 5
        doc.setFontSize(10)
        doc.setTextColor(0, 100, 50)
        doc.text(`Total Facturación: S/ ${totalFacturacion.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, pageWidth - 20, yPos, { align: 'right' })
      }

      yPos = doc.lastAutoTable.finalY + 15

      // Sección 5: Materiales
      if (yPos > pageHeight - 60) {
        doc.addPage()
        yPos = 20
      }

      doc.setFontSize(14)
      doc.setTextColor(0, 51, 102)
      doc.text('5. Inventario de Materiales', 20, yPos)
      yPos += 10

      const materialesData = [
        ['Total Materiales', estadisticasMateriales.totalMateriales.toString()],
        ['Stock Bajo', estadisticasMateriales.materialesBajoStock.toString()],
        ['Solicitudes Pendientes', estadisticasMateriales.solicitudesPendientes.toString()],
      ]

      if (user?.role === 'admin') {
        materialesData.push(['Valor Total Inventario', `S/ ${estadisticasMateriales.valorInventario}`])
      }

      autoTable(doc, {
        startY: yPos,
        head: [['Indicador', 'Valor']],
        body: materialesData,
        theme: 'grid',
        headStyles: { fillColor: [0, 51, 102], textColor: 255 },
        styles: { fontSize: 10 }
      })

      yPos = doc.lastAutoTable.finalY + 15

      // Materiales con Stock Bajo (si hay)
      if (materialesBajoStock.length > 0) {
        if (yPos > pageHeight - 80) {
          doc.addPage()
          yPos = 20
        }

        doc.setFontSize(12)
        doc.setTextColor(200, 50, 0)
        doc.text('ALERTAS - Materiales con Stock Bajo', 20, yPos)
        yPos += 10

        const alertasData = materialesBajoStock.slice(0, 10).map(material => [
          material.nombre,
          material.categoria,
          `${material.stockActual} / ${material.stockMinimo}`,
          material.unidad
        ])

        autoTable(doc, {
          startY: yPos,
          head: [['Material', 'Categoría', 'Stock (Actual/Mínimo)', 'Unidad']],
          body: alertasData,
          theme: 'grid',
          headStyles: { fillColor: [200, 50, 0], textColor: 255 },
          styles: { fontSize: 9 }
        })
      }

      // Footer en todas las páginas
      const pageCount = doc.internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150, 150, 150)
        doc.text(
          `Página ${i} de ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        )
        doc.text(
          'DIG Group - Sistema de Gestión de Mantenimiento',
          pageWidth / 2,
          pageHeight - 5,
          { align: 'center' }
        )
      }

      // Generar y descargar
      const fileName = `Reporte_Completo_${format(getCurrentDate(), 'yyyyMMdd_HHmmss')}.pdf`
      doc.save(fileName)

      // Mostrar mensaje de éxito
      const Swal = (await import('sweetalert2')).default
      Swal.fire({
        title: '✅ Reporte Exportado',
        text: `El archivo ${fileName} ha sido descargado exitosamente`,
        icon: 'success',
        timer: 3000,
        showConfirmButton: false
      })

    } catch (error) {
      console.error('Error exportando reporte:', error)
      const Swal = (await import('sweetalert2')).default

      // Mostrar el error completo en el modal
      const errorMessage = error?.message || error?.toString() || 'Error desconocido'
      const errorStack = error?.stack || 'No hay stack trace disponible'

      Swal.fire({
        title: '❌ Error al Exportar',
        html: `
          <div style="text-align: left;">
            <p><strong>Mensaje:</strong></p>
            <p style="color: red; font-family: monospace; font-size: 12px;">${errorMessage}</p>
            <br>
            <details>
              <summary style="cursor: pointer; color: blue;">Ver detalles técnicos</summary>
              <pre style="text-align: left; font-size: 10px; overflow-x: auto; background: #f5f5f5; padding: 10px; margin-top: 10px;">${errorStack}</pre>
            </details>
          </div>
        `,
        icon: 'error',
        width: 600
      })
    } finally {
      setExporting(false)
    }
  }

  const tabs = [
    { id: 'resumen', name: 'Resumen Ejecutivo', icon: '📊' },
    { id: 'clientes', name: 'Por Cliente', icon: '🏢' },
    { id: 'productividad', name: 'Productividad', icon: '📈' },
    { id: 'tecnicos', name: 'Rendimiento Técnicos', icon: '👨‍🔧' },
    { id: 'materiales', name: 'Materiales', icon: '📦' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-corporate-blue"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            {hasPermission('all') ? 'Reportes Administrativos' : 'Mis Reportes'}
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            {hasPermission('all')
              ? 'Análisis completo del sistema de mantenimiento'
              : 'Reportes de progreso y actividades'
            }
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
          {/* Filtro por Cliente */}
          <select
            value={selectedClient || ''}
            onChange={(e) => setSelectedClient(e.target.value ? parseInt(e.target.value) : null)}
            className="input-field min-w-0 sm:min-w-40"
          >
            <option value="">Todos los clientes</option>
            {clientes
              .filter(c => c.estado === 'activo')
              .sort((a, b) => a.nombre.localeCompare(b.nombre))
              .map(cliente => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nombre}
                </option>
              ))
            }
          </select>

          {/* Filtro por Período */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="input-field min-w-0 sm:min-w-32"
          >
            <option value="semana">Última Semana</option>
            <option value="mes">Último Mes</option>
            <option value="trimestre">Último Trimestre</option>
          </select>

          <button
            onClick={handleExportarCompleto}
            disabled={exporting}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {exporting ? '⏳ Exportando...' : '📤 Exportar Completo'}
          </button>
        </div>
      </div>

      {/* Quick Stats - Visible para Admin y Supervisor */}
      {(hasPermission('all') || hasPermission('reportes')) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Total Órdenes de trabajo</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{filteredOrdenes.length}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-lg sm:text-xl">📋</span>
              </div>
            </div>
            <div className="mt-2">
              <span className="text-xs sm:text-sm text-gray-500">
                {ordenesEstado.find(o => o.name === 'En Proceso')?.value || 0} en proceso
              </span>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Reportes Diarios</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-600">
                  {generalStats?.total_reports || 0}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-lg sm:text-xl">📝</span>
              </div>
            </div>
            <div className="mt-2">
              <span className="text-xs sm:text-sm text-blue-600">
                {generalStats?.reports_today || 0} hoy
              </span>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Avance Promedio</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">
                  {generalStats?.avg_progress || 0}%
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <span className="text-lg sm:text-xl">⚡</span>
              </div>
            </div>
            <div className="mt-2">
              <span className="text-xs sm:text-sm text-gray-500">
                {generalStats?.active_technicians || 0} técnicos activos
              </span>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Alertas Materiales</p>
                <p className="text-xl sm:text-2xl font-bold text-red-600">{materialesBajoStock.length}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="text-lg sm:text-xl">⚠️</span>
              </div>
            </div>
            <div className="mt-2">
              <span className="text-xs sm:text-sm text-red-600">
                {materialesBajoStock.length > 0 ? 'Requieren atención' : 'Sin alertas'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="-mb-px flex space-x-4 sm:space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex-shrink-0 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-corporate-blue text-corporate-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-1 sm:mr-2">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.name}</span>
              <span className="sm:hidden">{tab.name.split(' ')[0]}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'resumen' && (
          <div className="space-y-6">
            {/* Executive Summary Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Estado de Órdenes de trabajo
                </h3>
                <div className="h-[200px] sm:h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ordenesEstado}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {ordenesEstado.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {ordenesEstado.map((item, index) => (
                    <div key={index} className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <div
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm font-medium">{item.value}</span>
                      </div>
                      <span className="text-xs text-gray-600">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Tendencia de Productividad ({dateRange === 'semana' ? 'Última Semana' : dateRange === 'mes' ? 'Último Mes' : 'Último Trimestre'})
                </h3>
                {productivityData.length > 0 ? (
                  <div className="h-[200px] sm:h-[250px] overflow-x-auto">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={productivityData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="fecha" />
                      <YAxis />
                      <Tooltip
                        formatter={(value, name) => {
                          const labels = {
                            reportes: 'Reportes',
                            tecnicosActivos: 'Técnicos Activos',
                            promedioAvance: 'Promedio Avance %'
                          }
                          return [value, labels[name] || name]
                        }}
                      />
                      <Line type="monotone" dataKey="reportes" name="Reportes" stroke="#3b82f6" strokeWidth={2} />
                      <Line type="monotone" dataKey="tecnicosActivos" name="Técnicos Activos" stroke="#059669" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[200px] sm:h-[250px] bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-500">Sin datos de productividad disponibles</p>
                      <p className="text-xs text-gray-400">Los datos aparecerán cuando se registren reportes diarios</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* KPI Summary */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Indicadores Clave de Rendimiento (KPI)
              </h3>
              <div className={`grid grid-cols-1 sm:grid-cols-2 ${user?.role === 'admin' ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4 sm:gap-6`}>
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-2">
                    {kpisData?.completion_rate || 0}%
                  </div>
                  <div className="text-sm text-gray-600">Tasa de Cumplimiento</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {kpisData?.completed_orders || 0} de {kpisData?.total_orders || 0} órdenes completadas
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-blue-600 mb-2">
                    {kpisData?.avg_days_per_order || 0}
                  </div>
                  <div className="text-sm text-gray-600">Días Promedio por Orden</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Tiempo promedio de resolución
                  </div>
                </div>
                {canViewPrices(user) && (
                  <div className="text-center sm:col-span-2 md:col-span-1">
                    <div className="text-2xl sm:text-3xl font-bold text-orange-600 mb-2">
                      S/ {kpisData?.avg_cost_per_order?.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </div>
                    <div className="text-sm text-gray-600">Costo Promedio por Orden</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Basado en órdenes de trabajo con costo estimado
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'clientes' && (
          <div className="space-y-6">
            {/* Tabla de estadísticas por cliente */}
            <div className="card">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  Estadísticas por Cliente
                </h3>
                <span className="text-sm text-gray-500">
                  {estadisticasPorCliente.length} cliente(s) con órdenes
                </span>
              </div>

              {estadisticasPorCliente.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">🏢</div>
                  <p className="text-gray-500">No hay clientes con órdenes registradas</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Cliente</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Tipo</th>
                        <th className="text-center py-3 px-4 font-medium text-gray-700">Órdenes</th>
                        <th className="text-center py-3 px-4 font-medium text-gray-700">✅</th>
                        <th className="text-center py-3 px-4 font-medium text-gray-700">🔄</th>
                        <th className="text-center py-3 px-4 font-medium text-gray-700">⏳</th>
                        {canViewPrices(user) && (
                          <th className="text-right py-3 px-4 font-medium text-gray-700">Monto Total</th>
                        )}
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Última Actividad</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Cumplimiento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estadisticasPorCliente.map((cliente, index) => (
                        <tr
                          key={cliente.id}
                          className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                          onClick={() => navigate(`/ordenes?cliente=${cliente.id}`)}
                          title={`Ver órdenes de ${cliente.nombre}`}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-corporate-blue rounded-full flex items-center justify-center text-white text-sm mr-3">
                                {cliente.tipo === 'empresa' ? '🏢' : '👤'}
                              </div>
                              <div>
                                <span className="font-medium text-blue-700 hover:underline">{cliente.nombre}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-xs px-2 py-1 rounded ${
                              cliente.tipo === 'empresa' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                              {cliente.tipo === 'empresa' ? 'Empresa' : 'Persona'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-semibold">{cliente.totalOrdenes}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="text-green-600 font-medium">{cliente.completadas}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="text-blue-600 font-medium">{cliente.enProceso}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="text-gray-600">{cliente.pendientes}</span>
                          </td>
                          {canViewPrices(user) && (
                            <td className="py-3 px-4 text-right">
                              <span className="font-semibold text-green-700">
                                S/ {cliente.montoTotal.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </td>
                          )}
                          <td className="py-3 px-4">
                            {cliente.ultimaActividad ? (
                              <span className="text-sm text-gray-600">
                                {format(cliente.ultimaActividad, 'dd/MM/yyyy', { locale: es })}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">Sin actividad</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    cliente.tasaCumplimiento >= 80 ? 'bg-green-500' :
                                    cliente.tasaCumplimiento >= 50 ? 'bg-yellow-500' :
                                    cliente.tasaCumplimiento > 0 ? 'bg-red-500' : 'bg-gray-300'
                                  }`}
                                  style={{ width: `${Math.min(cliente.tasaCumplimiento, 100)}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium w-10">{cliente.tasaCumplimiento}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Resumen de clientes */}
            {estadisticasPorCliente.length > 0 && (
              <div className={`grid grid-cols-2 ${canViewPrices(user) ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-3 sm:gap-4`}>
                <div className="card text-center">
                  <div className="text-xl sm:text-2xl font-bold text-blue-600">{estadisticasPorCliente.length}</div>
                  <div className="text-sm text-gray-600">Clientes con Órdenes</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {estadisticasPorCliente.filter(c => c.tipo === 'empresa').length} empresas, {estadisticasPorCliente.filter(c => c.tipo !== 'empresa').length} personas
                  </div>
                </div>
                <div className="card text-center">
                  <div className="text-xl sm:text-2xl font-bold text-green-600">
                    {estadisticasPorCliente.reduce((sum, c) => sum + c.completadas, 0)}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600">Órdenes Completadas</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {Math.round((estadisticasPorCliente.reduce((sum, c) => sum + c.completadas, 0) / Math.max(estadisticasPorCliente.reduce((sum, c) => sum + c.totalOrdenes, 0), 1)) * 100)}% del total
                  </div>
                </div>
                <div className="card text-center">
                  <div className="text-xl sm:text-2xl font-bold text-yellow-600">
                    {estadisticasPorCliente.reduce((sum, c) => sum + c.enProceso, 0)}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600">En Proceso</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Requieren seguimiento
                  </div>
                </div>
                <div className="card text-center">
                  <div className="text-xl sm:text-2xl font-bold text-gray-600">
                    {estadisticasPorCliente.reduce((sum, c) => sum + c.pendientes, 0)}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600">Pendientes</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Por iniciar
                  </div>
                </div>
                {canViewPrices(user) && (
                  <div className="card text-center bg-gradient-to-br from-green-50 to-emerald-50 col-span-2 md:col-span-1">
                    <div className="text-xl sm:text-2xl font-bold text-green-700">
                      S/ {estadisticasPorCliente.reduce((sum, c) => sum + c.montoTotal, 0).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                    <div className="text-sm text-gray-600">Facturación Total</div>
                    <div className="text-xs text-gray-400 mt-1">
                      Promedio: S/ {(estadisticasPorCliente.reduce((sum, c) => sum + c.montoTotal, 0) / Math.max(estadisticasPorCliente.length, 1)).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} por cliente
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'productividad' && (
          <div className="space-y-6">
            {/* Filtros de Productividad */}
            <div className="card">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  📈 Filtros de Productividad
                </h3>
                <div className="flex flex-wrap items-center gap-3">
                  {/* Período predefinido */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Período:</span>
                    <select
                      value={productivityPeriod}
                      onChange={(e) => {
                        setProductivityPeriod(e.target.value)
                        if (e.target.value !== 'personalizado') {
                          setProductivityDateRange({ startDate: null, endDate: null })
                        }
                      }}
                      className="input-field text-sm py-2 min-w-32"
                    >
                      <option value="semana">Última Semana</option>
                      <option value="mes">Último Mes</option>
                      <option value="trimestre">Último Trimestre</option>
                      <option value="personalizado">Personalizado</option>
                    </select>
                  </div>

                  {/* DateRangePicker - solo visible cuando es personalizado */}
                  {productivityPeriod === 'personalizado' && (
                    <DateRangePicker
                      startDate={productivityDateRange.startDate}
                      endDate={productivityDateRange.endDate}
                      onRangeChange={({ startDate, endDate }) => {
                        setProductivityDateRange({ startDate, endDate })
                      }}
                      placeholder="Seleccionar fechas"
                    />
                  )}
                </div>
              </div>

              {/* Info del período seleccionado */}
              <div className="mt-4 flex items-center gap-4 text-sm text-gray-600 bg-gray-50 rounded-lg px-4 py-3">
                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  {productivityPeriod === 'personalizado' && productivityDateRange.startDate && productivityDateRange.endDate
                    ? `Mostrando datos del ${format(productivityDateRange.startDate, 'dd/MM/yyyy', { locale: es })} al ${format(productivityDateRange.endDate, 'dd/MM/yyyy', { locale: es })} (${differenceInDays(productivityDateRange.endDate, productivityDateRange.startDate) + 1} días)`
                    : productivityPeriod === 'semana'
                    ? 'Mostrando datos de los últimos 7 días'
                    : productivityPeriod === 'mes'
                    ? 'Mostrando datos de los últimos 30 días'
                    : 'Mostrando datos de los últimos 90 días'}
                </span>
              </div>
            </div>

            {/* Gráfico de Productividad */}
            <div className="card">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  Productividad Diaria
                </h3>
                <span className="text-sm text-gray-500">
                  {productivityData.length} día(s) con datos
                </span>
              </div>
              {productivityData.length > 0 ? (
                <div className="h-[280px] sm:h-[350px] md:h-[400px] overflow-x-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productivityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="fecha" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                      formatter={(value, name) => {
                        const labels = {
                          reportes: 'Reportes',
                          tecnicosActivos: 'Técnicos',
                          promedioAvance: 'Avance %'
                        }
                        return [value, labels[name] || name]
                      }}
                    />
                    <Legend
                      formatter={(value) => {
                        const labels = {
                          reportes: 'Reportes Creados',
                          tecnicosActivos: 'Técnicos Activos',
                          promedioAvance: 'Promedio Avance (%)'
                        }
                        return labels[value] || value
                      }}
                    />
                    <Bar dataKey="reportes" fill="#3b82f6" name="reportes" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="tecnicosActivos" fill="#059669" name="tecnicosActivos" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="promedioAvance" fill="#f59e0b" name="promedioAvance" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[280px] sm:h-[350px] md:h-[400px] bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <p className="mt-3 text-sm font-medium text-gray-600">Sin datos de productividad disponibles</p>
                    <p className="mt-1 text-xs text-gray-400">Los datos aparecerán automáticamente cuando se registren reportes diarios en el sistema</p>
                  </div>
                </div>
              )}
            </div>

            {/* Resumen de Productividad */}
            {productivityData.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <div className="card text-center">
                  <div className="text-xl sm:text-2xl font-bold text-blue-600">
                    {productivityData.reduce((sum, d) => sum + d.reportes, 0)}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600">Total Reportes</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Promedio: {(productivityData.reduce((sum, d) => sum + d.reportes, 0) / productivityData.length).toFixed(1)}/día
                  </div>
                </div>
                <div className="card text-center">
                  <div className="text-xl sm:text-2xl font-bold text-green-600">
                    {Math.max(...productivityData.map(d => d.tecnicosActivos))}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600">Máx. Técnicos/Día</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Promedio: {(productivityData.reduce((sum, d) => sum + d.tecnicosActivos, 0) / productivityData.length).toFixed(1)}
                  </div>
                </div>
                <div className="card text-center">
                  <div className="text-xl sm:text-2xl font-bold text-yellow-600">
                    {Math.round(productivityData.reduce((sum, d) => sum + d.promedioAvance, 0) / productivityData.length)}%
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600">Avance Promedio</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Del período seleccionado
                  </div>
                </div>
                <div className="card text-center">
                  <div className="text-xl sm:text-2xl font-bold text-purple-600">
                    {productivityData.length}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600">Días Activos</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Con reportes registrados
                  </div>
                </div>
              </div>
            )}
          </div>
        )}


        {activeTab === 'tecnicos' && (
          <div className="space-y-6">
            <div className="card">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  Rendimiento por Técnico
                </h3>
                <span className="text-sm text-gray-500">
                  {eficienciaTecnicos.length} técnico(s) activo(s)
                </span>
              </div>

              {eficienciaTecnicos.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">👨‍🔧</div>
                  <p className="text-gray-500">No hay datos de técnicos disponibles</p>
                  <p className="text-sm text-gray-400 mt-1">Los datos se cargarán cuando haya reportes asociados a técnicos</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Técnico</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Especialidad</th>
                        <th className="text-center py-3 px-4 font-medium text-gray-700">Órdenes</th>
                        <th className="text-center py-3 px-4 font-medium text-gray-700">Completadas</th>
                        <th className="text-center py-3 px-4 font-medium text-gray-700">Reportes</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Eficiencia</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eficienciaTecnicos.map((tecnico, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-corporate-blue rounded-full flex items-center justify-center text-white text-sm mr-3">
                                {tecnico.tecnico.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium">{tecnico.tecnico}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                              {tecnico.specialty || 'General'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-gray-600">{tecnico.ordenes}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="text-green-600 font-medium">{tecnico.completadas}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="text-blue-600 font-medium">{tecnico.totalReportes}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              <div className="w-20 bg-gray-200 rounded-full h-2 mr-3">
                                <div
                                  className={`h-2 rounded-full ${
                                    tecnico.eficiencia >= 90 ? 'bg-green-500' :
                                    tecnico.eficiencia >= 70 ? 'bg-yellow-500' :
                                    tecnico.eficiencia > 0 ? 'bg-red-500' : 'bg-gray-300'
                                  }`}
                                  style={{ width: `${Math.min(tecnico.eficiencia, 100)}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium w-12">{tecnico.eficiencia}%</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              tecnico.eficiencia >= 90 ? 'bg-green-100 text-green-800' :
                              tecnico.eficiencia >= 70 ? 'bg-yellow-100 text-yellow-800' :
                              tecnico.eficiencia > 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {tecnico.eficiencia >= 90 ? 'Excelente' :
                               tecnico.eficiencia >= 70 ? 'Bueno' :
                               tecnico.eficiencia > 0 ? 'Mejorable' : 'Sin datos'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Resumen de Técnicos */}
            {eficienciaTecnicos.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <div className="card text-center">
                  <div className="text-xl sm:text-2xl font-bold text-blue-600">{eficienciaTecnicos.length}</div>
                  <div className="text-xs sm:text-sm text-gray-600">Técnicos Activos</div>
                </div>
                <div className="card text-center">
                  <div className="text-xl sm:text-2xl font-bold text-green-600">
                    {eficienciaTecnicos.reduce((sum, t) => sum + t.completadas, 0)}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600">Total Completadas</div>
                </div>
                <div className="card text-center">
                  <div className="text-xl sm:text-2xl font-bold text-purple-600">
                    {eficienciaTecnicos.reduce((sum, t) => sum + t.totalReportes, 0)}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600">Total Reportes</div>
                </div>
                <div className="card text-center">
                  <div className="text-xl sm:text-2xl font-bold text-orange-600">
                    {eficienciaTecnicos.length > 0
                      ? Math.round(eficienciaTecnicos.reduce((sum, t) => sum + t.eficiencia, 0) / eficienciaTecnicos.length)
                      : 0}%
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600">Eficiencia Promedio</div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'materiales' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="card">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
                  Resumen de Inventario
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Materiales:</span>
                    <span className="font-semibold">{estadisticasMateriales.totalMateriales}</span>
                  </div>
                  {canViewPrices(user) && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Valor Total:</span>
                      <span className="font-semibold">S/ {estadisticasMateriales.valorInventario}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Stock Bajo:</span>
                    <span className="font-semibold text-yellow-600">{estadisticasMateriales.materialesBajoStock}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Solicitudes Pendientes:</span>
                    <span className="font-semibold text-red-600">{estadisticasMateriales.solicitudesPendientes}</span>
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
                  Alertas de Materiales
                </h3>
                <div className="space-y-3">
                  {materialesBajoStock.slice(0, 5).map((material) => (
                    <div key={material.id} className="flex justify-between items-center p-2 bg-yellow-50 rounded">
                      <div>
                        <div className="font-medium text-sm">{material.nombre}</div>
                        <div className="text-xs text-gray-500">{material.categoria}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-yellow-700">
                          {material.stockActual} / {material.stockMinimo}
                        </div>
                        <div className="text-xs text-gray-500">{material.unidad}</div>
                      </div>
                    </div>
                  ))}
                  {materialesBajoStock.length === 0 && (
                    <p className="text-green-600 text-sm">✅ Todos los materiales tienen stock suficiente</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default Reportes