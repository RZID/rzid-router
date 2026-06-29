<script lang="ts">
  import Toggle from "../../../components/Toggle/Toggle.svelte";
  import Input from "../../../components/Input/Input.svelte";
  import Select from "../../../components/Select/Select.svelte";

  let {
    trans,
    odhcpdForm = $bindable<Record<string, string | boolean>>({}),
  }: {
    trans: (k: string) => string;
    odhcpdForm: Record<string, string | boolean>;
  } = $props();
</script>

<Toggle
  label={trans("DHCPv4")}
  description={trans("Use odhcp for DHCPv4. This will disable DHCPv4 support in dnsmasq.")}
  bind:checked={odhcpdForm.maindhcp}
/>
<Input
  label={trans("Lease file")}
  placeholder="/tmp/odhcpd.leases"
  bind:value={odhcpdForm.leasefile}
/>
<Input
  label={trans("Lease trigger")}
  bind:value={odhcpdForm.leasetrigger}
  description={trans("Path to a script to run each time the lease file changes.")}
/>
<Input
  label={trans("Hosts file")}
  bind:value={odhcpdForm.hostsdir}
  description={trans("Directory to store hosts files.")}
/>
<Input
  label={trans("PIO directory")}
  bind:value={odhcpdForm.piodir}
  description={trans("Directory to store IPv6 prefix information files.")}
/>
<Select
  label={trans("Log level")}
  bind:value={odhcpdForm.loglevel}
  options={[
    ["0", "Emergency"], ["1", "Alert"], ["2", "Critical"],
    ["3", "Error"], ["4", "Warning"], ["5", "Notice"],
    ["6", "Info"], ["7", "Debug"],
  ].map(([v, l]) => ({ value: v, label: l }))}
  placeholder={trans("Select...")}
/>
