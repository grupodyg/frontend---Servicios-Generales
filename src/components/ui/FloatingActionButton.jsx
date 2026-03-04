import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import useAuthStore from '../../stores/authStore'

const FloatingActionButton = () => {
  const [isOpen, setIsOpen] = useState(false)
  const { hasPermission } = useAuthStore()

  const actions = [
    {
      label: 'Nueva Orden',
      icon: '📝',
      to: '/ordenes/nueva',
      permission: 'ordenes',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      label: 'Nuevo Reporte',
      icon: '📊',
      to: '/reportes',
      permission: 'reportes',
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      label: 'Materiales',
      icon: '📦',
      to: '/materiales',
      permission: 'materiales',
      color: 'bg-orange-500 hover:bg-orange-600'
    }
  ]

  const availableActions = actions.filter(action => hasPermission(action.permission))

  if (availableActions.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 lg:hidden">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="mb-4 space-y-3"
          >
            {availableActions.map((action, index) => (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  to={action.to}
                  onClick={() => setIsOpen(false)}
                  className={`
                    flex items-center space-x-3 px-4 py-3 rounded-full shadow-lg text-white
                    ${action.color} transition-all duration-200 group
                  `}
                >
                  <span className="text-lg">{action.icon}</span>
                  <span className="text-sm font-medium whitespace-nowrap">
                    {action.label}
                  </span>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-14 h-14 rounded-full shadow-lg bg-corporate-blue text-white
          flex items-center justify-center transition-all duration-200
          ${isOpen ? 'rotate-45' : 'rotate-0'}
        `}
      >
        <span className="text-2xl">{isOpen ? '✕' : '+'}</span>
      </motion.button>

      {/* Background overlay when open */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black bg-opacity-25 -z-10"
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default FloatingActionButton