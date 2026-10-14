/* Native window material only. No note access, networking, opacity changes,
 * polling, application patching, or private macOS APIs.
 */
const { Plugin, PluginSettingTab, Setting, Notice } = require('obsidian');

module.exports = class NeonAmberGlassCompanion extends Plugin {
  onload() {
    this.unloaded = false;
    if (process.platform !== 'darwin') return;
    try {
      this.remote = require('@electron/remote');
      this.nativeWindow = this.remote.getCurrentWindow();
      this.originalBackground = this.nativeWindow.getBackgroundColor();
      this.originalThemeSource = this.remote.nativeTheme.themeSource;
    } catch (error) {
      console.error('Neon Amber Glass: native window access unavailable', error);
      new Notice('Neon Amber Glass: Nativer Fensterzugriff ist nicht verfügbar.');
      return;
    }
    this.lastKey = null;
    this.applied = false;
    this.frame = null;
    this.addSettingTab(new GlassSettings(this.app, this));
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
    const material = solid || requested === 'clear' ? null
      : requested === 'hud' ? 'hud' : 'under-window';
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
    if (this.nativeWindow) this.restore();
  }
};

class GlassSettings extends PluginSettingTab {
  display() {
    const { containerEl } = this;
    containerEl.empty();
    new Setting(containerEl)
      .setName('Window glass')
      .setDesc('Choose clear, frosted or dark HUD glass in Style Settings → Neon Amber Glass. Background transparency and tint remain separate controls.');
    new Setting(containerEl)
      .setName('Native transparency')
      .setDesc('True desktop transparency requires Obsidian to create a transparent window. On affected installations, changing a material alone cannot restore desktop sampling. This companion does not modify application files. macOS determines native blur strength.');
  }
}
