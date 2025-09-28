# Terminal Features - WebContainer Integration

## Übersicht
Das Terminal in der Anwendung unterstützt jetzt **echte npm/node Befehle** durch WebContainer API Integration.

## Features

### 🚀 Echtes Terminal mit WebContainer
- **npm** Befehle: `npm install`, `npm run dev`, `npm start`, etc.
- **node** Befehle: `node index.js`, `node --version`
- **npx** Befehle: `npx create-react-app`, etc.
- **Package Management**: Installation und Verwaltung von npm-Paketen
- **File System**: Vollständiges Dateisystem mit Lese-/Schreibzugriff
- **Process Management**: Ausführung von Node.js-Prozessen

### 📁 Datei-Synchronisation
- Automatische Synchronisation zwischen Terminal und Sandbox-Editor
- Änderungen im Terminal werden sofort im Editor reflektiert
- Bidirektionale Updates alle 2 Sekunden

### 🎯 Fallback-Modus
Falls WebContainer nicht verfügbar ist, greift das Terminal auf den simulierten Modus zurück mit:
- `ls` - Dateien auflisten
- `cat <path>` - Datei anzeigen
- `touch <path>` - Datei erstellen
- `echo "text" > <path>` - Text in Datei schreiben
- `cd <path>` - Verzeichnis wechseln
- `open <path>` - Datei im Editor öffnen
- `help` - Hilfe anzeigen

## Verwendung

### Terminal öffnen
1. Gehe zum "Code" Tab in der Sandbox
2. Das Terminal befindet sich im unteren Panel
3. Größe kann durch Ziehen der Trennlinie angepasst werden

### npm Befehle ausführen
```bash
# Packages installieren
npm install express

# Development Server starten
npm run dev

# Scripts ausführen
npm start

# Package.json erstellen
npm init -y
```

### Node.js verwenden
```bash
# JavaScript-Datei ausführen
node index.js

# Node Version prüfen
node --version

# REPL starten
node
```

## Technische Details

### WebContainer API
- Läuft vollständig im Browser
- Kein Backend-Server erforderlich
- Unterstützt Node.js 18+ Features
- Isolierte Sandbox-Umgebung

### Limitierungen
- Keine nativen Module (C++ Addons)
- Begrenzte Netzwerkfunktionalität
- Maximale Dateigröße: 50MB
- Performance abhängig von Browser/Hardware

### Browser-Kompatibilität
- Chrome/Edge 89+
- Firefox 102+
- Safari 16.4+

## Troubleshooting

### WebContainer lädt nicht
- Überprüfe Internetverbindung
- Browser-Cache leeren
- Adblocker deaktivieren
- CORS-Einstellungen prüfen

### Terminal reagiert nicht
- Seite neu laden
- Browser-Konsole auf Fehler prüfen
- Fallback-Modus verwenden (help eingeben)

## Konfiguration

In `TerminalPane.tsx`:
```tsx
// WebContainer aktivieren/deaktivieren
useWebContainer={true}  // true = WebContainer, false = Simuliert
```

## Sicherheit
- WebContainer läuft in isolierter Sandbox
- Kein Zugriff auf lokales Dateisystem
- Keine Systemkommandos möglich
- Sicher für öffentliche Nutzung
