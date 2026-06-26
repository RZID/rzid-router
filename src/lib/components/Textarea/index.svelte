<script lang="ts">
  import { cn } from "../../helpers/classname";

  let {
    label = "",
    value = $bindable(""),
    placeholder = "",
    rows = 3,
    class: className = "",
  }: {
    label?: string;
    value?: string;
    placeholder?: string;
    rows?: number;
    class?: string;
  } = $props();

  let focused = $state(false);

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
      "transition-all",
      "duration-150",
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
        "text-[10px]",
        "uppercase",
        "text-muted",
        "font-semibold",
        "tracking-wider",
        "mb-1.5",
      )}
    >
      {label}
    </label>
  {/if}
  <textarea
    id={label ? "textarea-" + label : undefined}
    bind:value
    {placeholder}
    {rows}
    class={inputCls}
    onfocus={() => (focused = true)}
    onblur={() => (focused = false)}
  ></textarea>
</div>
