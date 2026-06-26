<script lang="ts">
  import { logout } from "../../api/ubus";
  import { cn } from "../../helpers/classname";
  import { LogOut, ChevronRight, Router } from "@lucide/svelte";
  import { nav } from "./constants";
  import { t as _t, getLocale, onLocaleChange } from "../../i18n";

  let {
    active = "dashboard",
    onnavigate,
    onlogout,
  } = $props<{
    active?: string;
    onnavigate?: (id: string) => void;
    onlogout?: () => void;
  }>();

  let locale = $state(getLocale());
  let trans = $derived.by(() => { locale; return (k: string) => _t(k); });
  $effect(() => onLocaleChange(() => { locale = getLocale(); }));
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
          {trans("RZID")}
        </p>
        <p class={cn("text-xs", "mt-0.5", "text-muted")}>{trans("OpenWrt 25.12")}</p>
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
            "text-muted",
            "rounded-lg",
            "font-medium",
            "duration-150",
            "items-center",
            "cursor-pointer",
            "tracking-wider",
            "transition-colors",
            "hover:bg-white/5",
          )}
          onclick={() =>
            (expanded = { ...expanded, [cat.label]: !expanded[cat.label] })}
        >
          <cat.icon size={14} />
          <span class={cn("flex-1")}>{trans(cat.label)}</span>
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
                    ? cn(
                        "border",
                        "text-accent",
                        "bg-accent/10",
                        "border-accent/20",
                      )
                    : cn(
                        "border",
                        "text-muted",
                        "hover:text-fg",
                        "bg-transparent",
                        "border-transparent",
                      ),
                )}
                onclick={() => onnavigate?.(item.id)}
              >
                <span class={cn("font-medium", "text-xs")}>{trans(item.label)}</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </nav>

  <div class={cn("p-3", "border-t", "border-border")}>
    <button
      class={cn(
        "flex",
        "px-3",
        "gap-3",
        "w-full",
        "py-2.5",
        "text-sm",
        "rounded-lg",
        "text-muted",
        "duration-150",
        "items-center",
        "cursor-pointer",
        "transition-colors",
        "hover:bg-white/5",
        "hover:text-danger",
      )}
      onclick={handleLogout}
    >
      <LogOut size={14} />
      <span class={cn("font-medium")}>{trans("Sign out")}</span>
    </button>
  </div>
</aside>
