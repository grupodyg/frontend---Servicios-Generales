import React, { memo } from 'react'
import PhotoUpload from '../../../../components/ui/PhotoUpload'
import { getFileUrl } from '../../../../config/api'
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

const MySwal = withReactContent(Swal)

const TabEstadoLugar = memo(({
  visitaActual,
  estadoLugar,
  setEstadoLugar,
  editMode,
  setEditMode,
  handleGuardarEstadoLugar
}) => {
  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Estado del Lugar</h2>
        </div>

        {editMode ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripcion del estado actual *
              </label>
              <textarea
                className="input-field"
                rows="4"
                value={estadoLugar.descripcion}
                onChange={(e) => setEstadoLugar({ ...estadoLugar, descripcion: e.target.value })}
                placeholder="Describa el estado actual del lugar..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observaciones
              </label>
              <textarea
                className="input-field"
                rows="3"
                value={estadoLugar.observaciones}
                onChange={(e) => setEstadoLugar({ ...estadoLugar, observaciones: e.target.value })}
                placeholder="Observaciones adicionales..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fotografias del lugar
              </label>
              <PhotoUpload
                photos={estadoLugar.fotos || []}
                onPhotosChange={(fotos) => setEstadoLugar({ ...estadoLugar, fotos })}
                maxPhotos={20}
                label="Agregar fotografias del estado actual"
              />

              {estadoLugar.fotos && estadoLugar.fotos.length > 0 && (
                <div className="mt-4 space-y-3">
                  <p className="text-sm font-medium text-gray-700">
                    Agregar comentarios a las fotos:
                  </p>
                  {estadoLugar.fotos.map((foto, index) => (
                    <div key={foto.id || index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <img
                        src={getFileUrl(foto.url)}
                        alt={`Foto ${index + 1}`}
                        className="w-16 h-16 object-cover rounded"
                      />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-1">Foto {index + 1}</p>
                        <input
                          type="text"
                          className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                          placeholder="Describe lo que muestra esta foto..."
                          value={foto.comentario || ''}
                          onChange={(e) => {
                            const updatedFotos = [...estadoLugar.fotos]
                            updatedFotos[index] = { ...foto, comentario: e.target.value }
                            setEstadoLugar({ ...estadoLugar, fotos: updatedFotos })
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setEditMode(false)}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardarEstadoLugar}
                className="btn-primary"
              >
                Guardar
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {visitaActual.estadoLugar?.descripcion ? (
              <>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Descripcion</h3>
                  <p className="text-gray-600">{visitaActual.estadoLugar.descripcion}</p>
                </div>

                {visitaActual.estadoLugar.observaciones && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Observaciones</h3>
                    <p className="text-gray-600">{visitaActual.estadoLugar.observaciones}</p>
                  </div>
                )}

                {visitaActual.estadoLugar.fotos && visitaActual.estadoLugar.fotos.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Fotografias del Lugar</h3>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <p className="text-sm text-gray-500 mb-3">Total: {visitaActual.estadoLugar.fotos.length} fotografias</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {visitaActual.estadoLugar.fotos.map((foto, index) => (
                          <div key={index} className="relative">
                            <img
                              src={getFileUrl(foto.url)}
                              alt={foto.comentario || foto.descripcion || `Foto ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => {
                                MySwal.fire({
                                  imageUrl: getFileUrl(foto.url),
                                  imageAlt: foto.comentario || foto.descripcion,
                                  title: 'Fotografia del lugar',
                                  text: foto.comentario || foto.descripcion || '',
                                  showCloseButton: true,
                                  showConfirmButton: false,
                                  imageWidth: 600,
                                  imageHeight: 400
                                })
                              }}
                            />
                            {foto.comentario ? (
                              <p className="text-xs text-gray-700 mt-1 font-medium" title={foto.comentario}>
                                {foto.comentario.length > 30
                                  ? foto.comentario.substring(0, 30) + '...'
                                  : foto.comentario}
                              </p>
                            ) : foto.nombre && (
                              <p className="text-xs text-gray-500 mt-1 truncate" title={foto.nombre}>
                                {foto.nombre}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No se ha registrado el estado del lugar
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
})

TabEstadoLugar.displayName = 'TabEstadoLugar'

export default TabEstadoLugar
