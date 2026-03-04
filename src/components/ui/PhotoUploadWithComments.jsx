import { useState, useRef } from 'react'
import Compressor from 'compressorjs'
import { motion, AnimatePresence } from 'framer-motion'
import { getCurrentTimestamp } from '../../utils/dateUtils'

const PhotoUploadWithComments = ({ 
  photos = [], 
  onPhotosChange, 
  maxPhotos = 10, 
  label = "Subir fotos",
  accept = "image/*",
  multiple = true,
  showComments = true 
}) => {
  const [isUploading, setIsUploading] = useState(false)
  const [previewPhoto, setPreviewPhoto] = useState(null)
  const [editingComment, setEditingComment] = useState(null)
  const fileInputRef = useRef(null)

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      new Compressor(file, {
        quality: 0.8,
        maxWidth: 1920,
        maxHeight: 1080,
        convertSize: 1000000, // Convert to JPEG if larger than 1MB
        success: resolve,
        error: reject,
      })
    })
  }

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files)
    if (files.length === 0) return

    if (photos.length + files.length > maxPhotos) {
      alert(`Máximo ${maxPhotos} fotos permitidas`)
      return
    }

    setIsUploading(true)

    try {
      const compressedPhotos = []
      
      for (const file of files) {
        const compressedFile = await compressImage(file)
        const photoData = {
          id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file: compressedFile,
          url: URL.createObjectURL(compressedFile),
          name: file.name,
          size: compressedFile.size,
          originalSize: file.size,
          uploadedAt: getCurrentTimestamp(),
          comentario: '' // Campo para comentario
        }
        compressedPhotos.push(photoData)
      }

      onPhotosChange([...photos, ...compressedPhotos])
    } catch (error) {
      console.error('Error compressing images:', error)
      alert('Error al procesar las imágenes')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemovePhoto = (photoId) => {
    const updatedPhotos = photos.filter(photo => photo.id !== photoId)
    onPhotosChange(updatedPhotos)
    
    // Clean up URL object
    const photoToRemove = photos.find(photo => photo.id === photoId)
    if (photoToRemove?.url) {
      URL.revokeObjectURL(photoToRemove.url)
    }
  }

  const handleUpdateComment = (photoId, comentario) => {
    const updatedPhotos = photos.map(photo => 
      photo.id === photoId 
        ? { ...photo, comentario } 
        : photo
    )
    onPhotosChange(updatedPhotos)
    setEditingComment(null)
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading || photos.length >= maxPhotos}
        />
        
        <div className="space-y-4">
          <div className="text-4xl text-gray-400">📷</div>
          <div>
            <p className="text-lg font-medium text-gray-900">{label}</p>
            <p className="text-sm text-gray-500">
              Arrastra las fotos aquí o haz clic para seleccionar
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {photos.length}/{maxPhotos} fotos • PNG, JPG hasta 10MB
            </p>
          </div>
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || photos.length >= maxPhotos}
            className={`btn-primary ${
              isUploading || photos.length >= maxPhotos 
                ? 'opacity-50 cursor-not-allowed' 
                : ''
            }`}
          >
            {isUploading ? 'Procesando...' : 'Seleccionar Fotos'}
          </button>
        </div>
      </div>

      {/* Photos Grid con Comentarios */}
      {photos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {photos.map((photo, index) => (
              <motion.div
                key={photo.id || `photo-fallback-${index}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative group bg-white border border-gray-200 rounded-lg p-3"
              >
                <div className="flex space-x-3">
                  {/* Imagen */}
                  <div className="flex-shrink-0">
                    <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-100">
                      <img
                        src={photo.url}
                        alt={photo.name}
                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-200"
                        onClick={() => setPreviewPhoto(photo)}
                      />
                    </div>
                  </div>
                  
                  {/* Información y Comentario */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {photo.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(photo.size)}
                        </p>
                        {photo.originalSize > photo.size && (
                          <p className="text-xs text-green-600">
                            ↓ {Math.round((1 - photo.size / photo.originalSize) * 100)}% comprimida
                          </p>
                        )}
                      </div>
                      
                      {/* Botón Eliminar */}
                      <button
                        onClick={() => handleRemovePhoto(photo.id)}
                        className="ml-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                        title="Eliminar foto"
                      >
                        ✕
                      </button>
                    </div>
                    
                    {/* Campo de Comentario */}
                    {showComments && (
                      <div className="mt-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Comentario:
                        </label>
                        {editingComment === photo.id ? (
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              defaultValue={photo.comentario || ''}
                              placeholder="Describe lo que muestra la foto..."
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleUpdateComment(photo.id, e.target.value)
                                }
                              }}
                              onBlur={(e) => handleUpdateComment(photo.id, e.target.value)}
                              autoFocus
                            />
                          </div>
                        ) : (
                          <div 
                            className="text-sm text-gray-600 min-h-[24px] cursor-pointer hover:bg-gray-50 rounded px-2 py-1"
                            onClick={() => setEditingComment(photo.id)}
                          >
                            {photo.comentario || (
                              <span className="text-gray-400 italic">
                                Clic para agregar comentario...
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Photo Preview Modal */}
      <AnimatePresence>
        {previewPhoto && (
          <motion.div
            key={`preview-${previewPhoto.id || 'unknown'}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
            onClick={() => setPreviewPhoto(null)}
          >
            <motion.div
              key={`preview-content-${previewPhoto.id || 'unknown'}`}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="max-w-4xl max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={previewPhoto.url}
                alt={previewPhoto.name}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
              <div className="bg-white p-4 mt-4 rounded-lg">
                <h3 className="font-medium text-gray-900">{previewPhoto.name}</h3>
                <p className="text-sm text-gray-500">
                  Tamaño: {formatFileSize(previewPhoto.size)}
                </p>
                {previewPhoto.comentario && (
                  <div className="mt-2 p-2 bg-gray-50 rounded">
                    <p className="text-sm font-medium text-gray-700">Comentario:</p>
                    <p className="text-sm text-gray-600">{previewPhoto.comentario}</p>
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  Subida: {new Date(previewPhoto.uploadedAt).toLocaleString()}
                </p>
              </div>
            </motion.div>
            
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-4 right-4 w-10 h-10 bg-white bg-opacity-20 text-white rounded-full flex items-center justify-center text-xl hover:bg-opacity-30 transition-colors"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default PhotoUploadWithComments