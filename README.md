# @tahti-player/plugin-registry

The **runtime plugin install registry** for Tahti Player: the persisted list of
plugins installed on this machine (path, version, enabled flag, warnings). It
is _not_ the marketplace catalog — see
[`docs/PLUGIN-REGISTRY.md`](../../docs/PLUGIN-REGISTRY.md) for the full
reference, including how the two differ.

Private, source-only workspace package (`main` points at `src/index.ts`). Its
only runtime dependency is `@tauri-apps/plugin-store`.

## API

```ts
import {
  pluginRegistryStore,
  configurePluginRegistryLogger,
} from '@tahti-player/plugin-registry';

await pluginRegistryStore.upsert(entry);
await pluginRegistryStore.setEnabled('my-plugin', true);
const all = await pluginRegistryStore.list();
```

| Export                                       | Purpose                                                                                                           |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `PluginRegistryStore` (type)                 | Persistence contract: `list`, `get`, `upsert`, `setEnabled`, `setWarnings`, `remove`                              |
| `PluginRegistryHost` (type)                  | Lifecycle contract (hydrate, install, enable/disable, reload, remove, auto-update). Implemented in the player     |
| `PluginRegistryEntry` (type)                 | One persisted entry                                                                                               |
| `pluginRegistryStore`                        | Process-wide singleton backed by `LazyStore('plugins.json')`                                                      |
| `createLazyStorePluginRegistry()`            | Factory for the same adapter (prefer the singleton)                                                               |
| `listRegistryEntries` … `removeRegistryEntry` | Underlying free functions the adapter wraps                                                                       |
| `configurePluginRegistryLogger(logger)`      | Inject a `{ debug, warn }` logger. Silent by default; the player wires `Logger.plugins` in `pluginRegistry.ts`    |
| `PLUGIN_REGISTRY_FILE`, `PLUGIN_REGISTRY_KEY_PREFIX` | The frozen storage constants                                                                              |

## Invariants — do not change without a migration plan

- File: AppData `plugins.json` via `LazyStore`.
- Keys: `plugins.<id>` only.
- Managed installs live at `{appDataDir}/plugins/{id}/{version}/` (owned by the
  player's `pluginDir.ts`, not this package).
- Entries are written as plain objects with no schema version.

Changing any of these strands existing users' installed plugins.

## What is deliberately not here

`PluginRegistryHost` (`pluginRegistryHost.ts` in `packages/player`) composes
`pluginStore`, `pluginBootstrap`, `pluginAutoUpdate` and the downloader, all of
which depend on player internals, so it stays in `packages/player`.

## Tests

The contract suite runs in `packages/player`
(`src/services/plugins/pluginRegistryAdapter.test.ts`, `pluginRegistryHost.test.ts`,
`src/stores/pluginStore.test.ts`, `src/App.hydration.test.tsx`), because it
relies on the player's Tauri store mocks. Any alternative `PluginRegistryStore`
implementation must pass the same suite.
