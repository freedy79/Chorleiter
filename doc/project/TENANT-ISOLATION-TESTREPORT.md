# Tenant Isolation Testreport (Initial)

Stand: 2026-06-17

## Ziel

Nachweis, dass Daten zwischen Chören (Mandanten) strikt getrennt sind.

## Testdesign

- Mandant A: User A1 (director), A2 (singer)
- Mandant B: User B1 (director), B2 (singer)

## Kernprüfungen

- [ ] Nach Wechsel A→B sind keine A-Daten mehr sichtbar (Listen, Details, Cache)
- [ ] Direktlinks mit fremden IDs liefern keine fremden Daten
- [ ] Suchergebnisse enthalten nur Daten des aktiven Mandanten
- [ ] Formulare, Beiträge, Chat, Noten, Programme bleiben tenant-isoliert
- [ ] Browser Back/Forward verursacht kein Cross-Tenant-Leak

## Befundstatus

- Status: **offen (Testdurchführung ausstehend)**

## Nächste Schritte

- [ ] E2E-Testläufe mit 2 Mandanten durchführen
- [ ] Befunde je Modul eintragen (Pass/Fail)
