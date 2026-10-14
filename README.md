# Neon Amber Glass Companion

Switch between clear, frosted and dark HUD window materials on macOS when using the [Neon Amber Glass](https://github.com/khedrub/neon-amber-glass) theme.

Background transparency and tint stay separate from the native window material. Text remains opaque; the companion never fades the entire window.

## Requirements

- macOS desktop. Windows, Linux and mobile are not supported by this companion.
- Obsidian 1.14.4 or newer. Tested with installer 1.13.7.
- The Neon Amber Glass theme, with Obsidian's **Translucent window** setting enabled.
- [Style Settings](https://github.com/community-archive/obsidian-style-settings) for the material dropdown. Without it, the theme's frosted default is used.

## Install

The community-directory submission is pending. Until the companion is listed, download `main.js` and `manifest.json` from the [latest release](https://github.com/khedrub/neon-amber-glass-companion/releases/latest), copy them into `<vault>/.obsidian/plugins/neon-amber-glass-companion/`, restart Obsidian and enable the companion in **Settings → Community plugins**.

Open **Settings → Style Settings → Neon Amber Glass → Fensterglas**:

| Option | Native material |
| --- | --- |
| Klar | Clear, without a vibrancy material |
| Matt | macOS under-window material |
| Matt · dunkles HUD-Glas | Dark HUD material |

The setting applies live to the main vault window. The theme's opaque reading mode also removes native frosting. Pop-out windows are not controlled.

## Native transparency limits

Real desktop sampling requires Obsidian/Electron to create the window with transparency enabled. Some installations start an opaque window despite the translucency preference; changing CSS or `setVibrancy()` alone cannot fix that creation flag. On those installations, a material may appear as a uniform wash rather than a view of the desktop.

This companion **does not patch application files**, install dependencies or disable any security checks. It selects native materials through Electron's supported `setVibrancy()` API and keeps the window background transparent. It does not call `setOpacity()`.

macOS determines native blur strength. The theme's separate popup-blur slider controls in-app overlays; it is not a continuous desktop-blur radius.

While the theme is active, the companion selects a dark Electron native appearance. This appearance setting is app-wide. When the theme is changed, translucency is disabled or the plugin unloads, it restores the previous native appearance and background, and returns the main window to Obsidian's sidebar material.

## Privacy

No network requests, accounts, analytics or telemetry. No note access, file reads or file writes. No application patching. Observers and animation callbacks are cleaned up on unload.

The runtime uses Obsidian's supplied `@electron/remote` module only on macOS desktop. There are no separately installed runtime dependencies.

## Development

Source: `src/main.js`. Release bundle: `main.js`. Node 22 or newer:

```sh
npm run check
npm run build
npm test
```

The build copies the readable CommonJS source unchanged. The tests use isolated Obsidian/Electron stubs to check material selection, restoration, callback cleanup and unsupported platforms. No dependency installation is needed.

Publish a GitHub release with a tag matching the manifest version, and attach `main.js` and `manifest.json`.

## License

[MIT](LICENSE), © 2026 khedrub.
