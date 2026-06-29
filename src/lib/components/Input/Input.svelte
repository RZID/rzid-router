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
    type = "text" as string,
    readonly = false,
    disabled = false,
    mono = false,
    class: className = "",
    description = "",
    oninput,
    onchange,
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
      "rounded-md",
      "bg-surface",
      "outline-none",
      "duration-150",
      "transition-all",
      focused
        ? cn("border-(--accent)", "shadow-[0_0_0_1px_var(--accent)]")
        : cn("border-border", "hover:border-white/30"),
      mono ? "font-mono text-fg" : "text-fg",
      readonly ? "cursor-default" : "",
      className,
    ),
  );
</script>

<div class={cn(className)}>
  {#if label}
    <label
      for="input-{label}"
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
  {#if description}
    <p class={cn("text-[10px]", "text-muted", "-mt-1", "mb-1.5")}>
      {description}
    </p>
  {/if}

  <input
    {type}
    {oninput}
    bind:value
    {readonly}
    {disabled}
    {onchange}
    {placeholder}
    class={inputCls}
    onfocus={() => (focused = true)}
    onblur={() => (focused = false)}
    id={label ? "input-" + label : undefined}
  />
</div>
