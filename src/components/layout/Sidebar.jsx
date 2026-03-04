import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import useAuthStore from '../../stores/authStore'
import { isAdmin } from '../../utils/roleUtils'

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation()
  const { user, hasPermission } = useAuthStore()
  const [isInventoryOpen, setIsInventoryOpen] = useState(false)

  // Abrir automáticamente el dropdown si estamos en una ruta de inventario
  useEffect(() => {
    const inventoryRoutes = ['/materiales', '/herramientas']
    const isInInventoryRoute = inventoryRoutes.some(route =>
      location.pathname === route || location.pathname.startsWith(route + '/')
    )

    if (isInInventoryRoute) {
      setIsInventoryOpen(true)
    }
  }, [location.pathname])

  const menuItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: '📊',
      permission: 'dashboard'
    },
    {
      name: user?.role === 'tecnico' ? 'Mis Visitas Técnicas' : 'Visitas Técnicas',
      path: user?.role === 'tecnico' ? '/mis-visitas-tecnicas' : '/visitas-tecnicas',
      icon: '🔍',
      permission: 'ordenes'
    },
    {
      name: 'Órdenes de trabajo',
      path: '/ordenes',
      icon: '📋',
      permission: 'ordenes'
    },
    {
      name: user?.role === 'tecnico' ? 'Mis Reportes' : 'Reportes',
      path: user?.role === 'tecnico' ? '/reportes-tecnico' : '/reportes',
      icon: '📝',
      permission: 'reportes'
    },
    {
      name: 'Inventario',
      path: '/inventario',
      icon: '📦',
      permission: 'materiales',
      isDropdown: true,
      subItems: [
        {
          name: 'Materiales',
          path: '/materiales',
          icon: '🧱'
        },
        {
          name: 'Herramientas',
          path: '/herramientas',
          icon: '🔧'
        }
      ]
    },
    {
      name: 'Gantt',
      path: '/gantt',
      icon: '📈',
      permission: 'gantt'
    },
    {
      name: 'Permisos',
      path: '/permisos',
      icon: '📄',
      permission: 'permisos'
    },
    {
      name: 'Boletas de Pago',
      path: '/boletas',
      icon: '💰',
      permission: 'dashboard'
    },
    {
      name: 'Clientes',
      path: '/clientes',
      icon: '🏢',
      permission: 'dashboard',
      excludeRoles: ['tecnico']
    },
    {
      name: 'Presupuestos',
      path: '/presupuestos',
      icon: '💼',
      permission: 'presupuestos',
      onlyRoles: ['admin', 'supervisor']
    },
    {
      name: 'Configuración',
      path: '/configuracion',
      icon: '⚙️',
      permission: 'all'
    },
    {
      name: 'Usuarios',
      path: '/usuarios',
      icon: '👥',
      permission: 'all'
    }
  ]

  const filteredMenuItems = menuItems.filter(item => {
    if (isAdmin(user)) {
      if (item.excludeRoles && item.excludeRoles.includes(user.role)) {
        return false
      }
      return true
    }

    if (!hasPermission(item.permission)) return false

    if (item.excludeRoles && user?.role) {
      if (item.excludeRoles.includes(user.role)) return false
    }

    if (item.onlyRoles && user?.role) {
      return item.onlyRoles.includes(user.role)
    }

    return true
  })

  return (
    <div className={`fixed left-0 top-0 h-full w-64 bg-white shadow-lg transition-transform duration-300 z-40 flex flex-col
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    `}>
      {/* Logo */}
      <div className="flex items-center justify-between h-14 sm:h-16 border-b border-gray-200 px-4 flex-shrink-0">
        <span className="text-xl font-bold text-corporate-blue">DIG Group</span>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Navigation - scrollable */}
      <nav className="flex-1 mt-4 overflow-y-auto pb-4">
        <ul className="space-y-1 px-3">
          {filteredMenuItems.map((item) => {
            if (item.isDropdown) {
              const isInventoryActive = item.subItems.some(subItem =>
                location.pathname === subItem.path || location.pathname.startsWith(subItem.path + '/')
              )

              return (
                <li key={item.path}>
                  <div>
                    <button
                      onClick={() => setIsInventoryOpen(!isInventoryOpen)}
                      className={`flex items-center w-full px-3 py-2.5 rounded-lg transition-colors duration-200 ${
                        isInventoryActive
                          ? 'bg-corporate-blue text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span className="text-xl flex-shrink-0">{item.icon}</span>
                      <span className="ml-3 font-medium flex-1 text-left text-sm">{item.name}</span>
                      <span className={`text-xs transition-transform duration-200 ${
                        isInventoryOpen ? 'rotate-90' : ''
                      }`}>
                        ▶
                      </span>
                    </button>

                    {isInventoryOpen && (
                      <ul className="mt-1 ml-6 space-y-1">
                        {item.subItems.map((subItem) => {
                          const isSubActive = location.pathname === subItem.path ||
                            location.pathname.startsWith(subItem.path + '/')

                          return (
                            <li key={subItem.path}>
                              <Link
                                to={subItem.path}
                                onClick={onClose}
                                className={`flex items-center px-3 py-2 rounded-lg transition-colors duration-200 ${
                                  isSubActive
                                    ? 'bg-corporate-blue/10 text-corporate-blue border-l-2 border-corporate-blue'
                                    : 'text-gray-600 hover:bg-gray-50'
                                }`}
                              >
                                <span className="text-lg">{subItem.icon}</span>
                                <span className="ml-3 font-medium text-sm">{subItem.name}</span>
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                </li>
              )
            } else {
              const isActive = location.pathname === item.path ||
                location.pathname.startsWith(item.path + '/')

              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={onClose}
                    className={`flex items-center px-3 py-2.5 rounded-lg transition-colors duration-200 ${
                      isActive
                        ? 'bg-corporate-blue text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-xl flex-shrink-0">{item.icon}</span>
                    <span className="ml-3 font-medium text-sm">{item.name}</span>
                  </Link>
                </li>
              )
            }
          })}
        </ul>
      </nav>

      {/* User Info */}
      <div className="flex-shrink-0 px-3 pb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-corporate-blue rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.name || 'Usuario'}
              </p>
              <p className="text-xs text-gray-500 capitalize truncate">
                {user?.role || 'Sin rol'}
                {user?.especialidad && ` - ${user.especialidad}`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Sidebar