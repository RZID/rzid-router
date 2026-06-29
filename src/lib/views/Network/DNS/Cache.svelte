<script lang="ts">
  // Helpers
  import { cn } from "../../../helpers/classname";
  import { getLocale, onLocaleChange, t } from "../../../i18n";

  // Props
  let { dnsForm, labelCls, recordTypes, toggleMV } = $props<{
    dnsForm: Record<string, any>;
    labelCls?: string;
    recordTypes: string[];
    toggleMV: (key: string, value: string) => void;
  }>();

  // States
  let locale = $state(getLocale());

  // Derives
  let trans = $derived.by(() => {
    locale;
    return (k: string) => t(k);
  });

  // Effects
  $effect(() =>
    onLocaleChange(() => {
      locale = getLocale();
    }),
  );
</script>

<div>
  <!-- svelte-ignore a11y_label_has_associated_control -->
  <label class={cn(labelCls, "mb-2")}>{trans("Cache arbitrary RR")}</label>
  <p class={cn("text-xs", "text-muted", "mb-2")}>
    {trans(
      "By default, dnsmasq caches A, AAAA, CNAME and SRV DNS record types. This option adds additional record types to the cache.",
    )}
  </p>
  <div class={cn("flex", "flex-wrap", "gap-1.5")}>
    {#each recordTypes as t}
      {@const active = (dnsForm.cache_rr as string[]).includes(t)}
      <label
        class={cn(
          "py-1",
          "border",
          "px-2.5",
          "gap-1.5",
          "text-xs",
          "font-mono",
          "rounded-md",
          "select-none",
          "inline-flex",
          "items-center",
          "duration-150",
          "cursor-pointer",
          "transition-all",
          active
            ? cn("bg-accent/15", "text-accent", "border-accent/30")
            : cn(
                "text-muted",
                "bg-surface",
                "hover:text-fg",
                "border-border",
                "hover:border-white/30",
              ),
        )}
      >
        <input
          type="checkbox"
          checked={active}
          onchange={() => toggleMV("cache_rr", t)}
          class={cn("accent-(--accent)", "w-3", "h-3")}
        />
        <span>{t}</span>
      </label>
    {/each}
  </div>
</div>
