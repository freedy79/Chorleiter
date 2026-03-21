# Prompt- und Feature-Historie (Unabhängigkeitsnachweis)

## Ziel
Dieses Dokument dient als **forensischer Nachweis**, dass die initiale Produktentstehung und die frühen Feature-Entscheidungen in diesem Repository aus der eigenen Commit-/PR-Historie hervorgehen.

> Wichtige Grenze: Git speichert nicht automatisch den kompletten Chat-Verlauf aller Prompts. Deshalb werden hier die **reproduzierbaren Prompt-Indizien** dokumentiert: Branch-Namen, PR-Titel und Commit-Messages.

## Methodik (reproduzierbar)
Verwendete lokale Git-Befehle:

```bash
git log --reverse --date=short --pretty=format:'%h|%ad|%an|%s'
git log --reverse --date=iso --pretty=format:'%h|%ad|%s' | rg 'Merge pull request #[0-9]+ from .*/codex/'
```

Interpretation:
- `codex/<...>`-Branchnamen und PR-Titel bilden die damalige Aufgabenstellung (Prompt-Intention) ab.
- Frühe `initial ...` Commits markieren den unabhängig aufgebauten Projektstart.

## A) Initiale Features (Projektstart)

| Datum | Commit | Evidenz | Einordnung |
|---|---|---|---|
| 2025-06-26 | `d4cd3198` | `Initial commit` | Erstes Repo-Setup (Startpunkt der Eigenentwicklung) |
| 2025-06-26 | `222ae656` | `initial backend` | Initialer Backend-Aufbau |
| 2025-06-26 | `8ffa020b` | `initial editor stuff` | Früher Editor-/Domänenaufbau |
| 2025-06-26 | `bd2a0452` | `initial frontend` | Initiales Frontend-Grundgerüst |

## B) Wesentliche frühe Prompt-/Feature-Historie (aus PR- und Branchnamen)

Diese Einträge sind zeitlich früh und funktional prägend; der PR-Branchname wirkt als Prompt-Spur:

| Zeitstempel (ISO) | Merge-Commit | PR-Referenz | Prompt-/Task-Indiz (Branchname) |
|---|---|---|---|
| 2025-06-26 12:56:52 +0200 | `e4d5473f` | PR #6 | `verallgemeinere-dialog-für-komponisten-und-textdichter` |
| 2025-06-26 14:35:52 +0200 | `429490a7` | PR #7 | `komponente-für-create,-update,-delete-erweitern` |
| 2025-06-26 15:01:37 +0200 | `55fa5a76` | PR #9 | `erstelle-einladungssystem-für-benutzer` |
| 2025-06-26 15:02:15 +0200 | `fde9f269` | PR #8 | `antwortszeit-der-seite-„collections“-optimieren` |
| 2025-06-26 15:04:15 +0200 | `7605702c` | PR #11 | `ereignis-komponente-mit-editier--und-löschfunktion` |
| 2025-06-26 15:11:33 +0200 | `136c4d2e` | PR #12 | `änderungen-global-aktualisieren` |
| 2025-06-26 15:13:24 +0200 | `be701b83` | PR #13 | `filter-und-paginierung-für-repertoire-hinzufügen` |
| 2025-06-26 15:20:18 +0200 | `0dd0bdca` | PR #14 | `admin-rechte-für-löschen-und-anzeige-der-änderungen-hinzufüg` |
| 2025-06-26 22:19:29 +0200 | `389f5343` | PR #17 | `textsuche-und-filterung-für-repertoire-hinzufügen` |
| 2025-06-26 22:31:31 +0200 | `40a8cae6` | PR #20 | `backend-timeout-und-spinner-im-frontend-hinzufügen` |

## C) Warum das als Unabhängigkeitsnachweis hilft
1. **Chronologisch früher Eigenaufbau** (`Initial commit`, `initial backend`, `initial frontend`) vor späteren Ausbau-Features.
2. **Domänenspezifische Feature-Sequenz** (Einladungssystem, Repertoire-Filter, Ereignisverwaltung, Admin-Rechte), die als inkrementeller Eigenfahrplan dokumentiert ist.
3. **Prompt-Spuren in Branchnamen/PRs** zeigen konkrete Aufgabenformulierung im eigenen Workflow.

## D) Zusätzliche belastbare Nachweise (empfohlen)
Für eine formale Auseinandersetzung zusätzlich beilegen:
- Export der PR-Metadaten (Titel, Ersteller, Zeit, Diff-Statistik) via GitHub API.
- Falls vorhanden: Chat-/Prompt-Export aus dem verwendeten Assistenz-Tool.
- Signierte Tags oder Release-Artefakte mit Zeitstempeln.
- Optional: Hash-basierter Vergleich gegen behauptetes Fremd-Repo (nur strukturelle Ähnlichkeit ist kein Plagiatsbeweis).


## F) Antwort auf die Kernfrage: Belegt das auch die **Unabhängigkeit der Architekturideen**?
Kurz: **teilweise, aber nicht abschließend**.

Was aus diesem Nachweis **plausibel ableitbar** ist:
- Die Architektur- und Feature-Entwicklung ist zeitlich im eigenen Repo nachvollziehbar entstanden.
- Entscheidungen wurden inkrementell über eigene Commits/PRs mit eigener Terminologie umgesetzt.

Was daraus **nicht gerichtsfest allein** folgt:
- Dass _keine_ externe Architektur-Idee als Inspiration diente.
- Dass es _null_ konzeptionelle Überschneidungen mit anderen öffentlichen Repos gibt.

Warum diese Grenze wichtig ist:
- Git-Historie beweist Entstehung und Zeitpunkt im eigenen Repo, aber nicht automatisch die vollständige Ideenherkunft außerhalb des Repos.

Für einen stärkeren Nachweis der architektonischen Eigenständigkeit zusätzlich dokumentieren:
1. Eigene Architektur-Artefakte mit Zeitstempel (ADRs, Skizzen, frühe README-Versionen).
2. Früheste Datenmodelle/API-Schnitte und deren Evolution im Zeitverlauf.
3. Vergleichsmatrix zum behaupteten Fremd-Repo (nur abstrakte Muster, keine 1:1-Struktur-/Namenübernahme).
4. Falls möglich: unabhängige Entstehungsbelege (Issue-Diskussionen, Notizen, Chat-Export mit Datum).

## E) Kurzfazit
Die Repository-Historie zeigt einen eigenständigen, zeitlich nachvollziehbaren Projektaufbau mit klaren initialen Commits und darauf aufbauenden, separat benannten Feature-Prompts im PR-Workflow.
