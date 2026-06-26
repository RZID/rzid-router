<script lang="ts">
  interface Lease {
    hostname: string;
    ipaddr: string;
    macaddr: string;
    leasetime: number;
  }

  let { leases = [] } = $props<{ leases?: Lease[] }>();

  const formatTime = (secs: number): string => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const getInitials = (hostname: string): string => {
    return hostname?.slice(0, 2).toUpperCase() || "??";
  };

  const colors = ["#00d4aa", "#58a6ff", "#f0883e", "#bc8cff", "#ff6b9d"];
</script>

<div class="glass p-5 animate-slide-up">
  <div class="flex items-center justify-between mb-4">
    <span class="text-xs font-medium tracking-wider uppercase" style="color: var(--text-muted)">CONNECTED CLIENTS</span>
    <span class="text-xs font-mono px-2 py-0.5 rounded-full" style="background: rgba(0,212,170,0.1); color: var(--accent)">{leases.length}</span>
  </div>

  {#if leases.length === 0}
    <p class="text-sm text-center py-6" style="color: var(--text-muted)">No active leases</p>
  {:else}
    <div class="space-y-2 max-h-64 overflow-y-auto">
      {#each leases as lease, i (lease.macaddr)}
        <div class="flex items-center gap-3 p-3 rounded-lg transition-colors duration-150 hover:bg-white/5">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0" style="background: {colors[i % colors.length]}22; color: {colors[i % colors.length]}">
            {getInitials(lease.hostname)}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">{lease.hostname || "Unknown"}</p>
            <p class="text-xs font-mono" style="color: var(--text-muted)">{lease.macaddr}</p>
          </div>
          <div class="text-right shrink-0">
            <p class="text-sm font-mono" style="color: var(--accent)">{lease.ipaddr}</p>
            <p class="text-xs" style="color: var(--text-muted)">{formatTime(lease.leasetime)}</p>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
