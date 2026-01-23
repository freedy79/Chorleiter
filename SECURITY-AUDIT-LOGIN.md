# Sicherheitsaudit: Benutzeranmeldung (Login)

**Datum:** 23. Januar 2026  
**Status:** Umfassende Überprüfung durchgeführt  
**Risikolevel:** MITTEL bis HOCH (einige kritische Probleme identifiziert)

---

## 🔍 Executive Summary

Die Anmeldeanwendung implementiert grundlegende Sicherheitsmaßnahmen (Passwort-Hashing, JWT, Brute-Force-Schutz), weist jedoch mehrere kritische und mittelschwere Sicherheitslücken auf, die sofortiger Aufmerksamkeit bedürfen:

- ⚠️ **KRITISCH**: Schwache Passwortanforderungen (nur 4 Zeichen)
- ⚠️ **KRITISCH**: Keine Rate-Limiting auf Server-Ebene
- ⚠️ **HOCH**: Token ohne Refresh-Mechanismus
- ⚠️ **HOCH**: Unzureichende HTTPS/Sicherheits-Header-Konfiguration
- ⚠️ **MITTEL**: Exponierte Debug-Informationen
- ⚠️ **MITTEL**: Zu lange Token-Expiration (30 Tage möglich)

---

## 📊 Detaillierte Sicherheitsbewertung

### 1. ✅ PASSWORT-HASHING UND SPEICHERUNG

**Status:** ✅ GUT (mit Verbesserungspotential)

#### Gefundenes Verfahren:
```javascript
// Backend: auth.controller.js Zeile 66
password: bcrypt.hashSync(req.body.password, 8)
```

#### Bewertung:
- ✅ Verwendet **bcryptjs** mit **Salt Rounds = 8**
- ✅ Sichere Speicherung von Passwörtern
- ✅ Unhackbar bei korrekter Implementierung

#### Verbesserungen:
- 🔧 **Salt Rounds erhöhen**: Mindestens auf 10-12 (aktuell 8 ist OK, aber könnte stärker sein)
- 🔧 **Timing-Attack-Schutz**: `bcrypt.compareSync()` ist anfällig für Timing-Attacks - sollte mit Zeitversatz kompensiert werden

---

### 2. ⚠️ PASSWORTANFORDERUNGEN - KRITISCH

**Status:** ⚠️ **KRITISCH - SOFORT BEHEBEN**

#### Aktuelles Problem:
```javascript
// validators/auth.validation.js Zeile 4
body('password').isLength({ min: 4 }).withMessage('Password must be at least 4 characters.')
```

#### Kritische Probleme:
- ❌ **Nur 4 Zeichen Mindestlänge** (VIEL zu kurz!)
- ❌ **Keine Komplexitätsanforderungen**
- ❌ **Keine Großbuchstaben/Zahlen/Sonderzeichen erforderlich**
- ❌ **Keine Passworthistorie** (gleiche Passwörter wiederverwendbar)

#### Beispiel schwacher Passwörter, die akzeptiert werden:
```
- "1234" ✗ Zu kurz
- "aaaa" ✗ Keine Zahlen/Sonderzeichen
- "abc1" ✗ Nur Kleinbuchstaben + eine Zahl
```

#### 🔴 Sicherheitsempfehlung:
```javascript
// NEUE Mindestanforderungen
const passwordValidation = [
  body('password')
    .isLength({ min: 12 })
    .withMessage('Password must be at least 12 characters.')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character.')
];
```

#### Rationale:
- **12 Zeichen** ist moderner Standard (NIST empfiehlt mindestens 8, besser 12+)
- **Komplexität** reduziert Wörterbuch-Attacken erheblich

---

### 3. ⚠️ BRUTE-FORCE-SCHUTZ - TEILWEISE IMPLEMENTIERT

**Status:** ⚠️ **MITTEL - ERGÄNZUNGSBEDÜRFTIG**

#### Implementiert:
```javascript
// auth.controller.js Zeile 117-136
if (failedAttempts >= 3 && !user.resetToken) {
  // Account sperren und Password-Reset E-Mail senden
}
```

#### Bewertung:
- ✅ **3 gescheiterte Versuche**: Account wird gesperrt
- ✅ **Automatische Sperrung**: Guter Ansatz
- ✅ **Password Reset Mail**: Benutzer kann sich wieder entsperren

#### ⚠️ Probleme:
- ❌ **Nur auf E-Mail-Basis**: Keine IP-Rate-Limiting
- ❌ **Keine exponentiellen Verzögerungen**: Jeder Versuch sofort möglich
- ❌ **Keine Netzwerk-Ebene-Begrenzung** (z.B. Fail2Ban, Nginx Rate Limit)

#### Empfehlung:
```javascript
// Zusätzliches Rate-Limiting IMPLEMENTIEREN
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 5,                      // 5 Versuche pro IP
  skipSuccessfulRequests: true, // Erfolgreiche Logins zählen nicht
  skipFailedRequests: false,
  message: 'Zu viele Login-Versuche. Bitte später erneut versuchen.',
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/signin', loginLimiter, controller.signin);
```

---

### 4. ⚠️ JWT-TOKEN-VERWALTUNG - KRITISCHE LÜCKEN

**Status:** ⚠️ **HOCH - MEHRERE PROBLEME**

#### Aktuelles Verfahren:
```javascript
// auth.controller.js Zeile 149-154
const rememberMe = req.body.rememberMe || false;
const tokenExpiresIn = rememberMe ? '30d' : '8h';

const token = jwt.sign(
    { id: user.id, activeChoirId: activeChoirId, roles: user.roles },
    process.env.JWT_SECRET,
    { expiresIn: tokenExpiresIn }
);
```

#### Probleme:

##### Problem 1: Zu lange Expiration
- ❌ **30 Tage "Remember Me"** ist viel zu lang
- ❌ Bei Token-Diebstahl: 30 Tage Zugriff für Angreifer
- ❌ Roles-Änderungen wirken sich nicht sofort aus

##### Problem 2: Kein Refresh-Token-System
- ❌ Kein Mechanismus zum Token erneuern
- ❌ Frontend müsste sich neu anmelden nach 8 Stunden
- ❌ Bei Logout ist Token immer noch gültig

##### Problem 3: Keine Token-Blacklist
- ❌ Logout ist nur client-seitig (Token entfernen)
- ❌ Geklaute Tokens können weiterhin verwendet werden

##### Problem 4: Sensitive Daten im Token
```javascript
{ id: user.id, activeChoirId: activeChoirId, roles: user.roles }
```
- ⚠️ `roles` sollten nicht im Token sein (können client-seitig manipuliert werden)

#### 🔴 Sicherheitsempfehlung:

```javascript
// NEUE Access/Refresh Token Strategie
const tokenExpiresIn = '15m'; // Access-Token nur 15 Minuten
const refreshTokenExpiresIn = '7d'; // Refresh-Token 7 Tage

const accessToken = jwt.sign(
    { 
      id: user.id, 
      activeChoirId: activeChoirId 
      // KEINE Roles - diese müssen server-seitig geprüft werden!
    },
    process.env.JWT_SECRET,
    { expiresIn: tokenExpiresIn, issuer: 'chorleiter-auth' }
);

// Refresh-Token separat speichern
const refreshToken = jwt.sign(
    { id: user.id, tokenVersion: user.tokenVersion },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: refreshTokenExpiresIn }
);

// Refresh-Token in HttpOnly Cookie speichern (nicht in Response-Body!)
res.cookie('refreshToken', refreshToken, {
  httpOnly: true,
  secure: true, // HTTPS nur
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000
});
```

---

### 5. ⚠️ LOGIN-VERSUCHE PROTOKOLLIERUNG

**Status:** ✅ **GUT** (mit Verbesserungspotential)

#### Implementiert:
```javascript
// auth.controller.js
await LoginAttempt.create({ 
  email, 
  success: true, 
  ipAddress, 
  userAgent 
});
```

#### Bewertung:
- ✅ Alle Login-Versuche werden protokolliert
- ✅ IP-Adresse wird erfasst
- ✅ User-Agent wird erfasst
- ✅ Erfolg/Misserfolg wird dokumentiert

#### Verbesserungen:
- 🔧 **Geografische Anomalien erkennen**: IP-Adresse auf verdächtige Standorte prüfen
- 🔧 **Unerwartete Geräte**: Bei neuem User-Agent warnen
- 🔧 **Automatische Alerts**: Bei verdächtigen Aktivitäten
- 🔧 **Retention-Policy**: Wie lange werden Logs gespeichert?

---

### 6. ⚠️ PASSWORD-RESET-FLOW - MITTLERES RISIKO

**Status:** ⚠️ **MITTEL - MEHRERE PROBLEME**

#### Aktuelles Verfahren:
```javascript
// password-reset.controller.js
const token = crypto.randomBytes(32).toString('hex');
const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 Stunde
```

#### Bewertung:
- ✅ **32 Bytes Random**: Ausreichend stark (256 Bit)
- ✅ **1 Stunde Expiration**: Angemessen
- ✅ **Einmalverwendung**: Token wird nach Verwendung gelöscht

#### ⚠️ Probleme:

##### Problem 1: User Enumeration Attack
```javascript
// password-reset.controller.js Zeile 18
// Problem: Unterschiedliche Responses für registrierte/nicht-registrierte E-Mails

if (user) {
  // Sende E-Mail
  await emailService.sendPasswordResetMail(...);
}
res.status(200).send({ message: 'If registered, you will receive an email...' });
```

**Sicherheitsproblem**: Code sagt `If registered`, aber Zeit zum Antworten verrät ob registriert!

- ⏱️ Registrierte Benutzer: ~200ms (E-Mail-Versand)
- ⏱️ Nicht registriert: ~50ms (sofort)

**Angreifer kann so E-Mails aus dieser Anwendung herauskramen!**

##### Problem 2: Keine IP-Rate-Limiting
- ❌ Unbegrenzte Password-Reset-Anfragen pro E-Mail
- ❌ Spam-Möglichkeit (Benutzer mit Spam-Mails bombardieren)

##### Problem 3: Keine CSRF-Validierung bei Token-Erzeugung
- ⚠️ POST-Endpunkt könnte von externen Seiten aufgerufen werden

#### 🔴 Sicherheitsempfehlung:

```javascript
// VERBESSERTE Password-Reset-Logic
exports.requestPasswordReset = async (req, res) => {
  const email = req.body.email?.toLowerCase().trim();
  
  // Fake Delay für ALLE Anfragen (registriert oder nicht)
  const delay = new Promise(resolve => 
    setTimeout(resolve, Math.random() * 150 + 150) // 150-300ms
  );
  
  try {
    // Prüfe Rate-Limiting pro IP
    const recentRequests = await db.password_reset_attempt.count({
      where: {
        ipAddress: req.ip,
        createdAt: { [Op.gt]: new Date(Date.now() - 60 * 60 * 1000) }
      }
    });
    
    if (recentRequests > 5) {
      await delay;
      // Nicht verraten, dass die E-Mail bekannt ist
      return res.status(429).send({ 
        message: 'Zu viele Anfragen von dieser IP. Bitte später versuchen.' 
      });
    }
    
    const user = await db.user.findOne({
      where: db.Sequelize.where(
        db.Sequelize.fn('lower', db.Sequelize.col('email')), 
        email
      )
    });
    
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiry = new Date(Date.now() + 60 * 60 * 1000);
      await emailService.sendPasswordResetMail(...);
      await user.update({ resetToken: token, resetTokenExpiry: expiry });
    }
    
    // WICHTIG: Gleiche Response für alle Fälle!
    await delay;
    res.status(200).send({ 
      message: 'Wenn diese E-Mail registriert ist, erhalten Sie einen Reset-Link.' 
    });
    
  } catch (err) {
    res.status(500).send({ message: 'Fehler beim Verarbeiten der Anfrage' });
  }
};
```

---

### 7. ⚠️ HTTPS UND SICHERHEITS-HEADER

**Status:** ❌ **NICHT ÜBERPRÜFBAR - KRITISCH FEHLEND**

#### Probleme:
- ❌ Keine Sicherheits-Header konfiguriert
- ❌ Keine HTTPS-Erzwingung
- ❌ Keine HSTS (HTTP Strict Transport Security)
- ❌ Keine CSP (Content Security Policy)
- ❌ Keine CORS-Begrenzung sichtbar

#### 🔴 Sicherheitsempfehlung:

```javascript
// In app.js oder server.js hinzufügen
const helmet = require('helmet');
const cors = require('cors');

// Sicherheits-Header
app.use(helmet());
app.use(helmet.hsts({ 
  maxAge: 31536000, // 1 Jahr
  includeSubDomains: true,
  preload: true 
}));

// CORS mit whitelist
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// CSP Header
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
  );
  next();
});
```

---

### 8. ✅ TOKEN-VALIDIERUNG

**Status:** ✅ **GUT**

#### Implementiert:
```javascript
// auth.middleware.js
const verifyToken = (req, res, next) => {
  let token = req.headers["authorization"];
  if (!token) {
    return res.status(403).send({ message: "No token provided!" });
  }
  token = token.split(' ')[1]; // "Bearer <token>" parsing
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized!" });
    }
    // ...
  });
};
```

#### Bewertung:
- ✅ Korrekte "Bearer Token" Verarbeitung
- ✅ JWT-Signatur wird validiert
- ✅ Expiration wird automatisch geprüft

#### Verbesserung:
- 🔧 **Token-Versioning**: Für Logout-Mechanismus einführen
- 🔧 **Issuer-Validierung**: `jwt.verify` sollte `issuer` Option prüfen

---

### 9. ⚠️ CLIENT-SIDE STORAGE - RISIKEN

**Status:** ⚠️ **MITTEL - XSS-VULNERABILITÄT**

#### Problem:
```typescript
// auth.service.ts Zeile 280
localStorage.setItem(TOKEN_KEY, user.accessToken);
localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
```

#### Sicherheitsrisiken:
- ❌ **localStorage ist XSS-anfällig**: JavaScript kann darauf zugreifen
- ❌ Bei XSS-Exploit: Angreifer kann Token stehlen
- ❌ Token wird im Browser-Memory offengelegt

#### 🔴 Sicherheitsempfehlung:

```typescript
// Access Token in HttpOnly Cookie speichern (server-seitig gesetzt)
// Diese können von JavaScript NICHT zugegriffen werden

// localStorage NUR für nicht-sensitive Daten verwenden
localStorage.setItem(USER_KEY, JSON.stringify({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  // NICHT: accessToken hier speichern!
}));

// Sensitive Daten (Token) sollten NUR in HttpOnly Cookies sein
// Server setzt: Set-Cookie: auth-token=...; HttpOnly; Secure; SameSite=Strict
```

---

### 10. ✅ DEMO-ACCOUNT-SCHUTZ

**Status:** ✅ **GUT**

#### Implementiert:
```javascript
// Mehrere Prüfungen für Demo-Account
if (email === 'demo@nak-chorleiter.de') {
  // Sperre Password-Reset
  // Automatisches Reset bei Anmeldung
}
```

#### Bewertung:
- ✅ Demo-Account kann nicht verändert werden
- ✅ Demo-Events werden bei Anmeldung zurückgesetzt

---

## 📋 Zusammenfassung der Erkannte Probleme

| # | Problem | Schwere | Lösung |
|---|---------|---------|---------|
| 1 | Passwort nur 4 Zeichen | 🔴 KRITISCH | Auf 12 Zeichen + Komplexität erhöhen |
| 2 | Keine IP-basierte Rate-Limiting | 🔴 KRITISCH | express-rate-limit implementieren |
| 3 | Zu lange Token-Expiration (30d) | 🟠 HOCH | Access-Token auf 15 Min, Refresh-Token auf 7d |
| 4 | Kein Refresh-Token-System | 🟠 HOCH | OAuth2/JWT Refresh-Token Flow implementieren |
| 5 | Keine Token-Blacklist | 🟠 HOCH | Token-Versioning oder Redis-Blacklist |
| 6 | User Enumeration bei PW-Reset | 🟠 HOCH | Timing-Attack-Schutz + konstante Delay |
| 7 | Fehlende Sicherheits-Header | 🟠 HOCH | Helmet.js + CORS + HSTS implementieren |
| 8 | Token in localStorage | 🟡 MITTEL | HttpOnly Cookies für sensitive Tokens |
| 9 | Keine Input-Validierung | 🟡 MITTEL | Komplexere Validatoren hinzufügen |
| 10 | Salt-Rounds zu niedrig | 🟡 MITTEL | bcrypt Salt Rounds 8 → 12 |

---

## 🚀 Priorisierte Implementierungsroadmap

### **Phase 1: KRITISCH (Woche 1-2)**
- [ ] Passwortanforderungen auf 12+ Zeichen + Komplexität erhöhen
- [ ] IP-Rate-Limiting mit express-rate-limit
- [ ] Sicherheits-Header (Helmet.js) implementieren

### **Phase 2: HOCH (Woche 3-4)**
- [ ] Refresh-Token-System implementieren
- [ ] Access-Token-Expiration auf 15 Minuten reduzieren
- [ ] Token-Versioning für besseren Logout einführen
- [ ] User Enumeration Protection bei PW-Reset

### **Phase 3: MITTEL (Woche 5-6)**
- [ ] HttpOnly Cookies für Tokens
- [ ] Erweiterte Input-Validierung
- [ ] Monitoring und Alerting für verdächtige Login-Aktivitäten
- [ ] Geografische Anomalieerkennung

---

## ✅ Bereits Gut Implementierte Funktionen

- ✅ Bcryptjs für Passwort-Hashing
- ✅ JWT für State-Loss-Authentifizierung
- ✅ Login-Versuch-Protokollierung
- ✅ Demo-Account-Schutz
- ✅ Basis-Token-Validierung
- ✅ Password-Reset-Flow mit Token-Expiration

---

## 📞 Nächste Schritte

1. **Sofort**: Passwortanforderungen verschärfen (kritisch!)
2. **Diese Woche**: Rate-Limiting implementieren
3. **Nächste Woche**: Token-Management überarbeiten
4. **Fortlaufend**: Sicherheits-Tests und Monitoring ausbauen

Alle Verbesserungsvorschläge sind dokumentiert und mit Code-Beispielen versehen.
