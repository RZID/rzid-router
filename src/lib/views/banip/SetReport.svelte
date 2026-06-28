<script lang="ts">
  import { cn } from "../../helpers/classname";
  import { t as _t, getLocale, onLocaleChange } from "../../i18n";

  let locale = $state(getLocale());
  let trans = $derived.by(() => { locale; return (k: string) => _t(k); });
  $effect(() => onLocaleChange(() => { locale = getLocale(); }));
</script>

<div class={cn("flex", "flex-col", "min-h-0", "animate-fade-in", "gap-4")}>
  <div class={cn("shrink-0")}>
    <h1 class={cn("text-lg", "font-semibold", "text-white")}>{trans("Set Reporting")}</h1>
    <p class={cn("text-sm", "mt-0.5", "text-muted")}>
      {trans("This report shows the latest NFT Set statistics.")}
    </p>
  </div>
  <div class={cn("glass", "p-8", "rounded-xl", "animate-slide-up", "flex", "flex-col", "items-center", "justify-center", "gap-3")}>
    <span class={cn("text-xs", "text-muted")}>{trans("Set reporting not yet available in this version.")}</span>
  </div>
</div>
