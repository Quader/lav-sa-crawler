# Fischerprüfungs-Crawler

Ein Node.js-Bot, der regelmäßig die Webseite der Fischerprüfung Sachsen-Anhalt nach neuen Terminen durchsucht und Benachrichtigungen über Discord versendet.

## Funktionsweise

Der Bot führt folgende Schritte aus:

1.  Ruft die Daten von der angegebenen API-URL ab.
2.  Filtert die Ergebnisse nach Terminen für die "Fischerprüfung".
3.  Vergleicht die gefundenen Termine mit einer lokalen Liste bekannter Termine (`known-appointments.json`).
4.  Sendet eine Benachrichtigung über Discord, wenn neue Termine gefunden wurden.
5.  Speichert die neuen Termine in der lokalen Liste.
6.  Protokolliert seine Aktivitäten in einer `crawler.log`-Datei.
7.  Wiederholt diese Überprüfung täglich um 8:00 Uhr.

## Einrichtung

1.  **Voraussetzungen:**
    * Node.js und npm (oder yarn) müssen auf deinem System installiert sein.
    * Ein Discord-Server, auf dem du einen Webhook erstellen kannst.

2.  **Installation:**
    * Klone dieses Repository (nachdem du es initialisiert und auf einer Plattform wie GitHub erstellt hast).
    * Navigiere zum Projektverzeichnis in deinem Terminal.
    * Installiere die Abhängigkeiten:

        ```bash
        npm install
        # oder
        yarn install
        ```
    * Erstelle eine `.env`-Datei im Hauptverzeichnis des Projekts und füge deine Konfiguration hinzu:

        ```
        DISCORD_WEBHOOK_URL=deine_discord_webhook_url_hier
        API_URL=[https://fischerpruefung.sachsen-anhalt.de/api/exam/examination?future=true](https://fischerpruefung.sachsen-anhalt.de/api/exam/examination?future=true)
        DATA_FILE_PATH=./known-appointments.json
        LOG_FILE_PATH=./crawler.log
        ```

        **Wichtig:** Ersetze `deine_discord_webhook_url_hier` durch die tatsächliche URL deines Discord-Webhooks.

3.  **Docker-Einrichtung (optional):**
    * Stelle sicher, dass Docker und Docker Compose auf deinem System installiert sind.
    * Die `docker-compose.yml`-Datei im Repository konfiguriert den Bot als Docker-Container.
    * Um den Bot mit Docker zu starten, führe aus dem Projektverzeichnis aus:

        ```bash
        docker-compose up -d
        ```
    * Stoppen der Docker-Container:

        ```bash
        docker-compose down
        ```

## Verwendung

* Nach der Einrichtung (entweder direkt mit Node.js oder über Docker) läuft der Bot automatisch im Hintergrund und überprüft täglich um 8:00 Uhr nach neuen Fischerprüfungsterminen.
* Benachrichtigungen werden über den konfigurierten Discord-Webhook versendet.
* Die Log-Datei (`crawler.log`) enthält Informationen über die Ausführung des Bots.
* Die Datei `known-appointments.json` speichert die bereits bekannten Termine. **Lösche diese Datei nicht, es sei denn, du möchtest alle Termine erneut als "neu" behandeln.**

## Konfiguration

Die wichtigsten Konfigurationen erfolgen über die `.env`-Datei:

* `DISCORD_WEBHOOK_URL`: Die URL deines Discord-Webhooks.
* `API_URL`: Die URL der API für die Fischerprüfungstermine (Standardmäßig voreingestellt).
* `DATA_FILE_PATH`: Der Pfad zur Datei, in der bekannte Termine gespeichert werden (Standardmäßig `./known-appointments.json`).
* `LOG_FILE_PATH`: Der Pfad zur Log-Datei (Standardmäßig `./crawler.log`).

## Zukünftige Erweiterungen (Ideen)

* Filterung nach bestimmten Landkreisen oder Prüfungsorten.
* Optionale Benachrichtigungen für geänderte oder abgesagte Termine.
* Integration weiterer Informationsquellen.
* Eine webbasierte Oberfläche zur Verwaltung der Einstellungen.

## Lizenz

MIT License

## Autor

Steven David (stevendavidmd@gmail.com)