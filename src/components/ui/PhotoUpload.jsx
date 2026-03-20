import { useState, useRef } from 'react'
import Compressor from 'compressorjs'
import { motion, AnimatePresence } from 'framer-motion'
import { getCurrentTimestamp } from '../../utils/dateUtils'
import { getFileUrl } from '../../config/api'

const PhotoUpload = ({ 
  photos = [], 
  onPhotosChange, 
  maxPhotos = 10, 
  label = "Subir fotos",
  accept = "image/*",
  multiple = true 
}) => {
  const [isUploading, setIsUploading] = useState(false)
  const [previewPhoto, setPreviewPhoto] = useState(null)
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
          uploadedAt: getCurrentTimestamp()
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

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return null
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Resuelve la URL correcta: blob URLs para fotos nuevas, getFileUrl para fotos de Wasabi/servidor
  const resolvePhotoUrl = (url) => {
    if (!url) return ''
    if (url.startsWith('blob:')) return url
    return getFileUrl(url)
  }

  // Obtiene el nombre de la foto (compatibilidad: name o nombre)
  const getPhotoName = (photo) => photo.name || photo.nombre || ''

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center">
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
          <div className="text-3xl sm:text-4xl text-gray-400">📷</div>
          <div>
            <p className="text-sm sm:text-lg font-medium text-gray-900">{label}</p>
            <p className="text-xs sm:text-sm text-gray-500">
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

      {/* Photos Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
          <AnimatePresence>
            {photos.map((photo, index) => (
              <motion.div
                key={photo.id || `photo-fallback-${index}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative group"
              >
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={resolvePhotoUrl(photo.url)}
                    alt={getPhotoName(photo)}
                    className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-200"
                    onClick={() => setPreviewPhoto(photo)}
                  />
                </div>

                {/* Photo Info */}
                <div className="mt-2 text-xs text-gray-500">
                  {getPhotoName(photo) && <p className="truncate">{getPhotoName(photo)}</p>}
                  {formatFileSize(photo.size) && <p>{formatFileSize(photo.size)}</p>}
                  {photo.originalSize && photo.size && photo.originalSize > photo.size && (
                    <p className="text-green-600">
                      ↓ {Math.round((1 - photo.size / photo.originalSize) * 100)}% comprimida
                    </p>
                  )}
                </div>

                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(photo.id)}
                  className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                >
                  ✕
                </button>
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
                src={resolvePhotoUrl(previewPhoto.url)}
                alt={getPhotoName(previewPhoto)}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
              <div className="bg-white p-3 sm:p-4 mt-2 sm:mt-4 rounded-lg">
                {getPhotoName(previewPhoto) && (
                  <h3 className="font-medium text-gray-900">{getPhotoName(previewPhoto)}</h3>
                )}
                {previewPhoto.comentario && (
                  <p className="text-sm text-gray-600 mt-1">{previewPhoto.comentario}</p>
                )}
                {formatFileSize(previewPhoto.size) && (
                  <p className="text-sm text-gray-500">
                    Tamaño: {formatFileSize(previewPhoto.size)}
                  </p>
                )}
                {previewPhoto.uploadedAt && (
                  <p className="text-sm text-gray-500">
                    Subida: {new Date(previewPhoto.uploadedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </motion.div>
            
            <button
              type="button"
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

export default PhotoUpload