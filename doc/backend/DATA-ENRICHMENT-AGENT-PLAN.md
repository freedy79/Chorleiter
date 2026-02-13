# Data Enrichment Agent - Implementierungsplan

## Übersicht
Automatisierter Agent zur Datenqualitätssicherung und -anreicherung für Chorleiter-Datenbank.

**Erstellt**: 13. Februar 2026  
**Status**: Planung  
**Budget**: ~20-30 EUR/Monat  

---

## 🎯 Ziele

1. **Metadaten-Vervollständigung**: Fehlende Daten bei Stücken ergänzen (Opus, Voicing, Key, etc.)
2. **Komponisten-Daten**: Lebensdaten, vollständige Namen
3. **Dubletten-Erkennung**: Komponisten/Verlage mit ähnlichen Namen zusammenführen
4. **Verlags-Informationen**: Erweiterte Metadaten zu Verlagen
5. **Datenqualität**: Konsistenz und Genauigkeit sichern

---

## 🏗️ Architektur

### Komponenten

```
┌─────────────────────────────────────────────────────────┐
│                   Chorleiter Backend                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Data Enrichment Scheduler                 │  │
│  │  (node-cron, täglich 02:00 Uhr)                  │  │
│  └──────────────────────────────────────────────────┘  │
│                        ↓                                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Enrichment Job Queue                      │  │
│  │  - Priorisierung (neue Einträge first)           │  │
│  │  - Batch Processing (10 Stücke/Request)          │  │
│  │  - Rate Limiting & Budget Tracking               │  │
│  └──────────────────────────────────────────────────┘  │
│                        ↓                                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Data Source Adapters                      │  │
│  │  ┌────────────┬────────────┬───────────────┐    │  │
│  │  │ IMSLP API  │ Wikidata   │ MusicBrainz   │    │  │
│  │  └────────────┴────────────┴───────────────┘    │  │
│  └──────────────────────────────────────────────────┘  │
│                        ↓                                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │         LLM Service (Claude 3.5 Sonnet)          │  │
│  │  - Daten-Validierung                             │  │
│  │  - Fuzzy Matching für Edge Cases                 │  │
│  │  - Metadaten-Extraktion aus Freitext             │  │
│  └──────────────────────────────────────────────────┘  │
│                        ↓                                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Suggestion Storage & Approval            │  │
│  │  - data_enrichment_suggestions                   │  │
│  │  - data_enrichment_jobs                          │  │
│  │  - Admin Review Interface                        │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Datenbank-Schema

### Neue Tabellen

#### `data_enrichment_jobs`
```sql
CREATE TABLE data_enrichment_jobs (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    jobType ENUM('composer', 'piece', 'publisher', 'duplicate_check') NOT NULL,
    status ENUM('pending', 'running', 'completed', 'failed', 'paused') DEFAULT 'pending',
    totalItems INTEGER,
    processedItems INTEGER DEFAULT 0,
    successCount INTEGER DEFAULT 0,
    errorCount INTEGER DEFAULT 0,
    apiCosts DECIMAL(10,4) DEFAULT 0,  -- in EUR
    startedAt DATETIME,
    completedAt DATETIME,
    errorMessage TEXT,
    config JSON,  -- Job-spezifische Konfiguration
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### `data_enrichment_suggestions`
```sql
CREATE TABLE data_enrichment_suggestions (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    jobId INTEGER,
    entityType ENUM('composer', 'piece', 'publisher') NOT NULL,
    entityId INTEGER NOT NULL,
    suggestionType ENUM('metadata', 'duplicate_merge', 'correction') NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'auto_applied') DEFAULT 'pending',
    
    -- Original vs. Vorgeschlagene Daten
    originalData JSON NOT NULL,
    suggestedData JSON NOT NULL,
    changes JSON,  -- Diff-Array für UI
    
    -- Metadaten zur Entscheidung
    confidence DECIMAL(3,2),  -- 0.00 - 1.00
    sources JSON,  -- Array von URLs/References
    reasoning TEXT,  -- LLM Begründung
    
    -- Review-Daten
    reviewedBy INTEGER,  -- user.id
    reviewedAt DATETIME,
    reviewNotes TEXT,
    
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (jobId) REFERENCES data_enrichment_jobs(id) ON DELETE SET NULL,
    FOREIGN KEY (reviewedBy) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_entity (entityType, entityId)
);
```

#### `data_enrichment_settings`
```sql
CREATE TABLE data_enrichment_settings (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    settingKey VARCHAR(100) UNIQUE NOT NULL,
    settingValue JSON NOT NULL,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Beispiel-Settings
INSERT INTO data_enrichment_settings (settingKey, settingValue) VALUES
('schedule', '{"cron": "0 2 * * *", "enabled": true}'),
('budget', '{"monthlyLimit": 25.00, "currentMonth": 0.00}'),
('llm_config', '{"provider": "claude", "model": "claude-3-5-sonnet-20241022", "apiKey": "..."}'),
('sources', '{"enabled": ["imslp", "wikidata", "musicbrainz"], "priority": ["imslp", "musicbrainz", "wikidata"]}'),
('auto_approve', '{"enabled": false, "minConfidence": 0.95}');
```

#### Erweiterung `composer` Model
```sql
ALTER TABLE composers ADD COLUMN 
    imslpId VARCHAR(100),
    wikidataId VARCHAR(50),
    musicbrainzId VARCHAR(100),
    lastEnrichedAt DATETIME,
    enrichmentStatus ENUM('pending', 'complete', 'manual_review') DEFAULT 'pending';
```

#### Erweiterung `piece` Model
```sql
ALTER TABLE pieces ADD COLUMN 
    imslpWorkId VARCHAR(100),
    lastEnrichedAt DATETIME,
    enrichmentStatus ENUM('pending', 'complete', 'manual_review') DEFAULT 'pending',
    dataQualityScore DECIMAL(3,2);  -- 0.00 - 1.00 basierend auf Vollständigkeit
```

#### Erweiterung `publisher` Model
```sql
ALTER TABLE publishers ADD COLUMN 
    website VARCHAR(255),
    country VARCHAR(100),
    foundedYear INTEGER,
    musicbrainzId VARCHAR(100),
    lastEnrichedAt DATETIME;
```

---

## 🔌 API-Integration

### Multi-Provider-Support ⭐

**Siehe detaillierte Analyse**: [DATA-ENRICHMENT-LLM-PROVIDERS.md](DATA-ENRICHMENT-LLM-PROVIDERS.md)

#### Unterstützte LLM-Provider

| Provider | Modell | Kosten/Stück | Qualität | Empfehlung |
|----------|--------|--------------|----------|------------|
| **Google Gemini** | 1.5 Flash | $0.000035 | ⭐⭐⭐⭐ | **Primär** 🏆 |
| **OpenAI** | GPT-4o-mini | $0.000071 | ⭐⭐⭐⭐ | Fallback 1 |
| **DeepSeek** | DeepSeek-V3 | $0.000044 | ⭐⭐⭐⭐ | Alternative |
| **Anthropic** | Claude 3.5 Haiku | $0.000444 | ⭐⭐⭐⭐ | Fallback 2 |
| **Anthropic** | Claude 3.5 Sonnet | $0.001667 | ⭐⭐⭐⭐⭐ | Komplexe Fälle |

#### Kosten für Chorleiter-DB (2024 Stücke)

**Initiales Enrichment** (einmalig):
- Mit Gemini Flash: **$0.05** (4 Cent) ✅
- Mit Claude Sonnet: **$2.03** (1.70 EUR)

**Monatliche Updates** (100 neue Stücke):
- Mit Gemini Flash: **$0.004/Monat** (< 1 Cent/Monat!) ✅
- Jährliche Kosten: **< 2 EUR**

**📌 Ergebnis**: Budget von 20-30 EUR ist **massiv überdimensioniert** für diese Datenmenge!

#### Empfohlene Strategie: Dual-Provider

```
┌─────────────────────────────────────────┐
│  Primary: Google Gemini 1.5 Flash      │
│  - Schnell, günstig, gute Qualität     │
│  - 95% der Fälle                       │
│  - Kosten: ~$0.004/Monat               │
└─────────────────────────────────────────┘
              ↓ (bei confidence < 0.7)
┌─────────────────────────────────────────┐
│  Fallback: Claude 3.5 Sonnet           │
│  - Höchste Qualität für schwere Fälle  │
│  - 5% der Fälle                        │
│  - Zusätzliche Kosten: ~$0.01/Monat    │
└─────────────────────────────────────────┘

Gesamt: < 2 Cent/Monat = ~0.20 EUR/Jahr
```

**Beispiel-Prompt für Stück-Enrichment**:
```
Analyze this choral piece and provide missing metadata:

Title: "Jesu, meine Freude"
Composer: Bach, Johann Sebastian
Current Data: {
  "voicing": null,
  "key": null,
  "opus": null,
  "durationSec": null
}

Return ONLY valid JSON with verified data:
{
  "voicing": "SSATB",
  "key": "E minor",
  "opus": "BWV 227",
  "durationSec": 1200,
  "sources": ["https://imslp.org/wiki/Jesu,_meine_Freude,_BWV_227_(Bach,_Johann_Sebastian)"],
  "confidence": 0.98
}
```

### Externe Datenquellen (kostenlos)

#### 1. IMSLP (Petrucci Music Library)
- **URL**: `https://imslp.org/wiki/Special:IMSLPData`
- **Daten**: Komponisten, Werke, Besetzung, IMSLP-IDs
- **Rate Limit**: Respektvoll (max 1 req/sec)
- **Beispiel-Abfrage**: 
  ```
  https://imllm-provider.interface.js      # Base interface für alle Provider
│   │   ├── llm-router.service.js          # Multi-Provider-Routing & Strategie
│   │   ├── providers/
│   │   │   ├── gemini-provider.service.js     # Google Gemini (primär)
│   │   │   ├── claude-provider.service.js     # Anthropic Claude (fallback)
│   │   │   ├── openai-provider.service.js     # OpenAI GPT (optional)
│   │   │   └── deepseek-provider.service.js   # DeepSeek (optional)
│   │   ├── prompt-templates.js            # Gemeinsame Prompt-Templates
│   │   └── response-validator.service.js  # JSON-Validieru

#### 2. Wikidata SPARQL
- **Endpoint**: `https://query.wikidata.org/sparql`
- **Daten**: Komponisten (Geburt/Tod, Nationalität), Verlage
- **Beispiel-Query**:
  ```sparql
  SELECT ?composer ?composerLabel ?birth ?death WHERE {
    ?composer wdt:P31 wd:Q5;           # instance of Human
              wdt:P106 wd:Q36834;       # occupation: Composer
              rdfs:label "Johann Sebastian Bach"@en.
    OPTIONAL { ?composer wdt:P569 ?birth }
    OPTIONAL { ?composer wdt:P570 ?death }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "de,en". }
  }
  ```

#### 3. MusicBrainz API
- **URL**: `https://musicbrainz.org/ws/2/`
- **Daten**: Komponisten, Werke, Verlage, Recordings
- **Rate Limit**: 1 req/sec (kann mit API-Key erhöht werden)
- **Beispiel**: 
  ```
  https://musicbrainz.org/ws/2/artist/?query=Bach%20Johann%20Sebastian&fmt=json
  ```

---

## ⚙️ Implementation Details

### Services-Struktur

```
choir-app-backend/src/services/
├── enrichment/
│   ├── enrichment-scheduler.service.js    # Cron-Job Management
│   ├── enrichment-queue.service.js        # Job Queue + Batching
│   ├── enrichment-processor.service.js    # Haupt-Logik
│   ├── llm/
│   │   ├── claude-client.service.js       # Claude API Wrapper
│   │   └── prompt-templates.js            # Prompt Engineering
│   ├── sources/
│   │   ├── imslp-adapter.service.js       # IMSLP Integration
│   │   ├── wikidata-adapter.service.js    # Wikidata SPARQL
│   │   └── musicbrainz-adapter.service.js # MusicBrainz API
│   ├── analyzers/
│   │   ├── composer-analyzer.service.js   # Komponisten-Enrichment
│   │   ├── piece-analyzer.service.js      # Stück-Enrichment
│   │   ├── publisher-analyzer.service.js  # Verlags-Enrichment
│   │   └── duplicate-detector.service.js  # Dubletten-Erkennung
│   └── suggestion-manager.service.js      # Vorschläge speichern/laden
```

### Controllers

```
choir-app-backend/src/controllers/
└── admin/
    └── data-enrichment.controller.js      # Admin-Endpoints
```

### Routes

```javascript
// choir-app-backend/src/routes/admin.routes.js

// GET /api/admin/enrichment/jobs - Liste aller Jobs
// POST /api/admin/enrichment/jobs - Neuen Job starten
// GET /api/admin/enrichment/jobs/:id - Job-Details
// DELETE /api/admin/enrichment/jobs/:id - Job abbrechen

// GET /api/admin/enrichment/suggestions - Vorschläge (filter by status/type)
// GET /api/admin/enrichment/suggestions/:id - Einzelner Vorschlag
// PUT /api/admin/enrichment/suggestions/:id/approve - Vorschlag annehmen
// PUT /api/admin/enrichment/suggestions/:id/reject - Vorschlag ablehnen
// PUT /api/admin/enrichment/suggestions/bulk-approve - Mehrere annehmen

// GET /api/admin/enrichment/settings - Einstellungen lesen
// PUT /api/admin/enrichment/settings - Einstellungen ändern

// GET /api/admin/enrichment/stats - Statistiken (Kosten, Erfolgsrate, etc.)
```

---

## 🔄 Workflows

### 1. Nächtlicher Enrichment-Job

```javascript
// Pseudo-Code
async function runNightlyEnrichment() {
    const job = await createJob({
        jobType: 'piece',
        config: {
            prioritizeNew: true,
            maxItems: 200,  // Budget-limitiert
            onlyMissing: true
        }
    });
    
    // 1. Finde Stücke mit fehlenden Daten
    const pieces = await findPiecesNeedingEnrichment({
        limit: 200,
        orderBy: 'createdAt DESC'  // Neueste zuerst
    });
    
    // 2. Batchweise verarbeiten (10 Stücke/Batch)
    const batches = chunk(pieces, 10);
    
    for (const batch of batches) {
        // 3. Für jeden Batch: Komponisten-Daten laden
        const enrichedBatch = await enrichComposerData(batch);
        
        // 4. Datenquellen abfragen (parallel)
        const imslpData = await imslpAdapter.searchBatch(enrichedBatch);
        const wikidataData = await wikidataAdapter.searchBatch(enrichedBatch);
        
        // 5. LLM-Anfrage (konsolidiert fehlende Daten)
        const llmSuggestions = await claudeClient.enrichMetadata({
            pieces: enrichedBatch,
            externalData: { imslp: imslpData, wikidata: wikidataData }
        });
        
        // 6. Vorschläge speichern
        for (const suggestion of llmSuggestions) {
            await saveSuggestion({
                jobId: job.id,
                entityType: 'piece',
                entityId: suggestion.pieceId,
                originalData: pieces.find(p => p.id === suggestion.pieceId),
                suggestedData: suggestion.enrichedData,
                confidence: suggestion.confidence,
                sources: suggestion.sources,
                reasoning: suggestion.reasoning
            });
        }
        
        // 7. Budget-Check
        const currentCosts = await calculateJobCosts(job.id);
        if (currentCosts > MONTHLY_BUDGET_LIMIT) {
            await pauseJob(job.id, 'Budget limit reached');
            break;
        }
    }
    
    await completeJob(job.id);
}
```

### 2. Dubletten-Erkennung

```javascript
async function detectDuplicates(entityType) {
    const Model = entityType === 'composer' ? db.composer : db.publisher;
    const allEntities = await Model.findAll();
    
    const duplicateGroups = [];
    
    // Lokale Fuzzy-Matching (ohne API-Kosten)
    for (let i = 0; i < allEntities.length; i++) {
        for (let j = i + 1; j < allEntities.length; j++) {
            const a = allEntities[i];
            const b = allEntities[j];
            
            // Bestehende isDuplicate() Funktion
            if (isDuplicate(a.name, b.name)) {
                duplicateGroups.push([a, b]);
            }
        }
    }
    
    // Für schwierige Fälle: LLM-Validierung
    for (const [a, b] of duplicateGroups) {
        const llmConfirmation = await claudeClient.verifyDuplicate({
            entity1: a,
            entity2: b,
            entityType
        });
        
        if (llmConfirmation.isDuplicate) {
            await saveSuggestion({
                entityType,
                entityId: a.id,
                suggestionType: 'duplicate_merge',
                suggestedData: {
                    mergeWith: b.id,
                    keepName: llmConfirmation.preferredName,
                    mergeStrategy: llmConfirmation.strategy
                },
                confidence: llmConfirmation.confidence,
                reasoning: llmConfirmation.reasoning
            });
        }
    }
}
```

### 3. Admin Review Workflow

```
1. Admin öffnet /admin/data-enrichment
   ↓
2. Dashboard zeigt:
   - 42 offene Vorschläge
   - Gruppiert nach Typ (Metadata: 30, Duplicates: 12)
   ↓
3. Admin wählt "Metadata Suggestions"
   ↓
4. Liste mit Side-by-Side Ansicht:
   ┌─────────────────────────────────────────┐
   │ Stück: "Jesu, meine Freude"            │
   │ Komponist: Bach, Johann Sebastian      │
   ├─────────────────┬───────────────────────┤
   │ Aktuell         │ Vorgeschlagen         │
   ├─────────────────┼───────────────────────┤
   │ Opus: -         │ BWV 227 (98%)        │
   │ Voicing: -      │ SSATB (95%)          │
   │ Key: -          │ E minor (92%)        │
   ├─────────────────┴───────────────────────┤
   │ Quellen:                                │
   │ • imslp.org/wiki/...                   │
   │ • wikidata.org/...                     │
   ├─────────────────────────────────────────┤
   │ [✓ Annehmen] [✗ Ablehnen] [Details]   │
   └─────────────────────────────────────────┘
   ↓
5. Admin klickt "Annehmen"
   ↓
6. Backend aktualisiert piece-Datensatz
   ↓
7. Suggestion wird als für 2024 Stücke)

**Szenario A: Google Gemini 1.5 Flash (EMPFOHLEN) 🏆**
```
Initiales Enrichment (1,215 fehlende Metadaten):
- 122 Batches à 10 Stücke
- Input: 122 × 1,500 tokens = 183,000 tokens
- Output: 122 × 800 tokens = 97,600 tokens
- Kosten: (183k × $0.075 + 97.6k × $0.30) / 1M = $0.043
         = 4 Cent für komplette Datenbank! ✅

Monatliche Updates (100 neue/geänderte Stücke):
- Kosten: $0.004/Monat
- Jährliche Kosten: $0.048 (4 Cent/Jahr!)

→ Budget-Impact: < 0.2% von 20 EUR Budget
```

**Szenario B: Dual-Provider (Gemini + Claude Fallback)**
```
95% Gemini Flash + 5% Claude Sonnet für schwierige Fälle:
- Monatlich: $0.004 + $0.008 = $0.012/Monat
- Jährlich: $0.144 (12 Cent/Jahr)

→ Budget-Impact: < 1% von 20 EUR Budget
```

**Szenario C: OpenAI GPT-4o-mini (Alternative)**
```
Initiales Enrichment:
- Kosten: $0.086 (7 Cent)

Monatliche Updates:
- Kosten: $0.007/Monat
- Jährlich: $0.084 (7 Cent/Jahr)

→ Budget-Impact: < 0.5% von 20 EUR Budget
```

**📌 Fazit**: Mit modernen, günstigen LLMs ist das Budget von 20-30 EUR für **2024 Stücke massiv überdimensioniert**. Realistischer Bedarf: **< 2 EUR/Jahr**!

**Alternativer Budget-Einsatz**:
- Komponisten-Daten für alle ~500 Komponisten: +$0.10
- Publisher-Informationen für ~100 Verlage: +$0.05
- Quartalsweiser Dubletten-Check: +$0.80/Jahr
- **Gesamt: ~2 EUR/Jahr** (10% des Budgets!)

→ Restbudget kann für **Premium-Features** genutzt werden:
  - Detaillierte Werkanalysen
  - Automatische Setlist-Vorschläge
  - Thematische Katalogisierung
  - Schwierigkeitsgrad-Einschätzung
- Komponisten-Daten nur 1x pro Komponist laden
- IMSLP/Wikidata-Daten cachen (24h)
- LLM nur für tatsächlich fehlende Daten

Einsparung: ~40-50%
→ Bei 20 EUR Budget: ~18,000-20,000 Anfragen/Monat
```

### Rate Limiting

```javascript
// enrichment-queue.service.js
const RATE_LIMITS = {
    claude: {
        requestsPerMinute: 50,  // Claude API Limit
        tokensPerMinute: 100000
    },
    imslp: {
        requestsPerSecond: 1  // Be respectful
    },
    musicbrainz: {
        requestsPerSecond: 1
    }
};
```

### Budget-Tracking

```javascript
// Monatliches Budget überwachen
async function checkBudget() {
    const currentMonth = new Date().getMonth();
    const settings = await getSettings('budget');
    
    if (settings.currentMonth !== currentMonth) {
        // Neuer Monat: Reset
        await updateSettings('budget', {
            monthlyLimit: settings.monthlyLimit,
            currentMonth: currentMonth,
            spent: 0
        });
    }
    
    const { spent, monthlyLimit } = settings;
    
    if (spent >= monthlyLimit * 0.9) {
        // 90% erreicht: Warnung
        await notifyAdmin('Budget warning: 90% used');
    }
    
    if (spent >= monthlyLimit) {
        // Limit erreicht: Jobs pausieren
        await pauseAllJobs();
        await notifyAdmin('Budget limit reached. Jobs paused.');
        return false;
    }
    
    return true;
}
```

---

## 🎨 Frontend: Admin-Interface

### Neue Components

```
choir-app-frontend/src/app/features/admin/
└── data-enrichment/
    ├── data-enrichment.component.ts           # Haupt-Component mit Tabs
    ├── data-enrichment.component.html
    ├── data-enrichment.component.scss
    ├── settings/
    │   ├── enrichment-settings.component.ts   # Provider-Config, API-Keys
    │   ├── enrichment-settings.component.html
    │   └── enrichment-settings.component.scss
    ├── dashboard/
    │   ├── enrichment-dashboard.component.ts  # Statistiken & Übersicht
    │   ├── enrichment-dashboard.component.html
    │   ├── enrichment-dashboard.component.scss
    │   └── stats-card.component.ts            # Wiederverwendbare Stat-Karte
    ├── suggestions/
    │   ├── suggestion-list.component.ts       # Liste aller Vorschläge
    │   ├── suggestion-list.component.html
    │   ├── suggestion-list.component.scss
    │   └── suggestion-review-dialog.component.ts  # Detail-Dialog
    ├── jobs/
    │   ├── job-list.component.ts              # Job-Historie
    │   ├── job-list.component.html
    │   ├── job-details-dialog.component.ts    # Job-Details & Logs
    │   └── job-details-dialog.component.html
    └── shared/
        ├── provider-icon.component.ts         # Provider-Icons (Gemini, Claude, etc.)
        └── confidence-badge.component.ts      # Confidence-Score Badge
```

### Dashboard Mock-Up

```
┌────────────────────────────────────────────────────────────────┐
│  Data Enrichment Dashboard                                     │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📊 Statistiken (aktueller Monat)                              │
│  ┌──────────────┬──────────────┬──────────────┬─────────────┐ │
│  │ API Kosten   │ Verarbeitet  │ Vorschläge   │ Angenommen  │ │
│  │ 12.45 EUR    │ 3,241 Items  │ 42 offen     │ 89% Rate    │ │
│  │ von 25.00    │              │              │             │ │
│  └──────────────┴──────────────┴──────────────┴─────────────┘ │
│                                                                 │
│  🔄 Letzter Job: 13.02.2026 02:00 ✓ Erfolgreich               │
│     Nächster Job: 14.02.2026 02:00                             │
│                                                                 │
│  📝 Offene Vorschläge                                          │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ ⚡ Stück-Metadaten (30)                    [Review →]    │ │
│  │ 👤 Komponisten-Daten (8)                   [Review →]    │ │
│  │ 🔀 Dubletten (12)                          [Review →]    │ │
│  │ 🏢 Verlage (2)                             [Review →]    │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  [⚙️ Einstellungen] [▶️ Manuellen Job starten] [📜 Job-Log]   │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Implementierungs-Phasen

### Phase 1: Foundation (Woche 1-2)
- [ ] Datenbank-Schema erstellen (Migrations)
- [ ] Models: `DataEnrichmentJob`, `DataEnrichmentSuggestion`, `DataEnrichmentSetting`
- [ ] Claude API Client Service
- [ ] Basis-Controller & Routes
- [ ] Settings-Verwaltung

**Deliverables**: Admin kann Settings konfigurieren, Claude API funktioniert

### Phase 2: Data Sources (Woche 2-3)
- [ ] IMSLP Adapter
- [ ] Wikidata SPARQL Adapter
- [ ] MusicBrainz Adapter
- [ ] Caching-Layer für externe Daten
- [ ] Rate Limiting Implementation

**Deliverables**: Datenquellen können manuell abgefragt werden

### Phase 3: Analyzers (Woche 3-4)
- [ ] Composer Analyzer (Lebensdaten ergänzen)
- [ ] Piece Analyzer (Metadaten ergänzen)
- [ ] Publisher Analyzer (Verlags-Infos)
- [ ] Duplicate Detector (erweitert bestehende Fuzzy-Matching)
- [ ] Suggestion Manager Service

**Deliverables**: Einzelne Enrichment-Funktionen testbar

### Phase 4: Job System (Woche 4-5)
- [ ] Enrichment Queue Service
- [ ] Enrichment Processor (orchestriert Analyzer)
- [ ] Job-Tracking & Status-Updates
- [ ] Budget-Tracking
- [ ] Error Handling & Retry Logic

**Deliverables**: Jobs können manuell gestartet und überwacht werden

### Phase 5: Scheduler (Woche 5)
- [ ] Enrichment Scheduler Service (node-cron)
- [ ] Automatische nächtliche Jobs
- [ ] Budget-Checks vor Job-Start
- [ ] Email-Benachrichtigungen bei Problemen

**Deliverables**: Automatische nächtliche Verarbeitung

### Phase 6: Frontend (Woche 6-7)
- [ ] **Data Enrichment Settings Component** (Hauptseite)
  - [ ] Provider-Konfiguration (Gemini, Claude, OpenAI, etc.)
  - [ ] API-Key-Eingabe (verschlüsselt gespeichert)
  - [ ] Agent aktivieren/deaktivieren
  - [ ] Zeitplan-Konfiguration (Cron)
  - [ ] Budget-Limits
- [ ] **Enrichment Dashboard Component**
  - [ ] Statistiken-Übersicht (Kosten, Erfolgsrate)
  - [ ] Job-Historie
  - [ ] Offene Vorschläge (gruppiert)
- [ ] **Suggestion Review Component**
  - [ ] Liste mit Filter/Sortierung
  - [ ] Side-by-Side Vergleich
  - [ ] Bulk-Actions (Approve/Reject)
- [ ] **Suggestion Review Dialog**
  - [ ] Detailansicht einzelner Vorschlag
  - [ ] Quellen-Links
  - [ ] Einzelfeld-Übernahme
- [ ] **Job Details Component**
  - [ ] Job-Log anzeigen
  - [ ] Fehlerdetails
  - [ ] Cost-Breakdown

**Deliverables**: Admin kann komplette Enrichment-Konfiguration vornehmen und Vorschläge reviewen

### Phase 7: Testing & Refinement (Woche 7-8)
- [ ] Unit Tests für Services
- [ ] Integration Tests
- [ ] LLM Prompt Optimization
- [ ] Performance Tuning
- [ ] Dokumentation

**Deliverables**: Produktionsreif

### Phase 8: Production Rollout (Woche 8)
- [ ] Initiales Seeding von External IDs
- [ ] Erstmaliger Dubletten-Check
- [ ] Monitoring-Setup
- [ ] Backup-Strategie für Suggestions

---

## 🔒 Sicherheit & Datenschutz

### API-Key Management

**⚠️ WICHTIG**: API-Keys werden **NICHT** in `.env` gespeichert, sondern **verschlüsselt in der Datenbank**!

```javascript
// Backend: config/encryption.js
const crypto = require('crypto');

// Verwendet einen Master-Key aus .env (sollte rotiert werden können)
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = Buffer.from(process.env.MASTER_ENCRYPTION_KEY, 'hex'); // 32 bytes

function encryptApiKey(key) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(key, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Speichert iv:authTag:encrypted als einen String
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decryptApiKey(encryptedString) {
    const [ivHex, authTagHex, encrypted] = encryptedString.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
}

module.exports = { encryptApiKey, decryptApiKey };
```

### Audit Trail
```javascript
// Alle Änderungen durch Enrichment loggen
await db.choir_log.create({
    choirId: null,  // System-Log
    userId: null,   // Automatisch
    action: 'data_enrichment',
    entity: 'piece',
    entityId: pieceId,
    details: JSON.stringify({
        suggestionId: suggestion.id,
        changes: suggestion.changes,
        approvedBy: req.userId
    })
});
```

### Rate Limiting für externe APIs
```javascript
// Verhindert IP-Bans
const bottleneck = require('bottleneck');

const imslpLimiter = new bottleneck({
    maxConcurrent: 1,
    minTime: 1000  // min 1 sec zwischen Requests
});

const imslpGet = imslpLimiter.wrap(axios.get);
```

---

## 📖 Beispiel: Vollständiger Piece-Enrichment Flow

### Input
```json
{
  "id": 1234,
  "title": "Jesu, meine Freude",
  "subtitle": null,
  "composerId": 42,
  "voicing": null,
  "key": null,
  "opus": null,
  "durationSec": null,
  "license": null
}
```

### Schritt 1: Komponist laden
```json
{
  "id": 42,
  "name": "Bach, Johann Sebastian",
  "birthYear": "1685",
  "deathYear": "1750",
  "imslpId": null
}
```

### Schritt 2: IMSLP abfragen
```bash
GET https://imslp.org/api.php?action=query&list=categorymembers&cmtitle=Category:Bach,_Johann_Sebastian&format=json

# Findet: "Jesu, meine Freude, BWV 227"
```

### Schritt 3: Wikidata abfragen
```sparql
SELECT ?work ?workLabel ?catalogNumber WHERE {
  ?work wdt:P86 wd:Q1339;  # composer: J.S. Bach
        rdfs:label "Jesu, meine Freude"@de.
  OPTIONAL { ?work wdt:P528 ?catalogNumber }
}

# Result: BWV 227
```

### Schritt 4: LLM-Enrichment
```javascript
const prompt = `
Analyze this choral work and provide missing metadata in JSON format:

Title: "Jesu, meine Freude"
Composer: Bach, Johann Sebastian (1685-1750)

External data found:
- IMSLP: https://imslp.org/wiki/Jesu,_meine_Freude,_BWV_227_(Bach,_Johann_Sebastian)
- Wikidata: q1234567

Current database fields:
- voicing: null
- key: null
- opus: null
- durationSec: null

Provide ONLY verified data from reliable sources. Return JSON:
{
  "voicing": "...",
  "key": "...",
  "opus": "...",
  "durationSec": ...,
  "confidence": 0.0-1.0,
  "sources": ["url1", "url2"],
  "reasoning": "..."
}
`;

const response = await claudeClient.complete(prompt);
```

### Schritt 5: LLM Response
```json
{
  "voicing": "SSATB",
  "key": "E minor",
  "opus": "BWV 227",
  "durationSec": 1200,
  "imslpWorkId": "Jesu,_meine_Freude,_BWV_227_(Bach,_Johann_Sebastian)",
  "confidence": 0.98,
  "sources": [
    "https://imslp.org/wiki/Jesu,_meine_Freude,_BWV_227_(Bach,_Johann_Sebastian)",
    "https://www.wikidata.org/wiki/Q1234567"
  ],
  "reasoning": "Data verified from IMSLP which lists this as a motet for two sopranos, alto, two tenors, and bass (SSATB) in E minor. BWV number confirmed from Bach-Werke-Verzeichnis. Average performance duration is approximately 20 minutes."
}
```

### Schritt 6: Suggestion speichern
```javascript
await db.data_enrichment_suggestion.create({
    jobId: currentJob.id,
    entityType: 'piece',
    entityId: 1234,
    suggestionType: 'metadata',
    status: 'pending',
    originalData: {
        voicing: null,
        key: null,
        opus: null,
        durationSec: null
    },
    suggestedData: {
        voicing: 'SSATB',
        key: 'E minor',
        opus: 'BWV 227',
        durationSec: 1200,
        imslpWorkId: 'Jesu,_meine_Freude,_BWV_227_(Bach,_Johann_Sebastian)'
    },
    changes: [
        { field: 'voicing', from: null, to: 'SSATB' },
        { field: 'key', from: null, to: 'E minor' },
        { field: 'opus', from: null, to: 'BWV 227' },
        { field: 'durationSec', from: null, to: 1200 },
        { field: 'imslpWorkId', from: null, to: 'Jesu,_meine_Freude,_BWV_227_(Bach,_Johann_Sebastian)' }
    ],
    confidence: 0.98,
    sources: [
        'https://imslp.org/wiki/Jesu,_meine_Freude,_BWV_227_(Bach,_Johann_Sebastian)',
        'https://www.wikidata.org/wiki/Q1234567'
    ],
    reasoning: 'Data verified from IMSLP which lists this as a motet for two sopranos...'
});
```

### Schritt 7: Admin Review
Admin sieht in UI:
```
✅ "Jesu, meine Freude" - BWV 227
   Confidence: 98%
   
   Changes:
   + voicing: SSATB
   + key: E minor
   + opus: BWV 227
   + durationSec: 20:00 min
   
   Sources: [IMSLP] [Wikidata]
   
   [Approve] [Reject] [Details]
```

### Schritt 8: Approval
```javascript
// Admin klickt "Approve"
await approveSuggestion(suggestionId, req.userId);

// Datenbank-Update
await db.piece.update({
    voicing: 'SSATB',
    key: 'E minor',
    opus: 'BWV 227',
    durationSec: 1200,
    imslpWorkId: 'Jesu,_meine_Freude,_BWV_227_(Bach,_Johann_Sebastian)',
    lastEnrichedAt: new Date(),
    enrichmentStatus: 'complete'
}, {
    where: { id: 1234 }
});

// Suggestion-Status aktualisieren
await db.data_enrichment_suggestion.update({
    status: 'approved',
    reviewedBy: req.userId,
    reviewedAt: new Date()
}, {
    where: { id: suggestionId }
});
```

---

## 🎓 Best Practices

### 1. Prompt Engineering für Musikdaten
```javascript
const PROMPT_TEMPLATES = {
    pieceEnrichment: `
You are a classical music librarian. Analyze the following choral work 
and provide ONLY factually verified metadata.

IMPORTANT:
- Only use data from reliable sources (IMSLP, scholarly catalogs)
- If uncertain, return null for that field
- For voicing, use standard abbreviations (SATB, SSATB, etc.)
- For duration, provide seconds (not mm:ss)
- For opus numbers, use standard catalog (BWV, K., Op., etc.)

Work:
Title: {{title}}
Composer: {{composerName}} ({{birthYear}}-{{deathYear}})
{{#if subtitle}}Subtitle: {{subtitle}}{{/if}}

Current data:
{{currentData}}

External sources found:
{{externalData}}

Return JSON:
{
  "voicing": string | null,
  "key": string | null,
  "opus": string | null,
  "durationSec": number | null,
  "confidence": number (0.0-1.0),
  "sources": string[],
  "reasoning": string
}
`,
    
    duplicateDetection: `
Are these two composer entries duplicates of the same person?

Entry 1:
Name: {{name1}}
{{#if birthYear1}}Birth: {{birthYear1}}{{/if}}
{{#if deathYear1}}Death: {{deathYear1}}{{/if}}

Entry 2:
Name: {{name2}}
{{#if birthYear2}}Birth: {{birthYear2}}{{/if}}
{{#if deathYear2}}Death: {{deathYear2}}{{/if}}

Consider:
- Name variations (e.g., "Bach, J.S." vs "Bach, Johann Sebastian")
- Abbreviated first names
- Alternative spellings
- Different languages

Return JSON:
{
  "isDuplicate": boolean,
  "confidence": number (0.0-1.0),
  "preferredName": string,
  "reasoning": string
}
`
};
```

### 2. Fehlerbehandlung
```javascript
async function enrichWithRetry(piece, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await enrichPiece(piece);
        } catch (error) {
            if (error.code === 'RATE_LIMIT' && attempt < maxRetries) {
                const delay = Math.pow(2, attempt) * 1000;  // Exponential backoff
                await sleep(delay);
                continue;
            }
            
            if (error.code === 'INVALID_RESPONSE') {
                logger.warn(`Invalid LLM response for piece ${piece.id}, skipping`);
                return null;
            }
            
            throw error;  // Unrecoverable error
        }
    }
}
```

### 3. Caching-Strategie
```javascript
const NodeCache = require('node-cache');
const externalDataCache = new NodeCache({ 
    stdTTL: 86400,  // 24h
    checkperiod: 3600  // Check every hour
});

async function getComposerFromIMSLP(composerName) {
    const cacheKey = `imslp:composer:${normalize(composerName)}`;
    
    let data = externalDataCache.get(cacheKey);
    if (data) {
        logger.debug(`Cache hit: ${cacheKey}`);
        return data;
    }
    
    data = await imslpAdapter.searchComposer(composerName);
    externalDataCache.set(cacheKey, data);
    
    return data;
}
```

### 4. Batch-Optimierung
```javascript
async function enrichPiecesBatch(pieces) {
    // Gruppiere nach Komponist für effiziente Komponisten-Datenabfrage
    const byComposer = _.groupBy(pieces, 'composerId');
    
    // Lade Komponisten-Daten einmal pro Komponist
    const composerData = await Promise.all(
        Object.keys(byComposer).map(id => db.composer.findByPk(id))
    );
    
    // Erstelle LLM-Prompt für gesamten Batch
    const batchPrompt = {
        pieces: pieces.map((p, i) => ({
            id: p.id,
            title: p.title,
            composer: composerData.find(c => c.id === p.composerId),
            currentData: extractCurrentData(p)
        }))
    };
    
    // Eine LLM-Anfrage für alle Stücke
    const response = await claudeClient.enrichBatch(batchPrompt);
    
    return response.suggestions;
}
```

---

## 📝 Nächste Schritte

### Sofort umsetzbar
1. ✅ **Dieses Dokument reviewen** - Feedback zu Ansatz & Priorisierung
2. � **API-Keys besorgen**:
   - **Google AI Studio** (Gemini): https://makersuite.google.com/app/apikey
     - Kostenloser Tier: 15 Requests/Minute (ausreichend!)
   - **Optional - Anthropic**: https://console.anthropic.com/
     - Nur als Fallback für komplexe Fälle
3. 📊 **Datenanalyse durchführen**:
   ```sql
   -- Wie viele Stücke haben fehlende Daten?
   SELECT 
     COUNT(*) as total,
     SUM(CASE WHEN voicing IS NULL THEN 1 ELSE 0 END) as missing_voicing,
     SUM(CASE WHEN `key` IS NULL THEN 1 ELSE 0 END) as missing_key,
     SUM(CASE WHEN opus IS NULL THEN 1 ELSE 0 END) as missing_opus,
     SUM(CASE WHEN durationSec IS NULL THEN 1 ELSE 0 END) as missing_duration
   FROM pieces;
   ```
4. 📋 **Phase 1 starten** (wenn gewünscht):
   - Datenbank-Schema & Models
   - Gemini Provider Service
   - Erste Tests mit 10 Stücken

### Mittelfristig (nach Phase 1)
- **Komponisten-Enrichment**: Lebensdaten für ~500 Komponisten (~10 Cent)
- **Dubletten-Check**: Einmaliger vollständiger Durchlauf (~50 Cent)
- **Admin-Interface**: Review-Dashboard implementieren

### Fragen an dich
- **Präferenz**: Soll der Agent direkt produktive Änderungen machen oder nur Vorschläge erstellen? *(Empfehlung: Vorschläge)*
- **Zeitplan**: Wann möchtest du das Feature produktiv nutzen? (4-6 Wochen Entwicklung)
- **Dubletten**: Kennst du bereits Dubletten in der DB? (Komponisten/Verlage mit leicht unterschiedlichen Namen)

### Potenzielle Premium-Features (mit verbleibendem Budget)
Da die Basis-Funktionalität nur ~2 EUR/Jahr kostet, können wir das Budget für erweiterte Features nutzen:

- **Thematische Katalogisierung**: 
  - LLM analysiert Liedtexte für Inhalte (Advent, Passion, Ostern, etc.)
  - Auto-Tagging nach liturgischem Kalenderjahr
  - Kosten: ~5 EUR/Jahr (für alle 2024 Stücke)

- **Schwierigkeitsgrad-Einschätzung**:
  - LLM bewertet Schwierigkeit basierend auf Voicing, Tonart, Dauer
  - Vorschläge für Anfänger/Fortgeschrittene/Profi-Chöre
  - Kosten: ~3 EUR/Jahr

- **Automatische Setlist-Vorschläge**:
  - "Finde Stücke für Adventskonzert mit mixed choir (SATB)"
  - LLM erstellt thematisch passende Programme
  - Kosten: ~0.05 EUR/Abfrage

- **Intelligent Search**:
  - Semantische Suche: "Zeige mir ruhige Weihnachtslieder in G-Dur"
  - Embedding-basiert (einmalig ~2 EUR für alle Stücke)
  - Danach kostenlos (lokale Vektor-DB)

**Budget-Aufteilung Vorschlag**:
```
Basis-Enrichment:           ~2 EUR/Jahr   (10%)
Thematische Analyse:        ~5 EUR/Jahr   (25%)
Schwierigkeitsgrad:         ~3 EUR/Jahr   (15%)
Intelligent Search Setup:   ~2 EUR einmal (10%)
On-Demand Features:         ~8 EUR/Jahr   (40%)
─────────────────────────────────────────────
Gesamt:                    ~20 EUR/Jahr  (100%)
```

---

**Erstellt am**: 13. Februar 2026  
**Autor**: GitHub Copilot  
**Version**: 1.0  
**Status**: Planung - Wartet auf Feedback
