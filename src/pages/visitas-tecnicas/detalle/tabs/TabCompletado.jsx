import React, { memo } from 'react'
import { getCurrentLocation, formatCoordinates, openInBestMapApp } from '../../../../utils/mapUtils'
import { isTecnico } from '../../../../utils/roleUtils'
import { ESTADOS_COMPLETABLES } from '../../../../constants/visitasTecnicasConstants'
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

const MySwal = withReactContent(Swal)

const TabCompletado = memo(({
  visitaActual,
  user,
  datosCompletado,
  setDatosCompletado,
  canvasRef,
  isDrawing,
  showSignaturePad,
  setShowSignaturePad,
  editMode,
  puedeEditarFirma,
  handleCompletarVisita,
  startDrawing,
  draw,
  stopDrawing,
  clearSignature,
  saveSignature
}) => {
  // Verificar si puede completar
  const puedeCompletar = isTecnico(user) && ESTADOS_COMPLETABLES.includes(visitaActual.estado)

  // Obtener ubicacion GPS
  const handleObtenerUbicacion = async () => {
    try {
      MySwal.fire({
        title: 'Obteniendo ubicacion...',
        text: 'Por favor espere',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => MySwal.showLoading()
      })

      const ubicacion = await getCurrentLocation()

      setDatosCompletado(prev => ({
        ...prev,
        coordenadasGPS: {
          latitud: ubicacion.latitud,
          longitud: ubicacion.longitud
        }
      }))

      MySwal.fire({
        icon: 'success',
        title: 'Ubicacion obtenida',
        text: `Lat: ${ubicacion.latitud.toFixed(6)}, Long: ${ubicacion.longitud.toFixed(6)}`,
        timer: 2000,
        showConfirmButton: false
      })
    } catch (error) {
      console.error('Error obteniendo ubicacion:', error)
      MySwal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'No se pudo obtener la ubicacion GPS'
      })
    }
  }

  // Eliminar firma
  const handleEliminarFirma = () => {
    MySwal.fire({
      title: 'Eliminar firma?',
      text: 'Esta accion eliminara tu firma digital',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Si, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        setDatosCompletado(prev => ({ ...prev, firmaTecnico: null }))
        MySwal.fire({
          icon: 'success',
          title: 'Firma eliminada',
          timer: 1500,
          showConfirmButton: false
        })
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Completar Visita Tecnica</h2>

        {/* Nombre del proyecto */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del Proyecto (opcional)
          </label>
          {editMode || puedeCompletar ? (
            <input
              type="text"
              className="input-field"
              value={datosCompletado.nombreProyecto}
              onChange={(e) => setDatosCompletado(prev => ({ ...prev, nombreProyecto: e.target.value }))}
              placeholder="Nombre o codigo del proyecto..."
            />
          ) : (
            <p className="text-gray-600">{datosCompletado.nombreProyecto || visitaActual.nombreProyecto || 'No especificado'}</p>
          )}
        </div>

        {/* Ubicacion GPS */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ubicacion GPS *
          </label>

          {datosCompletado.coordenadasGPS?.latitud && datosCompletado.coordenadasGPS?.longitud ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800">Ubicacion registrada</p>
                  <p className="text-sm text-green-600">
                    {formatCoordinates(datosCompletado.coordenadasGPS.latitud, datosCompletado.coordenadasGPS.longitud)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openInBestMapApp(datosCompletado.coordenadasGPS.latitud, datosCompletado.coordenadasGPS.longitud)}
                    className="btn-secondary text-sm"
                  >
                    Ver en mapa
                  </button>
                  {(editMode || puedeCompletar) && (
                    <button
                      onClick={handleObtenerUbicacion}
                      className="btn-primary text-sm"
                    >
                      Actualizar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800 mb-2">No se ha registrado ubicacion GPS</p>
              {(editMode || puedeCompletar) && (
                <button
                  onClick={handleObtenerUbicacion}
                  className="btn-primary"
                >
                  <svg className="w-4 h-4 mr-2 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Obtener ubicacion actual
                </button>
              )}
            </div>
          )}
        </div>

        {/* Firma digital */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Firma del Tecnico *
          </label>

          {datosCompletado.firmaTecnico || visitaActual.firmaTecnico ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800 mb-2">Firma registrada</p>
                  <img
                    src={datosCompletado.firmaTecnico || visitaActual.firmaTecnico}
                    alt="Firma del tecnico"
                    className="border border-gray-300 rounded bg-white max-w-xs"
                  />
                </div>
                {puedeEditarFirma() && (
                  <button
                    onClick={handleEliminarFirma}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Eliminar firma
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800 mb-2">No se ha registrado firma</p>
              {puedeEditarFirma() && (
                <button
                  onClick={() => setShowSignaturePad(true)}
                  className="btn-primary"
                >
                  <svg className="w-4 h-4 mr-2 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Agregar firma
                </button>
              )}
            </div>
          )}
        </div>

        {/* Modal de firma */}
        {showSignaturePad && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Firma Digital</h3>
              <p className="text-sm text-gray-600 mb-4">
                Dibuje su firma en el recuadro usando el mouse o su dedo en dispositivos tactiles.
              </p>

              <div className="border-2 border-gray-300 rounded-lg overflow-hidden mb-4">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={200}
                  className="bg-white w-full touch-none"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>

              <div className="flex justify-between">
                <button
                  onClick={clearSignature}
                  className="btn-secondary"
                >
                  Limpiar
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSignaturePad(false)}
                    className="btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={saveSignature}
                    className="btn-primary"
                  >
                    Guardar Firma
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Boton completar */}
        {puedeCompletar && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Importante:</strong> Al completar la visita, se enviara para revision del supervisor.
                Asegurese de haber llenado todos los campos requeridos.
              </p>
            </div>

            <button
              onClick={handleCompletarVisita}
              className="w-full btn-primary bg-green-600 hover:bg-green-700 py-3 text-lg"
            >
              <svg className="w-5 h-5 mr-2 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Completar Visita Tecnica
            </button>
          </div>
        )}

        {/* Estado de la visita completada */}
        {visitaActual.estado === 'completed' && visitaActual.fechaCompletado && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-green-800">Visita completada</p>
                <p className="text-xs text-green-600">
                  Fecha: {new Date(visitaActual.fechaCompletado).toLocaleString('es-PE')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

TabCompletado.displayName = 'TabCompletado'

export default TabCompletado
