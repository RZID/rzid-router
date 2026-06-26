<script lang="ts">
  import { logout } from "../api/ubus";
  import { cn } from "../helpers/classname";
  import {
    LayoutDashboard,
    Settings,
    Network,
    Layers,
    LogOut,
    ChevronRight,
    Router,
  } from "@lucide/svelte";

  let {
    active = "dashboard",
    onnavigate,
    onlogout,
  } = $props<{
    active?: string;
    onnavigate?: (id: string) => void;
    onlogout?: () => void;
  }>();

  const nav: {
    label: string;
    icon: typeof LayoutDashboard;
    children: { id: string; label: string }[];
  }[] = [
    {
      label: "Status",
      icon: LayoutDashboard,
      children: [
        { id: "dashboard", label: "Overview" },
        { id: "routes", label: "Routing" },
        { id: "firewall-status", label: "Firewall" },
        { id: "syslog", label: "System Log" },
        { id: "processes", label: "Processes" },
        { id: "realtime", label: "Realtime Graphs" },
      ],
    },
    {
      label: "System",
      icon: Settings,
      children: [
        { id: "system", label: "System" },
        { id: "admin", label: "Administration" },
        { id: "software", label: "Software" },
        { id: "startup", label: "Startup" },
        { id: "crontab", label: "Scheduled Tasks" },
        { id: "flash", label: "Backup / Flash" },
      ],
    },
    {
      label: "Network",
      icon: Network,
      children: [
        { id: "network", label: "Interfaces" },
        { id: "network-routes", label: "Routing" },
        { id: "dhcp", label: "DHCP" },
        { id: "dns", label: "DNS" },
        { id: "diagnostics", label: "Diagnostics" },
      ],
    },
    {
      label: "Services",
      icon: Layers,
      children: [
        { id: "services", label: "Services" },
        { id: "ddns", label: "Dynamic DNS" },
        { id: "adguard", label: "AdGuard Home" },
        { id: "banip", label: "banIP" },
        { id: "upnp", label: "UPnP" },
      ],
    },
  ];

  let expanded = $state<Record<string, boolean>>({ Status: true });
  const handleLogout = () => {
    logout();
    onlogout?.();
  };
</script>

<aside
  class={cn(
    "flex",
    "w-56",
    "border-r",
    "flex-col",
    "h-screen",
    "shrink-0",
    "bg-surface-1",
    "border-border",
  )}
>
  <div class={cn("p-5", "border-b", "border-border")}>
    <div class={cn("flex", "items-center", "gap-3")}>
      <div
        class={cn(
          "w-8",
          "h-8",
          "flex",
          "border",
          "rounded-lg",
          "items-center",
          "bg-accent/10",
          "justify-center",
          "border-accent/20",
        )}
      >
        <Router size={16} class={cn("text-accent")} />
      </div>
      <div>
        <p class={cn("text-sm", "font-semibold", "text-white", "leading-none")}>
          RZID
        </p>
        <p class={cn("text-xs", "mt-0.5", "text-muted")}>OpenWrt 25.12</p>
      </div>
    </div>
  </div>

  <nav class={cn("flex-1", "p-3", "space-y-1", "overflow-y-auto")}>
    {#each nav as cat}
      <div>
        <button
          class={cn(
            "flex",
            "px-3",
            "py-2",
            "gap-2",
            "w-full",
            "text-xs",
            "text-left",
            "uppercase",
            "rounded-lg",
            "font-medium",
            "duration-150",
            "items-center",
            "cursor-pointer",
            "tracking-wider",
            "transition-colors",
            "hover:bg-white/5",
            "text-muted",
          )}
          onclick={() =>
            (expanded = { ...expanded, [cat.label]: !expanded[cat.label] })}
        >
          <cat.icon size={14} />
          <span class={cn("flex-1")}>{cat.label}</span>
          <span
            class={cn("transition-transform")}
            style="transform:rotate({expanded[cat.label] ? 90 : 0}deg)"
          >
            <ChevronRight size={12} class={cn("text-muted")} />
          </span>
        </button>
        {#if expanded[cat.label]}
          <div class={cn("ml-4 mt-0.5 space-y-0.5")}>
            {#each cat.children as item}
              <button
                class={cn(
                  "px-3",
                  "py-2",
                  "flex",
                  "gap-2",
                  "w-full",
                  "text-sm",
                  "text-left",
                  "rounded-lg",
                  "items-center",
                  "duration-150",
                  "transition-all",
                  "cursor-pointer",
                  "hover:bg-white/5",
                  active === item.id
                    ? cn("bg-accent/10 text-accent border border-accent/20")
                    : cn(
                        "bg-transparent text-muted border border-transparent hover:text-fg",
                      ),
                )}
                onclick={() => onnavigate?.(item.id)}
              >
                <span class={cn("font-medium", "text-xs")}>{item.label}</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </nav>

  <div class={cn("p-3 border-t border-border")}>
    <button
      class={cn(
        "flex",
        "px-3",
        "gap-3",
        "w-full",
        "py-2.5",
        "text-sm",
        "rounded-lg",
        "duration-150",
        "items-center",
        "cursor-pointer",
        "transition-colors",
        "hover:bg-white/5",
        "text-muted",
        "hover:text-danger",
      )}
      onclick={handleLogout}
    >
      <LogOut size={14} />
      <span class={cn("font-medium")}>Sign out</span>
    </button>
  </div>
</aside>
