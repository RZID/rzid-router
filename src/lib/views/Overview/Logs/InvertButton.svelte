<script lang="ts">
  import { cn } from "../../../helpers/classname";

  let {
    active,
    onclick,
    label,
  }: {
    active: boolean;
    onclick: () => void;
    label: string;
  } = $props();
</script>

<button
  type="button"
  class={cn(
    "px-2",
    "py-1.5",
    "shrink-0",
    "uppercase",
    "rounded-md",
    "text-[10px]",
    "font-semibold",
    "tracking-wide",
    "transition-all",
    "cursor-pointer",
  )}
  style="background:{active
    ? 'rgba(255,77,79,0.15)'
    : 'var(--surface)'};color:{active
    ? 'var(--danger)'
    : 'var(--text-muted)'};border:1px solid {active
    ? 'rgba(255,77,79,0.3)'
    : 'var(--border)'}"
  {onclick}
>
  {label}
</button>
