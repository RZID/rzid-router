<script lang="ts">
  import { X } from "@lucide/svelte";
  import { cn } from "../../../helpers/classname";
  import Input from "../../../components/Input/Input.svelte";
  import Select from "../../../components/Select/Select.svelte";

  let {
    show,
    nameError,
    protocols,
    onclose,
    oncreate,
    trans,
    name = $bindable(""),
    proto = $bindable("static"),
    device = $bindable(""),
  }: {
    show: boolean;
    nameError: string;
    protocols: { value: string; label: string }[];
    onclose: () => void;
    oncreate: () => void;
    trans: (k: string) => string;
    name?: string;
    proto?: string;
    device?: string;
  } = $props();
</script>

{#if show}
  <!-- svelte-ignore a11y_interactive_supports_focus -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class={cn(
      "fixed",
      "inset-0",
      "z-50",
      "flex",
      "items-start",
      "justify-center",
      "pt-24",
    )}
    onclick={onclose}
    role="dialog"
    aria-modal="true"
  >
    <div
      class={cn("absolute", "inset-0", "bg-black/60", "backdrop-blur-sm")}
    ></div>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      onclick={(e: MouseEvent) => e.stopPropagation()}
      class={cn(
        "relative",
        "w-full",
        "max-w-md",
        "glass",
        "rounded-xl",
        "p-5",
        "animate-fade-in",
        "shadow-2xl",
      )}
    >
      <div class={cn("flex", "items-center", "justify-between", "mb-4")}>
        <h2 class={cn("text-base", "font-semibold", "text-white")}>
          {trans("Add new interface...")}
        </h2>
        <button
          onclick={onclose}
          class={cn(
            "p-1.5",
            "rounded-md",
            "hover:bg-white/5",
            "transition-colors",
            "text-muted",
            "hover:text-fg",
            "cursor-pointer",
          )}><X size={16} /></button
        >
      </div>
      <div class={cn("space-y-4")}>
        <div>
          <Input
            label={trans("Name")}
            bind:value={name}
            placeholder={trans("New interface name...")}
          />
          {#if nameError}
            <p class={cn("text-[10px]", "text-red-400", "mt-1")}>{nameError}</p>
          {/if}
        </div>
        <Select
          label={trans("Protocol")}
          options={protocols}
          bind:value={proto}
        />
        <Input
          label={trans("Device")}
          bind:value={device}
          placeholder="br-lan"
          mono
        />
      </div>
      <div
        class={cn(
          "flex",
          "items-center",
          "justify-end",
          "gap-2",
          "mt-6",
          "pt-4",
          "border-t",
          "border-border",
        )}
      >
        <button
          onclick={onclose}
          class={cn(
            "px-3",
            "py-1.5",
            "text-xs",
            "rounded-md",
            "font-medium",
            "text-muted",
            "hover:text-fg",
            "border",
            "border-border",
            "hover:bg-white/5",
            "cursor-pointer",
            "transition-all",
          )}>{trans("Cancel")}</button
        >
        <button
          onclick={oncreate}
          disabled={!name}
          class={cn(
            "px-3",
            "py-1.5",
            "text-xs",
            "rounded-md",
            "font-medium",
            "text-surface",
            "bg-accent",
            "hover:bg-accent/90",
            "cursor-pointer",
            "transition-all",
            "disabled:opacity-30",
          )}>{trans("Create interface")}</button
        >
      </div>
    </div>
  </div>
{/if}
