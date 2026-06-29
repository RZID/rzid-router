<script lang="ts">
  // Deps
  import { Plus, X } from "@lucide/svelte";

  // Helpers
  import { cn } from "../../../helpers/classname";
  import { getLocale, onLocaleChange, t } from "../../../i18n";

  // Components
  import Toggle from "../../../components/Toggle/Toggle.svelte";

  // States
  let locale = $state(getLocale());

  // Derives
  let trans = $derived.by(() => {
    locale;
    return (k: string) => t(k);
  });

  // Hooks
  $effect(() =>
    onLocaleChange(() => {
      locale = getLocale();
    }),
  );

  // Props
  let {
    dnsForm,
    labelCls,
    rmList,
    updateList,
    addList,
    newItems,
    toggleMV,
    recordTypes,
  } = $props<{
    dnsForm: Record<string, string | boolean | string[]>;
    labelCls: string;
    rmList: (key: string, index: number) => void;
    updateList: (key: string, index: number, value: string) => void;
    addList: (key: string) => void;
    newItems: Record<string, string>;
    toggleMV: (key: string, value: string) => void;
    recordTypes: string[];
  }>();
</script>

<Toggle
  label={trans("Domain required")}
  description={trans(
    "Never forward DNS queries which lack dots or domain parts.",
  ) +
    " " +
    trans("Names not in /etc/hosts are answered Not found.")}
  bind:checked={dnsForm.domainneeded}
/>
<Toggle
  label={trans("Rebind protection")}
  description={trans(
    "Discard upstream responses containing RFC1918 addresses.",
  ) +
    " " +
    trans(
      "Discard also upstream responses containing RFC4193, Link-Local and private IPv4-Mapped RFC4291 IPv6 Addresses.",
    )}
  bind:checked={dnsForm.rebind_protection}
/>
{#if dnsForm.rebind_protection}
  <Toggle
    label={trans("Allow localhost")}
    description={trans(
      "Exempt 127.0.0.0/8 and ::1 from rebinding checks, e.g. for RBL services.",
    )}
    bind:checked={dnsForm.rebind_localhost}
  />
  <div>
    <!-- svelte-ignore a11y_label_has_associated_control -->
    <label class={labelCls}>{trans("Domain whitelist")}</label>
    {#each dnsForm.rebind_domain as item, i}
      <div class={cn("flex", "items-center", "gap-1.5", "mb-1")}>
        <input
          type="text"
          value={item}
          oninput={(e) => updateList("rebind_domain", i, e.currentTarget.value)}
          placeholder="ihost.netflix.com"
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
          onclick={() => rmList("rebind_domain", i)}
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
        bind:value={newItems.rebind_domain}
        onkeydown={(e) => {
          if (e.key === "Enter") addList("rebind_domain");
        }}
        placeholder="ihost.netflix.com"
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
        onclick={() => addList("rebind_domain")}
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
      >
        <Plus size={12} />{trans("Add")}
      </button>
    </div>
  </div>
{/if}
<Toggle
  label={trans("Local service only")}
  description={trans(
    "Accept DNS queries only from hosts whose address is on a local subnet.",
  )}
  bind:checked={dnsForm.localservice}
/>
<Toggle
  label={trans("Filter private")}
  description={trans(
    "Reject reverse lookups to RFC6303 IP ranges not in /etc/hosts.",
  )}
  bind:checked={dnsForm.boguspriv}
/>
<Toggle
  label={trans("Filter SRV/SOA service discovery")}
  description={trans(
    "Filters SRV/SOA service discovery, to avoid triggering dial-on-demand links.",
  )}
  bind:checked={dnsForm.filterwin2k}
/>
<Toggle
  label={trans("Filter IPv6 AAAA records")}
  description={trans(
    "Remove IPv6 addresses from the results and only return IPv4 addresses.",
  ) +
    " " +
    trans(
      "Can be useful if ISP has IPv6 nameservers but does not provide IPv6 routing.",
    )}
  bind:checked={dnsForm.filter_aaaa}
/>
<Toggle
  label={trans("Filter IPv4 A records")}
  description={trans(
    "Remove IPv4 addresses from the results and only return IPv6 addresses.",
  )}
  bind:checked={dnsForm.filter_a}
/>
<div>
  <!-- svelte-ignore a11y_label_has_associated_control -->
  <label class={cn(labelCls, "mb-2")}>{trans("Filter arbitrary RR")}</label>
  <p class={cn("text-xs", "text-muted", "mb-2")}>
    {trans("Removes records of the specified type(s) from answers.")}
  </p>
  <div class={cn("flex", "flex-wrap", "gap-1.5")}>
    {#each recordTypes as t}
      {@const active = (dnsForm.filter_rr as string[]).includes(t)}
      <label
        class={cn(
          "py-1",
          "border",
          "px-2.5",
          "gap-1.5",
          "text-xs",
          "font-mono",
          "rounded-md",
          "select-none",
          "inline-flex",
          "items-center",
          "duration-150",
          "cursor-pointer",
          "transition-all",
          active
            ? cn("bg-accent/15", "text-accent", "border-accent/30")
            : cn(
                "text-muted",
                "bg-surface",
                "hover:text-fg",
                "border-border",
                "hover:border-white/30",
              ),
        )}
      >
        <input
          type="checkbox"
          checked={active}
          onchange={() => toggleMV("filter_rr", t)}
          class={cn("accent-(--accent)", "w-3", "h-3")}
        />
        <span>{t}</span>
      </label>
    {/each}
  </div>
</div>
<Toggle
  label={trans("Localise queries")}
  description={trans(
    "Limit response records (from /etc/hosts) to those that fall within the subnet of the querying interface.",
  ) +
    " " +
    trans("Note: IPv4 only.")}
  bind:checked={dnsForm.localise_queries}
/>
<Toggle
  label={trans("No negative cache")}
  description={trans(
    "Do not cache negative replies, e.g. for non-existent domains.",
  )}
  bind:checked={dnsForm.nonegcache}
/>
<div>
  <!-- svelte-ignore a11y_label_has_associated_control -->
  <label class={labelCls}>{trans("IPs to override with NXDOMAIN")}</label>
  {#each dnsForm.bogusnxdomain as item, i}
    <div class={cn("flex", "items-center", "gap-1.5", "mb-1")}>
      <input
        type="text"
        value={item}
        oninput={(e) => updateList("bogusnxdomain", i, e.currentTarget.value)}
        placeholder="64.94.110.11"
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
        onclick={() => rmList("bogusnxdomain", i)}
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
      bind:value={newItems.bogusnxdomain}
      onkeydown={(e) => {
        if (e.key === "Enter") addList("bogusnxdomain");
      }}
      placeholder="64.94.110.11"
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
      onclick={() => addList("bogusnxdomain")}
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
