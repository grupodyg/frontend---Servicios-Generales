import React, { memo, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { isAdmin, isAdminOrSupervisor } from '../../../../utils/roleUtils'
import { getFileUrl } from '../../../../config/api'
import { formatCoordinates, openInBestMapApp } from '../../../../utils/mapUtils'

const TabResumen = memo(({
  visitaActual,
  user,
  listaPersonal,
  herramientas,
  presupuestos,
  requerimientosAdicionales,
  handleGenerarCotizacion
}) => {
  const navigate = useNavigate()
  const esAdmin = isAdmin(user)

  // Calcular totales de materiales
  const totalesMateriales = useMemo(() => {
    const items = visitaActual.materialesEstimados || []
    const totalItems = items.length
    const totalCosto = items.reduce((sum, m) => sum + (m.cantidad * (m.precioUnitario || 0)), 0)
    return { totalItems, totalCosto }
  }, [visitaActual.materialesEstimados])

  // Calcular totales de herramientas
  const totalesHerramientas = useMemo(() => {
    const items = herramientas || []
    const totalItems = items.length
    const totalCantidad = items.reduce((sum, h) => sum + (h.cantidad || 0), 0)
    const totalCosto = items.reduce((sum, h) => sum + (h.valorTotal || (h.valor || 0) * (h.cantidad || 1)), 0)
    return { totalItems, totalCantidad, totalCosto }
  }, [herramientas])

  // Calcular total de personal
  const totalPersonal = useMemo(() => {
    const personas = listaPersonal || []
    const totalPersonas = personas.length
    const totalDias = personas.reduce((sum, p) => sum + (p.diasEstimados || 0), 0)
    const totalCosto = personas.reduce((sum, p) => sum + (p.totalCosto || (p.tarifaDiaria || 0) * (p.diasEstimados || 0)), 0)
    return { totalPersonas, totalDias, totalCosto }
  }, [listaPersonal])

  // Verificar si tiene presupuesto generado
  const presupuestoAsociado = useMemo(() => {
    if (!visitaActual.presupuestoGenerado) return null
    return presupuestos?.find(p => p.id === visitaActual.presupuestoGenerado)
  }, [visitaActual.presupuestoGenerado, presupuestos])

  // Total general estimado (incluye personal)
  const totalGeneral = useMemo(() => {
    return totalesMateriales.totalCosto + totalesHerramientas.totalCosto + totalPersonal.totalCosto
  }, [totalesMateriales.totalCosto, totalesHerramientas.totalCosto, totalPersonal.totalCosto])

  return (
    <div className="space-y-6">
      {/* Header con totales generales */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-3 sm:p-4 md:p-6 text-white shadow-lg">
        <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Resumen Ejecutivo
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
          <div className="bg-white/10 backdrop-blur rounded-lg p-2 sm:p-3 text-center">
            <p className="text-xl sm:text-2xl font-bold">{totalesMateriales.totalItems}</p>
            <p className="text-[10px] sm:text-xs text-slate-300">Materiales</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-2 sm:p-3 text-center">
            <p className="text-xl sm:text-2xl font-bold">{totalesHerramientas.totalItems}</p>
            <p className="text-[10px] sm:text-xs text-slate-300">Herramientas</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-2 sm:p-3 text-center">
            <p className="text-xl sm:text-2xl font-bold">{totalPersonal.totalPersonas}</p>
            <p className="text-[10px] sm:text-xs text-slate-300">Personal</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-2 sm:p-3 text-center">
            <p className="text-xl sm:text-2xl font-bold">{totalPersonal.totalDias}</p>
            <p className="text-[10px] sm:text-xs text-slate-300">Dias Est.</p>
          </div>
        </div>
        {esAdmin && (
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white/20">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
              <span className="text-sm sm:text-base text-slate-300">Costo Total Estimado:</span>
              <span className="text-2xl sm:text-3xl font-bold">S/ {totalGeneral.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Estado del Lugar */}
      <div className="card border-l-4 border-l-purple-500">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800">Estado del Lugar</h3>
        </div>

        {visitaActual.estadoLugar?.descripcion ? (
          <div className="space-y-4">
            <div className="bg-purple-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-purple-800 mb-2">Descripcion</h4>
              <p className="text-gray-700 text-sm leading-relaxed">
                {visitaActual.estadoLugar.descripcion}
              </p>
            </div>

            {visitaActual.estadoLugar.observaciones && (
              <div className="bg-amber-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-amber-800 mb-2">Observaciones</h4>
                <p className="text-gray-700 text-sm leading-relaxed">
                  {visitaActual.estadoLugar.observaciones}
                </p>
              </div>
            )}

            {visitaActual.estadoLugar.fotos?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Fotografias ({visitaActual.estadoLugar.fotos.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {visitaActual.estadoLugar.fotos.slice(0, 6).map((foto, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={getFileUrl(foto.url)}
                        alt={foto.comentario || `Foto ${index + 1}`}
                        className="w-16 h-16 object-cover rounded-lg border-2 border-gray-200 group-hover:border-purple-400 transition-colors"
                      />
                      {foto.comentario && (
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center p-1">
                          <p className="text-white text-[10px] text-center line-clamp-3">{foto.comentario}</p>
                        </div>
                      )}
                    </div>
                  ))}
                  {visitaActual.estadoLugar.fotos.length > 6 && (
                    <div className="w-16 h-16 bg-gray-100 rounded-lg border-2 border-gray-200 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-500">+{visitaActual.estadoLugar.fotos.length - 6}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6 bg-gray-50 rounded-lg">
            <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="text-gray-400 text-sm">Sin informacion registrada</p>
          </div>
        )}
      </div>

      {/* Materiales */}
      <div className="card border-l-4 border-l-blue-500">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Materiales</h3>
          </div>
          <div className="sm:text-right">
            {esAdmin && <p className="text-xl sm:text-2xl font-bold text-blue-600">S/ {totalesMateriales.totalCosto.toFixed(2)}</p>}
            <p className="text-xs text-gray-500">{totalesMateriales.totalItems} items</p>
          </div>
        </div>

        {visitaActual.materialesEstimados?.length > 0 ? (
          <div className="overflow-x-auto -mx-3 sm:mx-0 rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-blue-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800">Material</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-blue-800 w-20">Cant.</th>
                  {esAdmin && <th className="px-3 py-2 text-right text-xs font-semibold text-blue-800 w-24">P. Unit.</th>}
                  {esAdmin && <th className="px-3 py-2 text-right text-xs font-semibold text-blue-800 w-24">Subtotal</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visitaActual.materialesEstimados.map((m, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-700">
                      <span className="font-medium">{m.nombre}</span>
                      {m.unidad && <span className="text-gray-400 text-xs ml-1">({m.unidad})</span>}
                    </td>
                    <td className="px-3 py-2 text-center text-gray-600">{m.cantidad}</td>
                    {esAdmin && <td className="px-3 py-2 text-right text-gray-600">S/ {(m.precioUnitario || 0).toFixed(2)}</td>}
                    {esAdmin && <td className="px-3 py-2 text-right font-semibold text-gray-800">S/ {(m.cantidad * (m.precioUnitario || 0)).toFixed(2)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 bg-gray-50 rounded-lg">
            <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="text-gray-400 text-sm">Sin materiales registrados</p>
          </div>
        )}
      </div>

      {/* Herramientas */}
      <div className="card border-l-4 border-l-amber-500">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Herramientas</h3>
          </div>
          <div className="sm:text-right">
            {esAdmin && <p className="text-xl sm:text-2xl font-bold text-amber-600">S/ {totalesHerramientas.totalCosto.toFixed(2)}</p>}
            <p className="text-xs text-gray-500">{totalesHerramientas.totalItems} herramientas ({totalesHerramientas.totalCantidad} unidades)</p>
          </div>
        </div>

        {herramientas?.length > 0 ? (
          <div className="overflow-x-auto -mx-3 sm:mx-0 rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-amber-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-amber-800">Herramienta</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-amber-800 w-20">Cant.</th>
                  {esAdmin && <th className="px-3 py-2 text-right text-xs font-semibold text-amber-800 w-24">Valor Unit.</th>}
                  {esAdmin && <th className="px-3 py-2 text-right text-xs font-semibold text-amber-800 w-24">Subtotal</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {herramientas.map((h, idx) => (
                  <tr key={h.id || idx} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-700">
                      <span className="font-medium">{h.nombre}</span>
                      {h.inventarioId && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700">
                          INV
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center text-gray-600">{h.cantidad}</td>
                    {esAdmin && (
                      <td className="px-3 py-2 text-right text-gray-600">
                        {h.valor > 0 ? `S/ ${h.valor.toFixed(2)}` : '-'}
                      </td>
                    )}
                    {esAdmin && (
                      <td className="px-3 py-2 text-right font-semibold text-gray-800">
                        {(h.valorTotal || (h.valor || 0) * h.cantidad) > 0
                          ? `S/ ${(h.valorTotal || (h.valor || 0) * h.cantidad).toFixed(2)}`
                          : '-'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 bg-gray-50 rounded-lg">
            <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            </svg>
            <p className="text-gray-400 text-sm">Sin herramientas registradas</p>
          </div>
        )}
      </div>

      {/* Personal */}
      <div className="card border-l-4 border-l-green-500">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Personal Requerido</h3>
          </div>
          <div className="sm:text-right">
            {esAdmin && totalPersonal.totalCosto > 0 ? (
              <>
                {esAdmin && <p className="text-xl sm:text-2xl font-bold text-green-600">S/ {totalPersonal.totalCosto.toFixed(2)}</p>}
                <p className="text-xs text-gray-500">{totalPersonal.totalPersonas} personas - {totalPersonal.totalDias} dias estimados</p>
              </>
            ) : (
              <>
                <p className="text-xl sm:text-2xl font-bold text-green-600">{totalPersonal.totalPersonas}</p>
                <p className="text-xs text-gray-500">{totalPersonal.totalDias} dias estimados</p>
              </>
            )}
          </div>
        </div>

        {listaPersonal?.length > 0 ? (
          <div className="space-y-3">
            <div className="overflow-x-auto -mx-3 sm:mx-0 rounded-lg border border-gray-200">
              <table className="min-w-full text-sm">
                <thead className="bg-green-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-green-800">Especialidad</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-green-800 w-24">Dias Est.</th>
                    {esAdmin && totalPersonal.totalCosto > 0 && (
                      <>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-green-800 w-24">Tarifa/Dia</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-green-800 w-24">Subtotal</th>
                      </>
                    )}
                    <th className="px-3 py-2 text-left text-xs font-semibold text-green-800">Observaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {listaPersonal.map((p, idx) => {
                    const totalP = p.totalCosto || (p.tarifaDiaria || 0) * (p.diasEstimados || 0)
                    return (
                      <tr key={p.id || idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-700">
                          <span className="inline-flex items-center">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                            <span className="font-medium">{p.especialidad}</span>
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {p.diasEstimados} dias
                          </span>
                        </td>
                        {esAdmin && totalPersonal.totalCosto > 0 && (
                          <>
                            <td className="px-3 py-2 text-right text-gray-600">
                              {p.tarifaDiaria > 0 ? `S/ ${parseFloat(p.tarifaDiaria).toFixed(2)}` : '-'}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold text-gray-800">
                              {totalP > 0 ? `S/ ${totalP.toFixed(2)}` : '-'}
                            </td>
                          </>
                        )}
                        <td className="px-3 py-2 text-gray-500 text-xs">{p.observaciones || '-'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {requerimientosAdicionales && (
              <div className="bg-green-50 rounded-lg p-3">
                <h4 className="text-xs font-semibold text-green-800 mb-1">Requerimientos Adicionales</h4>
                <p className="text-sm text-gray-700">{requerimientosAdicionales}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6 bg-gray-50 rounded-lg">
            <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-gray-400 text-sm">Sin personal registrado</p>
          </div>
        )}
      </div>

      {/* Firma y Datos de Completado */}
      <div className="card border-l-4 border-l-indigo-500">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800">Datos de Completado</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {/* Firma del tecnico */}
          <div className="bg-indigo-50 rounded-lg p-3 sm:p-4">
            <h4 className="text-sm font-medium text-indigo-800 mb-3">Firma del Tecnico</h4>
            {visitaActual.firmaTecnico ? (
              <div className="bg-white rounded-lg p-2 border border-indigo-200">
                <img
                  src={visitaActual.firmaTecnico}
                  alt="Firma del tecnico"
                  className="max-h-24 mx-auto"
                />
              </div>
            ) : (
              <div className="bg-white/50 rounded-lg p-4 text-center border border-dashed border-indigo-200">
                <svg className="w-8 h-8 text-indigo-300 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <p className="text-xs text-indigo-400">Sin firma</p>
              </div>
            )}
          </div>

          {/* Ubicacion GPS */}
          <div className="bg-indigo-50 rounded-lg p-3 sm:p-4">
            <h4 className="text-sm font-medium text-indigo-800 mb-3">Ubicacion GPS</h4>
            {visitaActual.coordenadasGPS?.latitud && visitaActual.coordenadasGPS?.longitud ? (
              <div className="bg-white rounded-lg p-3 border border-indigo-200">
                <p className="text-sm text-gray-700 font-mono mb-2">
                  {formatCoordinates(visitaActual.coordenadasGPS.latitud, visitaActual.coordenadasGPS.longitud)}
                </p>
                <button
                  onClick={() => openInBestMapApp(visitaActual.coordenadasGPS.latitud, visitaActual.coordenadasGPS.longitud)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Ver en mapa
                </button>
              </div>
            ) : (
              <div className="bg-white/50 rounded-lg p-4 text-center border border-dashed border-indigo-200">
                <svg className="w-8 h-8 text-indigo-300 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                <p className="text-xs text-indigo-400">Sin ubicacion</p>
              </div>
            )}
          </div>
        </div>

        {/* Nombre del proyecto y fecha de completado */}
        {(visitaActual.nombreProyecto || visitaActual.fechaCompletado) && (
          <div className="mt-4 pt-4 border-t border-indigo-100 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
            {visitaActual.nombreProyecto && (
              <div>
                <span className="text-gray-500">Proyecto:</span>
                <span className="ml-2 font-medium text-gray-800">{visitaActual.nombreProyecto}</span>
              </div>
            )}
            {visitaActual.fechaCompletado && (
              <div>
                <span className="text-gray-500">Completado:</span>
                <span className="ml-2 font-medium text-gray-800">
                  {new Date(visitaActual.fechaCompletado).toLocaleString('es-PE')}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cotizacion / Presupuesto */}
      <div className="card border-l-4 border-l-teal-500">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800">Cotizacion / Presupuesto</h3>
        </div>

        {presupuestoAsociado ? (
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-teal-800">Cotizacion generada</p>
                <p className="text-xl font-bold text-teal-900">{presupuestoAsociado.id}</p>
                <p className="text-xs text-teal-600">
                  Generada el: {new Date(visitaActual.fechaGeneracionPresupuesto).toLocaleDateString('es-PE')}
                </p>
              </div>
              <button
                onClick={() => navigate(`/presupuestos/${presupuestoAsociado.id}`)}
                className="btn-primary bg-teal-600 hover:bg-teal-700"
              >
                Ver Cotizacion
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-700">Sin cotizacion generada</p>
                <p className="text-xs text-gray-500">
                  Puede generar una cotizacion basada en los materiales, herramientas y personal estimados.
                </p>
              </div>
              {isAdminOrSupervisor(user) && (visitaActual.materialesEstimados?.length > 0 || herramientas?.length > 0) && (
                <button
                  onClick={handleGenerarCotizacion}
                  className="btn-primary"
                >
                  <svg className="w-4 h-4 mr-2 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Generar Cotizacion
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Orden de trabajo */}
      {visitaActual.ordenGenerada && (
        <div className="card border-l-4 border-l-rose-500">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Orden de Trabajo</h3>
          </div>

          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-rose-800">Orden generada</p>
                <p className="text-xl font-bold text-rose-900">{visitaActual.ordenGenerada}</p>
                {visitaActual.fechaGeneracionOrden && (
                  <p className="text-xs text-rose-600">
                    Generada el: {new Date(visitaActual.fechaGeneracionOrden).toLocaleDateString('es-PE')}
                  </p>
                )}
              </div>
              <button
                onClick={() => navigate(`/ordenes-trabajo/${visitaActual.ordenGenerada}`)}
                className="btn-primary bg-rose-600 hover:bg-rose-700"
              >
                Ver Orden
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

TabResumen.displayName = 'TabResumen'

export default TabResumen
