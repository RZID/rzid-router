<script lang="ts">
  import { Search, Network as NetworkIcon } from "@lucide/svelte";
  import { cn } from "../../../helpers/classname";
  import Select from "../../../components/Select/Select.svelte";

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
    <Select options={options.map((opt) => ({ value: opt, label: opt }))} bind:value />
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
