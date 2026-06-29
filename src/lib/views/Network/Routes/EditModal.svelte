<script lang="ts">
  import { X, Save } from "@lucide/svelte";
  import { cn } from "../../../helpers/classname";
  import TabBar from "../../../components/TabBar/TabBar.svelte";
  import Input from "../../../components/Input/Input.svelte";
  import Select from "../../../components/Select/Select.svelte";
  import Toggle from "../../../components/Toggle/Toggle.svelte";

  let {
    editing,
    form,
    editSubTab = $bindable("general"),
    interfaces,
    rtTables,
    routeProtocols,
    ruleActions,
    protocols,
    busy,
    onclose,
    onsave,
    onsubtabchange,
    trans,
  }: {
    editing: { section: string; type: string } | null;
    form: Record<string, string>;
    editSubTab: string;
    interfaces: string[];
    rtTables: [number, string][];
    routeProtocols: { value: string; label: string }[];
    ruleActions: { value: string; label: string }[];
    protocols: { i: number; d: string }[];
    busy: Record<string, string>;
    onclose: () => void;
    onsave: () => void;
    onsubtabchange: (id: string) => void;
    trans: (k: string) => string;
  } = $props();

  // svelte-ignore state_referenced_locally
  const isRoute = editing?.type === "route" || editing?.type === "route6";
  // svelte-ignore state_referenced_locally
  const v6 = editing?.type === "route6" || editing?.type === "rule6";
  // svelte-ignore state_referenced_locally
  const subTabs = [
    { id: "general", label: trans("General Settings") },
    { id: "advanced", label: trans("Advanced Settings") },
  ];
  // svelte-ignore state_referenced_locally
  const ifaceOptions = [
    { value: "", label: trans("— select —") },
    ...interfaces.map((i) => ({ value: i, label: i })),
  ];
  // svelte-ignore state_referenced_locally
  const rtTableOpts = [
    { value: "", label: trans("auto") },
    ...rtTables.map(([n, a]) => ({ value: String(n), label: `${a} (${n})` })),
  ];
  // svelte-ignore state_referenced_locally
  const protoOpts = [
    { value: "", label: trans("— select —") },
    ...protocols.map((p) => ({ value: String(p.i), label: `${p.d} (${p.i})` })),
  ];
</script>

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
    "pt-12",
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
      "max-w-2xl",
      "max-h-[85vh]",
      "overflow-y-auto",
      "glass",
      "rounded-xl",
      "p-5",
      "animate-fade-in",
      "shadow-2xl",
    )}
  >
    <div class={cn("flex", "items-center", "justify-between", "mb-4")}>
      <h2 class={cn("text-sm", "font-semibold", "text-white")}>
        {trans(isRoute ? "Edit Route" : "Edit Rule")}:
        <span class={cn("font-mono", "text-accent")}>{editing?.section}</span>
      </h2>
      <button
        onclick={onclose}
        class={cn(
          "p-1",
          "rounded",
          "text-muted",
          "hover:text-fg",
          "hover:bg-white/5",
          "cursor-pointer",
        )}><X size={14} /></button
      >
    </div>

    <TabBar tabs={subTabs} active={editSubTab} onchange={onsubtabchange} />

    <div class={cn("mt-4", "space-y-3")}>
      {#if editSubTab === "general"}
        {#if isRoute}
          <Select
            label={trans("Interface")}
            bind:value={form.interface}
            options={ifaceOptions}
          />
          <Select
            label={trans("Route type")}
            bind:value={form.type}
            options={routeProtocols.map((p) => ({
              value: p.value,
              label: p.label,
            }))}
          />
          <Input
            label={trans("Target") + " *"}
            bind:value={form.target}
            placeholder={v6 ? "::/0" : "0.0.0.0/0"}
            mono
          />
          <Input
            label={trans("Gateway")}
            bind:value={form.gateway}
            placeholder={v6 ? "fe80::1" : "192.168.0.1"}
            mono
          />
        {:else}
          <Input
            label={trans("Priority")}
            type="number"
            bind:value={form.priority}
            placeholder="30000"
            mono
          />
          <Select
            label={trans("Rule type")}
            bind:value={form.action}
            options={ruleActions.map((a) => ({
              value: a.value,
              label: a.label,
            }))}
          />
          <Select
            label={trans("Incoming interface")}
            bind:value={form.in}
            options={ifaceOptions}
          />
          <Input
            label={trans("Source")}
            bind:value={form.src}
            placeholder={v6 ? "::/0" : "0.0.0.0/0"}
            mono
          />
          <Select
            label={trans("IP Protocol")}
            bind:value={form.ipproto}
            options={protoOpts}
          />
          <Select
            label={trans("Outgoing interface")}
            bind:value={form.out}
            options={ifaceOptions}
          />
          <Input
            label={trans("Destination")}
            bind:value={form.dest}
            placeholder={v6 ? "::/0" : "0.0.0.0/0"}
            mono
          />
        {/if}
      {:else if isRoute}
        <Input
          label={trans("Metric")}
          type="number"
          bind:value={form.metric}
          placeholder={trans("auto")}
          mono
        />
        <Input
          label={trans("MTU")}
          type="number"
          bind:value={form.mtu}
          placeholder="1500"
          mono
        />
        <Select
          label={trans("Table")}
          bind:value={form.table}
          placeholder={trans("auto")}
          options={rtTableOpts}
        />
        <Input
          label={trans("Source")}
          bind:value={form.src}
          placeholder={v6 ? "::/0" : "0.0.0.0/0"}
          mono
        />
        <Toggle
          label={trans("On-link route")}
          checked={form.onlink === "1"}
          onchange={(v) => (form.onlink = v ? "1" : "")}
          description={trans(
            "Specifies that the route is on the link and the gateway should be ignored",
          )}
        />
        <Toggle
          label={trans("Disabled")}
          checked={form.disabled === "1"}
          onchange={(v) => (form.disabled = v ? "1" : "")}
        />
      {:else}
        <Select
          label={trans("Table (lookup)")}
          bind:value={form.lookup}
          placeholder={trans("auto")}
          options={rtTableOpts}
        />
        <Input
          label={trans("Jump to rule")}
          type="number"
          bind:value={form.goto}
          placeholder="30000"
          mono
        />
        <Input
          label={trans("Firewall mark")}
          bind:value={form.fwmark}
          placeholder="0x1/0xf"
          mono
        />
        <Input
          label={trans("Source port")}
          bind:value={form.sport}
          placeholder="0-65535"
          mono
        />
        <Input
          label={trans("Destination port")}
          bind:value={form.dport}
          placeholder="0-65535"
          mono
        />
        <Input
          label={trans("Type of service")}
          type="number"
          bind:value={form.tos}
          placeholder=""
          mono
        />
        <Input
          label={trans("User identifier")}
          bind:value={form.uid}
          placeholder="1000-1005"
          mono
        />
        <Input
          label={trans("Prefix suppressor")}
          type="number"
          bind:value={form.supp_prefix}
          placeholder={v6 ? "64" : "24"}
          mono
        />
        <Toggle
          label={trans("Invert match")}
          checked={form.invert === "1"}
          onchange={(v) => (form.invert = v ? "1" : "")}
          description={trans("Invert the sense of the rule matching")}
        />
        <Toggle
          label={trans("Disabled")}
          checked={form.disabled === "1"}
          onchange={(v) => (form.disabled = v ? "1" : "")}
        />
      {/if}
    </div>

    <div
      class={cn(
        "flex",
        "items-center",
        "justify-end",
        "gap-3",
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
          "rounded-lg",
          "font-medium",
          "text-muted",
          "hover:text-fg",
          "transition-all",
          "cursor-pointer",
        )}>{trans("Cancel")}</button
      >
      <button
        onclick={onsave}
        disabled={busy[editing?.section || ""] !== undefined ||
          (!form.target && isRoute)}
        class={cn(
          "px-3",
          "py-1.5",
          "text-xs",
          "font-medium",
          "rounded-lg",
          "transition-all",
          "cursor-pointer",
          "disabled:opacity-30",
          "bg-accent",
          "text-black",
          "hover:opacity-90",
        )}
      >
        <Save size={12} />
        {trans("Save")}
      </button>
    </div>
  </div>
</div>
