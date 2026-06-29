<script lang="ts">
  import { cn } from "../../../helpers/classname";
  import {
    LOG_FACILITIES,
    LOG_SEVERITIES,
    type SystemLogFilters,
  } from "../../../logs";
  import Select from "../../../components/Select/Select.svelte";
  import Input from "../../../components/Input/Input.svelte";
  import InvertButton from "./InvertButton.svelte";

  let {
    filters,
    onapply,
    trans,
  }: {
    filters: SystemLogFilters;
    onapply: () => void;
    trans: (k: string) => string;
  } = $props();
</script>

<div
  class={cn("grid", "gap-3", "grid-cols-1", "sm:grid-cols-2", "lg:grid-cols-4")}
>
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
      for="facility-select"
    >
      {trans("Facility")}
    </label>
    <div id="facility-select" class={cn("flex", "items-center", "gap-2")}>
      <Select
        options={LOG_FACILITIES}
        bind:value={filters.facility}
        onchange={onapply}
        class={cn("flex-1")}
      />
      <InvertButton
        active={filters.invertFacility}
        onclick={() => {
          filters.invertFacility = !filters.invertFacility;
          onapply();
        }}
        label={trans("Not")}
      />
    </div>
  </div>

  <div
    class={cn("rounded-lg", "p-3", "bg-surface-2", "border", "border-border")}
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
        options={LOG_SEVERITIES}
        bind:value={filters.severity}
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
  </div>

  <div
    class={cn(
      "p-3",
      "border",
      "rounded-lg",
      "sm:col-span-2",
      "lg:col-span-1",
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
      for="max-rows-input"
    >
      {trans("Max rows")}
    </label>
    <Input
      type="number"
      bind:value={filters.maxRows}
      onchange={onapply}
      mono
      class={cn("w-full")}
    />
  </div>
</div>
