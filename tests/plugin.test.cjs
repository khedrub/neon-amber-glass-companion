const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

function fixture({ platform = 'darwin', deferLayout = false } = {}) {
  const calls = [];
  const disposers = [];
  const frames = new Map();
  const layout = [];
  const classes = new Set(['is-translucent']);
  const variables = new Map([
    ['--nag-terminal-font', 'Monaco'],
    ['--nag-native-material', 'under-window']
  ]);
  let serial = 0;
  let destroyed = false;
  let remoteImports = 0;
  class Plugin {
    registerEvent() {}
    registerDomEvent() {}
    register(callback) { disposers.push(callback); }
    addSettingTab() {}
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
    console,
    require(name) {
      if (name === 'obsidian') return {
        Plugin, PluginSettingTab: class {}, Setting: class {}, Notice: class {}
      };
      if (name === '@electron/remote') { remoteImports++; return remote; }
      throw new Error(`Unexpected runtime import: ${name}`);
    },
    document: { head: {}, body: { classList: { contains: cls => classes.has(cls) } } },
    window: {
      requestAnimationFrame(callback) { const id = ++serial; frames.set(id, callback); return id; },
      cancelAnimationFrame(id) { frames.delete(id); }
    },
    getComputedStyle: () => ({ getPropertyValue: name => variables.get(name) || '' }),
    MutationObserver: class { observe() {} disconnect() {} }
  };
  vm.runInNewContext(readFileSync(join(__dirname, '../src/main.js'), 'utf8'), context);
  const plugin = new context.module.exports();
  plugin.app = { workspace: {
    on: () => ({}),
    onLayoutReady(callback) { if (deferLayout) layout.push(callback); else callback(); }
  } };
  plugin.onload();
  return {
    plugin, calls, classes, variables, frames, remote,
    flush() { for (const [id, callback] of [...frames]) { frames.delete(id); callback(); } },
    unload() { plugin.onunload(); for (const dispose of disposers) dispose(); },
    deliverLayout() { layout.forEach(callback => callback()); },
    destroyWindow() { destroyed = true; },
    imports: () => remoteImports
  };
}

test('frosted, clear and HUD materials use supported APIs without fading text', () => {
  const f = fixture(); f.flush();
  assert.deepEqual(f.calls.at(-1), ['material', 'under-window']);
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
