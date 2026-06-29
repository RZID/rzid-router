<script lang="ts">
  // Helpers
  import { cn } from "../../helpers/classname";

  // Types
  import type { Props } from "./types";

  // Props
  let {
    label = "",
    value = $bindable(""),
    placeholder = "",
    rows = 3,
    class: className = "",
  }: Props = $props();

  // States
  let focused = $state(false);

  // Derives
  let inputCls = $derived(
    cn(
      "w-full",
      "px-2.5",
      "py-1.5",
      "border",
      "text-xs",
      "text-fg",
      "rounded-md",
      "bg-surface",
      "outline-none",
      "duration-150",
      "transition-all",
      "resize-vertical",
      focused
        ? cn("border-(--accent)", "shadow-[0_0_0_1px_var(--accent)]")
        : cn("border-border", "hover:border-white/30"),
      className,
    ),
  );
</script>

<div class={cn(className)}>
  {#if label}
    <label
      for="textarea-{label}"
      class={cn(
        "block",
        "mb-1.5",
        "uppercase",
        "text-muted",
        "text-[10px]",
        "font-semibold",
        "tracking-wider",
      )}
    >
      {label}
    </label>
  {/if}
  <textarea
    {rows}
    bind:value
    {placeholder}
    class={inputCls}
    onfocus={() => (focused = true)}
    onblur={() => (focused = false)}
    id={label ? "textarea-" + label : undefined}
  ></textarea>
</div>
