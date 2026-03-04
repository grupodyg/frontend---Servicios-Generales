import { useState } from 'react'
import { getCurrentTimestamp } from '../../utils/dateUtils'
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

const MySwal = withReactContent(Swal)

const CategorizedPhotoUpload = ({ 
  fotosPorCategoria = {}, 
  onFotosChange, 
  maxFotosPerCategoria = 5 
}) => {
  const [categoriaEscrita, setCategoriaEscrita] = useState('')
  const [archivosSeleccionados, setArchivosSeleccionados] = useState([])

  const handleSeleccionarArchivos = (e) => {
    const archivos = Array.from(e.target.files)
    
    if (archivos.length === 0) return

    if (archivos.length > maxFotosPerCategoria) {
      MySwal.fire({
        title: 'Demasiadas fotos',
        text: `Solo se pueden subir máximo ${maxFotosPerCategoria} fotos por categoría`,
        icon: 'warning',
        confirmButtonColor: '#1e40af'
      })
      return
    }

    // Validar tipos de archivo
    const tiposValidos = ['image/jpeg', 'image/png', 'image/jpg']
    const archivosValidos = archivos.filter(archivo => tiposValidos.includes(archivo.type))
    
    if (archivosValidos.length !== archivos.length) {
      MySwal.fire({
        title: 'Formato no válido',
        text: 'Solo se permiten imágenes en formato JPG, PNG o JPEG',
        icon: 'warning',
        confirmButtonColor: '#1e40af'
      })
      return
    }

    setArchivosSeleccionados(archivosValidos)
  }

  const handleAgregarFotos = async () => {
    const categoriaTrimmed = categoriaEscrita.trim()
    
    if (!categoriaTrimmed) {
      MySwal.fire({
        title: 'Escriba una categoría',
        text: 'Debe escribir el nombre de la categoría antes de subir fotos',
        icon: 'warning',
        confirmButtonColor: '#1e40af'
      })
      return
    }

    if (archivosSeleccionados.length === 0) {
      MySwal.fire({
        title: 'No hay fotos seleccionadas',
        text: 'Debe seleccionar al menos una foto para subir',
        icon: 'warning',
        confirmButtonColor: '#1e40af'
      })
      return
    }

    // Verificar límite por categoría
    const fotosExistentes = fotosPorCategoria[categoriaTrimmed] || []
    if (fotosExistentes.length + archivosSeleccionados.length > maxFotosPerCategoria) {
      MySwal.fire({
        title: 'Límite excedido',
        text: `Esta categoría ya tiene ${fotosExistentes.length} fotos. Solo puede agregar ${maxFotosPerCategoria - fotosExistentes.length} más.`,
        icon: 'warning',
        confirmButtonColor: '#1e40af'
      })
      return
    }

    try {
      // Convertir archivos a URLs base64
      const nuevasFotos = await Promise.all(
        archivosSeleccionados.map(archivo => {
          return new Promise((resolve) => {
            const reader = new FileReader()
            reader.onload = (e) => {
              resolve({
                url: e.target.result,
                descripcion: `${categoriaTrimmed} - ${archivo.name}`,
                categoria: categoriaTrimmed,
                nombre: archivo.name,
                timestamp: getCurrentTimestamp()
              })
            }
            reader.readAsDataURL(archivo)
          })
        })
      )

      // Actualizar fotos por categoría
      const nuevasFotosPorCategoria = { ...fotosPorCategoria }
      if (!nuevasFotosPorCategoria[categoriaTrimmed]) {
        nuevasFotosPorCategoria[categoriaTrimmed] = []
      }
      nuevasFotosPorCategoria[categoriaTrimmed] = [
        ...nuevasFotosPorCategoria[categoriaTrimmed],
        ...nuevasFotos
      ]

      onFotosChange(nuevasFotosPorCategoria)
      
      // Limpiar selección
      setArchivosSeleccionados([])
      setCategoriaEscrita('')
      
      // Limpiar input file
      const input = document.getElementById('foto-input-categorizada')
      if (input) input.value = ''

      MySwal.fire({
        title: 'Fotos agregadas',
        text: `Se agregaron ${nuevasFotos.length} fotos a la categoría "${categoriaTrimmed}"`,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      })

    } catch (error) {
      MySwal.fire({
        title: 'Error',
        text: 'No se pudieron procesar las fotos',
        icon: 'error',
        confirmButtonColor: '#1e40af'
      })
    }
  }

  const handleEliminarFoto = (categoria, indexFoto) => {
    MySwal.fire({
      title: '¿Eliminar foto?',
      text: 'Esta acción no se puede deshacer',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        const nuevasFotosPorCategoria = { ...fotosPorCategoria }
        nuevasFotosPorCategoria[categoria] = nuevasFotosPorCategoria[categoria].filter((_, index) => index !== indexFoto)
        
        // Si la categoría queda vacía, la eliminamos
        if (nuevasFotosPorCategoria[categoria].length === 0) {
          delete nuevasFotosPorCategoria[categoria]
        }
        
        onFotosChange(nuevasFotosPorCategoria)
      }
    })
  }

  // Obtener categorías existentes
  const categoriasExistentes = Object.keys(fotosPorCategoria)
  
  const totalFotos = Object.values(fotosPorCategoria).reduce((total, fotos) => total + fotos.length, 0)

  return (
    <div className="space-y-6">
      {/* Selector de fotos por categoría */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-md font-medium mb-4">Agregar Fotografías por Categoría</h3>
        
        <div className="space-y-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Escriba el nombre de la categoría
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="Ej: Accesos, Lugar de trabajo, Equipos, etc."
              value={categoriaEscrita}
              onChange={(e) => setCategoriaEscrita(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && categoriaEscrita.trim() && archivosSeleccionados.length > 0) {
                  handleAgregarFotos()
                }
              }}
            />
            <p className="text-xs text-gray-500 mt-1">
              Escriba manualmente el nombre de la categoría para organizar sus fotos
            </p>
          </div>

          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Seleccionar fotos
            </label>
            <input
              id="foto-input-categorizada"
              type="file"
              multiple
              accept="image/*"
              onChange={handleSeleccionarArchivos}
              className="input-field"
            />
          </div>
        </div>
        
        {archivosSeleccionados.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              {archivosSeleccionados.length} fotos seleccionadas {categoriaEscrita.trim() && `para "${categoriaEscrita.trim()}"`}
            </p>
            <div className="flex flex-wrap gap-2">
              {archivosSeleccionados.map((archivo, index) => (
                <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {archivo.name}
                </span>
              ))}
            </div>
          </div>
        )}
        
        <button
          onClick={handleAgregarFotos}
          className="btn-primary"
          disabled={!categoriaEscrita.trim() || archivosSeleccionados.length === 0}
        >
          📸 Agregar Fotos
        </button>
      </div>

      {/* Panel fotográfico por categorías */}
      {totalFotos > 0 && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">Panel Fotográfico ({totalFotos} fotos)</h3>
          
          {Object.entries(fotosPorCategoria).map(([categoria, fotos]) => (
            <div key={categoria} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900 flex items-center">
                  📁 {categoria}
                  <span className="ml-2 text-sm text-gray-500">({fotos.length} fotos)</span>
                </h4>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {fotos.map((foto, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={foto.url}
                      alt={foto.descripcion}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEliminarFoto(categoria, index)}
                        className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                    {foto.nombre && (
                      <p className="text-xs text-gray-600 mt-1 truncate" title={foto.nombre}>
                        {foto.nombre}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalFotos === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No se han agregado fotografías</p>
          <p className="text-sm">Seleccione una categoría y suba fotos para documentar el estado del lugar</p>
        </div>
      )}
    </div>
  )
}

export default CategorizedPhotoUpload