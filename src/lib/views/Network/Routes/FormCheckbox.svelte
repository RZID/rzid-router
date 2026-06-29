<script lang="ts">
  import { cn } from "../../../helpers/classname";

  let {
    label,
    checked = $bindable(false),
    description,
    onchange,
  }: {
    label: string;
    checked?: boolean;
    description?: string;
    onchange?: (v: boolean) => void;
  } = $props();
</script>

<label
  class={cn("flex", "items-center", "gap-2", "cursor-pointer", "select-none")}
>
  <input
    type="checkbox"
    bind:checked
    onchange={() => onchange?.(checked)}
    class={cn("accent-accent")}
  />
  <span class={cn("text-xs", "font-medium", "text-fg")}>{label}</span>
</label>
{#if description}
  <p class={cn("text-[10px]", "text-muted", "ml-6", "-mt-1")}>{description}</p>
{/if}
