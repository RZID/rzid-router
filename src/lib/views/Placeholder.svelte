<script lang="ts">
  import { cn } from "../helpers/classname";
  import { t as _t, getLocale, onLocaleChange } from "../i18n";
  let locale = $state(getLocale());
  let trans = $derived.by(() => { locale; return (k: string) => _t(k); });
  $effect(() => onLocaleChange(() => { locale = getLocale(); }));

  let { title, sub = trans("Coming soon") } = $props<{
    title: string;
    sub?: string;
  }>();
</script>

<div class={cn("p-6", "animate-fade-in")}>
  <h1 class={cn("text-lg", "font-semibold", "text-white")}>{title}</h1>
  <p class={cn("text-sm", "mt-0.5", "text-muted")}>{sub}</p>
  <div
    class={cn(
      "mt-6",
      "p-12",
      "flex",
      "glass",
      "animate-slide-up",
      "items-center",
      "justify-center",
      "animate-slide-up",
    )}
  >
    <p class={cn("text-sm", "text-muted")}>{trans("Under construction")}</p>
  </div>
</div>
