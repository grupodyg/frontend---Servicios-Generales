import { useEffect, useRef, useState } from 'react'
import Swal from 'sweetalert2'
import useBrandingStore from '../../stores/brandingStore'
import { getFileUrl } from '../../config/api'
import notificationService from '../../services/notificationService'

const MAX_LOGO_SIZE = 2 * 1024 * 1024
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml']
const CURRENT_YEAR = new Date().getFullYear()

const Branding = () => {
  const {
    companyName,
    companySubtitle,
    loginLogoUrl,
    fetchPublic,
    updateTexts,
    uploadLogo,
    resetLogo
  } = useBrandingStore()

  const [formName, setFormName] = useState(companyName)
  const [formSubtitle, setFormSubtitle] = useState(companySubtitle)
  const [pendingFile, setPendingFile] = useState(null)
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!companyName && !companySubtitle && !loginLogoUrl) {
      fetchPublic()
    }
  }, [fetchPublic, companyName, companySubtitle, loginLogoUrl])

  useEffect(() => {
    setFormName(companyName)
    setFormSubtitle(companySubtitle)
  }, [companyName, companySubtitle])

  useEffect(() => {
    return () => {
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl)
    }
  }, [pendingPreviewUrl])

  const previewLogo = pendingPreviewUrl || (loginLogoUrl ? getFileUrl(loginLogoUrl) : '')
  const previewName = formName.trim() || 'Nombre de la empresa'
  const previewSubtitle = formSubtitle.trim() || 'Subtítulo / eslogan'

  const hasTextChanges = formName !== companyName || formSubtitle !== companySubtitle
  const hasLogoChange = Boolean(pendingFile)
  const hasChanges = hasTextChanges || hasLogoChange

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!ALLOWED_TYPES.includes(file.type)) {
      Swal.fire({
        title: 'Formato de logo no permitido',
        text: `El archivo «${file.name}» no es una imagen PNG, JPG o SVG${file.type ? ` (es de tipo ${file.type})` : ''}. En «Logo de la empresa» solo se aceptan esos formatos: conviértelo a PNG, JPG o SVG y vuelve a seleccionarlo.`,
        icon: 'warning',
        confirmButtonColor: '#1e40af'
      })
      event.target.value = ''
      return
    }

    if (file.size > MAX_LOGO_SIZE) {
      Swal.fire({
        title: 'Logo demasiado pesado',
        text: `El archivo «${file.name}» pesa ${(file.size / (1024 * 1024)).toFixed(2)} MB y el logo admite como máximo 2 MB. Reduce su tamaño (por ejemplo, expórtalo con menor resolución o compresión) y vuelve a seleccionarlo en «Logo de la empresa».`,
        icon: 'warning',
        confirmButtonColor: '#1e40af'
      })
      event.target.value = ''
      return
    }

    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl)
    setPendingFile(file)
    setPendingPreviewUrl(URL.createObjectURL(file))
  }

  const handleCancelPending = () => {
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl)
    setPendingFile(null)
    setPendingPreviewUrl('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleResetLogo = async () => {
    if (!loginLogoUrl && !pendingFile) return

    const result = await Swal.fire({
      title: '¿Restablecer logo?',
      text: 'El login volverá a mostrar el círculo por defecto.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, restablecer',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280'
    })

    if (!result.isConfirmed) return

    try {
      setIsResetting(true)
      handleCancelPending()
      if (loginLogoUrl) {
        await resetLogo()
      }
      Swal.fire({
        title: 'Logo restablecido',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      })
    } catch (error) {
      console.error('Error al restablecer logo:', error)
      notificationService.mostrarError(error, 'No se pudo restablecer el logo del login')
    } finally {
      setIsResetting(false)
    }
  }

  const handleSave = async () => {
    if (!formName.trim()) {
      Swal.fire({
        title: 'Nombre requerido',
        text: 'El campo «Nombre de la empresa» está vacío (o solo tiene espacios). Escribe el nombre que debe mostrarse en el login y en la barra lateral, y vuelve a guardar.',
        icon: 'warning',
        confirmButtonColor: '#1e40af'
      })
      return
    }

    // Qué paso estaba en curso, para explicar exactamente qué no se guardó
    let contextoError = 'No se pudo guardar la configuración del login'

    try {
      setIsSaving(true)

      if (hasTextChanges) {
        contextoError = 'No se pudieron guardar el nombre y el subtítulo de la empresa'
        await updateTexts({
          company_name: formName.trim(),
          company_subtitle: formSubtitle.trim()
        })
      }

      if (pendingFile) {
        contextoError = hasTextChanges
          ? `No se pudo subir el logo «${pendingFile.name}» (el nombre y el subtítulo sí se guardaron)`
          : `No se pudo subir el logo «${pendingFile.name}»`
        await uploadLogo(pendingFile)
        handleCancelPending()
      }

      Swal.fire({
        title: 'Configuración guardada',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      })
    } catch (error) {
      console.error('Error al guardar branding:', error)
      notificationService.mostrarError(error, contextoError)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Formulario */}
      <div className="bg-white rounded-lg shadow p-5 sm:p-6 space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Branding del Login</h2>
          <p className="text-sm text-gray-600">
            Configura el logo y los textos que se muestran en la pantalla de inicio de sesión y la barra lateral.
          </p>
        </div>

        {/* Logo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Logo de la empresa
          </label>
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
              {previewLogo ? (
                <img src={previewLogo} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <span className="text-xs text-gray-400 text-center px-1">Sin logo</span>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-600
                  file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0
                  file:text-sm file:font-medium
                  file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-xs text-gray-500">PNG, JPG o SVG. Máximo 2 MB.</p>
              <div className="flex flex-wrap gap-2 pt-1">
                {pendingFile && (
                  <button
                    type="button"
                    onClick={handleCancelPending}
                    className="text-xs px-3 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Descartar selección
                  </button>
                )}
                {(loginLogoUrl || pendingFile) && (
                  <button
                    type="button"
                    onClick={handleResetLogo}
                    disabled={isResetting}
                    className="text-xs px-3 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    {isResetting ? 'Restableciendo...' : 'Restablecer logo'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Nombre */}
        <div>
          <label htmlFor="company-name" className="block text-sm font-medium text-gray-700 mb-2">
            Nombre de la empresa
          </label>
          <input
            id="company-name"
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            maxLength={100}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nombre de tu empresa"
          />
        </div>

        {/* Subtítulo */}
        <div>
          <label htmlFor="company-subtitle" className="block text-sm font-medium text-gray-700 mb-2">
            Subtítulo / eslogan
          </label>
          <input
            id="company-subtitle"
            type="text"
            value={formSubtitle}
            onChange={(e) => setFormSubtitle(e.target.value)}
            maxLength={200}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Subtítulo o eslogan corto"
          />
        </div>

        {/* Acciones */}
        <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {/* Previsualización en vivo */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <h3 className="text-sm font-medium text-gray-700">Previsualización en vivo del login</h3>
        </div>
        <div className="bg-gradient-to-br from-corporate-blue to-blue-600 rounded-lg p-6 shadow-inner">
          <div className="max-w-sm mx-auto">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4 overflow-hidden">
                {previewLogo ? (
                  <img src={previewLogo} alt="Logo preview" className="w-full h-full object-contain p-1" />
                ) : (
                  <span className="text-2xl font-bold text-corporate-blue">
                    {(previewName || 'DG').slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-white mb-2 break-words">{previewName}</h1>
              <p className="text-blue-100 text-sm break-words">{previewSubtitle}</p>
            </div>

            <div className="bg-white rounded-lg shadow-xl p-5">
              <div className="text-center mb-4">
                <h2 className="text-lg font-bold text-gray-900">Iniciar Sesión</h2>
                <p className="text-xs text-gray-600">Ingresa tus credenciales</p>
              </div>
              <div className="space-y-3">
                <div className="h-9 bg-gray-100 rounded border border-gray-200" />
                <div className="h-9 bg-gray-100 rounded border border-gray-200" />
                <div className="h-9 bg-blue-600 rounded" />
              </div>
            </div>

            <div className="text-center mt-6 text-blue-100 text-xs">
              <p>© {CURRENT_YEAR} {previewName}. Todos los derechos reservados.</p>
            </div>
          </div>
        </div>

        {/* Preview del sidebar */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Vista en sidebar</h3>
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 h-14 border-b border-gray-200 px-4">
              <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                {previewLogo ? (
                  <img src={previewLogo} alt="Logo sidebar" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-xs font-bold text-corporate-blue">
                    {(previewName || 'DG').slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-base font-bold text-corporate-blue truncate">{previewName}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Branding
