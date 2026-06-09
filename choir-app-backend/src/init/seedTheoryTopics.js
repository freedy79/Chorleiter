const db = require('../models');
const logger = require('../config/logger');

/**
 * Seeds the music-theory knowledge base.
 * Topics are grouped into categories: grundlagen, tonhoehen_rhythmen,
 * tonleitern_intervalle, harmonien_akkorde, anhang.
 *
 * Each topic carries Markdown content plus optional `relatedExercises`
 * (module + difficulty pairs) for cross-linking to the ear-training UI.
 */
async function seedTheoryTopics(force = false) {
    try {
        const count = await db.theory_topic.count();
        if (count > 0 && !force) {
            logger.debug('[Seed] Theory topics already exist, skipping seed.');
            return;
        }

        const topics = [
            // ===================== GRUNDLAGEN DER NOTENSCHRIFT =====================
            {
                key: 'notensystem',
                category: 'grundlagen',
                title: 'Das Notensystem',
                summary: 'Linien, Zwischenräume, Hilfslinien, Notenschlüssel.',
                content: `## Das Notensystem

Das Notensystem besteht aus **fünf Linien** und **vier Zwischenräumen**. Auf
und zwischen diesen Linien werden die Töne als Noten platziert. Linien werden
von **unten nach oben** gezählt.

### Notenschlüssel

* **Violinschlüssel (G-Schlüssel)** – legt das ¹g (g¹) auf die zweite Linie.
  Standard für Sopran, Alt, Tenor (oktaviert) und die rechte Hand am Klavier.
* **Bassschlüssel (F-Schlüssel)** – legt das ¹f (f) auf die vierte Linie.
  Standard für Bass und die linke Hand am Klavier.
* **C-Schlüssel** (Alt-, Tenorschlüssel) – legt das ¹c auf die jeweilige
  Linie. In moderner Chormusik selten, aber in der Bratschen- und
  historischen Literatur wichtig.

### Hilfslinien

Reichen die fünf Hauptlinien nicht aus, werden **Hilfslinien** über oder
unter dem System eingezeichnet (z. B. das ¹c¹ unter dem Violinschlüssel).`,
                relatedExercises: [
                    { module: 'note_reading', difficulty: 'beginner' }
                ],
                orderIndex: 1
            },
            {
                key: 'notenwerte',
                category: 'grundlagen',
                title: 'Notenwerte & Pausen',
                summary: 'Ganz-, Halb-, Viertel-, Achtelnoten und punktierte Werte.',
                content: `## Notenwerte und Pausen

| Note | Pause | Wert in Vierteln |
|---|---|---|
| 𝅝 Ganze | 𝄻 | 4 |
| 𝅗𝅥 Halbe | 𝄼 | 2 |
| ♩ Viertel | 𝄽 | 1 |
| ♪ Achtel | 𝄾 | ½ |
| ♬ Sechzehntel | 𝄿 | ¼ |

### Punktierung
Ein **Punkt** rechts neben einer Note verlängert ihren Wert um die Hälfte.
Beispiel: ♩. = ♩ + ♪ = 1½ Viertel.

### Triolen
**Drei** Noten in der Dauer von **zwei** gleichwertigen Noten.
Notation mit »3« über/unter der Gruppe.

### Bindebogen
Ein gebogener Strich zwischen zwei Noten **derselben Tonhöhe** addiert die
Werte zu einer durchgehenden Note.`,
                relatedExercises: [
                    { module: 'rhythm', difficulty: 'beginner' },
                    { module: 'rhythm', difficulty: 'intermediate' }
                ],
                orderIndex: 2
            },
            {
                key: 'taktarten',
                category: 'grundlagen',
                title: 'Taktarten',
                summary: 'Einfache, zusammengesetzte und ungerade Taktarten.',
                content: `## Taktarten

Die **Taktart** legt fest, wie viele Zählzeiten ein Takt hat und welcher
Notenwert die Grundeinheit bildet (oben = Anzahl, unten = Wert).

### Einfache Taktarten
* **2/4** – Marsch, Polka. Schwerpunkt auf 1.
* **3/4** – Walzer, Mazurka. Schwerpunkt auf 1, leichte Nebenakzente.
* **4/4** – Gängiger Choralruf. Schwerpunkte auf 1 und 3.

### Zusammengesetzte Taktarten
* **6/8** – zwei Dreiergruppen pro Takt. Schwerpunkte auf 1 und 4.
* **9/8** – drei Dreiergruppen.
* **12/8** – vier Dreiergruppen.

### Ungerade Taktarten
* **5/4** und **7/8** – Aufteilung z. B. in 2+3 bzw. 2+2+3 Achtel.`,
                relatedExercises: [
                    { module: 'rhythm', difficulty: 'intermediate' },
                    { module: 'rhythm', difficulty: 'advanced' }
                ],
                orderIndex: 3
            },

            // ===================== TONHÖHEN UND RHYTHMEN =====================
            {
                key: 'tonhoehen',
                category: 'tonhoehen_rhythmen',
                title: 'Tonhöhen & Versetzungszeichen',
                summary: 'Stammtöne, Vorzeichen, enharmonische Verwechslung.',
                content: `## Stammtöne und Versetzungszeichen

Es gibt **sieben Stammtöne**: C, D, E, F, G, A, H (engl. B).
Diese wiederholen sich in **Oktaven**.

### Versetzungszeichen
* **♯ (Kreuz)** – erhöht den Ton um einen Halbton. *cis, dis, …*
* **♭ (Be)** – erniedrigt den Ton um einen Halbton. *des, es, ges, …*
* **♮ (Auflösungszeichen)** – hebt eine vorherige Alteration auf.
* **𝄪 (Doppelkreuz)** und **𝄫 (Doppel-Be)** – ±2 Halbtöne.

### Enharmonische Verwechslung
Töne klingen gleich, werden aber unterschiedlich geschrieben:
fis = ges, dis = es, ais = b.`,
                relatedExercises: [
                    { module: 'note_reading', difficulty: 'beginner' },
                    { module: 'note_reading', difficulty: 'intermediate' }
                ],
                orderIndex: 10
            },
            {
                key: 'rhythmus_diktat',
                category: 'tonhoehen_rhythmen',
                title: 'Rhythmus hören & notieren',
                summary: 'Grundsätze des Rhythmusdiktats.',
                content: `## Rhythmus hören und notieren

Beim **Rhythmusdiktat** wird ein kurzer Rhythmus mehrfach vorgespielt und
muss notiert werden.

### Vorgehen
1. **Taktart und Tempo** erfassen – Schwerpunkte zählen.
2. **Grundpuls** halten (z. B. mitklopfen).
3. **Vierertöne und Achtel** unterscheiden – Untergliederung der Schläge.
4. **Pausen** explizit hinhören und markieren.
5. **Punktierungen und Synkopen** zuletzt einsetzen.

### Häufige Stolpersteine
* **Synkopen** verlagern den Akzent von der schweren auf die leichte
  Zählzeit.
* **Triolen** werden gerne als punktierter Rhythmus verwechselt.
* **Sechzehntel-Gruppen** auf einen Schlag genau verteilen.`,
                relatedExercises: [
                    { module: 'rhythm', difficulty: 'beginner' },
                    { module: 'ear_training', difficulty: 'intermediate' }
                ],
                orderIndex: 11
            },

            // ===================== TONLEITERN UND INTERVALLE =====================
            {
                key: 'tonleitern',
                category: 'tonleitern_intervalle',
                title: 'Dur- und Molltonleitern',
                summary: 'Aufbau, Halbtonschritte, Mollvarianten.',
                content: `## Tonleitern

### Dur-Tonleiter
Halbtonschritte zwischen **3↔4** und **7↔8**.
Schema (Ganz/Halb): G G H G G G H.
Beispiel C-Dur: C-D-E-F-G-A-H-C.

### Moll-Tonleitern
Drei Varianten:
* **Natürliches Moll** – Halbtöne zwischen 2↔3 und 5↔6.
* **Harmonisches Moll** – wie natürliches Moll, aber 7. Stufe erhöht
  (Leitton). Erzeugt übermäßige Sekunde zwischen 6 und 7.
* **Melodisches Moll** – aufwärts 6. und 7. erhöht, abwärts wie natürliches.

Beispiel a-Moll natürlich: A-H-C-D-E-F-G-A.

### Kirchentonarten (Modi)
Aus den Stammtönen abgeleitet:
**Ionisch (Dur), Dorisch, Phrygisch, Lydisch, Mixolydisch, Äolisch (Moll),
Lokrisch.**`,
                relatedExercises: [
                    { module: 'ear_training', difficulty: 'beginner' },
                    { module: 'ear_training', difficulty: 'advanced' }
                ],
                orderIndex: 20
            },
            {
                key: 'intervalle',
                category: 'tonleitern_intervalle',
                title: 'Intervalle',
                summary: 'Bezeichnung, Größe und Qualität von Intervallen.',
                content: `## Intervalle

Ein **Intervall** ist der Abstand zwischen zwei Tönen.

### Bezeichnung
Aus der **Stufenanzahl** ergibt sich der Name:
1 = Prime, 2 = Sekunde, 3 = Terz, 4 = Quarte, 5 = Quinte, 6 = Sexte,
7 = Septime, 8 = Oktave.

### Qualität
* **Reine** Intervalle: 1, 4, 5, 8.
* **Große/kleine** Intervalle: 2, 3, 6, 7.
* **Vermindert** (½ Halbton kleiner als rein/klein) und
  **übermäßig** (½ Halbton größer als rein/groß).

| Halbtöne | Intervall |
|---|---|
| 0 | Reine Prime |
| 1 | Kleine Sekunde |
| 2 | Große Sekunde |
| 3 | Kleine Terz |
| 4 | Große Terz |
| 5 | Reine Quarte |
| 6 | Tritonus |
| 7 | Reine Quinte |
| 8 | Kleine Sexte |
| 9 | Große Sexte |
| 10 | Kleine Septime |
| 11 | Große Septime |
| 12 | Reine Oktave |

→ siehe auch **Anhang: Intervall-Übersicht**.`,
                relatedExercises: [
                    { module: 'note_reading', difficulty: 'intermediate' },
                    { module: 'ear_training', difficulty: 'beginner' },
                    { module: 'ear_training', difficulty: 'intermediate' },
                    { module: 'ear_training', difficulty: 'advanced' }
                ],
                orderIndex: 21
            },

            // ===================== HARMONIEN UND AKKORDE =====================
            {
                key: 'dreiklaenge',
                category: 'harmonien_akkorde',
                title: 'Dreiklänge & Umkehrungen',
                summary: 'Dur, Moll, vermindert, übermäßig – Grundstellung und Umkehrungen.',
                content: `## Dreiklänge

Ein **Dreiklang** besteht aus drei in **Terzen** geschichteten Tönen:
Grundton – Terz – Quinte.

### Vier Akkordtypen
| Typ | Terz unten | Terz oben | Quinte |
|---|---|---|---|
| Dur | groß | klein | rein |
| Moll | klein | groß | rein |
| Vermindert | klein | klein | vermindert |
| Übermäßig | groß | groß | übermäßig |

### Umkehrungen
* **Grundstellung** – Grundton im Bass (z. B. C-E-G).
* **1. Umkehrung (Sextakkord)** – Terz im Bass (E-G-C).
* **2. Umkehrung (Quartsextakkord)** – Quinte im Bass (G-C-E).

Die Bezeichnung leitet sich vom Intervall **über dem Bass** ab.`,
                relatedExercises: [
                    { module: 'ear_training', difficulty: 'beginner' },
                    { module: 'ear_training', difficulty: 'intermediate' },
                    { module: 'ear_training', difficulty: 'advanced' }
                ],
                orderIndex: 30
            },
            {
                key: 'septakkorde',
                category: 'harmonien_akkorde',
                title: 'Septakkorde & Stellungen',
                summary: 'Maj7, Dom7, Moll7, halbverm. Septakkord, deren Umkehrungen.',
                content: `## Septakkorde

Ein **Septakkord** ist ein Dreiklang mit zusätzlicher Septime.

| Symbol | Aufbau (Halbtöne) | Klangcharakter |
|---|---|---|
| **Maj7** | 4-3-4 | hell, sehnsuchtsvoll |
| **Dom7** | 4-3-3 | drängend, strebt zur Auflösung |
| **m7** (Moll7) | 3-4-3 | weich, jazzig |
| **m7♭5 / ø7** (halbverm.) | 3-3-4 | spannungsvoll, vor V |
| **°7** (vermindert) | 3-3-3 | dissonant, modulationsfähig |

### Umkehrungen
* **Grundstellung** – Grundton im Bass
* **1. Umkehrung (Quintsextakkord)** – Terz im Bass
* **2. Umkehrung (Terzquartakkord)** – Quinte im Bass
* **3. Umkehrung (Sekundakkord)** – Septime im Bass`,
                relatedExercises: [
                    { module: 'ear_training', difficulty: 'intermediate' },
                    { module: 'ear_training', difficulty: 'advanced' }
                ],
                orderIndex: 31
            },
            {
                key: 'kadenzen',
                category: 'harmonien_akkorde',
                title: 'Funktionen & Kadenzen',
                summary: 'Tonika, Subdominante, Dominante; authentisch, plagal, Trugschluss.',
                content: `## Harmonische Funktionen

In Dur und Moll werden Akkorde nach **Funktionen** klassifiziert:
* **T** (Tonika, I. Stufe) – Ruhepunkt.
* **S** (Subdominante, IV.) – Aufbau von Spannung.
* **D** (Dominante, V.) – maximale Spannung, strebt zur Tonika.

### Kadenzformen
* **Authentische Kadenz**: T – S – D – T.
* **Plagale Kadenz**: T – S – T (»Amen-Schluss«).
* **Halbschluss**: endet auf der Dominante.
* **Trugschluss**: D → VI statt D → T.

### Stufentheorie
Jede Stufe einer Tonart hat einen Akkord; Großbuchstaben für Dur,
Kleinbuchstaben für Moll: I – ii – iii – IV – V – vi – vii°.`,
                relatedExercises: [
                    { module: 'ear_training', difficulty: 'advanced' }
                ],
                orderIndex: 32
            },

            // ===================== ANHANG =====================
            {
                key: 'quintenzirkel',
                category: 'anhang',
                title: 'Quintenzirkel',
                summary: 'Alle Dur- und parallelen Molltonarten mit Vorzeichen.',
                content: `## Quintenzirkel

Der **Quintenzirkel** ordnet alle 12 Dur-Tonarten in Quintabständen an.
Im Uhrzeigersinn (♯), gegen den Uhrzeigersinn (♭).

| Vorzeichen | Dur | parallele Moll | Tonika |
|---|---|---|---|
| 0 | C-Dur | a-Moll | C / A |
| 1♯ | G-Dur | e-Moll | F♯ |
| 2♯ | D-Dur | h-Moll | F♯, C♯ |
| 3♯ | A-Dur | f♯-Moll | F♯, C♯, G♯ |
| 4♯ | E-Dur | c♯-Moll | F♯, C♯, G♯, D♯ |
| 5♯ | H-Dur | g♯-Moll | F♯, C♯, G♯, D♯, A♯ |
| 6♯/6♭ | F♯/G♭ | d♯/e♭ | – |
| 5♭ | D♭-Dur | b-Moll | B♭, E♭, A♭, D♭, G♭ |
| 4♭ | A♭-Dur | f-Moll | B♭, E♭, A♭, D♭ |
| 3♭ | E♭-Dur | c-Moll | B♭, E♭, A♭ |
| 2♭ | B-Dur | g-Moll | B♭, E♭ |
| 1♭ | F-Dur | d-Moll | B♭ |

**Merksätze:**
* ♯-Reihenfolge: *F C G D A E H* – »Fritz Crüsemann geht Donnerstags abends erst heim«.
* ♭-Reihenfolge: *H E A D G C F* – umgekehrt.`,
                relatedExercises: [
                    { module: 'note_reading', difficulty: 'advanced' }
                ],
                orderIndex: 90
            },
            {
                key: 'intervall_uebersicht',
                category: 'anhang',
                title: 'Intervall-Übersicht',
                summary: 'Komplette Übersicht aller Intervalle mit Halbtonschritten und Beispielen.',
                content: `## Intervall-Übersicht

| Halbtöne | Intervall | Beispiel (ab C) | Klang |
|---|---|---|---|
| 0 | Reine Prime | C–C | gleichklingend |
| 1 | Kleine Sekunde | C–Des | dissonant, eng |
| 2 | Große Sekunde | C–D | leicht dissonant |
| 3 | Kleine Terz | C–Es | weich, Moll |
| 4 | Große Terz | C–E | hell, Dur |
| 5 | Reine Quarte | C–F | offen |
| 6 | Tritonus | C–F♯ | sehr dissonant |
| 7 | Reine Quinte | C–G | offen, stabil |
| 8 | Kleine Sexte | C–As | sehnsüchtig |
| 9 | Große Sexte | C–A | weich |
| 10 | Kleine Septime | C–B | drängend |
| 11 | Große Septime | C–H | scharf |
| 12 | Reine Oktave | C–C¹ | identisch |

### Umkehrung von Intervallen
Die Summe zweier Umkehrungen ergibt **9** (Stufen) bzw. **12** Halbtöne.
* Prime ↔ Oktave, Sekunde ↔ Septime, Terz ↔ Sexte, Quarte ↔ Quinte.
* Aus *groß* wird *klein* (und umgekehrt), aus *rein* bleibt *rein*.`,
                relatedExercises: [
                    { module: 'ear_training', difficulty: 'beginner' },
                    { module: 'ear_training', difficulty: 'intermediate' }
                ],
                orderIndex: 91
            },
            {
                key: 'tonarten_uebersicht',
                category: 'anhang',
                title: 'Dur- und Molltonarten – Übersicht',
                summary: 'Alle 24 Dur- und Molltonarten mit Tonleiter und Vorzeichen.',
                content: `## Tonarten-Übersicht

### Dur-Tonleitern (im Quintenzirkel)
| Tonart | Vorzeichen | Tonleiter |
|---|---|---|
| C-Dur | – | C D E F G A H C |
| G-Dur | 1♯ (F♯) | G A H C D E F♯ G |
| D-Dur | 2♯ | D E F♯ G A H C♯ D |
| A-Dur | 3♯ | A H C♯ D E F♯ G♯ A |
| E-Dur | 4♯ | E F♯ G♯ A H C♯ D♯ E |
| H-Dur | 5♯ | H C♯ D♯ E F♯ G♯ A♯ H |
| F-Dur | 1♭ (B) | F G A B C D E F |
| B-Dur | 2♭ | B C D Es F G A B |
| Es-Dur | 3♭ | Es F G As B C D Es |
| As-Dur | 4♭ | As B C Des Es F G As |
| Des-Dur | 5♭ | Des Es F Ges As B C Des |

### Moll-Tonleitern (natürlich; harmonisch: 7. Stufe erhöht)
| Tonart | Vorzeichen | Tonleiter (natürlich) |
|---|---|---|
| a-Moll | – | A H C D E F G A |
| e-Moll | 1♯ | E F♯ G A H C D E |
| h-Moll | 2♯ | H C♯ D E F♯ G A H |
| f♯-Moll | 3♯ | F♯ G♯ A H C♯ D E F♯ |
| c♯-Moll | 4♯ | C♯ D♯ E F♯ G♯ A H C♯ |
| g♯-Moll | 5♯ | G♯ A♯ H C♯ D♯ E F♯ G♯ |
| d-Moll | 1♭ | D E F G A B C D |
| g-Moll | 2♭ | G A B C D Es F G |
| c-Moll | 3♭ | C D Es F G As B C |
| f-Moll | 4♭ | F G As B C Des Es F |
| b-Moll | 5♭ | B C Des Es F Ges As B |`,
                relatedExercises: [
                    { module: 'note_reading', difficulty: 'advanced' },
                    { module: 'ear_training', difficulty: 'beginner' }
                ],
                orderIndex: 92
            }
        ];

        await db.theory_topic.bulkCreate(topics);
        logger.info(`[Seed] Created ${topics.length} theory topics.`);
    } catch (err) {
        logger.error('[Seed] Error seeding theory topics:', err);
        throw err;
    }
}

module.exports = { seedTheoryTopics };
