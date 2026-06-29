<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import {
    Zap,
    Globe,
    HardDrive,
    ArrowUpDown,
    Settings,
    Network,
    Radio,
    PlusSquare,
  } from "@lucide/svelte";
  import StatCard from "../../components/StatCard/StatCard.svelte";
  import BandwidthChart from "../../components/BandwidthChart/BandwidthChart.svelte";
  import { batchCall } from "../../api/ubus";
  import { cn } from "../../helpers/classname";
  import { t as _t, getLocale, onLocaleChange } from "../../i18n";
  import { fmtUptime, fmtBytes, fmtRate } from "../../helpers/format";
  import CollapsibleSection from "./Dashboard/CollapsibleSection.svelte";
  import SystemInfo from "./Dashboard/SystemInfo.svelte";
  import MemStorage from "./Dashboard/MemStorage.svelte";
  import PortStatus from "./Dashboard/PortStatus.svelte";
  import NetworkInfo from "./Dashboard/NetworkInfo.svelte";
  import DhcpLeases from "./Dashboard/DhcpLeases.svelte";
  import DdnsStatus from "./Dashboard/DdnsStatus.svelte";
  import UpnpStatus from "./Dashboard/UpnpStatus.svelte";
  import type {
    SystemInfoData,
    BoardInfo,
    NetworkInterface,
    NetworkDevices,
    DhcpLeasesData,
    DdnsStatusRow,
    UpnpStatusData,
    DashboardBatchResult,
  } from "./Dashboard/types";

  let sysInfo = $state<SystemInfoData>({});
  let board = $state<BoardInfo>({});
  let interfaces = $state<NetworkInterface[]>([]);
  let devices: NetworkDevices = $state({});
  let dhcpLeases = $state<DhcpLeasesData>({});
  let ddnsStatus = $state<DdnsStatusRow[]>([]);
  let upnpStatus = $state<UpnpStatusData>({});
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

  let locale = $state(getLocale());
  let trans = $derived.by(() => {
    locale;
    return (k: string) => _t(k);
  });
  $effect(() =>
    onLocaleChange(() => {
      locale = getLocale();
    }),
  );

  const refresh = async () => {
    const [sys, brd, net, devs, dhcp, ddns, upnp, ddnsCfg] =
      (await batchCall([
        { object: "system", method: "info" },
        { object: "system", method: "board" },
        { object: "network.interface", method: "dump" },
        { object: "luci-rpc", method: "getNetworkDevices" },
        { object: "luci-rpc", method: "getDHCPLeases" },
        { object: "luci.ddns", method: "get_services_status" },
        { object: "luci.upnp", method: "get_status" },
        { object: "uci", method: "get", params: { config: "ddns" } },
      ])) as DashboardBatchResult;
    if (sys) {
      sysInfo = sys;
      uptime = fmtUptime(sys.uptime!);
      localTime = new Date(sys.localtime! * 1000).toLocaleString();
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
      const wan = net.interface.find((i) => i.interface === "wan");
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
      ddnsStatus = Object.entries(ddns).map(([k, v]) => {
        const c = cfg[k] || {};
        const ipv =
          c.use_ipv6 === "1" || k.includes("ipv6")
            ? trans("IPv6")
            : trans("IPv4");
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
</script>

<div class={cn("p-6", "space-y-4", "animate-fade-in")}>
  <div class={cn("flex", "items-center", "justify-between")}>
    <div class={cn("flex", "items-center", "gap-4")}>
      <div>
        <h1 class={cn("text-lg", "font-semibold", "text-white")}>
          {board.hostname || trans("Dashboard")}
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
        <span class={cn("text-accent")}>{trans("LIVE")}</span>
      </div>
    </div>
    <div class={cn("text-right", "text-xs", "text-muted")}>
      <span class={cn("font-mono block")}>{localTime}</span>
      <span>{trans("up")} {uptime}</span>
    </div>
  </div>

  <div class={cn("grid", "grid-cols-2", "gap-3", "lg:grid-cols-4")}>
    <StatCard
      label={trans("Memory")}
      value="{memPct}%"
      sub="{fmtBytes(memUsed)} / {fmtBytes(memTotal)}"
      Icon={HardDrive}
      color={memPct > 80
        ? "var(--danger)"
        : memPct > 60
          ? "var(--warn)"
          : "var(--accent)"}
    />
    <StatCard
      label={trans("Load")}
      value={load1}
      sub={`${load5} / ${load15}`}
      Icon={Zap}
      color={parseFloat(load1) > 1 ? "var(--warn)" : "var(--accent)"}
    />
    <StatCard
      label={trans("WAN")}
      value={wanIp}
      sub={wanProto}
      Icon={Globe}
      color="var(--info)"
      pulse={wanIp !== "—"}
    />
    <StatCard
      label={trans("Bandwidth")}
      value={bwRate.rxRate}
      sub={`${trans("TX")} ${bwRate.txRate}`}
      Icon={ArrowUpDown}
      color="var(--accent)"
    />
  </div>

  {#if board.hostname}
    <CollapsibleSection icon={Settings} title={trans("System")}>
      <SystemInfo {board} {load1} {load5} {load15} {trans} />
    </CollapsibleSection>
  {/if}

  <CollapsibleSection icon={HardDrive} title={trans("Memory & Storage")}>
    <MemStorage
      {sysInfo}
      {memTotal}
      {memUsed}
      {memPct}
      {memBuffered}
      {memCached}
      {trans}
    />
  </CollapsibleSection>

  {#if Object.keys(devices).length > 0}
    <CollapsibleSection icon={Globe} title={trans("Port Status")}>
      <PortStatus {devices} {interfaces} {trans} />
    </CollapsibleSection>
  {/if}

  {#if wanIp !== "—"}
    <CollapsibleSection icon={Network} title={trans("Network")}>
      <NetworkInfo
        {wanIp}
        {wanGw}
        {wanProto}
        {wanDevice}
        {wanMac}
        {wanDns}
        {trans}
      />
    </CollapsibleSection>
  {/if}

  <BandwidthChart rxRate={bwRate.rxRate} txRate={bwRate.txRate} />

  <CollapsibleSection
    icon={Radio}
    title={trans("DHCP Leases")}
    badge={`${dhcpLeases.dhcp_leases?.length || 0}`}
  >
    <DhcpLeases {dhcpLeases} {trans} />
  </CollapsibleSection>

  {#if ddnsStatus.length > 0}
    <CollapsibleSection icon={Radio} title={trans("Dynamic DNS")}>
      <DdnsStatus {ddnsStatus} {trans} />
    </CollapsibleSection>
  {/if}

  {#if upnpStatus?.rules}
    <CollapsibleSection
      icon={PlusSquare}
      title={trans("UPnP Port Maps")}
      badge={`${upnpStatus.rules?.length || 0}`}
    >
      <UpnpStatus {upnpStatus} {trans} />
    </CollapsibleSection>
  {/if}
</div>
