<script lang="ts">
  import { cn } from "../../../../helpers/classname";
  import Toggle from "../../../../components/Toggle/Toggle.svelte";
  import Select from "../../../../components/Select/Select.svelte";
  import Input from "../../../../components/Input/Input.svelte";

  interface Props {
    trans?: (k: string) => string;
    feedKeys?: string[];
    countryOptions?: { value: string; label: string }[];
    ban_feed?: string[];
    ban_country?: string[];
    ban_region?: string[];
    ban_countrysplit?: boolean;
    ban_asn?: string[];
    ban_asnsplit?: boolean;
    ban_allowurl?: string[];
    ban_autoallowlist?: boolean;
    ban_autoallowuplink?: string;
    ban_autoblocklist?: boolean;
    ban_autoblocksubnet?: boolean;
    ban_nftexpiry?: string;
    ban_allowlistonly?: boolean;
    ban_asn_input?: string;
    ban_allowurl_input?: string;
  }

  let {
    trans = (k: string) => k,
    feedKeys = $bindable([] as string[]),
    countryOptions = $bindable([] as { value: string; label: string }[]),
    ban_feed = $bindable([] as string[]),
    ban_country = $bindable([] as string[]),
    ban_region = $bindable([] as string[]),
    ban_countrysplit = $bindable(false),
    ban_asn = $bindable([] as string[]),
    ban_asnsplit = $bindable(false),
    ban_allowurl = $bindable([] as string[]),
    ban_autoallowlist = $bindable(true),
    ban_autoallowuplink = $bindable(""),
    ban_autoblocklist = $bindable(true),
    ban_autoblocksubnet = $bindable(false),
    ban_nftexpiry = $bindable(""),
    ban_allowlistonly = $bindable(false),
    ban_asn_input = $bindable(""),
    ban_allowurl_input = $bindable(""),
  }: Props = $props();
</script>

<div class={cn("flex", "items-center", "gap-2")}>
  <span
    class={cn(
      "text-[10px]",
      "uppercase",
      "text-muted",
      "font-semibold",
      "tracking-wider",
    )}>{trans("Feed Selection")}</span
  >
</div>
<div class={cn("h-px", "bg-border")}></div>
<p class={cn("text-[10px]", "text-muted", "text-center")}>
  {trans("Changes on this tab needs a banIP service reload to take effect.")}
</p>
<div class={cn("h-px", "bg-border")}></div>

<p class={cn("text-[10px]", "font-semibold", "text-fg")}>
  {trans("External Blocklist Feeds")}
</p>

{#if feedKeys.length}
  <div class={cn("grid", "grid-cols-2", "gap-x-4", "gap-y-1")}>
    {#each feedKeys as feed}
      <label
        class={cn(
          "flex",
          "items-center",
          "gap-2",
          "cursor-pointer",
          "select-none",
          "py-0.5",
        )}
      >
        <input
          type="checkbox"
          checked={ban_feed.includes(feed)}
          onchange={() => {
            ban_feed = ban_feed.includes(feed)
              ? ban_feed.filter((f) => f !== feed)
              : [...ban_feed, feed];
          }}
          class={cn(
            "accent-(--accent)",
            "w-3.5",
            "h-3.5",
            "rounded",
            "cursor-pointer",
          )}
        />
        <span class={cn("text-xs", "text-fg")}>{feed}</span>
      </label>
    {/each}
  </div>
{:else}
  <p class={cn("text-[10px]", "text-muted", "italic")}>
    {trans("No feeds available")}
  </p>
{/if}

<div class={cn("h-px", "bg-border")}></div>
<p class={cn("text-[10px]", "font-semibold", "text-fg")}>
  {trans("Country Selection")}
</p>

{#if countryOptions.length}
  <div class={cn("grid", "grid-cols-2", "gap-x-4", "gap-y-1")}>
    {#each countryOptions as opt}
      <label
        class={cn(
          "flex",
          "items-center",
          "gap-2",
          "cursor-pointer",
          "select-none",
          "py-0.5",
        )}
      >
        <input
          type="checkbox"
          checked={ban_country.includes(opt.value)}
          onchange={() => {
            ban_country = ban_country.includes(opt.value)
              ? ban_country.filter((c) => c !== opt.value)
              : [...ban_country, opt.value];
          }}
          class={cn(
            "accent-(--accent)",
            "w-3.5",
            "h-3.5",
            "rounded",
            "cursor-pointer",
          )}
        />
        <span class={cn("text-xs", "text-fg")}>{opt.label}</span>
      </label>
    {/each}
  </div>
{:else}
  <p class={cn("text-[10px]", "text-muted", "italic")}>
    {trans("No countries available")}
  </p>
{/if}

<div>
  <p class={cn("text-[10px]", "font-semibold", "text-fg", "mb-1")}>
    {trans("Regional Internet Registry")}
  </p>
  <p class={cn("text-[10px]", "text-muted", "mb-2")}>
    {trans(
      "Summary of countries based on the Regional Internet Registry (RIR).",
    )}
  </p>
  <div class={cn("grid", "grid-cols-1", "gap-y-0.5")}>
    {#each ["AFRINIC", "APNIC", "ARIN", "LACNIC", "RIPE"] as rir}
      <label
        class={cn(
          "flex",
          "items-center",
          "gap-2",
          "cursor-pointer",
          "select-none",
          "py-0.5",
        )}
      >
        <input
          type="checkbox"
          checked={ban_region.includes(rir)}
          onchange={() => {
            ban_region = ban_region.includes(rir)
              ? ban_region.filter((r) => r !== rir)
              : [...ban_region, rir];
          }}
          class={cn(
            "accent-(--accent)",
            "w-3.5",
            "h-3.5",
            "rounded",
            "cursor-pointer",
          )}
        />
        <span class={cn("text-xs", "text-fg")}>{rir}</span>
      </label>
    {/each}
  </div>
</div>
<Toggle
  label={trans("Split Country Set")}
  description={trans("The selected Countries are stored in separate Sets.")}
  bind:checked={ban_countrysplit}
/>

<div class={cn("h-px", "bg-border")}></div>
<p class={cn("text-[10px]", "font-semibold", "text-fg")}>
  {trans("ASN Selection")}
</p>
<div>
  <p class={cn("text-[10px]", "text-muted", "mb-2")}>
    {trans("Collection of IP addresses based on Autonomous System Numbers.")}
  </p>
  <div class={cn("space-y-1", "mb-1")}>
    {#each ban_asn as item, i}
      <div class={cn("flex", "items-center", "gap-1")}>
        <input
          readonly
          value={item}
          class={cn(
            "flex-1",
            "px-2.5",
            "py-1",
            "border",
            "text-xs",
            "rounded-md",
            "bg-surface-2",
            "outline-none",
            "text-fg",
            "border-border",
            "cursor-default",
          )}
        />
        <button
          type="button"
          onclick={() => {
            ban_asn = ban_asn.toSpliced(i, 1);
          }}
          class={cn(
            "px-1.5",
            "py-1",
            "text-[10px]",
            "rounded",
            "text-danger",
            "hover:bg-danger/10",
            "transition-colors",
            "cursor-pointer",
          )}>{trans("Remove")}</button
        >
      </div>
    {/each}
  </div>
  <div class={cn("flex", "items-center", "gap-1")}>
    <input
      bind:value={ban_asn_input}
      placeholder="AS1234"
      class={cn(
        "flex-1",
        "px-2.5",
        "py-1",
        "border",
        "text-xs",
        "rounded-md",
        "bg-surface",
        "outline-none",
        "text-fg",
        "border-border",
        "focus:border-(--accent)",
      )}
      onkeydown={(e) => {
        if (e.key === "Enter" && ban_asn_input.trim()) {
          e.preventDefault();
          ban_asn = [...ban_asn, ban_asn_input.trim()];
          ban_asn_input = "";
        }
      }}
    />
    <button
      type="button"
      disabled={!ban_asn_input.trim()}
      onclick={() => {
        if (ban_asn_input.trim()) {
          ban_asn = [...ban_asn, ban_asn_input.trim()];
          ban_asn_input = "";
        }
      }}
      class={cn(
        "px-2",
        "py-1",
        "text-[10px]",
        "rounded-md",
        "bg-accent",
        "text-surface",
        "font-medium",
        "disabled:opacity-40",
        "cursor-pointer",
      )}>+</button
    >
  </div>
</div>
<Toggle
  label={trans("Split ASN Set")}
  description={trans("The selected ASNs are stored in separate Sets.")}
  bind:checked={ban_asnsplit}
/>

<div class={cn("h-px", "bg-border")}></div>
<p class={cn("text-[10px]", "font-semibold", "text-fg")}>
  {trans("External Allowlist Feeds")}
</p>
<div>
  {#if countryOptions.length}
    <div class={cn("space-y-1", "mb-1")}>
      {#each ban_allowurl as item, i}
        <div class={cn("flex", "items-center", "gap-1")}>
          <input
            readonly
            value={item}
            class={cn(
              "flex-1",
              "px-2.5",
              "py-1",
              "border",
              "text-xs",
              "rounded-md",
              "bg-surface-2",
              "outline-none",
              "text-fg",
              "border-border",
              "cursor-default",
            )}
          />
          <button
            type="button"
            onclick={() => {
              ban_allowurl = ban_allowurl.toSpliced(i, 1);
            }}
            class={cn(
              "px-1.5",
              "py-1",
              "text-[10px]",
              "rounded",
              "text-danger",
              "hover:bg-danger/10",
              "transition-colors",
              "cursor-pointer",
            )}>{trans("Remove")}</button
          >
        </div>
      {/each}
    </div>
    <div class={cn("flex", "items-center", "gap-1")}>
      <input
        bind:value={ban_allowurl_input}
        placeholder="https://..."
        class={cn(
          "flex-1",
          "px-2.5",
          "py-1",
          "border",
          "text-xs",
          "rounded-md",
          "bg-surface",
          "outline-none",
          "text-fg",
          "border-border",
          "focus:border-(--accent)",
        )}
        onkeydown={(e) => {
          if (e.key === "Enter" && ban_allowurl_input.trim()) {
            e.preventDefault();
            ban_allowurl = [...ban_allowurl, ban_allowurl_input.trim()];
            ban_allowurl_input = "";
          }
        }}
      />
      <button
        type="button"
        disabled={!ban_allowurl_input.trim()}
        onclick={() => {
          if (ban_allowurl_input.trim()) {
            ban_allowurl = [...ban_allowurl, ban_allowurl_input.trim()];
            ban_allowurl_input = "";
          }
        }}
        class={cn(
          "px-2",
          "py-1",
          "text-[10px]",
          "rounded-md",
          "bg-accent",
          "text-surface",
          "font-medium",
          "disabled:opacity-40",
          "cursor-pointer",
        )}>+</button
      >
    </div>
  {:else}
    <p class={cn("text-[10px]", "text-muted", "italic")}>
      {trans("No countries data loaded")}
    </p>
  {/if}
</div>

<div class={cn("h-px", "bg-border")}></div>
<p class={cn("text-[10px]", "font-semibold", "text-fg")}>
  {trans("Local Feed Settings")}
</p>
<Toggle
  label={trans("Auto Allowlist")}
  description={trans(
    "Automatically add resolved domains and uplink IPs to the local allowlist.",
  )}
  bind:checked={ban_autoallowlist}
/>
{#if ban_autoallowlist}
  <Select
    label={trans("Auto Allow Uplink")}
    bind:value={ban_autoallowuplink}
    options={[
      { value: "", label: trans("-- default --") },
      { value: "disable", label: trans("Disable") },
      { value: "subnet", label: trans("Subnet") },
      { value: "ip", label: trans("IP") },
    ]}
  />
{/if}
<Toggle
  label={trans("Auto Blocklist")}
  description={trans(
    "Automatically add resolved domains and suspicious IPs to the local blocklist.",
  )}
  bind:checked={ban_autoblocklist}
/>
<Toggle
  label={trans("Auto Block Subnet")}
  description={trans("Automatically add entire subnets based on RDAP request.")}
  bind:checked={ban_autoblocksubnet}
/>
<Input
  label={trans("Blocklist Set Expiry")}
  bind:value={ban_nftexpiry}
  placeholder="5m"
/>
<Toggle
  label={trans("Allowlist Only")}
  description={trans(
    "Restrict the internet access from/to a small number of secure IPs.",
  )}
  bind:checked={ban_allowlistonly}
/>
