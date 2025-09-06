import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRealtimeNotifications } from '../hooks/useRealtime'
import { Bell, Check, CheckCheck, X, AlertCircle, Info, CheckCircle, AlertTriangle } from 'lucide-react'

export default function NotificationCenter() {
  const { profile } = useAuth()
  const [showNotifications, setShowNotifications] = useState(false)
  
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead
  } = useRealtimeNotifications(profile?.id || '')

  const getNotificationIcon = (type: string, priority: string) => {
    switch (type) {
      case 'critical_value':
        return <AlertTriangle size={16} className="text-red-500" />
      case 'appointment_reminder':
        return <Info size={16} className="text-blue-500" />
      case 'treatment_overdue':
        return <AlertCircle size={16} className="text-orange-500" />
      case 'new_document':
        return <CheckCircle size={16} className="text-green-500" />
      default:
        return <Info size={16} className="text-gray-500" />
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Gerade eben'
    if (diffInMinutes < 60) return `vor ${diffInMinutes} Min`
    if (diffInMinutes < 1440) return `vor ${Math.floor(diffInMinutes / 60)} Std`
    return `vor ${Math.floor(diffInMinutes / 1440)} Tagen`
  }

  const handleNotificationClick = async (notification: any) => {
    if (!notification.is_read) {
      await markAsRead(notification.id)
    }
    
    // Handle action if needed
    if (notification.related_table && notification.related_id) {
      // Navigate to related content
      // This would be implemented based on your routing logic
      console.log('Navigate to:', notification.related_table, notification.related_id)
    }
  }

  if (!profile) return null

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {showNotifications && (
        <div className="absolute right-0 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Benachrichtigungen</h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center space-x-1"
                  >
                    <CheckCheck size={14} />
                    <span>Alle lesen</span>
                  </button>
                )}
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-300 mx-auto"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Bell className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                <p>Keine Benachrichtigungen</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.is_read ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.notification_type, notification.priority)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm font-medium text-gray-900 ${
                            !notification.is_read ? 'font-semibold' : ''
                          }`}>
                            {notification.title}
                          </p>
                          <div className="flex items-center space-x-1">
                            {!notification.is_read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                            <span className="text-xs text-gray-500">
                              {formatTimeAgo(notification.created_at)}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        {notification.action_required && !notification.action_taken && (
                          <div className="mt-2">
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded">
                              Aktion erforderlich
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 text-center">
              <button className="text-sm text-blue-600 hover:text-blue-800">
                Alle Benachrichtigungen anzeigen
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
