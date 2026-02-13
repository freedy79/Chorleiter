# LLM Provider Vergleich für Data Enrichment Agent

## Übersicht

Vergleich verschiedener LLM-Provider für die Metadaten-Anreicherung der Chorleiter-Datenbank.

**Datenbasis**: 2024 Stücke  
**Erstellt**: 13. Februar 2026  
**Budget**: 20-30 EUR/Monat  

---

## 📊 Provider-Kostenvergleich

### Preise pro 1M Tokens (Stand Feb 2026)

| Provider | Modell | Input | Output | Qualität | Musikwissen | Geschwindigkeit |
|----------|--------|-------|--------|----------|-------------|-----------------|
| **Anthropic** | Claude 3.5 Sonnet | $3.00 | $15.00 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Anthropic** | Claude 3.5 Haiku | $0.80 | $4.00 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **OpenAI** | GPT-4o | $2.50 | $10.00 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **OpenAI** | GPT-4o-mini | $0.15 | $0.60 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Google** | Gemini 1.5 Pro | $1.25 | $5.00 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Google** | Gemini 1.5 Flash | $0.075 | $0.30 | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **DeepSeek** | DeepSeek-V3 | $0.14 | $0.28 | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Together AI** | Llama 3.3 70B | $0.18 | $0.18 | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## 💰 Kostenberechnung für 2024 Stücke

### Annahmen
- **Stücke mit fehlenden Daten**: ~60% = 1,215 Stücke
- **Batch-Größe**: 10 Stücke pro Request
- **Requests gesamt**: ~122 Requests
- **Tokens pro Request**: 
  - Input: 1,500 tokens (Kontext + 10 Stücke)
  - Output: 800 tokens (10 JSON-Objekte)

### Einmalige Komplett-Verarbeitung

| Provider | Modell | Input-Kosten | Output-Kosten | Gesamt | Stück-Preis |
|----------|--------|--------------|---------------|--------|-------------|
| **Google** | **Gemini 1.5 Flash** | $0.014 | $0.029 | **$0.043** | **$0.000035** 🏆 |
| OpenAI | GPT-4o-mini | $0.027 | $0.059 | **$0.086** | $0.000071 |
| DeepSeek | DeepSeek-V3 | $0.026 | $0.027 | **$0.053** | $0.000044 |
| Together AI | Llama 3.3 70B | $0.033 | $0.018 | **$0.051** | $0.000042 |
| Anthropic | Claude 3.5 Haiku | $0.146 | $0.393 | **$0.539** | $0.000444 |
| OpenAI | GPT-4o | $0.458 | $0.984 | **$1.442** | $0.001187 |
| Google | Gemini 1.5 Pro | $0.229 | $0.492 | **$0.721** | $0.000594 |
| Anthropic | Claude 3.5 Sonnet | $0.549 | $1.476 | **$2.025** | $0.001667 |

**📌 Ergebnis**: Mit den günstigsten Providern kostet die **gesamte Datenbank** < 10 Cent!

### Monatliche Inkrementelle Updates

**Szenario**: 100 neue/geänderte Stücke pro Monat

| Provider | Modell | Monatliche Kosten | Jährliche Kosten |
|----------|--------|-------------------|------------------|
| Google | Gemini 1.5 Flash | **$0.004** | $0.048 |
| DeepSeek | DeepSeek-V3 | **$0.004** | $0.048 |
| Together AI | Llama 3.3 70B | **$0.004** | $0.048 |
| OpenAI | GPT-4o-mini | **$0.007** | $0.084 |
| Anthropic | Claude 3.5 Haiku | **$0.044** | $0.528 |
| OpenAI | GPT-4o | **$0.118** | $1.416 |
| Anthropic | Claude 3.5 Sonnet | **$0.166** | $1.992 |

**📌 Ergebnis**: Mit günstigeren Providern sind selbst 20-30 EUR Budget **massiv überdimensioniert**!

---

## 🎯 Provider-Strategie Empfehlung

### Option A: **Dual-Provider (Qualität + Kosten)**

```
┌─────────────────────────────────────────┐
│  Standard: Gemini 1.5 Flash             │
│  - Routine-Enrichment                   │
│  - 95% der Fälle                        │
│  - Kosten: ~$0.004/Monat                │
└─────────────────────────────────────────┘
              ↓ (bei niedrigem Confidence)
┌─────────────────────────────────────────┐
│  Fallback: Claude 3.5 Sonnet            │
│  - Komplexe/mehrdeutige Fälle           │
│  - 5% der Fälle                         │
│  - Kosten: ~$0.008/Monat                │
└─────────────────────────────────────────┘

Gesamt: ~$0.012/Monat = 0.01 EUR/Monat
```

**Vorteil**: Beste Qualität, minimale Kosten

### Option B: **Cascading Fallback (Maximale Robustheit)**

```
1. Gemini 1.5 Flash (primär, schnell, günstig)
   ↓ (bei API-Fehler oder confidence < 0.7)
2. GPT-4o-mini (Fallback 1, zuverlässig)
   ↓ (bei weiterhin niedrigem confidence)
3. Claude 3.5 Sonnet (Fallback 2, höchste Qualität)
```

**Vorteil**: Ausfallsicherheit, optimales Preis-Leistungs-Verhältnis

### Option C: **Budget-Optimizer (Dynamisch)**

```javascript
function selectProvider(piece, monthlyBudget) {
    const currentSpent = getCurrentMonthSpending();
    const remainingBudget = monthlyBudget - currentSpent;
    
    // Priorisierung nach Datenvollständigkeit
    const dataQualityScore = calculateDataQuality(piece);
    
    if (dataQualityScore < 0.3) {
        // Viele fehlende Daten = schwieriger Fall
        return remainingBudget > 1.00 ? 'claude-sonnet' : 'gpt-4o-mini';
    } else if (dataQualityScore < 0.6) {
        // Medium-schwierig
        return 'gpt-4o-mini';
    } else {
        // Einfacher Fall (nur wenige Felder fehlen)
        return 'gemini-flash';
    }
}
```

**Vorteil**: Budget-optimal, adaptive Qualität

---

## 🏗️ Multi-Provider-Architektur

### Service-Struktur

```
choir-app-backend/src/services/enrichment/llm/
├── llm-provider.interface.js          # Interface für alle Provider
├── llm-router.service.js              # Provider-Auswahl & Routing
├── providers/
│   ├── claude-provider.service.js     # Anthropic Claude
│   ├── openai-provider.service.js     # OpenAI GPT
│   ├── gemini-provider.service.js     # Google Gemini
│   ├── deepseek-provider.service.js   # DeepSeek
│   └── together-provider.service.js   # Together AI (Llama)
├── prompt-templates.js                # Gemeinsame Prompts
└── response-validator.service.js      # JSON-Validierung
```

### LLM Provider Interface

```javascript
// llm-provider.interface.js

class LLMProvider {
    constructor(config) {
        this.name = config.name;
        this.apiKey = config.apiKey;
        this.model = config.model;
        this.costPerInputToken = config.costPerInputToken;
        this.costPerOutputToken = config.costPerOutputToken;
    }
    
    /**
     * Enrich piece metadata
     * @param {Object} prompt - Structured prompt data
     * @returns {Promise<{data: Object, tokens: {input: number, output: number}, cost: number}>}
     */
    async enrichPieceMetadata(prompt) {
        throw new Error('Must be implemented by subclass');
    }
    
    /**
     * Detect duplicates
     * @param {Object} prompt - Structured prompt data
     * @returns {Promise<{isDuplicate: boolean, confidence: number, reasoning: string}>}
     */
    async detectDuplicate(prompt) {
        throw new Error('Must be implemented by subclass');
    }
    
    /**
     * Calculate cost for a request
     * @param {number} inputTokens
     * @param {number} outputTokens
     * @returns {number} Cost in USD
     */
    calculateCost(inputTokens, outputTokens) {
        return (inputTokens * this.costPerInputToken + 
                outputTokens * this.costPerOutputToken) / 1_000_000;
    }
    
    /**
     * Test API connection
     * @returns {Promise<boolean>}
     */
    async testConnection() {
        throw new Error('Must be implemented by subclass');
    }
}

module.exports = LLMProvider;
```

### LLM Router Service

```javascript
// llm-router.service.js

const GeminiProvider = require('./providers/gemini-provider.service');
const ClaudeProvider = require('./providers/claude-provider.service');
const OpenAIProvider = require('./providers/openai-provider.service');
const DeepSeekProvider = require('./providers/deepseek-provider.service');
const logger = require('../../../config/logger');
const db = require('../../../models');

class LLMRouter {
    constructor() {
        this.providers = {};
        this.strategy = 'dual'; // 'dual', 'cascading', 'budget-optimizer'
        this.monthlyBudget = 25.00; // USD
    }
    
    async initialize() {
        // Lade Konfiguration aus DB
        const settings = await db.data_enrichment_setting.findOne({
            where: { settingKey: 'llm_config' }
        });
        
        if (!settings) {
            throw new Error('LLM configuration not found in database');
        }
        
        const config = settings.settingValue;
        this.strategy = config.strategy || 'dual';
        this.monthlyBudget = config.monthlyBudget || 25.00;
        
        // Initialisiere aktivierte Provider
        for (const providerConfig of config.providers) {
            if (!providerConfig.enabled) continue;
            
            let provider;
            switch (providerConfig.name) {
                case 'gemini':
                    provider = new GeminiProvider(providerConfig);
                    break;
                case 'claude':
                    provider = new ClaudeProvider(providerConfig);
                    break;
                case 'openai':
                    provider = new OpenAIProvider(providerConfig);
                    break;
                case 'deepseek':
                    provider = new DeepSeekProvider(providerConfig);
                    break;
                default:
                    logger.warn(`Unknown provider: ${providerConfig.name}`);
                    continue;
            }
            
            // Test connection
            try {
                const connected = await provider.testConnection();
                if (connected) {
                    this.providers[providerConfig.name] = provider;
                    logger.info(`LLM Provider initialized: ${providerConfig.name}`);
                }
            } catch (error) {
                logger.error(`Failed to initialize ${providerConfig.name}: ${error.message}`);
            }
        }
    }
    
    async selectProvider(task, context = {}) {
        switch (this.strategy) {
            case 'dual':
                return this._dualProviderStrategy(task, context);
            case 'cascading':
                return this._cascadingStrategy(task, context);
            case 'budget-optimizer':
                return this._budgetOptimizerStrategy(task, context);
            default:
                return this.providers.gemini || this.providers.openai || this.providers.claude;
        }
    }
    
    _dualProviderStrategy(task, context) {
        // Standardfall: Gemini Flash
        if (this.providers.gemini) {
            return this.providers.gemini;
        }
        
        // Fallback: Claude Sonnet
        return this.providers.claude || this.providers.openai;
    }
    
    _cascadingStrategy(task, context) {
        // Wähle günstigsten verfügbaren Provider
        const preferenceOrder = ['gemini', 'deepseek', 'openai', 'claude'];
        
        for (const name of preferenceOrder) {
            if (this.providers[name]) {
                return this.providers[name];
            }
        }
        
        throw new Error('No LLM provider available');
    }
    
    async _budgetOptimizerStrategy(task, context) {
        const currentSpent = await this._getCurrentMonthSpending();
        const remainingBudget = this.monthlyBudget - currentSpent;
        
        // Budget fast aufgebraucht: nur günstigste Provider
        if (remainingBudget < 1.00) {
            return this.providers.gemini || this.providers.deepseek;
        }
        
        // Complexity-basierte Auswahl
        const complexity = this._estimateComplexity(context);
        
        if (complexity === 'high') {
            // Schwieriger Fall: besseres Modell
            return this.providers.claude || this.providers.openai;
        } else if (complexity === 'medium') {
            return this.providers.openai || this.providers.gemini;
        } else {
            // Einfacher Fall: günstiges Modell
            return this.providers.gemini || this.providers.deepseek;
        }
    }
    
    _estimateComplexity(context) {
        if (!context.piece) return 'low';
        
        const missingFieldsCount = Object.values(context.piece)
            .filter(v => v === null || v === undefined || v === '').length;
        
        if (missingFieldsCount > 5) return 'high';
        if (missingFieldsCount > 2) return 'medium';
        return 'low';
    }
    
    async _getCurrentMonthSpending() {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const result = await db.data_enrichment_job.sum('apiCosts', {
            where: {
                createdAt: { [db.Sequelize.Op.gte]: startOfMonth }
            }
        });
        
        return result || 0;
    }
    
    async enrichPieceMetadata(prompt, context = {}) {
        const provider = await this.selectProvider('enrichPieceMetadata', context);
        
        logger.info(`Using provider: ${provider.name} for piece enrichment`);
        
        try {
            const result = await provider.enrichPieceMetadata(prompt);
            
            // Log costs
            await this._logCost(provider.name, result.cost);
            
            // Retry mit besserem Provider bei niedriger Confidence
            if (result.data.confidence < 0.7 && this.strategy === 'dual') {
                logger.warn(`Low confidence (${result.data.confidence}), retrying with better model`);
                
                const fallbackProvider = this.providers.claude || this.providers.openai;
                if (fallbackProvider && fallbackProvider.name !== provider.name) {
                    const retryResult = await fallbackProvider.enrichPieceMetadata(prompt);
                    await this._logCost(fallbackProvider.name, retryResult.cost);
                    return retryResult;
                }
            }
            
            return result;
            
        } catch (error) {
            logger.error(`Provider ${provider.name} failed: ${error.message}`);
            
            // Automatischer Fallback bei Fehler
            if (this.strategy === 'cascading') {
                const fallbackProvider = this._getNextProvider(provider.name);
                if (fallbackProvider) {
                    logger.info(`Falling back to ${fallbackProvider.name}`);
                    const result = await fallbackProvider.enrichPieceMetadata(prompt);
                    await this._logCost(fallbackProvider.name, result.cost);
                    return result;
                }
            }
            
            throw error;
        }
    }
    
    _getNextProvider(currentProviderName) {
        const order = ['gemini', 'deepseek', 'openai', 'claude'];
        const currentIndex = order.indexOf(currentProviderName);
        
        for (let i = currentIndex + 1; i < order.length; i++) {
            if (this.providers[order[i]]) {
                return this.providers[order[i]];
            }
        }
        
        return null;
    }
    
    async _logCost(providerName, cost) {
        // Wird vom Job-System geloggt
        logger.debug(`Provider ${providerName} cost: $${cost.toFixed(4)}`);
    }
}

module.exports = new LLMRouter();
```

### Gemini Provider Implementation

```javascript
// providers/gemini-provider.service.js

const LLMProvider = require('../llm-provider.interface');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../../../../config/logger');

class GeminiProvider extends LLMProvider {
    constructor(config) {
        super({
            name: 'gemini',
            apiKey: config.apiKey,
            model: config.model || 'gemini-1.5-flash',
            costPerInputToken: 0.075,  // per 1M tokens
            costPerOutputToken: 0.30
        });
        
        this.client = new GoogleGenerativeAI(this.apiKey);
        this.generativeModel = this.client.getGenerativeModel({ model: this.model });
    }
    
    async enrichPieceMetadata(prompt) {
        const systemPrompt = `You are a classical music librarian analyzing choral works.
        Provide ONLY factually verified metadata from reliable sources (IMSLP, scholarly catalogs).
        Return valid JSON only.`;
        
        const userPrompt = this._buildPieceEnrichmentPrompt(prompt);
        
        try {
            const result = await this.generativeModel.generateContent([
                { text: systemPrompt },
                { text: userPrompt }
            ]);
            
            const response = result.response;
            const text = response.text();
            
            // Extract JSON from response (Gemini sometimes adds markdown)
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No valid JSON found in response');
            }
            
            const data = JSON.parse(jsonMatch[0]);
            
            // Estimate tokens (Gemini doesn't provide exact counts)
            const inputTokens = this._estimateTokens(systemPrompt + userPrompt);
            const outputTokens = this._estimateTokens(text);
            
            const cost = this.calculateCost(inputTokens, outputTokens);
            
            return {
                data,
                tokens: { input: inputTokens, output: outputTokens },
                cost
            };
            
        } catch (error) {
            logger.error(`Gemini API error: ${error.message}`);
            throw error;
        }
    }
    
    _buildPieceEnrichmentPrompt(data) {
        return `Analyze this choral work and provide missing metadata:

Title: "${data.title}"
Composer: ${data.composerName} ${data.birthYear ? `(${data.birthYear}-${data.deathYear || '?'})` : ''}
${data.subtitle ? `Subtitle: "${data.subtitle}"` : ''}

Current data:
${JSON.stringify(data.currentData, null, 2)}

${data.externalData ? `External sources found:\n${JSON.stringify(data.externalData, null, 2)}` : ''}

Return ONLY valid JSON:
{
  "voicing": "string or null (use standard abbreviations: SATB, SSATB, etc.)",
  "key": "string or null (e.g., 'D major', 'A minor')",
  "opus": "string or null (e.g., 'BWV 227', 'Op. 52 No. 3')",
  "durationSec": "number or null (approximate duration in seconds)",
  "confidence": "number between 0.0 and 1.0",
  "sources": ["array of source URLs"],
  "reasoning": "brief explanation"
}`;
    }
    
    _estimateTokens(text) {
        // Rough estimate: ~4 characters per token (conservative)
        return Math.ceil(text.length / 4);
    }
    
    async testConnection() {
        try {
            const result = await this.generativeModel.generateContent('Test');
            return result.response.text().length > 0;
        } catch (error) {
            logger.error(`Gemini connection test failed: ${error.message}`);
            return false;
        }
    }
}

module.exports = GeminiProvider;
```

---

## 🔧 Konfiguration in Datenbank

### Beispiel-Settings (Multi-Provider)

```javascript
// Initiales Seeding
await db.data_enrichment_setting.create({
    settingKey: 'llm_config',
    settingValue: {
        strategy: 'dual',  // 'dual' | 'cascading' | 'budget-optimizer'
        monthlyBudget: 25.00,  // USD
        providers: [
            {
                name: 'gemini',
                enabled: true,
                apiKey: process.env.GEMINI_API_KEY,
                model: 'gemini-1.5-flash',
                priority: 1,  // Primärer Provider
                maxRequestsPerDay: 1000
            },
            {
                name: 'claude',
                enabled: true,
                apiKey: process.env.CLAUDE_API_KEY,
                model: 'claude-3-5-sonnet-20241022',
                priority: 2,  // Fallback für schwierige Fälle
                maxRequestsPerDay: 100
            },
            {
                name: 'openai',
                enabled: false,  // Optional
                apiKey: process.env.OPENAI_API_KEY,
                model: 'gpt-4o-mini',
                priority: 3
            },
            {
                name: 'deepseek',
                enabled: false,
                apiKey: process.env.DEEPSEEK_API_KEY,
                model: 'deepseek-chat',
                priority: 4
            }
        ]
    }
});
```

---

## 📈 Kosten-Tracking & Optimierung

### Monatliches Budget-Dashboard

```javascript
async function getBudgetStatus() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Kosten pro Provider
    const costsByProvider = await db.sequelize.query(`
        SELECT 
            JSON_EXTRACT(config, '$.provider') as provider,
            SUM(apiCosts) as totalCost,
            COUNT(*) as jobCount
        FROM data_enrichment_jobs
        WHERE createdAt >= :startDate
        GROUP BY provider
    `, {
        replacements: { startDate: startOfMonth },
        type: db.Sequelize.QueryTypes.SELECT
    });
    
    const totalSpent = costsByProvider.reduce((sum, p) => sum + parseFloat(p.totalCost), 0);
    
    return {
        monthlyBudget: 25.00,
        spent: totalSpent,
        remaining: 25.00 - totalSpent,
        percentUsed: (totalSpent / 25.00) * 100,
        byProvider: costsByProvider,
        projectedMonthEnd: (totalSpent / now.getDate()) * 30  // Hochrechnung
    };
}
```

### Cost-per-Piece Tracking

```javascript
// Nach jedem enrichment speichern
await db.data_enrichment_suggestion.update({
    apiCost: result.cost,
    provider: provider.name,
    tokensUsed: JSON.stringify(result.tokens)
}, {
    where: { id: suggestion.id }
});
```

---

## 🎯 Empfohlene Konfiguration für 2024 Stücke

### Phase 1: Initiales Enrichment (einmalig)

```yaml
Provider: Gemini 1.5 Flash
Batch-Größe: 10 Stücke
Erwartete Kosten: ~$0.05 (0.04 EUR)
Laufzeit: ~15 Minuten
```

**Vorgehen**:
1. Alle Stücke mit fehlenden Daten identifizieren (~1,215)
2. Nach Komponist gruppieren
3. Batch-weise verarbeiten (10 Stücke/Request)
4. Bei Confidence < 0.7: Retry mit Claude Sonnet

### Phase 2: Monatliche Updates

```yaml
Provider: Gemini 1.5 Flash (primär)
Fallback: Claude 3.5 Haiku (bei niedrigem Confidence)
Frequenz: Täglich 02:00 Uhr
Limit: Max 100 Stücke/Tag
Monatliche Kosten: < $0.10 (< 0.08 EUR)
```

### Phase 3: Dubletten-Check (quartalsweise)

```yaml
Provider: Claude 3.5 Sonnet (höchste Qualität für kritische Aufgabe)
Frequenz: Alle 3 Monate
Erwartete Kosten: ~$0.20/Quartal (0.17 EUR)
```

---

## 🔄 Migration Path

### Von Einzelprovider zu Multi-Provider

```javascript
// Alte Config (single provider)
{
    provider: 'claude',
    model: 'claude-3-5-sonnet-20241022',
    apiKey: '...'
}

// Neue Config (multi-provider)
{
    strategy: 'dual',
    providers: [
        { name: 'gemini', enabled: true, ... },
        { name: 'claude', enabled: true, ... }
    ]
}

// Migration Script
async function migrateToMultiProvider() {
    const oldConfig = await getSettings('llm_config');
    
    const newConfig = {
        strategy: 'dual',
        monthlyBudget: 25.00,
        providers: []
    };
    
    // Behalte alten Provider als Fallback
    if (oldConfig.provider === 'claude') {
        newConfig.providers.push({
            name: 'claude',
            enabled: true,
            apiKey: oldConfig.apiKey,
            model: oldConfig.model,
            priority: 2
        });
    }
    
    // Füge Gemini als primär hinzu
    newConfig.providers.push({
        name: 'gemini',
        enabled: true,
        apiKey: process.env.GEMINI_API_KEY,
        model: 'gemini-1.5-flash',
        priority: 1
    });
    
    await updateSettings('llm_config', newConfig);
}
```

---

## 📊 ROI-Berechnung

### Zeitersparnis vs. API-Kosten

**Manuelle Pflege**:
- 2024 Stücke × 5 min/Stück = 168 Stunden
- Bei 25 EUR/h = 4,200 EUR Arbeitskosten

**Automatisiert (Gemini Flash)**:
- Initiales Enrichment: $0.05 (4 Cent)
- Monatliche Updates (12 Monate): $1.20 (1 EUR)
- **Gesamt Jahr 1**: ~1 EUR

**ROI**: 4,199:1 ⭐

---

## ✅ Nächste Schritte

1. **API-Keys besorgen** (kostenlose Tier ausreichend):
   - Google AI Studio: https://makersuite.google.com/app/apikey (Gemini)
   - Anthropic Console: https://console.anthropic.com/ (Claude - optional)

2. **Initiale Config** in DB eintragen

3. **Phase 1 Implementation**:
   - Gemini Provider Service
   - LLM Router Service
   - Testing mit 10 Stück Sample

4. **Vollständiges Enrichment**:
   - Dry-run mit Logging (keine DB-Änderungen)
   - Review der Suggestions
   - Produktiv-Run

---

**Erstellt**: 13. Februar 2026  
**Letzte Aktualisierung**: 13. Februar 2026  
**Status**: Bereit zur Implementation  
**Empfohlene Kosten**: < 2 EUR/Jahr
