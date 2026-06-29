<script lang="ts">
  import { cn } from "../../../helpers/classname";
  import { fmtUptime } from "../../../helpers/format";

  let {
    dhcpLeases,
    trans,
  }: {
    dhcpLeases: any;
    trans: (k: string) => string;
  } = $props();
</script>

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
    )}
  >
    {trans("Active DHCPv4 Leases")}
  </span>
  <div class={cn("overflow-x-auto")}>
    <table class={cn("w-full text-xs")}>
      <thead>
        <tr class={cn("text-left", "text-muted")}>
          <th class={cn("pb-2", "pr-3", "font-medium")}>{trans("Hostname")}</th>
          <th class={cn("pb-2", "pr-3", "font-medium")}>{trans("IPv4")}</th>
          <th class={cn("pb-2", "pr-3", "font-medium")}>{trans("MAC")}</th>
          <th class={cn("pb-2", "pr-3", "font-medium")}>{trans("Remaining")}</th
          >
        </tr>
      </thead>
      <tbody>
        {#each dhcpLeases.dhcp_leases as l (l.macaddr)}
          <tr class={cn("border-t border-border")}>
            <td class={cn("py-2", "pr-3", "font-medium")}
              >{l.hostname || "?"}</td
            >
            <td class={cn("py-2", "pr-3", "font-mono", "text-accent")}
              >{l.ipaddr}</td
            >
            <td class={cn("py-2", "pr-3", "font-mono", "text-muted")}
              >{l.macaddr}</td
            >
            <td class={cn("py-2", "pr-3", "font-mono")}
              >{fmtUptime(l.leasetime || l.expires)}</td
            >
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
    {trans("Active DHCPv6 Leases")}
  </span>
  <div class={cn("overflow-x-auto")}>
    <table class={cn("w-full text-xs")}>
      <thead>
        <tr class={cn("text-left", "text-muted")}>
          <th class={cn("pb-2", "pr-3", "font-medium")}>{trans("Hostname")}</th>
          <th class={cn("pb-2", "pr-3", "font-medium")}>{trans("IPv6")}</th>
          <th class={cn("pb-2", "pr-3", "font-medium")}>{trans("DUID")}</th>
          <th class={cn("pb-2", "pr-3", "font-medium")}>{trans("Remaining")}</th
          >
        </tr>
      </thead>
      <tbody>
        {#each dhcpLeases.dhcp6_leases as l (l.duid)}
          <tr class={cn("border-t border-border")}>
            <td class={cn("py-2", "pr-3", "font-medium")}
              >{l.hostname || "?"}</td
            >
            <td class={cn("py-2", "pr-3", "font-mono", "text-accent")}>
              {(Array.isArray(l.ip6addrs)
                ? l.ip6addrs.join(", ")
                : l.ip6addr || "—") || "—"}
            </td>
            <td class={cn("py-2", "pr-3", "font-mono", "text-muted")}
              >{l.duid || "—"}</td
            >
            <td class={cn("py-2", "pr-3", "font-mono")}
              >{fmtUptime(l.leasetime || l.expires)}</td
            >
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{:else if !dhcpLeases.dhcp_leases?.length}
  <p class={cn("text-sm", "text-center", "py-6", "text-muted")}>
    {trans("No active leases")}
  </p>
{/if}
