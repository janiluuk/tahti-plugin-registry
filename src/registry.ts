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

export const listRegistryEntries = async (): Promise<PluginRegistryEntry[]> => {
  const entries = await store.entries();
  const res: PluginRegistryEntry[] = [];
  Array.from(entries).forEach(([key, value]) => {
    if (String(key).startsWith(PREFIX)) {
      res.push(value as PluginRegistryEntry);
    }
  });
  return res;
};

export const getRegistryEntry = async (
  id: string,
): Promise<PluginRegistryEntry | undefined> => {
  const value = await store.get<PluginRegistryEntry | undefined>(keyFor(id));
  if (value) {
    return value;
  }
  return undefined;
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
