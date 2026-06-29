<script lang="ts">
  import { X, Save } from "@lucide/svelte";
  import { cn } from "../../../helpers/classname";
  import Input from "../../../components/Input/Input.svelte";
  import Select from "../../../components/Select/Select.svelte";

  let {
    show,
    name,
    form,
    deviceTypeOptions,
    onclose,
    onsave,
    trans,
  }: {
    show: boolean;
    name: string;
    form: Record<string, any>;
    deviceTypeOptions: { value: string; label: string }[];
    onclose: () => void;
    onsave: () => void;
    trans: (k: string) => string;
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
        "max-w-lg",
        "glass",
        "rounded-xl",
        "p-5",
        "animate-fade-in",
        "shadow-2xl",
      )}
    >
      <div class={cn("flex", "items-center", "justify-between", "mb-4")}>
        <h2 class={cn("text-base", "font-semibold", "text-white")}>
          {trans("Configure Device")}:
          <span class={cn("font-mono", "text-accent")}>{name}</span>
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
        <Select
          label={trans("Type")}
          options={deviceTypeOptions}
          bind:value={form.type}
        />
        <Input
          label={trans("MTU")}
          bind:value={form.mtu}
          placeholder=""
          type="number"
        />
        <Input
          label={trans("MAC Address")}
          bind:value={form.macaddr}
          placeholder=""
          mono
        />
        {#if form.type === "bridge"}
          <Input
            label={trans("Ports")}
            bind:value={form.ports}
            placeholder="eth0 eth1"
            mono
          />
          <div class={cn("grid", "grid-cols-2", "gap-4")}>
            <Input
              label={trans("STP")}
              bind:value={form.stp}
              placeholder="0"
              type="number"
            />
            <Input
              label={trans("Forward delay")}
              bind:value={form.forward_delay}
              placeholder="4"
              type="number"
            />
          </div>
          <div class={cn("grid", "grid-cols-2", "gap-4")}>
            <Input
              label={trans("Priority")}
              bind:value={form.priority}
              placeholder="0x80"
            />
            <Input
              label={trans("Ageing time")}
              bind:value={form.ageing_time}
              placeholder="300"
              type="number"
            />
          </div>
          <div class={cn("grid", "grid-cols-2", "gap-4")}>
            <Input
              label={trans("Hello time")}
              bind:value={form.hello_time}
              placeholder="2"
              type="number"
            />
            <Input
              label={trans("Max age")}
              bind:value={form.max_age}
              placeholder="20"
              type="number"
            />
          </div>
          <Input
            label={trans("IGMP snooping")}
            bind:value={form.igmp_snooping}
            placeholder="0"
            type="number"
          />
          <Input
            label={trans("VLAN filtering")}
            bind:value={form.vlan_filtering}
            placeholder="0"
            type="number"
          />
          <div class={cn("grid", "grid-cols-2", "gap-4")}>
            <Input
              label={trans("Default PVID")}
              bind:value={form.vlan_default_pvid}
              placeholder="1"
              type="number"
            />
            <Input
              label={trans("VLAN stats per port")}
              bind:value={form.vlan_stats_per_port}
              placeholder="0"
              type="number"
            />
          </div>
        {/if}
        <div class={cn("grid", "grid-cols-2", "gap-4")}>
          <Input
            label={trans("Override IPv4 routing table")}
            bind:value={form.ip4table}
            placeholder="main"
          />
          <Input
            label={trans("Override IPv6 routing table")}
            bind:value={form.ip6table}
            placeholder="main"
          />
        </div>
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
          onclick={onsave}
          class={cn(
            "inline-flex",
            "items-center",
            "gap-1.5",
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
          )}
        >
          <Save size={14} />
          {trans("Save")}
        </button>
      </div>
    </div>
  </div>
{/if}
