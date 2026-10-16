import { LazyStore } from '@tauri-apps/plugin-store';

import {
  PLUGIN_REGISTRY_FILE,
  PLUGIN_REGISTRY_KEY_PREFIX,
  type PluginRegistryEntry,
} from './contract';

/** Minimal logger the host injects; defaults to silent so the package has no
 * dependency on player internals. */
export type PluginRegistryLogger = {
  debug: (message: string) => void;
  warn: (message: string) => void;
};

let logger: PluginRegistryLogger = { debug: () => {}, warn: () => {} };

export const configurePluginRegistryLogger = (
  next: PluginRegistryLogger,
): void => {
  logger = next;
};

const PREFIX = PLUGIN_REGISTRY_KEY_PREFIX;
const store = new LazyStore(PLUGIN_REGISTRY_FILE);

const keyFor = (id: string): string => `${PREFIX}${id}`;

/* Checks only what the player cannot load a plugin without. Rows written
 * before `installationMethod` existed store `location` instead and must still
 * pass, so the rest of the entry is returned as stored. */
const isRegistryEntry = (value: unknown): value is PluginRegistryEntry => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === 'string' &&
    entry.id.length > 0 &&
    typeof entry.version === 'string' &&
    typeof entry.path === 'string' &&
    typeof entry.enabled === 'boolean'
  );
};

const warnMalformed = (key: string): void => {
  logger.warn(`Ignoring malformed registry entry ${key}`);
};

export const listRegistryEntries = async (): Promise<PluginRegistryEntry[]> => {
  const entries = await store.entries();
  const res: PluginRegistryEntry[] = [];
  Array.from(entries).forEach(([key, value]) => {
    if (!String(key).startsWith(PREFIX)) {
      return;
    }
    if (isRegistryEntry(value)) {
      res.push(value);
    } else {
      warnMalformed(String(key));
    }
  });
  return res;
};

export const getRegistryEntry = async (
  id: string,
): Promise<PluginRegistryEntry | undefined> => {
  const value = await store.get<unknown>(keyFor(id));
  if (value === undefined || value === null) {
    return undefined;
  }
  if (!isRegistryEntry(value)) {
    warnMalformed(keyFor(id));
    return undefined;
  }
  return value;
};

export const upsertRegistryEntry = async (
  entry: PluginRegistryEntry,
): Promise<void> => {
  logger.debug(`Upserting registry entry for ${entry.id}@${entry.version}`);
  await store.set(keyFor(entry.id), entry);
  await store.save();
};

export const setRegistryEntryEnabled = async (
  id: string,
  enabled: boolean,
): Promise<void> => {
  const current = await getRegistryEntry(id);
  if (!current) {
    logger.warn(
      `Cannot set enabled=${enabled} for ${id}: not found in registry`,
    );
    return;
  }
  const next: PluginRegistryEntry = { ...current, enabled };
  await store.set(keyFor(id), next);
  await store.save();
  logger.debug(`Set registry entry ${id} enabled=${enabled}`);
};

export const setRegistryEntryWarnings = async (
  id: string,
  warnings: string[],
): Promise<void> => {
  const current = await getRegistryEntry(id);
  if (!current) {
    return;
  }
  const next: PluginRegistryEntry = {
    ...current,
    warnings: warnings.length ? warnings : undefined,
  };
  await store.set(keyFor(id), next);
  await store.save();
};

export const removeRegistryEntry = async (id: string): Promise<void> => {
  logger.debug(`Removing registry entry for ${id}`);
  await store.delete(keyFor(id));
  await store.save();
};
