<script lang="ts">
  import { cn } from "../../../helpers/classname";
  import Input from "../../../components/Input/Input.svelte";
  import Select from "../../../components/Select/Select.svelte";
  import Toggle from "../../../components/Toggle/Toggle.svelte";
  import NetworkSelect from "../../../components/NetworkSelect/NetworkSelect.svelte";
  import DeviceSelect from "../../../components/DeviceSelect/DeviceSelect.svelte";

  let {
    editForm,
    env,
    trans,
  }: {
    editForm: any;
    env: any;
    trans: (k: string) => string;
  } = $props();

  const ipSourceOptions = [
    { value: "network", label: "Network" },
    { value: "web", label: "URL" },
    { value: "interface", label: "Interface" },
    { value: "script", label: "Script" },
  ];

  const syslogOptions = [
    { value: "0", label: "No logging" },
    { value: "1", label: "Info" },
    { value: "2", label: "Notice" },
    { value: "3", label: "Warning" },
    { value: "4", label: "Error" },
  ];
</script>

<div class={cn("space-y-4")}>
  <Select
    label={trans("IP address source")}
    options={ipSourceOptions}
    bind:value={editForm.ip_source}
  />
  {#if editForm.ip_source === "network"}
    <NetworkSelect label={trans("Network")} bind:value={editForm.ip_network} />
  {:else if editForm.ip_source === "web"}
    <Input
      label={trans("URL to detect")}
      bind:value={editForm.ip_url}
      placeholder="http://checkip.dyndns.com"
    />
  {:else if editForm.ip_source === "interface"}
    <DeviceSelect
      label={trans("Interface")}
      bind:value={editForm.ip_interface}
    />
  {:else if editForm.ip_source === "script"}
    <Input
      label={trans("Script")}
      bind:value={editForm.ip_script}
      placeholder="/path/to/script.sh"
      mono
    />
  {/if}
  {#if editForm.ip_source === "network"}
    <Input
      label={trans("Event Network")}
      bind:value={editForm.interface}
      placeholder={trans("Auto-set from Network")}
    />
    <p class={cn("text-[10px]", "text-muted", "-mt-3")}>
      {trans("Will be auto-set to the selected network if left empty")}
    </p>
  {:else}
    <Input
      label={trans("Event Network")}
      bind:value={editForm.interface}
      placeholder="wan"
    />
  {/if}
  {#if env?.has_bindnet}
    <Input
      label={trans("Bind Network")}
      bind:value={editForm.bind_network}
      placeholder="wan"
    />
  {/if}
  {#if env?.has_forceip}
    <Toggle
      bind:checked={editForm.force_ipversion}
      label={trans("Force IP Version")}
    />
  {/if}
  {#if env?.has_dnsserver}
    <Input
      label={trans("DNS-Server")}
      bind:value={editForm.dns_server}
      placeholder="mydns.lan"
    />
  {/if}
  {#if env?.has_bindhost}
    <Toggle
      bind:checked={editForm.force_dnstcp}
      label={trans("Force TCP on DNS")}
    />
  {/if}
  {#if env?.has_proxy}
    <Input
      label={trans("PROXY-Server")}
      bind:value={editForm.proxy}
      placeholder="[user:password@]proxyhost:port"
    />
  {/if}
  <Select
    label={trans("Log to syslog")}
    options={syslogOptions}
    bind:value={editForm.use_syslog}
  />
  <Toggle bind:checked={editForm.use_logfile} label={trans("Log to file")} />
</div>
