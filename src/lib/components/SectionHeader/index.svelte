<script lang="ts">
  import type { Snippet } from "svelte";
  import { ChevronRight } from "@lucide/svelte";
  import { cn } from "../../helpers/classname";

  let {
    title,
    open = true,
    ontoggle,
    badge,
    children,
  }: {
    title: string;
    open?: boolean;
    ontoggle?: () => void;
    badge?: string;
    children?: Snippet;
  } = $props();
</script>

<button
  class={cn(
    "p-5",
    "flex",
    "gap-2",
    "w-full",
    "text-left",
    "rounded-xl",
    "items-center",
    "cursor-pointer",
    "transition-colors",
    "hover:bg-white/5",
  )}
  onclick={() => ontoggle?.()}
>
  <span
    class={cn(
      "text-xs",
      "uppercase",
      "text-muted",
      "font-medium",
      "tracking-wider",
    )}
  >
    {title}
  </span>
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
  <span class={cn("flex-1")}></span>
  <span
    class={cn("transition-transform")}
    style="transform:rotate({open ? 90 : 0}deg)"
  >
    <ChevronRight size={14} class={cn("text-muted")} />
  </span>
</button>

{#if open && children}
  {@render children()}
{/if}
