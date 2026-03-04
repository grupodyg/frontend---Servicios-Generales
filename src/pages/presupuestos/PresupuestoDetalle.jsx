import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import usePresupuestosStore, { getClienteNombre } from '../../stores/presupuestosStore'
import useOrdenesStore from '../../stores/ordenesStore'
import useAuthStore from '../../stores/authStore'
import { canViewPrices } from '../../utils/permissionsUtils'
import { usePDFGenerator } from '../../utils/pdfGenerator'
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

const MySwal = withReactContent(Swal)

// Función para formatear fechas de forma segura
const formatFechaSafe = (fecha, options = {}) => {
  if (!fecha) return 'No definida'
  const date = new Date(fecha)
  if (isNaN(date.getTime()) || date.getFullYear() < 1980) {
    return 'No definida'
  }
  return date.toLocaleDateString('es-ES', options)
}

// Configuración de categorías con estilos distintivos
const CATEGORIAS_CONFIG = {
  material: {
    titulo: 'Materiales',
    icono: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    gradiente: 'from-emerald-500 to-teal-600',
    bgLight: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-700',
    headerBg: 'bg-gradient-to-r from-emerald-500 to-teal-600'
  },
  herramienta: {
    titulo: 'Herramientas y Equipos',
    icono: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    gradiente: 'from-blue-500 to-indigo-600',
    bgLight: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    headerBg: 'bg-gradient-to-r from-blue-500 to-indigo-600'
  },
  mano_obra: {
    titulo: 'Mano de Obra',
    icono: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    gradiente: 'from-amber-500 to-orange-600',
    bgLight: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700',
    headerBg: 'bg-gradient-to-r from-amber-500 to-orange-600'
  },
  otros: {
    titulo: 'Otros Servicios',
    icono: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    gradiente: 'from-slate-500 to-gray-600',
    bgLight: 'bg-slate-50',
    borderColor: 'border-slate-200',
    textColor: 'text-slate-700',
    headerBg: 'bg-gradient-to-r from-slate-500 to-gray-600'
  }
}

// Componente de tarjeta de categoría
const CategoriaCard = ({ categoria, items, config, showPrices, index }) => {
  const subtotalCategoria = items.reduce((sum, item) => sum + (item.subtotal || 0), 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`rounded-xl border-2 ${config.borderColor} overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300`}
    >
      {/* Header de categoría */}
      <div className={`${config.headerBg} px-5 py-4 text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              {config.icono}
            </div>
            <div>
              <h4 className="font-bold text-lg">{config.titulo}</h4>
              <p className="text-white/80 text-sm">{items.length} {items.length === 1 ? 'item' : 'items'}</p>
            </div>
          </div>
          {showPrices && (
            <div className="text-right">
              <p className="text-white/70 text-xs uppercase tracking-wide">Subtotal</p>
              <p className="font-bold text-xl">S/ {subtotalCategoria.toFixed(2)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabla de items */}
      <div className={`${config.bgLight}`}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">#</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Descripción</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Cant.</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Unidad</th>
              {showPrices && (
                <>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">P. Unit.</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Subtotal</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {items.map((item, idx) => (
              <motion.tr
                key={item.id || idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 + idx * 0.05 }}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${config.bgLight} ${config.textColor} text-sm font-medium`}>
                    {idx + 1}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-900">{item.descripcion}</p>
                  {item.descripcionMateriales && item.descripcionMateriales !== item.descripcion && (
                    <p className="text-xs text-gray-500 mt-1">{item.descripcionMateriales}</p>
                  )}
                  {item.manoObra && (
                    <p className="text-xs text-amber-600 mt-1">
                      <span className="font-medium">Personal:</span> {item.manoObra}
                    </p>
                  )}
                  {item.equiposServicio && (
                    <p className="text-xs text-blue-600 mt-1">
                      <span className="font-medium">Equipo:</span> {item.equiposServicio}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-sm font-medium">
                    {item.cantidad}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-sm text-gray-600">{item.unidad}</td>
                {showPrices && (
                  <>
                    <td className="px-4 py-3 text-right text-sm text-gray-700 font-mono">
                      S/ {(item.precioUnitario || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold ${config.textColor} font-mono`}>
                        S/ {(item.subtotal || 0).toFixed(2)}
                      </span>
                    </td>
                  </>
                )}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}

// Componente de resumen visual
const ResumenVisual = ({ itemsAgrupados, totales, showPrices }) => {
  const categorias = Object.entries(itemsAgrupados).filter(([_, items]) => items.length > 0)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-white/10 rounded-lg">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold">Resumen del Presupuesto</h3>
      </div>

      {/* Grid de categorías */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {categorias.map(([categoria, items]) => {
          const config = CATEGORIAS_CONFIG[categoria]
          const subtotal = items.reduce((sum, item) => sum + (item.subtotal || 0), 0)
          return (
            <div
              key={categoria}
              className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10"
            >
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${config.gradiente} flex items-center justify-center mb-3`}>
                {config.icono}
              </div>
              <p className="text-white/60 text-xs uppercase tracking-wide mb-1">{config.titulo}</p>
              <p className="text-2xl font-bold">{items.length}</p>
              {showPrices && (
                <p className="text-white/70 text-sm mt-1">S/ {subtotal.toFixed(2)}</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Totales */}
      {showPrices && (
        <div className="border-t border-white/10 pt-4 space-y-2">
          <div className="flex justify-between items-center text-white/70">
            <span>Subtotal</span>
            <span className="font-mono">S/ {(totales.subtotal || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-white/70">
            <span>IGV (18%)</span>
            <span className="font-mono">S/ {(totales.igv || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-white/10">
            <span className="text-lg font-bold">TOTAL</span>
            <span className="text-2xl font-bold text-emerald-400 font-mono">
              S/ {(totales.total || 0).toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  )
}

const PresupuestoDetalle = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const {
    fetchPresupuestos,
    getPresupuestoById,
    aprobarPresupuesto,
    rechazarPresupuesto,
    generarOrden
  } = usePresupuestosStore()
  const { createOrden } = useOrdenesStore()
  const { generatePresupuestoReport } = usePDFGenerator()
  const [presupuesto, setPresupuesto] = useState(null)
  const [loading, setLoading] = useState(true)
  const [vistaCompacta, setVistaCompacta] = useState(false)

  // Agrupar items por categoría
  const itemsAgrupados = useMemo(() => {
    if (!presupuesto?.items) return {}

    const grupos = {
      material: [],
      herramienta: [],
      mano_obra: [],
      otros: []
    }

    presupuesto.items.forEach(item => {
      const tipo = item.tipo || item.item_type || 'otros'
      if (grupos[tipo]) {
        grupos[tipo].push(item)
      } else {
        grupos.otros.push(item)
      }
    })

    return grupos
  }, [presupuesto?.items])

  // Calcular totales (fallback si no vienen del backend)
  const totalesCalculados = useMemo(() => {
    if (!presupuesto?.items) return { subtotal: 0, igv: 0, total: 0 }

    // Usar valores del presupuesto si existen, sino calcular
    const subtotalCalculado = presupuesto.items.reduce((sum, item) => sum + (item.subtotal || 0), 0)
    const subtotal = presupuesto.subtotal > 0 ? presupuesto.subtotal : subtotalCalculado
    const igv = presupuesto.igv > 0 ? presupuesto.igv : subtotal * 0.18
    const total = presupuesto.total > 0 ? presupuesto.total : subtotal + igv

    return { subtotal, igv, total }
  }, [presupuesto?.items, presupuesto?.subtotal, presupuesto?.igv, presupuesto?.total])

  const showPrices = canViewPrices(user)

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchPresupuestos()
        const found = getPresupuestoById(id)
        if (found) {
          setPresupuesto(found)
        }
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id])

  const handleAprobar = async () => {
    const result = await MySwal.fire({
      title: '¿Aprobar presupuesto?',
      text: '¿Está seguro de aprobar este presupuesto?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, aprobar',
      cancelButtonText: 'Cancelar'
    })

    if (result.isConfirmed) {
      try {
        await aprobarPresupuesto(id, user.name)
        MySwal.fire({
          title: '¡Aprobado!',
          text: 'El presupuesto ha sido aprobado exitosamente',
          icon: 'success',
          confirmButtonColor: '#059669'
        })
        navigate('/presupuestos')
      } catch (error) {
        MySwal.fire({
          title: 'Error',
          text: 'No se pudo aprobar el presupuesto',
          icon: 'error',
          confirmButtonColor: '#1e40af'
        })
      }
    }
  }

  const handleRechazar = async () => {
    const { value: motivo } = await MySwal.fire({
      title: 'Rechazar presupuesto',
      input: 'textarea',
      inputLabel: 'Motivo del rechazo',
      inputPlaceholder: 'Ingrese el motivo del rechazo...',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (!value) {
          return 'Debe ingresar un motivo'
        }
      }
    })

    if (motivo) {
      try {
        await rechazarPresupuesto(id, motivo)
        MySwal.fire({
          title: 'Rechazado',
          text: 'El presupuesto ha sido rechazado',
          icon: 'info',
          confirmButtonColor: '#1e40af'
        })
        navigate('/presupuestos')
      } catch (error) {
        MySwal.fire({
          title: 'Error',
          text: 'No se pudo rechazar el presupuesto',
          icon: 'error',
          confirmButtonColor: '#1e40af'
        })
      }
    }
  }

  const handleGenerarOrden = async () => {
    const result = await MySwal.fire({
      title: '¿Generar orden de trabajo?',
      text: 'Se creará una orden de trabajo basada en este presupuesto',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#1e40af',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, generar',
      cancelButtonText: 'Cancelar'
    })

    if (result.isConfirmed) {
      try {
        const nombreCliente = getClienteNombre(presupuesto)

        const ordenData = {
          cliente: nombreCliente,
          tipoServicio: 'Servicio según presupuesto',
          tipoVisita: 'con_visita',
          descripcion: `Trabajo según presupuesto ${presupuesto.numero}\n\nItems:\n${
            (presupuesto.items || []).map(item => `- ${item.descripcion}`).join('\n')
          }`,
          prioridad: 'media',
          ubicacion: 'Por definir',
          fechaVencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          costoEstimado: presupuesto.total || 0,
          solicitadoPor: user.name
        }

        const newOrden = await createOrden(ordenData)
        await generarOrden(id)

        MySwal.fire({
          title: '¡Orden generada!',
          text: `Se creó la orden ${newOrden.id}`,
          icon: 'success',
          confirmButtonColor: '#1e40af'
        }).then(() => {
          navigate(`/ordenes/${newOrden.id}`)
        })
      } catch (error) {
        MySwal.fire({
          title: 'Error',
          text: 'No se pudo generar la orden',
          icon: 'error',
          confirmButtonColor: '#1e40af'
        })
      }
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-slate-200 rounded-full"></div>
          <div className="w-16 h-16 border-4 border-emerald-500 rounded-full animate-spin absolute top-0 left-0 border-t-transparent"></div>
        </div>
        <p className="text-slate-500 animate-pulse">Cargando presupuesto...</p>
      </div>
    )
  }

  if (!presupuesto) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
          <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-gray-500 mb-4">Presupuesto no encontrado</p>
        <Link to="/presupuestos" className="text-emerald-600 hover:text-emerald-700 font-medium">
          ← Volver a presupuestos
        </Link>
      </div>
    )
  }

  // Determinar si tiene precios basado en los totales calculados
  const tienePrecios = totalesCalculados.subtotal > 0

  const getEstadoBadge = (estado) => {
    const estilos = {
      pendiente: 'bg-gradient-to-r from-amber-400 to-orange-500 text-white',
      aprobado: 'bg-gradient-to-r from-emerald-400 to-green-500 text-white',
      rechazado: 'bg-gradient-to-r from-red-400 to-rose-500 text-white'
    }

    const iconos = {
      pendiente: '⏳',
      aprobado: '✓',
      rechazado: '✗'
    }

    const esPendiente = estado === 'pendiente'
    const label = esPendiente && !tienePrecios
      ? 'Sin precios'
      : estado.charAt(0).toUpperCase() + estado.slice(1)

    return (
      <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm ${estilos[estado]}`}>
        <span className="mr-1.5">{iconos[estado]}</span>
        {label}
      </span>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header con diseño mejorado */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
      >
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {presupuesto.numero}
              </h1>
              <p className="text-gray-500 mt-1">
                {formatFechaSafe(presupuesto.fechaCotizacion, { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
              {presupuesto.visitaTecnicaId && (
                <Link
                  to={`/visitas-tecnicas/${presupuesto.visitaTecnicaId}`}
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mt-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Visita: {presupuesto.visitaTecnicaId}
                </Link>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {getEstadoBadge(presupuesto.estado)}
            {presupuesto.ordenGenerada && (
              <Link
                to={`/ordenes/${presupuesto.ordenGenerada}`}
                className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold bg-gradient-to-r from-blue-400 to-indigo-500 text-white shadow-sm"
              >
                📋 Orden: {presupuesto.ordenGenerada}
              </Link>
            )}
          </div>
        </div>
      </motion.div>

      {/* Barra de acciones */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
      >
        <div className="flex flex-wrap items-center gap-3">
          {generatePresupuestoReport(presupuesto, user?.role)}

          {/* Toggle vista */}
          <button
            onClick={() => setVistaCompacta(!vistaCompacta)}
            className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            {vistaCompacta ? (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Vista por Categorías
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                Vista Compacta
              </>
            )}
          </button>

          <div className="flex-1" />

          {presupuesto.estado === 'pendiente' && !tienePrecios && user?.role === 'admin' && (
            <button
              onClick={() => navigate(`/presupuestos/${id}/agregar-precios`)}
              className="inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium shadow-sm hover:shadow-md transition-all text-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Agregar Precios
            </button>
          )}

          {presupuesto.estado === 'pendiente' && tienePrecios && user?.role === 'admin' && (
            <>
              <button
                onClick={handleAprobar}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 text-white font-medium shadow-sm hover:shadow-md transition-all text-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Aprobar
              </button>

              <button
                onClick={handleRechazar}
                className="inline-flex items-center px-4 py-2 rounded-lg border-2 border-red-200 text-red-600 font-medium hover:bg-red-50 transition-all text-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Rechazar
              </button>
            </>
          )}

          {presupuesto.estado === 'aprobado' && !presupuesto.ordenGenerada && (
            <button
              onClick={handleGenerarOrden}
              className="inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-slate-700 to-slate-900 text-white font-medium shadow-sm hover:shadow-md transition-all text-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Generar Orden
            </button>
          )}
        </div>
      </motion.div>

      {/* Contenido principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda - Info del cliente y resumen */}
        <div className="space-y-6">
          {/* Datos del cliente */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900">Cliente</h3>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-gray-900 text-lg">
                {getClienteNombre(presupuesto) || 'Cliente no especificado'}
              </p>
              {(() => {
                // Obtener datos del cliente de forma segura
                const clienteObj = typeof presupuesto.cliente === 'object' ? presupuesto.cliente : null
                const ruc = presupuesto.clienteData?.ruc || clienteObj?.ruc
                const email = presupuesto.clienteData?.email || clienteObj?.email
                const telefono = presupuesto.clienteData?.telefono || clienteObj?.telefono
                return (
                  <>
                    {ruc && (
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <span className="w-5 h-5 bg-gray-100 rounded flex items-center justify-center text-xs">🪪</span>
                        {ruc}
                      </p>
                    )}
                    {email && (
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <span className="w-5 h-5 bg-gray-100 rounded flex items-center justify-center text-xs">✉️</span>
                        {email}
                      </p>
                    )}
                    {telefono && (
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <span className="w-5 h-5 bg-gray-100 rounded flex items-center justify-center text-xs">📞</span>
                        {telefono}
                      </p>
                    )}
                  </>
                )
              })()}
            </div>
          </motion.div>

          {/* Resumen visual */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <ResumenVisual
              itemsAgrupados={itemsAgrupados}
              totales={totalesCalculados}
              showPrices={showPrices}
            />
          </motion.div>

          {/* Información adicional */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4"
          >
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Válido hasta</p>
              <p className="font-medium text-gray-900">
                {formatFechaSafe(presupuesto.fechaVencimiento, { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Condiciones de Pago</p>
              <p className="font-medium text-gray-900">{presupuesto.condicionesPago}</p>
            </div>
            {presupuesto.observaciones && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Observaciones</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{presupuesto.observaciones}</p>
              </div>
            )}
            <div className="pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Elaborado por</p>
              <p className="font-medium text-gray-900">{presupuesto.elaboradoPor}</p>
            </div>
            {presupuesto.aprobadoPor && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Aprobado por</p>
                <p className="font-medium text-gray-900">{presupuesto.aprobadoPor}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatFechaSafe(presupuesto.fechaAprobacion)}
                </p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Columna derecha - Detalle de items */}
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence mode="wait">
            {vistaCompacta ? (
              /* Vista compacta - tabla tradicional */
              <motion.div
                key="compacta"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="font-bold text-gray-900">Detalle de Items</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">#</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tipo</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Descripción</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Cant.</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Unidad</th>
                        {showPrices && (
                          <>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">P. Unit.</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Subtotal</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {presupuesto.items.map((item, index) => {
                        const tipo = item.tipo || item.item_type || 'otros'
                        const config = CATEGORIAS_CONFIG[tipo] || CATEGORIAS_CONFIG.otros
                        return (
                          <tr key={item.id || index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${config.bgLight} ${config.textColor}`}>
                                {config.titulo}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.descripcion}</td>
                            <td className="px-4 py-3 text-sm text-center text-gray-900">{item.cantidad}</td>
                            <td className="px-4 py-3 text-sm text-center text-gray-600">{item.unidad}</td>
                            {showPrices && (
                              <>
                                <td className="px-4 py-3 text-sm text-right text-gray-700 font-mono">
                                  S/ {(item.precioUnitario || 0).toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900 font-mono">
                                  S/ {(item.subtotal || 0).toFixed(2)}
                                </td>
                              </>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            ) : (
              /* Vista por categorías */
              <motion.div
                key="categorias"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {Object.entries(itemsAgrupados)
                  .filter(([_, items]) => items.length > 0)
                  .map(([categoria, items], index) => (
                    <CategoriaCard
                      key={categoria}
                      categoria={categoria}
                      items={items}
                      config={CATEGORIAS_CONFIG[categoria]}
                      showPrices={showPrices}
                      index={index}
                    />
                  ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Información de rechazo */}
      {presupuesto.estado === 'rechazado' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-xl p-6"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h4 className="font-bold text-red-900 mb-1">Presupuesto Rechazado</h4>
              <p className="text-red-700">{presupuesto.motivoRechazo}</p>
              <p className="text-sm text-red-600 mt-2">
                Rechazado el {formatFechaSafe(presupuesto.fechaRechazo, { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default PresupuestoDetalle
