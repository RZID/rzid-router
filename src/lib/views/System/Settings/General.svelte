<script lang="ts">
  import { cn } from "../../../helpers/classname";
  import Input from "../../../components/Input/Input.svelte";
  import Select from "../../../components/Select/Select.svelte";
  import Textarea from "../../../components/Textarea/Textarea.svelte";
  import Toggle from "../../../components/Toggle/Toggle.svelte";

  let {
    unixtime,
    hostname,
    description,
    notes,
    zonename,
    clockTimestyle,
    clockHourcycle,
    tzOptions,
    ntpdAvailable,
    formatLocaltime,
    syncBrowser,
    syncNTP,
    trans,
  }: any = $props();
</script>

<div class={cn("space-y-4")}>
  <div class={cn("glass", "p-5", "animate-slide-up")}>
    <span
      class={cn(
        "block",
        "text-[10px]",
        "uppercase",
        "text-muted",
        "font-semibold",
        "tracking-wider",
        "mb-1.5",
      )}>{trans("Local Time")}</span
    >
    <div class={cn("flex", "items-center", "gap-3")}>
      <Input
        readonly
        mono
        value={formatLocaltime(unixtime)}
        class={cn("flex-1")}
      />
      <button
        onclick={syncBrowser}
        class={cn(
          "px-2.5",
          "py-1.5",
          "border",
          "text-xs",
          "rounded-md",
          "font-medium",
          "transition-all",
          "cursor-pointer",
          "hover:bg-accent/15",
          "text-accent",
          "bg-accent/10",
          "border-accent/20",
        )}>{trans("Sync with browser")}</button
      >
      {#if ntpdAvailable}
        <button
          onclick={syncNTP}
          class={cn(
            "px-2.5",
            "py-1.5",
            "border",
            "text-xs",
            "rounded-md",
            "font-medium",
            "transition-all",
            "cursor-pointer",
            "hover:bg-accent/15",
            "text-accent",
            "bg-accent/10",
            "border-accent/20",
          )}>{trans("Sync with NTP")}</button
        >
      {/if}
    </div>
  </div>
  <div class={cn("glass", "p-5", "animate-slide-up")}>
    <Input
      label={trans("Hostname")}
      bind:value={hostname}
      placeholder={trans("OpenWrt")}
      class={cn("max-w-sm")}
    />
  </div>
  <div class={cn("glass", "p-5", "animate-slide-up")}>
    <Input
      label={trans("Description")}
      bind:value={description}
      placeholder={trans("Optional device description")}
      class={cn("max-w-sm")}
    />
    <p class={cn("text-[10px]", "text-muted", "mt-1")}>
      {trans("An optional, short description for this device")}
    </p>
  </div>
  <div class={cn("glass", "p-5", "animate-slide-up")}>
    <Textarea
      label={trans("Notes")}
      bind:value={notes}
      placeholder={trans("Optional free-form notes")}
      class={cn("max-w-lg")}
    />
    <p class={cn("text-[10px]", "text-muted", "mt-1")}>
      {trans("Optional, free-form notes about this device")}
    </p>
  </div>
  <div class={cn("glass", "p-5", "animate-slide-up")}>
    <Select
      label={trans("Timezone")}
      options={tzOptions}
      bind:value={zonename}
    />
  </div>
  <div class={cn("glass", "p-5", "animate-slide-up")}>
    <Toggle
      label={trans("Full TimeZone Name")}
      description={trans(
        "Unchecked means the timezone offset (E.g. GMT+1) is displayed",
      )}
      bind:checked={clockTimestyle}
    />
    <Select
      label={trans("Time Format")}
      options={[
        { value: "", label: trans("Default") },
        { value: "h12", label: trans("12-Hour Clock") },
        { value: "h23", label: trans("24-Hour Clock") },
      ]}
      bind:value={clockHourcycle}
    />
  </div>
</div>
