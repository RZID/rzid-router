# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

OpenWrt router dashboard (RZID Router). Svelte 4 SPA served from the router itself. Talks to OpenWrt at `10.10.0.1` via UBUS JSON-RPC and direct HTTP for AdGuard stats.

## Commands

```bash
bun install              # install deps (bun is the package manager — see bun.lock)
bun run dev              # dev server on :5173, proxies /ubus + /cgi-bin to 10.10.0.1
bun run build            # production build → dist/
bun run deploy           # build + scp dist/* to root@10.10.0.1:/www/
bunx svelte-check        # type-check Svelte components
```

## Architecture

```
src/
├── main.ts              # entry: restores UBUS session from localStorage, mounts App
├── App.svelte           # root: auth gate (Login vs main layout), currentView-based routing
├── app.css              # Tailwind directives, CSS vars, glass/glow utilities
└── lib/
    ├── api/
    │   └── ubus.ts      # all router communication — UBUS JSON-RPC, session mgmt, AdGuard HTTP
    ├── components/
    │   ├── Login.svelte       # password form, UBUS session login
    │   ├── Sidebar.svelte     # navigation + logout, emits navigate/logout events
    │   ├── StatCard.svelte    # glass card with label/value/icon/color/pulse
    │   ├── BandwidthChart.svelte  # Chart.js line chart, polls /proc/net/dev via UBUS every 2s
    │   └── DHCPLeases.svelte  # DHCP lease list, polls every 10s
    └── views/
        ├── Dashboard.svelte   # system info + network + bandwidth + DHCP, polls every 5s
        ├── Services.svelte    # init.d service restart buttons
        └── Placeholder.svelte # "under construction" for Network/Clients/DNS/Firewall/System
```

### UBUS API layer (`src/lib/api/ubus.ts`)

All router communication flows through here:

- **Session management**: `login(password)`, `restoreSession()`, `logout()` — session stored in `localStorage.owrt_session`. On UBUS error code 6 (session expired), auto-logout + page reload.
- **Generic RPC**: `call<T>(object, method, params)` — wraps UBUS JSON-RPC. Returns `result[1]` on success, `null` on error.
- **Domain helpers**: `getSystemInfo()`, `getNetworkInterfaces()`, `getDHCPLeases()`, `getBandwidth()` (parses `/proc/net/dev` raw text → iface stats), `uciGet()`, `uciSet()`, `serviceRestart()`.
- **AdGuard**: `getAdGuardStats()` calls `http://10.10.0.1:3000/control/stats` directly (not via UBUS), basic auth.

### Routing

Simple state-based routing in `App.svelte`. `currentView` string drives which component renders. Views with no implementation (network, clients, dns, firewall, system) use `Placeholder`. Navigation via `Sidebar` dispatches string events.

### Styling

Dark theme. CSS custom properties (`--surface`, `--accent`, `--text`, `--border`, etc.) defined in `app.css:root`. Tailwind `extend.colors` mirrors them. `.glass` class for frosted panels, `.glow` for accent shadow. Chart.js styled to match — no legend, dark grid, accent colors.

### Polling

Dashboard refreshes system info + network every 5s, BandwidthChart polls `/proc/net/dev` every 2s (computes delta vs previous reading), DHCPLeases polls every 10s. All intervals cleared on destroy.
