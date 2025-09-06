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
  Upload,
  Download,
  AlertCircle,
  Activity,
  Stethoscope
} from 'lucide-react'

type Player = {
  id: string
  first_name: string
  last_name: string
  date_of_birth?: string
  jersey_number?: number
  position?: string
}

type MedicalTreatment = {
  id?: string
  player_id: string
  treatment_date: string
  treating_doctor?: string
  hospital_or_practice?: string
  icd10_code?: string
  diagnosis?: string
  treatment_measures?: string
  therapy_recommendations?: string
  prognosis?: string
  follow_up_date?: string
  treatment_notes?: string
  created_by?: string
  created_at?: string
  updated_at?: string
}

type MedicalDocument = {
  id?: string
  player_id: string
  treatment_id?: string
  document_type: string
  document_name: string
  file_path: string
  upload_date: string
  uploaded_by?: string
  notes?: string
  created_at?: string
}

export default function AerzteModule() {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState<'treatments' | 'documents'>('treatments')
  const [activeView, setActiveView] = useState<'list' | 'new' | 'edit' | 'view'>('list')
  const [selectedTreatment, setSelectedTreatment] = useState<MedicalTreatment | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Echtzeit-Daten
  const { data: players } = useRealtimeData<Player>('players')
  const { data: treatments, setData: setTreatments } = useRealtimeData<MedicalTreatment>('medical_treatments')
  const [documents, setDocuments] = useState<MedicalDocument[]>([])

  // Formular-State
  const [formData, setFormData] = useState<MedicalTreatment>({
    player_id: '',
    treatment_date: new Date().toISOString().split('T')[0],
    treating_doctor: '',
    hospital_or_practice: '',
    icd10_code: '',
    diagnosis: '',
    treatment_measures: '',
    therapy_recommendations: '',
    prognosis: '',
    follow_up_date: '',
    treatment_notes: ''
  })

  // Upload-State
  const [uploadData, setUploadData] = useState({
    player_id: '',
    treatment_id: '',
    document_type: 'radiology',
    document_name: '',
    notes: ''
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Lade Dokumente
  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('medical_documents')
        .select('*')
        .order('upload_date', { ascending: false })

      if (error) throw error
      setDocuments(data || [])
    } catch (error) {
      console.error('Error loading documents:', error)
    }
  }

  const handleSaveTreatment = async () => {
    try {
      setSaving(true)
      
      const dataToSave = {
        ...formData,
        created_by: profile?.id
      }

      let result
      if (activeView === 'edit' && selectedTreatment?.id) {
        result = await supabase
          .from('medical_treatments')
          .update(dataToSave)
          .eq('id', selectedTreatment.id)
          .select()
          .single()
      } else {
        result = await supabase
          .from('medical_treatments')
          .insert([dataToSave])
          .select()
          .single()
      }

      if (result.error) throw result.error
      
      if (activeView === 'edit') {
        setTreatments(prev => prev.map(t => t.id === result.data.id ? result.data : t))
      } else {
        setTreatments(prev => [result.data, ...prev])
      }
      
      setActiveView('list')
      resetForm()
      
    } catch (error) {
      console.error('Error saving treatment:', error)
      alert('Fehler beim Speichern: ' + (error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleFileUpload = async () => {
    if (!selectedFile || !uploadData.player_id) {
      alert('Bitte wählen Sie eine Datei und einen Patienten aus.')
      return
    }

    try {
      setUploading(true)
      
      // Upload file to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${uploadData.player_id}/${Date.now()}.${fileExt}`
      
      const { data: uploadResult, error: uploadError } = await supabase.storage
        .from('medical_documents')
        .upload(fileName, selectedFile)

      if (uploadError) throw uploadError

      // Save document metadata
      const documentData = {
        player_id: uploadData.player_id,
        treatment_id: uploadData.treatment_id || null,
        document_type: uploadData.document_type,
        document_name: uploadData.document_name || selectedFile.name,
        file_path: uploadResult.path,
        upload_date: new Date().toISOString().split('T')[0],
        uploaded_by: profile?.id,
        notes: uploadData.notes
      }

      const { data: docResult, error: docError } = await supabase
        .from('medical_documents')
        .insert([documentData])
        .select()
        .single()

      if (docError) throw docError

      setDocuments(prev => [docResult, ...prev])
      
      // Reset upload form
      setSelectedFile(null)
      setUploadData({
        player_id: '',
        treatment_id: '',
        document_type: 'radiology',
        document_name: '',
        notes: ''
      })
      
      alert('Dokument erfolgreich hochgeladen!')
      
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Fehler beim Hochladen: ' + (error as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const handleDownloadDocument = async (doc: MedicalDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('medical_documents')
        .download(doc.file_path)

      if (error) throw error

      // Create download link
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.document_name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
    } catch (error) {
      console.error('Error downloading file:', error)
      alert('Fehler beim Download: ' + (error as Error).message)
    }
  }

  const resetForm = () => {
    setFormData({
      player_id: '',
      treatment_date: new Date().toISOString().split('T')[0],
      treating_doctor: '',
      hospital_or_practice: '',
      icd10_code: '',
      diagnosis: '',
      treatment_measures: '',
      therapy_recommendations: '',
      prognosis: '',
      follow_up_date: '',
      treatment_notes: ''
    })
    setSelectedTreatment(null)
  }

  const handleEditTreatment = (treatment: MedicalTreatment) => {
    setFormData(treatment)
    setSelectedTreatment(treatment)
    setActiveView('edit')
  }

  const handleViewTreatment = (treatment: MedicalTreatment) => {
    setSelectedTreatment(treatment)
    setActiveView('view')
  }

  const getPlayerName = (playerId: string) => {
    const player = players?.find(p => p.id === playerId)
    return player ? `${player.first_name} ${player.last_name}` : 'Unbekannt'
  }

  const filteredTreatments = treatments?.filter(treatment => {
    if (!searchQuery) return true
    const playerName = getPlayerName(treatment.player_id).toLowerCase()
    return playerName.includes(searchQuery.toLowerCase()) || 
           treatment.diagnosis?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           treatment.icd10_code?.toLowerCase().includes(searchQuery.toLowerCase())
  }) || []

  const filteredDocuments = documents?.filter(doc => {
    if (!searchQuery) return true
    const playerName = getPlayerName(doc.player_id).toLowerCase()
    return playerName.includes(searchQuery.toLowerCase()) || 
           doc.document_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           doc.document_type?.toLowerCase().includes(searchQuery.toLowerCase())
  }) || []

  const getDocumentTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'radiology': 'Radiologie (Röntgen, MRT, CT)',
      'lab_results': 'Laborergebnisse',
      'referral': 'Ü̈berweisung',
      'discharge_summary': 'Entlassungsbericht',
      'therapy_plan': 'Therapieplan',
      'other': 'Sonstiges'
    }
    return types[type] || type
  }

  if (activeView === 'list') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ärzte-Modul</h1>
            <p className="text-gray-600">Medizinische Behandlungen und Dokumentation</p>
          </div>
          <button
            onClick={() => setActiveView('new')}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} />
            <span>Neue {activeTab === 'treatments' ? 'Behandlung' : 'Dokument hochladen'}</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('treatments')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'treatments'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Stethoscope size={18} className="inline mr-2" />
                Behandlungen
              </button>
              <button
                onClick={() => setActiveTab('documents')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'documents'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FileText size={18} className="inline mr-2" />
                Dokumente
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
                  placeholder={activeTab === 'treatments' ? "Patient oder Diagnose suchen..." : "Patient oder Dokument suchen..."}
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

        {/* Content */}
        {activeTab === 'treatments' ? (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="divide-y divide-gray-200">
              {filteredTreatments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Stethoscope size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>Keine Behandlungen gefunden</p>
                  <p className="text-sm">Erstellen Sie eine neue Behandlung mit der Schaltfläche oben.</p>
                </div>
              ) : (
                filteredTreatments.map((treatment) => (
                  <div key={treatment.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                            <User size={20} className="text-red-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {getPlayerName(treatment.player_id)}
                            </h3>
                            <p className="text-gray-600">{treatment.diagnosis}</p>
                            <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                              <span className="flex items-center space-x-1">
                                <Calendar size={14} />
                                <span>{new Date(treatment.treatment_date).toLocaleDateString('de-DE')}</span>
                              </span>
                              {treatment.icd10_code && (
                                <span className="flex items-center space-x-1">
                                  <FileText size={14} />
                                  <span>ICD-10: {treatment.icd10_code}</span>
                                </span>
                              )}
                              {treatment.treating_doctor && (
                                <span className="flex items-center space-x-1">
                                  <Stethoscope size={14} />
                                  <span>Dr. {treatment.treating_doctor}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewTreatment(treatment)}
                          className="p-2 text-gray-600 hover:text-blue-600"
                          title="Anzeigen"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleEditTreatment(treatment)}
                          className="p-2 text-gray-600 hover:text-blue-600"
                          title="Bearbeiten"
                        >
                          <Edit size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          /* Dokumente Tab */
          <div className="space-y-6">
            {/* Upload Bereich */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Neues Dokument hochladen</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Patient *
                  </label>
                  <select
                    value={uploadData.player_id}
                    onChange={(e) => setUploadData({ ...uploadData, player_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Patient auswählen...</option>
                    {players?.map(player => (
                      <option key={player.id} value={player.id}>
                        {player.first_name} {player.last_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Behandlung (optional)
                  </label>
                  <select
                    value={uploadData.treatment_id}
                    onChange={(e) => setUploadData({ ...uploadData, treatment_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Keine Verknüpfung</option>
                    {treatments?.filter(t => t.player_id === uploadData.player_id).map(treatment => (
                      <option key={treatment.id} value={treatment.id}>
                        {treatment.diagnosis} - {new Date(treatment.treatment_date).toLocaleDateString('de-DE')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dokumenttyp *
                  </label>
                  <select
                    value={uploadData.document_type}
                    onChange={(e) => setUploadData({ ...uploadData, document_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="radiology">Radiologie</option>
                    <option value="lab_results">Laborergebnisse</option>
                    <option value="referral">Ü̈berweisung</option>
                    <option value="discharge_summary">Entlassungsbericht</option>
                    <option value="therapy_plan">Therapieplan</option>
                    <option value="other">Sonstiges</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Datei *
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dokumentname (optional)
                  </label>
                  <input
                    type="text"
                    value={uploadData.document_name}
                    onChange={(e) => setUploadData({ ...uploadData, document_name: e.target.value })}
                    placeholder="Wird automatisch aus Dateiname übernommen"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notizen
                  </label>
                  <input
                    type="text"
                    value={uploadData.notes}
                    onChange={(e) => setUploadData({ ...uploadData, notes: e.target.value })}
                    placeholder="Zusätzliche Informationen"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <button
                  onClick={handleFileUpload}
                  disabled={uploading || !selectedFile || !uploadData.player_id}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload size={18} className="inline mr-2" />
                  {uploading ? 'Hochladen...' : 'Dokument hochladen'}
                </button>
              </div>
            </div>

            {/* Dokumente Liste */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="divide-y divide-gray-200">
                {filteredDocuments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>Keine Dokumente gefunden</p>
                  </div>
                ) : (
                  filteredDocuments.map((doc) => (
                    <div key={doc.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                              <FileText size={20} className="text-green-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {doc.document_name}
                              </h3>
                              <p className="text-gray-600">
                                {getPlayerName(doc.player_id)} - {getDocumentTypeLabel(doc.document_type)}
                              </p>
                              <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                                <span className="flex items-center space-x-1">
                                  <Calendar size={14} />
                                  <span>{new Date(doc.upload_date).toLocaleDateString('de-DE')}</span>
                                </span>
                                {doc.notes && (
                                  <span className="flex items-center space-x-1">
                                    <AlertCircle size={14} />
                                    <span>{doc.notes}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleDownloadDocument(doc)}
                            className="p-2 text-gray-600 hover:text-blue-600"
                            title="Herunterladen"
                          >
                            <Download size={18} />
                          </button>
                        </div>
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

  // Behandlungsformular
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {activeView === 'new' ? 'Neue Behandlung' : 
             activeView === 'edit' ? 'Behandlung bearbeiten' : 'Behandlung anzeigen'}
          </h1>
          <p className="text-gray-600">Medizinische Dokumentation</p>
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
              onClick={handleSaveTreatment}
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
                Behandlungsdatum *
              </label>
              <input
                type="date"
                value={formData.treatment_date}
                onChange={(e) => setFormData({ ...formData, treatment_date: e.target.value })}
                disabled={activeView === 'view'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                required
              />
            </div>
          </div>

          {/* Behandelnder Arzt und Einrichtung */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Behandelnder Arzt
              </label>
              <input
                type="text"
                value={formData.treating_doctor || ''}
                onChange={(e) => setFormData({ ...formData, treating_doctor: e.target.value })}
                disabled={activeView === 'view'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                placeholder="Name des behandelnden Arztes"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Krankenhaus/Praxis
              </label>
              <input
                type="text"
                value={formData.hospital_or_practice || ''}
                onChange={(e) => setFormData({ ...formData, hospital_or_practice: e.target.value })}
                disabled={activeView === 'view'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                placeholder="Name der Einrichtung"
              />
            </div>
          </div>

          {/* ICD-10 und Diagnose */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ICD-10 Code
              </label>
              <input
                type="text"
                value={formData.icd10_code || ''}
                onChange={(e) => setFormData({ ...formData, icd10_code: e.target.value })}
                disabled={activeView === 'view'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                placeholder="z.B. M25.3"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Diagnose *
              </label>
              <input
                type="text"
                value={formData.diagnosis || ''}
                onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                disabled={activeView === 'view'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                placeholder="Medizinische Diagnose"
                required
              />
            </div>
          </div>

          {/* Behandlungsmaßnahmen */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Behandlungsmaßnahmen
            </label>
            <textarea
              value={formData.treatment_measures || ''}
              onChange={(e) => setFormData({ ...formData, treatment_measures: e.target.value })}
              disabled={activeView === 'view'}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
              placeholder="Durchgeführte Behandlungen, Medikation, Eingriffe"
            />
          </div>

          {/* Therapieempfehlungen */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Therapieempfehlungen
            </label>
            <textarea
              value={formData.therapy_recommendations || ''}
              onChange={(e) => setFormData({ ...formData, therapy_recommendations: e.target.value })}
              disabled={activeView === 'view'}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
              placeholder="Empfohlene Therapien, Nachbehandlung"
            />
          </div>

          {/* Prognose und Nachtermin */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prognose
              </label>
              <textarea
                value={formData.prognosis || ''}
                onChange={(e) => setFormData({ ...formData, prognosis: e.target.value })}
                disabled={activeView === 'view'}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                placeholder="Heilungsaussichten, erwartete Dauer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nachtermin
              </label>
              <input
                type="date"
                value={formData.follow_up_date || ''}
                onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
                disabled={activeView === 'view'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
              />
            </div>
          </div>

          {/* Behandlungsnotizen */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Behandlungsnotizen
            </label>
            <textarea
              value={formData.treatment_notes || ''}
              onChange={(e) => setFormData({ ...formData, treatment_notes: e.target.value })}
              disabled={activeView === 'view'}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
              placeholder="Zusätzliche Notizen, Besonderheiten"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
