<script lang="ts">
  import { X, Save } from "@lucide/svelte";
  import { cn } from "../../../helpers/classname";
  import Input from "../../../components/Input/Input.svelte";
  import Select from "../../../components/Select/Select.svelte";

  let {
    editingIpset,
    ipForm,
    fwIpsets,
    onclose,
    onsave,
    trans,
  }: {
    editingIpset: string | null;
    ipForm: Record<string, any>;
    fwIpsets: string[];
    onclose: () => void;
    onsave: () => void;
    trans: (k: string) => string;
  } = $props();
</script>

<!-- svelte-ignore a11y_interactive_supports_focus -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  class={cn(
    "z-50",
    "flex",
    "fixed",
    "pt-12",
    "inset-0",
    "items-start",
    "justify-center",
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
      "p-5",
      "glass",
      "w-full",
      "max-w-md",
      "relative",
      "rounded-xl",
      "shadow-2xl",
      "animate-fade-in",
    )}
  >
    <div class={cn("flex", "items-center", "justify-between", "mb-4")}>
      <h2 class={cn("text-sm", "font-semibold", "text-white")}>
        {editingIpset === "__new__" ? trans("Add") : trans("Edit")}
        {trans("IP set")}
      </h2>
      <button
        onclick={onclose}
        class={cn(
          "p-1",
          "rounded",
          "text-muted",
          "hover:text-fg",
          "cursor-pointer",
        )}><X size={14} /></button
      >
    </div>
    <div class={cn("space-y-4")}>
      <Input
        label={trans("Name")}
        bind:value={ipForm.name}
        placeholder={trans("Set name")}
        description={trans("Name of the set.")}
      />
      <Input
        label={trans("FQDN")}
        placeholder="example.com"
        bind:value={ipForm.domain}
        description={trans("FQDN to resolve and add to this set.")}
      />
      <Select
        bind:value={ipForm.table}
        placeholder={trans("Select...")}
        label={trans("Netfilter table name")}
        options={[
          { value: "", label: "fw4" },
          ...fwIpsets.map((n) => ({ value: n, label: n })),
        ]}
      />
      <Select
        label={trans("Table IP family")}
        bind:value={ipForm.table_family}
        placeholder={trans("Select...")}
        options={[
          { value: "", label: trans("IPv4+6") },
          { value: "inet", label: trans("IPv4+6") },
          { value: "ip", label: trans("IPv4") },
          { value: "ip6", label: trans("IPv6") },
        ]}
      />
    </div>
    <div class={cn("flex", "justify-end", "gap-2", "mt-5")}>
      <button
        onclick={onclose}
        class={cn(
          "px-3",
          "py-1.5",
          "text-xs",
          "border",
          "rounded-lg",
          "text-muted",
          "bg-surface-2",
          "border-border",
          "hover:text-fg",
          "cursor-pointer",
        )}>{trans("Cancel")}</button
      >
      <button
        onclick={onsave}
        class={cn(
          "flex",
          "px-3",
          "py-1.5",
          "gap-1.5",
          "text-xs",
          "rounded-lg",
          "bg-accent",
          "items-center",
          "text-black",
          "hover:opacity-90",
          "cursor-pointer",
        )}><Save size={12} />{trans("Save")}</button
      >
    </div>
  </div>
</div>
