# Teilnehmer-Chat - Requirements

## Overview
Dieses Dokument definiert die Anforderungen für einen **Teilnehmer-Chat** als Erweiterung der bestehenden Beitragsfunktion.

Ziel: schnellere Abstimmung als bei klassischen Posts, ohne die App unnötig komplex zu machen.

## Product Decision (Fix)
- Kein Abo-/Entitlement-System
- Chat steht allen berechtigten Chormitgliedern zur Verfügung

## Scope

### In Scope (MVP)
- Chorweiter Gruppenchat
- Threaded Antworten pro Nachricht (1 Ebene)
- Anhänge: Bild + Audio + Dokument (bestehende Upload-Policies nutzen)
- Gelesen/ungelesen-Indikatoren
- Moderation (Löschen/ausblenden durch Admin/Chorleitung)

### Out of Scope (MVP)
- Ende-zu-Ende-Verschlüsselung
- Voice/Video Calls
- Vollwertige private 1:1-Chats

## Core Requirements

### 1. Chat-Räume
**Priority:** High

MVP-Räume:
- `#allgemein` (pro Chor, Default)
- Optional später: `#probenorga`, `#stimmgruppe-*`

Zugriff:
- Nur Mitglieder des aktiven Chors

### 2. Nachrichten
**Priority:** High

Nachricht enthält:
- `id`, `chatRoomId`, `userId`, `text`, `createdAt`, `editedAt`
- optional `attachment` (bestehende Upload-Infrastruktur)
- optional `replyToMessageId`

Regeln:
- Bearbeiten innerhalb definierter Zeit (z. B. 15 Minuten) optional
- Löschen eigener Nachricht jederzeit
- Moderatives Löschen durch Admin/Choir Admin

### 3. Echtzeit-Strategie
**Priority:** High

MVP-Transport:
- Polling / Long Polling (einfach, robust)
- Optional Phase 2: WebSocket/SSE

Anforderung:
- Neue Nachrichten erscheinen ohne manuellen Refresh
- Retry bei Verbindungsproblemen

### 4. Ungelesen & Benachrichtigungen
**Priority:** High

- Pro Raum: letzter gelesener Nachrichten-Zeitpunkt/ID pro User
- Badge im Menü/Room-Liste
- Push Notification (bestehendes Push-Setup nutzen)

### 5. Moderation & Sicherheit
**Priority:** High

- Rollenrechte:
  - Mitglied: schreiben/antworten/löschen eigene
  - Choir Admin/Director: moderieren, löschen, ggf. stummschalten
- Rate Limit gegen Spam
- Validierung + Sanitizing (kein HTML-Injection)
- Attachment-Whitelist wie bei Posts

### 6. UX Requirements
**Priority:** High

- Chat-Ansicht mit:
  - Nachrichtenliste (virtuelles Scrolling optional)
  - Composer unten fixiert
  - Reply-Preview
  - Datumstrenner
- Mobile-first:
  - großer Eingabebereich
  - klare Tapp-Ziele
  - lazy loading älterer Nachrichten

### 7. Backend Requirements
**Priority:** High

#### 7.1 Datenmodell (Vorschlag)

`chat_room`
- `id`, `choirId`, `key`, `title`, `isDefault`, timestamps

`chat_message`
- `id`, `chatRoomId`, `userId`, `text`, `replyToMessageId` nullable,
  `attachmentFilename` nullable, `attachmentOriginalName` nullable,
  `deletedAt` nullable, timestamps

`chat_read_state`
- `id`, `chatRoomId`, `userId`, `lastReadMessageId` nullable, `lastReadAt`, timestamps

#### 7.2 API Endpoints (MVP)

```
GET    /api/chat/rooms
POST   /api/chat/rooms                 (admin optional)
GET    /api/chat/rooms/:roomId/messages?before=&limit=
POST   /api/chat/rooms/:roomId/messages
PUT    /api/chat/messages/:id          (optional MVP)
DELETE /api/chat/messages/:id
POST   /api/chat/rooms/:roomId/read
GET    /api/chat/unread-summary
```

### 8. Frontend Requirements
**Priority:** High

- Neuer Domain-Service: `ChatService`
- Feature-Modul: `features/chat/`
- Reuse vorhandener Komponenten (Datei-Upload, Avatar, Zeitformat)
- Optimistic UI beim Senden

### 9. Acceptance Criteria (MVP)
1. Mitglied kann in `#allgemein` schreiben und Antworten sehen
2. Neue Nachrichten erscheinen automatisch (ohne Reload)
3. Ungelesen-Badge aktualisiert sich korrekt
4. Admin kann problematische Nachrichten moderieren
5. Anhänge funktionieren mit bestehenden Dateitypen

### 10. Phasing

#### Phase 1 (MVP)
- Raum `#allgemein`
- Senden/Empfangen/Lesestatus
- Moderation basic

#### Phase 2
- Weitere Räume (inkl. Stimmgruppenräume)
- WebSocket/SSE
- Suche im Chat

#### Phase 3
- 1:1-Chats optional
- Erweiterte Moderation (mute/slow mode)
