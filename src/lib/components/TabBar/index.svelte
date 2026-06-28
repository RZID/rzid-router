<script lang="ts">
  import { cn } from "../../helpers/classname";

  let {
    tabs = [],
    active = "",
    onchange,
  }: {
    tabs: { id: string; label: string }[];
    active?: string;
    onchange?: (id: string) => void;
  } = $props();
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
        active === t.id
          ? cn("bg-accent", "text-surface")
          : cn("bg-transparent", "text-muted"),
      )}
      onclick={() => onchange?.(t.id)}>{t.label}</button
    >
  {/each}
</div>
