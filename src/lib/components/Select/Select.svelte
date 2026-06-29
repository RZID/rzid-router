<script lang="ts">
  // Deps
  import { ChevronDown } from "@lucide/svelte";
  import { createSelect } from "@melt-ui/svelte";

  // Helpers
  import { cn } from "../../helpers/classname";
  import { t as _t, getLocale, onLocaleChange } from "../../i18n";

  // Types
  import type { Props } from "./types";

  // Props
  let {
    label = "",
    description = "",
    options = [] as { value: string; label: string }[],
    value = $bindable(""),
    placeholder,
    class: className = "",
    onchange,
  }: Props = $props();

  // States
  let locale = $state(getLocale()),
    searchQuery = $state(""),
    focused = $state(false),
    meltOpen = $state(false),
    listbox: HTMLDivElement | undefined = $state();

  // Derives
  let trans = $derived.by(() => {
      locale;
      return (k: string) => _t(k);
    }),
    defaultPlaceholder = $derived(trans("Select...")),
    isSearchable = $derived(options.length > 12),
    selectedLabel = $derived(
      options.find((o) => o.value === value)?.label || "",
    ),
    filtered = $derived(
      searchQuery
        ? options.filter((o) =>
            trans(o.label).toLowerCase().includes(searchQuery.toLowerCase()),
          )
        : options,
    ),
    inputCls = $derived(
      cn(
        "w-full",
        "px-2.5",
        "py-1.5",
        "border",
        "text-xs",
        "text-fg",
        "rounded-md",
        "bg-surface",
        "outline-none",
        "transition-all",
        "duration-150",
        "cursor-pointer",
        focused
          ? cn("border-(--accent)", "shadow-[0_0_0_1px_var(--accent)]")
          : cn("border-border", "hover:border-white/5"),
        className,
      ),
    );

  // Effects
  $effect(() =>
    onLocaleChange(() => {
      locale = getLocale();
    }),
  );

  // Melt
  const melt = createSelect({
      positioning: {
        placement: "bottom-start",
        sameWidth: true,
        gutter: 4,
        flip: true,
        overflowPadding: 8,
      },
      loop: true,
      closeOnOutsideClick: true,
      escapeBehavior: "close",
    }),
    {
      elements: { trigger, menu, option },
      states: { open: openStore },
    } = melt;

  // Effects
  $effect(() => {
    const u1 = openStore.subscribe((v) => (meltOpen = v));
    return u1;
  });

  $effect(() => {
    if (meltOpen && listbox && value) {
      requestAnimationFrame(() => {
        const el = listbox!.querySelector(`[data-value="${value}"]`);
        el?.scrollIntoView({ block: "nearest" });
      });
    }
  });
</script>

<div>
  {#if label}
    <span
      class={cn(
        "block",
        "mb-1.5",
        "uppercase",
        "text-muted",
        "text-[10px]",
        "font-semibold",
        "tracking-wider",
      )}
    >
      {label}
    </span>
  {/if}
  {#if description}
    <p class={cn("text-[10px]", "text-muted", "mb-1.5", "leading-relaxed")}>
      {description}
    </p>
  {/if}

  <button
    type="button"
    class={cn(inputCls, "flex", "items-center", "gap-1.5", "text-left")}
    use:trigger
    onfocus={() => (focused = true)}
    onblur={() => (focused = false)}
  >
    <span class={cn("flex-1", "truncate", value ? "text-fg" : "text-muted")}>
      {selectedLabel ? trans(selectedLabel) : placeholder || defaultPlaceholder}
    </span>
    <ChevronDown
      size={16}
      class={cn(
        "shrink-0",
        "text-muted",
        "transition-transform",
        meltOpen && "rotate-180",
      )}
    />
  </button>

  <div
    use:menu
    class={cn(
      meltOpen ? "block" : "hidden",
      "border",
      "z-9999",
      "shadow-lg",
      "rounded-lg",
      "bg-surface-2",
      "border-border",
      "overflow-hidden",
    )}
  >
    {#if isSearchable}
      <div class={cn("p-1.5", "border-b", "border-border")}>
        <input
          type="text"
          placeholder={trans("Search...")}
          bind:value={searchQuery}
          class={cn(
            "px-2",
            "py-1",
            "w-full",
            "border",
            "text-xs",
            "text-fg",
            "rounded-md",
            "bg-surface",
            "outline-none",
            "border-border",
            "focus:border-(--accent)",
          )}
        />
      </div>
    {/if}
    <div
      bind:this={listbox}
      class={cn("overflow-y-auto", "max-h-60")}
      role="listbox"
    >
      {#if filtered.length === 0}
        <div class={cn("px-3", "py-4", "text-xs", "text-center", "text-muted")}>
          {trans("No results")}
        </div>
      {:else}
        {#each filtered as opt}
          <button
            type="button"
            data-value={opt.value}
            data-label={opt.label}
            class={cn(
              "px-3",
              "py-1.5",
              "w-full",
              "text-xs",
              "text-left",
              "duration-100",
              "cursor-pointer",
              "transition-colors",
              opt.value === value
                ? cn("bg-accent/15", "text-fg", "font-semibold")
                : cn("hover:bg-white/5", "text-fg"),
            )}
            use:option
            onclick={() => {
              value = opt.value;
              searchQuery = "";
              openStore.set(false);
              onchange?.();
            }}
          >
            {trans(opt.label)}
          </button>
        {/each}
      {/if}
    </div>
  </div>
</div>
