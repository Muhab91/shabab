import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useRealtimeData, useRealtimeNotifications } from '../hooks/useRealtime'
import RealtimeStats from './RealtimeStats'
import {
  Users,
  Activity,
  FileText,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Clock,
  RefreshCw
} from 'lucide-react'

type DashboardStats = {
  totalPlayers: number
  activeInjuries: number
  todayAppointments: number
  pendingAssessments: number
  thisWeekTests: number
  criticalRiskPlayers: number
}

type RecentActivity = {
  id: string
  type: string
  description: string
  timestamp: string
  playerName: string
}

export default function Dashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalPlayers: 0,
    activeInjuries: 0,
    todayAppointments: 0,
    pendingAssessments: 0,
    thisWeekTests: 0,
    criticalRiskPlayers: 0
  })
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  // Echtzeit-Daten für Live-Updates
  const { data: playersData } = useRealtimeData<any>('players')
  const { data: appointmentsData } = useRealtimeData<any>('appointments')
  const { data: physioAssessments } = useRealtimeData<any>('physio_assessments')
  const { data: cmjTests } = useRealtimeData<any>('cmj_tests')
  const { data: performanceAssessments } = useRealtimeData<any>('performance_assessments')
  
  // Benachrichtigungen für den aktuellen Benutzer
  const { notifications, unreadCount } = useRealtimeNotifications(profile?.id || '')

  useEffect(() => {
    loadDashboardData()
  }, [])
  
  // Live-Update der Statistiken wenn sich Echtzeit-Daten ändern
  useEffect(() => {
    updateStatsFromRealtimeData()
  }, [playersData, appointmentsData, physioAssessments, cmjTests, performanceAssessments, profile?.role])
  
  // Live-Aktivitäten basierend auf Echtzeit-Änderungen
  useEffect(() => {
    updateRecentActivitiesFromData()
  }, [physioAssessments, cmjTests, performanceAssessments])

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      
      await updateStatsFromRealtimeData()
      await loadRecentActivitiesFromDatabase()

    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [profile?.role])
  
  const updateStatsFromRealtimeData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      
      // Statistiken basierend auf Live-Daten berechnen
      const totalPlayers = playersData?.filter(p => p.is_active)?.length || 0
      
      const todayAppointments = appointmentsData?.filter(app => 
        app.appointment_date?.split('T')[0] === today && app.status === 'scheduled'
      )?.length || 0
      
      let pendingAssessments = 0
      let thisWeekTests = 0
      let criticalRiskPlayers = 0
      
      if (profile?.role === 'physiotherapist') {
        pendingAssessments = physioAssessments?.filter(assessment => 
          assessment.date_of_assessment >= weekAgo
        )?.length || 0
      } else if (profile?.role === 'trainer') {
        thisWeekTests = cmjTests?.filter(test => 
          test.test_date >= weekAgo
        )?.length || 0
        
        criticalRiskPlayers = performanceAssessments?.filter(assessment => 
          (assessment.risk_score || 0) >= 7.0
        )?.length || 0
      }
      
      setStats({
        totalPlayers,
        activeInjuries: 0, // TODO: implement injury tracking
        todayAppointments,
        pendingAssessments,
        thisWeekTests,
        criticalRiskPlayers
      })
      
    } catch (error) {
      console.error('Error updating stats from realtime data:', error)
    }
  }, [playersData, appointmentsData, physioAssessments, cmjTests, performanceAssessments, profile?.role])
  
  const loadRecentActivitiesFromDatabase = useCallback(async () => {
    try {
      const activities: RecentActivity[] = []
      
      // Lade die neuesten CMJ Tests
      if (cmjTests && cmjTests.length > 0) {
        const recentCMJTests = cmjTests
          .sort((a, b) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime())
          .slice(0, 3)
          
        for (const test of recentCMJTests) {
          const { data: player } = await supabase
            .from('players')
            .select('first_name, last_name')
            .eq('id', test.player_id)
            .single()
            
          activities.push({
            id: `cmj-${test.id}`,
            type: 'CMJ Test',
            description: `CMJ Test durchgeführt (${test.jump_height_cm || 'N/A'}cm)`,
            timestamp: test.test_date,
            playerName: player ? `${player.first_name} ${player.last_name}` : 'Unbekannter Spieler'
          })
        }
      }
      
      // Lade die neuesten Physio-Assessments
      if (physioAssessments && physioAssessments.length > 0) {
        const recentAssessments = physioAssessments
          .sort((a, b) => new Date(b.date_of_assessment).getTime() - new Date(a.date_of_assessment).getTime())
          .slice(0, 3)
          
        for (const assessment of recentAssessments) {
          const { data: player } = await supabase
            .from('players')
            .select('first_name, last_name')
            .eq('id', assessment.player_id)
            .single()
            
          activities.push({
            id: `physio-${assessment.id}`,
            type: 'Physiotherapie',
            description: assessment.diagnosis || 'Eingangsbefund erstellt',
            timestamp: assessment.date_of_assessment,
            playerName: player ? `${player.first_name} ${player.last_name}` : 'Unbekannter Patient'
          })
        }
      }
      
      // Sortiere nach Zeitstempel (neueste zuerst)
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      
      setRecentActivities(activities.slice(0, 5))
      
    } catch (error) {
      console.error('Error loading recent activities:', error)
    }
  }, [cmjTests, physioAssessments])
  
  const updateRecentActivitiesFromData = useCallback(async () => {
    if (!loading) {
      await loadRecentActivitiesFromDatabase()
    }
  }, [loadRecentActivitiesFromDatabase, loading])
  
  const handleRefresh = async () => {
    setRefreshing(true)
    await loadDashboardData()
    setTimeout(() => setRefreshing(false), 500) // UI feedback
  }

  const StatCard = ({ 
    icon: Icon, 
    title, 
    value, 
    subtitle, 
    color = 'blue' 
  }: {
    icon: React.ComponentType<any>
    title: string
    value: number
    subtitle: string
    color?: 'blue' | 'green' | 'orange' | 'red'
  }) => {
    const colorClasses = {
      blue: 'bg-blue-50 text-blue-600',
      green: 'bg-green-50 text-green-600',
      orange: 'bg-orange-50 text-orange-600',
      red: 'bg-red-50 text-red-600'
    }

    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500">{subtitle}</p>
          </div>
          <div className={`p-3 rounded-full ${colorClasses[color]}`}>
            <Icon size={24} />
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Dashboard - Medizinisches Dokumentationssystem
            </h1>
            <p className="text-gray-600">
              Willkommen, {profile?.full_name}. Übersicht über alle wichtigen Kennzahlen und Aktivitäten.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {unreadCount > 0 && (
              <div className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-medium">
                {unreadCount} neue Benachrichtigung{unreadCount === 1 ? '' : 'en'}
              </div>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              <span>Aktualisieren</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Live-Statistiken */}
      <RealtimeStats />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Users}
          title="Aktive Spieler"
          value={stats.totalPlayers}
          subtitle="Im System registriert"
          color="blue"
        />
        
        <StatCard
          icon={Calendar}
          title="Heute Termine"
          value={stats.todayAppointments}
          subtitle="Geplante Termine"
          color="green"
        />
        
        {profile?.role === 'physiotherapist' && (
          <StatCard
            icon={FileText}
            title="Neue Befunde"
            value={stats.pendingAssessments}
            subtitle="Diese Woche"
            color="blue"
          />
        )}
        
        {profile?.role === 'trainer' && (
          <>
            <StatCard
              icon={Activity}
              title="CMJ Tests"
              value={stats.thisWeekTests}
              subtitle="Diese Woche"
              color="green"
            />
            
            <StatCard
              icon={AlertTriangle}
              title="Risiko-Spieler"
              value={stats.criticalRiskPlayers}
              subtitle="Hoher Risikoscore"
              color="red"
            />
          </>
        )}
        
        {stats.activeInjuries > 0 && (
          <StatCard
            icon={AlertTriangle}
            title="Aktive Verletzungen"
            value={stats.activeInjuries}
            subtitle="Aktuell in Behandlung"
            color="orange"
          />
        )}
      </div>

      {/* Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Letzte Aktivitäten</h2>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Live-Updates aktiv"></div>
              <TrendingUp size={20} className="text-blue-600" />
            </div>
          </div>
          
          <div className="space-y-4">
            {recentActivities.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                <Activity size={24} className="mx-auto mb-2 text-gray-400" />
                <p>Noch keine Aktivitäten vorhanden</p>
              </div>
            ) : (
              recentActivities.map((activity) => {
                const isRecent = new Date(activity.timestamp) > new Date(Date.now() - 60 * 60 * 1000)
                return (
                  <div key={activity.id} className={`flex items-start space-x-3 p-2 rounded-lg transition-colors ${
                    isRecent ? 'bg-blue-50 border border-blue-200' : ''
                  }`}>
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      activity.type === 'CMJ Test' ? 'bg-green-500' :
                      activity.type === 'Physiotherapie' ? 'bg-blue-500' :
                      'bg-purple-500'
                    }`}></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.description}
                      </p>
                      <p className="text-sm text-gray-600">
                        {activity.playerName} - {activity.type}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleString('de-DE')}
                        {isRecent && <span className="ml-2 text-blue-600 font-medium">Neu</span>}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Schnellzugriff</h2>
            <Clock size={20} className="text-blue-600" />
          </div>
          
          <div className="space-y-3">
            {profile?.role === 'trainer' && (
              <>
                <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                  <div className="font-medium text-gray-900">Neuer CMJ Test</div>
                  <div className="text-sm text-gray-600">Counter Movement Jump Test durchführen</div>
                </button>
                <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                  <div className="font-medium text-gray-900">Risikobewertung</div>
                  <div className="text-sm text-gray-600">Verletzungsrisiko bewerten</div>
                </button>
              </>
            )}
            
            {profile?.role === 'physiotherapist' && (
              <>
                <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                  <div className="font-medium text-gray-900">Neuer Eingangsbefund</div>
                  <div className="text-sm text-gray-600">Patientenakte erstellen</div>
                </button>
                <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                  <div className="font-medium text-gray-900">Behandlung dokumentieren</div>
                  <div className="text-sm text-gray-600">Therapiesitzung erfassen</div>
                </button>
              </>
            )}
            
            {profile?.role === 'physician' && (
              <>
                <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                  <div className="font-medium text-gray-900">Neue Behandlung</div>
                  <div className="text-sm text-gray-600">Medizinische Behandlung dokumentieren</div>
                </button>
                <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                  <div className="font-medium text-gray-900">Dokument hochladen</div>
                  <div className="text-sm text-gray-600">MRT, Röntgen oder Befund hinzufügen</div>
                </button>
              </>
            )}
            
            <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <div className="font-medium text-gray-900">Termin vereinbaren</div>
              <div className="text-sm text-gray-600">Neuen Termin planen</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
