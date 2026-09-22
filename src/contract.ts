/** Registry contract. Storage constants and entry shape are frozen — see
 * ../tahti-org docs/todo/plugin-registry-extraction.md §5.6. */
export type PluginInstallationMethod = 'dev' | 'store';

export type PluginRegistryEntry = {
  id: string;
  version: string;
  path: string;
  installationMethod: PluginInstallationMethod;
  originalPath?: string;
  enabled: boolean;
  installedAt: string;
  lastUpdatedAt: string;
  warnings?: string[];
};

/** Storage constants — frozen for adapter compatibility. */
export const PLUGIN_REGISTRY_FILE = 'plugins.json' as const;
export const PLUGIN_REGISTRY_KEY_PREFIX = 'plugins.' as const;

/**
 * Persistence + query — maps 1:1 to pluginRegistry.ts free functions.
 * Only the implementation of this interface may touch LazyStore / plugins.json.
 */
export interface PluginRegistryStore {
  list(): Promise<PluginRegistryEntry[]>;
  get(id: string): Promise<PluginRegistryEntry | undefined>;
  upsert(entry: PluginRegistryEntry): Promise<void>;
  setEnabled(id: string, enabled: boolean): Promise<void>;
  setWarnings(id: string, warnings: string[]): Promise<void>;
  remove(id: string): Promise<void>;
}

/** Marketplace row subset needed for store install (from pluginMarketplaceApi). */
export type MarketplacePluginRelease = {
  id: string;
  version: string;
  downloadUrl: string;
  repo?: string;
};

/**
 * Host-facing lifecycle — UI, bootstrap, auto-update.
 * Today spread across pluginStore, pluginBootstrap, pluginAutoUpdate,
 * useInstallPlugin; not owned by pluginRegistry.ts alone. Not yet
 * implemented by anything — the store side (above) comes first.
 */
export interface PluginRegistryHost {
  hydrateFromRegistry(): Promise<void>;
  installFromPath(path: string): Promise<void>;
  installFromMarketplace(plugin: MarketplacePluginRelease): Promise<void>;
  enable(id: string): Promise<void>;
  disable(id: string): Promise<void>;
  reloadDev(id: string): Promise<void>;
  remove(id: string): Promise<void>;
  checkAndUpdateStorePlugins(): Promise<void>;
}
