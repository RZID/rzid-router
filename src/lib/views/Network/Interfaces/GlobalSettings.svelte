<script lang="ts">
  import { Save, RefreshCw } from "@lucide/svelte";
  import { cn } from "../../../helpers/classname";
  import Input from "../../../components/Input/Input.svelte";
  import Toggle from "../../../components/Toggle/Toggle.svelte";
  import Select from "../../../components/Select/Select.svelte";

  let {
    form,
    saving,
    onsave,
    trans,
  }: {
    form: Record<string, any>;
    saving: boolean;
    onsave: () => void;
    trans: (k: string) => string;
  } = $props();
</script>

<div class={cn("glass", "rounded-xl", "p-5")}>
  <div class={cn("space-y-5")}>
    <div class={cn("flex", "items-center", "justify-between")}>
      <h3 class={cn("text-xs", "font-semibold", "text-fg")}>
        {trans("Global network options")}
      </h3>
      <button
        onclick={onsave}
        disabled={saving}
        class={cn(
          "inline-flex",
          "items-center",
          "gap-1",
          "px-2.5",
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
        )}
      >
        {#if saving}<RefreshCw
            size={14}
            class={cn("animate-spin")}
          />{:else}<Save size={14} />{/if}
        {trans("Save")}
      </button>
    </div>
    <div class={cn("space-y-4")}>
      <Input
        label={trans("IPv6 ULA-Prefix")}
        bind:value={form.ula_prefix}
        placeholder="fd00::/48"
        mono
      />
      <Input
        label={trans("Default DUID")}
        bind:value={form.dhcp_default_duid}
        placeholder=""
        mono
      />
      <Toggle
        label={trans("Multi-Path TCP")}
        description={trans(
          "For packets originating from this device, e.g. VPN.",
        )}
        bind:checked={form.mptcp}
      />
      <Toggle
        label={trans("TCP Layer 3 Master Device (tcp_l3mdev) accept")}
        description={trans(
          "TCP services running on this device in the default VRF context shall work across all VRF domains.",
        )}
        bind:checked={form.tcp_l3mdev}
      />
      <Toggle
        label={trans("UDP Layer 3 Master Device (udp_l3mdev) accept")}
        bind:checked={form.udp_l3mdev}
      />
      <Select
        label={trans("Packet Steering")}
        options={[
          { value: "0", label: "Disabled" },
          { value: "1", label: "Enabled" },
          { value: "2", label: "Enabled (all CPUs)" },
        ]}
        bind:value={form.packet_steering}
      />
    </div>
  </div>
</div>
