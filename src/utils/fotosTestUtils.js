import { getCurrentTimestamp } from './dateUtils'

// Utilidades para probar el almacenamiento de fotos en localStorage

export const verificarAlmacenamientoFotos = () => {
  try {
    const todasLasClaves = Object.keys(localStorage)
    const clavesVisitas = todasLasClaves.filter(clave => clave.startsWith('visita-fotos-'))
    
    console.log('🔍 Verificando almacenamiento de fotos:')
    console.log(`📋 Total de visitas con fotos: ${clavesVisitas.length}`)
    
    clavesVisitas.forEach(clave => {
      const datos = localStorage.getItem(clave)
      if (datos) {
        const fotos = JSON.parse(datos)
        const visitaId = clave.replace('visita-fotos-', '')
        const totalCategorias = Object.keys(fotos).length
        const totalFotos = Object.values(fotos).reduce((sum, categoriaFotos) => sum + categoriaFotos.length, 0)
        
        console.log(`📸 Visita ${visitaId}: ${totalCategorias} categorías, ${totalFotos} fotos`)
        Object.entries(fotos).forEach(([categoria, categoriaFotos]) => {
          console.log(`  📁 ${categoria}: ${categoriaFotos.length} fotos`)
        })
      }
    })
    
    return {
      visitasConFotos: clavesVisitas.length,
      detalles: clavesVisitas.map(clave => {
        const datos = localStorage.getItem(clave)
        const fotos = datos ? JSON.parse(datos) : {}
        const visitaId = clave.replace('visita-fotos-', '')
        return {
          visitaId,
          categorias: Object.keys(fotos).length,
          totalFotos: Object.values(fotos).reduce((sum, categoriaFotos) => sum + categoriaFotos.length, 0)
        }
      })
    }
  } catch (error) {
    console.error('❌ Error verificando almacenamiento:', error)
    return { visitasConFotos: 0, detalles: [] }
  }
}

export const limpiarTodasLasFotos = () => {
  try {
    const todasLasClaves = Object.keys(localStorage)
    const clavesVisitas = todasLasClaves.filter(clave => clave.startsWith('visita-fotos-'))
    
    clavesVisitas.forEach(clave => {
      localStorage.removeItem(clave)
    })
    
    console.log(`🗑️ Se eliminaron ${clavesVisitas.length} conjuntos de fotos del localStorage`)
    return true
  } catch (error) {
    console.error('❌ Error limpiando fotos:', error)
    return false
  }
}

// Función para simular fotos de demo
export const crearFotosDemo = (visitaId) => {
  const fotosDemo = {
    'Equipos existentes': [
      {
        url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjY2NjIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzMzMyIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkVxdWlwbyBFeGlzdGVudGU8L3RleHQ+PC9zdmc+',
        descripcion: 'Vista general del equipo',
        nombre: 'equipo_demo.jpg',
        timestamp: getCurrentTimestamp()
      }
    ],
    'Daños o problemas': [
      {
        url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZmZjY2NjIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2NjMzMzMyIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkRhw7FvcyBEZXRlY3RhZG9zPC90ZXh0Pjwvc3ZnPg==',
        descripcion: 'Daños detectados en el equipo',
        nombre: 'danos_demo.jpg',
        timestamp: getCurrentTimestamp()
      }
    ]
  }
  
  try {
    const clave = `visita-fotos-${visitaId}`
    localStorage.setItem(clave, JSON.stringify(fotosDemo))
    console.log(`📸 Fotos demo creadas para visita ${visitaId}`)
    return true
  } catch (error) {
    console.error('❌ Error creando fotos demo:', error)
    return false
  }
}