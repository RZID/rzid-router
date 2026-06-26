<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { batchCall } from "../api/ubus";

  let ip4neigh = $state<any[]>([]), ip4routes = $state<any[]>([]), ip4rules = $state<any[]>([]);
  let ip6neigh = $state<any[]>([]), ip6routes = $state<any[]>([]), ip6rules = $state<any[]>([]);
  let networks = $state<any[]>([]);
  let tab = $state<"ipv4"|"ipv6">("ipv4");
  let interval: ReturnType<typeof setInterval>;

  const exec = (cmd: string, args: string[]) => ({ object: "file", method: "exec", params: { command: cmd, params: args } });
  const p = (r: any) => { try { return JSON.parse(r?.stdout||"[]"); } catch { return []; } };
  const netName = (dev: string, addr?: string) => {
    if (!addr) return networks.find((n:any)=>n.l3_device===dev||n.device===dev)?.interface||`(${dev})`;
    const parts = addr.split(".").map(Number);
    const ipNum = (parts[0]<<24)|(parts[1]<<16)|(parts[2]<<8)|parts[3];
    let best = -1, name = "";
    for (const n of networks) {
      if (n.l3_device !== dev && n.device !== dev) continue;
      for (const a of n["ipv4-address"]||[]) {
        if (!a?.address || a.mask===undefined) continue;
        const m = typeof a.mask==="number"?a.mask:parseInt(String(a.mask));
        const ap = a.address.split(".").map(Number);
        const net = (ap[0]<<24)|(ap[1]<<16)|(ap[2]<<8)|ap[3];
        const maskBits = m;
        const mask = ~((1<<(32-maskBits))-1);
        if ((ipNum&mask)===(net&mask) && maskBits>best) { best=maskBits; name=n.interface; }
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
    ip4neigh = p(r[1]).filter((n:any)=>!n.state?.includes("FAILED"));
    ip4routes = p(r[2]).filter((rt:any)=>rt.dst!=="fe80::/64"&&rt.dst!=="ff00::/8");
    ip4rules = p(r[3]);
    ip6neigh = p(r[4]).filter((n:any)=>!n.state?.includes("FAILED")&&!n.dst?.startsWith("fe8"));
    ip6routes = p(r[5]).filter((rt:any)=>rt.dst!=="fe80::/64"&&rt.dst!=="ff00::/8");
    ip6rules = p(r[6]);
  };

  const n = () => tab==="ipv4"?ip4neigh:ip6neigh;
  const rts = () => tab==="ipv4"?ip4routes:ip6routes;
  const rls = () => tab==="ipv4"?ip4rules:ip6rules;
  const v6 = () => tab==="ipv6";

  onMount(() => { refresh(); interval = setInterval(refresh, 10000); });
  onDestroy(() => clearInterval(interval));

  const th = "text-xs font-medium pb-2 pr-3 text-left whitespace-nowrap";
  const td = "py-1.5 pr-3 text-xs font-mono whitespace-nowrap";
</script>

<div class="p-6 animate-fade-in">
  <h1 class="text-lg font-semibold text-white">Routing</h1>
  <p class="text-sm mt-0.5 mb-4" style="color:var(--text-muted)">The following rules are currently active on this system.</p>

  <div class="flex gap-1 rounded-lg p-0.5 mb-4 w-fit" style="background:var(--surface-2);border:1px solid var(--border)">
    <button class="px-3 py-1 rounded-md text-xs font-medium transition-all" style="background:{tab==='ipv4'?'var(--accent)':'transparent'};color:{tab==='ipv4'?'#0d1117':'var(--text-muted)'}" onclick={()=>tab='ipv4'}>IPv4 Routing</button>
    <button class="px-3 py-1 rounded-md text-xs font-medium transition-all" style="background:{tab==='ipv6'?'var(--accent)':'transparent'};color:{tab==='ipv6'?'#0d1117':'var(--text-muted)'}" onclick={()=>tab='ipv6'}>IPv6 Routing</button>
  </div>

  <div class="space-y-6">
    <!-- Neighbours -->
    <div class="glass p-5">
      <h3 class="text-sm font-semibold text-white mb-3">{tab==="ipv4"?"IPv4":"IPv6"} Neighbours</h3>
      {#if n().length}
        <div class="overflow-x-auto">
          <table class="w-full"><thead><tr style="color:var(--text-muted)">
            <th class={th}>Entry</th><th class={th}>IP address</th><th class={th}>MAC address</th><th class={th}>Interface</th>
          </tr></thead>
          <tbody>
            {#each n() as nb}
              <tr style="border-top:1px solid var(--border)">
                <td class={td} title={JSON.stringify(nb)}>#</td>
                <td class={td} style="color:var(--accent)">{nb.dst}</td>
                <td class={td}>{nb.lladdr?.toUpperCase()||"—"}</td>
                <td class={td} style="color:var(--text-muted)">{netName(nb.dev, v6()?undefined:nb.dst)}</td>
              </tr>
            {/each}
          </tbody></table>
        </div>
      {:else}<p class="text-xs text-center py-4" style="color:var(--text-muted)">No entries available</p>{/if}
    </div>

    <!-- Routes -->
    <div class="glass p-5">
      <h3 class="text-sm font-semibold text-white mb-3">Active {tab==="ipv4"?"IPv4":"IPv6"} Routes</h3>
      {#if rts().length}
        <div class="overflow-x-auto">
          <table class="w-full"><thead><tr style="color:var(--text-muted)">
            <th class={th}>Device</th><th class={th}>Target</th><th class={th}>Gateway</th><th class={th}>Source</th><th class={th}>Metric</th><th class={th}>Table</th><th class={th}>Protocol</th>
          </tr></thead>
          <tbody>
            {#each rts() as rt}
              <tr style="border-top:1px solid var(--border)">
                <td class={td}><span class="px-1.5 py-0.5 rounded text-xs" style="background:rgba(0,212,170,0.1);color:var(--accent)">{netName(rt.dev, v6()?undefined:(rt.gateway||rt.dst))}</span></td>
                <td class={td}>{rt.dst||"—"}</td>
                <td class={td}>{rt.gateway||"—"}</td>
                <td class={td}>{rt.prefsrc||rt.from||"—"}</td>
                <td class={td}>{rt.metric??"—"}</td>
                <td class={td} style="color:var(--text-muted)">{rt.table||"main"}</td>
                <td class={td}>{rt.protocol||"—"}</td>
              </tr>
            {/each}
          </tbody></table>
        </div>
      {:else}<p class="text-xs text-center py-4" style="color:var(--text-muted)">No entries available</p>{/if}
    </div>

    <!-- Rules -->
    <div class="glass p-5">
      <h3 class="text-sm font-semibold text-white mb-3">Active {tab==="ipv4"?"IPv4":"IPv6"} Rules</h3>
      {#if rls().length}
        <div class="overflow-x-auto">
          <table class="w-full"><thead><tr style="color:var(--text-muted)">
            <th class={th}>Rule</th><th class={th}>Priority</th><th class={th}>Ingress</th><th class={th}>Source</th><th class={th}>Src Port</th><th class={th}>Action</th><th class={th}>IP Proto</th><th class={th}>Egress</th><th class={th}>Destination</th><th class={th}>Dest Port</th><th class={th}>Table</th>
          </tr></thead>
          <tbody>
            {#each rls() as rl}
              <tr style="border-top:1px solid var(--border)">
                <td class={td}>
                  <span title={JSON.stringify(rl)}>{[rl.not&&"Not",rl.noop&&"No-op",rl.l3mdev&&"L3Mdev",rl.fwmark&&`Fwmark: ${rl.fwmark}`,rl.from&&`From: ${rl.from}${rl.srclen?`/${rl.srclen}`:""}`,rl.to&&`To: ${rl.to}${rl.dstlen?`/${rl.dstlen}`:""}`,rl.tos&&`ToS: ${rl.tos}`,rl.dscp&&`DSCP: ${rl.dscp}`,rl.uidrange&&`UID-range: ${rl.uidrange}`,rl.goto&&`goto: ${rl.goto}`,rl.nat&&"NAT"].filter(Boolean).join(" ")||"#"}</span>
                </td>
                <td class={td}>{rl.priority??"—"}</td>
                <td class={td}><span class="px-1.5 py-0.5 rounded text-xs" style="background:rgba(88,166,255,0.1);color:var(--info)">{rl.iif||"—"}</span></td>
                <td class={td}>{rl.src?`${rl.src}${rl.srclen?`/${rl.srclen}`:""}`:"any"}</td>
                <td class={td}>{rl.sport??"—"}</td>
                <td class={td}>{rl.action??"—"}</td>
                <td class={td}>{rl.ipproto||"—"}</td>
                <td class={td}><span class="px-1.5 py-0.5 rounded text-xs" style="background:rgba(88,166,255,0.1);color:var(--info)">{rl.oif||"—"}</span></td>
                <td class={td}>{rl.dst?`${rl.dst}${rl.dstlen?`/${rl.dstlen}`:""}`:"any"}</td>
                <td class={td}>{rl.dport??"—"}</td>
                <td class={td} style="color:var(--text-muted)">{rl.table??"—"}</td>
              </tr>
            {/each}
          </tbody></table>
        </div>
      {:else}<p class="text-xs text-center py-4" style="color:var(--text-muted)">No entries available</p>{/if}
    </div>
  </div>
</div>
