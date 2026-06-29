<script lang="ts">
  import { X, Save } from "@lucide/svelte";
  import { cn } from "../../../helpers/classname";
  import Input from "../../../components/Input/Input.svelte";
  import Toggle from "../../../components/Toggle/Toggle.svelte";
  import Select from "../../../components/Select/Select.svelte";
  import TabBar from "../../../components/TabBar/TabBar.svelte";
  import EditGeneralPanel from "./EditGeneralPanel.svelte";
  import EditAdvancedPanel from "./EditAdvancedPanel.svelte";
  import EditDhcpPanel from "./EditDhcpPanel.svelte";
  import type { DeviceStatus, Iface } from "../types";

  let {
    show,
    ifc,
    dev,
    editingIface,
    editTab,
    editForm,
    editSaved,
    editTabs,
    dhcpSubTab,
    dhcpSec,
    zoneOptions,
    protocols,
    multipathOptions,
    leasetimeOptions,
    dhcpv4Options,
    raServiceOptions,
    dhcpv6ServiceOptions,
    ndpProxyOptions,
    raDefaultOptions,
    raPreferenceOptions,
    raFlagsOptions,
    raPioFlagsOptions,
    lifetimeOptions,
    onclose,
    onsave,
    onsetupdhcp,
    onedittabchange,
    ondhcpsubtabchange,
    trans,
  }: {
    show: boolean;
    ifc: Iface | null;
    dev: DeviceStatus | null;
    editingIface: string;
    editTab: string;
    editForm: Record<string, any>;
    editSaved: boolean;
    editTabs: { id: string; label: string }[];
    dhcpSubTab: string;
    dhcpSec: any;
    zoneOptions: { value: string; label: string }[];
    protocols: { value: string; label: string }[];
    multipathOptions: { value: string; label: string }[];
    leasetimeOptions: { value: string; label: string }[];
    dhcpv4Options: { value: string; label: string }[];
    raServiceOptions: { value: string; label: string }[];
    dhcpv6ServiceOptions: { value: string; label: string }[];
    ndpProxyOptions: { value: string; label: string }[];
    raDefaultOptions: { value: string; label: string }[];
    raPreferenceOptions: { value: string; label: string }[];
    raFlagsOptions: { value: string; label: string }[];
    raPioFlagsOptions: { value: string; label: string }[];
    lifetimeOptions: { value: string; label: string }[];
    onclose: () => void;
    onsave: () => void;
    onsetupdhcp: () => void;
    onedittabchange: (id: string) => void;
    ondhcpsubtabchange: (id: string) => void;
    trans: (k: string) => string;
  } = $props();

  import { Network } from "@lucide/svelte";
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
        "max-w-3xl",
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
        <div class={cn("flex", "items-center", "gap-3")}>
          <Network size={18} class={ifc?.up ? "text-accent" : "text-muted"} />
          <div>
            <h2 class={cn("text-base", "font-semibold", "text-white")}>
              {trans("Interfaces")} »
              <span class={cn("font-mono", "text-accent")}>{editingIface}</span>
            </h2>
            <p
              class={cn(
                "text-[11px]",
                ifc?.up ? "text-accent" : "text-muted",
                "mt-0.5",
              )}
            >
              {ifc?.up ? trans("Interface is up") : trans("Interface is down")}
            </p>
          </div>
        </div>
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

      <TabBar tabs={editTabs} active={editTab} onchange={onedittabchange} />

      <div class={cn("mt-4", "space-y-4")}>
        {#key editTab}
          {#if editTab === "general"}
            <EditGeneralPanel {ifc} {dev} form={editForm} {protocols} {trans} />
          {:else if editTab === "advanced"}
            <EditAdvancedPanel form={editForm} {multipathOptions} {trans} />
          {:else if editTab === "physical"}
            <div class={cn("space-y-4")}>
              <div class={cn("h-px", "bg-border")}></div>
              <Toggle
                label={trans("Bridge interfaces")}
                description={trans(
                  "Creates a bridge over specified interfaces",
                )}
                bind:checked={editForm.bridge}
              />
              {#if editForm.bridge}
                <Input
                  label={trans("Bridge ports")}
                  bind:value={editForm.ports}
                  placeholder="eth0 eth1"
                  mono
                />
                <p class={cn("text-[10px]", "text-muted", "italic", "-mt-3")}>
                  {trans("Space-separated list of interfaces to bridge")}
                </p>
              {:else}
                <Input
                  label={trans("Device")}
                  bind:value={editForm.device}
                  placeholder="eth0.2"
                  mono
                />
              {/if}
            </div>
          {:else if editTab === "brport"}
            <div class={cn("space-y-4")}>
              {#if editForm.bridge}
                <div class={cn("h-px", "bg-border")}></div>
                <p class={cn("text-[10px]", "text-muted", "italic")}>
                  {trans(
                    "Bridge port specific options control STP and bridge port behavior.",
                  )}
                </p>
                <div class={cn("grid", "grid-cols-2", "gap-4")}>
                  <Input
                    label={trans("STP")}
                    bind:value={editForm.stp}
                    placeholder="0"
                    type="number"
                  />
                  <Input
                    label={trans("Forward delay")}
                    bind:value={editForm.forward_delay}
                    placeholder="4"
                    type="number"
                  />
                </div>
                <div class={cn("grid", "grid-cols-2", "gap-4")}>
                  <Input
                    label={trans("Priority")}
                    bind:value={editForm.priority}
                    placeholder="0x80"
                  />
                  <Input
                    label={trans("Ageing time")}
                    bind:value={editForm.ageing_time}
                    placeholder="300"
                    type="number"
                  />
                </div>
                <div class={cn("grid", "grid-cols-2", "gap-4")}>
                  <Input
                    label={trans("Hello time")}
                    bind:value={editForm.hello_time}
                    placeholder="2"
                    type="number"
                  />
                  <Input
                    label={trans("Max age")}
                    bind:value={editForm.max_age}
                    placeholder="20"
                    type="number"
                  />
                </div>
              {:else}
                <p class={cn("text-xs", "text-muted", "italic")}>
                  {trans(
                    "Bridge port options are only available for bridge interfaces.",
                  )}
                </p>
              {/if}
            </div>
          {:else if editTab === "bridgevlan"}
            <div class={cn("space-y-4")}>
              {#if editForm.bridge}
                <div class={cn("h-px", "bg-border")}></div>
                <p class={cn("text-[10px]", "text-muted", "italic")}>
                  {trans("Bridge VLAN filtering options.")}
                </p>
                <Input
                  label={trans("VLAN filtering")}
                  bind:value={editForm.vlan_filtering}
                  placeholder="0"
                  type="number"
                />
                <div class={cn("grid", "grid-cols-2", "gap-4")}>
                  <Input
                    label={trans("Default PVID")}
                    bind:value={editForm.vlan_default_pvid}
                    placeholder="1"
                    type="number"
                  />
                  <Input
                    label={trans("VLAN stats per port")}
                    bind:value={editForm.vlan_stats_per_port}
                    placeholder="0"
                    type="number"
                  />
                </div>
              {:else}
                <p class={cn("text-xs", "text-muted", "italic")}>
                  {trans(
                    "Bridge VLAN filtering options are only available for bridge interfaces.",
                  )}
                </p>
              {/if}
            </div>
          {:else if editTab === "firewall"}
            <div class={cn("space-y-4")}>
              <div class={cn("h-px", "bg-border")}></div>
              <Select
                label={trans("Create / Assign firewall-zone")}
                options={zoneOptions}
                bind:value={editForm.zone}
                placeholder={trans("unspecified")}
              />
              <p class={cn("text-[10px]", "text-muted", "italic")}>
                {trans(
                  "Choose the firewall zone you want to assign to this interface. Select unspecified to remove the interface from the associated zone.",
                )}
              </p>
            </div>
          {:else if editTab === "dhcp"}
            <EditDhcpPanel
              form={editForm}
              proto={editForm.proto}
              {dhcpSec}
              {dhcpSubTab}
              {leasetimeOptions}
              {dhcpv4Options}
              {raServiceOptions}
              {dhcpv6ServiceOptions}
              {ndpProxyOptions}
              {raDefaultOptions}
              {raPreferenceOptions}
              {raFlagsOptions}
              {raPioFlagsOptions}
              {lifetimeOptions}
              onsubtabchange={ondhcpsubtabchange}
              {onsetupdhcp}
              {trans}
            />
          {/if}
        {/key}
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
        {#if editSaved}
          <span class={cn("text-xs", "text-accent", "font-medium")}
            >{trans("Settings saved!")}</span
          >
        {/if}
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
