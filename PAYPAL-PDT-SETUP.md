# PayPal PDT (Payment Data Transfer) Einrichtung

Diese Anleitung erklärt, wie Sie PayPal PDT konfigurieren, um Spendenbeträge automatisch zu erfassen.

## Was ist PayPal PDT?

PayPal Payment Data Transfer (PDT) ermöglicht es Ihrer Anwendung, Transaktionsdetails (einschließlich des Betrags) von PayPal abzurufen, wenn ein Spender nach erfolgreicher Zahlung zurückkehrt.

## 🔒 Sicherheit

Der PayPal PDT Token wird:
- ✅ Mit AES-256 verschlüsselt gespeichert
- ✅ In der Datenbank sicher verschlüsselt abgelegt
- ✅ Niemals in den Logs oder Fehlermeldungen angezeigt
- ✅ Über ein Admin-Interface eingegeben (nicht in Umgebungsvariablen)

## Schritt-für-Schritt Anleitung

### Methode 1: Token über Admin-Interface eintragen (Empfohlen ✅)

**Dies ist die neue, sichere Methode!**

1. Melden Sie sich im Admin-Bereich an
2. Gehen Sie zu **Admin → PayPal Einstellungen**
3. Wählen Sie den Modus (Sandbox für Tests, Live für echte Spenden)
4. Kopieren Sie Ihren PayPal PDT Identity Token (siehe unten)
5. Fügen Sie ihn in das Eingabefeld ein
6. Klicken Sie **"Speichern"**

Der Token wird verschlüsselt in der Datenbank gespeichert und ist sofort aktiv!

---

### Methode 2: Token via Umgebungsvariable (Veraltet)

Falls Sie die alte Methode mit Umgebungsvariablen verwenden möchten:

```bash
# Backend neu starten mit:
PAYPAL_PDT_TOKEN=Ihr-Token-hier PAYPAL_MODE=live npm start
```

---

## Wie bekomme ich meinen PayPal PDT Token?

### 1. PayPal-Konto einloggen
- Gehen Sie zu https://www.paypal.com
- Melden Sie sich mit dem Konto an, das Spenden erhält

### 2. Website-Zahlungseinstellungen öffnen
- Klicken Sie auf **Einstellungen** (Zahnrad-Symbol oben rechts)
- Wählen Sie **Website-Zahlungen** (unter "Verkäufertools")

### 3. Auto Return aktivieren
- Suchen Sie den Bereich **"Website-Einstellungen"** oder **"Auto Return"**
- Aktivieren Sie **Auto Return**
- Geben Sie die Return-URL ein: `https://ihre-domain.de/donation-success`
  - Ersetzen Sie `ihre-domain.de` durch Ihre tatsächliche Domain
  - Beispiel: `https://chorleiter.example.com/donation-success`

### 4. PDT (Payment Data Transfer) aktivieren
- Im selben Bereich finden Sie **"Payment Data Transfer"**
- Aktivieren Sie PDT
- PayPal generiert einen **PDT Identity Token** (eine lange Zeichenkette)
- **Kopieren Sie diesen Token!**

### 5. Token im Admin-Interface eingeben

1. Gehen Sie zu **Admin → PayPal Einstellungen** in Ihrer Anwendung
2. Wählen Sie den Modus:
   - **Sandbox**: Für Tests mit Testkonten
   - **Live**: Für echte Spenden
3. Fügen Sie den Token in das Feld ein
4. Klicken Sie **"Speichern"**

---

## Sandbox vs. Live

### Sandbox (Testmodus)
- Verwenden Sie ein PayPal Sandbox-Konto
- Modus: **Sandbox**
- Für Entwicklung und Tests

### Live (Produktivmodus)
- Verwenden Sie Ihr echtes PayPal Geschäftskonto
- Modus: **Live**
- Für echte Spenden

---

## Testen

1. Gehen Sie auf Ihre Anwendung
2. Klicken Sie auf **"Spenden"**
3. Führen Sie eine Test-Spende durch (bei Sandbox mit Testkonten)
4. Nach erfolgreicher Zahlung sollten Sie automatisch zurückgeleitet werden
5. Die Anwendung sollte den Betrag automatisch erfassen und speichern
6. Prüfen Sie im Admin-Bereich unter **"Spenden"**, ob die Transaktion gespeichert wurde

---

## Troubleshooting

### Problem: "PayPal PDT not configured"
- Stellen Sie sicher, dass Sie den Token im Admin-Interface eingegeben haben
- Überprüfen Sie, ob der Token vollständig eingegeben wurde (keine Leerzeichen am Anfang/Ende)
- Speichern Sie erneut ab

### Problem: "Transaction verification failed"
- Überprüfen Sie, ob der Modus (Sandbox vs. Live) korrekt ist
- Stellen Sie sicher, dass Auto Return und PDT in PayPal aktiviert sind
- Prüfen Sie die Backend-Logs für detaillierte Fehlermeldungen

### Problem: Keine automatische Weiterleitung von PayPal
- Stellen Sie sicher, dass Auto Return aktiviert ist
- Überprüfen Sie, ob die Return-URL korrekt in PayPal konfiguriert ist

---

## Manuelle Erfassung als Fallback

Falls PDT nicht funktioniert oder nicht konfiguriert ist, können Spenden weiterhin manuell im Admin-Bereich erfasst werden:

1. Gehen Sie zu **Admin → Spenden**
2. Klicken Sie auf **"Spende hinzufügen"**
3. Wählen Sie den Benutzer, Betrag und Datum
4. Klicken Sie **"Speichern"**

---

## Sicherheitshinweise

- ⚠️ **Niemals** den PDT Token per E-Mail versenden
- ⚠️ **Niemals** den Token in Konfigurationsdateien hardcodieren (außer als Fallback)
- ✅ Verwenden Sie das Admin-Interface zum Speichern
- ✅ Der Token wird verschlüsselt in der Datenbank gespeichert
- ✅ Nur Administratoren können den Token eingeben/ändern

---

## Weitere Informationen

Offizielle PayPal PDT Dokumentation:
- https://developer.paypal.com/docs/api-basics/notifications/payment-data-transfer/

2. Klicken Sie auf **"Spende hinzufügen"**
3. Wählen Sie den Benutzer aus
4. Geben Sie Betrag und Datum ein
5. Klicken Sie auf **"Speichern"**

## Sicherheitshinweise

- ⚠️ **Niemals** den PDT Token in Git committen oder öffentlich teilen
- ✅ Verwenden Sie Umgebungsvariablen oder sichere Konfigurationsdateien
- ✅ Setzen Sie den Token nur auf dem Produktionsserver
- ✅ Verwenden Sie unterschiedliche Tokens für Sandbox und Live

## Weitere Informationen

Offizielle PayPal PDT Dokumentation:
- https://developer.paypal.com/docs/api-basics/notifications/payment-data-transfer/
