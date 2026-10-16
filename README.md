# @tahti-player/plugin-registry

The **runtime plugin install registry** for Tahti Player: the persisted list of
plugins installed on this machine (path, version, enabled flag, warnings). It
is _not_ the marketplace catalog
([janiluuk/tahti-registry](https://github.com/janiluuk/tahti-registry)) — see
[`docs/PLUGIN-REGISTRY.md`](https://github.com/janiluuk/tahti-player/blob/master/docs/PLUGIN-REGISTRY.md)
in tahti-player for the full reference, including how the two differ.

Source-only TypeScript (`main` points at `src/index.ts`); the consumer's
bundler compiles it. Its only runtime dependency is `@tauri-apps/plugin-store`.

## Install

Not published to npm. Depend on a release tag:

```json
"@tahti-player/plugin-registry": "github:janiluuk/tahti-plugin-registry#v0.1.0"
```

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

| Export                                               | Purpose                                                                                                        |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `PluginRegistryStore` (type)                         | Persistence contract: `list`, `get`, `upsert`, `setEnabled`, `setWarnings`, `remove`                           |
| `PluginRegistryHost` (type)                          | Lifecycle contract (hydrate, install, enable/disable, reload, remove, auto-update). Implemented in the player  |
| `PluginRegistryEntry` (type)                         | One persisted entry                                                                                            |
| `pluginRegistryStore`                                | Process-wide singleton backed by `LazyStore('plugins.json')`                                                   |
| `createLazyStorePluginRegistry()`                    | Factory for the same adapter (prefer the singleton)                                                            |
| `listRegistryEntries` … `removeRegistryEntry`        | Underlying free functions the adapter wraps                                                                    |
| `configurePluginRegistryLogger(logger)`              | Inject a `{ debug, warn }` logger. Silent by default; the player wires `Logger.plugins` in `pluginRegistry.ts` |
| `PLUGIN_REGISTRY_FILE`, `PLUGIN_REGISTRY_KEY_PREFIX` | The frozen storage constants                                                                                   |

## Invariants — do not change without a migration plan

- File: AppData `plugins.json` via `LazyStore`.
- Keys: `plugins.<id>` only.
- Managed installs live at `{appDataDir}/plugins/{id}/{version}/` (owned by the
  player's `pluginDir.ts`, not this package).
- Entries are written as plain objects with no schema version.

## Read validation

`list()` and `get()` drop a row that is not an object with a non-empty string
`id`, string `version` and `path`, and boolean `enabled`, and log a warning
naming its key. Nothing is rewritten on disk, and `remove(id)` still deletes a
malformed row. Other fields are returned as stored, so rows from before
`installationMethod` existed (they have `location`) still load.

Changing any of these strands existing users' installed plugins.

## What is deliberately not here

`PluginRegistryHost` (`pluginRegistryHost.ts` in tahti-player's
`packages/player`) composes `pluginStore`, `pluginBootstrap`,
`pluginAutoUpdate` and the downloader, all of which depend on player
internals, so it stays in the player.

## Tests

```sh
pnpm install
pnpm test        # store behaviour + read validation, against an in-memory LazyStore
pnpm type-check
```

The player's contract suite (`pluginRegistryAdapter.test.ts`,
`pluginRegistryHost.test.ts`, `pluginStore.test.ts`, `App.hydration.test.tsx`
in tahti-player) runs against this package too. A release must pass both
before the player bumps its tag.

## Releasing

1. Bump `version` in `package.json`, merge to `master`.
2. Tag `vX.Y.Z` on that commit and push the tag.
3. In tahti-player, point `packages/player/package.json` at the new tag and
   run `pnpm install`.
