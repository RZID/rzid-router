<script lang="ts">
  // Deps
  import { Plus, X } from "@lucide/svelte";

  // Helpers
  import { cn } from "../../../helpers/classname";
  import { t as _t, getLocale, onLocaleChange } from "../../../i18n";

  // Components
  import Input from "../../../components/Input/Input.svelte";
  import Toggle from "../../../components/Toggle/Toggle.svelte";

  // Props
  let { dnsForm, labelCls, updateList, rmList, addList, newItems } = $props<{
    dnsForm: Record<string, any>;
    labelCls?: string;
    updateList: (key: string, index: number, value: string) => void;
    rmList: (key: string, index: number) => void;
    addList: (key: string) => void;
    newItems: Record<string, string>;
  }>();

  // States
  let locale = $state(getLocale());

  // Derives
  let trans = $derived.by(() => {
    locale;
    return (k: string) => _t(k);
  });

  // Effects
  $effect(() =>
    onLocaleChange(() => {
      locale = getLocale();
    }),
  );
</script>

<Input
  bind:value={dnsForm.local}
  label={trans("Resolve these locally")}
  placeholder="/internal.example.com/private.example.com/example.org"
  description={trans(
    "Never forward these matching domains or subdomains; resolve from DHCP or hosts files only.",
  )}
/>
<Input
  placeholder="lan"
  bind:value={dnsForm.domain}
  label={trans("Local domain")}
  description={trans(
    "Local domain suffix appended to DHCP names and hosts file entries.",
  )}
/>
<Toggle
  label={trans("Expand hosts")}
  bind:checked={dnsForm.expandhosts}
  description={trans(
    "Add local domain suffix to names served from hosts files.",
  )}
/>
<div>
  <!-- svelte-ignore a11y_label_has_associated_control -->
  <label class={labelCls}>{trans("Addresses")}</label>
  <p class={cn("text-xs", "text-muted", "mb-1")}>
    {trans("Resolve specified FQDNs to an IP.")}
    <br />{trans("Syntax: /fqdn[/fqdn…]/[ipaddr]")}
    <br />/example.com/ {trans("returns NXDOMAIN.")}
    <br />/#/ {trans("matches any domain (and returns NXDOMAIN).")}
    <br />/example.com/# {trans(
      "returns NULL addresses (0.0.0.0, ::) for example.com and its subdomains.",
    )}
  </p>
  {#each dnsForm.address as item, i}
    <div class={cn("flex", "items-center", "gap-1.5", "mb-1")}>
      <input
        type="text"
        value={item}
        oninput={(e) => updateList("address", i, e.currentTarget.value)}
        placeholder="/router.local/router.lan/192.168.0.1"
        class={cn(
          "flex-1",
          "px-2.5",
          "py-1.5",
          "border",
          "text-xs",
          "text-fg",
          "font-mono",
          "rounded-md",
          "outline-none",
          "bg-surface",
          "duration-150",
          "transition-all",
          "border-border",
          "focus:border-(--accent)",
          "focus:shadow-[0_0_0_1px_var(--accent)]",
        )}
      />
      <button
        onclick={() => rmList("address", i)}
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
      bind:value={newItems.address}
      onkeydown={(e) => {
        if (e.key === "Enter") addList("address");
      }}
      placeholder="/router.local/router.lan/192.168.0.1"
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
        "duration-150",
        "transition-all",
        "border-border",
        "focus:border-(--accent)",
        "placeholder:text-text-muted",
        "focus:shadow-[0_0_0_1px_var(--accent)]",
      )}
    />
    <button
      onclick={() => addList("address")}
      class={cn(
        "flex",
        "px-2",
        "gap-1",
        "py-1.5",
        "text-xs",
        "shrink-0",
        "rounded-md",
        "bg-accent",
        "font-medium",
        "text-black",
        "items-center",
        "cursor-pointer",
        "hover:opacity-90",
      )}
      ><Plus size={12} />
      {trans("Add")}
    </button>
  </div>
</div>
<Toggle
  label={trans("All servers")}
  description={trans(
    "Query all available upstream resolvers. First answer wins.",
  )}
  bind:checked={dnsForm.allservers}
/>
