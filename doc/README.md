# 📚 Projekt-Dokumentation - doc/

## 🎯 Zweck

Dieses Verzeichnis enthält **alle Markdown-Dokumentationen** für das NAK Chorleiter Projekt.

---

## 📁 Verzeichnisstruktur

```
doc/
├── README.md                    # Diese Datei
├── project/                     # Projekt-weite Dokumentation
│   ├── DOCUMENTATION-INDEX.md   # Haupt-Index aller Dokumente
│   ├── README.md                # Projekt-Übersicht
│   ├── PAYPAL-PDT-SETUP.md      # PayPal Integration
│   ├── SECURITY-AUDIT-LOGIN.md  # Sicherheits-Audit
│   └── MOBILE-SEARCH-*.md       # Mobile Search Feature
├── frontend/                    # Frontend-spezifische Docs
│   ├── API-REFACTORING-*.md     # API Refactoring Guides
│   ├── DARK-MODE-*.md           # Dark Mode Implementation
│   ├── PERFORMANCE-*.md         # Performance Optimierungen
│   ├── PWA-*.md                 # PWA Features & Testing
│   └── PIPE-UTILITIES-*.md      # Pipe/Utilities Refactoring
├── backend/                     # Backend-spezifische Docs
│   └── (Reserved)
├── tasks/                       # Implementierungs-Tasks (aus docs/)
│   └── mobile-nav-*.md          # Mobile Navigation Tasks
└── claude/                      # ⚠️ Temporäre Dateien (ignored by git)
    └── (Temporäre Claude-generierte Dateien)
```

---

## 📋 Kategorien

### 🎯 Project-Level Docs (`doc/project/`)
- Projekt-Übersicht und Setup
- Integration Guides (PayPal, etc.)
- Security Audits
- Feature Completion Reports

### 🎨 Frontend Docs (`doc/frontend/`)
- Angular Component Guides
- Refactoring Documentations
- PWA Implementation
- Performance Optimizations
- Dark Mode Implementation

### 🔧 Backend Docs (`doc/backend/`)
- API Documentation
- Database Schemas
- Service Implementations
- (Currently reserved)

### ✅ Task Docs (`doc/tasks/`)
- Individual implementation tasks
- Mobile navigation phases
- Checklist items
- Task tracking

### 🔄 Claude Temp (`doc/claude/`)
⚠️ **IGNORED BY GIT** - Nur für temporäre, KI-generierte Dateien
- Workspace-temporäre Ausgaben
- Experimentelle Dokumentation
- Auto-gelöscht bei Cleanup

---

## 🚀 Verwendung

### Neue Dokumentation erstellen

```bash
# Frontend-Dokumentation
doc/frontend/FEATURE-NAME.md

# Backend-Dokumentation  
doc/backend/SERVICE-NAME.md

# Projekt-Dokumentation
doc/project/TOPIC-NAME.md

# Implementierungs-Task
doc/tasks/feature-phase-topic.md
```

### Dokumentation finden

1. **Start:** [`DOCUMENTATION-INDEX.md`](project/DOCUMENTATION-INDEX.md)
2. **Suche:** Nutze VS Code Search in `doc/**/*.md`
3. **Browse:** Navigiere durch Kategorie-Ordner

---

## 🔍 Navigation

### Haupt-Index
📖 [DOCUMENTATION-INDEX.md](project/DOCUMENTATION-INDEX.md) - Vollständiger Überblick aller Dokumentationen

### Quick Links

#### Project
- [Project README](project/README.md)
- [PayPal Setup](project/PAYPAL-PDT-SETUP.md)
- [Security Audit](project/SECURITY-AUDIT-LOGIN.md)

#### Frontend
- [API Refactoring Guide](frontend/API-REFACTORING-COMPLETE.md)
- [Dark Mode Checklist](frontend/DARK-MODE-IMPLEMENTATION-CHECKLIST.md)
- [PWA Quick Reference](frontend/PWA-QUICK-REFERENCE.md)
- [Performance Optimizations](frontend/PERFORMANCE-OPTIMIZATIONS.md)

#### Tasks
- [Mobile Navigation Tasks](tasks/) - 48 individual task files

---

## 📏 Dokumentations-Richtlinien

### Dateinamen-Konvention

```
CATEGORY-SUBJECT-TYPE.md

Beispiele:
- API-REFACTORING-COMPLETE.md
- DARK-MODE-IMPLEMENTATION-CHECKLIST.md
- PWA-TESTING-GUIDE.md
- mobile-nav-p1-bottom-navigation.md
```

### Markdown-Format

```markdown
# Titel

## 🎯 Zweck
Kurzbeschreibung

## 📋 Inhalt
- ...

## ✅ Status
Status-Information
```

### Status-Badges

- ✅ Abgeschlossen
- 🚧 In Arbeit
- 📝 Geplant
- ⏸️ Pausiert
- ❌ Deprecated

---

## 🔄 Migration

Alle Markdown-Dateien wurden aus folgenden Verzeichnissen hierher verschoben:

- Root (`/`) → `doc/project/`
- `choir-app-frontend/` → `doc/frontend/`
- `docs/` → `doc/project/` oder `doc/tasks/`

**Migration Datum:** 10. Februar 2026

---

## 🛡️ Git-Regeln

### Committed (Tracked)
- ✅ `doc/project/**/*.md`
- ✅ `doc/frontend/**/*.md`
- ✅ `doc/backend/**/*.md`
- ✅ `doc/tasks/**/*.md`

### Ignored (Not Tracked)
- ❌ `doc/claude/**/*` - Temporäre Dateien
- ❌ `tmpclaude-*` - Temp directories im Root
- ❌ `*.report.html` - Test/Lighthouse Reports

---

**Last Updated:** 10. Februar 2026  
**Maintainer:** Development Team
