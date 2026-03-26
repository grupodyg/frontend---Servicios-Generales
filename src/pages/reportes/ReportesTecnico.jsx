import { useEffect } from 'react'
import { motion } from 'framer-motion'
import useReportesStore from '../../stores/reportesStore'
import useAuthStore from '../../stores/authStore'

const ReportesTecnico = () => {
  const { user } = useAuthStore()
  const {
    fetchTodosReportesTecnico,
    todosReportesTecnico,
    isLoading
  } = useReportesStore()

  // Cargar todos los reportes del técnico al montar el componente
  useEffect(() => {
    if (user?.name) {
      fetchTodosReportesTecnico(user.name)
    }
  }, [user?.name, fetchTodosReportesTecnico])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-corporate-blue"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Mis Reportes de Trabajo
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Historial completo de todos tus reportes enviados
          </p>
        </div>
      </div>

      {/* Historial Completo de Reportes del Técnico */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        {todosReportesTecnico.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay reportes registrados
            </h3>
            <p className="text-gray-600">
              No has enviado ningún reporte de trabajo aún
            </p>
          </div>
        ) : (
          <div className="card">
            <div className="mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                Historial Completo de Reportes
              </h2>
              <p className="text-sm text-gray-600">
                Total de reportes enviados: <span className="font-semibold">{todosReportesTecnico.length}</span>
              </p>
            </div>

            <div className="space-y-4">
              {todosReportesTecnico.map((reporte) => (
                <div key={reporte.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3 sm:mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{reporte.id}</h4>
                        <span className={`text-xs px-2 py-1 rounded ${
                          reporte.porcentajeAvance >= 75 ? 'bg-green-100 text-green-800' :
                          reporte.porcentajeAvance >= 50 ? 'bg-yellow-100 text-yellow-800' :
                          reporte.porcentajeAvance >= 25 ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {reporte.porcentajeAvance}% avance
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-sm mb-3">
                        <div>
                          <span className="text-gray-500">Orden de Trabajo:</span>
                          <div className="font-medium">{reporte.ordenId}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Fecha:</span>
                          <div className="font-medium">{reporte.fecha}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Horas:</span>
                          <div className="font-medium">{reporte.horasIniciales} - {reporte.horasFinales}</div>
                        </div>
                      </div>

                      {/* Descripción */}
                      <div className="mt-3">
                        <h5 className="text-sm font-medium text-gray-700 mb-1">Descripción del trabajo:</h5>
                        <p className="text-sm text-gray-600">{reporte.descripcion}</p>
                      </div>

                      {/* Materiales Utilizados */}
                      {reporte.materialesUtilizados && reporte.materialesUtilizados.length > 0 && (
                        <div className="mt-3">
                          <h5 className="text-sm font-medium text-gray-700 mb-1">Materiales utilizados:</h5>
                          <div className="bg-gray-50 rounded-lg p-2">
                            <ul className="space-y-1">
                              {reporte.materialesUtilizados.map((material, idx) => (
                                <li key={idx} className="text-sm text-gray-600 flex justify-between">
                                  <span>• {material.nombre || material.name || 'Material'}</span>
                                  <span className="font-medium">
                                    {material.cantidad || material.quantity || 1} {material.unidad || material.unit || 'unidad(es)'}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* Observaciones */}
                      {reporte.observaciones && (
                        <div className="mt-3">
                          <h5 className="text-sm font-medium text-gray-700 mb-1">Observaciones:</h5>
                          <p className="text-sm text-gray-600">{reporte.observaciones}</p>
                        </div>
                      )}

                      {/* Próximas Tareas */}
                      {reporte.proximasTareas && (
                        <div className="mt-3">
                          <h5 className="text-sm font-medium text-gray-700 mb-1">Próximas tareas:</h5>
                          <p className="text-sm text-gray-600">{reporte.proximasTareas}</p>
                        </div>
                      )}

                      {/* Fotos */}
                      <div className="mt-3 flex flex-wrap items-center gap-3 sm:gap-4 text-sm">
                        {reporte.fotosAntes && reporte.fotosAntes.length > 0 && (
                          <div className="flex items-center text-gray-600">
                            <span className="mr-1">📷</span>
                            <span>Fotos antes: {reporte.fotosAntes.length}</span>
                          </div>
                        )}
                        {reporte.fotosDespues && reporte.fotosDespues.length > 0 && (
                          <div className="flex items-center text-gray-600">
                            <span className="mr-1">📷</span>
                            <span>Fotos después: {reporte.fotosDespues.length}</span>
                          </div>
                        )}
                      </div>

                      {/* Documentos de Seguridad */}
                      {(reporte.atsDocs?.length > 0 || reporte.ptrDocs?.length > 0 || reporte.aspectosAmbientalesDocs?.length > 0) && (
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                          {reporte.atsDocs?.length > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">
                              ATS ({reporte.atsDocs.length})
                            </span>
                          )}
                          {reporte.ptrDocs?.length > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800">
                              PTR ({reporte.ptrDocs.length})
                            </span>
                          )}
                          {reporte.aspectosAmbientalesDocs?.length > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-800">
                              Amb. ({reporte.aspectosAmbientalesDocs.length})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default ReportesTecnico
