import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type NotificationData = {
  id: string
  recipient_id: string
  sender_id?: string
  notification_type: string
  title: string
  message: string
  priority: string
  is_read: boolean
  read_at?: string
  action_required: boolean
  action_taken: boolean
  related_table?: string
  related_id?: string
  metadata: any
  created_at: string
  expires_at?: string
}

export function useRealtimeNotifications(userId: string) {
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    // Load initial notifications
    const loadNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('recipient_id', userId)
          .order('created_at', { ascending: false })
          .limit(50)

        if (error) throw error
        
        setNotifications(data || [])
        setUnreadCount(data?.filter(n => !n.is_read).length || 0)
      } catch (error) {
        console.error('Error loading notifications:', error)
      } finally {
        setLoading(false)
      }
    }

    loadNotifications()

    // Set up real-time subscription
    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`
        },
        (payload) => {
          console.log('Notification change received:', payload)
          
          if (payload.eventType === 'INSERT') {
            const newNotification = payload.new as NotificationData
            setNotifications(prev => [newNotification, ...prev])
            if (!newNotification.is_read) {
              setUnreadCount(prev => prev + 1)
            }
            
            // Show browser notification if supported
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(newNotification.title, {
                body: newNotification.message,
                icon: '/favicon.ico',
                tag: newNotification.id
              })
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedNotification = payload.new as NotificationData
            setNotifications(prev => 
              prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
            )
            
            // Update unread count
            setNotifications(current => {
              setUnreadCount(current.filter(n => !n.is_read).length)
              return current
            })
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id
            setNotifications(prev => prev.filter(n => n.id !== deletedId))
          }
        }
      )
      .subscribe()

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    return () => {
      subscription.unsubscribe()
    }
  }, [userId])

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', notificationId)

      if (error) throw error
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('recipient_id', userId)
        .eq('is_read', false)

      if (error) throw error
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  const createNotification = async (notification: Omit<NotificationData, 'id' | 'created_at' | 'is_read' | 'read_at' | 'action_taken'>) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          ...notification,
          is_read: false,
          action_taken: false
        })

      if (error) throw error
    } catch (error) {
      console.error('Error creating notification:', error)
    }
  }

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    createNotification
  }
}

export function useRealtimeData<T>(table: string, filter?: string) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Load initial data
    const loadData = async () => {
      try {
        let query = supabase.from(table).select('*')
        
        if (filter) {
          // Simple filter parsing (extend as needed)
          const [column, operator, value] = filter.split('.')
          if (operator === 'eq') {
            query = query.eq(column, value)
          }
        }
        
        const { data: initialData, error } = await query
        
        if (error) throw error
        setData(initialData as T[])
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }

    loadData()

    // Set up real-time subscription
    const subscription = supabase
      .channel(`realtime-${table}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: filter
        },
        (payload) => {
          console.log(`${table} change received:`, payload)
          
          if (payload.eventType === 'INSERT') {
            setData(prev => [payload.new as T, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setData(prev => 
              prev.map(item => 
                (item as any).id === payload.new.id ? payload.new as T : item
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setData(prev => 
              prev.filter(item => (item as any).id !== payload.old.id)
            )
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [table, filter])

  return { data, loading, error, setData }
}
