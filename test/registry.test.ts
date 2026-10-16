import { LazyStore } from '@tauri-apps/plugin-store';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  configurePluginRegistryLogger,
  PLUGIN_REGISTRY_FILE,
  pluginRegistryStore,
  type PluginRegistryEntry,
} from '../src';
import { resetInMemoryTauriStore } from './inMemoryTauriStore';

vi.mock('@tauri-apps/plugin-store', async () => {
  const mod = await import('./inMemoryTauriStore');
  return { LazyStore: mod.LazyStore };
});

const raw = new LazyStore(PLUGIN_REGISTRY_FILE);
const logger = { debug: vi.fn(), warn: vi.fn() };

const entryFor = (
  id: string,
  overrides: Partial<PluginRegistryEntry> = {},
): PluginRegistryEntry => ({
  id,
  version: '1.0.0',
  path: `/app-data/plugins/${id}/1.0.0`,
  installationMethod: 'store',
  enabled: false,
  installedAt: '2025-01-01T00:00:00.000Z',
  lastUpdatedAt: '2025-01-01T00:00:00.000Z',
  ...overrides,
});

beforeEach(() => {
  resetInMemoryTauriStore();
  logger.debug.mockClear();
  logger.warn.mockClear();
  configurePluginRegistryLogger(logger);
});

describe('pluginRegistryStore', () => {
  it('upsert then get round-trips the entry under plugins.<id>', async () => {
    const entry = entryFor('roundtrip');
    await pluginRegistryStore.upsert(entry);

    expect(await pluginRegistryStore.get('roundtrip')).toEqual(entry);
    expect(await raw.get('plugins.roundtrip')).toEqual(entry);
  });

  it('get returns undefined for an unknown id', async () => {
    expect(await pluginRegistryStore.get('missing')).toBeUndefined();
  });

  it('list returns only keys with the plugins. prefix', async () => {
    await pluginRegistryStore.upsert(entryFor('a'));
    await pluginRegistryStore.upsert(entryFor('b'));
    await raw.set('settings.theme', { id: 'not-a-plugin' });

    const ids = (await pluginRegistryStore.list()).map((e) => e.id).sort();
    expect(ids).toEqual(['a', 'b']);
  });

  it('setEnabled updates the flag and keeps the rest of the entry', async () => {
    await pluginRegistryStore.upsert(entryFor('toggle'));
    await pluginRegistryStore.setEnabled('toggle', true);

    expect(await pluginRegistryStore.get('toggle')).toEqual(
      entryFor('toggle', { enabled: true }),
    );
  });

  it('setEnabled on a missing id is a no-op that warns', async () => {
    await pluginRegistryStore.setEnabled('ghost', true);

    expect(await raw.get('plugins.ghost')).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it('setWarnings with an empty array omits the field', async () => {
    await pluginRegistryStore.upsert(entryFor('warned'));
    await pluginRegistryStore.setWarnings('warned', ['Unknown permissions: x']);
    expect((await pluginRegistryStore.get('warned'))?.warnings).toEqual([
      'Unknown permissions: x',
    ]);

    await pluginRegistryStore.setWarnings('warned', []);
    expect((await pluginRegistryStore.get('warned'))?.warnings).toBeUndefined();
  });

  it('remove deletes the key', async () => {
    await pluginRegistryStore.upsert(entryFor('gone'));
    await pluginRegistryStore.remove('gone');

    expect(await raw.get('plugins.gone')).toBeUndefined();
    expect(await pluginRegistryStore.list()).toEqual([]);
  });
});

describe('read validation', () => {
  it.each([
    ['a string', 'corrupt'],
    ['null', null],
    ['missing path', { id: 'x', version: '1.0.0', enabled: true }],
    [
      'non-boolean enabled',
      { id: 'x', version: '1.0.0', path: '/p', enabled: 'yes' },
    ],
    ['empty id', { id: '', version: '1.0.0', path: '/p', enabled: true }],
  ])('list skips and warns on a row that is %s', async (_label, value) => {
    await pluginRegistryStore.upsert(entryFor('good'));
    await raw.set('plugins.bad', value);

    const ids = (await pluginRegistryStore.list()).map((e) => e.id);
    expect(ids).toEqual(['good']);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('plugins.bad'),
    );
  });

  it('get returns undefined and warns for a malformed row', async () => {
    await raw.set('plugins.bad', { id: 'bad' });

    expect(await pluginRegistryStore.get('bad')).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it('remove still deletes a malformed row', async () => {
    await raw.set('plugins.bad', 'corrupt');
    await pluginRegistryStore.remove('bad');

    expect(await raw.get('plugins.bad')).toBeUndefined();
  });

  it('keeps rows written before installationMethod existed', async () => {
    const legacy = {
      id: 'legacy',
      version: '0.1.0',
      path: '/app-data/plugins/legacy/0.1.0',
      location: 'user',
      enabled: true,
      installedAt: '2025-08-30T00:00:00.000Z',
      lastUpdatedAt: '2025-08-30T00:00:00.000Z',
    };
    await raw.set('plugins.legacy', legacy);

    expect(await pluginRegistryStore.list()).toEqual([legacy]);
    expect(await pluginRegistryStore.get('legacy')).toEqual(legacy);
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
