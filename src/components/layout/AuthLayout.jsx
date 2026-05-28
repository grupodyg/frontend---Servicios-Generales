import useBrandingStore from '../../stores/brandingStore'
import { getFileUrl } from '../../config/api'

const CURRENT_YEAR = new Date().getFullYear()

const getInitials = (name) => {
  if (!name) return ''
  const cleaned = name.trim()
  if (!cleaned) return ''
  return cleaned.slice(0, 2).toUpperCase()
}

const AuthLayout = ({ children }) => {
  const companyName = useBrandingStore((state) => state.companyName)
  const companySubtitle = useBrandingStore((state) => state.companySubtitle)
  const loginLogoUrl = useBrandingStore((state) => state.loginLogoUrl)

  const logoSrc = loginLogoUrl ? getFileUrl(loginLogoUrl) : ''
  const displayName = companyName || ''
  const displaySubtitle = companySubtitle || ''
  const initials = getInitials(displayName)

  return (
    <div className="min-h-screen bg-gradient-to-br from-corporate-blue to-blue-600 flex items-center justify-center p-3 sm:p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-white rounded-full mb-3 sm:mb-4 overflow-hidden">
            {logoSrc ? (
              <img src={logoSrc} alt={displayName || 'Logo'} className="w-full h-full object-contain p-1" />
            ) : (
              <span className="text-xl sm:text-2xl font-bold text-corporate-blue">{initials}</span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-2 break-words">{displayName}</h1>
          <p className="text-blue-100 text-sm sm:text-base break-words">{displaySubtitle}</p>
        </div>

        {/* Auth Content */}
        <div className="bg-white rounded-lg shadow-xl p-5 sm:p-8">
          {children}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-blue-100 text-sm">
          <p>© {CURRENT_YEAR} {displayName}. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  )
}

export default AuthLayout
