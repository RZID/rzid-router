<script lang="ts">
  import { cn } from "../helpers/classname";

  let { tabs = [], active = "", onchange }: {
    tabs: { id: string; label: string }[];
    active?: string;
    onchange?: (id: string) => void;
  } = $props();
</script>

<div class={cn("flex gap-1 rounded-lg p-0.5 w-fit")} style="background:var(--surface-2);border:1px solid var(--border)">
  {#each tabs as t}
    <button
      class={cn("px-3 py-1 rounded-md text-xs font-medium transition-all")}
      style="background:{active === t.id ? 'var(--accent)' : 'transparent'};color:{active === t.id ? '#0d1117' : 'var(--text-muted)'}"
      onclick={() => onchange?.(t.id)}
    >{t.label}</button>
  {/each}
</div>
