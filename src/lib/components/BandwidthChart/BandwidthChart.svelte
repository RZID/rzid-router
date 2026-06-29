<script lang="ts">
  // Helpers
  import { cn } from "../../helpers/classname";
  import { t as _t, getLocale, onLocaleChange } from "../../i18n";

  // Types
  import type { props } from "./types";

  // States
  let locale = $state(getLocale());

  // Derives
  let trans = $derived.by(() => {
    locale;
    return (k: string) => _t(k);
  });

  // Effects
  $effect(() =>
    onLocaleChange(() => {
      locale = getLocale();
    }),
  );

  // Props
  let { rxRate = "0 B/s", txRate = "0 B/s" } = $props<props>();
</script>

<div class={cn("glass", "p-5", "animate-slide-up")}>
  <span
    class={cn(
      "text-xs",
      "uppercase",
      "text-muted",
      "font-medium",
      "tracking-wider",
    )}
  >
    {trans("BANDWIDTH -- WAN")}
  </span>
  <div class={cn("flex", "gap-6", "mt-3")}>
    <div class={cn("flex-1")}>
      <span class={cn("text-xs", "text-muted")}>{trans("Download")}</span>
      <p class={cn("text-lg", "font-mono", "font-semibold", "text-accent")}>
        {rxRate}
      </p>
    </div>
    <div class={cn("flex-1")}>
      <span class={cn("text-xs", "text-muted")}>{trans("Upload")}</span>
      <p class={cn("text-lg", "font-mono", "font-semibold", "text-info")}>
        {txRate}
      </p>
    </div>
  </div>
</div>
