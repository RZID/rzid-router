<script lang="ts">
  import { Search } from "@lucide/svelte";
  import { cn } from "../../../helpers/classname";
  import Input from "../../../components/Input/Input.svelte";

  let {
    value,
    placeholder,
    running,
    onrun,
  }: {
    value: string;
    placeholder: string;
    running: boolean;
    onrun: () => void;
  } = $props();
</script>

<div class={cn("flex", "items-center", "gap-3", "mb-3")}>
  <div class={cn("flex-1")}>
    <Input bind:value {placeholder} />
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
    {running ? "Running..." : "Nslookup"}
  </button>
  <Search size={16} class={cn("text-text-muted", "shrink-0")} />
</div>
