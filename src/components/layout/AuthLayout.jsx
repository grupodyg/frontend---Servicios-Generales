const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-corporate-blue to-blue-600 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4">
            <span className="text-2xl font-bold text-corporate-blue">DG</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">DIG Group</h1>
          <p className="text-blue-100">Sistema de Gestión de Mantenimiento</p>
        </div>
        
        {/* Auth Content */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          {children}
        </div>
        
        {/* Footer */}
        <div className="text-center mt-8 text-blue-100 text-sm">
          <p>© 2024 DIG Group. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  )
}

export default AuthLayout