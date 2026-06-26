<script lang="ts">
  import { cn } from "../helpers/classname";

  let { rxRate = "0 B/s", txRate = "0 B/s" } = $props<{
    rxRate?: string;
    txRate?: string;
  }>();
</script>

<div class={cn("glass", "p-5", "animate-slide-up")}>
  <span
    class={cn(
      "text-xs",
      "uppercase",
      "text-muted",
      "font-medium",
      "tracking-wider",
    )}>BANDWIDTH — WAN</span
  >
  <div class={cn("flex", "gap-6", "mt-3")}>
    <div class={cn("flex-1")}>
      <span class={cn("text-xs", "text-muted")}>Download</span>
      <p class={cn("text-lg", "font-mono", "font-semibold", "text-accent")}>
        {rxRate}
      </p>
    </div>
    <div class={cn("flex-1")}>
      <span class={cn("text-xs", "text-muted")}>Upload</span>
      <p class={cn("text-lg", "font-mono", "font-semibold", "text-info")}>
        {txRate}
      </p>
    </div>
  </div>
</div>
