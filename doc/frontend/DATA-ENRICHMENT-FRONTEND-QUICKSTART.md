# Data Enrichment Frontend - Quick Start Guide (Phase 7)

**Current Status**: Backend Complete ✅  
**Next Phase**: Frontend Components (Angular standalone components + Material Design)  
**Location**: `choir-app-frontend/src/app/features/admin/data-enrichment/`

---

## 📋 Phase 7 Tasks Overview

### Component Structure
```
data-enrichment/
├── data-enrichment.component.ts          (Main container, 4-tab interface)
├── dashboard/
│   └── enrichment-dashboard.component.ts (Statistics cards, costs, charts)
├── settings/
│   └── enrichment-settings.component.ts  (Provider config, API keys, budget)
├── suggestions/
│   └── enrichment-suggestions.component.ts (Review interface, side-by-side)
├── jobs/
│   └── enrichment-jobs.component.ts      (Job history, logs, details)
└── shared/
    ├── provider-icon.component.ts        (Gemini/Claude icon display)
    ├── stats-card.component.ts           (Cost/success cards)
    ├── suggestion-preview.component.ts   (Confidence badges, source tags)
    └── enrichment.service.ts             (API communication)
```

---

## 🎨 Main Component Structure

### data-enrichment.component.ts
```typescript
selector: 'app-data-enrichment'
template:
  - Header with title + description
  - 4 mat-tabs:
    1. Dashboard (statistics overview)
    2. Settings (configuration)
    3. Suggestions (review queue)
    4. Jobs (history)
  - FAB for creating new jobs
```

### Tab 1: Dashboard
```
┌─────────────────────────────────────┐
│ Data Enrichment Dashboard           │
├─────────────────────────────────────┤
│ [4 Cards in 2x2 grid]               │
│ ┌──────────┐  ┌──────────┐          │
│ │ Total    │  │ Success  │          │
│ │ Jobs: 12 │  │ Rate: 94%│          │
│ └──────────┘  └──────────┘          │
│ ┌──────────┐  ┌──────────┐          │
│ │ Total    │  │ Monthly  │          │
│ │ Cost:    │  │ Budget:  │          │
│ │ $2.47    │  │ $3/$50   │          │
│ └──────────┘  └──────────┘          │
│                                     │
│ [Optional Chart: Cost over time]    │
│ [Provider Breakdown Table]          │
└─────────────────────────────────────┘
```

### Tab 2: Settings  
```
┌─────────────────────────────────────┐
│ Enrichment Configuration            │
├─────────────────────────────────────┤
│                                     │
│ PRIMARY PROVIDER SELECTION          │
│ ○ Gemini (recommended) $0.000035/pc│
│ ○ Claude                 $0.001667/pc│
│ ○ OpenAI                 $0.00071/pc │
│                                     │
│ FALLBACK PROVIDER (for low conf)   │
│ ○ Claude (recommended)              │
│ ○ OpenAI                            │
│                                     │
│ [Test Connection] [Status: ✓ OK]   │
│                                     │
│ API KEYS                            │
│ Provider: [dropdown]                │
│ API Key: [password field]           │
│ [Encrypt & Save]                    │
│ [Test] [Status: ✓ Connected]        │
│                                     │
│ BUDGET & SCHEDULING                │
│ Monthly Budget: [$ 50      ]        │
│ Current Month: $2.47 / $50 ████░░  │
│ Schedule: [0 2 * * *] (2 AM daily)  │
│ Auto-Approve (>0.95): [Toggle]      │
│                                     │
│ [Save Changes]                      │
└─────────────────────────────────────┘
```

### Tab 3: Suggestions Queue
```
┌────────────────────────────────────┐
│ Pending Suggestions (Filter/Sort) │
├────────────────────────────────────┤
│ Filters:                            │
│ [Min Confidence ≥ 0.5] [Source ▼]  │
│ [Only High Confidence] [Apply All] │
│                                     │
│ ┌─ Suggestion 1 ─────────────────┐ │
│ │ Piece: "Symphony No. 5"         │ │
│ │ Field: Opus                     │ │
│ │ Current: [empty]                │ │
│ │ Suggested: Op. 67 [★★★☆☆ 0.92] │ │
│ │ Source: MusicBrainz             │ │
│ │ Reason: Well-documented work    │ │
│ │ [Approve] [Reject] [Learn More] │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─ Suggestion 2 ─────────────────┐ │
│ │ ...                             │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Load More] or Pagination           │
└────────────────────────────────────┘
```

### Tab 4: Job History
```
┌────────────────────────────────────┐
│ Enrichment Jobs History             │
├────────────────────────────────────┤
│ [New Job] [Refresh]                │
│                                     │
│ Table:                              │
│ Created | Type | Status | Items | $ │
│ ────────────────────────────────    │
│ 2h ago  |piece|✓ Done  | 100  |$4.2│
│ 1d ago  |comp |✓ Done  |  50  |$2.1│
│ 1w ago  |pub  |⏱ Failed|  25  |$0.8│
│                                     │
│ [Click for details]                │
│ ─ Job Details ─                    │
│   - 100 pieces processed            │
│   - 87 suggestions (0.87 ratio)     │
│   - 82 applied (94% approval rate)  │
│   - Cost: $4.12                     │
│   - 45 min execution time           │
│                                     │
└────────────────────────────────────┘
```

---

## 🔌 API Integration Points

All requests to `/api/admin/enrichment/*` (documented in backend summary)

### Key Service Methods (enrichment.service.ts)
```typescript
// Settings
getSettings()                          // GET /settings
updateSetting(key, value, type)        // POST /settings
setApiKey(provider, key)               // POST /api-keys
getProviders()                         // GET /providers

// Jobs
createJob(jobType, fields, options)    // POST /jobs
getJob(jobId)                          // GET /jobs/:jobId

// Suggestions
getSuggestions(jobId, filters)         // GET /suggestions?jobId=...
reviewSuggestion(id, status)           // POST /.../review
applySuggestion(id)                    // POST /.../apply

// Statistics
getStatistics(from?, to?)              // GET /statistics
```

---

## 🎯 Implementation Order

### Week 1-2: Core Infrastructure
1. Create main `data-enrichment.component.ts` (container)
2. Create `enrichment.service.ts` (API facade)
3. Create shared components:
   - `stats-card.component.ts`
   - `provider-icon.component.ts`
   - `suggestion-preview.component.ts`

### Week 3-4: Tab Components
4. Implement `enrichment-dashboard.component.ts`
5. Implement `enrichment-settings.component.ts`
6. Implement `enrichment-suggestions.component.ts`
7. Implement `enrichment-jobs.component.ts`

### Week 5+: Polish & Testing
8. Styling & responsive design
9. Dark mode support
10. Unit & integration tests
11. E2E tests

---

## 🛠️ Technical Requirements

### Material Components Needed
- `MatTabsModule` - Tab interface
- `MatCardModule` - Statistics cards
- `MatFormFieldModule` - Input fields
- `MatSelectModule` - Provider dropdown
- `MatTableModule` - Job history table
- `MatButtonModule` - Action buttons
- `MatIconModule` - Icons
- `MatTooltipModule` - Helpful hints
- `MatProgressBarModule` - Budget visualization
- `MatDialogModule` - Job details dialog
- `MatToggleModule` - Auto-approve switch
- `MatChipsModule` - Confidence badges + source tags
- `MatProgressSpinnerModule` - Loading states

### Angular Features
- Standalone components (no module declarations)
- RxJS observables for state management
- Reactive Forms for settings
- Change detection strategy: OnPush
- Smart preloading strategy

### SCSS Requirements
- Use `_breakpoints.scss` for responsive design
- Use `_dark-mode-variables.scss` for theming
- Responsive font sizes on mobile devices
- Card-based layout for statistics
- Side-by-side for piece editing (before/after)

---

## 💡 Key UI/UX Patterns

### Pattern 1: Settings Validation
```typescript
Form → Preview Changes → Test Connection → Save (on success)
```

### Pattern 2: Suggestion Review
```typescript
List → Click Suggestion → Side-by-side comparison → Approve/Reject → Update table
```

### Pattern 3: Job Creation
```typescript
New Job → Select Type → Choose Fields → Review Cost Estimate → Confirm → Monitor Progress
```

### Pattern 4: Statistics Real-time
```typescript
Dashboard → Poll /api/admin/enrichment/statistics every 30s → Update cards
```

---

## 📱 Responsive Breakpoints

- **Handset** (<600px): Stack cards, vertical layout, collapse tables
- **Tablet** (600-960px): 2-column grid for cards
- **Desktop** (>960px): Full 4-card grid + charts

---

## 🔐 Security Considerations

- API keys displayed as `****...xxxx` (masked)
- Don't send full API key to frontend unnecessarily
- Use HttpOnly cookies for session
- CSRF protection on POST requests
- Validate user is admin on frontend + backend

---

## 📊 State Management Pattern

Recommended using RxJS with:
```typescript
// enrichment.service.ts
private jobsSubject = new BehaviorSubject<Job[]>([]);
jobs$ = this.jobsSubject.asObservable();

private settingsSubject = new BehaviorSubject<Settings>({});
settings$ = this.settingsSubject.asObservable();

// Components use: enrichmentService.jobs$ | async
```

Or optional NgRx for more complex state if needed.

---

## 🧪 Testing Priorities

1. **Unit Tests**
   - enrichment.service.ts API calls
   - Stats calculations
   - Form validation

2. **Integration Tests**
   - Settings edit → Save → Verify
   - Job creation → Mock API response
   - Suggestion review workflow

3. **E2E Tests** (optional)
   - Full user flow from settings → job creation → review → apply
   - Cost tracking verification

---

## 📚 Reference Files (Existing Patterns)

Study these files for component patterns:
- `choir-app-frontend/src/app/features/admin/system-settings/`
- `choir-app-frontend/src/app/features/admin/mail-management/`
- Look for: Form handling, Material table usage, loading states

---

## 🚀 Quick Start Code Template

```typescript
// data-enrichment.component.ts
import { Component, OnInit } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { CommonModule } from '@angular/common';
import { EnrichmentService } from './shared/enrichment.service';

@Component({
  selector: 'app-data-enrichment',
  standalone: true,
  imports: [CommonModule, MatTabsModule],
  template: `
    <div class="enrichment-container">
      <h1>Data Enrichment Agent</h1>
      <mat-tab-group>
        <mat-tab label="Dashboard">
          <span matTabLabel>
            <mat-icon>dashboard</mat-icon>
            Dashboard
          </span>
          <app-enrichment-dashboard></app-enrichment-dashboard>
        </mat-tab>
        <!-- ... other tabs -->
      </mat-tab-group>
    </div>
  `
})
export class DataEnrichmentComponent implements OnInit {
  constructor(private enrichmentService: EnrichmentService) {}
  
  ngOnInit() {
    this.enrichmentService.initialize();
  }
}
```

---

## 📞 Next Steps

1. Review this guide and backend summary
2. Create feature folder structure
3. Start with `enrichment.service.ts` (API communication)
4. Build shared components
5. Implement tab-by-tab

**Estimated time**: 3-4 weeks for full implementation + testing

**Questions?** Check DATA-ENRICHMENT-IMPLEMENTATION-SUMMARY.md in backend folder
