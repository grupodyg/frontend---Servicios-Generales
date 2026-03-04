import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import useAuthStore from './stores/authStore'
import { isAdmin } from './utils/roleUtils'

// Layouts
import Layout from './components/layout/Layout'
import AuthLayout from './components/layout/AuthLayout'

// Pages
import Login from './pages/auth/Login'
import Dashboard from './pages/dashboard/Dashboard'
import Ordenes from './pages/ordenes/Ordenes'
import OrdenNueva from './pages/ordenes/OrdenNueva'
import OrdenEditar from './pages/ordenes/OrdenEditar'
import OrdenDetalle from './pages/ordenes/OrdenDetalle'
import Reportes from './pages/reportes/Reportes'
import ReportesTecnico from './pages/reportes/ReportesTecnico'
import ReporteNuevo from './pages/reportes/ReporteNuevo'
import Materiales from './pages/materiales/Materiales'
import Herramientas from './pages/herramientas/Herramientas'
import HerramientaNueva from './pages/herramientas/HerramientaNueva'
import Gantt from './pages/gantt/Gantt'
import Permisos from './pages/permisos/Permisos'
import Boletas from './pages/boletas/Boletas'
import Clientes from './pages/clientes/Clientes'
import ClienteNuevo from './pages/clientes/ClienteNuevo'
import Configuracion from './pages/configuracion/Configuracion'
import Usuarios from './pages/usuarios/Usuarios'
import Notificaciones from './pages/notificaciones/Notificaciones'
import Presupuestos from './pages/presupuestos/Presupuestos'
import PresupuestoNuevo from './pages/presupuestos/PresupuestoNuevo'
import PresupuestoDetalle from './pages/presupuestos/PresupuestoDetalle'
import VisitasTecnicas from './pages/visitas-tecnicas/VisitasTecnicas'
import VisitaTecnicaNueva from './pages/visitas-tecnicas/VisitaTecnicaNueva'
import VisitaTecnicaDetalle from './pages/visitas-tecnicas/VisitaTecnicaDetalle'
import MisVisitasTecnicas from './pages/visitas-tecnicas/MisVisitasTecnicas'
import Aprobaciones from './pages/aprobaciones/Aprobaciones'

// Componente de ruta protegida
const ProtectedRoute = ({ children, requiredPermission, requiredRoles }) => {
  const { isAuthenticated, hasPermission, user, _hasHydrated } = useAuthStore()

  // Esperar a que se complete la hidratación
  if (!_hasHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Si el usuario es Administrador, tiene acceso a todas las rutas
  if (isAdmin(user)) {
    return children
  }

  // Check role-based access if requiredRoles is specified
  if (requiredRoles && !requiredRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />
  }

  // Check permission-based access if requiredPermission is specified
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

// Componente de ruta pública (solo para no autenticados)
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore()
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }
  
  return children
}

function App() {
  return (
    <DndProvider backend={HTML5Backend}>
      <Router future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/login" element={
            <PublicRoute>
              <AuthLayout>
                <Login />
              </AuthLayout>
            </PublicRoute>
          } />
          
          {/* Rutas protegidas */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            
            <Route path="dashboard" element={<Dashboard />} />
            
            <Route path="ordenes" element={
              <ProtectedRoute requiredPermission="ordenes">
                <Ordenes />
              </ProtectedRoute>
            } />
            
            <Route path="ordenes/nueva" element={
              <ProtectedRoute requiredRoles={['admin', 'supervisor']}>
                <OrdenNueva />
              </ProtectedRoute>
            } />

            <Route path="ordenes/:id/editar" element={
              <ProtectedRoute requiredRoles={['admin', 'supervisor']}>
                <OrdenEditar />
              </ProtectedRoute>
            } />

            <Route path="ordenes/:id" element={
              <ProtectedRoute requiredPermission="ordenes">
                <OrdenDetalle />
              </ProtectedRoute>
            } />
            
            <Route path="reportes" element={
              <ProtectedRoute requiredPermission="reportes">
                <Reportes />
              </ProtectedRoute>
            } />

            <Route path="aprobaciones" element={
              <ProtectedRoute requiredPermission="ordenes">
                <Aprobaciones />
              </ProtectedRoute>
            } />

            <Route path="reportes-tecnico" element={
              <ProtectedRoute requiredPermission="reportes">
                <ReportesTecnico />
              </ProtectedRoute>
            } />
            
            <Route path="reportes/nuevo/:ordenId" element={
              <ProtectedRoute requiredPermission="reportes">
                <ReporteNuevo />
              </ProtectedRoute>
            } />
            
            <Route path="materiales" element={
              <ProtectedRoute requiredPermission="materiales">
                <Materiales />
              </ProtectedRoute>
            } />
            
            <Route path="herramientas" element={
              <ProtectedRoute requiredPermission="materiales">
                <Herramientas />
              </ProtectedRoute>
            } />
            
            <Route path="herramientas/nueva" element={
              <ProtectedRoute requiredPermission="materiales">
                <HerramientaNueva />
              </ProtectedRoute>
            } />
            
            <Route path="gantt" element={
              <ProtectedRoute requiredPermission="gantt">
                <Gantt />
              </ProtectedRoute>
            } />
            
            <Route path="permisos" element={
              <ProtectedRoute requiredPermission="permisos">
                <Permisos />
              </ProtectedRoute>
            } />
            
            
            <Route path="notificaciones" element={
              <ProtectedRoute requiredPermission="dashboard">
                <Notificaciones />
              </ProtectedRoute>
            } />
            
            <Route path="boletas" element={
              <ProtectedRoute requiredPermission="dashboard">
                <Boletas />
              </ProtectedRoute>
            } />
            
            <Route path="clientes" element={
              <ProtectedRoute requiredPermission="dashboard" requiredRoles={['admin', 'supervisor', 'rrhh']}>
                <Clientes />
              </ProtectedRoute>
            } />
            
            <Route path="clientes/nuevo" element={
              <ProtectedRoute requiredPermission="dashboard" requiredRoles={['admin', 'rrhh']}>
                <ClienteNuevo />
              </ProtectedRoute>
            } />
            
            <Route path="configuracion" element={
              <ProtectedRoute requiredPermission="all">
                <Configuracion />
              </ProtectedRoute>
            } />
            
            <Route path="usuarios" element={
              <ProtectedRoute requiredPermission="all">
                <Usuarios />
              </ProtectedRoute>
            } />
            
            <Route path="presupuestos" element={
              <ProtectedRoute requiredPermission="presupuestos">
                <Presupuestos />
              </ProtectedRoute>
            } />
            
            <Route path="presupuestos/nuevo" element={
              <ProtectedRoute requiredPermission="presupuestos">
                <PresupuestoNuevo />
              </ProtectedRoute>
            } />

            <Route path="presupuestos/:id/editar" element={
              <ProtectedRoute requiredPermission="all">
                <PresupuestoNuevo />
              </ProtectedRoute>
            } />
            
            <Route path="presupuestos/:id" element={
              <ProtectedRoute requiredPermission="presupuestos">
                <PresupuestoDetalle />
              </ProtectedRoute>
            } />
            
            <Route path="visitas-tecnicas" element={
              <ProtectedRoute requiredPermission="ordenes">
                <VisitasTecnicas />
              </ProtectedRoute>
            } />
            
            <Route path="visitas-tecnicas/nueva" element={
              <ProtectedRoute requiredPermission="ordenes">
                <VisitaTecnicaNueva />
              </ProtectedRoute>
            } />
            
            <Route path="visitas-tecnicas/:id" element={
              <ProtectedRoute requiredPermission="ordenes">
                <VisitaTecnicaDetalle />
              </ProtectedRoute>
            } />
            
            <Route path="mis-visitas-tecnicas" element={
              <ProtectedRoute requiredPermission="ordenes">
                <MisVisitasTecnicas />
              </ProtectedRoute>
            } />
          </Route>
          
          {/* Ruta catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </DndProvider>
  )
}

export default App
