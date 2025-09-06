import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import LoginPage from './components/LoginPage'
import Dashboard from './components/Dashboard'
import AthletiktrainerModule from './components/AthletiktrainerModule'
import PhysiotherapieModule from './components/PhysiotherapieModule'
import AerzteModule from './components/AerzteModule'
import BefundDigitalisierungModule from './components/BefundDigitalisierungModule'
import './App.css'

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  return <Layout>{children}</Layout>
}

// Role-based Access Component
function RoleProtectedRoute({ 
  children, 
  allowedRoles 
}: { 
  children: React.ReactNode
  allowedRoles: string[] 
}) {
  const { profile } = useAuth()
  
  if (!profile || !allowedRoles.includes(profile.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong className="font-bold">Zugriff verweigert!</strong>
            <span className="block sm:inline"> Sie haben nicht die erforderlichen Berechtigungen für diese Seite.</span>
          </div>
          <button 
            onClick={() => window.history.back()}
            className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Zurück
          </button>
        </div>
      </div>
    )
  }
  
  return <>{children}</>
}

// Auth Redirect Component
function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />
  }
  
  return <>{children}</>
}

function AppContent() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/login" 
          element={
            <AuthRedirect>
              <LoginPage />
            </AuthRedirect>
          } 
        />
        
        {/* Protected Routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/athletiktrainer" 
          element={
            <ProtectedRoute>
              <RoleProtectedRoute allowedRoles={['admin', 'trainer']}>
                <AthletiktrainerModule />
              </RoleProtectedRoute>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/physiotherapie" 
          element={
            <ProtectedRoute>
              <RoleProtectedRoute allowedRoles={['admin', 'physiotherapist']}>
                <PhysiotherapieModule />
              </RoleProtectedRoute>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/aerzte" 
          element={
            <ProtectedRoute>
              <RoleProtectedRoute allowedRoles={['admin', 'physician']}>
                <AerzteModule />
              </RoleProtectedRoute>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/befund-digitalisierung" 
          element={
            <ProtectedRoute>
              <RoleProtectedRoute allowedRoles={['admin', 'trainer', 'physiotherapist', 'physician']}>
                <BefundDigitalisierungModule />
              </RoleProtectedRoute>
            </ProtectedRoute>
          } 
        />
        
        {/* Catch-all Routes */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
