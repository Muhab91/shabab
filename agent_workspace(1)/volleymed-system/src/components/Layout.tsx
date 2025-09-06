import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import NotificationCenter from './NotificationCenter'
import { 
  Activity, 
  FileText, 
  Stethoscope, 
  ScanText, 
  BarChart3,
  Calendar,
  Bell,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react'

type LayoutProps = {
  children: React.ReactNode
}

type MenuItem = {
  id: string
  label: string
  icon: React.ComponentType<any>
  roles: string[]
  path: string
}

const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: BarChart3,
    roles: ['admin', 'trainer', 'physiotherapist', 'physician'],
    path: '/dashboard'
  },
  {
    id: 'athletiktrainer',
    label: 'Athletiktrainer',
    icon: Activity,
    roles: ['admin', 'trainer'],
    path: '/athletiktrainer'
  },
  {
    id: 'physiotherapie',
    label: 'Physiotherapie',
    icon: Stethoscope,
    roles: ['admin', 'physiotherapist'],
    path: '/physiotherapie'
  },
  {
    id: 'aerzte',
    label: 'Ärzte',
    icon: FileText,
    roles: ['admin', 'physician'],
    path: '/aerzte'
  },
  {
    id: 'befund-digitalisierung',
    label: 'Befund-Digitalisierung',
    icon: ScanText,
    roles: ['admin', 'trainer', 'physiotherapist', 'physician'],
    path: '/befund-digitalisierung'
  },
  {
    id: 'termine',
    label: 'Termine',
    icon: Calendar,
    roles: ['admin', 'trainer', 'physiotherapist', 'physician'],
    path: '/termine'
  },
  {
    id: 'benachrichtigungen',
    label: 'Benachrichtigungen',
    icon: Bell,
    roles: ['admin', 'trainer', 'physiotherapist', 'physician'],
    path: '/benachrichtigungen'
  }
]

export default function Layout({ children }: LayoutProps) {
  const { profile, signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentPath, setCurrentPath] = useState('/dashboard')

  const filteredMenuItems = menuItems.filter(item => 
    profile?.role && item.roles.includes(profile.role)
  )

  const handleMenuClick = (path: string) => {
    setCurrentPath(path)
    setSidebarOpen(false)
    // Navigation zu der entsprechenden Route
    window.location.href = path
  }

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Mobile menu overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 flex z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
        </div>
      )}

      {/* Sidebar */}
      <div className={`
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out
        md:translate-x-0 md:static md:inset-0
      `}>
        <div className="flex items-center justify-between h-16 px-6 bg-blue-600">
          <h1 className="text-white text-xl font-bold">VolleyMed</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-white md:hidden"
          >
            <X size={24} />
          </button>
        </div>
        
        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          <div className="space-y-2">
            {filteredMenuItems.map((item) => {
              const IconComponent = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => handleMenuClick(item.path)}
                  className={`
                    w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors
                    ${
                      currentPath === item.path
                        ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <IconComponent size={20} className="mr-3" />
                  {item.label}
                </button>
              )
            })}
          </div>
        </nav>

        {/* User profile section */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-sm">
                  {profile?.full_name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {profile?.full_name}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {profile?.role}
                </p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="text-gray-400 hover:text-gray-600"
              title="Abmelden"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-500 hover:text-gray-700 md:hidden"
            >
              <Menu size={24} />
            </button>
            
            <div className="flex items-center space-x-4">
              <NotificationCenter />
              <div className="text-sm text-gray-600">
                Willkommen, {profile?.full_name}
              </div>
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
