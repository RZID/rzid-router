<script lang="ts">
  import { cn } from "../../../helpers/classname";
  import Select from "../../../components/Select/Select.svelte";
  import Toggle from "../../../components/Toggle/Toggle.svelte";

  let {
    locale,
    theme,
    tablefilters,
    langOptions,
    themeOptions,
    setLocale,
    setTheme,
    trans,
  }: any = $props();
</script>

<div class={cn("space-y-4")}>
  <div class={cn("glass", "p-5", "animate-slide-up")}>
    <Select
      label={trans("Language")}
      options={langOptions}
      bind:value={locale}
      onchange={() => setLocale(locale)}
    />
  </div>
  <div class={cn("glass", "p-5", "animate-slide-up")}>
    <Select
      label={trans("Design")}
      options={themeOptions}
      bind:value={theme}
      onchange={() => setTheme(theme)}
      placeholder={trans("Default")}
    />
  </div>
  <div class={cn("glass", "p-5", "animate-slide-up")}>
    <Toggle
      label={trans("Table Filters")}
      description={trans("Enable column filter inputs in overview tables")}
      bind:checked={tablefilters}
    />
  </div>
</div>
