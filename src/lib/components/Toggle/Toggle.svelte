<script lang="ts">
  // Helpers
  import { cn } from "../../helpers/classname";
  import type { Props } from "./types";

  let {
    label,
    description,
    checked = $bindable(false),
    class: className = "",
    onchange,
  }: Props = $props();
</script>

<div class={cn("flex", "items-center", "gap-2", className)}>
  <input
    bind:checked
    type="checkbox"
    id={"toggle-" + label}
    onchange={() => onchange?.(checked)}
    class={cn(
      "w-3.5",
      "h-3.5",
      "rounded",
      "cursor-pointer",
      "accent-(--accent)",
    )}
  />
  {#if label}
    <label
      for={"toggle-" + label}
      class={cn("text-xs", "text-fg", "cursor-pointer", "select-none")}
    >
      {label}
    </label>
  {/if}
</div>
{#if description}
  <p class={cn("text-[10px]", "text-muted", "mt-1.5")}>
    {description}
  </p>
{/if}
