# Neon Amber Glass Companion

[Deutsch](README.de.md) · [English](README.md)

Wähle klares oder dunkles HUD-Fenstermaterial auf macOS, während du das [Neon Amber Glass](https://github.com/khedrub/neon-amber-glass)-Theme verwendest.

Hintergrund-Transparenz und Tönung bleiben vom nativen Fenstermaterial getrennt. Text bleibt deckend; der Companion blendet niemals das gesamte Fenster aus.

## Voraussetzungen

- macOS-Desktop. Windows, Linux und Mobilgeräte werden für native Fenstermaterialien nicht unterstützt.
- Obsidian 1.14.4 oder neuer. Getestet mit Installer 1.13.7.
- Das Neon Amber Glass-Theme und Obsidians aktivierte Einstellung **Transparenzeffekt** (englisch: **Translucent window**).
- [Style Settings](https://github.com/community-archive/obsidian-style-settings) für die Materialauswahl. Ohne dieses Plugin wird das dunkle HUD-Standardmaterial des Themes verwendet.

## Installation

Öffne den [Community-Eintrag](https://community.obsidian.md/plugins/neon-amber-glass-companion) oder installiere den Companion unter **Einstellungen → Externe Erweiterungen → Durchsuchen**. Bei neuen Versionen muss gegebenenfalls erst die Prüfung im Verzeichnis abgeschlossen werden, bevor die Installation freigegeben ist.

Für eine manuelle Installation lade `main.js` und `manifest.json` aus dem [neuesten Release](https://github.com/khedrub/neon-amber-glass-companion/releases/latest) herunter. Kopiere sie nach `<Vault>/.obsidian/plugins/neon-amber-glass-companion/`, starte Obsidian neu und aktiviere den Companion unter **Einstellungen → Externe Erweiterungen**.

Öffne **Einstellungen → Style Settings → Neon Amber Glass → Fensterglas**:

| Option | Natives Material |
| --- | --- |
| Klar · kein Desktop-Blur | Klar, ohne Vibrancy-Material |
| Dunkles HUD-Glas | Dunkles HUD-Material |

Dunkles HUD-Glas ist der Standard. Das einfache matte Material wurde entfernt. Gespeicherte `under-window`-Werte werden als HUD behandelt, ohne gespeicherte Einstellungen umzuschreiben.

Die Einstellung wirkt sofort auf das Hauptfenster des Vaults. Der blickdichte Lesemodus des Themes entfernt ebenfalls die native Mattierung. Zusätzliche separate Fenster werden nicht gesteuert.

## Sprache

Die Plugin-Einstellungen, Plattformhinweise, Fehlermeldungen zum nativen Zugriff und Materialnamen folgen der Obsidian-Sprache: Deutsch oder Englisch. Für andere Sprachen wird Englisch verwendet. Ändere die Sprache unter **Einstellungen → Allgemein → Sprache** und starte Obsidian neu, wenn du dazu aufgefordert wirst. Eine eigene Spracheinstellung oder Übertragung gespeicherter Werte ist nicht nötig.

Der Companion übersetzt die Materialauswahl, Standardwert-Anzeigen und Umschaltbefehle des Themes. Er korrigiert außerdem ältere Style-Settings-Versionen, deren Sprache von Obsidian abweicht. Verwende Theme 1.3.0 oder neuer für vollständig deutsche und englische Darstellungsregler. Ohne Companion werden kompakte zweisprachige Materialnamen angezeigt. Die Plugin-Metadatenbeschreibung enthält beide Sprachen; der Produktname bleibt unverändert.

## Grenzen der nativen Transparenz

Echte Desktop-Durchsicht benötigt ein von Obsidian/Electron transparent gestartetes Fenster. Einige Installationen erzeugen trotz aktivierter Durchscheinend-Einstellung ein blickdichtes Fenster. CSS-Änderungen oder `setVibrancy()` allein können diesen Startparameter nicht korrigieren. Auf solchen Installationen kann das Material als gleichmäßige Tönung statt als Sicht auf den Desktop erscheinen.

Dieses Plugin **verändert keine Anwendungsdateien**, installiert keine Abhängigkeiten und deaktiviert keine Sicherheitsprüfungen. Es wählt native Materialien über die unterstützte Electron-API `setVibrancy()` und hält den Fensterhintergrund transparent. Es ruft `setOpacity()` nicht auf.

macOS bestimmt die Stärke des nativen Blurs. Der separate Popup-Blur-Regler des Themes steuert überlagerte Flächen innerhalb der App; er ist kein stufenloser Regler für den Desktop-Blur.

Solange das Theme aktiv ist, wählt der Companion eine dunkle native Electron-Darstellung. Diese Einstellung gilt für die gesamte App. Beim Theme-Wechsel, deaktivierter Durchscheinend-Einstellung oder Entladen des Plugins stellt er die vorherige native Darstellung und Hintergrundfarbe wieder her und gibt das Hauptfenster an Obsidians Sidebar-Material zurück.

## Datenschutz

Keine Netzwerkanfragen, Konten, Analysen oder Telemetrie. Kein Zugriff auf Notizen und keine Datei-Lese- oder Schreibzugriffe. Keine Anwendungs-Patches. Die Übersetzungshilfe verändert ausschließlich die Darstellungsregler, Standardwert-Anzeigen und Umschaltbefehlsnamen dieses Themes. Sie unterstützt auch separate Einstellungsfenster. Beobachter und Animations-Callbacks werden beim Entladen aufgeräumt.

Die Laufzeit verwendet das von Obsidian bereitgestellte Modul `@electron/remote` ausschließlich auf dem macOS-Desktop. Es werden keine zusätzlichen Laufzeit-Abhängigkeiten installiert.

## Entwicklung

Quellcode: `src/main.js`. Release-Datei: `main.js`. Node 22 oder neuer:

```sh
npm run check
npm run build
npm test
```

Der Build integriert `src/theme-strings.json` in den lesbaren CommonJS-Quellcode; für das Release genügen `main.js` und `manifest.json`. Die Tests verwenden isolierte Obsidian-/Electron-Nachbildungen für Materialauswahl, Wiederherstellung, Callback-Aufräumen und nicht unterstützte Plattformen. Zusätzliche Prüfungen decken beide Sprachen, die Materialoptionen und den englischen Rückfall für andere Sprachen ab. Es müssen keine Abhängigkeiten installiert werden.

Veröffentliche ein GitHub-Release mit einem Tag, der der Manifest-Version entspricht, und hänge `main.js` und `manifest.json` an.

## Lizenz

[MIT](LICENSE), © 2026 khedrub. Eine [deutsche Übersetzung](LICENSE.de.md) ist ebenfalls enthalten.
