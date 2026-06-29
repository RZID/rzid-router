<script lang="ts">
  import { ChevronRight } from "@lucide/svelte";
  import { slide } from "svelte/transition";
  import { cn } from "../../../helpers/classname";

  let {
    icon: Icon,
    title,
    badge,
    children,
  }: {
    icon: any;
    title: string;
    badge?: string;
    children: any;
  } = $props();

  let open = $state(true);
</script>

<div class={cn("glass", "animate-slide-up")}>
  <button
    class={cn(
      "w-full",
      "flex",
      "items-center",
      "gap-2",
      "text-left",
      "p-5",
      "rounded-lg",
      "hover:bg-white/5",
      "transition-colors",
      "cursor-pointer",
    )}
    onclick={() => (open = !open)}
  >
    <div
      class={cn(
        "flex",
        "text-xs",
        "gap-x-2",
        "flex-row",
        "uppercase",
        "text-muted",
        "font-medium",
        "items-center",
        "tracking-wider",
      )}
    >
      <Icon size={16} class={cn("text-muted")} />
      <p>{title}</p>
    </div>
    <span class={cn("flex-1")}></span>
    {#if badge}
      <span
        class={cn(
          "px-2",
          "py-0.5",
          "text-xs",
          "font-mono",
          "rounded-full",
          "text-accent",
          "bg-accent/10",
        )}
      >
        {badge}
      </span>
    {/if}
    <span
      class={cn("text-xs", "font-mono", "transition-transform", "ml-2")}
      style="color: var(--text-muted); transform: rotate({open ? 90 : 0}deg)"
    >
      <ChevronRight size={16} class={cn("text-muted")} />
    </span>
  </button>
  {#if open}
    <div
      transition:slide|local={{ duration: 200 }}
      class={cn("px-5", "pb-5", "border-t", "border-border", "pt-4")}
    >
      {@render children()}
    </div>
  {/if}
</div>
