# Tests für Fischerprüfungs-Crawler

Dieses Verzeichnis enthält Tests für die Komponenten des Fischerprüfungs-Crawlers.

## Verfügbare Tests

1. **appointment-storage.test.js** - Testet die Terminverwaltungsfunktionen
   - Datei-Erstellung
   - Speichern und Laden von Termindaten
   - Erkennen neuer Termine
   - Zusammenführen von Termindaten 
   - Korrekte Markierung von Terminen als benachrichtigt

2. **diagnostic.test.js** - Diagnostiktests zur Fehlersuche
   - Detaillierte Überprüfung der Datei-Lese und -Schreiboperationen
   - Validierung der Terminsuche

## Ausführen der Tests

Über npm können die Tests wie folgt ausgeführt werden:

```bash
# Führt den Haupttest für die Terminverwaltung aus
npm test

# Führt den Diagnostiktest aus
npm run test:diagnostic

# Führt alle Tests aus
npm run test:all
```

## Hinweise zur Testumgebung

- Tests verwenden temporäre Dateien im Verzeichnis `/tests/data/`
- Die Umgebungsvariable `DATA_FILE_PATH` wird während der Tests überschrieben
- Nach Abschluss der Tests werden alle temporären Dateien bereinigt