<script lang="ts">
  // Deps
  import { Plus, X } from "@lucide/svelte";

  // Helpers
  import { cn } from "../../../helpers/classname";
  import { getLocale, onLocaleChange, t } from "../../../i18n";

  // Components
  import Input from "../../../components/Input/Input.svelte";
  import Select from "../../../components/Select/Select.svelte";
  import Toggle from "../../../components/Toggle/Toggle.svelte";

  // Props
  let { dnsForm, labelCls, rmList, updateList, addList, newItems } = $props<{
    dnsForm: Record<string, string | boolean | string[]>;
    labelCls: string;
    rmList: (key: string, index: number) => void;
    updateList: (key: string, index: number, value: string) => void;
    addList: (key: string) => void;
    newItems: Record<string, string>;
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
  <label class={labelCls}>{trans("DNS Forwards")}</label>
  <p class={cn("text-xs", "text-muted", "mb-1")}>
    {trans("Forward specific domain queries to specific upstream servers.")}
  </p>
  {#each dnsForm.server as item, i}
    <div class={cn("flex", "items-center", "gap-1.5", "mb-1")}>
      <input
        type="text"
        value={item}
        oninput={(e) => updateList("server", i, e.currentTarget.value)}
        placeholder="/*.example.org/10.1.2.3"
        class={cn(
          "flex-1",
          "px-2.5",
          "py-1.5",
          "border",
          "text-xs",
          "text-fg",
          "font-mono",
          "rounded-md",
          "bg-surface",
          "outline-none",
          "transition-all",
          "border-border",
          "focus:border-(--accent)",
        )}
      />
      <button
        onclick={() => rmList("server", i)}
        class={cn(
          "p-1.5",
          "rounded",
          "shrink-0",
          "text-muted",
          "cursor-pointer",
          "hover:text-danger",
        )}
      >
        <X size={12} />
      </button>
    </div>
  {/each}
  <div class={cn("flex", "items-center", "gap-1.5")}>
    <input
      type="text"
      bind:value={newItems.server}
      onkeydown={(e) => {
        if (e.key === "Enter") addList("server");
      }}
      placeholder="/*.example.org/10.1.2.3"
      class={cn(
        "flex-1",
        "px-2.5",
        "py-1.5",
        "border",
        "text-xs",
        "text-fg",
        "font-mono",
        "rounded-md",
        "bg-surface",
        "outline-none",
        "transition-all",
        "border-border",
        "focus:border-(--accent)",
        "placeholder:text-text-muted",
      )}
    />
    <button
      onclick={() => addList("server")}
      class={cn(
        "px-2",
        "flex",
        "gap-1",
        "py-1.5",
        "text-xs",
        "shrink-0",
        "rounded-md",
        "bg-accent",
        "font-medium",
        "items-center",
        "text-black",
        "cursor-pointer",
        "hover:opacity-90",
      )}
    >
      <Plus size={12} />{trans("Add")}
    </button>
  </div>
</div>
<Input
  bind:value={dnsForm.serversfile}
  placeholder="/etc/dnsmasq.servers"
  label={trans("Additional servers file")}
  description={trans(
    "File listing upstream resolvers, optionally domain-specific, e.g. server=1.2.3.4, server=/domain/1.2.3.4.",
  )}
/>
<Select
  label={trans("Add requestor MAC")}
  description={trans(
    "Add the MAC address of the requestor to DNS queries which are forwarded upstream.",
  )}
  bind:value={dnsForm.addmac}
  options={[
    { value: "", label: trans("off") },
    { value: "1", label: trans("enabled (default)") },
    { value: "base64", label: "base64" },
    { value: "text", label: "text" },
  ]}
  placeholder={trans("Select...")}
/>
<Toggle
  label={trans("Remove MAC address before forwarding query")}
  description={trans(
    "Remove any MAC address information already in downstream queries before forwarding upstream.",
  )}
  bind:checked={dnsForm.stripmac}
/>
<Input
  label={trans("Add subnet address to forwards")}
  bind:value={dnsForm.addsubnet}
  placeholder="0,0"
  description={trans(
    "Add a subnet address to the DNS queries which are forwarded upstream, leaving this value empty disables the feature.",
  )}
/>
<Toggle
  label={trans("Remove subnet address before forwarding query")}
  description={trans(
    "Remove any subnet address already present in a downstream query before forwarding it upstream.",
  )}
  bind:checked={dnsForm.stripsubnet}
/>
