<script lang="ts">
  import { cn } from "../../../helpers/classname";
  import Input from "../../../components/Input/Input.svelte";
  import Toggle from "../../../components/Toggle/Toggle.svelte";
  import Select from "../../../components/Select/Select.svelte";

  let {
    form,
    multipathOptions,
    trans,
  }: {
    form: Record<string, any>;
    multipathOptions: { value: string; label: string }[];
    trans: (k: string) => string;
  } = $props();

  const hasPeerDns = (proto: string) => {
    switch (proto) {
      case "dhcp":
      case "dhcpv6":
      case "qmi":
      case "ppp":
      case "pppoe":
      case "pppoa":
      case "pptp":
      case "openvpn":
      case "sstp":
      case "ncm":
        return true;
    }
    return false;
  };

  const hasSourcefilter = (proto: string) => {
    switch (proto) {
      case "3g":
      case "dhcpv6":
      case "directip":
      case "mbim":
      case "modemmanager":
      case "ncm":
      case "ppp":
      case "pppoa":
      case "pppoe":
      case "pptp":
      case "qmi":
        return true;
    }
    return false;
  };
</script>

<div class={cn("space-y-4")}>
  <div class={cn("h-px", "bg-border")}></div>
  <Toggle
    label={trans("Use default gateway")}
    description={trans("If unchecked, no default route is configured")}
    bind:checked={form.defaultroute}
  />
  {#if hasPeerDns(form.proto)}
    <Toggle
      label={trans("Use DNS servers advertised by peer")}
      description={trans(
        "If unchecked, the advertised DNS server addresses are ignored",
      )}
      bind:checked={form.peerdns}
    />
  {/if}
  <Input
    label={trans("Use custom DNS servers")}
    bind:value={form.dns}
    placeholder="192.168.1.1 8.8.8.8"
    mono
  />
  {#if hasPeerDns(form.proto)}
    <p class={cn("text-[10px]", "text-muted", "-mt-3")}>
      {trans("Only used if peer DNS is not used.")}
    </p>
  {/if}
  <div class={cn("grid", "grid-cols-2", "gap-4")}>
    <Input
      label={trans("DNS weight")}
      bind:value={form.dns_metric}
      placeholder="0"
      type="number"
    />
    <Input
      label={trans("Gateway metric")}
      bind:value={form.metric}
      placeholder="0"
      type="number"
    />
  </div>
  <Select
    label={trans("Multi-Path TCP")}
    options={multipathOptions}
    bind:value={form.multipath}
    placeholder={trans("Off")}
  />
  <Toggle
    label={trans("Delegate IPv6 prefixes")}
    description={trans(
      "Enable downstream delegation of IPv6 prefixes available on this interface",
    )}
    bind:checked={form.delegate}
  />
  <Toggle
    label={trans("Use builtin IPv6-management")}
    bind:checked={form.delegate}
  />
  <Toggle
    label={trans("Force link")}
    description={trans(
      "Set interface properties regardless of the link carrier",
    )}
    bind:checked={form.force_link}
  />
  {#if hasSourcefilter(form.proto)}
    <Toggle
      label={trans("IPv6 source routing")}
      description={trans(
        "Automatically handle multiple uplink interfaces using source-based policy routing",
      )}
      bind:checked={form.sourcefilter}
    />
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
  <div class={cn("h-px", "bg-border")}></div>
  <p class={cn("text-xs", "font-semibold", "text-fg")}>
    {trans("IPv6 Prefix delegation settings")}
  </p>
  <div class={cn("grid", "grid-cols-2", "gap-4")}>
    <Input
      label={trans("IPv6 assignment length")}
      bind:value={form.ip6assign}
      placeholder="64"
      type="number"
    />
    <Input
      label={trans("IPv6 assignment hint")}
      bind:value={form.ip6hint}
      placeholder="0"
    />
  </div>
  <Input
    label={trans("IPv6 prefix filter")}
    bind:value={form.ip6class}
    placeholder="local"
    mono
  />
  <Input
    label={trans("IPv6 suffix")}
    bind:value={form.ip6ifaceid}
    placeholder="::1"
    mono
  />
  <Input
    label={trans("IPv6 preference")}
    bind:value={form.ip6weight}
    placeholder="0"
    type="number"
  />
</div>
