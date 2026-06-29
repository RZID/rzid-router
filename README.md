# rzidnet

A modern, glass-morphism dashboard for OpenWrt routers. Built as a drop-in replacement for LuCI.

![Svelte](https://img.shields.io/badge/Svelte-5-FF3E00?style=flat-square&logo=svelte&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-latest-FBF0DF?style=flat-square&logo=bun&logoColor=black)

## Features

**Status**

- Overview — system info, memory, storage, bandwidth, DHCP leases, DDNS & UPnP status
- Routing — IPv4/IPv6 routes, neighbours, rules
- Firewall — live nftables ruleset viewer
- System Log — syslog + dmesg with filters
- Processes — process list with kill support
- Realtime Graphs — bandwidth, load, connections

**Network**

- Interfaces — view and edit network interfaces, devices, global settings
- Routing — static route management
- DHCP — dnsmasq & odhcpd config, host reservations, PXE, tags, relay
- DNS — DNS records, filtering, forwarding, IPsets, instance manager
- Diagnostics — ping, traceroute, nslookup, ARP scan

**System**

- System settings, timezone, NTP
- Administration — SSH keys, HTTP access, repo keys
- Software — package manager (opkg)
- Startup — init.d service control
- Scheduled Tasks — crontab editor
- Backup / Flash — firmware upgrade, config backup & restore

**Services**

- Dynamic DNS (ddns-scripts)
- AdGuard Home
- banIP — blocklist management, allowlist, feed config, firewall log
- Terminal — ttyd web terminal
- UPnP — port mapping viewer and ACL rules

## Stack

|            |                                         |
| ---------- | --------------------------------------- |
| UI         | Svelte 5 (runes mode)                   |
| Language   | TypeScript                              |
| Styling    | Tailwind CSS v4 + CSS custom properties |
| Build      | Vite 8                                  |
| Runtime    | Bun                                     |
| Icons      | @lucide/svelte                          |
| Charts     | Chart.js                                |
| Components | @melt-ui/svelte                         |

## Getting Started

**Prerequisites:** Bun, an OpenWrt router accessible at `10.10.0.1`

```bash
bun install
bun run dev
```

Dev server runs at `http://localhost:5173`. All `/ubus` and `/cgi-bin` requests are proxied to `10.10.0.1`.

## Deploy to Router

```bash
bun run deploy
```

Builds the app and copies `dist/` to `/www/` on the router via SCP, then configures uhttpd to serve it as the default page.

```bash
# Manual steps (first time)
ssh root@10.10.0.1
uci set uhttpd.main.error_page=/index.html
uci commit uhttpd
/etc/init.d/uhttpd reload
```

## Other Commands

```bash
bun run build        # production build → dist/
bun run preview      # preview production build locally
bunx svelte-check    # type-check all Svelte components
```

## Project Structure

```
src/
├── App.svelte              # auth gate + routing
├── app.css                 # Tailwind v4, CSS vars, glass/glow theme
├── main.ts
└── lib/
    ├── api/                # UBUS JSON-RPC + file/exec/UCI/session layer
    ├── components/         # reusable UI components
    ├── helpers/            # format, classname (cn), nftables utils
    ├── i18n/               # translations (en, id, jaksel, bogorian)
    ├── views/              # page-level views, grouped by section
    ├── router.ts           # path ↔ view ID mapping
    ├── theme.ts            # theme persistence
    └── types.ts            # shared TypeScript types
```

## i18n

Four locales are supported: English (`en`), Indonesian (`id`), Jaksel (`jaksel`), and Bogorian (`bogorian`). Switch from the sidebar.

## Contributing

- Svelte 5 runes only — no legacy `$:` or `createEventDispatcher`
- All new files target ≤500 lines, hard limit 1000
- Use existing components in `src/lib/components/` before creating new ones
- Icons via `@lucide/svelte` only
- See `AGENTS.md` for full coding standards
