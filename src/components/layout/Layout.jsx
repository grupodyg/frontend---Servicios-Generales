import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import FloatingActionButton from '../ui/FloatingActionButton'
import useRealtimeNotifications from '../../hooks/useRealtimeNotifications'

const Layout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  
  // Activar notificaciones en tiempo real
  useRealtimeNotifications(30000) // Verificar cada 30 segundos

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar 
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      
      {/* Main Content */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${
        isSidebarCollapsed ? 'ml-16' : 'ml-64'
      } lg:${isSidebarCollapsed ? 'ml-16' : 'ml-64'} ml-0`}>
        {/* Header */}
        <Header 
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
        
        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Floating Action Button for Mobile */}
      <FloatingActionButton />
    </div>
  )
}

export default Layout