const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

function fixture({ platform = 'darwin', deferLayout = false, language = 'en', remoteUnavailable = false, bundle = false } = {}) {
  const calls = [];
  const disposers = [];
  const frames = new Map();
  const layout = [];
  const settings = [];
  const notices = [];
  const tabs = [];
  const observers = [];
  const materialRows = [];
  const events = new Map();
  const classes = new Set(['is-translucent']);
  const variables = new Map([
    ['--nag-terminal-font', 'Monaco'],
    ['--nag-native-material', 'hud']
  ]);
  let serial = 0;
  let destroyed = false;
  let remoteImports = 0;
  class Plugin {
    registerEvent() {}
    registerDomEvent() {}
    register(callback) { disposers.push(callback); }
    addSettingTab(tab) { tabs.push(tab); }
  }
  class PluginSettingTab {
    constructor(app, plugin) {
      this.app = app; this.plugin = plugin;
      this.containerEl = { empty() { settings.length = 0; } };
    }
  }
  class Setting {
    constructor() { this.row = {}; settings.push(this.row); }
    setName(value) { this.row.name = value; return this; }
    setDesc(value) { this.row.description = value; return this; }
  }
  const nativeWindow = {
    isDestroyed: () => destroyed,
    getBackgroundColor: () => '#123456',
    setBackgroundColor: color => calls.push(['background', color]),
    setVibrancy: material => calls.push(['material', material])
  };
  const remote = {
    getCurrentWindow: () => nativeWindow,
    nativeTheme: { themeSource: 'system' }
  };
  const context = {
    module: { exports: {} },
    process: { platform },
    console: { ...console, error() {} },
    require(name) {
      if (name === 'obsidian') return {
        Plugin, PluginSettingTab, Setting,
        Notice: class { constructor(value) { notices.push(value); } },
        getLanguage: () => language
      };
      if (name === './theme-strings.json') return JSON.parse(readFileSync(join(__dirname, '../src/theme-strings.json'), 'utf8'));
      if (name === '@electron/remote') {
        remoteImports++;
        if (remoteUnavailable) throw new Error('Native access unavailable');
        return remote;
      }
      throw new Error(`Unexpected runtime import: ${name}`);
    },
    document: {
      head: {}, body: { classList: { contains: cls => classes.has(cls) } },
      querySelectorAll(selector) {
        assert.equal(selector, '.style-settings-container [data-id^="nag-"]');
        return materialRows;
      }
    },
    window: {
      requestAnimationFrame(callback) { const id = ++serial; frames.set(id, callback); return id; },
      cancelAnimationFrame(id) { frames.delete(id); }
    },
    getComputedStyle: () => ({ getPropertyValue: name => variables.get(name) || '' }),
    MutationObserver: class {
      constructor(callback) { this.callback = callback; this.disconnected = false; observers.push(this); }
      observe() {}
      disconnect() { this.disconnected = true; }
    }
  };
  vm.runInNewContext(readFileSync(join(__dirname, bundle ? '../main.js' : '../src/main.js'), 'utf8'), context);
  const plugin = new context.module.exports();
  plugin.app = { workspace: {
    on: (name, callback) => { events.set(name, callback); return {}; },
    onLayoutReady(callback) { if (deferLayout) layout.push(callback); else callback(); }
  } };
  plugin.onload();
  return {
    plugin, calls, classes, variables, frames, remote, settings, notices, observers, materialRows, events,
    document: context.document, uiWindow: context.window,
    flush() { for (const [id, callback] of [...frames]) { frames.delete(id); callback(); } },
    unload() { plugin.onunload(); for (const dispose of disposers) dispose(); },
    deliverLayout() { layout.forEach(callback => callback()); },
    destroyWindow() { destroyed = true; },
    imports: () => remoteImports,
    display() { tabs[0].display(); return settings; },
    setLanguage(value) { language = value; }
  };
}

test('clear and HUD materials use supported APIs without fading text', () => {
  const f = fixture(); f.flush();
  assert.deepEqual(f.calls.at(-1), ['material', 'hud']);
  assert.equal(f.remote.nativeTheme.themeSource, 'dark');
  f.variables.set('--nag-native-material', 'clear'); f.plugin.applyMaterial();
  assert.deepEqual(f.calls.at(-1), ['material', null]);
  f.variables.set('--nag-native-material', 'hud'); f.plugin.applyMaterial();
  assert.deepEqual(f.calls.at(-1), ['material', 'hud']);
  // The stub has no setOpacity(), so a whole-window fade would fail this test.
  f.unload();
});

test('unchanged settings do not repeat native work; solid reading mode removes frost', () => {
  const f = fixture(); f.flush(); const count = f.calls.length;
  f.plugin.applyMaterial(); assert.equal(f.calls.length, count);
  f.classes.add('nag-solid'); f.plugin.applyMaterial();
  assert.deepEqual(f.calls.at(-1), ['material', null]); f.unload();
});

test('theme change restores prior appearance and background', () => {
  const f = fixture(); f.flush(); f.variables.delete('--nag-terminal-font'); f.plugin.applyMaterial();
  assert.equal(f.remote.nativeTheme.themeSource, 'system');
  assert.deepEqual(f.calls.slice(-2), [['material', 'sidebar'], ['background', '#123456']]);
  assert.equal(f.plugin.applied, false); f.unload();
});

test('deferred layout callback cannot reactivate an unloaded plugin', () => {
  const f = fixture({ deferLayout: true }); f.unload(); f.deliverLayout(); f.flush();
  assert.equal(f.frames.size, 0); assert.equal(f.calls.length, 0);
});

test('queued callbacks are canceled and dark appearance restores after window destruction', () => {
  const f = fixture(); f.flush(); f.plugin.schedule(); assert.equal(f.frames.size, 1);
  f.destroyWindow(); f.unload();
  assert.equal(f.frames.size, 0); assert.equal(f.remote.nativeTheme.themeSource, 'system');
});

test('unsupported platforms do not import Electron or change the window', () => {
  const f = fixture({ platform: 'win32' }); f.flush(); f.unload();
  assert.equal(f.imports(), 0); assert.equal(f.calls.length, 0);
});

test('settings follow German and English app languages, with English fallback', () => {
  const f = fixture({ language: 'de' });
  assert.deepEqual(f.display().map(row => row.name), ['Fensterglas', 'Native Transparenz']);
  assert.match(f.settings[0].description, /Wähle klares oder dunkles/);
  assert.match(f.settings[1].description, /verändert keine Anwendungsdateien/);
  f.setLanguage('en');
  assert.deepEqual(f.display().map(row => row.name), ['Window glass', 'Native transparency']);
  assert.match(f.settings[0].description, /Choose clear or dark/);
  f.setLanguage('fr');
  assert.deepEqual(f.display().map(row => row.name), ['Window glass', 'Native transparency']);
  f.setLanguage('de-DE');
  assert.equal(f.display()[0].name, 'Fensterglas');
  f.unload();
});

test('native-access notices are localized in both languages', () => {
  const de = fixture({ language: 'de', remoteUnavailable: true });
  assert.deepEqual(de.notices, ['Neon Amber Glass: Nativer Fensterzugriff ist nicht verfügbar.']);
  assert.equal(de.display()[0].description, 'Nativer Fensterzugriff ist nicht verfügbar.');
  de.unload();
  const en = fixture({ language: 'en', remoteUnavailable: true });
  assert.deepEqual(en.notices, ['Neon Amber Glass: Native window access is unavailable.']);
  en.unload();
});

test('unsupported-platform information is localized without importing Electron', () => {
  const de = fixture({ language: 'de', platform: 'win32' });
  assert.equal(de.display()[0].name, 'macOS erforderlich');
  assert.equal(de.imports(), 0); de.unload();
  const en = fixture({ language: 'en', platform: 'linux' });
  assert.equal(en.display()[0].name, 'macOS required');
  assert.equal(en.imports(), 0); en.unload();
});

test('material labels and the default label translate without changing saved values', () => {
  const f = fixture({ language: 'de' });
  let writes = 0;
  const options = ['clear', 'under-window', 'hud', 'not-a-material'].map(value => {
    let label = value;
    return { value, remove() { options.splice(options.indexOf(this), 1); }, get textContent() { return label; }, set textContent(next) { label = next; writes++; } };
  });
  const select = { options, value: 'hud' };
  const defaultNode = { nodeType: 3, nodeValue: 'Frosted / Matt' };
  const small = { childNodes: [{ nodeType: 1 }, defaultNode] };
  const row = { dataset: { id: 'nag-native-material' }, querySelector: selector => selector === 'select' ? select : selector === '.setting-item-description small' ? small : null };
  f.materialRows.push(row);
  f.flush();
  assert.deepEqual(options.map(option => option.textContent), [
    'Klar · kein Desktop-Blur', 'Dunkles HUD-Glas', 'not-a-material'
  ]);
  assert.equal(defaultNode.nodeValue, 'Dunkles HUD-Glas');
  assert.equal(select.value, 'hud');
  assert.equal(f.variables.get('--nag-native-material'), 'hud');
  const firstWrites = writes;
  f.plugin.localizeThemeControls(); assert.equal(writes, firstWrites);
  f.setLanguage('en'); f.plugin.localizeThemeControls();
  assert.deepEqual(options.map(option => option.textContent), [
    'Clear · no desktop blur', 'Dark HUD glass', 'not-a-material'
  ]);
  assert.equal(defaultNode.nodeValue, 'Dark HUD glass');
  assert.equal(select.value, 'hud');
  f.unload();
  f.setLanguage('de'); f.plugin.localizeThemeControls();
  assert.equal(options[0].textContent, 'Clear · no desktop blur');
  assert.ok(f.observers.every(observer => observer.disconnected));
});

test('UI observer ignores unrelated changes and cancels queued localization on unload', () => {
  const f = fixture(); f.flush();
  const observer = f.observers[0];
  observer.callback([{ target: { closest: () => null }, addedNodes: [{ nodeType: 3 }] }]);
  assert.equal(f.frames.size, 0);
  observer.callback([{ target: { closest: () => true }, addedNodes: [] }]);
  assert.equal(f.frames.size, 1);
  f.unload(); assert.equal(f.frames.size, 0);
  observer.callback([{ target: { closest: () => true }, addedNodes: [] }]);
  assert.equal(f.frames.size, 0);
});

test('legacy frosted values select HUD without modifying stored values', () => {
  const f = fixture(); f.variables.set('--nag-native-material', 'under-window'); f.flush();
  assert.deepEqual(f.calls.at(-1), ['material', 'hud']);
  assert.equal(f.variables.get('--nag-native-material'), 'under-window');
  assert.ok(f.calls.every(call => call[1] !== 'under-window'));
  f.unload();
});

test('theme controls translate in a separate settings window and preserve its markup', () => {
  const f = fixture({ language: 'de' }); f.flush();
  const titleNode = { nodeType: 3, nodeValue: 'Background transparency' };
  const descriptionNode = { nodeType: 3, nodeValue: 'English description' };
  const icon = { nodeType: 1 };
  const prefix = { textContent: 'Default: ' };
  const row = { dataset: { id: 'nag-transparency' }, querySelector: selector => ({
    '.setting-item-name': { childNodes: [icon, titleNode] },
    '.setting-item-description': { childNodes: [descriptionNode] },
    '.setting-item-description small strong': prefix
  }[selector] || null) };
  const doc = { body: {}, defaultView: f.uiWindow, querySelectorAll: () => [row] };
  f.events.get('window-open')({}, { document: doc }); f.flush();
  assert.equal(titleNode.nodeValue, 'Hintergrund-Transparenz');
  assert.match(descriptionNode.nodeValue, /Text bleibt deckend/);
  assert.equal(prefix.textContent, 'Standard: ');
  assert.equal(icon.nodeType, 1);
  f.events.get('window-close')({}, { document: doc });
  assert.equal(f.plugin.uiDocuments.has(doc), false);
  f.setLanguage('en'); f.plugin.scheduleUi(doc); f.flush();
  assert.equal(titleNode.nodeValue, 'Hintergrund-Transparenz');
  f.unload();
});

test('only theme toggle command names change, and unloading restores them', () => {
  const f = fixture({ language: 'de' });
  const id = 'obsidian-style-settings:style-settings-class-toggle-neon-amber-glass-nag-solid';
  const command = { id, name: 'Style Settings: Toggle Opaque reading mode', callback() {} };
  const other = { name: 'Unrelated command' };
  f.plugin.app.commands = { commands: { [id]: command, other } };
  f.plugin.localizeCommands();
  assert.equal(command.name, 'Style Settings: Umschalten: Blickdichter Lesemodus');
  assert.equal(command.id, id); assert.equal(other.name, 'Unrelated command');
  f.setLanguage('en'); f.plugin.localizeCommands();
  assert.equal(command.name, 'Style Settings: Toggle Opaque reading mode');
  f.setLanguage('de'); f.plugin.localizeCommands(); f.unload();
  assert.equal(command.name, 'Style Settings: Toggle Opaque reading mode');
});

test('release bundle includes translations and works without a separate JSON asset', () => {
  const f = fixture({ language: 'de', bundle: true }); f.flush();
  assert.equal(f.display()[0].name, 'Fensterglas');
  assert.deepEqual(f.calls.at(-1), ['material', 'hud']);
  f.setLanguage('en'); assert.equal(f.display()[0].name, 'Window glass');
  f.unload();
});
