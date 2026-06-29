<script lang="ts">
  import { cn } from "../../../../helpers/classname";
  import Toggle from "../../../../components/Toggle/Toggle.svelte";
  import Select from "../../../../components/Select/Select.svelte";
  import Input from "../../../../components/Input/Input.svelte";

  interface Props {
    trans?: (k: string) => string;
    ban_enabled?: boolean;
    ban_debug?: boolean;
    ban_autodetect?: boolean;
    ban_protov4?: boolean;
    ban_protov6?: boolean;
    ban_dev?: string[];
    ban_ifv4?: string[];
    ban_ifv6?: string[];
    ban_fetchcmd?: string;
    ban_fetchparm?: string;
    ban_trigger?: string[];
    ban_triggerdelay?: string;
    ban_fetchretry?: string;
    ban_fetchinsecure?: boolean;
    ban_nftcount?: boolean;
    ban_map?: boolean;
    ban_dev_input?: string;
    ban_ifv4_input?: string;
    ban_ifv6_input?: string;
    ban_trigger_input?: string;
  }

  let {
    trans = (k: string) => k,
    ban_enabled = $bindable(false),
    ban_debug = $bindable(false),
    ban_autodetect = $bindable(true),
    ban_protov4 = $bindable(true),
    ban_protov6 = $bindable(true),
    ban_dev = $bindable([] as string[]),
    ban_ifv4 = $bindable([] as string[]),
    ban_ifv6 = $bindable([] as string[]),
    ban_fetchcmd = $bindable(""),
    ban_fetchparm = $bindable(""),
    ban_trigger = $bindable([] as string[]),
    ban_triggerdelay = $bindable(""),
    ban_fetchretry = $bindable(""),
    ban_fetchinsecure = $bindable(false),
    ban_nftcount = $bindable(false),
    ban_map = $bindable(false),
    ban_dev_input = $bindable(""),
    ban_ifv4_input = $bindable(""),
    ban_ifv6_input = $bindable(""),
    ban_trigger_input = $bindable(""),
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
    )}>{trans("General Settings")}</span
  >
</div>
<div class={cn("h-px", "bg-border")}></div>
<p class={cn("text-[10px]", "text-muted")}>
  {trans("Changes on this tab needs a banIP service restart to take effect.")}
</p>
<div class={cn("h-px", "bg-border")}></div>

<Toggle
  label={trans("Enabled")}
  description={trans("Enable the banIP service.")}
  bind:checked={ban_enabled}
/>
<Toggle
  label={trans("Verbose Debug Logging")}
  description={trans(
    "Enable verbose debug logging in case of processing errors.",
  )}
  bind:checked={ban_debug}
/>
<Toggle
  label={trans("Auto Detection")}
  description={trans(
    "Detect relevant network devices, interfaces, subnets, protocols and utilities automatically.",
  )}
  bind:checked={ban_autodetect}
/>

{#if !ban_autodetect}
  <div class={cn("h-px", "bg-border")}></div>
  <div class={cn("grid", "grid-cols-2", "gap-4")}>
    <Toggle
      label={trans("IPv4 Support")}
      description={trans("Enables IPv4 support.")}
      bind:checked={ban_protov4}
    />
    <Toggle
      label={trans("IPv6 Support")}
      description={trans("Enables IPv6 support.")}
      bind:checked={ban_protov6}
    />
  </div>

  <div>
    <span
      class={cn(
        "block",
        "text-[10px]",
        "uppercase",
        "text-muted",
        "font-semibold",
        "tracking-wider",
        "mb-2",
      )}>{trans("Network Devices")}</span
    >
    <p class={cn("text-[10px]", "text-muted", "mb-2")}>
      {trans("Select the WAN network device(s).")}
    </p>
    <div class={cn("space-y-1", "mb-1")}>
      {#each ban_dev as item, i}
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
              ban_dev = ban_dev.toSpliced(i, 1);
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
        bind:value={ban_dev_input}
        placeholder="eth0"
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
          if (e.key === "Enter" && ban_dev_input.trim()) {
            e.preventDefault();
            ban_dev = [...ban_dev, ban_dev_input.trim()];
            ban_dev_input = "";
          }
        }}
      />
      <button
        type="button"
        disabled={!ban_dev_input.trim()}
        onclick={() => {
          if (ban_dev_input.trim()) {
            ban_dev = [...ban_dev, ban_dev_input.trim()];
            ban_dev_input = "";
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

  <div>
    <span
      class={cn(
        "block",
        "text-[10px]",
        "uppercase",
        "text-muted",
        "font-semibold",
        "tracking-wider",
        "mb-2",
      )}>{trans("IPv4 Network Interfaces")}</span
    >
    <p class={cn("text-[10px]", "text-muted", "mb-2")}>
      {trans("Select the logical WAN IPv4 network interface(s).")}
    </p>
    <div class={cn("space-y-1", "mb-1")}>
      {#each ban_ifv4 as item, i}
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
              ban_ifv4 = ban_ifv4.toSpliced(i, 1);
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
        bind:value={ban_ifv4_input}
        placeholder="wan"
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
          if (e.key === "Enter" && ban_ifv4_input.trim()) {
            e.preventDefault();
            ban_ifv4 = [...ban_ifv4, ban_ifv4_input.trim()];
            ban_ifv4_input = "";
          }
        }}
      />
      <button
        type="button"
        disabled={!ban_ifv4_input.trim()}
        onclick={() => {
          if (ban_ifv4_input.trim()) {
            ban_ifv4 = [...ban_ifv4, ban_ifv4_input.trim()];
            ban_ifv4_input = "";
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

  <div>
    <span
      class={cn(
        "block",
        "text-[10px]",
        "uppercase",
        "text-muted",
        "font-semibold",
        "tracking-wider",
        "mb-2",
      )}>{trans("IPv6 Network Interfaces")}</span
    >
    <p class={cn("text-[10px]", "text-muted", "mb-2")}>
      {trans("Select the logical WAN IPv6 network interface(s).")}
    </p>
    <div class={cn("space-y-1", "mb-1")}>
      {#each ban_ifv6 as item, i}
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
              ban_ifv6 = ban_ifv6.toSpliced(i, 1);
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
        bind:value={ban_ifv6_input}
        placeholder="wan6"
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
          if (e.key === "Enter" && ban_ifv6_input.trim()) {
            e.preventDefault();
            ban_ifv6 = [...ban_ifv6, ban_ifv6_input.trim()];
            ban_ifv6_input = "";
          }
        }}
      />
      <button
        type="button"
        disabled={!ban_ifv6_input.trim()}
        onclick={() => {
          if (ban_ifv6_input.trim()) {
            ban_ifv6 = [...ban_ifv6, ban_ifv6_input.trim()];
            ban_ifv6_input = "";
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

  <Select
    label={trans("Download Utility")}
    bind:value={ban_fetchcmd}
    options={[
      { value: "", label: trans("-- default --") },
      { value: "uclient-fetch", label: "uclient-fetch" },
      { value: "wget", label: "wget" },
      { value: "curl", label: "curl" },
    ]}
  />
  <Input
    label={trans("Download Parameters")}
    bind:value={ban_fetchparm}
    placeholder={trans("Override pre-configured options")}
  />
  <div class={cn("h-px", "bg-border")}></div>
{/if}

<div>
  <span
    class={cn(
      "block",
      "text-[10px]",
      "uppercase",
      "text-muted",
      "font-semibold",
      "tracking-wider",
      "mb-2",
    )}>{trans("Startup Trigger Interface")}</span
  >
  <p class={cn("text-[10px]", "text-muted", "mb-2")}>
    {trans("Interface(s) that trigger the processing of banIP.")}
  </p>
  <div class={cn("space-y-1", "mb-1")}>
    {#each ban_trigger as item, i}
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
            ban_trigger = ban_trigger.toSpliced(i, 1);
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
      bind:value={ban_trigger_input}
      placeholder="wan"
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
        if (e.key === "Enter" && ban_trigger_input.trim()) {
          e.preventDefault();
          ban_trigger = [...ban_trigger, ban_trigger_input.trim()];
          ban_trigger_input = "";
        }
      }}
    />
    <button
      type="button"
      disabled={!ban_trigger_input.trim()}
      onclick={() => {
        if (ban_trigger_input.trim()) {
          ban_trigger = [...ban_trigger, ban_trigger_input.trim()];
          ban_trigger_input = "";
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
<Input
  label={trans("Trigger Delay")}
  bind:value={ban_triggerdelay}
  placeholder="10"
  type="number"
/>
<Select
  label={trans("Download Retries")}
  bind:value={ban_fetchretry}
  options={[
    { value: "", label: trans("-- default --") },
    { value: "1", label: "1" },
    { value: "3", label: "3" },
    { value: "5", label: "5" },
    { value: "10", label: "10" },
    { value: "20", label: "20" },
  ]}
/>
<Toggle
  label={trans("Download Insecure")}
  description={trans("Don't check SSL server certificates during download.")}
  bind:checked={ban_fetchinsecure}
/>
<Toggle
  label={trans("Reporting Counters")}
  description={trans("Enable NFT counters for Set elements and chain rules.")}
  bind:checked={ban_nftcount}
/>
{#if ban_nftcount}
  <Toggle
    label={trans("Enable GeoIP Map")}
    description={trans("Enable a GeoIP Map with suspicious Set elements.")}
    bind:checked={ban_map}
  />
{/if}
