// Filtro para suprimir warnings específicos de librerías externas
if (process.env.NODE_ENV === 'development') {
  const originalWarn = console.warn
  const originalError = console.error

  console.warn = (...args) => {
    const message = args.join(' ')
    
    // Filtrar warnings específicos de Recharts
    if (message.includes('Support for defaultProps will be removed')) {
      return // No mostrar este warning
    }
    
    if (message.includes('XAxis:') || message.includes('YAxis:')) {
      return // No mostrar warnings de ejes de Recharts
    }
    
    // Mostrar otros warnings normalmente
    originalWarn.apply(console, args)
  }

  console.error = (...args) => {
    const message = args.join(' ')
    
    // Filtrar errores específicos que en realidad son warnings
    if (message.includes('Support for defaultProps will be removed')) {
      return // No mostrar como error
    }
    
    // Mostrar errores reales normalmente
    originalError.apply(console, args)
  }
}

export default {}