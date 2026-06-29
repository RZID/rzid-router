<script lang="ts">
  import { cn } from "../../../helpers/classname";

  let {
    label,
    value = $bindable(""),
    placeholder = "",
    type = "text" as string,
    mono = false,
    required = false,
    options,
  }: {
    label: string;
    value?: string;
    placeholder?: string;
    type?: string;
    mono?: boolean;
    required?: boolean;
    options?: { value: string; label: string }[];
  } = $props();
</script>

<div class={cn("flex", "flex-col", "gap-1")}>
  <!-- svelte-ignore a11y_label_has_associated_control -->
  <label
    class={cn(
      "text-[10px]",
      "uppercase",
      "text-muted",
      "font-semibold",
      "tracking-wider",
    )}
  >
    {label}{#if required}<span class={cn("text-danger")}> *</span>{/if}
  </label>
  {#if options}
    <select
      bind:value
      class={cn(
        "w-full",
        "px-2.5",
        "py-1.5",
        "text-xs",
        "rounded-lg",
        "bg-surface-2",
        "border",
        "border-border",
        "text-fg",
        "outline-none",
        "focus:border-accent",
        "cursor-pointer",
      )}
    >
      {#if placeholder}
        <option value="">{placeholder}</option>
      {/if}
      {#each options as opt}
        <option value={opt.value}>{opt.label}</option>
      {/each}
    </select>
  {:else}
    <input
      {type}
      bind:value
      {placeholder}
      class={cn(
        "w-full",
        "px-2.5",
        "py-1.5",
        "text-xs",
        "rounded-lg",
        "bg-surface-2",
        "border",
        "border-border",
        "text-fg",
        "outline-none",
        "focus:border-accent",
        mono && "font-mono",
      )}
    />
  {/if}
</div>
