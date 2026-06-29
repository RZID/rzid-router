<script lang="ts">
  import { cn } from "../../../../helpers/classname";
  import Select from "../../../../components/Select/Select.svelte";
  import Input from "../../../../components/Input/Input.svelte";
  import Toggle from "../../../../components/Toggle/Toggle.svelte";

  interface Props {
    trans?: (k: string) => string;
    ban_nicelimit?: string;
    ban_filelimit?: string;
    ban_cores?: string;
    ban_splitsize?: string;
    ban_basedir?: string;
    ban_backupdir?: string;
    ban_reportdir?: string;
    ban_errordir?: string;
    ban_deduplicate?: boolean;
  }

  let {
    trans = (k: string) => k,
    ban_nicelimit = $bindable(""),
    ban_filelimit = $bindable(""),
    ban_cores = $bindable(""),
    ban_splitsize = $bindable(""),
    ban_basedir = $bindable(""),
    ban_backupdir = $bindable(""),
    ban_reportdir = $bindable(""),
    ban_errordir = $bindable(""),
    ban_deduplicate = $bindable(true),
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
    )}>{trans("Advanced Settings")}</span
  >
</div>
<div class={cn("h-px", "bg-border")}></div>
<p class={cn("text-[10px]", "text-muted")}>
  {trans("Changes on this tab needs a banIP service restart to take effect.")}
</p>
<div class={cn("h-px", "bg-border")}></div>

<Select
  label={trans("Nice Level")}
  bind:value={ban_nicelimit}
  options={[
    { value: "", label: trans("-- default --") },
    { value: "-20", label: trans("Highest Priority") },
    { value: "-10", label: trans("High Priority") },
    { value: "0", label: trans("Normal Priority") },
    { value: "10", label: trans("Less Priority") },
    { value: "19", label: trans("Least Priority") },
  ]}
/>
<Select
  label={trans("Max Open Files")}
  bind:value={ban_filelimit}
  options={[
    { value: "", label: trans("-- default --") },
    { value: "512", label: "512" },
    { value: "1024", label: "1024" },
    { value: "2048", label: "2048" },
    { value: "4096", label: "4096" },
  ]}
/>
<Select
  label={trans("CPU Cores")}
  bind:value={ban_cores}
  options={[
    { value: "", label: trans("-- default --") },
    { value: "1", label: "1" },
    { value: "2", label: "2" },
    { value: "4", label: "4" },
    { value: "8", label: "8" },
    { value: "16", label: "16" },
  ]}
/>
<Select
  label={trans("Set Split Size")}
  bind:value={ban_splitsize}
  options={[
    { value: "", label: trans("-- default --") },
    { value: "512", label: "512" },
    { value: "1024", label: "1024" },
    { value: "2048", label: "2048" },
    { value: "4096", label: "4096" },
    { value: "8192", label: "8192" },
    { value: "16384", label: "16384" },
  ]}
/>
<Input
  label={trans("Base Directory")}
  bind:value={ban_basedir}
  placeholder="/tmp"
/>
<Input
  label={trans("Backup Directory")}
  bind:value={ban_backupdir}
  placeholder="/tmp/banIP-backup"
/>
<Input
  label={trans("Report Directory")}
  bind:value={ban_reportdir}
  placeholder="/tmp/banIP-report"
/>
<Input
  label={trans("Error Directory")}
  bind:value={ban_errordir}
  placeholder="/tmp/banIP-error"
/>
<Toggle
  label={trans("Deduplicate IPs")}
  description={trans("Deduplicate IP addresses across all active Sets.")}
  bind:checked={ban_deduplicate}
/>
