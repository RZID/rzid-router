<script lang="ts">
  import { cn } from "../../../helpers/classname";
  import Input from "../../../components/Input/Input.svelte";
  import Toggle from "../../../components/Toggle/Toggle.svelte";
  import Select from "../../../components/Select/Select.svelte";

  let {
    trans,
    dnsmasqTab,
    dnsmasqForm = $bindable<Record<string, string | boolean>>({}),
  }: {
    trans: (k: string) => string;
    dnsmasqTab: string;
    dnsmasqForm: Record<string, string | boolean>;
  } = $props();
</script>

{#if dnsmasqTab === "general"}
  <Toggle
    label={trans("Authoritative")}
    description={trans("This is the only DHCP server in the local network.")}
    bind:checked={dnsmasqForm.authoritative}
  />

  <Input
    placeholder="lan"
    label={trans("Local domain")}
    bind:value={dnsmasqForm.domain}
    description={trans("Local domain suffix appended to DHCP names.")}
  />

  <Toggle
    bind:checked={dnsmasqForm.sequential_ip}
    label={trans("Allocate IPs sequentially")}
    description={trans(
      "Allocate IP addresses sequentially, starting from the lowest available address.",
    )}
  />

  <Input
    placeholder="150"
    label={trans("Max. DHCP leases")}
    bind:value={dnsmasqForm.dhcpleasemax}
    description={trans("Maximum allowed number of active DHCP leases.")}
  />

  <Toggle
    bind:checked={dnsmasqForm.address_as_local}
    label={trans("Resolve addresses locally")}
    description={trans(
      "Never send queries for FQDNs in the Address option to an upstream resolver.",
    )}
  />
{:else if dnsmasqTab === "devices"}
  <Toggle
    bind:checked={dnsmasqForm.nonwildcard}
    label={trans("Non-wildcard")}
    description={trans("Bind only to configured interface addresses.")}
  />

  <Input
    label={trans("Listen interfaces")}
    bind:value={dnsmasqForm.interface}
    placeholder={trans("(all)")}
    description={trans("Listen only on the specified interfaces.")}
  />
  <Input
    label={trans("Listen addresses")}
    bind:value={dnsmasqForm.listen_address}
    placeholder="0.0.0.0"
    description={trans("Listen only on the specified addresses.")}
  />
  <Input
    label={trans("Exclude interfaces")}
    bind:value={dnsmasqForm.notinterface}
    description={trans("Do not listen on the specified interfaces.")}
  />
{:else if dnsmasqTab === "logging"}
  <Toggle
    label={trans("Extra DHCP logging")}
    description={trans("Log all options sent to DHCP clients.")}
    bind:checked={dnsmasqForm.logdhcp}
  />

  <Select
    label={trans("Log facility")}
    bind:value={dnsmasqForm.logfacility}
    options={[
      ...[
        "KERN",
        "USER",
        "MAIL",
        "DAEMON",
        "AUTH",
        "LPR",
        "NEWS",
        "UUCP",
        "CRON",
        "LOCAL0",
        "LOCAL1",
        "LOCAL2",
        "LOCAL3",
        "LOCAL4",
        "LOCAL5",
        "LOCAL6",
        "LOCAL7",
      ].map((v) => ({ value: v, label: v })),
      { value: "-", label: "stderr" },
    ]}
    placeholder={trans("Select...")}
  />

  <Toggle
    label={trans("Suppress logging")}
    description={trans("Suppress logging of routine DHCP operations.")}
    bind:checked={dnsmasqForm.quietdhcp}
  />
{:else if dnsmasqTab === "files"}
  <Toggle
    label={trans("Use /etc/ethers")}
    description={trans("Read /etc/ethers to configure the DHCP server.")}
    bind:checked={dnsmasqForm.readethers}
  />
  <Input
    label={trans("Lease file")}
    bind:value={dnsmasqForm.leasefile}
    placeholder="/tmp/dhcp.leases"
    description={trans("File to store DHCP lease information.")}
  />
{/if}
