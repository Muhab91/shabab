import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRealtimeData } from '../hooks/useRealtime'
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  Calendar,
  BarChart3,
  PieChart
} from 'lucide-react'

type StatTrend = {
  value: number
  change: number
  trend: 'up' | 'down' | 'stable'
}

type WeeklyStats = {
  cmjTests: StatTrend
  physioSessions: StatTrend
  newInjuries: StatTrend
  appointments: StatTrend
}

export default function RealtimeStats() {
  const { profile } = useAuth()
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({
    cmjTests: { value: 0, change: 0, trend: 'stable' },
    physioSessions: { value: 0, change: 0, trend: 'stable' },
    newInjuries: { value: 0, change: 0, trend: 'stable' },
    appointments: { value: 0, change: 0, trend: 'stable' }
  })
  
  // Echtzeit-Daten
  const { data: cmjTests } = useRealtimeData<any>('cmj_tests')
  const { data: physioSessions } = useRealtimeData<any>('physio_assessments')
  const { data: appointments } = useRealtimeData<any>('appointments')
  const { data: medicalTreatments } = useRealtimeData<any>('medical_treatments')
  
  useEffect(() => {
    calculateWeeklyTrends()
  }, [cmjTests, physioSessions, appointments, medicalTreatments])
  
  const calculateWeeklyTrends = () => {
    const now = new Date()
    const thisWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
    const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000)
    const lastWeekEnd = new Date(thisWeekStart.getTime() - 1)
    
    // CMJ Tests
    const thisWeekCMJ = cmjTests?.filter(test => 
      new Date(test.test_date) >= thisWeekStart
    )?.length || 0
    
    const lastWeekCMJ = cmjTests?.filter(test => {
      const testDate = new Date(test.test_date)
      return testDate >= lastWeekStart && testDate <= lastWeekEnd
    })?.length || 0
    
    // Physio Sessions
    const thisWeekPhysio = physioSessions?.filter(session => 
      new Date(session.date_of_assessment) >= thisWeekStart
    )?.length || 0
    
    const lastWeekPhysio = physioSessions?.filter(session => {
      const sessionDate = new Date(session.date_of_assessment)
      return sessionDate >= lastWeekStart && sessionDate <= lastWeekEnd
    })?.length || 0
    
    // Appointments
    const thisWeekAppointments = appointments?.filter(app => 
      new Date(app.appointment_date) >= thisWeekStart
    )?.length || 0
    
    const lastWeekAppointments = appointments?.filter(app => {
      const appDate = new Date(app.appointment_date)
      return appDate >= lastWeekStart && appDate <= lastWeekEnd
    })?.length || 0
    
    // New injuries (medical treatments this week)
    const thisWeekTreatments = medicalTreatments?.filter(treatment => 
      new Date(treatment.treatment_date) >= thisWeekStart
    )?.length || 0
    
    const lastWeekTreatments = medicalTreatments?.filter(treatment => {
      const treatmentDate = new Date(treatment.treatment_date)
      return treatmentDate >= lastWeekStart && treatmentDate <= lastWeekEnd
    })?.length || 0
    
    const calculateTrend = (current: number, previous: number): { change: number, trend: 'up' | 'down' | 'stable' } => {
      if (previous === 0) return { change: 0, trend: 'stable' }
      const change = ((current - previous) / previous) * 100
      const trend = change > 5 ? 'up' : change < -5 ? 'down' : 'stable'
      return { change: Math.round(change), trend }
    }
    
    setWeeklyStats({
      cmjTests: {
        value: thisWeekCMJ,
        ...calculateTrend(thisWeekCMJ, lastWeekCMJ)
      },
      physioSessions: {
        value: thisWeekPhysio,
        ...calculateTrend(thisWeekPhysio, lastWeekPhysio)
      },
      newInjuries: {
        value: thisWeekTreatments,
        ...calculateTrend(thisWeekTreatments, lastWeekTreatments)
      },
      appointments: {
        value: thisWeekAppointments,
        ...calculateTrend(thisWeekAppointments, lastWeekAppointments)
      }
    })
  }
  
  const TrendCard = ({ 
    title, 
    stat, 
    icon: Icon, 
    color 
  }: { 
    title: string
    stat: StatTrend
    icon: React.ComponentType<any>
    color: string 
  }) => {
    const getTrendIcon = () => {
      switch (stat.trend) {
        case 'up':
          return <TrendingUp size={16} className="text-green-500" />
        case 'down':
          return <TrendingDown size={16} className="text-red-500" />
        default:
          return <div className="w-4 h-4 bg-gray-300 rounded-full" />
      }
    }
    
    const getTrendColor = () => {
      switch (stat.trend) {
        case 'up':
          return 'text-green-600'
        case 'down':
          return 'text-red-600'
        default:
          return 'text-gray-500'
      }
    }
    
    return (
      <div className={`bg-white p-4 rounded-lg border-l-4 ${color} shadow-sm`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <div className="flex items-center space-x-1 mt-1">
              {getTrendIcon()}
              <span className={`text-sm font-medium ${getTrendColor()}`}>
                {stat.change !== 0 && `${stat.change > 0 ? '+' : ''}${stat.change}%`}
                {stat.change === 0 && 'Unverändert'}
              </span>
              <span className="text-xs text-gray-500">vs. letzte Woche</span>
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-full">
            <Icon size={24} className="text-gray-600" />
          </div>
        </div>
      </div>
    )
  }
  
  if (!profile) return null
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Wochenstatistik</h2>
          <p className="text-gray-600 text-sm">Live-Trends und Vergleich zur Vorwoche</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-500">Live</span>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {profile.role === 'trainer' && (
          <TrendCard
            title="CMJ Tests"
            stat={weeklyStats.cmjTests}
            icon={Activity}
            color="border-green-400"
          />
        )}
        
        {(profile.role === 'physiotherapist' || profile.role === 'admin') && (
          <TrendCard
            title="Physio-Sessions"
            stat={weeklyStats.physioSessions}
            icon={Users}
            color="border-blue-400"
          />
        )}
        
        <TrendCard
          title="Termine"
          stat={weeklyStats.appointments}
          icon={Calendar}
          color="border-purple-400"
        />
        
        {(profile.role === 'physician' || profile.role === 'admin') && (
          <TrendCard
            title="Neue Behandlungen"
            stat={weeklyStats.newInjuries}
            icon={BarChart3}
            color="border-orange-400"
          />
        )}
      </div>
      
      {/* Quick Insights */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Schnelle Einblicke</h3>
          <PieChart size={20} className="text-blue-600" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {weeklyStats.cmjTests.value + weeklyStats.physioSessions.value}
            </div>
            <div className="text-sm text-gray-600">Gesamte Assessments</div>
          </div>
          
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {Math.round((weeklyStats.appointments.value / 7) * 10) / 10}
            </div>
            <div className="text-sm text-gray-600">Ø Termine/Tag</div>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {weeklyStats.newInjuries.value === 0 ? '✓' : weeklyStats.newInjuries.value}
            </div>
            <div className="text-sm text-gray-600">
              {weeklyStats.newInjuries.value === 0 ? 'Keine neuen Verletzungen' : 'Neue Behandlungen'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
