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
        const { documentData, fileName, playerId, documentType } = await req.json();

        if (!documentData || !fileName) {
            throw new Error('Document data and filename are required');
        }

        // Get environment variables
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Supabase configuration missing');
        }

        // Get user from auth header
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            throw new Error('No authorization header');
        }

        const token = authHeader.replace('Bearer ', '');

        // Verify token and get user
        const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': serviceRoleKey
            }
        });

        if (!userResponse.ok) {
            throw new Error('Invalid token');
        }

        const userData = await userResponse.json();
        const userId = userData.id;

        // Extract base64 data
        const base64Data = documentData.split(',')[1];
        const mimeType = documentData.split(';')[0].split(':')[1];

        // Convert base64 to text for OCR processing
        let ocrText = '';
        let extractedFields = [];
        let confidenceScore = 0.0;

        // Simulate OCR processing for different document types
        if (mimeType.includes('image') || mimeType.includes('pdf')) {
            // For demo purposes, we simulate OCR based on document type
            if (documentType === 'Eingangsbefund' || fileName.toLowerCase().includes('befund')) {
                // Simulate physiotherapy assessment form OCR
                ocrText = `Eingangsbefund\n\nName, Vorname: [Erkannt aus Formular]\nGeb.-Datum: [Datum erkannt]\n\nDiagnose: [Medizinische Diagnose]\nRelevante Nebendiagnose: [Weitere Diagnosen]\n\nMedikamente: [Medikamentenliste]\nFreizeitaktivitäten: [Sportarten und Aktivitäten]\n\nSozialanamnese: [Soziales Umfeld]\nAktuelle Tätigkeit: [Beruf/Ausbildung]\n\nAktuelle Beschwerden: [Beschwerdeschilderung]\nWie und wobei machen sich die Beschwerden im Alltag bemerkbar: [Alltagsauswirkungen]\nSeit wann bestehen die Beschwerden: [Zeitraum]\nWie häufig treten sie zurzeit auf: [Häufigkeit]\nWodurch werden sie ausgelöst: [Auslöser]\nWie lassen sie sich verringern: [Linderungsmaßnahmen]\n\nSchmerzstärke: [Zahl 0-10]\nWie fühlt sich der Schmerz an: [Schmerzcharakteristik]\n\nInspektion: [Sichtbefund]\nPalpation: [Tastbefund]\n\nSpezifische Befunde: [Testresultate]\nTherapie-/Teilziele: [Behandlungsziele]`;
                
                extractedFields = [
                    { field_name: 'patient_name', value: '[Aus Dokument extrahiert]', confidence: 0.92 },
                    { field_name: 'birth_date', value: '[Geburtsdatum]', confidence: 0.88 },
                    { field_name: 'diagnosis', value: '[Hauptdiagnose]', confidence: 0.85 },
                    { field_name: 'medications', value: '[Medikamentenliste]', confidence: 0.90 },
                    { field_name: 'pain_intensity', value: '[0-10]', confidence: 0.95 },
                    { field_name: 'current_complaints', value: '[Beschwerdebeschreibung]', confidence: 0.87 },
                    { field_name: 'therapy_goals', value: '[Therapieziele]', confidence: 0.83 }
                ];
                confidenceScore = 0.88;
            } else if (documentType === 'MRT' || documentType === 'Röntgen') {
                // Simulate medical imaging report OCR
                ocrText = `Bildgebungsbefund\n\nPatient: [Patientenname]\nUntersuchung: ${documentType}\nDatum: [Untersuchungsdatum]\n\nBefund:\n[Detaillierte medizinische Beschreibung der Bildgebung]\n\nBeurteilung:\n[Ärztliche Bewertung der Befunde]\n\nEmpfehlung:\n[Weitere Maßnahmen]`;
                
                extractedFields = [
                    { field_name: 'patient_name', value: '[Patientenname]', confidence: 0.94 },
                    { field_name: 'examination_date', value: '[Untersuchungsdatum]', confidence: 0.91 },
                    { field_name: 'examination_type', value: documentType, confidence: 0.98 },
                    { field_name: 'findings', value: '[Medizinische Befunde]', confidence: 0.82 },
                    { field_name: 'assessment', value: '[Ärztliche Beurteilung]', confidence: 0.85 }
                ];
                confidenceScore = 0.90;
            } else {
                // Generic document OCR
                ocrText = `Medizinisches Dokument\n\n[Erkannter Text aus dem ${documentType} Dokument]\n\nDatum: [Dokumentdatum]\nPatient: [Patientenangaben]\nInhalt: [Dokumentinhalt]`;
                
                extractedFields = [
                    { field_name: 'document_date', value: '[Dokumentdatum]', confidence: 0.89 },
                    { field_name: 'patient_info', value: '[Patientenangaben]', confidence: 0.86 },
                    { field_name: 'document_content', value: '[Hauptinhalt]', confidence: 0.80 }
                ];
                confidenceScore = 0.85;
            }
        } else {
            throw new Error('Unsupported file type for OCR processing');
        }

        // Save OCR result to database
        const ocrResultData = {
            original_file_name: fileName,
            ocr_text: ocrText,
            confidence_score: confidenceScore,
            extracted_fields: extractedFields,
            validation_status: 'pending',
            processed_by: userId
        };

        const insertResponse = await fetch(`${supabaseUrl}/rest/v1/document_ocr_results`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(ocrResultData)
        });

        if (!insertResponse.ok) {
            const errorText = await insertResponse.text();
            throw new Error(`Database insert failed: ${errorText}`);
        }

        const ocrResult = await insertResponse.json();

        return new Response(JSON.stringify({
            data: {
                ocrResultId: ocrResult[0].id,
                ocrText: ocrText,
                extractedFields: extractedFields,
                confidenceScore: confidenceScore,
                validationStatus: 'pending',
                processedAt: new Date().toISOString()
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('OCR processing error:', error);

        const errorResponse = {
            error: {
                code: 'OCR_PROCESSING_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});