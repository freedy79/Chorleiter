# E-Mail Validierung gegen leere Mails

## Implementierte Änderungen

### Problem
Das System verschickte leere E-Mails (ohne Betreff oder Bodytext), was zu Verwirrung bei Empfängern führte.

### Lösung
Eine Validierung wurde in `choir-app-backend/src/services/emailTransporter.js` implementiert, die:

1. **Prüft jede ausgehende E-Mail** auf Betreff und Bodytext
2. **Verhindert den Versand** leerer E-Mails
3. **Benachrichtigt Admins** mit detaillierten Informationen über:
   - Grund der Blockierung
   - Ursprünglicher Empfänger
   - Betreff und Body (soweit vorhanden)
   - **Stack Trace** zur Identifikation der auslösenden Stelle im Code

### Technische Details

#### Validierungslogik
```javascript
function validateEmailContent(mailOptions) {
  const hasSubject = mailOptions.subject && mailOptions.subject.trim().length > 0;
  const hasTextContent = !isContentEmpty(mailOptions.text);
  const hasHtmlContent = !isContentEmpty(mailOptions.html);
  const hasBody = hasTextContent || hasHtmlContent;

  if (!hasSubject && !hasBody) {
    return { valid: false, reason: 'Kein Betreff und kein Bodytext vorhanden' };
  }
  if (!hasSubject) {
    return { valid: false, reason: 'Kein Betreff vorhanden' };
  }
  if (!hasBody) {
    return { valid: false, reason: 'Kein Bodytext vorhanden' };
  }
  return { valid: true };
}
```

#### Content-Validierung
Die Funktion `isContentEmpty()` berücksichtigt:
- Leere Strings
- Nur Whitespace (Leerzeichen, Tabs, Newlines)
- Leere HTML-Tags (`<p></p>`, `<br>`, `<div></div>`, etc.)

#### Admin-Benachrichtigung
- Sucht alle Benutzer mit der Rolle `admin`
- Sendet eine Warn-E-Mail mit ⚠️ Icon im Betreff
- Enthält vollständigen Stack Trace zur Code-Analyse
- Extrahiert die relevante Aufrufstelle (filtert `node_modules` und `emailTransporter.js`)
- Wird asynchron versendet (blockiert nicht den ursprünglichen Prozess)

#### Geänderte Dateien
- **choir-app-backend/src/services/emailTransporter.js**
  - Neue Funktionen: `isContentEmpty()`, `validateEmailContent()`, `notifyAdminsAboutEmptyEmail()`
  - Erweiterte `sendMail()` Funktion mit Validierung

### Tests
Erstellt wurden:
- `tests/emailTransporter.validation.test.js` (umfangreicher Test)
- `tests/emailTransporter.simple.test.js` (vereinfachter Test)

Alle Tests erfolgreich ✓

#### Test-Ergebnisse
```
=== Test 1: Leere E-Mail wird verhindert ===
✓ ERFOLG: Admin wurde benachrichtigt

=== Test 2: Valide E-Mail wird gesendet ===
✓ ERFOLG: E-Mail wurde gesendet

=== Test 3: E-Mail ohne Betreff wird verhindert ===
✓ ERFOLG: Admin wurde über fehlenden Betreff benachrichtigt

Ergebnis: 3/3 Tests erfolgreich
```

### Hinweise für Admins

Wenn Sie eine E-Mail mit dem Betreff "⚠️ Leere E-Mail wurde verhindert" erhalten:

1. **Prüfen Sie den Stack Trace** im E-Mail-Body
2. **Identifizieren Sie die auslösende Stelle** (z.B. `sendInvitationMail`, `sendMonthlyPlanMail`, etc.)
3. **Überprüfen Sie die Mail-Templates** in der Datenbank (Tabelle `mail_templates`)
4. **Prüfen Sie die Controller-Logik**, die die E-Mail auslöst

### Kompatibilität
- MySQL / MariaDB ✓
- SQLite ✓ (Tests verwenden in-memory SQLite)

Die Admin-Abfrage wurde so implementiert, dass sie mit beiden Datenbanken funktioniert:
```javascript
// Get all users and filter admins in-memory (works with both MySQL and SQLite)
const allUsers = await db.user.findAll({
  attributes: ['email', 'roles']
});

const admins = allUsers.filter(user => 
  Array.isArray(user.roles) && user.roles.includes('admin')
);
```

### Weitere Maßnahmen
Falls wiederholt leere E-Mails von derselben Stelle verhindert werden:
1. Prüfen Sie das entsprechende Mail-Template in der Datenbank
2. Checken Sie, ob Platzhalter korrekt ersetzt werden
3. Validieren Sie die Template-Build-Logik in `emailTemplateManager.js`

## Datum der Implementierung
13. Februar 2026
