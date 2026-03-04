import { useState } from 'react'
import PhotoUpload from './PhotoUpload'
import useOrdenesStore from '../../stores/ordenesStore'
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

const MySwal = withReactContent(Swal)

const SmartPhotoUpload = ({ 
  orden, 
  photos = [], 
  onPhotosChange, 
  maxPhotos = 10, 
  label = "Subir fotos",
  ...props 
}) => {
  const { puedeSubirFotos, marcarPrimeraVisita } = useOrdenesStore()
  const [isProcessing, setIsProcessing] = useState(false)

  const validacion = puedeSubirFotos(orden)

  const handlePhotoUpload = async (newPhotos) => {
    if (!validacion.permitido) {
      MySwal.fire({
        title: 'No permitido',
        html: `
          <div class="text-left">
            <p class="mb-3">${validacion.motivo}</p>
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 class="font-medium text-blue-800 mb-2">¿Qué debo hacer?</h4>
              ${orden.tipoVisita === 'con_visita' 
                ? '<p class="text-sm text-blue-700">Para proyectos con visita técnica, primero debe marcar la primera visita como realizada.</p>'
                : '<p class="text-sm text-blue-700">Para proyectos sin visita técnica, primero debe cambiar el estado del proyecto a "En Proceso".</p>'
              }
            </div>
          </div>
        `,
        icon: 'warning',
        confirmButtonColor: '#1e40af'
      })
      return
    }

    // Si puede subir fotos, proceder normalmente
    onPhotosChange(newPhotos)
  }

  const handleMarcarPrimeraVisita = async () => {
    const result = await MySwal.fire({
      title: '¿Marcar primera visita como realizada?',
      html: `
        <div class="text-left">
          <p class="mb-3">Esto permitirá subir fotografías a partir de este momento.</p>
          <div class="bg-green-50 border border-green-200 rounded-lg p-3">
            <h4 class="font-medium text-green-800 mb-2">Después de confirmar:</h4>
            <ul class="text-sm text-green-700 list-disc list-inside">
              <li>Se marcará la primera visita técnica como realizada</li>
              <li>Se habilitará la subida de fotografías</li>
              <li>Se registrará la fecha actual</li>
            </ul>
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, marcar como realizada',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#16a34a',
      cancelButtonColor: '#6b7280'
    })

    if (result.isConfirmed) {
      setIsProcessing(true)
      try {
        await marcarPrimeraVisita(orden.id)
        MySwal.fire({
          title: '¡Primera visita marcada!',
          text: 'Ahora puedes subir fotografías del proyecto',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        })
      } catch (error) {
        MySwal.fire({
          title: 'Error',
          text: 'No se pudo marcar la primera visita',
          icon: 'error'
        })
      } finally {
        setIsProcessing(false)
      }
    }
  }

  if (!validacion.permitido) {
    return (
      <div className="space-y-4">
        {/* Componente deshabilitado */}
        <div className="relative">
          <div className="opacity-50 pointer-events-none">
            <PhotoUpload
              photos={photos}
              onPhotosChange={() => {}}
              maxPhotos={maxPhotos}
              label={label}
              {...props}
            />
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
            <div className="text-center p-4">
              <span className="text-4xl mb-2 block">🔒</span>
              <p className="text-sm font-medium text-gray-700">Fotografías bloqueadas</p>
              <p className="text-xs text-gray-500 mt-1">
                {orden.tipoVisita === 'con_visita' 
                  ? 'Marque la primera visita técnica' 
                  : 'Inicie el proyecto primero'}
              </p>
            </div>
          </div>
        </div>

        {/* Alerta explicativa */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-amber-400 text-xl">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-amber-800">
                Restricción de Fotografías
              </h3>
              <p className="text-sm text-amber-700 mt-1">
                {validacion.motivo}
              </p>
            </div>
          </div>
        </div>

        {/* Botón de acción para proyectos con visita técnica */}
        {orden.tipoVisita === 'con_visita' && !orden.primeraVisitaRealizada && (
          <button
            onClick={handleMarcarPrimeraVisita}
            disabled={isProcessing}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
          >
            {isProcessing ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Procesando...
              </span>
            ) : (
              '🚀 Marcar Primera Visita Técnica'
            )}
          </button>
        )}
      </div>
    )
  }

  // Si puede subir fotos, mostrar componente normal con indicador
  return (
    <div className="space-y-3">
      {/* Indicador de estado */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
        <div className="flex items-center">
          <span className="text-green-600 text-sm">✅</span>
          <div className="ml-2">
            <p className="text-sm font-medium text-green-800">
              Fotografías habilitadas
            </p>
            <p className="text-xs text-green-700">
              {orden.tipoVisita === 'con_visita' 
                ? `Primera visita realizada: ${orden.fechaPrimeraVisita}`
                : 'Proyecto iniciado'}
            </p>
          </div>
        </div>
      </div>

      {/* Componente normal */}
      <PhotoUpload
        photos={photos}
        onPhotosChange={handlePhotoUpload}
        maxPhotos={maxPhotos}
        label={label}
        {...props}
      />
    </div>
  )
}

export default SmartPhotoUpload