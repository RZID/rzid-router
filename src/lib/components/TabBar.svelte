<script lang="ts">
  import { cn } from "../helpers/classname";

  let { tabs = [], active = "", onchange }: {
    tabs: { id: string; label: string }[]; active?: string; onchange?: (id: string) => void;
  } = $props();
</script>

<div class={cn("flex gap-1 rounded-lg p-0.5 w-fit bg-surface-2 border border-border")}>
  {#each tabs as t}
    <button
      class={cn("px-3 py-1 rounded-md text-xs font-medium transition-all",
        active === t.id ? "bg-accent text-surface" : "bg-transparent text-muted")}
      onclick={() => onchange?.(t.id)}
    >{t.label}</button>
  {/each}
</div>
