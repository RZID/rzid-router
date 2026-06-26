<script lang="ts">
  import { ArrowUpDown, ChevronRight } from "@lucide/svelte";
  import { onMount, onDestroy } from "svelte";
  import { slide } from "svelte/transition";
  import { cn } from "../helpers/classname";
  let items = $state<any[]>([]);
  let interval: ReturnType<typeof setInterval>;

  const refresh = async () => {
    try {
      const res = await fetch(
        (import.meta.env.DEV ? "http://10.10.0.1" : "") + "/ubus",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "call",
            params: [
              localStorage.getItem("owrt_session") ||
                "00000000000000000000000000000000",
              "file",
              "exec",
              {
                command: "/usr/sbin/nft",
                params: ["--terse", "--json", "list", "ruleset"],
              },
            ],
          }),
        },
      );
      const data = await res.json();
      if (data.result?.[0] === 0) {
        items = JSON.parse(data.result[1]?.stdout || "{}").nftables || [];
      }
    } catch {
      items = [];
    }
  };

  const tables = $derived(items.filter((o: any) => o.table));
  const chains = $derived(items.filter((o: any) => o.chain));
  const rules = $derived(items.filter((o: any) => o.rule));
  const fam: Record<string, string> = {
    ip: "IPv4",
    ip6: "IPv6",
    inet: "IPv4/IPv6",
    arp: "ARP",
    bridge: "Bridge",
    netdev: "Netdev",
  };
  const chainRules = (f: string, t: string, c: string) =>
    rules.filter(
      (r: any) =>
        r.rule.family === f && r.rule.table === t && r.rule.chain === c,
    );
  const getCounter = (c: any) =>
    items.find(
      (o: any) =>
        o.counter &&
        o.counter.family === c?.family &&
        o.counter.table === c?.table &&
        o.counter.name === c?.name,
    )?.counter;

  // Format helpers
  const fm = {
    pps: (n: number) =>
      n >= 1e6
        ? `${(n / 1e6).toFixed(1)}M`
        : n >= 1e3
          ? `${(n / 1e3).toFixed(1)}K`
          : String(n),
    bytes: (b: number) =>
      b >= 1e9
        ? `${(b / 1e9).toFixed(1)} GiB`
        : b >= 1e6
          ? `${(b / 1e6).toFixed(1)} MiB`
          : b >= 1024
            ? `${(b / 1024).toFixed(1)} KiB`
            : `${b} B`,
  };

  // Expression to human-readable string
  const ets = (e: any): string => {
    if (!e) return "";
    if (typeof e === "string") return e;
    if (e.match) {
      const { left, right, op } = e.match;
      const l = evs(left),
        r = evs(right);
      if (op === "==") return `${l} is ${r}`;
      if (op === "!=") return `${l} not ${r}`;
      if (op === "in") return `${l} is one of ${r}`;
      if (op === "in_set") return `${l} in set ${r}`;
      return `${l} ${op} ${r}`;
    }
    if (e.counter) {
      const c = getCounter(e.counter);
      return c
        ? `${fm.bytes(c.counter.bytes)} / ${fm.pps(c.counter.packets)} pkts`
        : "";
    }
    if (e.payload) {
      const p = e.payload;
      return p.protocol && p.field
        ? `${p.protocol} ${p.field}`
        : `payload ${p.base} +${p.offset}`;
    }
    if (e.meta) return evs({ meta: e.meta });
    if (e.ct) return evs({ ct: e.ct });
    if (e.rt) return evs({ rt: e.rt });
    if (e.limit)
      return `limit ${e.limit.rate}/${e.limit.per || "s"}${e.limit.burst ? ` burst ${e.limit.burst}` : ""}`;
    if (Array.isArray(e.concat)) return e.concat.map(ets).join(" + ");
    if (e.prefix) return `${e.prefix.addr}/${e.prefix.len}`;
    if (e.range) return `${evs(e.range[0])}-${evs(e.range[1])}`;
    if (e.set) return e.set.map(evs).join(", ");
    // actions
    if (e.accept !== undefined) return "Accept packet";
    if (e.drop !== undefined) return "Drop packet";
    if (e.jump) return `Continue in ${e.jump.target}`;
    if (e.goto) return `Goto chain ${e.goto.target}`;
    if (e.return !== undefined) return "Continue in calling chain";
    if (e.continue !== undefined) return "Continue in calling chain";
    if (e.reject)
      return typeof e.reject === "object"
        ? `Reject with ${e.reject.type || "icmp"}`
        : "Reject";
    if (e.snat)
      return `SNAT ${e.snat.addr || ""}${e.snat.port ? ":" + e.snat.port : ""}`;
    if (e.dnat)
      return `DNAT ${e.dnat.addr || ""}${e.dnat.port ? ":" + e.dnat.port : ""}`;
    if (e.masquerade !== undefined) return "Rewrite to egress device address";
    if (e.redirect)
      return `Redirect${e.redirect.port ? ` to :${e.redirect.port}` : ""}`;
    if (e.log) return e.log.prefix ? `Log "${e.log.prefix}"` : "Log";
    if (e.mangle)
      return `Set header field ${evs(e.mangle.key)} to ${evs(e.mangle.value)}`;
    if (e.notrack) return "Do not track";
    if (e.flow) return `Flow ${e.flow.op || ""} @${e.flow.flowtable || ""}`;
    return Object.keys(e)[0] || String(e);
  };

  // Expression value to string
  const evs = (v: any): string => {
    if (v === null || v === undefined) return "";
    if (typeof v === "number") return String(v);
    if (typeof v === "string") return v;
    if (v.prefix) return `${v.prefix.addr}/${v.prefix.len}`;
    if (Array.isArray(v.set)) return `{ ${v.set.map(evs).join(", ")} }`;
    if (Array.isArray(v.range)) return `${evs(v.range[0])}-${evs(v.range[1])}`;
    if (Array.isArray(v.concat)) return v.concat.map(evs).join(" + ");
    if (Array.isArray(v["|"])) return `${evs(v["|"][0])} | ${evs(v["|"][1])}`;
    if (Array.isArray(v["&"])) return `${evs(v["&"][0])} & ${evs(v["&"][1])}`;
    if (v.meta) {
      const m = v.meta;
      const mKey = typeof m === "object" ? m.key : m;
      const tl: Record<string, string> = {
        iifname: "Ingress device name",
        oifname: "Egress device name",
        iif: "Ingress device id",
        oif: "Egress device id",
        l4proto: "IP protocol",
        nfproto: "Address family",
        mark: "Packet mark",
        length: "Packet length",
        protocol: "Ethernet protocol",
        priority: "Priority",
      };
      return tl[mKey] || `meta.${mKey}`;
    }
    if (v.ct) {
      const c = v.ct,
        ck = typeof c === "object" ? c.key : c;
      const tl: Record<string, string> = {
        state: "Conntrack state",
        status: "Conntrack status",
        direction: "Conntrack direction",
        mark: "Conntrack mark",
        helper: "Conntrack helper",
      };
      return tl[ck] || `ct.${ck}`;
    }
    if (v.rt) {
      const rk = typeof v.rt === "object" ? v.rt.key : v.rt;
      return rk === "mtu" ? "Effective route MTU" : `rt.${rk}`;
    }
    if (v.tcp_option) return `TCP ${v.tcp_option.name} ${v.tcp_option.field}`;
    if (v.payload) {
      const p = v.payload;
      const pl: Record<string, string> = {
        th_sport: "TCP source port",
        th_dport: "TCP destination port",
        th_flags: "TCP flags",
        th_ack: "TCP ACK",
        ip_saddr: "Source IP",
        ip_daddr: "Destination IP",
        ip6_saddr: "Source IPv6",
        ip6_daddr: "Destination IPv6",
        ip_protocol: "IP protocol",
        ether_saddr: "Source MAC",
        ether_daddr: "Destination MAC",
        ip_dscp: "IP DSCP",
        ip6_dscp: "IPv6 DSCP",
      };
      if (p.protocol && p.field)
        return pl[`${p.protocol}_${p.field}`] || `${p.protocol}.${p.field}`;
      return `payload ${p.base} +${p.offset}-${p.len}`;
    }
    if (v.vmap) {
      const k = evs(v.vmap.key);
      const keys = (v.vmap.data?.set || v.vmap.data || []).map(([mk]: any) =>
        evs(mk),
      );
      return `Verdict map: ${k} is ${keys.join(" or ")}`;
    }
    return JSON.stringify(v);
  };

  const isAction = (e: any) =>
    [
      "accept",
      "drop",
      "reject",
      "jump",
      "goto",
      "snat",
      "dnat",
      "masquerade",
      "redirect",
      "return",
      "continue",
      "log",
      "flow",
      "notrack",
      "mangle",
    ].some((k) => e && e[k] !== undefined);

  const hookLabel: Record<string, string> = {
    ingress: "Capture incoming packets at network interface",
    prerouting: "Capture incoming packets before any routing decision",
    input: "Capture incoming packets routed to the local system",
    forward: "Capture incoming packets addressed to other hosts",
    output: "Capture outgoing packets originating from the local system",
    postrouting: "Capture outgoing packets after any routing decision",
  };
  const chainLabel: Record<string, string> = {
    filter: "Traffic filter chain",
    nat: "NAT action chain",
    route: "Route action chain",
  };
  const policyLabel: Record<string, string> = {
    drop: "Drop unmatched packets",
    accept: "Continue processing unmatched packets",
  };

  onMount(() => {
    refresh();
    interval = setInterval(refresh, 15000);
  });
  onDestroy(() => clearInterval(interval));
  let hidden = $state<Record<string, boolean>>({});
  const toggle = (k: string) => (hidden = { ...hidden, [k]: !hidden[k] });
</script>

<div class={cn("p-6", "space-y-4", "animate-fade-in")}>
  <div class={cn("flex", "items-center", "justify-between")}>
    <div>
      <h1 class={cn("text-lg", "font-semibold", "text-white")}>Firewall</h1>
      <p class={cn("text-xs", "mt-0.5", "text-muted")}>
        nftables ruleset status
      </p>
    </div>
  </div>
  {#if tables.length === 0}
    <div class={cn("glass", "p-12", "text-center", "animate-slide-up")}>
      <p class={cn("text-sm", "text-muted")}>No nftables ruleset loaded.</p>
    </div>
  {:else}
    {#each tables as t (t.table.family + t.table.name)}
      {@const tf = t.table.family}
      {@const tn = t.table.name}
      <div class={cn("glass", "animate-slide-up")}>
        <button
          class={cn(
            "p-5",
            "flex",
            "gap-2",
            "w-full",
            "text-left",
            "rounded-xl",
            "items-center",
            "cursor-pointer",
            "transition-colors",
            "hover:bg-white/5",
          )}
          onclick={() => toggle(tf + tn)}
        >
          <span class={cn("text-sm", "font-semibold", "text-white")}>
            {fam[tf] || tf} table "{tn}"
          </span>
          <span class={cn("flex-1")}></span>
          <span
            class={cn("text-xs", "font-mono", "transition-transform")}
            style="color:var(--text-muted);transform:rotate({hidden[tf + tn]
              ? 0
              : 90}deg)"
          >
            <ChevronRight size={14} class={cn("text-muted")} />
          </span>
        </button>
        {#if !hidden[tf + tn]}
          <div
            transition:slide|local={{ duration: 200 }}
            class={cn("border-t", "border-border")}
          >
            {#each chains.filter((c: any) => c.chain.family === tf && c.chain.table === tn) as ch}
              {@const c = ch.chain}
              <div class={cn("px-5", "py-4", "border-b border-border")}>
                <h4
                  class={cn("text-sm", "font-semibold", "mb-1", "text-accent")}
                >
                  {chainLabel[c.type] || "Rule container chain"} "{c.name}"
                </h4>
                {#if c.hook}
                  <div class={cn("text-xs", "mb-1", "text-muted")}>
                    Hook: {c.hook} ({hookLabel[c.hook] || ""}){c.prio !==
                    undefined
                      ? `, Priority: ${c.prio}`
                      : ""}
                  </div>
                {/if}
                {#if c.policy}
                  <div
                    class={cn("text-xs", "mb-3")}
                    style="color:{c.policy === 'drop'
                      ? 'var(--danger)'
                      : 'var(--accent)'}"
                  >
                    Policy: {c.policy} ({policyLabel[c.policy] || ""})
                  </div>
                {/if}
                {#if chainRules(tf, tn, c.name).length}
                  <table class={cn("w-full")}>
                    <thead>
                      <tr class={cn("text-muted")}>
                        <th
                          class={cn(
                            "pb-2",
                            "text-xs",
                            "text-left",
                            "font-medium",
                          )}
                          style="width:55%"
                        >
                          Rule matches
                        </th>
                        <th
                          class={cn(
                            "pb-2",
                            "text-xs",
                            "text-left",
                            "font-medium",
                          )}
                          style="width:45%"
                        >
                          Rule actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {#each chainRules(tf, tn, c.name) as r}
                        <tr class={cn("border-t border-border")}>
                          <td
                            class={cn("py-2", "pr-3", "text-xs", "align-top")}
                          >
                            {#if r.rule.comment}
                              <span
                                class={cn(
                                  "mr-1",
                                  "px-1.5",
                                  "py-0.5",
                                  "rounded",
                                  "text-xs",
                                  "text-accent",
                                  "bg-accent/10",
                                )}
                                title={`Rule comment: ${r.rule.comment}`}
                              >
                                #
                              </span>
                            {/if}
                            {#each r.rule.expr || [] as e}
                              {#if !isAction(e) && !e.counter}
                                <span
                                  class={cn(
                                    "mr-1",
                                    "mb-1",
                                    "px-1.5",
                                    "py-0.5",
                                    "border",
                                    "rounded",
                                    "text-xs",
                                    "font-mono",
                                    "inline-block",
                                    "bg-surface-2",
                                    "border-border",
                                    "whitespace-pre-wrap",
                                  )}
                                >
                                  {ets(e) || "(any)"}
                                </span>
                              {/if}
                            {/each}
                            {#each r.rule.expr || [] as e}
                              {#if e.counter && !isAction(e)}
                                {@const ct = getCounter(e.counter)}
                                {#if ct}<span
                                    class={cn(
                                      "mr-1",
                                      "mb-1",
                                      "px-1.5",
                                      "py-0.5",
                                      "border",
                                      "rounded",
                                      "text-xs",
                                      "font-mono",
                                      "inline-block",
                                      "bg-surface-2",
                                      "border-border",
                                    )}
                                    title={`Traffic matched by rule: ${fm.pps(ct.counter.packets)} Packets, ${fm.bytes(ct.counter.bytes)} Bytes`}
                                  >
                                    {fm.bytes(ct.counter.bytes)}
                                  </span>
                                {/if}
                              {/if}
                            {/each}
                            {#if !(r.rule.expr || []).filter((e: any) => !isAction(e)).length}
                              <span class={cn("text-xs", "text-muted")}>
                                Any packet
                              </span>
                            {/if}
                          </td>
                          <td
                            class={cn("py-2", "pr-3", "text-xs", "align-top")}
                          >
                            {#each r.rule.expr || [] as e}
                              {#if e.vmap}
                                {#each e.vmap.data?.set || e.vmap.data || [] as [mk, ma]}
                                  <div class={cn("mb-1")}>
                                    <span
                                      class={cn(
                                        "mr-1",
                                        "px-1.5",
                                        "py-0.5",
                                        "border",
                                        "rounded",
                                        "text-xs",
                                        "font-mono",
                                        "inline-block",
                                        "bg-surface-2",
                                        "border-border",
                                      )}
                                    >
                                      {evs(mk)}:
                                    </span>
                                    <span
                                      class={cn(
                                        "mr-1",
                                        "px-1.5",
                                        "py-0.5",
                                        "rounded",
                                        "text-xs",
                                        "font-mono",
                                        "inline-block",
                                      )}
                                      style="background:{ma.drop !==
                                        undefined || ma.reject !== undefined
                                        ? 'rgba(255,77,79,0.1)'
                                        : ma.accept !== undefined
                                          ? 'rgba(0,212,170,0.1)'
                                          : 'rgba(88,166,255,0.1)'};color:{ma.drop !==
                                        undefined || ma.reject !== undefined
                                        ? 'var(--danger)'
                                        : ma.accept !== undefined
                                          ? 'var(--accent)'
                                          : 'var(--info)'}"
                                    >
                                      {ets(ma)}
                                    </span>
                                  </div>
                                {/each}
                              {:else if isAction(e)}
                                <span
                                  class={cn(
                                    "mr-1",
                                    "mb-1",
                                    "px-1.5",
                                    "py-0.5",
                                    "rounded",
                                    "text-xs",
                                    "font-mono",
                                    "inline-block",
                                  )}
                                  style="background:{e.drop !== undefined ||
                                  e.reject !== undefined
                                    ? 'rgba(255,77,79,0.1)'
                                    : e.accept !== undefined
                                      ? 'rgba(0,212,170,0.1)'
                                      : 'rgba(88,166,255,0.1)'};color:{e.drop !==
                                    undefined || e.reject !== undefined
                                    ? 'var(--danger)'
                                    : e.accept !== undefined
                                      ? 'var(--accent)'
                                      : 'var(--info)'}"
                                >
                                  {ets(e)}
                                </span>
                              {/if}
                            {/each}
                          </td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                {:else}<p class={cn("text-xs", "py-3", "text-muted")}>
                    No rules in this chain
                  </p>{/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  {/if}
</div>
