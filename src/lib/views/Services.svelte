<script lang="ts">
  import { serviceRestart } from "../api/ubus";
  import { cn } from "../helpers/classname";
  import { t as _t, getLocale, onLocaleChange } from "../i18n";

  let locale = $state(getLocale());
  let trans = $derived.by(() => { locale; return (k: string) => _t(k); });
  $effect(() => onLocaleChange(() => { locale = getLocale(); }));

  let services = $derived([
    { name: "dnsmasq", label: trans("DNS / DHCP"), desc: trans("dnsmasq") },
    { name: "adguardhome", label: trans("AdGuard Home"), desc: trans("DNS filtering") },
    { name: "firewall", label: trans("Firewall"), desc: trans("nftables/fw4") },
    { name: "sqm", label: trans("SQM QoS"), desc: trans("Bufferbloat control") },
    { name: "banip", label: trans("banIP"), desc: trans("IP threat blocking") },
    { name: "miniupnpd", label: trans("UPnP"), desc: trans("Port mapping") },
    { name: "vnstat2", label: trans("vnStat"), desc: trans("Bandwidth tracking") },
    { name: "collectd", label: trans("Collectd"), desc: trans("Statistics") },
  ]);

  let restarting = $state<Record<string, boolean>>({});
  let feedback = $state<Record<string, string>>({});

  const restart = async (name: string) => {
    restarting = { ...restarting, [name]: true };
    feedback = { ...feedback, [name]: "" };
    const ok = await serviceRestart(name);
    restarting = { ...restarting, [name]: false };
    feedback = { ...feedback, [name]: ok !== null ? "restarted" : "failed" };
    setTimeout(() => { feedback = { ...feedback, [name]: "" }; }, 3000);
  };
</script>

<div class={cn("p-6", "space-y-6", "animate-fade-in")}>
  <div>
    <h1 class={cn("text-lg", "font-semibold", "text-white")}>{trans("Services")}</h1>
    <p class={cn("text-sm", "mt-0.5", "text-muted")}>{trans("Manage running services")}</p>
  </div>
  <div class={cn("space-y-2")}>
    {#each services as svc}
      <div class={cn("p-4", "flex", "glass", "animate-slide-up", "items-center", "justify-between")}>
        <div class={cn("flex", "items-center", "gap-3")}>
          <div class={cn("w-2", "h-2", "bg-accent", "rounded-full", "animate-pulse")}></div>
          <div>
            <p class={cn("text-sm", "font-medium", "text-white")}>{svc.label}</p>
            <p class={cn("text-xs", "font-mono", "text-muted")}>{svc.desc}</p>
          </div>
        </div>
        <div class={cn("flex", "items-center", "gap-3")}>
          {#if restarting[svc.name]}
            <span class={cn("text-xs", "font-mono", "text-muted")}>{trans("Restarting...")}</span>
          {/if}
          {#if feedback[svc.name]}
            <span class={cn("text-xs", "font-mono", feedback[svc.name] === "restarted" ? "text-accent" : "text-danger")}>
              {trans(feedback[svc.name] === "restarted" ? "Restarted" : "Failed")}
            </span>
          {/if}
          <button
            onclick={() => restart(svc.name)}
            disabled={restarting[svc.name]}
            class={cn("px-3", "py-1.5", "text-xs", "rounded-lg", "font-medium", "duration-150", "transition-all", restarting[svc.name]
              ? cn("border", "text-muted", "bg-surface-3", "border-transparent")
              : cn("border", "text-accent", "bg-accent/10", "border-accent/20"),
            )}
          >
            {restarting[svc.name] ? trans("Restarting...") : trans("Restart")}
          </button>
        </div>
      </div>
    {/each}
  </div>
</div>
