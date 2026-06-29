<script lang="ts">
  import { cn } from "../../../helpers/classname";
  import { Plus, Pencil, Trash2 } from "@lucide/svelte";

  let {
    trans,
    leases4 = [] as Record<string, unknown>[],
    leases6 = [] as Record<string, unknown>[],
    hosts = {} as Record<string, unknown>,
    uciDhcp = {} as import("../../../types").UciSection,
    busy = {} as Record<string, string>,
    hasDhcpV6 = true,
    onadd,
    onedit,
    ondelete,
  }: {
    trans: (k: string) => string;
    leases4?: Record<string, unknown>[];
    leases6?: Record<string, unknown>[];
    hosts?: Record<string, unknown>;
    uciDhcp?: import("../../../types").UciSection;
    busy?: Record<string, string>;
    hasDhcpV6?: boolean;
    onadd?: () => void;
    onedit?: (name: string) => void;
    ondelete?: (name: string) => void;
  } = $props();

  let th = "text-xs font-medium pb-2 px-3 text-left whitespace-nowrap";
  let td = "py-1.5 px-3 text-xs font-mono whitespace-nowrap";

  let getSections = (type: string) =>
    Object.entries(uciDhcp).filter(
      ([, v]: [string, import("../../../types").UciSection]) => v[".type"] === type,
    );

  let fmtLeaseTime = (expires: number | false) => {
    if (expires === false) return trans("unlimited");
    if (expires <= 0) return trans("expired");
    const s = Math.floor(expires);
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
    if (s < 86400)
      return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
    return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
  };

  let hostHint = (mac: string) => hosts[mac?.toLowerCase()];

  let ltoA = (v: string | string[] | undefined | null): string[] => {
    if (Array.isArray(v)) return v;
    if (v?.split) return v.split(/\s+/).filter(Boolean);
    return [];
  };
</script>

<div class={cn("mt-4", "space-y-8")}>
  <section>
    <h3 class={cn("text-sm", "font-semibold", "text-white", "mb-3")}>
      {trans("Static Leases")}
    </h3>
    <p class={cn("text-xs", "text-muted", "mb-3")}>
      {trans(
        "Static leases assign fixed IP addresses and symbolic hostnames to DHCP clients.",
      )}
    </p>
    <div class={cn("flex", "justify-end", "mb-3")}>
      <button
        onclick={onadd}
        class={cn(
          "flex",
          "px-3",
          "py-1.5",
          "gap-1.5",
          "text-xs",
          "rounded-lg",
          "bg-accent",
          "font-medium",
          "items-center",
          "text-black",
          "transition-all",
          "cursor-pointer",
          "hover:opacity-90",
        )}
      >
        <Plus size={12} />{trans("Add")}
      </button>
    </div>
    {#if getSections("host").length === 0}
      <p class={cn("py-4", "italic", "text-xs", "text-muted", "text-center")}>
        {trans("No static leases defined")}
      </p>
    {:else}
      <div class={cn("glass", "rounded-xl", "overflow-hidden")}>
        <table class={cn("w-full", "text-xs")}>
          <thead>
            <tr
              class={cn(
                "border-b",
                "text-left",
                "text-muted",
                "bg-surface",
                "border-border",
              )}
            >
              <th class={th}>{trans("Hostname")}</th>
              <th class={th}>{trans("MAC Addresses")}</th>
              <th class={th}>{trans("IPv4 address")}</th>
              <th class={th}>{trans("Lease time")}</th>
              <th class={th}>{trans("DUID/IAIDs")}</th>
              <th class={th}>{trans("Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {#each getSections("host") as [name, sec], i}
              <tr
                class={cn(
                  "border-b",
                  "border-border",
                  "hover:bg-white/4",
                  i % 2 === 0 && "bg-white/1.5",
                )}
              >
                <td class={td}>{sec.name || "—"}</td>
                <td class={td}>{ltoA(sec.mac).join(", ") || "—"}</td>
                <td class={cn(td, "text-accent")}>{sec.ip || "—"}</td>
                <td class={td}>{sec.leasetime || "—"}</td>
                <td class={td}
                  >{ltoA(sec.duid).join(", ").substring(0, 40) || "—"}</td
                >
                <td class={td}>
                  <div class={cn("flex", "items-center", "gap-1")}>
                    <button
                      onclick={() => onedit?.(name)}
                      class={cn(
                        "p-1",
                        "rounded",
                        "text-muted",
                        "hover:text-fg",
                        "cursor-pointer",
                        "hover:bg-white/5",
                      )}
                      title={trans("Edit")}
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      onclick={() => ondelete?.(name)}
                      disabled={busy[name] !== undefined}
                      class={cn(
                        "p-1",
                        "rounded",
                        "text-muted",
                        "cursor-pointer",
                        "hover:text-danger",
                        "hover:bg-danger/5",
                        "disabled:opacity-30",
                      )}
                      title={trans("Delete")}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>

  <section>
    <h3 class={cn("text-sm", "font-semibold", "text-white", "mb-3")}>
      {trans("Active DHCPv4 Leases")}
    </h3>
    {#if leases4.length === 0}
      <p class={cn("py-4", "italic", "text-xs", "text-muted", "text-center")}>
        {trans("There are no active leases")}
      </p>
    {:else}
      <div class={cn("glass", "rounded-xl", "overflow-hidden")}>
        <table class={cn("w-full", "text-xs")}>
          <thead>
            <tr
              class={cn(
                "border-b",
                "text-left",
                "text-muted",
                "bg-surface",
                "border-border",
              )}
            >
              <th class={th}>{trans("Interface")}</th>
              <th class={th}>{trans("Hostname")}</th>
              <th class={th}>{trans("IPv4 address")}</th>
              <th class={th}>{trans("MAC address")}</th>
              <th class={th}>{trans("DUID")}</th>
              <th class={th}>{trans("IAID")}</th>
              <th class={th}>{trans("Remaining time")}</th>
            </tr>
          </thead>
          <tbody>
            {#each leases4 as l, i}
              <tr
                class={cn(
                  "border-b",
                  "border-border",
                  "hover:bg-white/4",
                  i % 2 === 0 && "bg-white/1.5",
                )}
              >
                <td class={td}>{l.interface || "—"}</td>
                <td class={td}
                  >{l.hostname || hostHint(l.macaddr)?.name || "—"}</td
                >
                <td class={cn(td, "text-accent")}>{l.ipaddr}</td>
                <td class={td}>{l.macaddr?.toUpperCase() || "—"}</td>
                <td class={td}>{l.duid || "—"}</td>
                <td class={td}>{l.iaid || "—"}</td>
                <td class={td}
                  >{l.expires === undefined ? "—" : fmtLeaseTime(l.expires)}</td
                >
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>

  {#if hasDhcpV6}
    <section>
      <h3 class={cn("text-sm", "font-semibold", "text-white", "mb-3")}>
        {trans("Active DHCPv6 Leases")}
      </h3>
      {#if leases6.length === 0}
        <p class={cn("py-4", "italic", "text-xs", "text-muted", "text-center")}>
          {trans("There are no active leases")}
        </p>
      {:else}
        <div class={cn("glass", "rounded-xl", "overflow-hidden")}>
          <table class={cn("w-full", "text-xs")}>
            <thead>
              <tr
                class={cn(
                  "border-b",
                  "text-left",
                  "text-muted",
                  "bg-surface",
                  "border-border",
                )}
              >
                <th class={th}>{trans("Hostname")}</th>
                <th class={th}>{trans("IPv6 addresses")}</th>
                <th class={th}>{trans("DUID")}</th>
                <th class={th}>{trans("IAID")}</th>
                <th class={th}>{trans("Remaining time")}</th>
              </tr>
            </thead>
            <tbody>
              {#each leases6 as l, i}
                <tr
                  class={cn(
                    "border-b",
                    "border-border",
                    "hover:bg-white/4",
                    i % 2 === 0 && "bg-white/1.5",
                  )}
                >
                  <td class={td}
                    >{l.hostname || hostHint(l.macaddr)?.name || "—"}</td
                  >
                  <td class={cn(td, "text-accent")}>
                    {(l.ip6addrs || [l.ip6addr]).filter(Boolean).join("<br />")}
                  </td>
                  <td class={td}>{l.duid || "—"}</td>
                  <td class={td}>{l.iaid || "—"}</td>
                  <td class={td}
                    >{l.expires === undefined
                      ? "—"
                      : fmtLeaseTime(l.expires)}</td
                  >
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </section>
  {/if}
</div>
