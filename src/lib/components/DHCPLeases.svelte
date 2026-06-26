<script lang="ts">
  import { cn } from "../helpers/classname";

  interface Lease {
    hostname: string;
    ipaddr: string;
    macaddr: string;
    leasetime: number;
  }
  let { leases = [] } = $props<{ leases?: Lease[] }>();

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600),
      m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };
  const getInitials = (h: string) => h?.slice(0, 2).toUpperCase() || "??";
  const avColors = [
    "text-accent bg-accent/15",
    "text-info bg-info/15",
    "text-warn bg-warn/15",
    "text-purple-400 bg-purple-400/15",
    "text-pink-400 bg-pink-400/15",
  ];
</script>

<div class={cn("glass", "p-5", "animate-slide-up")}>
  <div class={cn("flex", "items-center", "justify-between", "mb-4")}>
    <span
      class={cn(
        "text-xs",
        "uppercase",
        "text-muted",
        "font-medium",
        "tracking-wider",
      )}
    >
      CONNECTED CLIENTS
    </span>
    <span
      class={cn(
        "px-2",
        "py-0.5",
        "text-xs",
        "font-mono",
        "rounded-full",
        "text-accent",
        "bg-accent/10",
      )}>{leases.length}</span
    >
  </div>
  {#if leases.length === 0}
    <p class={cn("text-sm", "text-center", "py-6", "text-muted")}>
      No active leases
    </p>
  {:else}
    <div class={cn("space-y-2", "max-h-64", "overflow-y-auto")}>
      {#each leases as lease, i (lease.macaddr)}
        <div
          class={cn(
            "p-3",
            "flex",
            "gap-3",
            "rounded-lg",
            "items-center",
            "duration-150",
            "transition-colors",
            "hover:bg-white/5",
          )}
        >
          <div
            class={cn(
              "w-8",
              "h-8",
              "flex",
              "text-xs",
              "shrink-0",
              "rounded-lg",
              "items-center",
              "font-semibold",
              "justify-center",
              avColors[i % avColors.length],
            )}
          >
            {getInitials(lease.hostname)}
          </div>
          <div class={cn("flex-1", "min-w-0")}>
            <p class={cn("text-sm", "font-medium", "truncate")}>
              {lease.hostname || "Unknown"}
            </p>
            <p class={cn("text-xs", "font-mono", "text-muted")}>
              {lease.macaddr}
            </p>
          </div>
          <div class={cn("text-right", "shrink-0")}>
            <p class={cn("text-sm", "font-mono", "text-accent")}>
              {lease.ipaddr}
            </p>
            <p class={cn("text-xs", "text-muted")}>
              {formatTime(lease.leasetime)}
            </p>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
