/**
 * Utilidades para manejo de mapas y coordenadas GPS
 */

/**
 * Abre las coordenadas GPS en Google Maps
 * @param {number} latitud - Latitud de la ubicación
 * @param {number} longitud - Longitud de la ubicación
 * @param {string} label - Etiqueta opcional para el marcador
 */
export const openInGoogleMaps = (latitud, longitud, label = '') => {
  if (!latitud || !longitud) {
    console.warn('Coordenadas inválidas:', { latitud, longitud })
    return
  }
  
  let url = `https://www.google.com/maps?q=${latitud},${longitud}`
  
  if (label) {
    // Agregar etiqueta al marcador
    url += `&query_place_id=${encodeURIComponent(label)}`
  }
  
  // Agregar nivel de zoom por defecto
  url += '&z=15'
  
  window.open(url, '_blank', 'noopener,noreferrer')
}

/**
 * Abre las coordenadas en Apple Maps (para dispositivos iOS)
 * @param {number} latitud - Latitud de la ubicación
 * @param {number} longitud - Longitud de la ubicación
 * @param {string} label - Etiqueta opcional para el marcador
 */
export const openInAppleMaps = (latitud, longitud, label = '') => {
  if (!latitud || !longitud) {
    console.warn('Coordenadas inválidas:', { latitud, longitud })
    return
  }
  
  let url = `http://maps.apple.com/?ll=${latitud},${longitud}&z=15`
  
  if (label) {
    url += `&q=${encodeURIComponent(label)}`
  }
  
  window.open(url, '_blank', 'noopener,noreferrer')
}

/**
 * Abre las coordenadas en Waze
 * @param {number} latitud - Latitud de la ubicación
 * @param {number} longitud - Longitud de la ubicación
 */
export const openInWaze = (latitud, longitud) => {
  if (!latitud || !longitud) {
    console.warn('Coordenadas inválidas:', { latitud, longitud })
    return
  }
  
  const url = `https://waze.com/ul?ll=${latitud}%2C${longitud}&navigate=yes`
  window.open(url, '_blank', 'noopener,noreferrer')
}

/**
 * Detecta el dispositivo y abre en la app de mapas más apropiada
 * @param {number} latitud - Latitud de la ubicación
 * @param {number} longitud - Longitud de la ubicación
 * @param {string} label - Etiqueta opcional para el marcador
 */
export const openInBestMapApp = (latitud, longitud, label = '') => {
  if (!latitud || !longitud) {
    console.warn('Coordenadas inválidas:', { latitud, longitud })
    return
  }
  
  // Detectar iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  
  if (isIOS) {
    // En iOS, intentar abrir Apple Maps primero
    try {
      openInAppleMaps(latitud, longitud, label)
    } catch (error) {
      // Si falla, usar Google Maps como fallback
      openInGoogleMaps(latitud, longitud, label)
    }
  } else {
    // En otros dispositivos, usar Google Maps
    openInGoogleMaps(latitud, longitud, label)
  }
}

/**
 * Formatea las coordenadas GPS para mostrar
 * @param {number} latitud - Latitud
 * @param {number} longitud - Longitud
 * @param {number} decimales - Número de decimales a mostrar (por defecto 4)
 * @returns {string} Coordenadas formateadas
 */
export const formatCoordinates = (latitud, longitud, decimales = 4) => {
  if (!latitud || !longitud) return 'Sin coordenadas'
  
  return `${latitud.toFixed(decimales)}, ${longitud.toFixed(decimales)}`
}

/**
 * Valida si las coordenadas GPS son válidas
 * @param {number} latitud - Latitud
 * @param {number} longitud - Longitud
 * @returns {boolean} True si son válidas
 */
export const validateCoordinates = (latitud, longitud) => {
  if (typeof latitud !== 'number' || typeof longitud !== 'number') {
    return false
  }
  
  if (isNaN(latitud) || isNaN(longitud)) {
    return false
  }
  
  // Validar rangos válidos
  if (latitud < -90 || latitud > 90) {
    return false
  }
  
  if (longitud < -180 || longitud > 180) {
    return false
  }
  
  return true
}

/**
 * Obtiene la ubicación actual del usuario
 * @returns {Promise<{latitud: number, longitud: number}>} Coordenadas actuales
 */
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalización no soportada por este navegador'))
      return
    }
    
    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // 5 minutos
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitud: position.coords.latitude,
          longitud: position.coords.longitude,
          precision: position.coords.accuracy
        })
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error('Permisos de ubicación denegados'))
            break
          case error.POSITION_UNAVAILABLE:
            reject(new Error('Ubicación no disponible'))
            break
          case error.TIMEOUT:
            reject(new Error('Tiempo de espera agotado'))
            break
          default:
            reject(new Error('Error desconocido al obtener ubicación'))
        }
      },
      options
    )
  })
}