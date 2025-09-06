import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useRealtimeData } from '../hooks/useRealtime'
import {
  Plus,
  Search,
  Filter,
  Edit,
  Eye,
  Save,
  X,
  Calendar,
  User,
  Activity,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Target
} from 'lucide-react'

type Player = {
  id: string
  first_name: string
  last_name: string
  date_of_birth?: string
  jersey_number?: number
  position?: string
  height?: number
  weight?: number
}

type CMJTest = {
  id?: string
  player_id: string
  test_date: string
  jump_height_cm?: number
  flight_time_ms?: number
  ground_contact_time_ms?: number
  balance_left_percent?: number
  balance_right_percent?: number
  peak_force_n?: number
  power_watts?: number
  rsi_score?: number
  notes?: string
  tested_by?: string
  created_at?: string
}

type PerformanceAssessment = {
  id?: string
  player_id: string
  assessment_date: string
  risk_score?: number
  fatigue_level?: number
  readiness_score?: number
  strength_assessment?: string
  mobility_assessment?: string
  recommendations?: string
  return_to_play_status?: string
  assessed_by?: string
  created_at?: string
}

export default function AthletiktrainerModule() {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState<'cmj' | 'performance'>('cmj')
  const [activeView, setActiveView] = useState<'list' | 'new' | 'edit' | 'view'>('list')
  const [selectedItem, setSelectedItem] = useState<CMJTest | PerformanceAssessment | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Echtzeit-Daten
  const { data: players } = useRealtimeData<Player>('players')
  const { data: cmjTests, setData: setCMJTests } = useRealtimeData<CMJTest>('cmj_tests')
  const { data: performanceAssessments, setData: setPerformanceAssessments } = useRealtimeData<PerformanceAssessment>('performance_assessments')

  // CMJ Test Formular
  const [cmjFormData, setCMJFormData] = useState<CMJTest>({
    player_id: '',
    test_date: new Date().toISOString().split('T')[0],
    jump_height_cm: undefined,
    flight_time_ms: undefined,
    ground_contact_time_ms: undefined,
    balance_left_percent: undefined,
    balance_right_percent: undefined,
    peak_force_n: undefined,
    power_watts: undefined,
    rsi_score: undefined,
    notes: ''
  })

  // Performance Assessment Formular
  const [perfFormData, setPerfFormData] = useState<PerformanceAssessment>({
    player_id: '',
    assessment_date: new Date().toISOString().split('T')[0],
    risk_score: undefined,
    fatigue_level: undefined,
    readiness_score: undefined,
    strength_assessment: '',
    mobility_assessment: '',
    recommendations: '',
    return_to_play_status: 'cleared'
  })

  const handleSaveCMJ = async () => {
    try {
      setSaving(true)
      
      const dataToSave = {
        ...cmjFormData,
        tested_by: profile?.id
      }

      let result
      if (activeView === 'edit' && selectedItem?.id) {
        result = await supabase
          .from('cmj_tests')
          .update(dataToSave)
          .eq('id', selectedItem.id)
          .select()
          .single()
      } else {
        result = await supabase
          .from('cmj_tests')
          .insert([dataToSave])
          .select()
          .single()
      }

      if (result.error) throw result.error
      
      if (activeView === 'edit') {
        setCMJTests(prev => prev.map(t => t.id === result.data.id ? result.data : t))
      } else {
        setCMJTests(prev => [result.data, ...prev])
      }
      
      setActiveView('list')
      resetForms()
      
    } catch (error) {
      console.error('Error saving CMJ test:', error)
      alert('Fehler beim Speichern: ' + (error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleSavePerformance = async () => {
    try {
      setSaving(true)
      
      const dataToSave = {
        ...perfFormData,
        assessed_by: profile?.id
      }

      let result
      if (activeView === 'edit' && selectedItem?.id) {
        result = await supabase
          .from('performance_assessments')
          .update(dataToSave)
          .eq('id', selectedItem.id)
          .select()
          .single()
      } else {
        result = await supabase
          .from('performance_assessments')
          .insert([dataToSave])
          .select()
          .single()
      }

      if (result.error) throw result.error
      
      if (activeView === 'edit') {
        setPerformanceAssessments(prev => prev.map(p => p.id === result.data.id ? result.data : p))
      } else {
        setPerformanceAssessments(prev => [result.data, ...prev])
      }
      
      setActiveView('list')
      resetForms()
      
    } catch (error) {
      console.error('Error saving performance assessment:', error)
      alert('Fehler beim Speichern: ' + (error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const resetForms = () => {
    setCMJFormData({
      player_id: '',
      test_date: new Date().toISOString().split('T')[0],
      jump_height_cm: undefined,
      flight_time_ms: undefined,
      ground_contact_time_ms: undefined,
      balance_left_percent: undefined,
      balance_right_percent: undefined,
      peak_force_n: undefined,
      power_watts: undefined,
      rsi_score: undefined,
      notes: ''
    })
    
    setPerfFormData({
      player_id: '',
      assessment_date: new Date().toISOString().split('T')[0],
      risk_score: undefined,
      fatigue_level: undefined,
      readiness_score: undefined,
      strength_assessment: '',
      mobility_assessment: '',
      recommendations: '',
      return_to_play_status: 'cleared'
    })
    
    setSelectedItem(null)
  }

  const handleEditItem = (item: CMJTest | PerformanceAssessment) => {
    if (activeTab === 'cmj') {
      setCMJFormData(item as CMJTest)
    } else {
      setPerfFormData(item as PerformanceAssessment)
    }
    setSelectedItem(item)
    setActiveView('edit')
  }

  const handleViewItem = (item: CMJTest | PerformanceAssessment) => {
    setSelectedItem(item)
    setActiveView('view')
  }

  const getPlayerName = (playerId: string) => {
    const player = players?.find(p => p.id === playerId)
    return player ? `${player.first_name} ${player.last_name}` : 'Unbekannt'
  }

  const getPlayerStats = (playerId: string) => {
    const playerCMJTests = cmjTests?.filter(t => t.player_id === playerId) || []
    const latest = playerCMJTests.sort((a, b) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime())[0]
    
    return {
      totalTests: playerCMJTests.length,
      latestHeight: latest?.jump_height_cm,
      latestRSI: latest?.rsi_score
    }
  }

  const getCurrentData = () => {
    if (activeTab === 'cmj') {
      return cmjTests?.filter(test => {
        if (!searchQuery) return true
        const playerName = getPlayerName(test.player_id).toLowerCase()
        return playerName.includes(searchQuery.toLowerCase())
      }) || []
    } else {
      return performanceAssessments?.filter(assessment => {
        if (!searchQuery) return true
        const playerName = getPlayerName(assessment.player_id).toLowerCase()
        return playerName.includes(searchQuery.toLowerCase())
      }) || []
    }
  }

  const getRiskScoreColor = (score?: number) => {
    if (!score) return 'text-gray-500'
    if (score >= 8) return 'text-red-600'
    if (score >= 6) return 'text-orange-600'
    if (score >= 4) return 'text-yellow-600'
    return 'text-green-600'
  }

  if (activeView === 'list') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Athletiktrainer</h1>
            <p className="text-gray-600">Leistungsdiagnostik und Performance-Assessments</p>
          </div>
          <button
            onClick={() => setActiveView('new')}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} />
            <span>Neuer {activeTab === 'cmj' ? 'CMJ Test' : 'Performance-Assessment'}</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('cmj')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'cmj'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Activity size={18} className="inline mr-2" />
                CMJ Tests
              </button>
              <button
                onClick={() => setActiveTab('performance')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'performance'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Target size={18} className="inline mr-2" />
                Performance-Assessments
              </button>
            </nav>
          </div>

          {/* Suche */}
          <div className="p-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search size={20} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Spieler suchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Filter size={18} />
                <span>Filter</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Liste */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="divide-y divide-gray-200">
            {getCurrentData().length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {activeTab === 'cmj' ? (
                  <>
                    <Activity size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>Keine CMJ Tests gefunden</p>
                  </>
                ) : (
                  <>
                    <Target size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>Keine Performance-Assessments gefunden</p>
                  </>
                )}
                <p className="text-sm">Erstellen Sie einen neuen Eintrag mit der Schaltfläche oben.</p>
              </div>
            ) : (
              getCurrentData().map((item) => {
                const player = players?.find(p => p.id === (item as any).player_id)
                const stats = getPlayerStats((item as any).player_id)
                
                return (
                  <div key={item.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User size={20} className="text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {getPlayerName((item as any).player_id)}
                              {player?.jersey_number && (
                                <span className="ml-2 text-sm text-gray-500">#{player.jersey_number}</span>
                              )}
                            </h3>
                            <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                              <span className="flex items-center space-x-1">
                                <Calendar size={14} />
                                <span>
                                  {new Date((item as any).test_date || (item as any).assessment_date).toLocaleDateString('de-DE')}
                                </span>
                              </span>
                              
                              {activeTab === 'cmj' && (
                                <>
                                  {(item as CMJTest).jump_height_cm && (
                                    <span className="flex items-center space-x-1">
                                      <TrendingUp size={14} />
                                      <span>{(item as CMJTest).jump_height_cm}cm</span>
                                    </span>
                                  )}
                                  {(item as CMJTest).rsi_score && (
                                    <span className="flex items-center space-x-1">
                                      <BarChart3 size={14} />
                                      <span>RSI: {(item as CMJTest).rsi_score}</span>
                                    </span>
                                  )}
                                </>
                              )}
                              
                              {activeTab === 'performance' && (
                                <>
                                  {(item as PerformanceAssessment).risk_score && (
                                    <span className={`flex items-center space-x-1 ${getRiskScoreColor((item as PerformanceAssessment).risk_score)}`}>
                                      <AlertTriangle size={14} />
                                      <span>Risiko: {(item as PerformanceAssessment).risk_score}/10</span>
                                    </span>
                                  )}
                                  {(item as PerformanceAssessment).readiness_score && (
                                    <span className="flex items-center space-x-1">
                                      <Activity size={14} />
                                      <span>Bereitschaft: {(item as PerformanceAssessment).readiness_score}/10</span>
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewItem(item)}
                          className="p-2 text-gray-600 hover:text-blue-600"
                          title="Anzeigen"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleEditItem(item)}
                          className="p-2 text-gray-600 hover:text-blue-600"
                          title="Bearbeiten"
                        >
                          <Edit size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    )
  }

  // Formular für neuen/bearbeiteten Eintrag
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {activeView === 'new' 
              ? `Neuer ${activeTab === 'cmj' ? 'CMJ Test' : 'Performance-Assessment'}`
              : activeView === 'edit' 
              ? `${activeTab === 'cmj' ? 'CMJ Test' : 'Performance-Assessment'} bearbeiten`
              : `${activeTab === 'cmj' ? 'CMJ Test' : 'Performance-Assessment'} anzeigen`
            }
          </h1>
          <p className="text-gray-600">
            {activeTab === 'cmj' ? 'Counter Movement Jump Test' : 'Leistungsdiagnostik und Risikoeinschätzung'}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setActiveView('list')
              resetForms()
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <X size={18} className="inline mr-2" />
            Abbrechen
          </button>
          {activeView !== 'view' && (
            <button
              onClick={activeTab === 'cmj' ? handleSaveCMJ : handleSavePerformance}
              disabled={saving || !(activeTab === 'cmj' ? cmjFormData.player_id : perfFormData.player_id)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={18} className="inline mr-2" />
              {saving ? 'Speichern...' : 'Speichern'}
            </button>
          )}
        </div>
      </div>

      {/* Formular */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 space-y-6">
          {/* Grundinformationen */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Spieler *
              </label>
              <select
                value={activeTab === 'cmj' ? cmjFormData.player_id : perfFormData.player_id}
                onChange={(e) => {
                  if (activeTab === 'cmj') {
                    setCMJFormData({ ...cmjFormData, player_id: e.target.value })
                  } else {
                    setPerfFormData({ ...perfFormData, player_id: e.target.value })
                  }
                }}
                disabled={activeView === 'view'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                required
              >
                <option value="">Spieler auswählen...</option>
                {players?.map(player => (
                  <option key={player.id} value={player.id}>
                    {player.first_name} {player.last_name} 
                    {player.jersey_number ? `(#${player.jersey_number})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {activeTab === 'cmj' ? 'Testdatum' : 'Bewertungsdatum'} *
              </label>
              <input
                type="date"
                value={activeTab === 'cmj' ? cmjFormData.test_date : perfFormData.assessment_date}
                onChange={(e) => {
                  if (activeTab === 'cmj') {
                    setCMJFormData({ ...cmjFormData, test_date: e.target.value })
                  } else {
                    setPerfFormData({ ...perfFormData, assessment_date: e.target.value })
                  }
                }}
                disabled={activeView === 'view'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                required
              />
            </div>
          </div>

          {/* CMJ Test spezifische Felder */}
          {activeTab === 'cmj' && (
            <>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Sprungleistung</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sprunghiöhe (cm)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={cmjFormData.jump_height_cm || ''}
                      onChange={(e) => setCMJFormData({ ...cmjFormData, jump_height_cm: e.target.value ? parseFloat(e.target.value) : undefined })}
                      disabled={activeView === 'view'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                      placeholder="z.B. 45.2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Flugzeit (ms)
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={cmjFormData.flight_time_ms || ''}
                      onChange={(e) => setCMJFormData({ ...cmjFormData, flight_time_ms: e.target.value ? parseInt(e.target.value) : undefined })}
                      disabled={activeView === 'view'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                      placeholder="z.B. 600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bodenkontaktzeit (ms)
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={cmjFormData.ground_contact_time_ms || ''}
                      onChange={(e) => setCMJFormData({ ...cmjFormData, ground_contact_time_ms: e.target.value ? parseInt(e.target.value) : undefined })}
                      disabled={activeView === 'view'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                      placeholder="z.B. 250"
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Kraftparameter</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Spitzenkraft (N)
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={cmjFormData.peak_force_n || ''}
                      onChange={(e) => setCMJFormData({ ...cmjFormData, peak_force_n: e.target.value ? parseInt(e.target.value) : undefined })}
                      disabled={activeView === 'view'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                      placeholder="z.B. 2500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Leistung (Watt)
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={cmjFormData.power_watts || ''}
                      onChange={(e) => setCMJFormData({ ...cmjFormData, power_watts: e.target.value ? parseInt(e.target.value) : undefined })}
                      disabled={activeView === 'view'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                      placeholder="z.B. 3500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      RSI Score
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={cmjFormData.rsi_score || ''}
                      onChange={(e) => setCMJFormData({ ...cmjFormData, rsi_score: e.target.value ? parseFloat(e.target.value) : undefined })}
                      disabled={activeView === 'view'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                      placeholder="z.B. 1.8"
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Balance</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Balance Links (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={cmjFormData.balance_left_percent || ''}
                      onChange={(e) => setCMJFormData({ ...cmjFormData, balance_left_percent: e.target.value ? parseFloat(e.target.value) : undefined })}
                      disabled={activeView === 'view'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                      placeholder="z.B. 48.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Balance Rechts (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={cmjFormData.balance_right_percent || ''}
                      onChange={(e) => setCMJFormData({ ...cmjFormData, balance_right_percent: e.target.value ? parseFloat(e.target.value) : undefined })}
                      disabled={activeView === 'view'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                      placeholder="z.B. 51.5"
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notizen
                </label>
                <textarea
                  value={cmjFormData.notes || ''}
                  onChange={(e) => setCMJFormData({ ...cmjFormData, notes: e.target.value })}
                  disabled={activeView === 'view'}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                  placeholder="Besonderheiten, Auffälligkeiten oder Kommentare"
                />
              </div>
            </>
          )}

          {/* Performance Assessment spezifische Felder */}
          {activeTab === 'performance' && (
            <>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Risikoeinschätzung</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Risikoscore (1-10)
                    </label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={perfFormData.risk_score || 5}
                        onChange={(e) => setPerfFormData({ ...perfFormData, risk_score: parseInt(e.target.value) })}
                        disabled={activeView === 'view'}
                        className="flex-1"
                      />
                      <span className={`text-2xl font-bold w-8 ${getRiskScoreColor(perfFormData.risk_score)}`}>
                        {perfFormData.risk_score || 5}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Niedrig</span>
                      <span>Mittel</span>
                      <span>Hoch</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ermüdungsgrad (1-10)
                    </label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={perfFormData.fatigue_level || 5}
                        onChange={(e) => setPerfFormData({ ...perfFormData, fatigue_level: parseInt(e.target.value) })}
                        disabled={activeView === 'view'}
                        className="flex-1"
                      />
                      <span className="text-2xl font-bold text-gray-900 w-8">
                        {perfFormData.fatigue_level || 5}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bereitschaftsscore (1-10)
                    </label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={perfFormData.readiness_score || 5}
                        onChange={(e) => setPerfFormData({ ...perfFormData, readiness_score: parseInt(e.target.value) })}
                        disabled={activeView === 'view'}
                        className="flex-1"
                      />
                      <span className="text-2xl font-bold text-green-600 w-8">
                        {perfFormData.readiness_score || 5}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Assessments</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kraftbewertung
                    </label>
                    <textarea
                      value={perfFormData.strength_assessment || ''}
                      onChange={(e) => setPerfFormData({ ...perfFormData, strength_assessment: e.target.value })}
                      disabled={activeView === 'view'}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                      placeholder="Krafttests, Schwächen, Stärken"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mobilitätsbewertung
                    </label>
                    <textarea
                      value={perfFormData.mobility_assessment || ''}
                      onChange={(e) => setPerfFormData({ ...perfFormData, mobility_assessment: e.target.value })}
                      disabled={activeView === 'view'}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                      placeholder="Beweglichkeitstests, Einschränkungen"
                    />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Return-to-Play Status
                  </label>
                  <select
                    value={perfFormData.return_to_play_status || 'cleared'}
                    onChange={(e) => setPerfFormData({ ...perfFormData, return_to_play_status: e.target.value })}
                    disabled={activeView === 'view'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                  >
                    <option value="cleared">Vollständig freigegeben</option>
                    <option value="restricted">Eingeschränkt freigegeben</option>
                    <option value="modified">Modifiziertes Training</option>
                    <option value="not_cleared">Nicht freigegeben</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Empfehlungen
                </label>
                <textarea
                  value={perfFormData.recommendations || ''}
                  onChange={(e) => setPerfFormData({ ...perfFormData, recommendations: e.target.value })}
                  disabled={activeView === 'view'}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                  placeholder="Trainingsempfehlungen, Präventionsmaßnahmen, weitere Maßnahmen"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
