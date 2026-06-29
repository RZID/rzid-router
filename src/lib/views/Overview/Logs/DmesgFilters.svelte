<script lang="ts">
  import { ArrowRight } from "@lucide/svelte";
  import { cn } from "../../../helpers/classname";
  import { DMESG_SEVERITIES, type DmesgFilters as DF } from "../../../logs";
  import Select from "../../../components/Select/Select.svelte";
  import Input from "../../../components/Input/Input.svelte";
  import InvertButton from "./InvertButton.svelte";

  let {
    filters,
    onapply,
    trans,
  }: {
    filters: DF;
    onapply: () => void;
    trans: (k: string) => string;
  } = $props();
</script>

<div
  class={cn("grid", "gap-3", "grid-cols-1", "sm:grid-cols-2", "lg:grid-cols-4")}
>
  <div
    class={cn(
      "p-3",
      "border",
      "rounded-lg",
      "sm:col-span-2",
      "bg-surface-2",
      "border-border",
    )}
  >
    <label
      class={cn(
        "mb-2",
        "block",
        "uppercase",
        "text-muted",
        "text-[10px]",
        "font-semibold",
        "tracking-wider",
      )}
      for="time-range-input"
    >
      {trans("Time range")}
    </label>
    <div
      id="time-range-input"
      class={cn("flex", "flex-wrap", "items-center", "gap-2")}
    >
      <Input
        type="number"
        bind:value={filters.fromTime}
        oninput={onapply}
        placeholder={trans("From")}
        mono
        class={cn("flex-1 min-w-24")}
      />
      <span class={cn("text-xs", "text-muted")}
        ><ArrowRight size={14} class={cn("text-muted")} /></span
      >
      <Input
        type="number"
        bind:value={filters.toTime}
        oninput={onapply}
        placeholder={trans("To")}
        mono
        class={cn("flex-1 min-w-24")}
      />
      <InvertButton
        active={filters.invertTimeRange}
        onclick={() => {
          filters.invertTimeRange = !filters.invertTimeRange;
          onapply();
        }}
        label={trans("Not")}
      />
    </div>
  </div>

  <div
    class={cn("p-3", "border", "rounded-lg", "bg-surface-2", "border-border")}
  >
    <label
      class={cn(
        "mb-2",
        "block",
        "uppercase",
        "text-muted",
        "text-[10px]",
        "font-semibold",
        "tracking-wider",
      )}
      for="severity-select"
    >
      {trans("Severity")}
    </label>
    <div id="severity-select" class={cn("flex", "items-center", "gap-2")}>
      <Select
        options={DMESG_SEVERITIES}
        bind:value={filters.minSeverity}
        onchange={onapply}
        class={cn("flex-1")}
      />
      <InvertButton
        active={filters.invertSeverity}
        onclick={() => {
          filters.invertSeverity = !filters.invertSeverity;
          onapply();
        }}
        label={trans("Not")}
      />
    </div>
    <p class={cn("text-[10px]", "mt-1.5", "text-muted")}>
      {trans("and above")}
    </p>
  </div>

  <div
    class={cn("p-3", "border", "rounded-lg", "bg-surface-2", "border-border")}
  >
    <label
      class={cn(
        "mb-2",
        "block",
        "uppercase",
        "text-muted",
        "text-[10px]",
        "font-semibold",
        "tracking-wider",
      )}
      for="search-input"
    >
      {trans("Search")}
    </label>
    <div id="search-input" class={cn("flex", "items-center", "gap-2")}>
      <Input
        bind:value={filters.text}
        oninput={onapply}
        placeholder={trans("Filter text...")}
        mono
        class={cn("flex-1")}
      />
      <InvertButton
        active={filters.invertText}
        onclick={() => {
          filters.invertText = !filters.invertText;
          onapply();
        }}
        label={trans("Not")}
      />
    </div>
  </div>

  <div
    class={cn(
      "p-3",
      "flex",
      "border",
      "items-end",
      "rounded-lg",
      "bg-surface-2",
      "border-border",
    )}
  >
    <button
      type="button"
      class={cn(
        "w-full",
        "px-2.5",
        "py-1.5",
        "text-xs",
        "rounded-md",
        "font-medium",
        "transition-all",
        "cursor-pointer",
      )}
      style="background:{filters.reverseSort
        ? 'rgba(0,212,170,0.15)'
        : 'var(--surface)'};color:{filters.reverseSort
        ? 'var(--accent)'
        : 'var(--text-muted)'};border:1px solid {filters.reverseSort
        ? 'rgba(0,212,170,0.3)'
        : 'var(--border)'}"
      onclick={() => {
        filters.reverseSort = !filters.reverseSort;
        onapply();
      }}
    >
      {trans("Reverse sort")}
    </button>
  </div>
</div>
