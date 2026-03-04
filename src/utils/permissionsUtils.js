/**
 * Determina si el usuario puede ver precios/costos
 * Solo administradores (role='admin') pueden ver información financiera
 */
export const canViewPrices = (user) => {
  return user?.role === 'admin'
}

/**
 * Determina si el usuario puede editar precios/costos
 * Solo administradores (role='admin') pueden editar información financiera
 */
export const canEditPrices = (user) => {
  return user?.role === 'admin'
}

/**
 * Formatea precio con máscara para no-admins
 */
export const formatPrice = (price, user) => {
  if (!canViewPrices(user)) {
    return '---'
  }
  return `S/ ${parseFloat(price || 0).toFixed(2)}`
}

/**
 * Calcula y formatea un total con máscara para no-admins
 */
export const formatTotal = (items, user, priceKey = 'price') => {
  if (!canViewPrices(user)) {
    return '---'
  }
  const total = items.reduce((sum, item) => sum + (parseFloat(item[priceKey]) || 0), 0)
  return `S/ ${total.toFixed(2)}`
}
