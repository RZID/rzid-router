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
    restarting = { ...restarting, [name]: true };
    feedback = { ...feedback, [name]: "" };
    const ok = await serviceRestart(name);
    restarting = { ...restarting, [name]: false };
    feedback = { ...feedback, [name]: ok !== null ? "Restarted" : "Failed" };
    setTimeout(() => {
      feedback = { ...feedback, [name]: "" };
    }, 3000);
  };
</script>

<div class={cn("p-6", "space-y-6", "animate-fade-in")}>
  <div>
    <h1 class={cn("text-lg", "font-semibold", "text-white")}>Services</h1>
    <p class={cn("text-sm", "mt-0.5", "text-muted")}>Manage running services</p>
  </div>
  <div class={cn("space-y-2")}>
    {#each services as svc}
      <div
        class={cn(
          "p-4",
          "flex",
          "glass",
          "items-center",
          "justify-between",
          "animate-slide-up",
        )}
      >
        <div class={cn("flex", "items-center", "gap-3")}>
          <div
            class={cn(
              "w-2",
              "h-2",
              "bg-accent",
              "rounded-full",
              "animate-pulse",
            )}
          ></div>
          <div>
            <p class={cn("text-sm", "font-medium", "text-white")}>
              {svc.label}
            </p>
            <p class={cn("text-xs", "font-mono", "text-muted")}>{svc.desc}</p>
          </div>
        </div>
        <div class={cn("flex", "items-center", "gap-3")}>
          {#if restarting[svc.name]}
            <span class={cn("text-xs", "font-mono", "text-muted")}>
              Restarting…
            </span>
          {/if}
          {#if feedback[svc.name]}
            <span
              class={cn(
                "text-xs",
                "font-mono",
                feedback[svc.name] === "Restarted"
                  ? "text-accent"
                  : "text-danger",
              )}>{feedback[svc.name]}</span
            >
          {/if}
          <button
            onclick={() => restart(svc.name)}
            disabled={restarting[svc.name]}
            class={cn(
              "px-3",
              "py-1.5",
              "text-xs",
              "rounded-lg",
              "font-medium",
              "duration-150",
              "transition-all",
              restarting[svc.name]
                ? cn(
                    "border",
                    "text-muted",
                    "bg-surface-3",
                    "border-transparent",
                  )
                : cn(
                    "border",
                    "text-accent",
                    "bg-accent/10",
                    "border-accent/20",
                  ),
            )}
          >
            {restarting[svc.name] ? "Restarting…" : "Restart"}
          </button>
        </div>
      </div>
    {/each}
  </div>
</div>
