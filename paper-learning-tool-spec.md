# Paper Learning Tool - Technische Spezifikation

## Projektübersicht

Ein lokales React-Webtool für Doktoranden und Forschende, das drei Kernfunktionen vereint:
1. **Paper-Verwaltung** via CSV-Datei als Inbox
2. **Strukturiertes Exzerpieren** mit KI-Unterstützung nach dem Prinzip "erst selbst denken"
3. **Spaced Repetition** auf Wochenbasis mit Fibonacci-Intervallen

### Technologie-Stack
- **Frontend:** React (Vite)
- **Styling:** Tailwind CSS
- **Datenbank:** Lokale JSON-Dateien im `/data`-Ordner
- **KI-Integration:** Anthropic Claude API (Nutzer gibt eigenen API-Key ein)
- **PDF-Verarbeitung:** PDF.js für Textextraktion
- **Start:** `npm run dev` via `.bat`-Datei

---

## Datenstrukturen

### 1. CSV-Import (Inbox)
Datei: `papers-inbox.csv` im Projektordner

```csv
doi,title,added_date
10.1234/example.2024,Example Paper Title,2025-01-09
10.5678/another.2023,Another Important Study,2025-01-08
```

Nutzer pflegt diese Datei manuell oder per Copy-Paste. Das Tool liest sie beim Start ein.

### 2. Paper-Datenbank
Datei: `data/papers.json`

```json
{
  "papers": [
    {
      "id": "uuid-v4",
      "doi": "10.1234/example.2024",
      "title": "Example Paper Title",
      "added_date": "2025-01-09",
      "status": "inbox" | "reading" | "completed",
      "pdf_path": "pdfs/example-2024.pdf",
      
      "excerpt": {
        "main_claims": {
          "user_input": "Nutzer-Text...",
          "ai_suggestion": "KI-Vorschlag...",
          "final": "Finaler übernommener Text..."
        },
        "topics": {
          "user_input": ["topic1", "topic2"],
          "ai_suggestion": ["topic3", "topic4"],
          "final": ["topic1", "topic3"]
        },
        "citability": 7,
        "relevant_projects": ["ExplAIner", "LearningGoalHub"],
        "expiry_years": 5,
        "methodology_sample": "Freitext zur Methodik...",
        "key_concepts": {
          "user_input": ["Concept A"],
          "ai_suggestion": ["Concept B", "Concept C"],
          "final": ["Concept A", "Concept B"]
        },
        "critical_notes": {
          "user_input": "Meine Kritik...",
          "ai_suggestion": "KI-Ergänzung...",
          "final": "Finale Kritik..."
        },
        "completed_date": "2025-01-10",
        "time_spent_minutes": 45
      },
      
      "spaced_repetition": {
        "next_review_date": "2025-01-17",
        "current_interval_weeks": 1,
        "fibonacci_index": 0,
        "review_history": [
          {
            "date": "2025-01-10",
            "recalled_correctly": true
          }
        ],
        "expired": false
      }
    }
  ]
}
```

### 3. Einstellungen
Datei: `data/settings.json`

```json
{
  "anthropic_api_key": "sk-ant-...",
  "session_duration_minutes": 60,
  "projects": ["ExplAIner", "LearningGoalHub", "ExamLens", "Workshopper"],
  "expiry_options": [1, 5, 10, 999]
}
```

---

## Benutzeroberfläche

### Hauptnavigation (Sidebar oder Top-Nav)
- **Dashboard** - Übersicht mit anstehenden Reviews und Statistiken
- **Inbox** - Neue Paper aus CSV importieren
- **Lesen** - Paper exzerpieren (Lernsession)
- **Review** - Spaced Repetition durchführen
- **Suche** - Paper filtern und finden
- **Einstellungen** - API-Key, Projekte verwalten

---

## Feature-Spezifikationen

### Feature 1: Dashboard

**Zweck:** Schneller Überblick beim Start

**Anzeige:**
- Anzahl Paper in Inbox
- Anzahl heute/diese Woche fällige Reviews
- Fortschrittsstatistik (gelesen, aktiv, abgelaufen)
- Quick-Actions: "Review starten", "Paper lesen"

**UI-Komponenten:**
- Stat-Cards mit Icons
- Liste der nächsten 5 fälligen Reviews
- Button "Lernsession starten" (prominent)

---

### Feature 2: Inbox & CSV-Import

**Zweck:** Paper aus CSV-Datei ins System bringen

**Ablauf:**
1. Nutzer klickt "CSV importieren"
2. Datei-Upload-Dialog öffnet sich
3. System parst CSV (doi, title, added_date)
4. Vorschau der zu importierenden Paper
5. Nutzer bestätigt Import
6. Paper werden mit Status "inbox" gespeichert

**Validierung:**
- DOI-Format prüfen (muss mit "10." beginnen)
- Duplikate erkennen (bereits vorhandene DOIs markieren)
- Fehlende Pflichtfelder anzeigen

**UI-Komponenten:**
- Drag-and-Drop-Zone für CSV
- Tabelle mit Vorschau
- Checkbox pro Zeile zum Auswählen
- Import-Button

---

### Feature 3: Paper lesen (Lernsession)

**Zweck:** Strukturiertes Exzerpieren mit Timer und KI-Unterstützung

**Ablauf:**

#### 3.1 Session-Start
1. Nutzer wählt Paper aus Inbox oder "Nächstes Paper"
2. PDF-Upload-Dialog (falls noch nicht hochgeladen)
3. Timer startet (60 Minuten, konfigurierbar)
4. Split-View öffnet sich: Links PDF, rechts Exzerpt-Formular

#### 3.2 PDF-Viewer (linke Seite)
- Eingebetteter PDF-Viewer (PDF.js)
- Zoom, Seitennavigation
- Text-Markierung möglich
- Vollbild-Toggle

#### 3.3 Exzerpt-Formular (rechte Seite)

**Pflichtfelder:**

**a) Hauptaussagen**
- Textarea für Nutzer-Input
- Button "KI-Vorschlag anfordern" (disabled bis Nutzer mindestens 50 Zeichen geschrieben hat)
- KI-Vorschlag erscheint darunter in anderem Stil (grauer Hintergrund)
- Nutzer kann Teile übernehmen via "Übernehmen"-Button oder manuell kopieren
- Finales Textfeld zeigt kombinierten/editierten Text

**b) Themen/Tags**
- Tag-Input (Chips)
- Nach 2+ eigenen Tags: Button "KI-Vorschläge"
- KI schlägt weitere Tags vor
- Nutzer klickt auf Vorschläge zum Übernehmen

**c) Zitierbarkeit**
- Slider 1-10 mit Labels:
  - 1-2: "Müll"
  - 3-4: "Schwach"
  - 5-6: "Okay"
  - 7-8: "Gut"
  - 9-10: "Engel"

**d) Relevante Projekte**
- Checkboxen: ExplAIner, LearningGoalHub, ExamLens, Workshopper
- Mehrfachauswahl möglich

**e) Ablaufdatum**
- Radio-Buttons: 1 Jahr, 5 Jahre, 10 Jahre, Immer relevant

**Optionale Felder (aufklappbar):**

**f) Methodik & Sample**
- Textarea für freie Beschreibung
- Kein KI-Vorschlag (rein beobachtend)

**g) Wichtige Konzepte**
- Wie Themen: erst eigene, dann KI-Vorschläge

**h) Kritische Anmerkungen**
- Textarea für eigene Kritik
- Nach Input: KI-Button für ergänzende kritische Perspektiven

#### 3.4 Timer-Verhalten
- Countdown oben rechts sichtbar
- Bei 10 Minuten Rest: gelbe Warnung
- Bei 5 Minuten Rest: orange Warnung
- Bei 0: Sanfter Hinweis "Zeit ist um" (kein harter Stopp)
- Pause-Button verfügbar
- Zeit wird getrackt und gespeichert

#### 3.5 Speichern
- Auto-Save alle 30 Sekunden (lokaler Draft)
- "Fertig"-Button: Validiert Pflichtfelder, speichert, setzt Status auf "completed"
- Paper geht automatisch in Spaced Repetition (nächste Review: +1 Woche)

---

### Feature 4: Spaced Repetition (Review)

**Zweck:** Gelerntes Paper aktiv abrufen

**Fibonacci-Intervalle (in Wochen):**
- Index 0: 1 Woche
- Index 1: 1 Woche  
- Index 2: 2 Wochen
- Index 3: 3 Wochen
- Index 4: 5 Wochen
- Index 5: 8 Wochen
- Index 6: 13 Wochen
- ...und so weiter

**Review-Ablauf:**

#### 4.1 Review-Queue
- Liste aller heute/überfälligen Reviews
- Sortiert nach Fälligkeit
- "Review starten"-Button

#### 4.2 Review-Karte
1. **Frage-Seite:**
   - Zeigt: Paper-Titel und DOI
   - Frage: "Was waren die Hauptaussagen dieses Papers?"
   - Große Textarea für Antwort
   - Button "Antwort zeigen"

2. **Antwort-Seite:**
   - Zeigt gespeicherte Hauptaussagen (final)
   - Zeigt eigene Antwort zum Vergleich
   - Optional: Weitere Exzerpt-Infos aufklappbar

3. **Selbstbewertung:**
   - "Gewusst" (grün) → Fibonacci-Index +1, nächstes Intervall berechnen
   - "Nicht gewusst" (rot) → Fibonacci-Index reset auf 0, Review in 1 Woche

#### 4.3 Ablauf-Logik
- Wenn `next_review_date` > Paper-Ablaufdatum: Paper wird als "expired" markiert
- Expired Papers erscheinen nicht mehr in Reviews
- Können aber in Suche gefunden werden

---

### Feature 5: Suche & Filter

**Zweck:** Paper nach verschiedenen Kriterien finden

**Filteroptionen:**
- **Freitext:** Durchsucht Titel, Hauptaussagen, Konzepte, Kritik
- **Status:** Inbox / In Bearbeitung / Abgeschlossen / Abgelaufen
- **Themen:** Multi-Select aus allen verwendeten Tags
- **Zitierbarkeit:** Slider-Range (z.B. 7-10)
- **Projekt:** Checkbox-Filter
- **Ablauf:** "Nur noch relevante" / "Alle"
- **Zeitraum:** Hinzugefügt zwischen Datum X und Y

**Ergebnisanzeige:**
- Tabelle mit Spalten: Titel, Zitierbarkeit, Projekte, Status, Nächste Review
- Sortierbar nach jeder Spalte
- Klick öffnet Detail-Ansicht

**Detail-Ansicht:**
- Alle Exzerpt-Daten schön formatiert
- PDF-Viewer eingebettet
- Edit-Button zum Nachbearbeiten
- Review-Historie

---

### Feature 6: KI-Integration

**API-Konfiguration:**
- Nutzer gibt Anthropic API-Key in Einstellungen ein
- Key wird lokal in `settings.json` gespeichert
- Verbindungstest-Button

**KI-Prompts:**

#### Für Hauptaussagen-Vorschlag:
```
Du bist ein wissenschaftlicher Assistent. Der Nutzer hat folgendes Paper gelesen:

Titel: {paper_title}
DOI: {doi}

Der Nutzer hat bereits folgende Hauptaussagen identifiziert:
"{user_main_claims}"

Hier ist der extrahierte Text des Papers:
{pdf_text_excerpt}

Aufgabe: Ergänze oder verfeinere die Hauptaussagen des Nutzers. Formuliere 2-3 prägnante Sätze, die wichtige Punkte hinzufügen könnten, die der Nutzer möglicherweise übersehen hat. Bleibe sachlich und zitierbar.
```

#### Für Themen-Vorschläge:
```
Paper: {paper_title}
Nutzer-Tags: {user_topics}
Paper-Abstract/Text: {pdf_excerpt}

Schlage 3-5 weitere relevante Schlagworte vor, die dieses Paper charakterisieren. Fokussiere auf Methodik, Forschungsfeld und zentrale Konzepte.
```

#### Für Konzept-Vorschläge:
```
Paper: {paper_title}
Nutzer-Konzepte: {user_concepts}
Paper-Text: {pdf_excerpt}

Welche weiteren Schlüsselkonzepte, Theorien oder Frameworks werden in diesem Paper verwendet oder eingeführt? Liste 3-5 Vorschläge.
```

#### Für kritische Perspektiven:
```
Paper: {paper_title}
Nutzer-Kritik: {user_critical_notes}
Paper-Text: {pdf_excerpt}

Der Nutzer hat kritische Anmerkungen gemacht. Ergänze mögliche weitere kritische Perspektiven:
- Methodische Einschränkungen
- Generalisierbarkeit
- Fehlende Perspektiven
- Alternative Interpretationen

Sei konstruktiv-kritisch, nicht destruktiv.
```

**PDF-Text-Extraktion:**
- PDF.js extrahiert Text beim Upload
- Ersten 15.000 Zeichen als Kontext für KI
- Bei längeren Papers: Abstract + Conclusion priorisieren

---

### Feature 7: Einstellungen

**Konfigurierbare Optionen:**
- Anthropic API-Key (mit Maskierung)
- Session-Dauer (Standard: 60 Minuten)
- Projekte verwalten (hinzufügen/entfernen/umbenennen)
- Ablauf-Optionen anpassen
- Daten exportieren (JSON-Backup)
- Daten importieren (JSON-Restore)

---

## Projektstruktur

```
paper-learning-tool/
├── start.bat                 # Startet npm run dev
├── papers-inbox.csv          # Nutzer-gepflegte Inbox
├── data/
│   ├── papers.json           # Paper-Datenbank
│   └── settings.json         # Einstellungen
├── pdfs/                     # Hochgeladene PDFs
├── public/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.jsx
│   │   │   └── Header.jsx
│   │   ├── dashboard/
│   │   │   ├── StatCard.jsx
│   │   │   └── UpcomingReviews.jsx
│   │   ├── inbox/
│   │   │   ├── CsvImport.jsx
│   │   │   └── PaperPreview.jsx
│   │   ├── reading/
│   │   │   ├── PdfViewer.jsx
│   │   │   ├── ExcerptForm.jsx
│   │   │   ├── Timer.jsx
│   │   │   └── AiSuggestion.jsx
│   │   ├── review/
│   │   │   ├── ReviewQueue.jsx
│   │   │   ├── ReviewCard.jsx
│   │   │   └── SelfAssessment.jsx
│   │   ├── search/
│   │   │   ├── FilterPanel.jsx
│   │   │   └── ResultsTable.jsx
│   │   └── settings/
│   │       └── SettingsForm.jsx
│   ├── hooks/
│   │   ├── usePapers.js      # Paper CRUD operations
│   │   ├── useSpacedRepetition.js
│   │   ├── useTimer.js
│   │   └── useAi.js          # Claude API calls
│   ├── utils/
│   │   ├── csv.js            # CSV parsing
│   │   ├── pdf.js            # PDF text extraction
│   │   ├── fibonacci.js      # Interval calculation
│   │   └── storage.js        # Local file operations
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── Inbox.jsx
│   │   ├── Reading.jsx
│   │   ├── Review.jsx
│   │   ├── Search.jsx
│   │   └── Settings.jsx
│   ├── App.jsx
│   └── main.jsx
├── package.json
├── vite.config.js
└── tailwind.config.js
```

---

## Start-Skript

**start.bat:**
```batch
@echo off
cd /d "%~dp0"
echo Starting Paper Learning Tool...
npm run dev
pause
```

---

## Abhängigkeiten (package.json)

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.x",
    "pdfjs-dist": "^4.x",
    "@anthropic-ai/sdk": "^0.x",
    "papaparse": "^5.x",
    "uuid": "^9.x",
    "date-fns": "^3.x"
  },
  "devDependencies": {
    "vite": "^5.x",
    "tailwindcss": "^3.x",
    "autoprefixer": "^10.x",
    "postcss": "^8.x"
  }
}
```

---

## Wichtige UX-Prinzipien

1. **Erst selbst denken:** KI-Buttons sind erst aktiv, wenn Nutzer eigenen Input gegeben hat
2. **Keine Zwangsübernahme:** KI-Vorschläge sind Vorschläge, Nutzer entscheidet immer
3. **Sichtbarer Unterschied:** User-Input und KI-Vorschläge sind visuell klar getrennt
4. **Sanfte Timer:** Zeit informiert, zwingt aber nicht zum Abbruch
5. **Progressiver Disclosure:** Optionale Felder sind eingeklappt, Pflichtfelder prominent
6. **Lokale Daten:** Alles bleibt auf dem Rechner des Nutzers

---

## Farbschema-Vorschlag

- **Primary:** Blau (#3B82F6) - Aktionen, Links
- **Success:** Grün (#10B981) - "Gewusst", Erfolg
- **Warning:** Orange (#F59E0B) - Timer-Warnungen
- **Error:** Rot (#EF4444) - "Nicht gewusst", Fehler
- **AI-Suggestion:** Lila-Hintergrund (#F3E8FF) - KI-Vorschläge
- **User-Input:** Weiß - Nutzer-Eingaben
- **Background:** Sehr helles Grau (#F9FAFB)

---

## Erweiterungsmöglichkeiten (nicht im MVP)

- DOI-Resolver: Automatisch Metadaten von CrossRef holen
- Citation-Export: BibTeX generieren
- Statistik-Dashboard: Lernkurven visualisieren
- Multi-User: Cloud-Sync für verschiedene Geräte
- Browser-Extension: DOI direkt von Paper-Seiten hinzufügen
