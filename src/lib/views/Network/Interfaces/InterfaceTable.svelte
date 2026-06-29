<script lang="ts">
  import {
    Play,
    Square,
    Pencil,
    Trash2,
    RefreshCw,
    Plus,
    Network,
    Wifi,
    GitMerge,
    Layers,
    Cable,
    Link2,
    Radio,
    ArrowRightLeft,
    Globe,
  } from "@lucide/svelte";
  import { cn } from "../../../helpers/classname";
  import { fmtBytes, fmtPkts, fmtUptime } from "../../../helpers/format";
  import type { DeviceStatus, Iface } from "../types";

  let {
    interfaces,
    devices,
    firewalls,
    btnBusy,
    filter,
    loading,
    onadd,
    onrestart,
    onstop,
    onedit,
    ondelete,
    onfilter,
    trans,
  }: {
    interfaces: Iface[];
    devices: Record<string, DeviceStatus>;
    firewalls: Record<string, any>;
    btnBusy: Record<string, "restart" | "stop">;
    filter: string;
    loading: boolean;
    onadd: () => void;
    onrestart: (name: string) => void;
    onstop: (name: string) => void;
    onedit: (name: string) => void;
    ondelete: (name: string) => void;
    onfilter: (v: string) => void;
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

  const getDev = (ifc: Iface): DeviceStatus | null => {
    return devices[ifc.l2_device?.name || ifc.device] || null;
  };

  const getZoneColor = (iface: string): string => {
    for (const [, s] of Object.entries(firewalls)) {
      const sec = s as any;
      if (sec[".type"] === "zone") {
        const nets = toArray(sec.network);
        if (nets.includes(iface))
          return sec.name === "lan"
            ? "#16a34a"
            : sec.name === "wan"
              ? "#dc2626"
              : "#2563eb";
      }
    }
    return "#374151";
  };

  const getZoneName = (iface: string): string => {
    for (const [, s] of Object.entries(firewalls)) {
      const sec = s as any;
      if (sec[".type"] === "zone") {
        if (toArray(sec.network).includes(iface))
          return sec.name || sec[".name"] || "";
      }
    }
    return "";
  };

  const getIfIpAddrs = (ifc: Iface): string[] => {
    return (ifc["ipv4-address"] || []).map((a) => `${a.address}/${a.mask}`);
  };

  const getIfIp6Addrs = (ifc: Iface): string[] => {
    return (ifc["ipv6-address"] || []).map((a) => `${a.address}/${a.mask}`);
  };

  const toArray = (v: any): string[] => {
    if (!v) return [];
    if (Array.isArray(v)) return v.filter(Boolean);
    return String(v).split(/\s+/).filter(Boolean);
  };

  let filtered = $derived(
    filter
      ? interfaces.filter((i) =>
          i.interface.toLowerCase().includes(filter.toLowerCase()),
        )
      : interfaces,
  );
</script>

<div class={cn("flex", "items-center", "justify-between", "gap-2")}>
  <button
    onclick={onadd}
    class={cn(
      "inline-flex",
      "items-center",
      "gap-1",
      "px-2.5",
      "py-1.5",
      "text-xs",
      "rounded-md",
      "font-medium",
      "text-surface",
      "bg-accent",
      "hover:bg-accent/90",
      "cursor-pointer",
      "transition-all",
    )}
  >
    <Plus size={14} />
    {trans("Add new interface...")}
  </button>
  <input
    type="text"
    placeholder={trans("Filter...")}
    value={filter}
    oninput={(e) => onfilter((e.target as HTMLInputElement).value)}
    class={cn(
      "w-48",
      "px-2.5",
      "py-1.5",
      "border",
      "text-xs",
      "text-fg",
      "rounded-md",
      "bg-surface",
      "border-border",
      "outline-none",
      "focus:border-(--accent)",
      "font-mono",
    )}
  />
</div>

<div class={cn("glass", "rounded-xl", "overflow-hidden")}>
  {#if loading}
    <div class={cn("p-8", "text-center")}>
      <p class={cn("text-xs", "text-muted", "italic")}>{trans("Loading...")}</p>
    </div>
  {:else if interfaces.length === 0}
    <div class={cn("p-8", "text-center")}>
      <p class={cn("text-xs", "text-muted", "italic")}>
        {trans("No interfaces found.")}
      </p>
    </div>
  {:else}
    <div class={cn("overflow-x-auto")}>
      <table class={cn("w-full", "text-xs")}>
        <thead>
          <tr
            class={cn("text-left", "text-muted", "border-b", "border-border")}
          >
            <th class={cn("p-3", "font-medium", "w-10")}></th>
            <th class={cn("p-3", "pr-2", "font-medium")}
              >{trans("Interface")}</th
            >
            <th class={cn("p-3", "pr-2", "font-medium")}>{trans("Protocol")}</th
            >
            <th class={cn("p-3", "pr-2", "font-medium")}>{trans("Device")}</th>
            <th class={cn("p-3", "pr-2", "font-medium")}>{trans("IPv4")}</th>
            <th class={cn("p-3", "pr-2", "font-medium")}>{trans("IPv6")}</th>
            <th class={cn("p-3", "pr-2", "font-medium")}>{trans("RX")}</th>
            <th class={cn("p-3", "pr-2", "font-medium")}>{trans("TX")}</th>
            <th class={cn("p-3", "font-medium", "w-52")}>{trans("Actions")}</th>
          </tr>
        </thead>
        <tbody>
          {#each filtered as ifc (ifc.interface)}
            {@const dev = getDev(ifc)}
            {@const dtype = deviceTypeStr(
              ifc.l2_device?.name || ifc.device,
              dev,
            )}
            {@const Icon = deviceTypeIcon(dtype, ifc.up)}
            {@const isDown = !ifc.up}
            {@const isPending = ifc.pending || false}
            {@const zone = getZoneName(ifc.interface)}
            <tr
              class={cn(
                "border-b",
                "border-border",
                "hover:bg-white/2",
                "transition-colors",
              )}
            >
              <td class={cn("p-3", "pr-2", "align-top")}>
                <div
                  class={cn("ifacebox", "w-16")}
                  style="border-left: 3px solid {getZoneColor(ifc.interface)}"
                >
                  <div
                    class={cn(
                      "flex",
                      "items-center",
                      "gap-1.5",
                      "px-1.5",
                      "py-1",
                    )}
                  >
                    <Icon
                      size={14}
                      class={ifc.up ? "text-accent" : "text-muted"}
                    />
                    <span class={cn("text-[10px]", "font-semibold", "truncate")}
                      >{ifc.interface}</span
                    >
                  </div>
                  <div class={cn("px-1.5", "pb-1")}>
                    <span class={cn("text-[9px]", "text-muted")}
                      >{ifc.l2_device?.name || ifc.device || "?"}</span
                    >
                  </div>
                </div>
              </td>
              <td class={cn("p-3", "pr-2")}>
                <div class={cn("space-y-0.5")}>
                  <div class={cn("flex", "items-center", "gap-1.5")}>
                    <span class={cn("text-[10px]", "text-muted")}
                      >{ifc.proto || "?"}</span
                    >
                  </div>
                  {#if ifc.uptime}
                    <span class={cn("block", "text-[10px]", "text-muted")}
                      >{fmtUptime(ifc.uptime)}</span
                    >
                  {/if}
                  {#if dev?.carrier !== undefined}
                    <span
                      class={cn(
                        "text-[10px]",
                        dev.carrier ? "text-accent" : "text-danger",
                      )}
                    >
                      {dev.carrier ? trans("Carrier up") : trans("No carrier")}
                    </span>
                  {/if}
                  {#if dev?.macaddr}
                    <span
                      class={cn(
                        "block",
                        "text-[10px]",
                        "font-mono",
                        "text-muted",
                      )}>{dev.macaddr}</span
                    >
                  {/if}
                  {#if zone}
                    <span class={cn("text-[10px]", "text-accent")}>{zone}</span>
                  {/if}
                </div>
              </td>
              <td class={cn("p-3", "pr-2")}>
                <span class={cn("text-muted")}>{ifc.proto || "—"}</span>
              </td>
              <td class={cn("p-3", "pr-2")}>
                <span class={cn("font-mono")}
                  >{ifc.l2_device?.name || ifc.device || "—"}</span
                >
              </td>
              <td class={cn("p-3", "pr-2")}>
                {#if getIfIpAddrs(ifc).length}
                  {#each getIfIpAddrs(ifc) as addr}
                    <span
                      class={cn(
                        "block",
                        "font-mono",
                        "text-[11px]",
                        "text-accent",
                      )}>{addr}</span
                    >
                  {/each}
                {:else}
                  <span class={cn("text-muted")}>—</span>
                {/if}
              </td>
              <td class={cn("p-3", "pr-2")}>
                {#if getIfIp6Addrs(ifc).length}
                  {#each getIfIp6Addrs(ifc) as addr}
                    <span class={cn("block", "font-mono", "text-[11px]")}
                      >{addr}</span
                    >
                  {/each}
                {:else}
                  <span class={cn("text-muted")}>—</span>
                {/if}
              </td>
              <td class={cn("p-3", "pr-2")}>
                {#if dev?.statistics}
                  <span class={cn("block", "font-mono", "text-[11px]")}
                    >{fmtBytes(dev.statistics.rx_bytes)}</span
                  >
                  <span class={cn("block", "text-[10px]", "text-muted")}
                    >{fmtPkts(dev.statistics.rx_packets)} pkts</span
                  >
                {:else}
                  <span class={cn("text-muted")}>—</span>
                {/if}
              </td>
              <td class={cn("p-3", "pr-2")}>
                {#if dev?.statistics}
                  <span class={cn("block", "font-mono", "text-[11px]")}
                    >{fmtBytes(dev.statistics.tx_bytes)}</span
                  >
                  <span class={cn("block", "text-[10px]", "text-muted")}
                    >{fmtPkts(dev.statistics.tx_packets)} pkts</span
                  >
                {:else}
                  <span class={cn("text-muted")}>—</span>
                {/if}
              </td>
              <td class={cn("p-3")}>
                <div class={cn("flex", "items-center", "gap-1")}>
                  <button
                    onclick={() => onrestart(ifc.interface)}
                    disabled={btnBusy[ifc.interface] !== undefined || isPending}
                    class={cn(
                      "px-1.5",
                      "py-1",
                      "text-[10px]",
                      "rounded-md",
                      "font-medium",
                      "transition-all",
                      "cursor-pointer",
                      "disabled:opacity-30",
                      !isPending
                        ? "text-accent bg-accent/10 border border-accent/20 hover:bg-accent/20"
                        : "text-muted bg-surface border border-border",
                    )}
                    title={trans("Reconnect this interface")}
                  >
                    {#if btnBusy[ifc.interface] === "restart"}<RefreshCw
                        size={10}
                        class={cn("animate-spin")}
                      />{:else}<Play size={10} />{/if}
                  </button>
                  <button
                    onclick={() => onstop(ifc.interface)}
                    disabled={btnBusy[ifc.interface] !== undefined ||
                      isDown ||
                      isPending}
                    class={cn(
                      "px-1.5",
                      "py-1",
                      "text-[10px]",
                      "rounded-md",
                      "font-medium",
                      "transition-all",
                      "cursor-pointer",
                      "disabled:opacity-30",
                      !isDown && !isPending
                        ? "text-danger bg-danger/5 border border-danger/15 hover:bg-danger/15"
                        : "text-muted bg-surface border border-border",
                    )}
                    title={trans("Shutdown this interface")}
                  >
                    {#if btnBusy[ifc.interface] === "stop"}<RefreshCw
                        size={10}
                        class={cn("animate-spin")}
                      />{:else}<Square size={10} />{/if}
                  </button>
                  <button
                    onclick={() => onedit(ifc.interface)}
                    class={cn(
                      "px-1.5",
                      "py-1",
                      "text-[10px]",
                      "rounded-md",
                      "font-medium",
                      "transition-all",
                      "cursor-pointer",
                      "text-muted",
                      "hover:text-fg",
                      "hover:bg-white/5",
                    )}
                    title={trans("Edit this interface")}
                  >
                    <Pencil size={10} />
                  </button>
                  <button
                    onclick={() => ondelete(ifc.interface)}
                    disabled={btnBusy[ifc.interface] !== undefined}
                    class={cn(
                      "px-1.5",
                      "py-1",
                      "text-[10px]",
                      "rounded-md",
                      "font-medium",
                      "transition-all",
                      "cursor-pointer",
                      "disabled:opacity-30",
                      "text-muted",
                      "hover:text-danger",
                      "hover:bg-danger/5",
                    )}
                    title={trans("Delete this interface")}
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
