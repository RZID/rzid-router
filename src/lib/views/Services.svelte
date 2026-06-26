<script lang="ts">
  import { serviceRestart } from "../api/ubus";
  import { cn } from "../helpers/classname";

  const services = [
    { name: "dnsmasq", label: "DNS / DHCP", desc: "dnsmasq" },
    { name: "adguardhome", label: "AdGuard Home", desc: "DNS filtering" },
    { name: "firewall", label: "Firewall", desc: "nftables/fw4" },
    { name: "sqm", label: "SQM QoS", desc: "Bufferbloat control" },
    { name: "banip", label: "banIP", desc: "IP threat blocking" },
    { name: "miniupnpd", label: "UPnP", desc: "Port mapping" },
    { name: "vnstat2", label: "vnStat", desc: "Bandwidth tracking" },
    { name: "collectd", label: "Collectd", desc: "Statistics" },
  ];

  let restarting = $state<Record<string, boolean>>({});
  let feedback = $state<Record<string, string>>({});

  const restart = async (name: string) => {
    restarting = { ...restarting, [name]: true }; feedback = { ...feedback, [name]: "" };
    const ok = await serviceRestart(name);
    restarting = { ...restarting, [name]: false };
    feedback = { ...feedback, [name]: ok !== null ? "Restarted" : "Failed" };
    setTimeout(() => { feedback = { ...feedback, [name]: "" }; }, 3000);
  };
</script>

<div class="p-6 space-y-6 animate-fade-in">
  <div>
    <h1 class="text-lg font-semibold text-white">Services</h1>
    <p class="text-sm mt-0.5 text-muted">Manage running services</p>
  </div>
  <div class="space-y-2">
    {#each services as svc}
      <div class="p-4 flex glass items-center justify-between animate-slide-up">
        <div class="flex items-center gap-3">
          <div class="w-2 h-2 rounded-full animate-pulse bg-accent"></div>
          <div>
            <p class="text-sm font-medium text-white">{svc.label}</p>
            <p class="text-xs font-mono text-muted">{svc.desc}</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          {#if restarting[svc.name]}
            <span class="text-xs font-mono text-muted">Restarting…</span>
          {/if}
          {#if feedback[svc.name]}
            <span class={cn("text-xs font-mono", feedback[svc.name] === "Restarted" ? "text-accent" : "text-danger")}>{feedback[svc.name]}</span>
          {/if}
          <button onclick={() => restart(svc.name)} disabled={restarting[svc.name]}
            class={cn("px-3 py-1.5 text-xs rounded-lg font-medium duration-150 transition-all",
              restarting[svc.name]
                ? "bg-surface-3 text-muted border border-transparent"
                : "bg-accent/10 text-accent border border-accent/20")}
          >
            {restarting[svc.name] ? "Restarting…" : "Restart"}
          </button>
        </div>
      </div>
    {/each}
  </div>
</div>
