/**
 * Branding e imágenes para documentos PDF.
 *
 * Centraliza dos necesidades comunes a todos los generadores de PDF:
 *  1. Obtener la identidad de la empresa (nombre, subtítulo y logo) desde la
 *     configuración de la aplicación, nunca desde valores fijos en el código.
 *  2. Convertir cualquier imagen (logo o fotografía) a un data URL PNG/JPEG,
 *     único formato que @react-pdf/renderer sabe dibujar. Una imagen que falla
 *     se omite en lugar de romper la generación completa del documento.
 */
import useBrandingStore from '../stores/brandingStore'

// Ancho máximo al que se reescalan las imágenes antes de incrustarlas.
// Mantiene el peso del PDF acotado sin degradar la impresión.
const MAX_LOGO_WIDTH = 600
const MAX_PHOTO_WIDTH = 1200
const PHOTO_QUALITY = 0.82

// Dimensiones de respaldo para imágenes vectoriales sin ancho/alto declarado.
const FALLBACK_VECTOR_SIZE = 512

// Descargas simultáneas al preparar las fotografías de un documento.
const DEFAULT_CONCURRENCY = 6

const rasterCache = new Map()

const loadImageElement = (src) =>
  new Promise((resolve, reject) => {
    const image = new window.Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('No se pudo decodificar la imagen'))
    image.src = src
  })

/**
 * Descarga una imagen y la rasteriza a un data URL apto para @react-pdf/renderer.
 *
 * @param {string} url URL absoluta o relativa de la imagen.
 * @param {{ maxWidth?: number, prefer?: 'png' | 'jpeg', quality?: number }} options
 * @returns {Promise<{ dataUrl: string, width: number, height: number } | null>}
 *          `null` si la imagen no se pudo obtener o convertir.
 */
export const rasterizeImage = async (url, options = {}) => {
  if (!url) return null

  const { maxWidth = MAX_PHOTO_WIDTH, prefer = 'jpeg', quality = PHOTO_QUALITY } = options
  const cacheKey = `${url}|${maxWidth}|${prefer}`

  if (rasterCache.has(cacheKey)) return rasterCache.get(cacheKey)

  let objectUrl = ''
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const blob = await response.blob()
    // Los vectoriales pierden el canal alfa si se exportan como JPEG.
    const isVector = blob.type === 'image/svg+xml'
    const mimeType = isVector || prefer === 'png' ? 'image/png' : 'image/jpeg'

    objectUrl = URL.createObjectURL(blob)
    const image = await loadImageElement(objectUrl)

    const naturalWidth = image.naturalWidth || image.width || FALLBACK_VECTOR_SIZE
    const naturalHeight = image.naturalHeight || image.height || FALLBACK_VECTOR_SIZE
    const scale = naturalWidth > maxWidth ? maxWidth / naturalWidth : 1

    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(naturalHeight * scale))

    const context = canvas.getContext('2d')
    if (mimeType === 'image/jpeg') {
      // JPEG no admite transparencia: sin fondo, las zonas alfa salen en negro.
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height)

    const result = {
      dataUrl: canvas.toDataURL(mimeType, quality),
      width: canvas.width,
      height: canvas.height
    }

    rasterCache.set(cacheKey, result)
    return result
  } catch (error) {
    console.warn('[pdfBranding] Imagen omitida en el PDF:', url, error?.message)
    rasterCache.set(cacheKey, null)
    return null
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl)
  }
}

/**
 * Ejecuta una tarea asíncrona sobre cada elemento con concurrencia acotada.
 */
const mapWithConcurrency = async (items, task, limit = DEFAULT_CONCURRENCY) => {
  const results = new Array(items.length)
  let cursor = 0

  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      results[index] = await task(items[index], index)
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

/**
 * Rasteriza un conjunto de URLs de fotografías.
 *
 * @param {string[]} urls
 * @returns {Promise<Map<string, string>>} URL original -> data URL. Las imágenes
 *          que no se pudieron procesar quedan fuera del mapa.
 */
export const rasterizePhotos = async (urls) => {
  const unicas = [...new Set(urls.filter(Boolean))]
  const rasterizadas = await mapWithConcurrency(unicas, (url) =>
    rasterizeImage(url, { maxWidth: MAX_PHOTO_WIDTH, prefer: 'jpeg' })
  )

  const mapa = new Map()
  unicas.forEach((url, index) => {
    const imagen = rasterizadas[index]
    if (imagen) mapa.set(url, imagen.dataUrl)
  })
  return mapa
}

/**
 * Identidad de la empresa configurada en Configuración > Branding, con el logo
 * ya convertido a un formato que el PDF puede dibujar.
 *
 * @returns {Promise<{ companyName: string, companySubtitle: string,
 *                     logo: { dataUrl: string, width: number, height: number } | null }>}
 */
export const loadPdfBranding = async () => {
  if (!useBrandingStore.getState().isLoaded) {
    await useBrandingStore.getState().fetchPublic()
  }

  const { companyName, companySubtitle, getLogoFullUrl } = useBrandingStore.getState()
  const logoUrl = getLogoFullUrl()
  const logo = logoUrl ? await rasterizeImage(logoUrl, { maxWidth: MAX_LOGO_WIDTH, prefer: 'png' }) : null

  return {
    companyName: companyName || '',
    companySubtitle: companySubtitle || '',
    logo
  }
}

export default { rasterizeImage, rasterizePhotos, loadPdfBranding }
