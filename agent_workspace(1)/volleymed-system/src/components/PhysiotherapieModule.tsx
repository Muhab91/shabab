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
  FileText,
  AlertCircle
} from 'lucide-react'

type Player = {
  id: string
  first_name: string
  last_name: string
  date_of_birth?: string
  jersey_number?: number
  position?: string
}

type PhysioAssessment = {
  id?: string
  player_id: string
  therapist_id?: string
  date_of_assessment: string
  diagnosis?: string
  secondary_diagnosis?: string
  medications?: string
  recreational_activities?: string
  social_history?: string
  current_occupation?: string
  current_complaints?: string
  complaints_in_daily_life?: string
  complaints_since_when?: string
  frequency_of_complaints?: string
  triggered_by?: string
  relieved_by?: string
  previous_treatments?: string
  previous_therapies?: string
  inspection_findings?: string
  palpation_findings?: string
  pain_intensity?: number
  pain_description?: string
  specific_findings?: string
  therapy_goals?: string
  created_at?: string
  updated_at?: string
}

type DocumentationEntry = {
  id?: string
  assessment_id: string
  date: string
  notes: string
  created_at?: string
}

export default function PhysiotherapieModule() {
  const { profile } = useAuth()
  const [activeView, setActiveView] = useState<'list' | 'new' | 'edit' | 'view'>('list')
  const [selectedAssessment, setSelectedAssessment] = useState<PhysioAssessment | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Echtzeit-Daten
  const { data: players } = useRealtimeData<Player>('players')
  const { data: assessments, setData: setAssessments } = useRealtimeData<PhysioAssessment>('physio_assessments')

  // Formular-State
  const [formData, setFormData] = useState<PhysioAssessment>({
    player_id: '',
    date_of_assessment: new Date().toISOString().split('T')[0],
    diagnosis: '',
    secondary_diagnosis: '',
    medications: '',
    recreational_activities: '',
    social_history: '',
    current_occupation: '',
    current_complaints: '',
    complaints_in_daily_life: '',
    complaints_since_when: '',
    frequency_of_complaints: '',
    triggered_by: '',
    relieved_by: '',
    previous_treatments: '',
    previous_therapies: '',
    inspection_findings: '',
    palpation_findings: '',
    pain_intensity: 5,
    pain_description: '',
    specific_findings: '',
    therapy_goals: ''
  })

  // Dokumentations-State
  const [documentationEntries, setDocumentationEntries] = useState<DocumentationEntry[]>([])
  const [newDocEntry, setNewDocEntry] = useState({ date: new Date().toISOString().split('T')[0], notes: '' })

  // Lade Dokumentationseinträge für ausgewählte Bewertung
  useEffect(() => {
    if (selectedAssessment?.id) {
      loadDocumentationEntries(selectedAssessment.id)
    }
  }, [selectedAssessment])

  const loadDocumentationEntries = async (assessmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('physio_documentation')
        .select('*')
        .eq('assessment_id', assessmentId)
        .order('date', { ascending: false })

      if (error) throw error
      setDocumentationEntries(data || [])
    } catch (error) {
      console.error('Error loading documentation:', error)
    }
  }

  const handleSaveAssessment = async () => {
    try {
      setSaving(true)
      
      const dataToSave = {
        ...formData,
        therapist_id: profile?.id
      }

      let result
      if (activeView === 'edit' && selectedAssessment?.id) {
        // Update existing
        result = await supabase
          .from('physio_assessments')
          .update(dataToSave)
          .eq('id', selectedAssessment.id)
          .select()
          .single()
      } else {
        // Create new
        result = await supabase
          .from('physio_assessments')
          .insert([dataToSave])
          .select()
          .single()
      }

      if (result.error) throw result.error
      
      // Aktualisiere lokale Daten
      if (activeView === 'edit') {
        setAssessments(prev => prev.map(a => a.id === result.data.id ? result.data : a))
      } else {
        setAssessments(prev => [result.data, ...prev])
      }
      
      setActiveView('list')
      resetForm()
      
    } catch (error) {
      console.error('Error saving assessment:', error)
      alert('Fehler beim Speichern: ' + (error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleAddDocumentation = async () => {
    if (!selectedAssessment?.id || !newDocEntry.notes.trim()) return

    try {
      const { data, error } = await supabase
        .from('physio_documentation')
        .insert([{
          assessment_id: selectedAssessment.id,
          date: newDocEntry.date,
          notes: newDocEntry.notes,
          therapist_id: profile?.id
        }])
        .select()
        .single()

      if (error) throw error
      
      setDocumentationEntries(prev => [data, ...prev])
      setNewDocEntry({ date: new Date().toISOString().split('T')[0], notes: '' })
      
    } catch (error) {
      console.error('Error adding documentation:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      player_id: '',
      date_of_assessment: new Date().toISOString().split('T')[0],
      diagnosis: '',
      secondary_diagnosis: '',
      medications: '',
      recreational_activities: '',
      social_history: '',
      current_occupation: '',
      current_complaints: '',
      complaints_in_daily_life: '',
      complaints_since_when: '',
      frequency_of_complaints: '',
      triggered_by: '',
      relieved_by: '',
      previous_treatments: '',
      previous_therapies: '',
      inspection_findings: '',
      palpation_findings: '',
      pain_intensity: 5,
      pain_description: '',
      specific_findings: '',
      therapy_goals: ''
    })
    setSelectedAssessment(null)
  }

  const handleEditAssessment = (assessment: PhysioAssessment) => {
    setFormData(assessment)
    setSelectedAssessment(assessment)
    setActiveView('edit')
  }

  const handleViewAssessment = (assessment: PhysioAssessment) => {
    setSelectedAssessment(assessment)
    setActiveView('view')
  }

  const filteredAssessments = assessments?.filter(assessment => {
    if (!searchQuery) return true
    const player = players?.find(p => p.id === assessment.player_id)
    const playerName = `${player?.first_name || ''} ${player?.last_name || ''}`.toLowerCase()
    return playerName.includes(searchQuery.toLowerCase()) || 
           assessment.diagnosis?.toLowerCase().includes(searchQuery.toLowerCase())
  }) || []

  const getPlayerName = (playerId: string) => {
    const player = players?.find(p => p.id === playerId)
    return player ? `${player.first_name} ${player.last_name}` : 'Unbekannt'
  }

  if (activeView === 'list') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Physiotherapie</h1>
            <p className="text-gray-600">Eingangsbefunde und Behandlungsdokumentation</p>
          </div>
          <button
            onClick={() => setActiveView('new')}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} />
            <span>Neuer Eingangsbefund</span>
          </button>
        </div>

        {/* Suche und Filter */}
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search size={20} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Patient oder Diagnose suchen..."
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

        {/* Bewertungsliste */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="divide-y divide-gray-200">
            {filteredAssessments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                <p>Keine Eingangsbefunde gefunden</p>
                <p className="text-sm">Erstellen Sie einen neuen Befund mit der Schaltfläche oben.</p>
              </div>
            ) : (
              filteredAssessments.map((assessment) => {
                const player = players?.find(p => p.id === assessment.player_id)
                return (
                  <div key={assessment.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User size={20} className="text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {getPlayerName(assessment.player_id)}
                            </h3>
                            <p className="text-gray-600">{assessment.diagnosis}</p>
                            <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                              <span className="flex items-center space-x-1">
                                <Calendar size={14} />
                                <span>{new Date(assessment.date_of_assessment).toLocaleDateString('de-DE')}</span>
                              </span>
                              {assessment.pain_intensity && (
                                <span className="flex items-center space-x-1">
                                  <AlertCircle size={14} />
                                  <span>Schmerz: {assessment.pain_intensity}/10</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewAssessment(assessment)}
                          className="p-2 text-gray-600 hover:text-blue-600"
                          title="Anzeigen"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleEditAssessment(assessment)}
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

  // Formular für neuen/bearbeiteten Befund
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {activeView === 'new' ? 'Neuer Eingangsbefund' : 
             activeView === 'edit' ? 'Befund bearbeiten' : 'Befund anzeigen'}
          </h1>
          <p className="text-gray-600">Physiotherapeutische Erstbeurteilung</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setActiveView('list')
              resetForm()
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <X size={18} className="inline mr-2" />
            Abbrechen
          </button>
          {activeView !== 'view' && (
            <button
              onClick={handleSaveAssessment}
              disabled={saving || !formData.player_id}
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
          {/* Patient und Datum */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Patient *
              </label>
              <select
                value={formData.player_id}
                onChange={(e) => setFormData({ ...formData, player_id: e.target.value })}
                disabled={activeView === 'view'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                required
              >
                <option value="">Patient auswählen...</option>
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
                Datum der Bewertung *
              </label>
              <input
                type="date"
                value={formData.date_of_assessment}
                onChange={(e) => setFormData({ ...formData, date_of_assessment: e.target.value })}
                disabled={activeView === 'view'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                required
              />
            </div>
          </div>

          {/* Diagnose */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Diagnose *
              </label>
              <input
                type="text"
                value={formData.diagnosis || ''}
                onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                disabled={activeView === 'view'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                placeholder="Hauptdiagnose"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Relevante Nebendiagnose
              </label>
              <input
                type="text"
                value={formData.secondary_diagnosis || ''}
                onChange={(e) => setFormData({ ...formData, secondary_diagnosis: e.target.value })}
                disabled={activeView === 'view'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                placeholder="Nebendiagnose"
              />
            </div>
          </div>

          {/* Medikamente und Freizeitaktivitäten */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Medikamente
              </label>
              <input
                type="text"
                value={formData.medications || ''}
                onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
                disabled={activeView === 'view'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                placeholder="Aktuelle Medikation"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Freizeitaktivitäten
              </label>
              <input
                type="text"
                value={formData.recreational_activities || ''}
                onChange={(e) => setFormData({ ...formData, recreational_activities: e.target.value })}
                disabled={activeView === 'view'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                placeholder="Sportliche und andere Aktivitäten"
              />
            </div>
          </div>

          {/* Sozialanamnese und Tätigkeit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sozialanamnese
              </label>
              <input
                type="text"
                value={formData.social_history || ''}
                onChange={(e) => setFormData({ ...formData, social_history: e.target.value })}
                disabled={activeView === 'view'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                placeholder="Familiäre und soziale Situation"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Aktuelle Tätigkeit
              </label>
              <input
                type="text"
                value={formData.current_occupation || ''}
                onChange={(e) => setFormData({ ...formData, current_occupation: e.target.value })}
                disabled={activeView === 'view'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                placeholder="Beruf/Ausbildung"
              />
            </div>
          </div>

          {/* Aktuelle Beschwerden */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Aktuelle Beschwerden
            </label>
            <textarea
              value={formData.current_complaints || ''}
              onChange={(e) => setFormData({ ...formData, current_complaints: e.target.value })}
              disabled={activeView === 'view'}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
              placeholder="Beschreibung der aktuellen Beschwerden"
            />
          </div>

          {/* Beschwerdeanamnese */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Beschwerdeanamnese</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Wie machen sich die Beschwerden im Alltag bemerkbar?
                </label>
                <textarea
                  value={formData.complaints_in_daily_life || ''}
                  onChange={(e) => setFormData({ ...formData, complaints_in_daily_life: e.target.value })}
                  disabled={activeView === 'view'}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seit wann bestehen die Beschwerden?
                </label>
                <input
                  type="text"
                  value={formData.complaints_since_when || ''}
                  onChange={(e) => setFormData({ ...formData, complaints_since_when: e.target.value })}
                  disabled={activeView === 'view'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Häufigkeit der Beschwerden
                </label>
                <input
                  type="text"
                  value={formData.frequency_of_complaints || ''}
                  onChange={(e) => setFormData({ ...formData, frequency_of_complaints: e.target.value })}
                  disabled={activeView === 'view'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                  placeholder="z.B. täglich, bei Belastung"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Wodurch werden sie ausgelöst?
                </label>
                <input
                  type="text"
                  value={formData.triggered_by || ''}
                  onChange={(e) => setFormData({ ...formData, triggered_by: e.target.value })}
                  disabled={activeView === 'view'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                  placeholder="z.B. gehen, stehen, heben"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Wie lassen sie sich verringern?
                </label>
                <input
                  type="text"
                  value={formData.relieved_by || ''}
                  onChange={(e) => setFormData({ ...formData, relieved_by: e.target.value })}
                  disabled={activeView === 'view'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                  placeholder="z.B. Kälte, Wärme, Ruhe, Medikamente"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bisherige Behandlung
                </label>
                <textarea
                  value={formData.previous_treatments || ''}
                  onChange={(e) => setFormData({ ...formData, previous_treatments: e.target.value })}
                  disabled={activeView === 'view'}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                  placeholder="Wie werden die Beschwerden bisher behandelt?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bisherige Therapien
                </label>
                <textarea
                  value={formData.previous_therapies || ''}
                  onChange={(e) => setFormData({ ...formData, previous_therapies: e.target.value })}
                  disabled={activeView === 'view'}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                  placeholder="Welche Therapien sind bisher erfolgt?"
                />
              </div>
            </div>
          </div>

          {/* Inspektion und Palpation */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Untersuchungsbefunde</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Inspektion
                </label>
                <textarea
                  value={formData.inspection_findings || ''}
                  onChange={(e) => setFormData({ ...formData, inspection_findings: e.target.value })}
                  disabled={activeView === 'view'}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                  placeholder="Sichtbare Befunde"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Palpation
                </label>
                <textarea
                  value={formData.palpation_findings || ''}
                  onChange={(e) => setFormData({ ...formData, palpation_findings: e.target.value })}
                  disabled={activeView === 'view'}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                  placeholder="Tastbare Befunde"
                />
              </div>
            </div>
          </div>

          {/* Schmerzskala */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Schmerzbewertung</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Schmerzstärke (0=kein Schmerz / 10=stärkster vorstellbarer Schmerz)
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={formData.pain_intensity || 0}
                    onChange={(e) => setFormData({ ...formData, pain_intensity: parseInt(e.target.value) })}
                    disabled={activeView === 'view'}
                    className="flex-1"
                  />
                  <span className="text-2xl font-bold text-gray-900 w-8">
                    {formData.pain_intensity || 0}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0</span>
                  <span>5</span>
                  <span>10</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Wie fühlt sich der Schmerz an?
                </label>
                <textarea
                  value={formData.pain_description || ''}
                  onChange={(e) => setFormData({ ...formData, pain_description: e.target.value })}
                  disabled={activeView === 'view'}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                  placeholder="Schmerzqualität (z.B. stechend, dumpf, brennend)"
                />
              </div>
            </div>
          </div>

          {/* Spezifische Befunde */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Spezifische Befunde
            </label>
            <textarea
              value={formData.specific_findings || ''}
              onChange={(e) => setFormData({ ...formData, specific_findings: e.target.value })}
              disabled={activeView === 'view'}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
              placeholder="Zusätzliche spezifische Untersuchungsbefunde"
            />
          </div>

          {/* Therapieziele */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Therapie-/Teilziele
            </label>
            <textarea
              value={formData.therapy_goals || ''}
              onChange={(e) => setFormData({ ...formData, therapy_goals: e.target.value })}
              disabled={activeView === 'view'}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
              placeholder="Behandlungsziele und geplante Maßnahmen"
            />
          </div>
        </div>
      </div>

      {/* Dokumentation (nur bei View/Edit) */}
      {activeView === 'view' && selectedAssessment && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Dokumentation</h3>
              <span className="text-sm text-gray-500">
                {documentationEntries.length} Einträge
              </span>
            </div>
            
            {/* Neuen Eintrag hinzufügen */}
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Datum
                  </label>
                  <input
                    type="date"
                    value={newDocEntry.date}
                    onChange={(e) => setNewDocEntry({ ...newDocEntry, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notizen
                  </label>
                  <input
                    type="text"
                    value={newDocEntry.notes}
                    onChange={(e) => setNewDocEntry({ ...newDocEntry, notes: e.target.value })}
                    placeholder="Behandlungsnotizen hinzufügen"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={handleAddDocumentation}
                  disabled={!newDocEntry.notes.trim()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Hinzufügen
                </button>
              </div>
            </div>
            
            {/* Dokumentationseinträge */}
            <div className="space-y-3">
              {documentationEntries.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  Noch keine Dokumentation vorhanden
                </p>
              ) : (
                documentationEntries.map((entry) => (
                  <div key={entry.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">
                          {new Date(entry.date).toLocaleDateString('de-DE')}
                        </span>
                        <span className="text-xs text-gray-500">
                          {entry.created_at && new Date(entry.created_at).toLocaleString('de-DE')}
                        </span>
                      </div>
                      <p className="text-gray-700 mt-1">{entry.notes}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
