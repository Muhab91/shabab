// OCR Edge Function für Befund-Digitalisierung
// Verarbeitet hochgeladene Dokumente und extrahiert Text mittels OCR

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'false'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Request Body parsen
    const requestData = await req.json();
    const { file_path, document_type, player_id } = requestData;

    if (!file_path) {
      throw new Error('file_path ist erforderlich');
    }

    // Simulierte OCR-Verarbeitung
    // In einer echten Implementierung würde hier ein OCR-Service aufgerufen
    const ocrResult = await processOCR(file_path, document_type);
    
    // Strukturierte Datenextraktion basierend auf Dokumenttyp
    const extractedData = await extractStructuredData(ocrResult.text, document_type);
    
    // Ergebnis zurückgeben
    const result = {
      success: true,
      file_path,
      raw_text: ocrResult.text,
      confidence_score: ocrResult.confidence,
      extracted_data: extractedData,
      processing_time: ocrResult.processing_time,
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify({ data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('OCR Processing Error:', error);
    
    const errorResponse = {
      error: {
        code: 'OCR_PROCESSING_ERROR',
        message: error.message || 'Fehler bei der OCR-Verarbeitung'
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Simulierte OCR-Verarbeitung
async function processOCR(filePath: string, documentType: string) {
  // Simuliere OCR-Verarbeitung mit verschiedenen Dokumenttypen
  const startTime = Date.now();
  
  // Verzögerung simulieren
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  let simulatedText = '';
  let confidence = 0;
  
  switch (documentType) {
    case 'physio_assessment':
      simulatedText = generatePhysioAssessmentText();
      confidence = 0.92;
      break;
    case 'medical_report':
      simulatedText = generateMedicalReportText();
      confidence = 0.88;
      break;
    case 'lab_results':
      simulatedText = generateLabResultsText();
      confidence = 0.95;
      break;
    case 'radiology':
      simulatedText = generateRadiologyText();
      confidence = 0.85;
      break;
    default:
      simulatedText = generateGenericMedicalText();
      confidence = 0.80;
  }
  
  const processingTime = Date.now() - startTime;
  
  return {
    text: simulatedText,
    confidence,
    processing_time: processingTime
  };
}

// Strukturierte Datenextraktion
async function extractStructuredData(text: string, documentType: string) {
  const data: any = {};
  
  // Basis-Informationen extrahieren
  data.patient_name = extractPatientName(text);
  data.date = extractDate(text);
  data.diagnosis = extractDiagnosis(text);
  
  // Dokumenttyp-spezifische Extraktion
  switch (documentType) {
    case 'physio_assessment':
      data.pain_level = extractPainLevel(text);
      data.mobility_assessment = extractMobilityAssessment(text);
      data.therapy_goals = extractTherapyGoals(text);
      break;
    case 'medical_report':
      data.icd10_codes = extractICD10Codes(text);
      data.medications = extractMedications(text);
      data.recommendations = extractRecommendations(text);
      break;
    case 'lab_results':
      data.lab_values = extractLabValues(text);
      data.reference_ranges = extractReferenceRanges(text);
      break;
    case 'radiology':
      data.imaging_findings = extractImagingFindings(text);
      data.impression = extractRadiologyImpression(text);
      break;
  }
  
  return data;
}

// Text-Extraktions-Funktionen
function extractPatientName(text: string): string {
  const namePatterns = [
    /Name[:\s]*([A-Za-zÄÖÜäöüß\s,]+)(?:\n|Geb)/i,
    /Patient[:\s]*([A-Za-zÄÖÜäöüß\s,]+)(?:\n|,)/i
  ];
  
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  return '';
}

function extractDate(text: string): string {
  const datePatterns = [
    /Datum[:\s]*(\d{1,2}\.\d{1,2}\.\d{4})/i,
    /(\d{1,2}\.\d{1,2}\.\d{4})/g
  ];
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1] || match[0];
    }
  }
  return '';
}

function extractDiagnosis(text: string): string {
  const diagnosisPatterns = [
    /Diagnose[:\s]*([^\n]+)/i,
    /Befund[:\s]*([^\n]+)/i
  ];
  
  for (const pattern of diagnosisPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  return '';
}

function extractPainLevel(text: string): number {
  const painPatterns = [
    /Schmerz[:\s]*(\d+)/i,
    /(\d+)\/10/g,
    /Schmerzstärke[:\s]*(\d+)/i
  ];
  
  for (const pattern of painPatterns) {
    const match = text.match(pattern);
    if (match) {
      return parseInt(match[1]);
    }
  }
  return 0;
}

function extractMobilityAssessment(text: string): string {
  const mobilityPatterns = [
    /Mobilität[:\s]*([^\n]+)/i,
    /Beweglichkeit[:\s]*([^\n]+)/i
  ];
  
  for (const pattern of mobilityPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  return '';
}

function extractTherapyGoals(text: string): string {
  const goalPatterns = [
    /Therapieziele?[:\s]*([^\n]+)/i,
    /Ziele?[:\s]*([^\n]+)/i
  ];
  
  for (const pattern of goalPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  return '';
}

function extractICD10Codes(text: string): string[] {
  const icdPattern = /([A-Z]\d{2}\.\d)/g;
  const matches = text.match(icdPattern);
  return matches || [];
}

function extractMedications(text: string): string[] {
  const medicationPatterns = [
    /Medikation[:\s]*([^\n]+)/i,
    /Medikamente[:\s]*([^\n]+)/i
  ];
  
  for (const pattern of medicationPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].split(',').map(med => med.trim());
    }
  }
  return [];
}

function extractRecommendations(text: string): string {
  const recPatterns = [
    /Empfehlung[:\s]*([^\n]+)/i,
    /Therapieempfehlung[:\s]*([^\n]+)/i
  ];
  
  for (const pattern of recPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  return '';
}

function extractLabValues(text: string): any[] {
  const values = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    // Suche nach Labor-Werten (Name: Wert Einheit)
    const match = line.match(/([A-Za-z\s]+):\s*(\d+[,.]?\d*)\s*([A-Za-z\/]+)?/);
    if (match) {
      values.push({
        parameter: match[1].trim(),
        value: parseFloat(match[2].replace(',', '.')),
        unit: match[3] || ''
      });
    }
  }
  
  return values;
}

function extractReferenceRanges(text: string): any[] {
  const ranges = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    // Suche nach Referenzbereichen
    const match = line.match(/Referenz[:\s]*(\d+[,.]?\d*)\s*-\s*(\d+[,.]?\d*)/);
    if (match) {
      ranges.push({
        min: parseFloat(match[1].replace(',', '.')),
        max: parseFloat(match[2].replace(',', '.'))
      });
    }
  }
  
  return ranges;
}

function extractImagingFindings(text: string): string {
  const findingPatterns = [
    /Befund[:\s]*([^\n]+)/i,
    /Ergebnis[:\s]*([^\n]+)/i
  ];
  
  for (const pattern of findingPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  return '';
}

function extractRadiologyImpression(text: string): string {
  const impressionPatterns = [
    /Beurteilung[:\s]*([^\n]+)/i,
    /Eindruck[:\s]*([^\n]+)/i
  ];
  
  for (const pattern of impressionPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  return '';
}

// Simulierte Texte für verschiedene Dokumenttypen
function generatePhysioAssessmentText(): string {
  return `Eingangsbefund
Datum: ${new Date().toLocaleDateString('de-DE')}
Therapeut: Dr. Müller

Name, Vorname: Mustermann, Max
Geb.-Datum: 15.03.1995

Diagnose: Lumbalgie, akut
Relevante Nebendiagnose: Keine

Medikamente: Ibuprofen 400mg
Freizeitaktivitäten: Volleyball, Laufen

Aktuelle Beschwerden: Schmerzen im unteren Rückenbereich seit 3 Tagen
Schmerzstärke: 6/10
Beschwerden im Alltag: Schmerzen beim Bücken und Heben
Seit wann: 3 Tage
Häufigkeit: Konstant
Ausgelöst durch: Sprungbewegungen beim Volleyball
Linderung durch: Ruhe, Wärme

Inspektion: Schonhaltung erkennbar
Palpation: Verspannung der Lendenmuskulatur

Therapieziele: Schmerzreduktion, Mobilisation, Rückkehr zum Sport`;
}

function generateMedicalReportText(): string {
  return `Ärztlicher Bericht
Datum: ${new Date().toLocaleDateString('de-DE')}
Dr. med. Schmidt

Patient: Mustermann, Max
Geb.: 15.03.1995

Diagnose: Distorsion des Sprunggelenks (S93.4)
ICD-10: S93.4

Befund: Schwellung und Druckschmerz laterales Sprunggelenk
Behandlung: Ruhigstellung, Kryotherapie
Medikation: Ibuprofen 3x400mg täglich

Empfehlung: Physiotherapie nach Abschwellung
Wiederkehr zum Sport: In 2-3 Wochen
Kontrolle: In 1 Woche`;
}

function generateLabResultsText(): string {
  return `Laborbefund
Datum: ${new Date().toLocaleDateString('de-DE')}

Patient: Mustermann, Max

Blutwerte:
Leukozyten: 7.2 /µl (Referenz: 4.0-10.0)
Erythrozyten: 4.8 /µl (Referenz: 4.5-5.9)
Hämoglobin: 14.5 g/dl (Referenz: 14.0-18.0)
Hämatokrit: 42% (Referenz: 42-50)
CRP: 0.8 mg/l (Referenz: <3.0)
BSG: 12 mm/h (Referenz: <20)

Bewertung: Werte im Normbereich`;
}

function generateRadiologyText(): string {
  return `Radiologischer Befund
Datum: ${new Date().toLocaleDateString('de-DE')}
Dr. med. Weber

Patient: Mustermann, Max
Untersuchung: Röntgen Knie rechts

Technik: Röntgen in 2 Ebenen

Befund: 
- Keine Frakturzeichen
- Regelrechte Gelenkstrukturen
- Kein Erguss
- Weichteile unauffällig

Beurteilung: Unauffälliger Befund
Empfehlung: Konservative Therapie`;
}

function generateGenericMedicalText(): string {
  return `Medizinisches Dokument
Datum: ${new Date().toLocaleDateString('de-DE')}

Patient: Mustermann, Max
Geb.: 15.03.1995

Dokumentinhalt wurde durch OCR erkannt.
Für spezifische Extraktion bitte Dokumenttyp angeben.

Allgemeine Informationen wurden erkannt und können
weitere Verarbeitung erfordern.`;
}
