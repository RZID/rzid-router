<script lang="ts">
  import { cn } from "../../helpers/classname";

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
  }: {
    label?: string;
    value?: any;
    placeholder?: string;
    type?: string;
    readonly?: boolean;
    disabled?: boolean;
    mono?: boolean;
    class?: string;
    description?: string;
    oninput?: () => void;
    onchange?: () => void;
  } = $props();

  let focused = $state(false);

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
      "transition-all",
      "duration-150",
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
  {#if description}
    <p class={cn("text-[10px]", "text-muted", "-mt-1", "mb-1.5")}>{description}</p>
  {/if}

  <input
    id={label ? "input-" + label : undefined}
    {type}
    bind:value
    {placeholder}
    {readonly}
    {disabled}
    class={inputCls}
    onfocus={() => (focused = true)}
    onblur={() => (focused = false)}
    {oninput}
    {onchange}
  />
</div>
