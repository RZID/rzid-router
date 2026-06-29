<script lang="ts">
  import { Eye } from "@lucide/svelte";
  import { cn } from "../../../helpers/classname";

  let {
    logContent,
    trans,
    onReadLog,
  }: {
    logContent: string;
    trans: (k: string) => string;
    onReadLog: () => void;
  } = $props();
</script>

<div class={cn("space-y-3")}>
  <button
    onclick={onReadLog}
    class={cn(
      "px-3",
      "py-1.5",
      "border",
      "text-xs",
      "rounded-md",
      "font-medium",
      "transition-all",
      "cursor-pointer",
      "hover:bg-accent/15",
      "text-accent",
      "bg-accent/10",
      "border-accent/20",
    )}
  >
    <Eye size={12} />
    {trans("Read / Reread log file")}
  </button>
  <textarea
    readonly
    class={cn(
      "w-full",
      "h-60",
      "p-3",
      "text-xs",
      "font-mono",
      "text-fg",
      "bg-surface",
      "border",
      "border-border",
      "rounded-lg",
      "resize-none",
    )}
    style="font-size:10px"
    value={logContent || trans("Press [Read] button to load log.")}
  ></textarea>
</div>
