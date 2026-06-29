<script lang="ts">
  // Helpers
  import { cn } from "../../helpers/classname";

  // Types
  import type { Props } from "./types";

  // Props
  let { tabs = [], active = "", onchange }: Props = $props();
</script>

<div
  class={cn(
    "flex",
    "gap-1",
    "w-fit",
    "p-0.5",
    "border",
    "rounded-lg",
    "bg-surface-2",
    "border-border",
  )}
>
  {#each tabs as t}
    <button
      class={cn(
        "px-3",
        "py-1",
        "text-xs",
        "rounded-md",
        "font-medium",
        "transition-all",
        "cursor-pointer",
        "whitespace-nowrap",
        active === t.id
          ? cn("bg-accent", "text-surface")
          : cn("bg-transparent", "text-muted"),
      )}
      onclick={() => onchange?.(t.id)}
    >
      {t.label}
    </button>
  {/each}
</div>
