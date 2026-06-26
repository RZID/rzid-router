# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

OpenWrt router dashboard (RZID Router). Svelte 5 SPA using runes mode. Talks to OpenWrt at `10.10.0.1` via UBUS JSON-RPC and `/cgi-bin/cgi-exec` for large payloads.

## Commands

```bash
bun install              # install deps (bun is the package manager)
bun run dev              # dev server on :5173, proxies /ubus + /cgi-bin to 10.10.0.1
bun run build            # production build → dist/
bun run deploy           # build + scp dist/* to root@10.10.0.1:/www/
bunx svelte-check        # type-check Svelte components
```

## Code Writing Standards

### Components
- **Use Svelte 5 runes**: `$state`, `$props`, `$derived`, `$effect` — no Svelte 4 legacy syntax.
- **Component props**: destructure from `$props<T>()` with explicit TypeScript interface.
- **Events**: callback props (`onclick`, `onnavigate`) — no `createEventDispatcher`.
- **Reusable over one-off**: extract shared patterns into `src/lib/components/`.
- **Small focused files**: max ~150 lines per component. Split large views into sub-components.

### Icons
- **Always use `@lucide/svelte`** — no unicode symbols, no inline SVGs, no emoji.
- Import from `@lucide/svelte` directly: `import { Clock, Zap } from "@lucide/svelte"`.
- Icons passed as component references via `$props`, not strings.
- Standard size: `size={14}` for inline, `size={16}` for standalone.

### Helpers (DRY)
- `src/lib/helpers/format.ts` — `fmtBytes`, `fmtUptime`, `fmtPkts`, `fmtRate`, `cidr`
- `src/lib/helpers/classname.ts` — `cn()` wraps `clsx` for Tailwind class merging
- `src/lib/helpers/nftables.ts` — `exprStr`, `exprVal`, `isActionExpr`, nft labels
- Import helpers from these files — never duplicate formatting logic.

### Styling
- Dark glass-morphism theme. CSS custom properties (`--surface`, `--accent`, `--text`, `--border`, `--text-muted`) in `app.css`.
- Use `cn()` for all className composition — no string concatenation or conditional ternaries for classes.
- Use inline `style` with `var(--*)` for colors — Tailwind v4 `@theme` tokens available as classes AND CSS vars.

### API layer (`src/lib/api/ubus.ts`)
- `login(password)`, `restoreSession()`, `logout()` — session in `localStorage.owrt_session`
- `call<T>(object, method, params)` — single UBUS JSON-RPC call
- `batchCall<T>(calls)` — multiple UBUS calls in one HTTP request
- `execCommand(command, params)` — generic `file.exec` wrapper
- Session ID is 32 hex chars (e.g. `"00000000000000000000000000000000"`)

### Reusable Components
- `SectionHeader.svelte` — collapsible section with `title`, `open`, `ontoggle`, `badge` props
- `TabBar.svelte` — tab switcher with `tabs`, `active`, `onchange` props
- `StatCard.svelte` — glass card: `label`, `value`, `sub`, `color`, `icon` (Component), `pulse`

## Architecture

```
src/
├── main.ts
├── App.svelte           # auth gate + currentView routing
├── app.css              # Tailwind v4, CSS vars, glass/glow
└── lib/
    ├── api/ubus.ts      # UBUS JSON-RPC, session mgmt
    ├── helpers/
    │   ├── classname.ts # cn() — clsx wrapper
    │   ├── format.ts    # fmtBytes, fmtUptime, fmtPkts, fmtRate, cidr
    │   └── nftables.ts  # nft expression parsing
    ├── components/
    │   ├── Login.svelte, Sidebar.svelte, StatCard.svelte
    │   ├── SectionHeader.svelte, TabBar.svelte
    │   ├── BandwidthChart.svelte, DHCPLeases.svelte
    └── views/
        ├── Dashboard.svelte    # system + memory + storage + ports + network + DHCP
        ├── Routes.svelte       # IPv4/IPv6 neighbours, routes, rules
        ├── Firewall.svelte     # nftables ruleset
        ├── Logs.svelte         # system log viewer
        ├── Services.svelte     # init.d service restart
        └── Placeholder.svelte  # under construction
```

### Views mapped to sidebar IDs
- `dashboard` → Dashboard, `routes` → Routes, `firewall-status` → Firewall
- `syslog` → Logs, `services` → Services
- Everything else → Placeholder

### Polling
Dashboard refreshes every 5s (batch call), Routes every 10s, Firewall every 15s.
All intervals cleared on `onDestroy`.
