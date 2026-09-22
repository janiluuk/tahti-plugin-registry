import type { PluginRegistryStore } from './contract';
import {
  getRegistryEntry,
  listRegistryEntries,
  removeRegistryEntry,
  setRegistryEntryEnabled,
  setRegistryEntryWarnings,
  upsertRegistryEntry,
} from './registry';

/** Default runtime adapter — wraps the LazyStore-backed registry without
 * changing storage (same file, key prefix, and managed path layout). */
export const createLazyStorePluginRegistry = (): PluginRegistryStore => ({
  list: () => listRegistryEntries(),
  get: (id) => getRegistryEntry(id),
  upsert: (entry) => upsertRegistryEntry(entry),
  setEnabled: (id, enabled) => setRegistryEntryEnabled(id, enabled),
  setWarnings: (id, warnings) => setRegistryEntryWarnings(id, warnings),
  remove: (id) => removeRegistryEntry(id),
});

/** Process-wide singleton. */
export const pluginRegistryStore: PluginRegistryStore =
  createLazyStorePluginRegistry();
