# Changelog

Die Daten älterer Einträge sind Commit-Daten, keine belegten Veröffentlichungstermine. Bei der Prüfung am 25.10.2026 existieren keine Git-Tags und keine GitHub-Releases. Nicht belegte Beta- oder 1.x-Nummern werden nicht nachträglich erfunden.

## Lemon 2.2 — Unreleased / release candidate

Noch keine abgeschlossene Veröffentlichung. Der Test auf einer sauberen Windows-Installation steht aus; das Paket ist nicht signiert.

- Einheitliche native Lemon-Oberfläche mit hellem/dunklem Theme und Modell-/Effort-Auswahl am Composer.
- Gepuffertes SSE-Lesen, inkrementelle Textdarstellung beim Streaming, weniger Listen-Neuaufbau und asynchrone Verlaufsspeicherung.
- Behebung verlorener Canvas-Antworten ohne Begleittext; gespeicherte Canvas-Zustände und sichere Schema-Prüfung bleiben erhalten.
- Englisch als Standard, deutsche und polnische UI-Ressourcen; separat wählbare AI-Antwortsprache.
- F11-Vollbild und Speicherung von Fenstergröße/-zustand.
- Qwen 3.8 und GLM 4.7 Flash mit echten Streaming-/Canvas-Proben; Mistral als Zenith-Standard. DeepSeek V4.1 ist im vorhandenen Free-Tarif gesperrt und bleibt deaktiviert.
- Wiederholbarer Inno-Setup-Installer mit enthaltenen Laufzeiten, Startmenü, optionaler Desktop-Verknüpfung und Deinstallation bei Erhalt der Nutzerdaten.
- Leistungswerte und verbleibende Prüfungen sind im Repository dokumentiert. Es wird kein bestandener Clean-Windows-Test behauptet.

## Lemon 2.1 Preview — 25.10.2026

Windows-Vorschau als Download auf der Produktwebsite; kein GitHub-Release und kein signierter Installer.

- Automatischer Verbindungsaufbau zum vorhandenen Produktionsbackend mit Timeout, begrenztem Verbindungs-Retry und Offline-Hinweisen.
- Native Chat-Oberfläche mit responsiver Seitenleiste, kompakten Modellauswahlen, übersichtlichem Composer und Einstellungen.
- Canvas-Normalisierung, Erhalt lesbarer Inhalte bei ungültigen Strukturen, ein begrenzter Reparaturversuch und interne Originalantwort-Diagnostik.
- Produktwebsite mit Windows-Download, Installationshinweisen und nachvollziehbarer Versionsgeschichte.
- Die bestehenden API-Verträge und gespeicherten Lemon-2-Gespräche bleiben kompatibel.
- Websuche und lokale Dateiwerkzeuge sind nicht Teil dieses Kern-Releases. Sie bleiben nachrangige Vorschaufunktionen für einen späteren Schritt.

## Lemon 2 — Entwicklungsmeilenstein · 25.10.2026

Commit [6419d3d](https://github.com/wikspeck/LemonAi/commit/6419d3d) · keine belegte GitHub-Veröffentlichung.

- Native C#/WinUI-3/XAML-Anwendung und versionierte Cloudflare-API.
- Modell-Registry, getrennte Tier-/Effort-Konfigurationen und erster sicherer Canvas-Komponentenumfang.
- Lokale Gesprächsspeicherung und ausführbare Funktionsprüfungen.
- Einschränkungen: manuelle Backend-Konfiguration, eingeschränkter Markdown-Umfang, unvollständiger Canvas-Katalog.

## Lemon-1-Chat-Verbesserungen — Entwicklungsmeilenstein · 24.10.2026

Commit [b190eb0](https://github.com/wikspeck/LemonAi/commit/b190eb0) · eine Version »1.1« ist nicht belegt.

- Überarbeitung der Chat-Oberfläche und Markdown-Antwortdarstellung.

## Lemon 1 — Chat-Meilenstein · 15.10.2026

Commit [d4fcca6](https://github.com/wikspeck/LemonAi/commit/d4fcca6) · die Zuordnung »Lemon 1« folgt dem Produktauftrag, kein entsprechender Release-Tag ist vorhanden.

- Cloudflare-Chat-Oberfläche und Chat-API-Route.

## Frühe Lernanwendung — Entwicklungsmeilensteine · September 2026

- 07.09.2026 · [013772b](https://github.com/wikspeck/LemonAi/commit/013772b): bessere Prüfung strukturierter AI-Ausgaben und Diagnoseinformationen.
- 06.09.2026 · [e8fdbc9](https://github.com/wikspeck/LemonAi/commit/e8fdbc9): Workspace v2, Outputs-API und überarbeitete Oberfläche.
- 06.09.2026 · [792457f](https://github.com/wikspeck/LemonAi/commit/792457f): Workspace-basierte Lernmaterial-Erzeugung.
- 06.09.2026 · [1462bca](https://github.com/wikspeck/LemonAi/commit/1462bca): erster im Repository vorhandener Commit, Lemon AI learning analyzer.

Frühe »Beta«-Releases, genaue Beta-Versionsnummern und zugehörige Veröffentlichungsdaten sind nicht verifiziert. Das Repository beginnt mit den obigen Entwicklungscommits.


