# Household Finance Data Model Prompt

Der folgende Prompt enthält ein relationales Datenmodell für Haushalte, Personen, Besitze, Versicherungen und Kredite. Er integriert Kreditkarten-/Rahmenkredit-Logik und berücksichtigt Sondertilgungen zur realistischen Abbildung von Finanzverläufen.

```
Erstelle ein relationales Datenmodell mit folgenden Entitäten, Attributen und Beziehungen. Für jede Entität: Primärschlüssel id, created_at, updated_at, status (aktiv/inaktiv/gekündigt/abbezahlt/etc.).

- Haushalt: id, name, adresse?, steuer_id?, created_at, updated_at, status.
  - Beziehungen: 1:N Person; 1:N Benutzerprofil; 1:N Besitz.
  - Optional: Haushaltsweite Einstellungen, Haushalts-Steuer-ID.

- Person: id, haushalt_id FK, vorname, nachname, geburtstag, geschlecht, anschrift, steuer_id, sozialversicherungsnummer, email?, telefon?, staatsangehoerigkeit?, steuer_anssaessigkeit?, familienstand?, created_at, updated_at, status.
  - Beziehungen: 0..N Dokumente (M:N), 0..N Beschaeftigungen, 0..N Konten, 0..N Depots, 0..N Kapitalanlagen, 0..N Kredite, 0..N Versicherungen (über PersonVersicherung), 0..N GesetzlicheRente, Verwandtschaften (self M:N).

- Benutzerprofil: id, haushalt_id FK, login, name, email, passwort_hash, passworthistorie?, mfa_status?, rolle (Admin/Member/ReadOnly), created_at, updated_at, status.
  - Beziehungen: 1:N LoginHistorie; 1:N BenutzerEinstellung.

- LoginHistorie: id, benutzerprofil_id FK, timestamp, ip, device, erfolg.
- BenutzerEinstellung: id, benutzerprofil_id FK, schluessel, wert, scope, created_at, updated_at.

- Verwandtschaft: id, person_id FK, verwandte_person_id FK, typ (Elternteil/Kind/Partner/etc.), gueltig_von, gueltig_bis.

- Dokument: id, typ, titel, dateipfad, gueltig_von?, gueltig_bis?, version?, created_at, updated_at, status.
  - M:N-Zuordnungen: DokumentZuPerson, DokumentZuVersicherung, DokumentZuKredit, DokumentZuRente, DokumentZuBesitz.

- Arbeitgeber: id, name, anschrift, created_at, updated_at, status.
  - Beschaeftigung: id, person_id FK, arbeitgeber_id FK, start, ende?, rolle, gehaltsfrequenz, grundgehalt, bonus?, created_at, updated_at, status.
  - Gehaltszahlung (optional): id, beschaeftigung_id FK, zeitraum, brutto, netto, abzug_details?, created_at, updated_at.

- Besitz: id, haushalt_id FK, typ (Kfz/Immobilie/Wohnung/etc.), bezeichnung, anschrift?, baujahr?, wert, bewertungs_datum?, created_at, updated_at, status.
  - Typ-spezifisch: Kfz (marke, modell, kennzeichen, fahrgestellnr), Immobilie (wohnflaeche, baujahr, nutzungsart).
  - BesitzBewertung (Historie): id, besitz_id FK, wert, datum, quelle.
  - BesitzVersicherung (M:N zu Versicherung).
  - BesitzKredit (M:N zu Kredit).
  - Steuerlast: id, besitz_id FK, betrag, steuerart, zeitraum_von, zeitraum_bis?, faellig_am?, status.

- Versicherung: id, versicherer, produkt, policen_nr, tarif, laufzeit_von, laufzeit_bis?, verlangerung?, beitrag, zahlungsfrequenz, deckungssumme?, selbstbehalt?, status (aktiv/gekündigt/abgelaufen), versicherungsnehmer_person_id FK, created_at, updated_at.
  - PersonVersicherung (M:N): person_id FK, versicherung_id FK, rolle (versicherter/mitversicherter), gueltig_von, gueltig_bis.
  - BesitzVersicherung (M:N) für objektbezogene Policen.
  - Dokumente via DokumentZuVersicherung.

- GesetzlicheRente: id, person_id FK, rentenversicherungsnr, status (einzahlend/rentner), created_at, updated_at.
  - Dokumente via DokumentZuRente.

- Konto: id, person_id FK, institut, iban, waehrung, kontotyp (Giro/Tagesgeld/etc.), saldo?, created_at, updated_at, status.
- Depot: id, person_id FK, institut, depot_nr, waehrung, created_at, updated_at, status.
- Kapitalanlage: id, person_id FK, typ, beschreibung, wert, waehrung, created_at, updated_at, status.

- Kredit (generisch, inkl. Kreditkarten/Rahmenkredite): id, person_id FK, kreditgeber, kredit_nr, kredit_typ ENUM(annuitaet, raten, tilgung, endfaellig, dispo, rahmen, ballon, foerder), betrag, zinssatz, zinssatz_typ (fix/variabel), laufzeit_monate?, startdatum?, enddatum?, rate_monatlich?, tilgungssatz?, tilgungsplan_typ (annuitaet/linear/endfaellig/flexibel), rate_faelligkeit (monatlich/vierteljährlich/jährlich/flexibel), faelligkeit_tag_im_monat?, variable_zinsanpassungstermine?, tilgungsfreie_zeit_monate?, ballon_betrag?, mindesttilgung_betrag?, mindesttilgung_prozent?, kreditrahmen (für dispo/rahmen), inanspruchnahme (aktueller Saldo), ueberziehungsrahmen?, tilgung_flexibel (bool), besichert? (bool), created_at, updated_at, status (laufend/abbezahlt/gekündigt/in_verzug).
  - KreditBesitz (M:N) zur Verknüpfung mit Besicherungen (z. B. Immobilie/Kfz).
  - Dokumente via DokumentZuKredit.
  - KreditRateHistorie (optional): id, kredit_id FK, datum, betrag, zinsanteil?, tilgungsanteil?, saldo_nach_rate, variabler_zinssatz?.
  - KreditZinsHistorie (optional): id, kredit_id FK, gueltig_ab, zinssatz.
  - KreditVerwendung (optional): id, kredit_id FK, verwendungszweck (auto/moebel/umschuldung/etc.).
  - KreditKontoAnbindung (optional): id, kredit_id FK, konto_id FK (für Auszahlung/Lastschrift).
  - KreditSondertilgung: id, kredit_id FK, datum, betrag, herkunft (z. B. Sonderzahlung), saldo_nach_tilgung, anrechnung_auf (laufzeit/Rate/beides), kommentar?.
  - Regeln pro Typ:
    - Annuität: rate_monatlich fix; tilgungsanteil steigt, zinsanteil sinkt; tilgungsplan_typ=annuitaet.
    - Ratendarlehen (Konsumkredit): rate_monatlich fix; laufzeit_monate fix; tilgungsplan_typ=annuitaet oder linear.
    - Tilgungsdarlehen: tilgungssatz fix; rate nimmt ab; tilgungsplan_typ=linear.
    - Endfälliges Darlehen: nur Zinszahlungen; endfaelliges kapital am enddatum; tilgungsplan_typ=endfaellig.
    - Dispo: kredit_typ=dispo; kreditrahmen; inanspruchnahme variabel; zinssatz variabel, tageweise; mindesttilgung optional.
    - Rahmenkredit: kredit_typ=rahmen; kreditrahmen; mindesttilgung_betrag/prozent; zinssatz oft variabel.
    - Ballonfinanzierung: niedrige laufende rate; ballon_betrag am enddatum; tilgungsplan_typ=ballon.
    - Förderkredit: kredit_typ=foerder; zinssatz ggf. subventioniert; tilgungsfreie_zeit_monate möglich; zweckbindung (verwendungszweck Pflicht); laufzeit lang.

Schlüssel/Beziehungen (Kurzfassung):
- Haushalt 1:N Person; Haushalt 1:N Benutzerprofil; Haushalt 1:N Besitz.
- Person 0..N Beschaeftigungen; optional Gehaltszahlungen je Beschaeftigung.
- Person 0..N Dokumente (M:N); 0..N Versicherungen (M:N + 1 Versicherungsnehmer FK in Versicherung).
- Person 0..N GesetzlicheRente; 0..N Konten/Depots/Kapitalanlagen/Kredite.
- Kredit M:N Besitz; Besitz M:N Versicherung.
- Verwandtschaft self-referencing Person M:N mit Typ und Gültigkeit.
- Dokumente anhängbar an Person, Versicherung, Kredit, Rente, Besitz via separate M:N-Tabellen.
- Auditfelder (created_at/updated_at/status) durchgehend vorsehen.
```

## Ausführung des Prompts (relationales Modell)

### Tabellen (DDL-Skizze)
Die nachfolgende SQL-nahe Skizze wendet den Prompt an und strukturiert die Tabellen mit zentralen Schlüsseln, Fremdschlüsseln und Typ-spezifischen Zusatz-Tabellen.

```sql
-- Kern
CREATE TABLE haushalt (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  adresse JSONB,
  steuer_id TEXT,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE person (
  id UUID PRIMARY KEY,
  haushalt_id UUID NOT NULL REFERENCES haushalt(id),
  vorname TEXT NOT NULL,
  nachname TEXT NOT NULL,
  geburtstag DATE,
  geschlecht TEXT,
  anschrift JSONB,
  steuer_id TEXT,
  sozialversicherungsnummer TEXT,
  email TEXT,
  telefon TEXT,
  staatsangehoerigkeit TEXT,
  steuer_anssaessigkeit TEXT,
  familienstand TEXT,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE benutzerprofil (
  id UUID PRIMARY KEY,
  haushalt_id UUID NOT NULL REFERENCES haushalt(id),
  login TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  passwort_hash TEXT NOT NULL,
  passworthistorie JSONB,
  mfa_status TEXT,
  rolle TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE login_historie (
  id UUID PRIMARY KEY,
  benutzerprofil_id UUID NOT NULL REFERENCES benutzerprofil(id),
  timestamp TIMESTAMPTZ NOT NULL,
  ip INET,
  device TEXT,
  erfolg BOOLEAN NOT NULL
);

CREATE TABLE benutzer_einstellung (
  id UUID PRIMARY KEY,
  benutzerprofil_id UUID NOT NULL REFERENCES benutzerprofil(id),
  schluessel TEXT NOT NULL,
  wert JSONB NOT NULL,
  scope TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Relationen zwischen Personen
CREATE TABLE verwandtschaft (
  id UUID PRIMARY KEY,
  person_id UUID NOT NULL REFERENCES person(id),
  verwandte_person_id UUID NOT NULL REFERENCES person(id),
  typ TEXT NOT NULL,
  gueltig_von DATE,
  gueltig_bis DATE
);

-- Dokumente und Attachments
CREATE TABLE dokument (
  id UUID PRIMARY KEY,
  typ TEXT NOT NULL,
  titel TEXT NOT NULL,
  dateipfad TEXT NOT NULL,
  gueltig_von DATE,
  gueltig_bis DATE,
  version TEXT,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE dokument_zu_person (
  dokument_id UUID REFERENCES dokument(id),
  person_id UUID REFERENCES person(id),
  PRIMARY KEY (dokument_id, person_id)
);

CREATE TABLE dokument_zu_versicherung (
  dokument_id UUID REFERENCES dokument(id),
  versicherung_id UUID REFERENCES versicherung(id),
  PRIMARY KEY (dokument_id, versicherung_id)
);

CREATE TABLE dokument_zu_kredit (
  dokument_id UUID REFERENCES dokument(id),
  kredit_id UUID REFERENCES kredit(id),
  PRIMARY KEY (dokument_id, kredit_id)
);

CREATE TABLE dokument_zu_rente (
  dokument_id UUID REFERENCES dokument(id),
  rente_id UUID REFERENCES gesetzliche_rente(id),
  PRIMARY KEY (dokument_id, rente_id)
);

CREATE TABLE dokument_zu_besitz (
  dokument_id UUID REFERENCES dokument(id),
  besitz_id UUID REFERENCES besitz(id),
  PRIMARY KEY (dokument_id, besitz_id)
);

-- Arbeit
CREATE TABLE arbeitgeber (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  anschrift JSONB,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE beschaeftigung (
  id UUID PRIMARY KEY,
  person_id UUID NOT NULL REFERENCES person(id),
  arbeitgeber_id UUID NOT NULL REFERENCES arbeitgeber(id),
  start DATE,
  ende DATE,
  rolle TEXT,
  gehaltsfrequenz TEXT,
  grundgehalt NUMERIC,
  bonus NUMERIC,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE gehaltszahlung (
  id UUID PRIMARY KEY,
  beschaeftigung_id UUID NOT NULL REFERENCES beschaeftigung(id),
  zeitraum_datum DATE,
  brutto NUMERIC,
  netto NUMERIC,
  abzug_details JSONB,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Besitz
CREATE TABLE besitz (
  id UUID PRIMARY KEY,
  haushalt_id UUID NOT NULL REFERENCES haushalt(id),
  typ TEXT NOT NULL,
  bezeichnung TEXT,
  anschrift JSONB,
  baujahr INT,
  wert NUMERIC,
  bewertungs_datum DATE,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE besitz_bewertung (
  id UUID PRIMARY KEY,
  besitz_id UUID NOT NULL REFERENCES besitz(id),
  wert NUMERIC NOT NULL,
  datum DATE NOT NULL,
  quelle TEXT
);

CREATE TABLE besitz_versicherung (
  besitz_id UUID REFERENCES besitz(id),
  versicherung_id UUID REFERENCES versicherung(id),
  PRIMARY KEY (besitz_id, versicherung_id)
);

CREATE TABLE besitz_kredit (
  besitz_id UUID REFERENCES besitz(id),
  kredit_id UUID REFERENCES kredit(id),
  PRIMARY KEY (besitz_id, kredit_id)
);

CREATE TABLE steuerlast (
  id UUID PRIMARY KEY,
  besitz_id UUID NOT NULL REFERENCES besitz(id),
  betrag NUMERIC NOT NULL,
  steuerart TEXT,
  zeitraum_von DATE,
  zeitraum_bis DATE,
  faellig_am DATE,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Versicherungen
CREATE TABLE versicherung (
  id UUID PRIMARY KEY,
  versicherer TEXT NOT NULL,
  produkt TEXT,
  policen_nr TEXT,
  tarif TEXT,
  laufzeit_von DATE,
  laufzeit_bis DATE,
  verlangerung BOOLEAN,
  beitrag NUMERIC,
  zahlungsfrequenz TEXT,
  deckungssumme NUMERIC,
  selbstbehalt NUMERIC,
  status TEXT NOT NULL,
  versicherungsnehmer_person_id UUID REFERENCES person(id),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE person_versicherung (
  person_id UUID REFERENCES person(id),
  versicherung_id UUID REFERENCES versicherung(id),
  rolle TEXT,
  gueltig_von DATE,
  gueltig_bis DATE,
  PRIMARY KEY (person_id, versicherung_id)
);

-- Rente
CREATE TABLE gesetzliche_rente (
  id UUID PRIMARY KEY,
  person_id UUID NOT NULL REFERENCES person(id),
  rentenversicherungsnr TEXT,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Finanzen
CREATE TABLE konto (
  id UUID PRIMARY KEY,
  person_id UUID NOT NULL REFERENCES person(id),
  institut TEXT,
  iban TEXT,
  waehrung TEXT,
  kontotyp TEXT,
  saldo NUMERIC,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE depot (
  id UUID PRIMARY KEY,
  person_id UUID NOT NULL REFERENCES person(id),
  institut TEXT,
  depot_nr TEXT,
  waehrung TEXT,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE kapitalanlage (
  id UUID PRIMARY KEY,
  person_id UUID NOT NULL REFERENCES person(id),
  typ TEXT,
  beschreibung TEXT,
  wert NUMERIC,
  waehrung TEXT,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TYPE kredit_typ_enum AS ENUM (
  'annuitaet','raten','tilgung','endfaellig','dispo','rahmen','ballon','foerder'
);

CREATE TYPE tilgungsplan_typ_enum AS ENUM (
  'annuitaet','linear','endfaellig','flexibel','ballon'
);

CREATE TABLE kredit (
  id UUID PRIMARY KEY,
  person_id UUID NOT NULL REFERENCES person(id),
  kreditgeber TEXT,
  kredit_nr TEXT,
  kredit_typ kredit_typ_enum NOT NULL,
  betrag NUMERIC,
  zinssatz NUMERIC,
  zinssatz_typ TEXT,
  laufzeit_monate INT,
  startdatum DATE,
  enddatum DATE,
  rate_monatlich NUMERIC,
  tilgungssatz NUMERIC,
  tilgungsplan_typ tilgungsplan_typ_enum,
  rate_faelligkeit TEXT,
  faelligkeit_tag_im_monat INT,
  variable_zinsanpassungstermine JSONB,
  tilgungsfreie_zeit_monate INT,
  ballon_betrag NUMERIC,
  mindesttilgung_betrag NUMERIC,
  mindesttilgung_prozent NUMERIC,
  kreditrahmen NUMERIC,
  inanspruchnahme NUMERIC,
  ueberziehungsrahmen NUMERIC,
  tilgung_flexibel BOOLEAN,
  besichert BOOLEAN,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE kredit_besitz (
  kredit_id UUID REFERENCES kredit(id),
  besitz_id UUID REFERENCES besitz(id),
  PRIMARY KEY (kredit_id, besitz_id)
);

CREATE TABLE kredit_rate_historie (
  id UUID PRIMARY KEY,
  kredit_id UUID NOT NULL REFERENCES kredit(id),
  datum DATE NOT NULL,
  betrag NUMERIC NOT NULL,
  zinsanteil NUMERIC,
  tilgungsanteil NUMERIC,
  saldo_nach_rate NUMERIC,
  variabler_zinssatz NUMERIC
);

CREATE TABLE kredit_zins_historie (
  id UUID PRIMARY KEY,
  kredit_id UUID NOT NULL REFERENCES kredit(id),
  gueltig_ab DATE NOT NULL,
  zinssatz NUMERIC NOT NULL
);

CREATE TABLE kredit_verwendung (
  id UUID PRIMARY KEY,
  kredit_id UUID NOT NULL REFERENCES kredit(id),
  verwendungszweck TEXT NOT NULL
);

CREATE TABLE kredit_konto_anbindung (
  id UUID PRIMARY KEY,
  kredit_id UUID NOT NULL REFERENCES kredit(id),
  konto_id UUID NOT NULL REFERENCES konto(id)
);

CREATE TABLE kredit_sondertilgung (
  id UUID PRIMARY KEY,
  kredit_id UUID NOT NULL REFERENCES kredit(id),
  datum DATE NOT NULL,
  betrag NUMERIC NOT NULL,
  herkunft TEXT,
  saldo_nach_tilgung NUMERIC,
  anrechnung_auf TEXT, -- laufzeit | rate | beides
  kommentar TEXT
);
```

### Hinweis zur Nutzung
- Die DDL-Skizze ist technologieagnostisch (PostgreSQL-Syntax als Referenz) und lässt sich auf andere SQL-Dialekte übertragen.
- Kreditarten werden über `kredit_typ` und `tilgungsplan_typ` unterschieden; Sondertilgungen fließen über `kredit_sondertilgung` in die reale Verlaufsmessung ein und können bei Bedarf den Tilgungsplan neu berechnen.
- Dokumente sind polymorph über M:N-Tabellen anbindbar, sodass Policen, Kreditverträge, Rentenschreiben oder Besitzdokumente zentral abgelegt werden können.
- Historientabellen (`kredit_rate_historie`, `kredit_zins_historie`, `besitz_bewertung`) erlauben exakte zeitliche Finanzverläufe.
