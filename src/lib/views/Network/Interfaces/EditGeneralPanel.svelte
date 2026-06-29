<script lang="ts">
  import {
    Network,
    Wifi,
    GitMerge,
    Layers,
    Cable,
    Link2,
    Radio,
    ArrowRightLeft,
  } from "@lucide/svelte";
  import { cn } from "../../../helpers/classname";
  import { fmtBytes, fmtPkts, fmtUptime } from "../../../helpers/format";
  import Input from "../../../components/Input/Input.svelte";
  import Toggle from "../../../components/Toggle/Toggle.svelte";
  import Select from "../../../components/Select/Select.svelte";
  import type { DeviceStatus, Iface } from "../types";

  let {
    ifc,
    dev,
    form,
    protocols,
    trans,
  }: {
    ifc: Iface | null;
    dev: DeviceStatus | null;
    form: Record<string, any>;
    protocols: { value: string; label: string }[];
    trans: (k: string) => string;
  } = $props();

  const deviceTypeIcon = (type: string, up: boolean) => {
    if (type === "bridge") return GitMerge;
    if (type === "vlan") return Layers;
    if (type === "wifi" || type === "wireless") return Wifi;
    if (type === "ppp" || type === "pppoe") return Cable;
    if (type === "bond") return Link2;
    if (
      type === "tunnel" ||
      type === "gre" ||
      type === "grev6" ||
      type === "ipip" ||
      type === "vti" ||
      type === "vti6"
    )
      return ArrowRightLeft;
    if (type === "ethernet") return Network;
    return Radio;
  };

  const deviceTypeStr = (name: string, st?: DeviceStatus | null): string => {
    if (st?.type) return st.type;
    if (name.startsWith("br-")) return "bridge";
    if (name.startsWith("eth")) return "ethernet";
    if (name.startsWith("wl") || name.startsWith("radio")) return "wifi";
    if (name.startsWith("ppp")) return "ppp";
    if (name.startsWith("bond")) return "bond";
    if (
      name.startsWith("gre") ||
      name.startsWith("ipip") ||
      name.startsWith("vti")
    )
      return "tunnel";
    if (name.includes(".")) return "vlan";
    return "ethernet";
  };

  // svelte-ignore state_referenced_locally
  const dtype = ifc
    ? deviceTypeStr(ifc.l2_device?.name || ifc.device, dev)
    : "ethernet";
  // svelte-ignore state_referenced_locally
  const Icon = ifc ? deviceTypeIcon(dtype, ifc?.up || false) : Network;

  const getIfIpAddrs = (ifc: Iface): string[] => {
    return (ifc["ipv4-address"] || []).map((a) => `${a.address}/${a.mask}`);
  };

  const getIfIp6Addrs = (ifc: Iface): string[] => {
    return (ifc["ipv6-address"] || []).map((a) => `${a.address}/${a.mask}`);
  };
</script>

<div class={cn("space-y-4")}>
  <div
    class={cn(
      "flex",
      "items-start",
      "gap-3",
      "p-3",
      "rounded-lg",
      "bg-surface",
      "border",
      "border-border",
    )}
  >
    <Icon size={24} class={ifc?.up ? "text-accent" : "text-muted"} />
    <div class={cn("flex-1", "min-w-0")}>
      <div
        class={cn("grid", "grid-cols-2", "gap-x-6", "gap-y-1", "text-[11px]")}
      >
        <span class={cn("text-muted")}>{trans("Protocol")}:</span>
        <span class={cn("font-medium", "text-fg")}>{ifc?.proto || "—"}</span>
        <span class={cn("text-muted")}>{trans("Device")}:</span>
        <span class={cn("font-mono", "text-fg")}
          >{dev?.name || ifc?.l2_device?.name || ifc?.device || "—"}</span
        >
        <span class={cn("text-muted")}>{trans("Carrier")}:</span>
        <span class={dev?.carrier ? "text-accent" : "text-danger"}
          >{dev?.carrier ? trans("Present") : trans("Absent")}</span
        >
        <span class={cn("text-muted")}>{trans("Uptime")}:</span>
        <span class={cn("text-fg")}
          >{ifc?.uptime ? fmtUptime(ifc.uptime) : "—"}</span
        >
        <span class={cn("text-muted")}>{trans("MAC Address")}:</span>
        <span class={cn("font-mono", "text-fg")}>{dev?.macaddr || "—"}</span>
        <span class={cn("text-muted")}>{trans("RX")}:</span>
        <span class={cn("text-fg")}
          >{dev?.statistics
            ? `${fmtBytes(dev.statistics.rx_bytes)} (${fmtPkts(dev.statistics.rx_packets)} pkts)`
            : "—"}</span
        >
        <span class={cn("text-muted")}>{trans("TX")}:</span>
        <span class={cn("text-fg")}
          >{dev?.statistics
            ? `${fmtBytes(dev.statistics.tx_bytes)} (${fmtPkts(dev.statistics.tx_packets)} pkts)`
            : "—"}</span
        >
        {#if ifc && getIfIpAddrs(ifc).length}
          <span class={cn("text-muted")}>{trans("IPv4")}:</span>
          <span class={cn("font-mono", "text-fg")}
            >{getIfIpAddrs(ifc).join(", ")}</span
          >
        {/if}
        {#if ifc && getIfIp6Addrs(ifc).length}
          <span class={cn("text-muted")}>{trans("IPv6")}:</span>
          <span class={cn("font-mono", "text-fg")}
            >{getIfIp6Addrs(ifc).join(", ")}</span
          >
        {/if}
      </div>
    </div>
  </div>

  <div class={cn("h-px", "bg-border")}></div>

  <Select
    label={trans("Protocol")}
    options={protocols}
    bind:value={form.proto}
    placeholder={trans("Select protocol")}
  />
  <Input
    label={trans("Device")}
    bind:value={form.device}
    placeholder="Select device..."
    mono
  />
  <div class={cn("space-y-2")}>
    <Toggle
      label={trans("Disable this interface")}
      bind:checked={form.disabled}
    />
    <Toggle label={trans("Bring up on boot")} bind:checked={form.auto} />
  </div>
  {#if form.proto === "static"}
    <div class={cn("h-px", "bg-border")}></div>
    <p class={cn("text-xs", "font-semibold", "text-fg", "mb-2")}>
      {trans("Protocol specific options")}
    </p>
    <div class={cn("grid", "grid-cols-2", "gap-4")}>
      <Input
        label={trans("IPv4 address")}
        bind:value={form.ipaddr}
        placeholder="192.168.1.1"
        mono
      />
      <Input
        label={trans("IPv4 netmask")}
        bind:value={form.netmask}
        placeholder="255.255.255.0"
        mono
      />
    </div>
    <div class={cn("grid", "grid-cols-2", "gap-4")}>
      <Input
        label={trans("IPv4 gateway")}
        bind:value={form.gateway}
        placeholder="192.168.1.254"
        mono
      />
      <Input
        label={trans("Broadcast")}
        bind:value={form.broadcast}
        placeholder="192.168.1.255"
        mono
      />
    </div>
  {/if}
</div>
