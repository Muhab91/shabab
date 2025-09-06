import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useRealtimeData } from '../hooks/useRealtime'
import {
  Upload,
  FileText,
  Eye,
  Download,
  Trash2,
  Search,
  Filter,
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  Calendar,
  Target,
  Zap,
  Save,
  X
} from 'lucide-react'

type Player = {
  id: string
  first_name: string
  last_name: string
  jersey_number?: number
}

type OCRJob = {
  id?: string
  player_id: string
  document_type: string
  file_path: string
  original_filename: string
  ocr_status: 'pending' | 'processing' | 'completed' | 'failed'
  raw_text?: string
  extracted_data?: any
  confidence_score?: number
  processing_time?: number
  created_by?: string
  created_at?: string
  updated_at?: string
}

type ExtractedData = {
  patient_name?: string
  date?: string
  diagnosis?: string
  pain_level?: number
  mobility_assessment?: string
  therapy_goals?: string
  icd10_codes?: string[]
  medications?: string[]
  recommendations?: string
  lab_values?: any[]
  imaging_findings?: string
  impression?: string
}

export default function BefundDigitalisierungModule() {
  const { profile } = useAuth()
  const [activeView, setActiveView] = useState<'upload' | 'jobs' | 'view'>('upload')
  const [selectedJob, setSelectedJob] = useState<OCRJob | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)

  // Echtzeit-Daten
  const { data: players } = useRealtimeData<Player>('players')
  const [ocrJobs, setOCRJobs] = useState<OCRJob[]>([])

  // Upload-State
  const [uploadData, setUploadData] = useState({
    player_id: '',
    document_type: 'physio_assessment',
    notes: ''
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)

  // Lade OCR Jobs
  useEffect(() => {
    loadOCRJobs()
  }, [])

  const loadOCRJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('ocr_jobs')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setOCRJobs(data || [])
    } catch (error) {
      console.error('Error loading OCR jobs:', error)
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
      const fileName = `ocr/${uploadData.player_id}/${Date.now()}.${fileExt}`
      
      const { data: uploadResult, error: uploadError } = await supabase.storage
        .from('medical_documents')
        .upload(fileName, selectedFile)

      if (uploadError) throw uploadError

      // Create OCR job
      const jobData = {
        player_id: uploadData.player_id,
        document_type: uploadData.document_type,
        file_path: uploadResult.path,
        original_filename: selectedFile.name,
        ocr_status: 'pending',
        created_by: profile?.id
      }

      const { data: jobResult, error: jobError } = await supabase
        .from('ocr_jobs')
        .insert([jobData])
        .select()
        .single()

      if (jobError) throw jobError

      setOCRJobs(prev => [jobResult, ...prev])
      
      // Start OCR processing
      await processOCR(jobResult)
      
      // Reset form
      setSelectedFile(null)
      setUploadData({
        player_id: '',
        document_type: 'physio_assessment',
        notes: ''
      })
      
      alert('Datei erfolgreich hochgeladen und OCR gestartet!')
      setActiveView('jobs')
      
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Fehler beim Hochladen: ' + (error as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const processOCR = async (job: OCRJob) => {
    try {
      setProcessing(true)
      
      // Update status to processing
      await supabase
        .from('ocr_jobs')
        .update({ ocr_status: 'processing' })
        .eq('id', job.id)
      
      setOCRJobs(prev => prev.map(j => j.id === job.id ? { ...j, ocr_status: 'processing' } : j))

      // Call OCR Edge Function
      const { data, error } = await supabase.functions.invoke('ocr-processing', {
        body: {
          file_path: job.file_path,
          document_type: job.document_type,
          player_id: job.player_id
        }
      })

      if (error) throw error

      // Update job with OCR results
      const updateData: Partial<OCRJob> = {
        ocr_status: 'completed' as const,
        raw_text: data.data.raw_text,
        extracted_data: data.data.extracted_data,
        confidence_score: data.data.confidence_score,
        processing_time: data.data.processing_time
      }

      await supabase
        .from('ocr_jobs')
        .update(updateData)
        .eq('id', job.id)
      
      setOCRJobs(prev => prev.map(j => j.id === job.id ? { ...j, ...updateData } : j))
      
    } catch (error) {
      console.error('Error processing OCR:', error)
      
      // Update status to failed
      await supabase
        .from('ocr_jobs')
        .update({ ocr_status: 'failed' })
        .eq('id', job.id)
      
      setOCRJobs(prev => prev.map(j => j.id === job.id ? { ...j, ocr_status: 'failed' } : j))
      
    } finally {
      setProcessing(false)
    }
  }

  const handleRetryOCR = async (job: OCRJob) => {
    await processOCR(job)
  }

  const handleDeleteJob = async (job: OCRJob) => {
    if (!confirm('Möchten Sie diesen Job wirklich löschen?')) return

    try {
      // Delete from database
      const { error } = await supabase
        .from('ocr_jobs')
        .delete()
        .eq('id', job.id)

      if (error) throw error

      // Delete file from storage
      await supabase.storage
        .from('medical_documents')
        .remove([job.file_path])

      setOCRJobs(prev => prev.filter(j => j.id !== job.id))
      
    } catch (error) {
      console.error('Error deleting job:', error)
      alert('Fehler beim Löschen: ' + (error as Error).message)
    }
  }

  const handleDownloadFile = async (job: OCRJob) => {
    try {
      const { data, error } = await supabase.storage
        .from('medical_documents')
        .download(job.file_path)

      if (error) throw error

      // Create download link
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = job.original_filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
    } catch (error) {
      console.error('Error downloading file:', error)
      alert('Fehler beim Download: ' + (error as Error).message)
    }
  }

  const createDocumentFromOCR = async (job: OCRJob) => {
    if (!job.extracted_data) return

    try {
      const extractedData = job.extracted_data as ExtractedData
      
      // Bestimme Ziel-Tabelle basierend auf Dokumenttyp
      if (job.document_type === 'physio_assessment') {
        // Erstelle Physio Assessment
        const assessmentData = {
          player_id: job.player_id,
          date_of_assessment: extractedData.date || new Date().toISOString().split('T')[0],
          diagnosis: extractedData.diagnosis || '',
          pain_intensity: extractedData.pain_level || 0,
          therapy_goals: extractedData.therapy_goals || '',
          mobility_assessment: extractedData.mobility_assessment || '',
          therapist_id: profile?.id
        }

        const { error } = await supabase
          .from('physio_assessments')
          .insert([assessmentData])

        if (error) throw error
        alert('Physiotherapie-Assessment erfolgreich erstellt!')
        
      } else if (job.document_type === 'medical_report') {
        // Erstelle Medical Treatment
        const treatmentData = {
          player_id: job.player_id,
          treatment_date: extractedData.date || new Date().toISOString().split('T')[0],
          diagnosis: extractedData.diagnosis || '',
          icd10_code: extractedData.icd10_codes?.[0] || '',
          treatment_notes: `OCR-Import: ${job.original_filename}`,
          therapy_recommendations: extractedData.recommendations || '',
          created_by: profile?.id
        }

        const { error } = await supabase
          .from('medical_treatments')
          .insert([treatmentData])

        if (error) throw error
        alert('Medizinische Behandlung erfolgreich erstellt!')
      }
      
    } catch (error) {
      console.error('Error creating document:', error)
      alert('Fehler beim Erstellen: ' + (error as Error).message)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0])
    }
  }

  const getPlayerName = (playerId: string) => {
    const player = players?.find(p => p.id === playerId)
    return player ? `${player.first_name} ${player.last_name}` : 'Unbekannt'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} className="text-yellow-500" />
      case 'processing':
        return <Zap size={16} className="text-blue-500 animate-pulse" />
      case 'completed':
        return <CheckCircle size={16} className="text-green-500" />
      case 'failed':
        return <AlertCircle size={16} className="text-red-500" />
      default:
        return <Clock size={16} className="text-gray-500" />
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Wartend',
      processing: 'Verarbeitung',
      completed: 'Abgeschlossen',
      failed: 'Fehlgeschlagen'
    }
    return labels[status] || status
  }

  const getDocumentTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      physio_assessment: 'Physiotherapie-Befund',
      medical_report: 'Medizinischer Bericht',
      lab_results: 'Laborergebnisse',
      radiology: 'Radiologie-Befund',
      other: 'Sonstiges'
    }
    return types[type] || type
  }

  const filteredJobs = ocrJobs.filter(job => {
    const matchesSearch = !searchQuery || 
      getPlayerName(job.player_id).toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.original_filename.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || job.ocr_status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  if (activeView === 'upload') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Befund-Digitalisierung</h1>
            <p className="text-gray-600">OCR-gestützte Dokumentenerkennung und -verarbeitung</p>
          </div>
          <button
            onClick={() => setActiveView('jobs')}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <FileText size={20} />
            <span>OCR-Jobs anzeigen</span>
          </button>
        </div>

        {/* Upload Bereich */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Upload-Formular */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Neues Dokument hochladen</h3>
              
              <div className="grid grid-cols-1 gap-4">
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
                        {player.jersey_number ? `(#${player.jersey_number})` : ''}
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
                    <option value="physio_assessment">Physiotherapie-Befund</option>
                    <option value="medical_report">Medizinischer Bericht</option>
                    <option value="lab_results">Laborergebnisse</option>
                    <option value="radiology">Radiologie-Befund</option>
                    <option value="other">Sonstiges</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notizen (optional)
                  </label>
                  <textarea
                    value={uploadData.notes}
                    onChange={(e) => setUploadData({ ...uploadData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Zusätzliche Informationen zum Dokument"
                  />
                </div>
              </div>
            </div>

            {/* Datei-Upload */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Datei auswählen</h3>
              
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {selectedFile ? (
                  <div className="space-y-2">
                    <FileText size={48} className="mx-auto text-green-500" />
                    <p className="text-sm font-medium text-gray-900">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Entfernen
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload size={48} className="mx-auto text-gray-400" />
                    <p className="text-sm text-gray-600">
                      Datei hier ablegen oder
                    </p>
                    <label className="cursor-pointer">
                      <span className="text-blue-600 hover:text-blue-700 font-medium">
                        Datei auswählen
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      />
                    </label>
                    <p className="text-xs text-gray-500">
                      PDF, JPG, PNG, DOC, DOCX (max. 10MB)
                    </p>
                  </div>
                )}
              </div>
              
              <button
                onClick={handleFileUpload}
                disabled={uploading || !selectedFile || !uploadData.player_id}
                className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <Upload size={20} />
                <span>{uploading ? 'Hochladen und Verarbeiten...' : 'Hochladen und OCR starten'}</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Hinweise */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle size={20} className="text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">OCR-Verarbeitung</h4>
              <p className="text-sm text-blue-700 mt-1">
                Die automatische Texterkennung (OCR) extrahiert strukturierte Daten aus Ihren Dokumenten. 
                Je nach Dokumenttyp werden spezifische Informationen wie Patientendaten, Diagnosen, 
                Schmerzwerte und Therapieziele erkannt.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (activeView === 'view' && selectedJob) {
    const extractedData = selectedJob.extracted_data as ExtractedData
    
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">OCR-Ergebnis</h1>
            <p className="text-gray-600">{selectedJob.original_filename}</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setActiveView('jobs')}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <X size={18} className="inline mr-2" />
              Zurück
            </button>
            {selectedJob.ocr_status === 'completed' && (
              <button
                onClick={() => createDocumentFromOCR(selectedJob)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                <Save size={18} className="inline mr-2" />
                Dokument erstellen
              </button>
            )}
          </div>
        </div>

        {/* Job-Informationen */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Patient
              </label>
              <p className="text-gray-900">{getPlayerName(selectedJob.player_id)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dokumenttyp
              </label>
              <p className="text-gray-900">{getDocumentTypeLabel(selectedJob.document_type)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <div className="flex items-center space-x-2">
                {getStatusIcon(selectedJob.ocr_status)}
                <span className="text-gray-900">{getStatusLabel(selectedJob.ocr_status)}</span>
              </div>
            </div>
          </div>
        </div>

        {selectedJob.ocr_status === 'completed' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Extrahierte Daten */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Extrahierte Daten</h3>
              <div className="space-y-4">
                {extractedData.patient_name && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Patientenname</label>
                    <p className="text-gray-900">{extractedData.patient_name}</p>
                  </div>
                )}
                {extractedData.date && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Datum</label>
                    <p className="text-gray-900">{extractedData.date}</p>
                  </div>
                )}
                {extractedData.diagnosis && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Diagnose</label>
                    <p className="text-gray-900">{extractedData.diagnosis}</p>
                  </div>
                )}
                {extractedData.pain_level && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Schmerzlevel</label>
                    <p className="text-gray-900">{extractedData.pain_level}/10</p>
                  </div>
                )}
                {extractedData.therapy_goals && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Therapieziele</label>
                    <p className="text-gray-900">{extractedData.therapy_goals}</p>
                  </div>
                )}
                {extractedData.icd10_codes && extractedData.icd10_codes.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">ICD-10 Codes</label>
                    <p className="text-gray-900">{extractedData.icd10_codes.join(', ')}</p>
                  </div>
                )}
                {extractedData.medications && extractedData.medications.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Medikamente</label>
                    <p className="text-gray-900">{extractedData.medications.join(', ')}</p>
                  </div>
                )}
              </div>
              
              {selectedJob.confidence_score && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Vertrauenswert</span>
                    <span className="text-sm font-bold text-gray-900">
                      {Math.round((selectedJob.confidence_score || 0) * 100)}%
                    </span>
                  </div>
                  <div className="mt-2 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${(selectedJob.confidence_score || 0) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* Roher Text */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Erkannter Text</h3>
              <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                  {selectedJob.raw_text || 'Kein Text erkannt'}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Jobs Liste
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">OCR-Jobs</h1>
          <p className="text-gray-600">Verarbeitungsstatus und Ergebnisse</p>
        </div>
        <button
          onClick={() => setActiveView('upload')}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Upload size={20} />
          <span>Neues Dokument</span>
        </button>
      </div>

      {/* Filter und Suche */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search size={20} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Patient oder Dateiname suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Alle Status</option>
            <option value="pending">Wartend</option>
            <option value="processing">Verarbeitung</option>
            <option value="completed">Abgeschlossen</option>
            <option value="failed">Fehlgeschlagen</option>
          </select>
        </div>
      </div>

      {/* Jobs Liste */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="divide-y divide-gray-200">
          {filteredJobs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText size={48} className="mx-auto mb-4 text-gray-300" />
              <p>Keine OCR-Jobs gefunden</p>
              <p className="text-sm">Laden Sie ein neues Dokument zur OCR-Verarbeitung hoch.</p>
            </div>
          ) : (
            filteredJobs.map((job) => (
              <div key={job.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <FileText size={20} className="text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {job.original_filename}
                        </h3>
                        <p className="text-gray-600">
                          {getPlayerName(job.player_id)} - {getDocumentTypeLabel(job.document_type)}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                          <span className="flex items-center space-x-1">
                            <Calendar size={14} />
                            <span>{job.created_at && new Date(job.created_at).toLocaleDateString('de-DE')}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            {getStatusIcon(job.ocr_status)}
                            <span>{getStatusLabel(job.ocr_status)}</span>
                          </span>
                          {job.confidence_score && (
                            <span className="flex items-center space-x-1">
                              <Target size={14} />
                              <span>{Math.round((job.confidence_score || 0) * 100)}% Vertrauen</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {job.ocr_status === 'completed' && (
                      <button
                        onClick={() => {
                          setSelectedJob(job)
                          setActiveView('view')
                        }}
                        className="p-2 text-gray-600 hover:text-blue-600"
                        title="Ergebnis anzeigen"
                      >
                        <Eye size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDownloadFile(job)}
                      className="p-2 text-gray-600 hover:text-blue-600"
                      title="Datei herunterladen"
                    >
                      <Download size={18} />
                    </button>
                    {job.ocr_status === 'failed' && (
                      <button
                        onClick={() => handleRetryOCR(job)}
                        className="p-2 text-gray-600 hover:text-green-600"
                        title="OCR wiederholen"
                        disabled={processing}
                      >
                        <Zap size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteJob(job)}
                      className="p-2 text-gray-600 hover:text-red-600"
                      title="Löschen"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
