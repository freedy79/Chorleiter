# UI/UX Instructions for Angular Component Development
Version: 1.0
Scope: Angular UI components (templates, styles, component logic, design tokens)
Goal: Prevent UI/UX debt by embedding product-quality heuristics into implementation.

## 0) Prime Directive
Build UI as a product surface, not as a screenshot.
Every component must be:
- understandable at first glance
- usable with keyboard and screen readers
- robust across states (loading/empty/error/disabled)
- consistent with design system + tokens
- responsive by default

If trade-offs are required: preserve clarity > consistency > aesthetics > micro-optimizations.

---

## 1) Inputs & Constraints (always honor)
Before implementing:
- Respect existing design tokens, spacing scale, typography scale, icons, component library patterns.
- Do NOT introduce new fonts, random sizes, or ad-hoc colors. Use tokens/variables.
- No “clever” custom interactions if a standard pattern exists (dropdown, dialog, table, toast).

If you must deviate, document:
- why deviation is needed
- how it stays consistent
- acceptance criteria and rollback path

---

## 2) Layout & Visual Hierarchy
### 2.1 Information Architecture
- Make the primary action obvious within 2 seconds.
- Group related elements; avoid “everything same weight.”
- Use headings and spacing to guide scanning:
  - one clear title
  - optional short description
  - content blocks with consistent padding and rhythm

### 2.2 Spacing & Rhythm
- Use a fixed spacing scale (e.g., 4/8/12/16/24/32).
- Avoid “random” pixel values.
- Prefer whitespace over borders for separation.
- Align baselines and edges; avoid near-miss alignments.

### 2.3 Density & Readability
- Don’t overcompress. If content feels cramped, reduce density or introduce progressive disclosure.
- Prefer shorter line lengths for text blocks; avoid full-width paragraphs on desktop.

---

## 3) Responsiveness & Adaptive Design
### 3.1 Breakpoints
Component must behave well at:
- mobile (320–480px)
- tablet (768–1024px)
- desktop (≥ 1280px)

### 3.2 Rules of Thumb
- Avoid horizontal scrolling except for data grids explicitly designed for it.
- Buttons/tap targets: at least ~44px height on touch.
- Ensure dialogs, menus, tooltips stay within viewport.

### 3.3 Implementation Guidance (Angular)
- Prefer CSS layout (flex/grid) over JS-driven resizing.
- Use container-aware layouts where possible.
- Avoid “magic numbers” tied to one screen size.

---

## 4) Accessibility (non-negotiable)
### 4.1 Keyboard
- All interactive elements reachable via Tab.
- Visible focus state (never remove outline without replacement).
- Logical tab order (DOM order matches visual order).

### 4.2 Semantics & ARIA
- Use native elements first (`button`, `a`, `input`, `label`).
- Add ARIA only when needed; don’t override native semantics.
- Provide accessible names:
  - icon buttons require `aria-label`
  - inputs require `<label for>` or equivalent
- Use `aria-live` for async status messages where appropriate.

### 4.3 Color/Contrast
- Don’t rely on color alone for meaning (error/success/warning must also use text/icon).
- Ensure contrast is acceptable (especially disabled text, hints, placeholders).

### 4.4 Motion
- Avoid essential info only conveyed by animation.
- Respect reduced motion preferences if your UI uses animations.

---

## 5) Component States & Resilience
Every component must define behavior for:
1) default
2) hover/focus/active (as applicable)
3) disabled
4) loading (skeleton or spinner + preserved layout)
5) empty (helpful guidance, not “nothing here”)
6) error (actionable recovery + safe fallback)
7) partial data (graceful degradation)

### 5.1 Empty State Rules
Empty states should answer:
- What is this area?
- Why is it empty?
- What can I do next?

### 5.2 Error State Rules
Error states should include:
- plain-language message
- next step (retry, edit input, contact support)
- avoid raw stack traces or cryptic codes (codes can be optional secondary info)

---

## 6) Content Design (microcopy)
- Use concise, specific labels (“Save changes” vs “OK”).
- Buttons: verb + object; avoid vague “Submit.”
- Warnings: state consequence + how to avoid it.
- Prefer sentence case unless your product style guide says otherwise.
- No sarcasm, no blame (“You did…”), no jargon unless audience expects it.

---

## 7) Interaction Design & Predictability
- Don’t surprise users: keep patterns consistent across the app.
- Avoid hidden functionality (e.g., crucial actions only on hover).
- Confirm destructive actions (delete, irreversible).
- Provide undo where feasible (especially for list removals).

### 7.1 Progressive Disclosure
- Hide advanced options behind “More options” / accordion.
- Default view should serve 80% of users 80% of the time.

---

## 8) Anti-Patterns (avoid)
- Overuse of borders/shadows to “separate” everything.
- Multiple primary buttons in one view.
- Centered long text blocks.
- Placeholder-as-label (labels must remain visible).
- Icon-only controls without accessible labels.
- “Empty table” without explanation.
- Non-standard controls (custom selects, fake checkboxes) when native/library exists.
- Layout jumps during loading.

---

## 9) Angular Implementation Rules
### 9.1 Templates
- Prefer clear template structure over clever one-liners.
- Avoid deeply nested `ngIf/ngFor`; extract subcomponents when complexity rises.
- Use `trackBy` for `*ngFor` on dynamic lists.

### 9.2 Forms
- Use Angular Reactive Forms for non-trivial forms.
- Provide inline validation messages that are:
  - specific (“Must be at least 8 characters”)
  - shown at the right time (on blur / on submit)
- Mark required fields clearly, and communicate format constraints early.

### 9.3 Performance Hygiene (UX impact)
- Avoid unnecessary change detection churn; use `OnPush` for presentational components where sensible.
- Don’t block the UI thread with heavy computations; defer or offload.
- Keep skeleton layout consistent to prevent CLS-like jumps.

### 9.4 Styling
- Use component-scoped styles, but keep design tokens global.
- Avoid hardcoded colors; use CSS variables/tokens.
- Prefer layout primitives (flex/grid) over manual margins everywhere.

---

## 10) Page-Level Responsiveness & Large Data Handling

Responsiveness does not end at component level. Page composition, data density,
and information architecture must adapt across devices.

### 10.1 Responsive Page Architecture

Avoid designing for desktop first and "shrinking later".
Design mobile → tablet → desktop progressively.

Rules:
- Reduce columns, not font size.
- Reduce visual noise before hiding essential information.
- Convert horizontal complexity into vertical stacking.
- Avoid multi-column layouts on mobile if they reduce readability.

Prefer:
- Single column layouts on mobile.
- Clear section breaks.
- Sticky primary actions only when justified (avoid covering content).

---

### 10.2 Tables: Desktop vs Mobile

Tables are optimized for comparison.
Mobile is optimized for scanning.

If a table works on desktop, it often fails on mobile due to:
- horizontal overflow
- unreadably small columns
- hidden critical information
- difficult touch interaction

#### Mobile Strategies for Tables

Choose ONE consciously:

1) Responsive Reflow (Card Mode)
   - Each row becomes a stacked card.
   - Label + value pairs displayed vertically.
   - Primary action remains obvious.
   - Good for ≤ ~8 important columns.

2) Column Prioritization
   - Only 2–3 most important columns visible on mobile.
   - Secondary info accessible via “Details” view.
   - Avoid silent column hiding.

3) Horizontal Scroll (Last Resort)
   - Only if comparison is essential.
   - Must have clear scroll affordance.
   - First column may be sticky if needed.

Avoid:
- Shrinking font size below readability.
- Truncating critical data without expansion.
- Making actions icon-only without labels.

Angular Implementation:
- Extract table row into a reusable component for alternate mobile rendering.
- Avoid duplicating logic across desktop/mobile versions.
- Use CSS layout switching rather than full structural duplication where possible.

---

### 10.3 Large Datasets & Performance

Rendering large object lists naïvely destroys perceived quality.

Never:
- Render hundreds/thousands of DOM nodes at once.
- Load entire datasets if pagination/filtering is expected.

Preferred strategies:

1) Pagination (Server-side preferred)
   - Default for business data.
   - Always show total count if meaningful.

2) Virtual Scrolling
   - Use when large datasets must behave like continuous lists.
   - Maintain consistent row height if possible.
   - Avoid heavy component trees inside virtualized rows.

3) Incremental Loading ("Load more")
   - Acceptable for moderate data.
   - Maintain scroll position on load.

---

### 10.4 Lazy Loading (Routing & Data)

At Page Level:
- Use Angular route-level lazy loading for feature modules.
- Avoid loading entire application bundles unnecessarily.

At Component Level:
- Load secondary panels only when opened (tabs, expansion panels).
- Defer expensive charts or visualizations until visible.
- Use image lazy loading (`loading="lazy"`).

At Data Level:
- Do not fetch unrelated datasets "just in case."
- Fetch on demand based on user context.

---

### 10.5 Perceived Performance

Users judge speed visually, not technically.

Best practices:
- Use skeleton loaders that preserve layout structure.
- Avoid layout shifts during loading.
- Prefetch likely-next navigation paths when appropriate.
- Show immediate feedback for user interaction.

---

### 10.6 Responsive Content Strategy

Content density must scale:
- Desktop: comparison & overview.
- Mobile: action & clarity.

Ask for each page:
- What is the primary mobile use case?
- Is this page even meaningful on mobile?
- Should functionality be reduced instead of compressed?

---

### 10.7 Responsiveness Definition of Done

A page is responsive only if:
- No horizontal scrolling (unless explicitly intentional).
- Primary action reachable without scrolling excessively.
- Touch targets usable on mobile.
- Large lists do not degrade performance.
- Tables intentionally adapted (not just shrunk).
- Navigation remains understandable on small screens.

Responsiveness is not layout resizing.
It is contextual prioritization.

---

## 11) UX Definition of Done (DoD)
A component is “done” only if:
- Visual hierarchy is clear (primary action, grouping, headings)
- Works at mobile/tablet/desktop widths without breaking
- Full keyboard navigation works + focus visible
- Labels, hints, validation messages are present and understandable
- Loading/empty/error/disabled states exist and are tested
- No new ad-hoc styles violating tokens/spacing scale
- Copy is concise and consistent with product tone
- Edge cases handled (long strings, missing values, localization length growth)

---

## 12) What the Agent should output when asked for changes
When proposing or implementing UI changes, provide:
- **Issue** (what is wrong)
- **Impact** (who it affects + severity)
- **Evidence** (where in UI / which state)
- **Fix** (concrete approach)
- **Acceptance Criteria** (testable bullet points)
- **Non-goals** (what will not be changed)

---

## 13) Quick Checklist (use before committing)
- [ ] Primary action obvious
- [ ] Consistent spacing scale
- [ ] No layout shifts on loading
- [ ] Empty state helpful
- [ ] Error state actionable
- [ ] Keyboard accessible + focus visible
- [ ] Icon buttons labeled
- [ ] Form labels persist + validation clear
- [ ] Responsive without horizontal scroll
- [ ] Tokens used (no random colors/sizes)
