# Neon Amber Glass Companion

[English](README.md) · [Deutsch](README.de.md)

Switch between clear and dark HUD window materials on macOS when using the [Neon Amber Glass](https://github.com/khedrub/neon-amber-glass) theme.

Background transparency and tint stay separate from the native window material. Text remains opaque; the companion never fades the entire window.

## Requirements

- macOS desktop. Windows, Linux and mobile are not supported by this companion.
- Obsidian 1.14.4 or newer. Tested with installer 1.13.7.
- The Neon Amber Glass theme, with Obsidian's **Translucent window** setting enabled.
- [Style Settings](https://github.com/community-archive/obsidian-style-settings) for the material dropdown. Without it, the theme's dark HUD default is used.

## Install

Open the [community listing](https://community.obsidian.md/plugins/neon-amber-glass-companion) or install the companion under **Settings → Community plugins → Browse**. New releases may need to complete the directory review before installation is enabled.

For manual installation, download `main.js` and `manifest.json` from the [latest release](https://github.com/khedrub/neon-amber-glass-companion/releases/latest), copy them into `<vault>/.obsidian/plugins/neon-amber-glass-companion/`, restart Obsidian and enable the companion in **Settings → Community plugins**.

Open **Settings → Style Settings → Neon Amber Glass → Window glass**:

| Option | Native material |
| --- | --- |
| Clear · no desktop blur | Clear, without a vibrancy material |
| Dark HUD glass | Dark HUD material |

Dark HUD glass is the default. The plain frosted material has been removed; saved `under-window` values are treated as HUD without rewriting saved settings.

The setting applies live to the main vault window. The theme's opaque reading mode also removes native frosting. Pop-out windows are not controlled.

## Language

The companion's settings, platform information, native-access error messages and material dropdown labels follow Obsidian's language: German or English. Other languages use English. Change the language under **Settings → General → Language** and restart Obsidian when prompted. No separate language setting or saved-value migration is needed.

The companion translates the theme's material dropdown, default-value labels and toggle commands. It also corrects older Style Settings versions that use a different language from Obsidian. Use theme 1.3.0 or newer for the complete German/English appearance controls. Without the companion, material options show compact bilingual labels. The plugin metadata description contains both languages; the product name stays unchanged.

## Native transparency limits

Real desktop sampling requires Obsidian/Electron to create the window with transparency enabled. Some installations start an opaque window despite the translucency preference; changing CSS or `setVibrancy()` alone cannot fix that creation flag. On those installations, a material may appear as a uniform wash rather than a view of the desktop.

This companion **does not patch application files**, install dependencies or disable any security checks. It selects native materials through Electron's supported `setVibrancy()` API and keeps the window background transparent. It does not call `setOpacity()`.

macOS determines native blur strength. The theme's separate popup-blur slider controls in-app overlays; it is not a continuous desktop-blur radius.

While the theme is active, the companion selects a dark Electron native appearance. This appearance setting is app-wide. When the theme is changed, translucency is disabled or the plugin unloads, it restores the previous native appearance and background, and returns the main window to Obsidian's sidebar material.

## Privacy

No network requests, accounts, analytics or telemetry. No note access, file reads or file writes. No application patching. The localization helper changes only this theme's appearance controls, default-value labels and toggle command names. It also supports separate settings windows. Observers and animation callbacks are cleaned up on unload.

The runtime uses Obsidian's supplied `@electron/remote` module only on macOS desktop. There are no separately installed runtime dependencies.

## Development

Source: `src/main.js`. Release bundle: `main.js`. Node 22 or newer:

```sh
npm run check
npm run build
npm test
```

The build bundles `src/theme-strings.json` into the readable CommonJS source; the release needs only `main.js` and `manifest.json`. The tests use isolated Obsidian/Electron stubs to check material selection, restoration, callback cleanup and unsupported platforms. Additional checks cover both languages, material labels and the English fallback for other languages. No dependency installation is needed.

Publish a GitHub release with a tag matching the manifest version, and attach `main.js` and `manifest.json`.

## License

[MIT](LICENSE), © 2026 khedrub. A [German translation](LICENSE.de.md) is included for convenience.
