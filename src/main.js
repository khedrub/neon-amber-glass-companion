/* Native window material only. No note access, networking, opacity changes,
 * polling, application patching, or private macOS APIs.
 */
const { Plugin, PluginSettingTab, Setting, Notice, getLanguage } = require('obsidian');
const themeStrings = require('./theme-strings.json');

const translations = {
  en: {
    glassTitle: 'Window glass',
    glassDescription: 'Choose clear or dark HUD glass in Style Settings → Neon Amber Glass. Background transparency and tint remain separate controls.',
    transparencyTitle: 'Native transparency',
    transparencyDescription: 'True desktop transparency requires Obsidian to create a transparent window. On affected installations, changing a material alone cannot restore desktop sampling. This companion does not modify application files. macOS determines native blur strength.',
    unavailable: 'Native window access is unavailable.',
    platformTitle: 'macOS required',
    platformDescription: 'Native window materials are available on macOS desktop only. The theme and its translated appearance controls remain usable on other platforms.',
    clear: 'Clear · no desktop blur',
    hud: 'Dark HUD glass',
    defaultPrefix: 'Default: ',
    togglePrefix: 'Toggle '
  },
  de: {
    glassTitle: 'Fensterglas',
    glassDescription: 'Wähle klares oder dunkles HUD-Glas unter Style Settings → Neon Amber Glass. Hintergrund-Transparenz und Tönung bleiben getrennte Regler.',
    transparencyTitle: 'Native Transparenz',
    transparencyDescription: 'Echte Desktop-Durchsicht benötigt ein transparent gestartetes Obsidian-Fenster. Bei betroffenen Installationen reicht ein Materialwechsel allein nicht aus. Dieses Plugin verändert keine Anwendungsdateien. macOS bestimmt die Stärke des nativen Blurs.',
    unavailable: 'Nativer Fensterzugriff ist nicht verfügbar.',
    platformTitle: 'macOS erforderlich',
    platformDescription: 'Native Fenstermaterialien stehen nur auf dem macOS-Desktop zur Verfügung. Das Theme und seine übersetzten Darstellungsregler bleiben auf anderen Plattformen nutzbar.',
    clear: 'Klar · kein Desktop-Blur',
    hud: 'Dunkles HUD-Glas',
    defaultPrefix: 'Standard: ',
    togglePrefix: 'Umschalten: '
  }
};

function language() {
  return getLanguage().toLowerCase().split('-')[0] === 'de' ? 'de' : 'en';
}
function text(key) {
  return translations[language()][key] || translations.en[key];
}

// Style Settings translates titles and descriptions, but not select labels.
// Older versions also cache a language that may differ from Obsidian's.
// Touch only this theme's controls; never inspect note contents.
const themeSelector = '.style-settings-container [data-id^="nag-"]';

module.exports = class NeonAmberGlassCompanion extends Plugin {
  onload() {
    this.unloaded = false;
    this.uiDocuments = new Map();
    this.commandNames = new Map();
    this.settingsTab = new GlassSettings(this.app, this);
    this.addSettingTab(this.settingsTab);
    this.observeUiDocument(document);
    this.observeUiDocument(this.settingsTab.containerEl.ownerDocument);
    this.registerEvent(this.app.workspace.on('window-open', (_, win) => this.observeUiDocument(win.document)));
    this.registerEvent(this.app.workspace.on('window-close', (_, win) => this.removeUiDocument(win.document)));
    this.uiHeadObserver = new MutationObserver(() => {
      for (const doc of this.uiDocuments.keys()) this.scheduleUi(doc);
    });
    this.uiHeadObserver.observe(document.head, { childList: true, subtree: true, characterData: true });
    this.register(() => {
      this.uiHeadObserver.disconnect();
      for (const doc of this.uiDocuments.keys()) this.removeUiDocument(doc);
    });
    this.localizeCommands();
    if (process.platform !== 'darwin') return;
    try {
      this.remote = require('@electron/remote');
      this.nativeWindow = this.remote.getCurrentWindow();
      this.originalBackground = this.nativeWindow.getBackgroundColor();
      this.originalThemeSource = this.remote.nativeTheme.themeSource;
    } catch (error) {
      this.nativeUnavailable = true;
      console.error(`Neon Amber Glass: ${text('unavailable')}`, error);
      new Notice(`Neon Amber Glass: ${text('unavailable')}`);
      return;
    }
    this.lastKey = null;
    this.applied = false;
    this.frame = null;
    this.registerEvent(this.app.workspace.on('css-change', () => this.schedule()));
    this.registerEvent(this.app.workspace.on('parse-style-settings', () => this.schedule()));
    this.registerDomEvent(window, 'focus', () => this.schedule());
    this.headObserver = new MutationObserver(() => this.schedule());
    this.headObserver.observe(document.head, {
      childList: true, subtree: true, characterData: true
    });
    this.bodyObserver = new MutationObserver(() => this.schedule());
    this.bodyObserver.observe(document.body, {
      attributes: true, attributeFilter: ['class', 'style']
    });
    this.register(() => {
      this.headObserver.disconnect();
      this.bodyObserver.disconnect();
      if (this.frame !== null) window.cancelAnimationFrame(this.frame);
    });
    this.app.workspace.onLayoutReady(() => this.schedule());
  }

  observeUiDocument(doc) {
    if (this.unloaded || !doc?.body || this.uiDocuments.has(doc)) return;
    const win = doc.defaultView || window;
    const observer = new MutationObserver(records => {
      if (records.some(record => record.target.closest?.(themeSelector) ||
        [...record.addedNodes].some(node => node.nodeType === 1 &&
          (node.matches(themeSelector) || node.querySelector(themeSelector))))) this.scheduleUi(doc);
    });
    this.uiDocuments.set(doc, { win, observer, frame: null });
    observer.observe(doc.body, { childList: true, subtree: true });
    this.scheduleUi(doc);
  }

  removeUiDocument(doc) {
    const entry = this.uiDocuments.get(doc);
    if (!entry) return;
    entry.observer.disconnect();
    if (entry.frame !== null) entry.win.cancelAnimationFrame(entry.frame);
    this.uiDocuments.delete(doc);
  }

  scheduleUi(doc = document) {
    const entry = this.uiDocuments.get(doc);
    if (this.unloaded || !entry || entry.frame !== null) return;
    entry.frame = entry.win.requestAnimationFrame(() => {
      entry.frame = null;
      this.localizeThemeControls(doc);
      this.localizeCommands();
    });
  }

  localizeThemeControls(doc = document) {
    if (this.unloaded) return;
    for (const row of doc.querySelectorAll(themeSelector)) {
      const strings = themeStrings[row.dataset.id]?.[language()];
      if (!strings) continue;
      for (const [selector, value] of [['.setting-item-name', strings.title], ['.setting-item-description', strings.description]]) {
        const element = row.querySelector(selector);
        const node = element && [...element.childNodes].find(child => child.nodeType === 3);
        if (node && value && node.nodeValue !== value) node.nodeValue = value;
      }
      const prefix = row.querySelector('.setting-item-description small strong');
      if (prefix && prefix.textContent !== text('defaultPrefix')) prefix.textContent = text('defaultPrefix');
      if (row.dataset.id !== 'nag-native-material') continue;
      const select = row.querySelector('select');
      if (!select) continue;
      const legacy = select.value === 'under-window' || !select.value;
      for (const option of [...select.options]) {
        if (option.value === 'under-window') { option.remove(); continue; }
        if (!['clear', 'hud'].includes(option.value)) continue;
        const label = text(option.value);
        if (option.textContent !== label) option.textContent = label;
      }
      if (legacy) select.value = 'hud';
      const small = row.querySelector('.setting-item-description small');
      const defaultLabel = small && [...small.childNodes].find(node => node.nodeType === 3);
      if (defaultLabel && defaultLabel.nodeValue !== text('hud')) {
        defaultLabel.nodeValue = text('hud');
      }
    }
  }

  localizeCommands() {
    if (this.unloaded) return;
    for (const id of ['nag-solid', 'nag-nav-by-level']) {
      const commandId = `obsidian-style-settings:style-settings-class-toggle-neon-amber-glass-${id}`;
      const command = this.app.commands?.commands?.[commandId];
      if (!command) continue;
      const name = `Style Settings: ${text('togglePrefix')}${themeStrings[id][language()].title}`;
      if (!this.commandNames.has(command) && command.name !== name) this.commandNames.set(command, { original: command.name, translated: name });
      const saved = this.commandNames.get(command);
      if (saved) saved.translated = name;
      command.name = name;
    }
  }

  schedule() {
    if (this.unloaded || this.frame !== null) return;
    this.frame = window.requestAnimationFrame(() => {
      this.frame = null;
      this.applyMaterial();
    });
  }

  applyMaterial() {
    if (this.unloaded || !this.nativeWindow || this.nativeWindow.isDestroyed()) return;
    const style = getComputedStyle(document.body);
    const ourTheme = !!style.getPropertyValue('--nag-terminal-font').trim();
    const translucent = document.body.classList.contains('is-translucent');
    const solid = document.body.classList.contains('nag-solid');
    if (!ourTheme || !translucent) {
      this.restore();
      return;
    }
    const requested = style.getPropertyValue('--nag-native-material').trim();
    // Old under-window values use HUD; never apply the removed material.
    const material = solid || requested === 'clear' ? null : 'hud';
    const key = String(material);
    if (this.applied && key === this.lastKey) return;
    // Window transparency must be enabled at creation. This preserves fully
    // opaque text; setOpacity() is deliberately never used.
    this.nativeWindow.setBackgroundColor('#00000000');
    this.remote.nativeTheme.themeSource = 'dark';
    this.nativeWindow.setVibrancy(material);
    this.lastKey = key;
    this.applied = true;
  }

  restore() {
    if (!this.applied) return;
    // Return to Obsidian's sidebar material when relinquishing control.
    if (!this.nativeWindow.isDestroyed()) {
      this.nativeWindow.setVibrancy('sidebar');
      this.nativeWindow.setBackgroundColor(this.originalBackground);
    }
    this.remote.nativeTheme.themeSource = this.originalThemeSource;
    this.lastKey = null;
    this.applied = false;
  }

  onunload() {
    this.unloaded = true;
    for (const [command, saved] of this.commandNames) {
      if (command.name === saved.translated) command.name = saved.original;
    }
    this.commandNames.clear();
    if (this.nativeWindow) this.restore();
  }
};

class GlassSettings extends PluginSettingTab {
  display() {
    const { containerEl } = this;
    containerEl.empty();
    this.plugin.observeUiDocument(containerEl.ownerDocument);
    if (process.platform !== 'darwin') {
      new Setting(containerEl)
        .setName(text('platformTitle'))
        .setDesc(text('platformDescription'));
    } else if (this.plugin.nativeUnavailable) {
      new Setting(containerEl)
        .setName(text('transparencyTitle'))
        .setDesc(text('unavailable'));
    }
    new Setting(containerEl)
      .setName(text('glassTitle'))
      .setDesc(text('glassDescription'));
    new Setting(containerEl)
      .setName(text('transparencyTitle'))
      .setDesc(text('transparencyDescription'));
  }
}
