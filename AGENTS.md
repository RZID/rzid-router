# AGENTS.md — rzidnet (OpenWrt Dashboard)

## Stack

Svelte 5 runes · TypeScript · Tailwind v4 · Vite 8 · Bun · Chart.js · @lucide/svelte · @melt-ui/svelte · clsx

## Commands

```
bun run dev       # dev server :5173, proxies /ubus + /cgi-bin → 10.10.0.1
bun run build     # → dist/
bun run deploy    # build + scp dist/* to root@10.10.0.1:/www/
bunx svelte-check # type-check
```

## Svelte 5 rules (non-negotiable)

- Runes only: `$state`, `$props`, `$derived`, `$derived.by`, `$effect` — no Svelte 4 legacy
- Props: `let { foo, bar } = $props<Props>()` with explicit TS interface in co-located `types.d.ts`
- Events: callback props (`onclick`, `onchange`, `onnavigate`) — no `createEventDispatcher`
- Icons: **`@lucide/svelte` only** — no unicode, no inline SVG, no emoji. `size={14}` inline / `size={16}` standalone
- Classes: **always `cn()`** from `src/lib/helpers/classname` — never string concat or ternaries
- Colors: `style` with `var(--surface|--accent|--text|--border|--text-muted)` — defined in `app.css`
- Max ~150 lines per component — split large views into sub-components in same-name subfolder

## Routing

View IDs (used in `App.svelte` and `navigate()`):
`dashboard` · `routes` · `firewall-status` · `syslog` · `processes` · `realtime` · `system` · `admin` · `software` · `startup` · `crontab` · `flash` · `ddns` · `adguard` · `banip` · `ttyd` · `upnp` · `network` · `network-routes` · `dhcp` · `dns` · `diagnostics`

URL helpers from `src/lib/router.ts`: `buildPath(view, sub?)` · `parsePath(pathname)`

## API — import everything from `src/lib/api/ubus.ts` (barrel re-export)

**Session** (`session.ts`):
`login(password)` → `boolean` · `restoreSession()` · `logout()` · `getSession()` → hex string
`call<T>(object, method, params?)` → `T | null`
`batchCall<T>(calls[])` → `(T | null)[]` — use for multiple UBUS calls in one HTTP req
Error code `-32002` auto-triggers `logout()` + redirect.

**File/exec** (`exec.ts`):
`execCommand(command, params[])` → `{stdout, stderr?, code?} | null`
`cgiExec(command, params[])` → `string | null` — for large payloads via `/cgi-bin/cgi-exec`
`readFile(path)` · `writeFile(path, data, encodingOrMode?)` · `listDir(path)` · `removeFile(path)` · `statFile(path)`
`readLogEntries(lines?)` · `readDmesg()`

**UCI** (`uci.ts`):
`uciGet(config)` · `uciSet(config, section, key|Record, value?)` · `uciSetSection(config, section, values)` · `uciCommit(config)` · `uciAdd(config, type, name?)`

**System** (`system.ts`):
`getSystemInfo()` · `getNetworkInterfaces()` · `getDHCPLeases()` · `rcList(name)` · `rcInit(name, action)` · `getTimezones()` · `getUnixtime()` · `getSystemFeatures()` · `serviceRestart(name)` · `getBandwidth()` · `getRealtimeStats(mode, device?)` · `getConntrackList()` · `fetchConntrackMetrics()` · `getConntrackCount()` · `getProcessList()` · `killProcess()` · `setPassword()` · `getAdGuardStats()`

**DDNS** (`ddns.ts`): `callDdnsGetState` · `callDdnsGetEnv` · `callDdnsGetServicesStatus` · `callDdnsGetLog` · `callSetInitAction` · `ddnsServiceInstall` · `ddnsServiceUpdateList` · `ddnsStopService` · `ddnsReloadService`

**BanIP** (`banip.ts`): `banipGetRuntime` · `banipGetActual` · `banipInitAction` · `banipGetFeeds`

## Reusable components — check before creating new (all in `src/lib/components/`)

| Component                                                                                                        | Key props                                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `StatCard`                                                                                                       | `label`, `value`, `sub?`, `color?`, `Icon?` (Component ref), `pulse?`                                                                 |
| `SectionHeader`                                                                                                  | `title`, `open?`, `ontoggle?()`, `badge?`, `children` (Snippet)                                                                       |
| `TabBar`                                                                                                         | `tabs: {id,label}[]`, `active?`, `onchange?(id)`                                                                                      |
| `Select`                                                                                                         | `label?`, `description?`, `options: {value,label}[]`, `value?`, `placeholder?`, `class?`, `onchange?()`                               |
| `Toggle`                                                                                                         | `label?`, `description?`, `checked`, `class?`, `onchange?(v: boolean)`                                                                |
| `Input`                                                                                                          | `label?`, `value?`, `placeholder?`, `type?`, `readonly?`, `disabled?`, `mono?`, `class?`, `description?`, `oninput?()`, `onchange?()` |
| `Textarea` · `FileUpload` · `DeviceSelect` · `NetworkSelect` · `BandwidthChart` · `RealtimeGraph` · `DHCPLeases` | see co-located `types.d.ts`                                                                                                           |

## Helpers — never duplicate

- `src/lib/helpers/format.ts` — `fmtBytes(b)` · `fmtUptime(s)` · `fmtPkts(n)` · `fmtRate(bytes)` · `cidr(mask)`
- `src/lib/helpers/classname/index.ts` — `cn(...classes)` (clsx wrapper)
- `src/lib/helpers/nftables/index.ts` — `exprStr` · `exprVal` · `isActionExpr`

## i18n

```ts
import { t as _t, getLocale, onLocaleChange, setLocale } from "$lib/i18n";
// In component:
let locale = $state(getLocale());
$effect(() =>
  onLocaleChange(() => {
    locale = getLocale();
  }),
);
const t = $derived((k: string) => _t(k));
```

Locales: `en` | `id` | `jaksel` | `bogorian`. Add new keys to all locale files in `src/lib/i18n/locales/`.

## Theme

`import { getTheme, setTheme, onThemeChange } from '$lib/theme'`
Stored in `localStorage.rzid_theme`, applied as `data-theme` on `<html>`.

## State pattern for complex views

Co-located `.svelte.ts` store (e.g. `ddns-store.svelte.ts`):

```ts
export const store = $state({ ... })  // module-level reactive state
export const someAction = async () => { /* mutates store directly */ }
```

Components import `store` + actions. Do NOT use Svelte stores (`writable`, etc).

## Polling

Dashboard 5s · Routes 10s · Firewall 15s. Always `clearInterval` in `onDestroy`.

## File size limits

- Target: ≤500 lines per file
- Hard limit: 1000 lines — never exceed this
- If a file exceeds 500 lines, split into sub-components or extract logic to a co-located `.svelte.ts` store
- Pattern: `ViewName.svelte` (orchestrator, imports only) + `ViewName/SubPart.svelte` (chunks) + `ViewName/view-store.svelte.ts` (logic)
