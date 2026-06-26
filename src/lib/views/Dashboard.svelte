<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { slide } from "svelte/transition";
  import { batchCall } from "../api/ubus";
  import {
    Clock,
    Zap,
    Globe,
    HardDrive,
    ArrowUpDown,
    Settings,
    Hexagon,
    Network,
    Radio,
    PlusSquare,
    ChevronRight,
    ArrowUp,
  } from "@lucide/svelte";
  import StatCard from "../components/StatCard.svelte";
  import BandwidthChart from "../components/BandwidthChart.svelte";
  import { cn } from "../helpers/classname";

  let sysInfo = $state<any>({});
  let board = $state<any>({});
  let interfaces = $state<any[]>([]);
  let devices: Record<string, any> = $state({});
  let dhcpLeases = $state<any>({});
  let ddnsStatus = $state<any[]>([]);
  let upnpStatus = $state<any>({});
  let wanDeviceName = $state("");
  let bwRate = $state({ rxRate: "0 B/s", txRate: "0 B/s" });
  let prevRx = 0;
  let prevTx = 0;
  let interval: ReturnType<typeof setInterval>;

  let uptime = $state("—"),
    load1 = $state("—"),
    load5 = $state("—"),
    load15 = $state("—");
  let memTotal = $state(0),
    memUsed = $state(0),
    memBuffered = $state(0),
    memCached = $state(0),
    memPct = $state(0);
  let wanIp = $state("—"),
    wanGw = $state("—"),
    wanProto = $state("—"),
    wanDevice = $state("—"),
    wanMac = $state("—");
  let wanDns: string[] = $state([]);
  let localTime = $state("—");

  const fmtUptime = (s: number) => {
    const d = Math.floor(s / 86400),
      h = Math.floor((s % 86400) / 3600),
      m = Math.floor((s % 3600) / 60);
    return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m 0s`;
  };
  const fmtBytes = (b: number) => {
    if (!b) return "0 B";
    if (b >= 1e9) return `${(b / 1e9).toFixed(1)} GiB`;
    if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MiB`;
    if (b >= 1024) return `${(b / 1024).toFixed(1)} KiB`;
    return `${b} B`;
  };
  const fmtPkts = (n: number) => {
    if (!n) return "0";
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
    return `${n}`;
  };
  const cidr = (m: string) => {
    if (!m) return "";
    let b = 0;
    for (const p of m.split(".").map(Number))
      for (let i = 7; i >= 0; i--) {
        if (p & (1 << i)) b++;
        else break;
      }
    return `/${b}`;
  };
  const fmtRate = (b: number) => {
    if (b < 1024) return `${b} B/s`;
    if (b < 1e6) return `${(b / 1024).toFixed(1)} KB/s`;
    return `${(b / 1e6).toFixed(2)} MB/s`;
  };

  const refresh = async () => {
    const [sys, brd, net, devs, dhcp, ddns, upnp, ddnsCfg] =
      await batchCall<any>([
        { object: "system", method: "info" },
        { object: "system", method: "board" },
        { object: "network.interface", method: "dump" },
        { object: "luci-rpc", method: "getNetworkDevices" },
        { object: "luci-rpc", method: "getDHCPLeases" },
        { object: "luci.ddns", method: "get_services_status" },
        { object: "luci.upnp", method: "get_status" },
        { object: "uci", method: "get", params: { config: "ddns" } },
      ]);
    if (sys) {
      sysInfo = sys;
      uptime = fmtUptime(sys.uptime);
      localTime = new Date(sys.localtime * 1000).toLocaleString();
      const l = sys.load;
      load1 = l ? `${(l[0] / 65536).toFixed(2)}` : "—";
      load5 = l ? `${(l[1] / 65536).toFixed(2)}` : "—";
      load15 = l ? `${(l[2] / 65536).toFixed(2)}` : "—";
      if (sys.memory) {
        memTotal = sys.memory.total;
        memUsed = sys.memory.total - sys.memory.free;
        memBuffered = sys.memory.buffered || 0;
        memCached = sys.memory.cached || 0;
        memPct = Math.round((memUsed / sys.memory.total) * 100);
      }
    }
    if (brd) board = brd;
    if (devs && typeof devs === "object" && !Array.isArray(devs))
      devices = devs;
    if (net?.interface) {
      interfaces = net.interface;
      const wan = net.interface.find((i: any) => i.interface === "wan");
      if (wan) {
        wanIp = wan["ipv4-address"]?.[0]?.address || "—";
        wanGw = wan.route?.[0]?.nexthop || "—";
        wanDns = wan["dns-server"] || [];
        wanProto = wan.proto || "—";
        wanDevice = wan.l2_device?.name || wan.device || "—";
        wanMac = wan.l2_device?.macaddr || "—";
        wanDeviceName = wan.l2_device?.name || wan.device || "";
      }
    }
    if (dhcp) dhcpLeases = dhcp;
    if (ddns) {
      const cfg = ddnsCfg?.values || {};
      ddnsStatus = Object.entries(ddns).map(([k, v]: any) => {
        const c = cfg[k] || {};
        const ipv = c.use_ipv6 === "1" || k.includes("ipv6") ? "IPv6" : "IPv4";
        return {
          ...v,
          _name: k,
          _lookup_host: c.lookup_host || "",
          _network: `${ipv} / ${c.ip_interface || c.interface || "wan"}`,
        };
      });
    }
    if (upnp) upnpStatus = upnp;
    const stats = devices[wanDeviceName]?.stats;
    if (stats) {
      if (prevRx > 0)
        bwRate = {
          rxRate: fmtRate(Math.max(0, stats.rx_bytes - prevRx)),
          txRate: fmtRate(Math.max(0, stats.tx_bytes - prevTx)),
        };
      prevRx = stats.rx_bytes;
      prevTx = stats.tx_bytes;
    }
  };

  onMount(() => {
    refresh();
    interval = setInterval(refresh, 5000);
  });
  onDestroy(() => clearInterval(interval));

  let hidden = $state<Record<string, boolean>>({});
  const toggle = (k: string) => {
    hidden = { ...hidden, [k]: !hidden[k] };
  };
  const secClass =
    "w-full flex items-center gap-2 text-left p-1 -m-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer";
</script>

<div class={cn("p-6", "space-y-4", "animate-fade-in")}>
  <div class={cn("flex", "items-center", "justify-between")}>
    <div class={cn("flex", "items-center", "gap-4")}>
      <div>
        <h1 class={cn("text-lg", "font-semibold", "text-white")}>
          {board.hostname || "Dashboard"}
        </h1>
        <p class={cn("text-xs", "mt-0.5", "font-mono", "text-accent-dim")}>
          {board.release?.version || ""}
        </p>
      </div>
      <div
        class={cn(
          "flex",
          "py-1",
          "px-2.5",
          "border",
          "gap-1.5",
          "text-xs",
          "font-medium",
          "items-center",
          "rounded-full",
          "bg-accent/10",
          "border-accent/20",
        )}
      >
        <div
          class={cn(
            "w-1.5",
            "h-1.5",
            "bg-accent",
            "rounded-full",
            "animate-pulse",
          )}
        ></div>
        <span class={cn("text-accent")}>LIVE</span>
      </div>
    </div>
    <div class={cn("text-right", "text-xs", "text-muted")}>
      <span class={cn("font-mono block")}>{localTime}</span>
      <span>up {uptime}</span>
    </div>
  </div>

  <!-- Stat cards -->
  <div class={cn("grid", "grid-cols-2", "gap-3", "lg:grid-cols-4")}>
    <StatCard
      label="Memory"
      value="{memPct}%"
      sub="{fmtBytes(memUsed)} / {fmtBytes(memTotal)}"
      icon={HardDrive}
      color={memPct > 80
        ? "var(--danger)"
        : memPct > 60
          ? "var(--warn)"
          : "var(--accent)"}
    />
    <StatCard
      label="Load"
      value={load1}
      sub={`${load5} / ${load15}`}
      icon={Zap}
      color={parseFloat(load1) > 1 ? "var(--warn)" : "var(--accent)"}
    />
    <StatCard
      label="WAN"
      value={wanIp}
      sub={wanProto}
      icon={Globe}
      color="var(--info)"
      pulse={wanIp !== "—"}
    />
    <StatCard
      label="Bandwidth"
      value={bwRate.rxRate}
      sub={`TX ${bwRate.txRate}`}
      icon={ArrowUpDown}
      color="var(--accent)"
    />
  </div>

  <!-- System -->
  {#if board.hostname}
    <div class={cn("glass", "animate-slide-up")}>
      <button class={cn("p-5", secClass)} onclick={() => toggle("sys")}>
        <span
          class={cn(
            "text-xs",
            "uppercase",
            "text-muted",
            "font-medium",
            "tracking-wider",
          )}
        >
          <Settings size={14} class={cn("text-muted")} /> System
        </span>
        <span class={cn("flex-1")}></span>
        <span
          class={cn("text-xs", "font-mono", "transition-transform")}
          style="color: var(--text-muted); transform: rotate({hidden.sys
            ? 0
            : 90}deg)"><ChevronRight size={14} class={cn("text-muted")} /></span
        >
      </button>
      {#if !hidden.sys}
        <div
          transition:slide|local={{ duration: 200 }}
          class={cn("px-5 pb-5", "border-t", "border-border", "pt-4")}
        >
          <dl
            class={cn("grid", "grid-cols-2", "gap-y-3", "gap-x-8", "text-sm")}
          >
            <div>
              <dt
                class={cn(
                  "mb-0.5",
                  "text-xs",
                  "uppercase",
                  "text-muted",
                  "tracking-wider",
                )}
              >
                Hostname
              </dt>
              <dd class={cn("font-semibold")}>{board.hostname}</dd>
            </div>
            <div>
              <dt
                class={cn(
                  "mb-0.5",
                  "text-xs",
                  "uppercase",
                  "text-muted",
                  "tracking-wider",
                )}
              >
                Model
              </dt>
              <dd class={cn("font-medium", "text-xs")}>{board.model}</dd>
            </div>
            <div>
              <dt
                class={cn(
                  "mb-0.5",
                  "text-xs",
                  "uppercase",
                  "text-muted",
                  "tracking-wider",
                )}
              >
                Architecture
              </dt>
              <dd class={cn("font-medium", "text-xs")}>{board.system}</dd>
            </div>
            {#if board.release?.target}<div>
                <dt
                  class={cn(
                    "mb-0.5",
                    "text-xs",
                    "uppercase",
                    "text-muted",
                    "tracking-wider",
                  )}
                >
                  Target
                </dt>
                <dd class={cn("font-medium", "text-xs")}>
                  {board.release.target}
                </dd>
              </div>{/if}
            <div>
              <dt
                class={cn(
                  "mb-0.5",
                  "text-xs",
                  "uppercase",
                  "text-muted",
                  "tracking-wider",
                )}
              >
                Firmware
              </dt>
              <dd class={cn("font-semibold", "text-accent")}>
                {board.release?.version}
              </dd>
            </div>
            <div>
              <dt
                class={cn(
                  "mb-0.5",
                  "text-xs",
                  "uppercase",
                  "text-muted",
                  "tracking-wider",
                )}
              >
                Kernel
              </dt>
              <dd class={cn("font-medium")}>{board.kernel}</dd>
            </div>
            <div>
              <dt
                class={cn(
                  "mb-0.5",
                  "text-xs",
                  "uppercase",
                  "text-muted",
                  "tracking-wider",
                )}
              >
                Load Average
              </dt>
              <dd
                class={cn("font-mono", "text-xs")}
                style="color:{parseFloat(load1) > 1
                  ? 'var(--warn)'
                  : 'var(--text)'}"
              >
                {load1}
                {load5}
                {load15}
              </dd>
            </div>
          </dl>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Memory + Storage -->
  <div class={cn("glass", "animate-slide-up")}>
    <button class={cn("p-5", secClass)} onclick={() => toggle("mem")}>
      <span
        class={cn(
          "text-xs",
          "uppercase",
          "text-muted",
          "font-medium",
          "tracking-wider",
        )}
      >
        <HardDrive size={14} class={cn("text-muted")} /> Memory & Storage
      </span>
      <span class={cn("flex-1")}></span>
      <span
        class={cn("text-xs", "font-mono", "transition-transform")}
        style="color: var(--text-muted); transform: rotate({hidden.mem
          ? 0
          : 90}deg)"><ChevronRight size={14} class={cn("text-muted")} /></span
      >
    </button>
    {#if !hidden.mem}
      <div
        transition:slide|local={{ duration: 200 }}
        class={cn("px-5", "pb-5", "border-t", "border-border", "pt-4")}
      >
        <div class={cn("mb-4")}>
          <div class={cn("flex", "justify-between", "text-xs", "mb-1")}>
            <span class={cn("text-muted")}>RAM</span>
            <span class={cn("font-mono", "text-muted")}>
              {fmtBytes(memUsed)} / {fmtBytes(memTotal)}
            </span>
          </div>
          <div
            class={cn("h-2", "rounded-full", "overflow-hidden", "bg-surface-3")}
          >
            <div
              class={cn(
                "h-full",
                "duration-700",
                "rounded-full",
                "transition-all",
              )}
              style="width:{memPct}%;background:{memPct > 80
                ? 'var(--danger)'
                : memPct > 60
                  ? 'var(--warn)'
                  : 'var(--accent)'}"
            ></div>
          </div>
          <div
            class={cn(
              "mt-2",
              "flex",
              "gap-4",
              "text-xs",
              "font-mono",
              "text-muted",
            )}
          >
            <span>Free {fmtBytes(sysInfo.memory?.free || 0)}</span>
            <span>Buf {fmtBytes(memBuffered)}</span>
            <span>Cache {fmtBytes(memCached)}</span>
          </div>
        </div>
        {#if sysInfo.root || sysInfo.tmp}
          <div class={cn("space-y-3", "text-xs", "mt-4")}>
            {#each [{ k: "Disk space", v: sysInfo.root }, { k: "Temp space", v: sysInfo.tmp }] as { k, v }}
              {#if v}
                <div>
                  <div class={cn("flex", "justify-between", "mb-1")}>
                    <span class={cn("text-muted")}>{k}</span>
                    <span class={cn("font-mono")}
                      >{fmtBytes((v.total - v.free) * 1024)} / {fmtBytes(
                        v.total * 1024,
                      )} ({v.total > 0
                        ? Math.round(((v.total - v.free) / v.total) * 100)
                        : 0}%)
                    </span>
                  </div>
                  <div
                    class={cn(
                      "h-1.5",
                      "rounded-full",
                      "bg-surface-3",
                      "overflow-hidden",
                    )}
                  >
                    <div
                      class={cn(
                        "h-full",
                        "duration-700",
                        "rounded-full",
                        "transition-all",
                      )}
                      style="width:{v.total > 0
                        ? Math.round(((v.total - v.free) / v.total) * 100)
                        : 0}%;background:var(--accent)"
                    ></div>
                  </div>
                </div>
              {/if}
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Port Status -->
  {#if Object.keys(devices).length > 0}
    <div class={cn("glass", "animate-slide-up")}>
      <button class={cn(secClass, "p-5")} onclick={() => toggle("ports")}>
        <span
          class={cn(
            "text-xs",
            "uppercase",
            "text-muted",
            "font-medium",
            "tracking-wider",
          )}
        >
          <Globe size={14} class={cn("text-muted")} /> Port Status
        </span>
        <span class={cn("flex-1")}></span>
        <span
          class={cn("text-xs", "font-mono", "transition-transform")}
          style="color: var(--text-muted); transform: rotate({hidden.ports
            ? 0
            : 90}deg)"
        >
          <ChevronRight size={14} class={cn("text-muted")} />
        </span>
      </button>
      {#if !hidden.ports}
        <div
          transition:slide|local={{ duration: 200 }}
          class={cn("px-5", "pb-5", "space-y-4", "border-t border-border pt-4")}
        >
          {#each Object.entries(devices).filter(([n]) => n !== "lo" && !n.startsWith("ifb")) as [name, dev] (name)}
            {#if dev.stats}
              <div
                class={cn(
                  "p-4",
                  "border",
                  "rounded-lg",
                  "bg-surface-1",
                  "border-border",
                )}
              >
                <div class={cn("flex", "items-center", "gap-2", "mb-3")}>
                  <div
                    class={cn(
                      "w-2",
                      "h-2",
                      "bg-accent",
                      "rounded-full",
                      "animate-pulse",
                    )}
                  ></div>
                  <span class={cn("font-semibold", "text-sm")}>{name}</span>
                  <span class={cn("font-mono", "text-xs", "text-muted")}>
                    {dev.mac}
                  </span>
                  <span class={cn("flex-1")}></span>
                  <span class={cn("text-xs", "text-accent-dim")}>
                    {interfaces
                      .filter((i) => i.device === name || i.l3_device === name)
                      .map((i) => i.interface)
                      .join(", ")}
                    {#each dev.ipaddrs || [] as ip}{ip.address}{cidr(
                        ip.netmask,
                      )}
                    {/each}
                  </span>
                </div>
                <div
                  class={cn(
                    "grid",
                    "gap-2",
                    "text-xs",
                    "font-mono",
                    "text-muted",
                    "grid-cols-4",
                  )}
                >
                  <div>
                    RX
                    <span class={cn("block", "text-fg")}>
                      {fmtBytes(dev.stats.rx_bytes)}
                    </span>
                    <span class={cn("block", "text-muted")}>
                      {fmtPkts(dev.stats.rx_packets)} pkts
                    </span>
                  </div>
                  <div>
                    TX
                    <span class={cn("block", "text-fg")}>
                      {fmtBytes(dev.stats.tx_bytes)}
                    </span>
                    <span class={cn("block", "text-muted")}>
                      {fmtPkts(dev.stats.tx_packets)} pkts
                    </span>
                  </div>
                  <div>
                    Errors
                    <span class={cn("block", "text-fg")}>
                      RX {dev.stats.rx_errors}
                      TX {dev.stats.tx_errors}
                    </span>
                  </div>
                  <div>
                    Drop
                    <span class={cn("block", "text-fg")}>
                      RX {dev.stats.rx_dropped}
                      TX {dev.stats.tx_dropped}
                    </span>
                  </div>
                </div>
              </div>
            {/if}
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  <!-- Network -->
  {#if wanIp !== "—"}
    <div class={cn("glass", "animate-slide-up")}>
      <button class={cn(secClass, "p-5")} onclick={() => toggle("net")}>
        <span
          class={cn(
            "text-xs",
            "uppercase",
            "text-muted",
            "font-medium",
            "tracking-wider",
          )}><Network size={14} class={cn("text-muted")} /> Network</span
        >
        <span class={cn("flex-1")}></span>
        <span
          class={cn("text-xs", "font-mono", "transition-transform")}
          style="color: var(--text-muted); transform: rotate({hidden.net
            ? 0
            : 90}deg)"
        >
          <ChevronRight size={14} class={cn("text-muted")} />
        </span>
      </button>
      {#if !hidden.net}
        <div
          transition:slide|local={{ duration: 200 }}
          class={cn("px-5", "pb-5", "border-t", "border-border", "pt-4")}
        >
          <dl
            class={cn("grid", "grid-cols-2", "gap-y-3", "gap-x-8", "text-sm")}
          >
            <div>
              <dt
                class={cn(
                  "mb-0.5",
                  "text-xs",
                  "uppercase",
                  "text-muted",
                  "tracking-wider",
                )}
              >
                Protocol
              </dt>
              <dd class={cn("font-semibold")}>{wanProto.toUpperCase()}</dd>
            </div>
            <div>
              <dt
                class={cn(
                  "mb-0.5",
                  "text-xs",
                  "uppercase",
                  "text-muted",
                  "tracking-wider",
                )}
              >
                Address
              </dt>
              <dd class={cn("font-mono", "text-xs", "text-accent")}>
                {wanIp}
              </dd>
            </div>
            <div>
              <dt
                class={cn(
                  "mb-0.5",
                  "text-xs",
                  "uppercase",
                  "text-muted",
                  "tracking-wider",
                )}
              >
                Gateway
              </dt>
              <dd class={cn("font-mono", "text-xs")}>{wanGw}</dd>
            </div>
            {#each wanDns as dns}
              <div>
                <dt
                  class={cn(
                    "mb-0.5",
                    "text-xs",
                    "uppercase",
                    "text-muted",
                    "tracking-wider",
                  )}
                >
                  DNS
                </dt>
                <dd class={cn("font-mono", "text-xs")}>{dns}</dd>
              </div>
            {/each}
            <div>
              <dt
                class={cn(
                  "mb-0.5",
                  "text-xs",
                  "uppercase",
                  "text-muted",
                  "tracking-wider",
                )}
              >
                Device
              </dt>
              <dd class={cn("font-medium")}>{wanDevice}</dd>
            </div>
            <div>
              <dt
                class={cn(
                  "mb-0.5",
                  "text-xs",
                  "uppercase",
                  "text-muted",
                  "tracking-wider",
                )}
              >
                MAC
              </dt>
              <dd class={cn("font-mono", "text-xs")}>{wanMac}</dd>
            </div>
          </dl>
        </div>
      {/if}
    </div>
  {/if}

  <BandwidthChart rxRate={bwRate.rxRate} txRate={bwRate.txRate} />

  <!-- DHCP Leases -->
  <div class={cn("glass", "animate-slide-up")}>
    <button class={cn(secClass, "p-5")} onclick={() => toggle("dhcp")}>
      <span
        class={cn(
          "text-xs",
          "uppercase",
          "text-muted",
          "font-medium",
          "tracking-wider",
        )}
      >
        <Radio size={14} class={cn("text-muted")} /> DHCP Leases
      </span>
      <span class={cn("flex-1")}></span>
      <span
        class={cn(
          "px-2",
          "py-0.5",
          "text-xs",
          "font-mono",
          "rounded-full",
          "text-accent",
          "bg-accent/10",
        )}>{dhcpLeases.dhcp_leases?.length || 0}</span
      >
      <span
        class={cn("text-xs", "font-mono", "transition-transform", "ml-2")}
        style="color: var(--text-muted); transform: rotate({hidden.dhcp
          ? 0
          : 90}deg)"
      >
        <ChevronRight size={14} class={cn("text-muted")} />
      </span>
    </button>
    {#if !hidden.dhcp}
      <div
        transition:slide|local={{ duration: 200 }}
        class={cn("px-5", "pb-5", "border-t", "border-border pt-4")}
      >
        {#if dhcpLeases.dhcp_leases?.length}
          <span
            class={cn(
              "mb-3",
              "block",
              "text-xs",
              "uppercase",
              "text-muted",
              "font-medium",
              "tracking-wider",
            )}>Active DHCPv4 Leases</span
          >
          <div class={cn("overflow-x-auto")}>
            <table class={cn("w-full text-xs")}>
              <thead>
                <tr class={cn("text-left", "text-muted")}>
                  <th class={cn("pb-2", "pr-3", "font-medium")}> Hostname </th>
                  <th class={cn("pb-2", "pr-3", "font-medium")}> IPv4 </th>
                  <th class={cn("pb-2", "pr-3", "font-medium")}> MAC </th>
                  <th class={cn("pb-2", "pr-3", "font-medium")}>
                    Remaining
                  </th></tr
                ></thead
              >
              <tbody>
                {#each dhcpLeases.dhcp_leases as l (l.macaddr)}
                  <tr class={cn("border-t border-border")}>
                    <td class={cn("py-2", "pr-3", "font-medium")}>
                      {l.hostname || "?"}
                    </td>
                    <td class={cn("py-2", "pr-3", "font-mono", "text-accent")}>
                      {l.ipaddr}
                    </td>
                    <td class={cn("py-2", "pr-3", "font-mono", "text-muted")}>
                      {l.macaddr}
                    </td>
                    <td class={cn("py-2", "pr-3", "font-mono")}>
                      {fmtUptime(l.leasetime || l.expires)}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
        {#if dhcpLeases.dhcp6_leases?.length}
          <span
            class={cn(
              "mb-3",
              "mt-4",
              "block",
              "text-xs",
              "uppercase",
              "text-muted",
              "font-medium",
              "tracking-wider",
            )}
          >
            Active DHCPv6 Leases
          </span>
          <div class={cn("overflow-x-auto")}>
            <table class={cn("w-full text-xs")}>
              <thead
                ><tr class={cn("text-left", "text-muted")}>
                  <th class={cn("pb-2", "pr-3", "font-medium")}> Hostname </th>
                  <th class={cn("pb-2", "pr-3", "font-medium")}> IPv6 </th><th
                    class={cn("pb-2", "pr-3", "font-medium")}
                  >
                    DUID
                  </th>
                  <th class={cn("pb-2", "pr-3", "font-medium")}>Remaining</th>
                </tr>
              </thead>
              <tbody>
                {#each dhcpLeases.dhcp6_leases as l (l.duid)}
                  <tr class={cn("border-t border-border")}>
                    <td class={cn("py-2", "pr-3", "font-medium")}>
                      {l.hostname || "?"}
                    </td>
                    <td class={cn("py-2", "pr-3", "font-mono", "text-accent")}>
                      {(Array.isArray(l.ip6addrs)
                        ? l.ip6addrs.join(", ")
                        : l.ip6addr || "—") || "—"}
                    </td>
                    <td class={cn("py-2", "pr-3", "font-mono", "text-muted")}>
                      {l.duid || "—"}
                    </td>
                    <td class={cn("py-2", "pr-3", "font-mono")}>
                      {fmtUptime(l.leasetime || l.expires)}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {:else if !dhcpLeases.dhcp_leases?.length}
          <p class={cn("text-sm", "text-center", "py-6", "text-muted")}>
            No active leases
          </p>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Dynamic DNS -->
  {#if ddnsStatus.length > 0}
    <div class={cn("glass", "animate-slide-up")}>
      <button class={cn(secClass, "p-5")} onclick={() => toggle("ddns")}>
        <span
          class={cn(
            "text-xs",
            "uppercase",
            "text-muted",
            "font-medium",
            "tracking-wider",
          )}><Radio size={14} class={cn("text-muted")} /> Dynamic DNS</span
        >
        <span class={cn("flex-1")}></span>
        <span
          class={cn("text-xs", "font-mono", "transition-transform")}
          style="color: var(--text-muted); transform: rotate({hidden.ddns
            ? 0
            : 90}deg)"
        >
          <ChevronRight size={14} class={cn("text-muted")} />
        </span>
      </button>
      {#if !hidden.ddns}
        <div
          transition:slide|local={{ duration: 200 }}
          class={cn("px-5", "pb-5", "border-t", "border-border", "pt-4")}
        >
          <div class={cn("overflow-x-auto")}>
            <table class={cn("w-full", "text-xs")}>
              <thead>
                <tr class={cn("text-left", "text-muted")}>
                  <th class={cn("pb-2", "pr-3", "font-medium")}>
                    Configuration
                  </th>
                  <th class={cn("pb-2", "pr-3", "font-medium")}>Next Update</th>
                  <th class={cn("pb-2", "pr-3", "font-medium")}>
                    Lookup Hostname
                  </th>
                  <th class={cn("pb-2", "pr-3", "font-medium")}>
                    Registered IP
                  </th>
                  <th class={cn("pb-2", "pr-3", "font-medium")}>Network</th>
                </tr>
              </thead>
              <tbody>
                {#each ddnsStatus as s}
                  <tr class={cn("border-t border-border")}>
                    <td class={cn("py-2", "pr-3", "font-medium")}>{s._name}</td>
                    <td class={cn("py-2", "pr-3")}
                      ><span
                        class={cn("px-2", "py-0.5", "rounded-full", "text-xs")}
                        style="background:{s.pid
                          ? 'rgba(0,212,170,0.1)'
                          : 'rgba(255,77,79,0.1)'};color:{s.pid
                          ? 'var(--accent)'
                          : 'var(--danger)'}"
                        >{s.pid ? "Running" : s.next_update || "Stopped"}</span
                      ></td
                    >
                    <td class={cn("py-2", "pr-3", "font-mono", "text-muted")}
                      >{s._lookup_host || "—"}</td
                    >
                    <td class={cn("py-2", "pr-3", "font-mono")}
                      >{s.ip || "—"}</td
                    >
                    <td class={cn("py-2", "pr-3", "font-mono", "text-muted")}>
                      {s._network || "—"}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <!-- UPnP -->
  {#if upnpStatus?.rules}
    <div class={cn("glass", "animate-slide-up")}>
      <button class={cn(secClass, "p-5")} onclick={() => toggle("upnp")}>
        <span
          class={cn(
            "text-xs",
            "uppercase",
            "text-muted",
            "font-medium",
            "tracking-wider",
          )}><PlusSquare size={14} class={cn("text-muted")} /> UPnP Port Maps</span
        >
        <span class={cn("flex-1")}></span>
        <span
          class={cn(
            "px-2",
            "py-0.5",
            "text-xs",
            "font-mono",
            "rounded-full",
            "text-accent",
            "bg-accent/10",
          )}
        >
          {upnpStatus.rules?.length || 0}
        </span>
        <span
          class={cn("text-xs", "font-mono", "transition-transform", "ml-2")}
          style="color: var(--text-muted); transform: rotate({hidden.upnp
            ? 0
            : 90}deg)"
        >
          <ChevronRight size={14} class={cn("text-muted")} />
        </span>
      </button>
      {#if !hidden.upnp}
        <div
          transition:slide|local={{ duration: 200 }}
          class={cn("px-5", "pb-5", "border-t", "border-border", "pt-4")}
        >
          {#if upnpStatus.rules?.length}
            <div class={cn("overflow-x-auto")}>
              <table class={cn("w-full", "text-xs")}>
                <thead
                  ><tr class={cn("text-left", "text-muted")}
                    ><th class={cn("pb-2", "pr-3", "font-medium")}>Client</th
                    ><th class={cn("pb-2", "pr-3", "font-medium")}>Address</th>
                    <th class={cn("pb-2", "pr-3", "font-medium")}>Port</th>
                    <th class={cn("pb-2", "pr-3", "font-medium")}>
                      External
                    </th>
                    <th class={cn("pb-2", "pr-3", "font-medium")}>Proto</th>
                    <th class={cn("pb-2", "pr-3", "font-medium")}>Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {#each upnpStatus.rules as r}
                    <tr class={cn("border-t", "border-border")}>
                      <td class={cn("py-2", "pr-3", "font-medium")}>
                        {r.descr || r.client || "—"}
                      </td>
                      <td class={cn("py-2", "pr-3", "font-mono", "text-muted")}>
                        {r.client_addr || "—"}
                      </td>
                      <td class={cn("py-2", "pr-3", "font-mono")}>
                        {r.client_port || "—"}
                      </td>
                      <td
                        class={cn("py-2", "pr-3", "font-mono", "text-accent")}
                      >
                        {r.ext_port || "—"}
                      </td>
                      <td class={cn("py-2", "pr-3")}>
                        {r.protocol || "—"}
                      </td>
                      <td class={cn("py-2", "pr-3", "font-mono", "text-muted")}>
                        {r.expires || "—"}
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {:else}
            <p class={cn("text-sm", "text-center", "py-6", "text-muted")}>
              No active port maps
            </p>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>
