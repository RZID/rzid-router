<script lang="ts">
  import { ArrowUp, ArrowDown } from "@lucide/svelte";
  import { cn } from "../../../helpers/classname";

  let {
    logText,
    lineCount,
    trans,
  }: {
    logText: string;
    lineCount: number;
    trans: (k: string) => string;
  } = $props();

  let logArea: HTMLTextAreaElement | undefined = $state();

  const scrollToHead = () => logArea?.scrollTo({ top: 0, behavior: "smooth" });
  const scrollToTail = () =>
    logArea?.scrollTo({ top: logArea.scrollHeight, behavior: "smooth" });
</script>

<div class={cn("flex-1", "flex", "flex-col", "min-h-0")}>
  <div
    class={cn(
      "px-4",
      "py-2",
      "flex",
      "shrink-0",
      "border-b",
      "items-center",
      "bg-black/15",
      "border-border",
      "justify-between",
    )}
  >
    <span class={cn("text-xs", "font-mono", "text-muted")}>
      {lineCount}
      {lineCount === 1 ? trans("line") : trans("lines")}
    </span>
    <div class={cn("flex", "items-center", "gap-1.5")}>
      <button
        type="button"
        class={cn(
          "py-1",
          "px-2.5",
          "border",
          "rounded-md",
          "text-[11px]",
          "text-muted",
          "font-medium",
          "transition-all",
          "cursor-pointer",
          "hover:bg-white/5",
          "border-border",
        )}
        onclick={scrollToHead}
      >
        <ArrowUp size={14} class={cn("text-muted")} />
        {trans("Head")}
      </button>
      <button
        type="button"
        class={cn(
          "py-1",
          "px-2.5",
          "border",
          "text-muted",
          "rounded-md",
          "text-[11px]",
          "font-medium",
          "transition-all",
          "cursor-pointer",
          "hover:bg-white/5",
          "border-border",
        )}
        onclick={scrollToTail}
      >
        <ArrowDown size={14} class={cn("text-muted")} />
        {trans("Tail")}
      </button>
    </div>
  </div>

  <div class={cn("flex-1", "min-h-0", "p-3")}>
    <textarea
      bind:this={logArea}
      readonly
      wrap="off"
      class={cn(
        "p-3",
        "block",
        "w-full",
        "h-full",
        "border",
        "text-xs",
        "text-fg",
        "font-mono",
        "rounded-lg",
        "resize-none",
        "bg-surface",
        "outline-none",
        "overflow-auto",
        "border-border",
      )}
      value={logText}
    ></textarea>
  </div>
</div>
