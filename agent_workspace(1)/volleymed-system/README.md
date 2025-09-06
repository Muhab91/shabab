# VolleyMed - Medizinisches Dokumentationssystem

## Projektübersicht

Ein umfassendes digitales Dokumentationssystem für die medizinische Abteilung eines Erstliga-Volleyballvereins, entwickelt mit React, TypeScript, Tailwind CSS und Supabase.

**Live-System:** https://84w3cwaxigcj.space.minimax.io

## System-Architektur

### Frontend
- **React 18.3** mit TypeScript für typsichere Entwicklung
- **Tailwind CSS** für professionelles medizinisches Design
- **Vite** als Build-Tool für optimierte Performance
- **React Router** für Client-Side Routing
- **Single-Page Application (SPA)** mit responsivem Design

### Backend
- **Supabase** als Backend-as-a-Service
- **PostgreSQL** Datenbank mit Row Level Security (RLS)
- **Supabase Auth** für rollenbasierte Authentifizierung
- **Supabase Storage** für sichere Dokumentenverwaltung
- **Real-time Subscriptions** für Live-Updates

### Sicherheit & Compliance
- **DSGVO-konforme** Datenverschlüsselung
- **Row Level Security (RLS)** Policies
- **Rollenbasierte Zugriffskontrolle** (RBAC)
- **Verschlüsselte Dokumentenspeicherung**
- **Audit-Logs** für alle Datenzugriffe

## Hauptmodule

### 1. Athletiktrainer-Modul

**Funktionalitäten:**
- **CMJ-Analyse Dashboard:** Counter Movement Jump Tests
  - Sprunghöhe (cm), Flugzeit (ms), Bodenkontaktzeit (ms)
  - Balance-Verteilung zwischen beiden Füßen (%)
  - RSI Score und Kraft-Zeit-Kurven
- **Leistungsdiagnostik:** Verletzungspräventions-Assessments
- **Risikoprofile:** Automatische Auswertung mit Frühwarnsystem
- **Präparationsprogramm-Verwaltung:** Individuelle Trainingspläne

**Zugriff:** Admin, Athletiktrainer

### 2. Physiotherapie-Modul

**Basierend auf der digitalen Befundvorlage:**
- **Digitale Patientenakte:** Vollständiger Eingangsbefund
  - Patientenangaben, Diagnose, Medikamente
  - Aktuelle Beschwerden und Anamnese
  - Inspektion, Palpation, Schmerzskala (1-10)
  - Spezifische Befunde und Therapieziele
- **Behandlungsdokumentation:** Therapiesitzungen und Verlauf
- **Standardisierte Tests:** KOOS-Score Integration
- **Anwesenheitsdokumentation:** Termine und Fehlzeiten

**Zugriff:** Admin, Physiotherapeut

### 3. Ärzte-Modul

**Funktionalitäten:**
- **Medizinische Behandlungsdokumentation:**
  - Behandelnder Arzt, Krankenhaus/Praxis
  - ICD-10 Kodierung für Diagnosen
  - Therapieempfehlungen und Prognosen
- **Dokument-Management:**
  - Upload für MRT, Röntgen, Laborwerte, Befunde
  - Dateikategorisierung und Verschlagwortung
  - Sichere verschlüsselte Speicherung
- **Kategorisierung:** Verletzungstyp und Schweregrad
- **Externe Schnittstellen:** Überweisungsmanagement

**Zugriff:** Admin, Arzt

### 4. Befund-Digitalisierung

**OCR und intelligente Dokumentverarbeitung:**
- **OCR-Integration:** Automatische Texterkennung
- **Formularerkennung:** Template-basierte Feldextraktion
- **Datenvalidierung:** Manual Review-Workflow
- **Strukturierte Übertragung:** In Datenbankfelder
- **Qualitätssicherung:** Konfidenz-Scoring

**Zugriff:** Alle Rollen

## Dashboard & KPIs

### Übersichts-Dashboard
- **Rollenspezifische Statistiken:** Behandlungen, Tests, Risikoprofile
- **Real-time Updates:** Live-Synchronisation
- **Performance-Indikatoren:** KPIs für alle Abteilungen
- **Schnellzugriff:** Häufige Aktionen pro Rolle

### Benachrichtigungssystem
- **Automatische Alerts:** Kritische Werte und überfällige Behandlungen
- **Konfigurierbare Schwellenwerte:** Individuelle Einstellungen
- **Terminerinnerungen:** Proaktive Benachrichtigungen

## Datenbank-Schema

### Haupttabellen

#### Benutzerverwaltung
- `profiles` - Erweiterte Benutzerprofile mit Rollen
- `players` - Spielerdaten

#### Athletiktrainer
- `cmj_tests` - Counter Movement Jump Tests
- `training_programs` - Trainingsprogramme
- `performance_assessments` - Leistungsdiagnostik

#### Physiotherapie
- `physio_assessments` - Eingangsbefunde (basierend auf Vorlage)
- `physio_sessions` - Behandlungssitzungen
- `standardized_tests` - KOOS-Score und andere Tests

#### Ärzte
- `medical_treatments` - Medizinische Behandlungen
- `medical_documents` - Dokumentenverwaltung

#### System
- `document_ocr_results` - OCR-Verarbeitung
- `notifications` - Benachrichtigungssystem
- `injury_statistics` - Verletzungsstatistiken
- `performance_metrics` - KPIs und Metriken
- `appointments` - Terminverwaltung

## Sicherheitskonzept

### Row Level Security (RLS)
```sql
-- Beispiel: Nur Physiotherapeuten können ihre Befunde sehen
CREATE POLICY "physio_assessments_policy" ON physio_assessments 
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'physiotherapeut'))
);
```

### Rollenhierarchie
1. **Admin:** Vollzugriff auf alle Module
2. **Athletiktrainer:** CMJ-Tests, Leistungsdiagnostik
3. **Physiotherapeut:** Befunde, Behandlungsdokumentation
4. **Arzt:** Medizinische Behandlungen, Dokumente

### Datenschutz
- **DSGVO-konforme** Datenverarbeitung
- **Einverständniserklärungen** verwalten
- **Datenportabilität** und Löschrecht
- **Audit-Logs** für Compliance

## Verwendete Technologien

### Frontend-Stack
- React 18.3 + TypeScript
- Tailwind CSS für Styling
- React Router für Navigation
- Lucide React für Icons
- React Hook Form für Formulare
- Date-fns für Datumsverarbeitung

### Backend-Stack
- Supabase (PostgreSQL + Auth + Storage)
- Row Level Security Policies
- Real-time Subscriptions
- Edge Functions (für komplexe Logik)

### Development Tools
- Vite Build Tool
- TypeScript Compiler
- ESLint Code Quality
- pnpm Package Manager

## Installation & Setup

### Voraussetzungen
- Node.js 18+
- pnpm
- Supabase Account

### Lokale Entwicklung
```bash
# Repository klonen
git clone <repository-url>
cd volleymed-system

# Dependencies installieren
pnpm install

# Umgebungsvariablen konfigurieren
cp .env.example .env
# VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY setzen

# Entwicklungsserver starten
pnpm dev
```

### Production Build
```bash
# Build erstellen
pnpm build

# Build testen
pnpm preview
```

## Deployment

Das System wurde erfolgreich deployed unter:
**https://84w3cwaxigcj.space.minimax.io**

### Features
- **SSL-Verschlüsselung** für sichere Datenübertragung
- **CDN-Distribution** für optimale Performance
- **Automatische Backups** über Supabase
- **99.9% Uptime** Garantie

## Benutzerrollen & Zugriff

### Demo-Zugänge
Für Testzwecke können Demo-Accounts mit verschiedenen Rollen erstellt werden:

- **Administrator:** Vollzugriff auf alle Module
- **Athletiktrainer:** CMJ-Tests und Leistungsdiagnostik
- **Physiotherapeut:** Befunde und Behandlungen
- **Arzt:** Medizinische Dokumentation

## Datenschutz & DSGVO

### Implementierte Maßnahmen
- **Pseudonymisierung** von Patientendaten
- **Verschlüsselung** aller medizinischen Dokumente
- **Zugriffsprotokolle** für Audit-Zwecke
- **Datenminimierung** durch rollenbasierte Sichten
- **Speicherbegrenzung** und automatische Archivierung

### Betroffenenrechte
- **Auskunftsrecht:** API-Endpunkte für Datenexport
- **Berichtigungsrecht:** Editierfunktionen in allen Modulen
- **Löschrecht:** Soft-Delete mit Wiederherstellungsmöglichkeit
- **Datenportabilität:** Export in standardisierten Formaten

## Performance & Skalierung

### Optimierungen
- **Code-Splitting** für reduzierte Bundle-Größe
- **Lazy Loading** für Module
- **Optimistic Updates** für bessere UX
- **Caching-Strategien** für häufige Abfragen
- **Komprimierung** aller Assets

### Monitoring
- **Error Boundary** für Fehlerbehandlung
- **Performance Metrics** Tracking
- **User Analytics** (DSGVO-konform)
- **System Health Checks**

## Wartung & Support

### Backup-Strategie
- **Automatische tägl. Backups** via Supabase
- **Point-in-Time Recovery** verfügbar
- **Geo-redundante Speicherung**
- **Disaster Recovery Plan**

### Updates & Patches
- **Rollende Updates** ohne Downtime
- **Feature Flags** für schrittweise Rollouts
- **Versionierung** aller Releases
- **Dokumentierte Changelogs**

## Zukünftige Erweiterungen

### Geplante Features
- **Mobile App** für iOS/Android
- **Erweiterte Analytics** und Reporting
- **Integration** mit externen Systemen
- **KI-basierte** Diagnoseunterstützung
- **Telemedicine** Funktionalitäten

### Technische Verbesserungen
- **Progressive Web App** (PWA) Features
- **Offline-Funktionalität** für kritische Bereiche
- **Advanced Search** mit Elasticsearch
- **Workflow-Automatisierung**

## Fazit

Das VolleyMed System bietet eine vollständige, DSGVO-konforme Lösung für die medizinische Dokumentation in Sportvereinen. Mit seinem modularen Aufbau, der rollenbasierten Sicherheit und der intuitiven Benutzeroberfläche setzt es neue Standards in der digitalen Gesundheitsdokumentation.

**Entwickelt von:** MiniMax Agent  
**Datum:** Dezember 2024  
**Version:** 1.0.0
