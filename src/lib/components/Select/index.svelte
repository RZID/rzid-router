<script lang="ts">
  import { ChevronDown } from "@lucide/svelte";
  import { createSelect } from "@melt-ui/svelte";
  import { cn } from "../../helpers/classname";

  let {
    label = "",
    options = [] as { value: string; label: string }[],
    value = $bindable(""),
    placeholder = "Select…",
    class: className = "",
    onchange,
  }: {
    label?: string;
    options: { value: string; label: string }[];
    value?: string;
    placeholder?: string;
    class?: string;
    onchange?: () => void;
  } = $props();

  let isSearchable = $derived(options.length > 12);
  let searchQuery = $state("");
  let focused = $state(false);
  let meltOpen = $state(false);
  let listbox: HTMLDivElement | undefined = $state();

  let selectedLabel = $derived(
    options.find((o) => o.value === value)?.label || "",
  );

  let filtered = $derived(
    searchQuery
      ? options.filter((o) =>
          o.label.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : options,
  );

  let inputCls = $derived(
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
  });

  const {
    elements: { trigger, menu, option },
    states: { open: openStore },
  } = melt;

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
        "text-[10px]",
        "uppercase",
        "text-muted",
        "font-semibold",
        "tracking-wider",
        "mb-1.5",
      )}
    >
      {label}
    </span>
  {/if}

  <button
    type="button"
    class={cn(inputCls, "flex", "items-center", "gap-1.5", "text-left")}
    use:trigger
    onfocus={() => (focused = true)}
    onblur={() => (focused = false)}
  >
    <span class={cn("flex-1", "truncate", value ? "text-fg" : "text-muted")}>
      {selectedLabel || placeholder}
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
      "z-[9999]",
      "border",
      "rounded-lg",
      "bg-surface-2",
      "border-border",
      "shadow-lg",
      "overflow-hidden",
    )}
  >
    {#if isSearchable}
      <div class={cn("p-1.5", "border-b", "border-border")}>
        <input
          type="text"
          placeholder="Search…"
          bind:value={searchQuery}
          class={cn(
            "w-full",
            "px-2",
            "py-1",
            "border",
            "text-xs",
            "text-fg",
            "rounded-md",
            "bg-surface",
            "border-border",
            "outline-none",
            "focus:border-(--accent)",
          )}
        />
      </div>
    {/if}
    <div bind:this={listbox} class={cn("overflow-y-auto", "max-h-60")} role="listbox">
      {#if filtered.length === 0}
        <div class={cn("px-3", "py-4", "text-xs", "text-center", "text-muted")}>
          No results
        </div>
      {:else}
        {#each filtered as opt}
          <button
            type="button"
            data-value={opt.value}
            data-label={opt.label}
            class={cn(
              "w-full",
              "px-3",
              "py-1.5",
              "text-xs",
              "text-left",
              "transition-colors",
              "duration-100",
              "cursor-pointer",
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
            {opt.label}
          </button>
        {/each}
      {/if}
    </div>
  </div>
</div>
