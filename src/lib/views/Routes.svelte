<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { batchCall } from "../api/ubus";
  import { cn } from "../helpers/classname";
  import { t as _t, getLocale, onLocaleChange } from "../i18n";

  let ip4neigh = $state<any[]>([]),
    ip4routes = $state<any[]>([]),
    ip4rules = $state<any[]>([]);
  let ip6neigh = $state<any[]>([]),
    ip6routes = $state<any[]>([]),
    ip6rules = $state<any[]>([]);
  let networks = $state<any[]>([]);
  let tab = $state<"ipv4" | "ipv6">("ipv4");
  let prevTab = $state("ipv4");
  let tabDir = $state("left");

  let locale = $state(getLocale());
  let trans = $derived.by(() => { locale; return (k: string) => _t(k); });
  $effect(() => onLocaleChange(() => { locale = getLocale(); }));

  const switchTab = (t: "ipv4" | "ipv6") => {
    tabDir = t === "ipv4" ? "right" : "left";
    prevTab = t;
    tab = t;
  };
  let interval: ReturnType<typeof setInterval>;

  const exec = (cmd: string, args: string[]) => ({
    object: "file",
    method: "exec",
    params: { command: cmd, params: args },
  });
  const p = (r: any) => {
    try {
      return JSON.parse(r?.stdout || "[]");
    } catch {
      return [];
    }
  };
  const netName = (dev: string, addr?: string) => {
    if (!addr)
      return (
        networks.find((n: any) => n.l3_device === dev || n.device === dev)
          ?.interface || `(${dev})`
      );
    const parts = addr.split(".").map(Number);
    const ipNum =
      (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
    let best = -1,
      name = "";
    for (const n of networks) {
      if (n.l3_device !== dev && n.device !== dev) continue;
      for (const a of n["ipv4-address"] || []) {
        if (!a?.address || a.mask === undefined) continue;
        const m =
          typeof a.mask === "number" ? a.mask : parseInt(String(a.mask));
        const ap = a.address.split(".").map(Number);
        const net = (ap[0] << 24) | (ap[1] << 16) | (ap[2] << 8) | ap[3];
        const maskBits = m;
        const mask = ~((1 << (32 - maskBits)) - 1);
        if ((ipNum & mask) === (net & mask) && maskBits > best) {
          best = maskBits;
          name = n.interface;
        }
      }
    }
    return name || `(${dev})`;
  };

  const refresh = async () => {
    const r = await batchCall<any>([
      { object: "network.interface", method: "dump" },
      exec("/sbin/ip", ["-4", "-j", "neigh", "show"]),
      exec("/sbin/ip", ["-4", "-j", "route", "show", "table", "all"]),
      exec("/sbin/ip", ["-4", "-j", "rule", "show"]),
      exec("/sbin/ip", ["-6", "-j", "neigh", "show"]),
      exec("/sbin/ip", ["-6", "-j", "route", "show", "table", "all"]),
      exec("/sbin/ip", ["-6", "-j", "rule", "show"]),
    ]);
    if (r[0]?.interface) networks = r[0].interface;
    ip4neigh = p(r[1]).filter((n: any) => !n.state?.includes("FAILED"));
    ip4routes = p(r[2]).filter(
      (rt: any) => rt.dst !== "fe80::/64" && rt.dst !== "ff00::/8",
    );
    ip4rules = p(r[3]);
    ip6neigh = p(r[4]).filter(
      (n: any) => !n.state?.includes("FAILED") && !n.dst?.startsWith("fe8"),
    );
    ip6routes = p(r[5]).filter(
      (rt: any) => rt.dst !== "fe80::/64" && rt.dst !== "ff00::/8",
    );
    ip6rules = p(r[6]);
  };

  const n = () => (tab === "ipv4" ? ip4neigh : ip6neigh);
  const rts = () => (tab === "ipv4" ? ip4routes : ip6routes);
  const rls = () => (tab === "ipv4" ? ip4rules : ip6rules);
  const v6 = () => tab === "ipv6";

  onMount(() => {
    refresh();
    interval = setInterval(refresh, 10000);
  });
  onDestroy(() => clearInterval(interval));

  const th = "text-xs font-medium pb-2 pr-3 text-left whitespace-nowrap";
  const td = "py-1.5 pr-3 text-xs font-mono whitespace-nowrap";
</script>

<div class={cn("p-6", "animate-fade-in")}>
  <h1 class={cn("text-lg", "font-semibold", "text-white")}>{trans("Routing")}</h1>
  <p class={cn("text-sm", "mt-0.5", "mb-4", "text-muted")}>
    {trans("The following rules are currently active on this system.")}
  </p>

  <div
    class={cn(
      "flex",
      "mb-4",
      "gap-1",
      "p-0.5",
      "w-fit",
      "border",
      "rounded-lg",
      "bg-surface-2",
      "border-border",
    )}
  >
    <button
      class={cn(
        "px-3",
        "py-1",
        "text-xs",
        "rounded-md",
        "font-medium",
        "transition-all",
        "cursor-pointer",
      )}
      style="background:{tab === 'ipv4'
        ? 'var(--accent)'
        : 'transparent'};color:{tab === 'ipv4'
        ? '#0d1117'
        : 'var(--text-muted)'}"
      onclick={() => switchTab("ipv4")}
    >
      {trans("IPv4 Routing")}
    </button>
    <button
      class={cn(
        "px-3",
        "py-1",
        "text-xs",
        "rounded-md",
        "font-medium",
        "transition-all",
        "cursor-pointer",
      )}
      style="background:{tab === 'ipv6'
        ? 'var(--accent)'
        : 'transparent'};color:{tab === 'ipv6'
        ? '#0d1117'
        : 'var(--text-muted)'}"
      onclick={() => switchTab("ipv6")}
    >
      {trans("IPv6 Routing")}
    </button>
  </div>

  {#key tab}
  <div class={cn("space-y-6", tabDir === "left" ? "animate-slide-left" : "animate-slide-right")}>
    <!-- Neighbours -->
    <div class={cn("glass", "p-5", "animate-slide-up")}>
      <h3 class={cn("text-sm", "font-semibold", "text-white", "mb-3")}>
        {tab === "ipv4" ? trans("IPv4") : trans("IPv6")} {trans("Neighbours")}
      </h3>
      {#if n().length}
        <div class={cn("overflow-x-auto")}>
          <table class={cn("w-full")}>
            <thead>
              <tr class={cn("text-muted")}>
                <th class={th}>{trans("Entry")}</th>
                <th class={th}>{trans("IP address")}</th>
                <th class={th}>{trans("MAC address")}</th>
                <th class={th}>{trans("Interface")}</th>
              </tr>
            </thead>
            <tbody>
              {#each n() as nb}
                <tr class={cn("border-t", "border-border")}>
                  <td class={td} title={JSON.stringify(nb)}>#</td>
                  <td class={cn(td, "text-accent")}>{nb.dst}</td>
                  <td class={td}>{nb.lladdr?.toUpperCase() || "—"}</td>
                  <td class={cn(td, "text-muted")}
                    >{netName(nb.dev, v6() ? undefined : nb.dst)}</td
                  >
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else}<p class={cn("text-xs", "text-center", "py-4", "text-muted")}>
          {trans("No entries available")}
        </p>{/if}
    </div>

    <!-- Routes -->
    <div class={cn("glass", "p-5", "animate-slide-up")}>
      <h3 class={cn("text-sm", "font-semibold", "text-white", "mb-3")}>
        {trans("Active")} {tab === "ipv4" ? trans("IPv4") : trans("IPv6")} {trans("Routes")}
      </h3>
      {#if rts().length}
        <div class={cn("overflow-x-auto")}>
          <table class={cn("w-full")}>
            <thead>
              <tr class={cn("text-muted")}>
                <th class={th}>{trans("Device")}</th>
                <th class={th}>{trans("Target")}</th>
                <th class={th}>{trans("Gateway")}</th>
                <th class={th}>{trans("Source")}</th>
                <th class={th}>{trans("Metric")}</th>
                <th class={th}>{trans("Table")}</th>
                <th class={th}>{trans("Protocol")}</th>
              </tr>
            </thead>
            <tbody>
              {#each rts() as rt}
                <tr class={cn("border-t", "border-border")}>
                  <td class={td}>
                    <span
                      class={cn(
                        "px-1.5",
                        "py-0.5",
                        "rounded",
                        "text-xs",
                        "text-accent",
                        "bg-accent/10",
                      )}
                    >
                      {netName(rt.dev, v6() ? undefined : rt.gateway || rt.dst)}
                    </span>
                  </td>
                  <td class={td}>{rt.dst || "—"}</td>
                  <td class={td}>{rt.gateway || "—"}</td>
                  <td class={td}>{rt.prefsrc || rt.from || "—"}</td>
                  <td class={td}>{rt.metric ?? "—"}</td>
                  <td class={cn(td, "text-muted")}>
                    {rt.table || trans("main")}
                  </td>
                  <td class={td}>{rt.protocol || "—"}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else}
        <p class={cn("text-xs", "text-center", "py-4", "text-muted")}>
          {trans("No entries available")}
        </p>
      {/if}
    </div>

    <!-- Rules -->
    <div class={cn("glass", "p-5", "animate-slide-up")}>
      <h3 class={cn("text-sm", "font-semibold", "text-white", "mb-3")}>
        {trans("Active")} {tab === "ipv4" ? trans("IPv4") : trans("IPv6")} {trans("Rules")}
      </h3>
      {#if rls().length}
        <div class={cn("overflow-x-auto")}>
          <table class={cn("w-full")}>
            <thead>
              <tr class={cn("text-muted")}>
                <th class={th}>{trans("Rule")}</th>
                <th class={th}>{trans("Priority")}</th>
                <th class={th}>{trans("Ingress")}</th>
                <th class={th}>{trans("Source")}</th>
                <th class={th}>{trans("Src Port")}</th>
                <th class={th}>{trans("Action")}</th>
                <th class={th}>{trans("IP Proto")}</th>
                <th class={th}>{trans("Egress")}</th>
                <th class={th}>{trans("Destination")}</th>
                <th class={th}>{trans("Dest Port")}</th>
                <th class={th}>{trans("Table")}</th>
              </tr>
            </thead>
            <tbody>
              {#each rls() as rl}
                <tr class={cn("border-t", "border-border")}>
                  <td class={td}>
                    <span title={JSON.stringify(rl)}>
                      {[
                        rl.not && trans("Not"),
                        rl.noop && trans("No-op"),
                        rl.l3mdev && trans("L3Mdev"),
                        rl.fwmark && `${trans("Fwmark:")} ${rl.fwmark}`,
                        rl.from &&
                          `${trans("From:")} ${rl.from}${rl.srclen ? `/${rl.srclen}` : ""}`,
                        rl.to &&
                          `${trans("To:")} ${rl.to}${rl.dstlen ? `/${rl.dstlen}` : ""}`,
                        rl.tos && `${trans("ToS:")} ${rl.tos}`,
                        rl.dscp && `${trans("DSCP:")} ${rl.dscp}`,
                        rl.uidrange && `${trans("UID-range:")} ${rl.uidrange}`,
                        rl.goto && `${trans("goto:")} ${rl.goto}`,
                        rl.nat && trans("NAT"),
                      ]
                        .filter(Boolean)
                        .join(" ") || "#"}
                    </span>
                  </td>
                  <td class={td}>{rl.priority ?? "—"}</td>
                  <td class={td}>
                    <span
                      class={cn(
                        "px-1.5",
                        "py-0.5",
                        "rounded",
                        "text-xs",
                        "text-info",
                        "bg-info/10",
                      )}
                    >
                      {rl.iif || "—"}
                    </span>
                  </td>
                  <td class={td}>
                    {rl.src
                      ? `${rl.src}${rl.srclen ? `/${rl.srclen}` : ""}`
                      : trans("(any)")}
                  </td>
                  <td class={td}>{rl.sport ?? "—"}</td>
                  <td class={td}>{rl.action ?? "—"}</td>
                  <td class={td}>{rl.ipproto || "—"}</td>
                  <td class={td}>
                    <span
                      class={cn(
                        "px-1.5",
                        "py-0.5",
                        "rounded",
                        "text-xs",
                        "text-info",
                        "bg-info/10",
                      )}
                    >
                      {rl.oif || "—"}
                    </span>
                  </td>
                  <td class={td}>
                    {rl.dst
                      ? `${rl.dst}${rl.dstlen ? `/${rl.dstlen}` : ""}`
                      : trans("(any)")}
                  </td>
                  <td class={td}>{rl.dport ?? "—"}</td>
                  <td class={cn(td, "text-muted")}>
                    {rl.table ?? "—"}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else}<p class={cn("text-xs", "text-center", "py-4", "text-muted")}>
          {trans("No entries available")}
        </p>{/if}
    </div>
  </div>
  {/key}
</div>
