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
    Monitor,
  } from "@lucide/svelte";
  import { cn } from "../../../helpers/classname";
  import type { DeviceStatus } from "../types";

  let {
    devices,
    deviceUciSections,
    loading,
    onconfigure,
    trans,
  }: {
    devices: Record<string, DeviceStatus>;
    deviceUciSections: any[];
    loading: boolean;
    onconfigure: (name: string) => void;
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
</script>

<div class={cn("glass", "rounded-xl", "overflow-hidden")}>
  {#if loading}
    <div class={cn("p-8", "text-center")}>
      <p class={cn("text-xs", "text-muted", "italic")}>{trans("Loading...")}</p>
    </div>
  {:else}
    <div class={cn("overflow-x-auto")}>
      <table class={cn("w-full", "text-xs")}>
        <thead>
          <tr
            class={cn("text-left", "text-muted", "border-b", "border-border")}
          >
            <th class={cn("p-3", "pr-2", "font-medium")}>{trans("Device")}</th>
            <th class={cn("p-3", "pr-2", "font-medium")}>{trans("Type")}</th>
            <th class={cn("p-3", "pr-2", "font-medium")}
              >{trans("Link Speed")}</th
            >
            <th class={cn("p-3", "pr-2", "font-medium")}
              >{trans("MAC Address")}</th
            >
            <th class={cn("p-3", "pr-2", "font-medium")}>{trans("MTU")}</th>
            <th class={cn("p-3", "font-medium")}>{trans("Actions")}</th>
          </tr>
        </thead>
        <tbody>
          {#each Object.entries(devices) as [name, dev]}
            {@const dtype = deviceTypeStr(name, dev)}
            {@const Icon = deviceTypeIcon(dtype, dev.carrier)}
            {@const hasUci = deviceUciSections.find((s) => s.name === name)}
            <tr
              class={cn(
                "border-b",
                "border-border",
                "hover:bg-white/2",
                "transition-colors",
              )}
            >
              <td class={cn("p-3", "pr-2")}>
                <div class={cn("flex", "items-center", "gap-2")}>
                  <Icon
                    size={14}
                    class={dev.carrier ? "text-accent" : "text-muted"}
                  />
                  <span class={cn("font-semibold", "font-mono", "text-fg")}
                    >{name}</span
                  >
                </div>
              </td>
              <td class={cn("p-3", "pr-2", "text-muted")}>{dev.type || "—"}</td>
              <td class={cn("p-3", "pr-2")}>
                {#if dev.speed && dev.carrier}
                  <span
                    >{dev.speed >= 1000
                      ? `${dev.speed / 1000} Gbit/s`
                      : `${dev.speed} Mbit/s`}</span
                  >
                  {#if dev["link-supported"]?.length}
                    <span class={cn("block", "text-[10px]", "text-muted")}>
                      {trans("Supported:")}
                      {dev["link-supported"]
                        .map((s: string) => s.match(/^(\d+)base/)?.[1])
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  {/if}
                {:else if dev.carrier}
                  <span class={cn("text-muted")}>—</span>
                {:else}
                  <span class={cn("text-muted")}>-</span>
                {/if}
              </td>
              <td class={cn("p-3", "pr-2")}>
                <span class={cn("font-mono", "text-[11px]")}
                  >{dev.macaddr || "-"}</span
                >
              </td>
              <td class={cn("p-3", "pr-2")}>
                <span class={cn("font-mono")}>{dev.mtu || "-"}</span>
              </td>
              <td class={cn("p-3")}>
                <button
                  onclick={() => onconfigure(hasUci ? hasUci[".name"] : name)}
                  class={cn(
                    "px-2",
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
                >
                  {trans("Configure")}
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
