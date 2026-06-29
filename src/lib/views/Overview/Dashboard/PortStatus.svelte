<script lang="ts">
  import { cn } from "../../../helpers/classname";
  import { fmtBytes, fmtPkts, cidr } from "../../../helpers/format";

  let {
    devices,
    interfaces,
    trans,
  }: {
    devices: Record<string, any>;
    interfaces: any[];
    trans: (k: string) => string;
  } = $props();
</script>

{#each Object.entries(devices).filter(([n]) => n !== "lo" && !n.startsWith("ifb")) as [name, dev] (name)}
  {#if dev.stats}
    <div
      class={cn("p-4", "border", "rounded-lg", "bg-surface-1", "border-border")}
    >
      <div class={cn("flex", "items-center", "gap-2", "mb-3")}>
        <div
          class={cn("w-2", "h-2", "bg-accent", "rounded-full", "animate-pulse")}
        ></div>
        <span class={cn("font-semibold", "text-sm")}>{name}</span>
        <span class={cn("font-mono", "text-xs", "text-muted")}>{dev.mac}</span>
        <span class={cn("flex-1")}></span>
        <span class={cn("text-xs", "text-accent-dim")}>
          {interfaces
            .filter((i) => i.device === name || i.l3_device === name)
            .map((i) => i.interface)
            .join(", ")}
          {#each dev.ipaddrs || [] as ip}{ip.address}{cidr(ip.netmask)}
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
          {trans("RX")}
          <span class={cn("block", "text-fg")}
            >{fmtBytes(dev.stats.rx_bytes)}</span
          >
          <span class={cn("block", "text-muted")}
            >{fmtPkts(dev.stats.rx_packets)} {trans("pkts")}</span
          >
        </div>
        <div>
          {trans("TX")}
          <span class={cn("block", "text-fg")}
            >{fmtBytes(dev.stats.tx_bytes)}</span
          >
          <span class={cn("block", "text-muted")}
            >{fmtPkts(dev.stats.tx_packets)} {trans("pkts")}</span
          >
        </div>
        <div>
          {trans("Errors")}
          <span class={cn("block", "text-fg")}>
            {trans("RX")}
            {dev.stats.rx_errors}
            {trans("TX")}
            {dev.stats.tx_errors}
          </span>
        </div>
        <div>
          {trans("Drop")}
          <span class={cn("block", "text-fg")}>
            {trans("RX")}
            {dev.stats.rx_dropped}
            {trans("TX")}
            {dev.stats.tx_dropped}
          </span>
        </div>
      </div>
    </div>
  {/if}
{/each}
