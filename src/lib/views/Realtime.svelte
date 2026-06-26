<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { Globe, Zap, Radio } from "@lucide/svelte";
  import { cn } from "../helpers/classname";
  import { call, getRealtimeStats, fetchConntrackMetrics, getConntrackList } from "../api/ubus";
  import RealtimeGraph from "../components/RealtimeGraph.svelte";

  let tab = $state<"bandwidth" | "load" | "connections">("bandwidth");
  let interval: ReturnType<typeof setInterval>;

  const pollMs = 2000;
  const maxPts = 120;

  // ---- Bandwidth ----
  let bwInterfaces = $state<string[]>([]);
  let bwActiveTab = $state("");
  let bwData = $state<Record<string, { rx: number[]; tx: number[] }>>({});
  let bwLastTs = $state<Record<string, number>>({});

  // ---- Load ----
  let loadData = $state<{ l1: number[]; l5: number[]; l15: number[] }>({
    l1: [], l5: [], l15: [],
  });
  let loadLastTs = $state(0);

  // ---- Connections ----
  let ctData = $state<{ udp: number[]; tcp: number[]; other: number[] }>({
    udp: [], tcp: [], other: [],
  });
  let ctList = $state<any[]>([]);
  let ctSearch = $state("");

  // ---- Formatters ----
  const fmtBits = (bps: number) => {
    if (bps >= 1e9) return `${(bps / 1e9).toFixed(1)} Gbps`;
    if (bps >= 1e6) return `${(bps / 1e6).toFixed(1)} Mbps`;
    if (bps >= 1e3) return `${(bps / 1e3).toFixed(1)} Kbps`;
    return `${bps.toFixed(0)} bps`;
  };
  const fmtLoad = (v: number) => (v / 100).toFixed(2);
  const fmtInt = (v: number) => String(Math.round(v));
  const fmtBytes = (b: number) => {
    if (b >= 1e12) return `${(b / 1e12).toFixed(1)} TB`;
    if (b >= 1e9) return `${(b / 1e9).toFixed(1)} GB`;
    if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MB`;
    if (b >= 1e3) return `${(b / 1e3).toFixed(1)} KB`;
    return `${b} B`;
  };

  // ---- Data refresh ----
  const discoverInterfaces = async () => {
    const devs = await call<Record<string, any>>("luci-rpc", "getNetworkDevices", {});
    if (!devs || typeof devs !== "object") return;
    const ifaces = Object.keys(devs).filter(
      (k) => k !== "lo" && !k.startsWith("ifb") && devs[k]?.stats,
    );
    if (ifaces.length === 0) return;
    bwInterfaces = ifaces;
    if (!bwActiveTab || !ifaces.includes(bwActiveTab)) bwActiveTab = ifaces[0];
    for (const iface of ifaces) {
      if (!bwData[iface]) bwData[iface] = { rx: [], tx: [] };
    }
  };

  const refreshBandwidth = async () => {
    if (bwInterfaces.length === 0) return;
    const data = await getRealtimeStats("interface", bwActiveTab);
    if (!data?.length) return;
    const pts = bwData[bwActiveTab];
    if (!pts) return;
    const lastTs = bwLastTs[bwActiveTab] || 0;
    for (let j = lastTs ? 0 : 1; j < data.length; j++) {
      if (data[j][0] <= lastTs) continue;
      if (j > 0) {
        const dt = data[j][0] - data[j - 1][0];
        if (dt > 0) {
          const rx = Math.max(0, (data[j][1] - data[j - 1][1]) / dt);
          const tx = Math.max(0, (data[j][3] - data[j - 1][3]) / dt);
          pts.rx = [...pts.rx, rx].slice(-maxPts);
          pts.tx = [...pts.tx, tx].slice(-maxPts);
        }
      }
    }
    bwData = { ...bwData, [bwActiveTab]: pts };
    bwLastTs = { ...bwLastTs, [bwActiveTab]: data[data.length - 1][0] };
  };

  const refreshLoad = async () => {
    const data = await getRealtimeStats("load");
    if (!data?.length) return;
    for (let j = loadLastTs ? 0 : 1; j < data.length; j++) {
      if (data[j][0] <= loadLastTs) continue;
      loadData = {
        l1: [...loadData.l1, data[j][1]].slice(-maxPts),
        l5: [...loadData.l5, data[j][2]].slice(-maxPts),
        l15: [...loadData.l15, data[j][3]].slice(-maxPts),
      };
    }
    loadLastTs = data[data.length - 1][0];
  };

  const refreshConnections = async () => {
    const metrics = await fetchConntrackMetrics();
    if (metrics) {
      ctData = {
        udp: [...ctData.udp, metrics.udp].slice(-maxPts),
        tcp: [...ctData.tcp, metrics.tcp].slice(-maxPts),
        other: [...ctData.other, metrics.other].slice(-maxPts),
      };
    }
    const list = await getConntrackList();
    if (list) ctList = list;
  };

  const refresh = async () => {
    if (tab === "bandwidth") { await discoverInterfaces(); await refreshBandwidth(); }
    else if (tab === "load") await refreshLoad();
    else if (tab === "connections") await refreshConnections();
  };

  // ---- Lifecycle ----
  onMount(async () => {
    await discoverInterfaces();
    await refresh();
    interval = setInterval(refresh, pollMs);
  });

  onDestroy(() => clearInterval(interval));

  // ---- Connection table helpers ----
  const joinAddr = (addr: string, port: number) =>
    addr.includes(":") ? `[${addr}]:${port}` : `${addr}:${port}`;

  const ctFiltered = $derived(
    ctSearch
      ? ctList.filter(
          (c) =>
            c.src?.includes(ctSearch) ||
            c.dst?.includes(ctSearch) ||
            c.layer4?.toLowerCase().includes(ctSearch.toLowerCase()),
        )
      : ctList,
  );

  const protoColor: Record<string, string> = {
    tcp: "#00d4aa",
    udp: "#58a6ff",
  };

  // ---- Interface tabs ----
  const switchIface = (name: string) => {
    bwActiveTab = name;
    bwLastTs = { ...bwLastTs, [name]: 0 };
    bwData = { ...bwData, [name]: { rx: [], tx: [] } };
    refreshBandwidth();
  };
</script>

<div class={cn("p-6", "flex", "flex-col", "h-screen", "gap-4", "animate-fade-in")}>
  <div class={cn("flex-shrink-0")}>
    <h1 class={cn("text-lg", "font-semibold", "text-white")}>Realtime Graphs</h1>
    <p class={cn("text-sm", "mt-0.5", "text-muted")}>
      Bandwidth, load, connections
    </p>
  </div>

  <!-- Tab bar -->
  <div
    class={cn(
      "flex", "gap-1", "p-0.5", "w-fit", "border", "rounded-lg",
      "bg-surface-2", "border-border", "flex-shrink-0",
    )}
  >
    {#each [
      { id: "bandwidth" as const, label: "Bandwidth", icon: Globe },
      { id: "load" as const, label: "Load", icon: Zap },
      { id: "connections" as const, label: "Connections", icon: Radio },
    ] as t}
      {@const TabIcon = t.icon}
      <button
        class={cn(
          "px-3", "py-1.5", "text-xs", "rounded-md", "font-medium",
          "transition-all", "flex", "items-center", "gap-1.5", "cursor-pointer",
        )}
        style="background:{tab === t.id ? 'var(--accent)' : 'transparent'};color:{tab === t.id ? '#0d1117' : 'var(--text-muted)'}"
        onclick={() => { tab = t.id; refresh(); }}
      >
        <TabIcon size={14} />
        {t.label}
      </button>
    {/each}
  </div>

  <!-- Content -->
  <div class={cn("flex-1", "min-h-0")}>
  <!-- Bandwidth -->
  {#if tab === "bandwidth"}
    <div class={cn("flex", "flex-col", "h-full", "gap-4")}>
      <div class={cn("flex", "flex-wrap", "gap-1", "items-center")}>
        {#each bwInterfaces as iface}
          <button
            class={cn(
              "px-2.5", "py-1", "text-xs", "rounded-md", "font-medium",
              "transition-all", "cursor-pointer", "border",
            )}
            style="background:{bwActiveTab === iface ? 'var(--accent)' : 'var(--surface)'};color:{bwActiveTab === iface ? '#0d1117' : 'var(--text-muted)'};border-color:{bwActiveTab === iface ? 'var(--accent)' : 'var(--border)'}"
            onclick={() => switchIface(iface)}
          >
            {iface}
          </button>
        {/each}
      </div>

      {#if bwActiveTab && bwData[bwActiveTab]}
        <RealtimeGraph
          series={[
            { label: "Inbound", color: "#58a6ff", data: bwData[bwActiveTab].rx },
            { label: "Outbound", color: "#00d4aa", data: bwData[bwActiveTab].tx },
          ]}
          formatValue={fmtBits}
          noData={bwData[bwActiveTab].rx.length === 0}
          noDataMsg="Collecting data…"
        />
      {:else}
        <RealtimeGraph series={[]} formatValue={fmtBits} noData noDataMsg="No interfaces" />
      {/if}
    </div>
  {/if}

  <!-- Load -->
  {#if tab === "load"}
    <RealtimeGraph
      series={[
        { label: "1 Minute", color: "#ff4d4f", data: loadData.l1 },
        { label: "5 Minute", color: "#f0883e", data: loadData.l5 },
        { label: "15 Minute", color: "#f0c83e", data: loadData.l15 },
      ]}
      formatValue={fmtLoad}
      noData={loadData.l1.length === 0}
      noDataMsg="Collecting data…"
    />
  {/if}

  <!-- Connections -->
  {#if tab === "connections"}
    <div class={cn("flex", "flex-col", "h-full", "gap-4")}>
      <RealtimeGraph
        series={[
          { label: "UDP", color: "#58a6ff", data: ctData.udp },
          { label: "TCP", color: "#00d4aa", data: ctData.tcp },
          { label: "Other", color: "#ff4d4f", data: ctData.other },
        ]}
        formatValue={fmtInt}
        height={160}
        noData={ctData.udp.length === 0 && ctData.tcp.length === 0}
        noDataMsg="Connection tracking unavailable"
      />

      <!-- Connections table -->
      <div class={cn("glass", "p-5", "flex", "flex-col", "flex-1", "min-h-0")}>
        <div class={cn("flex", "items-center", "justify-between", "flex-shrink-0", "mb-3")}>
          <h3 class={cn("text-sm", "font-semibold", "text-white")}>
            Active Connections
            <span class={cn("text-muted", "font-normal", "ml-1")}>
              ({ctList.length})
            </span>
          </h3>
          <input
            type="text"
            placeholder="Filter connections…"
            class={cn(
              "px-2", "py-1", "text-xs", "rounded-md", "outline-none",
              "bg-surface", "border", "border-border", "text-fg",
              "w-48", "placeholder:text-muted",
            )}
            bind:value={ctSearch}
          />
        </div>

        {#if ctFiltered.length > 0}
          <div class={cn("flex-1", "min-h-0", "overflow-y-auto")}>
            <table class={cn("w-full", "text-xs", "font-mono")}>
              <thead>
                <tr class={cn("text-muted", "uppercase", "text-xs", "tracking-wider")}>
                  <th class={cn("text-left", "p-1.5")}>Network</th>
                  <th class={cn("text-left", "p-1.5")}>Protocol</th>
                  <th class={cn("text-left", "p-1.5")}>Source</th>
                  <th class={cn("text-left", "p-1.5")}>Destination</th>
                  <th class={cn("text-right", "p-1.5")}>Transfer</th>
                </tr>
              </thead>
              <tbody>
                {#each ctFiltered.slice(0, 500) as c}
                  <tr class={cn("border-t", "border-border", "hover:bg-surface-2/50")}>
                    <td class={cn("p-1.5", "text-muted")}>{c.layer3?.toUpperCase?.() || "-"}</td>
                    <td class={cn("p-1.5")}>
                      <span
                        class={cn("font-semibold")}
                        style="color:{protoColor[c.layer4?.toLowerCase()] || 'var(--text-muted)'}"
                      >
                        {c.layer4?.toUpperCase?.() || "-"}
                      </span>
                    </td>
                    <td class={cn("p-1.5")}>{joinAddr(c.src || "?", c.sport || 0)}</td>
                    <td class={cn("p-1.5")}>{joinAddr(c.dst || "?", c.dport || 0)}</td>
                    <td class={cn("p-1.5", "text-right")}>
                      {fmtBytes(c.bytes || 0)}
                      <span class={cn("text-muted")}>
                        {" "}({c.packets || 0} pkts)
                      </span>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
            {#if ctFiltered.length > 500}
              <p class={cn("text-xs", "text-muted", "text-center", "mt-2")}>
                Showing 500 of {ctFiltered.length} connections
              </p>
            {/if}
          </div>
        {:else}
          <div class={cn("flex-1", "flex", "items-center", "justify-center")}>
            <p class={cn("text-xs", "text-muted")}>
              {ctSearch ? "No matching connections" : "Collecting data…"}
            </p>
          </div>
        {/if}
      </div>
    </div>
  {/if}
  </div>
</div>
