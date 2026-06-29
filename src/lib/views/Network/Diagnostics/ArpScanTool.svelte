<script lang="ts">
  import { Search, Network as NetworkIcon } from "@lucide/svelte";
  import { cn } from "../../../helpers/classname";

  let {
    value,
    options,
    running,
    onrun,
  }: {
    value: string;
    options: string[];
    running: boolean;
    onrun: () => void;
  } = $props();
</script>

<div class={cn("flex", "items-center", "gap-3")}>
  <div class={cn("flex-1")}>
    <select
      bind:value
      class={cn(
        "w-full",
        "bg-surface",
        "border",
        "border-border",
        "rounded-lg",
        "px-3",
        "py-2",
        "text-sm",
        "text-text",
        "focus:outline-none",
        "focus:border-accent",
        "focus:ring-1",
        "focus:ring-accent",
        "transition-colors",
        "cursor-pointer",
      )}
    >
      {#each options as opt}
        <option value={opt}>{opt}</option>
      {/each}
    </select>
  </div>
  <button
    onclick={onrun}
    disabled={running}
    class={cn(
      "flex",
      "items-center",
      "gap-1.5",
      "px-4",
      "py-2",
      "rounded-lg",
      "text-sm",
      "font-medium",
      "transition-all",
      "duration-150",
      "bg-accent",
      "text-white",
      "hover:brightness-110",
      "active:brightness-90",
      "disabled:opacity-50",
      "disabled:cursor-not-allowed",
    )}
  >
    <Search size={14} />
    {running ? "Running..." : "ARP Scan"}
  </button>
  <NetworkIcon size={16} class={cn("text-text-muted", "shrink-0")} />
</div>
