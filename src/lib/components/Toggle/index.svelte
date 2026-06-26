<script lang="ts">
  import { cn } from "../../helpers/classname";

  let {
    label,
    description,
    checked = $bindable(false),
    class: className = "",
  }: { label?: string; description?: string; checked: boolean; class?: string } = $props();
</script>

<div class={cn("flex", "items-center", "gap-2", className)}>
  <input
    type="checkbox"
    id={"toggle-" + label}
    bind:checked
    class={cn(
      "accent-(--accent)",
      "w-3.5",
      "h-3.5",
      "rounded",
      "cursor-pointer",
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
  <p class={cn("text-[10px]", "text-muted", "mt-1.5")}>{description}</p>
{/if}
