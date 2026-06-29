<script lang="ts">
  import { cn } from "../../../helpers/classname";
  import { getLocale, onLocaleChange, t } from "../../../i18n";

  let locale = $state(getLocale());
  let trans = $derived.by(() => {
    locale;
    return (k: string) => t(k);
  });
  $effect(() =>
    onLocaleChange(() => {
      locale = getLocale();
    }),
  );
</script>

<div class={cn("flex", "flex-col", "min-h-0", "animate-fade-in", "gap-4")}>
  <div class={cn("shrink-0")}>
    <h1 class={cn("text-lg", "font-semibold", "text-white")}>
      {trans("Custom Feed Editor")}
    </h1>
    <p class={cn("text-sm", "mt-0.5", "text-muted")}>
      {trans(
        "With this editor you can upload your local custom feed file or fill up an initial one.",
      )}
    </p>
  </div>
  <div
    class={cn(
      "glass",
      "p-8",
      "rounded-xl",
      "animate-slide-up",
      "flex",
      "flex-col",
      "items-center",
      "justify-center",
      "gap-3",
    )}
  >
    <span class={cn("text-xs", "text-muted")}
      >{trans("Feed editor not yet available in this version.")}</span
    >
  </div>
</div>
