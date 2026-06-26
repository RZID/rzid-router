<script lang="ts">
  import { cn } from "../helpers/classname";

  interface Lease { hostname: string; ipaddr: string; macaddr: string; leasetime: number; }
  let { leases = [] } = $props<{ leases?: Lease[] }>();

  const formatTime = (s: number) => { const h = Math.floor(s/3600), m = Math.floor((s%3600)/60); return h>0?`${h}h ${m}m`:`${m}m`; };
  const getInitials = (h: string) => h?.slice(0,2).toUpperCase() || "??";
  const avColors = ["text-accent bg-accent/15", "text-info bg-info/15", "text-warn bg-warn/15", "text-purple-400 bg-purple-400/15", "text-pink-400 bg-pink-400/15"];
</script>

<div class={cn("glass p-5 animate-slide-up")}>
  <div class="flex items-center justify-between mb-4">
    <span class="text-xs font-medium tracking-wider uppercase text-muted">CONNECTED CLIENTS</span>
    <span class="text-xs font-mono px-2 py-0.5 rounded-full bg-accent/10 text-accent">{leases.length}</span>
  </div>
  {#if leases.length === 0}
    <p class="text-sm text-center py-6 text-muted">No active leases</p>
  {:else}
    <div class="space-y-2 max-h-64 overflow-y-auto">
      {#each leases as lease, i (lease.macaddr)}
        <div class="p-3 flex gap-3 rounded-lg items-center duration-150 transition-colors hover:bg-white/5">
          <div class={cn("w-8 h-8 flex text-xs shrink-0 rounded-lg items-center font-semibold justify-center", avColors[i % avColors.length])}>
            {getInitials(lease.hostname)}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">{lease.hostname || "Unknown"}</p>
            <p class="text-xs font-mono text-muted">{lease.macaddr}</p>
          </div>
          <div class="text-right shrink-0">
            <p class="text-sm font-mono text-accent">{lease.ipaddr}</p>
            <p class="text-xs text-muted">{formatTime(lease.leasetime)}</p>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
