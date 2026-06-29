<script lang="ts">
  import { cn } from "../../../../helpers/classname";
  import Select from "../../../../components/Select/Select.svelte";
  import Input from "../../../../components/Input/Input.svelte";
  import Toggle from "../../../../components/Toggle/Toggle.svelte";

  interface Props {
    trans?: (k: string) => string;
    ban_nftloglevel?: string;
    ban_logprerouting?: boolean;
    ban_loginbound?: boolean;
    ban_logoutbound?: boolean;
    ban_logreadfile?: string;
    ban_loglimit?: string;
    ban_logcount?: string;
    ban_logratelimit?: string;
    ban_logburstlimit?: string;
    ban_remotelog?: boolean;
    ban_remotetoken?: string;
  }

  let {
    trans = (k: string) => k,
    ban_nftloglevel = $bindable(""),
    ban_logprerouting = $bindable(false),
    ban_loginbound = $bindable(false),
    ban_logoutbound = $bindable(false),
    ban_logreadfile = $bindable(""),
    ban_loglimit = $bindable(""),
    ban_logcount = $bindable(""),
    ban_logratelimit = $bindable(""),
    ban_logburstlimit = $bindable(""),
    ban_remotelog = $bindable(false),
    ban_remotetoken = $bindable(""),
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
    )}>{trans("Log Settings")}</span
  >
</div>
<div class={cn("h-px", "bg-border")}></div>
<p class={cn("text-[10px]", "text-muted")}>
  {trans("Changes on this tab needs a banIP service restart to take effect.")}
</p>
<div class={cn("h-px", "bg-border")}></div>

<Select
  label={trans("NFT Log Level")}
  bind:value={ban_nftloglevel}
  options={[
    { value: "", label: trans("-- default --") },
    { value: "emerg", label: "emerg" },
    { value: "alert", label: "alert" },
    { value: "crit", label: "crit" },
    { value: "err", label: "err" },
    { value: "warn", label: "warn" },
    { value: "notice", label: "notice" },
    { value: "info", label: "info" },
    { value: "debug", label: "debug" },
  ]}
/>
<div class={cn("grid", "grid-cols-3", "gap-4")}>
  <Toggle label={trans("Log Prerouting")} bind:checked={ban_logprerouting} />
  <Toggle label={trans("Log Inbound")} bind:checked={ban_loginbound} />
  <Toggle label={trans("Log Outbound")} bind:checked={ban_logoutbound} />
</div>
<Input
  label={trans("Logfile Location")}
  bind:value={ban_logreadfile}
  placeholder="/var/log/messages"
/>
<Select
  label={trans("Log Limit")}
  bind:value={ban_loglimit}
  options={[
    { value: "", label: trans("-- default --") },
    { value: "0", label: "0" },
    { value: "50", label: "50" },
    { value: "100", label: "100" },
    { value: "250", label: "250" },
    { value: "500", label: "500" },
    { value: "1000", label: "1000" },
  ]}
/>
<Input
  label={trans("Log Count")}
  bind:value={ban_logcount}
  placeholder="1"
  type="number"
/>
<Select
  label={trans("Log Rate Limit")}
  bind:value={ban_logratelimit}
  options={[
    { value: "", label: trans("-- default --") },
    { value: "0", label: "0" },
    { value: "1", label: "1" },
    { value: "5", label: "5" },
    { value: "10", label: "10" },
    { value: "25", label: "25" },
    { value: "50", label: "50" },
    { value: "100", label: "100" },
  ]}
/>
{#if ban_logratelimit !== "0"}
  <Select
    label={trans("Log Burst Limit")}
    bind:value={ban_logburstlimit}
    options={[
      { value: "", label: trans("-- default --") },
      { value: "1", label: "1" },
      { value: "5", label: "5" },
      { value: "10", label: "10" },
      { value: "25", label: "25" },
      { value: "50", label: "50" },
    ]}
  />
{/if}
<Toggle label={trans("Enable Remote Logging")} bind:checked={ban_remotelog} />
{#if ban_remotelog}
  <Input
    label={trans("Remote Token")}
    bind:value={ban_remotetoken}
    placeholder={trans("Token to communicate with the cgi interface")}
  />
{/if}
