<script lang="ts">
  import { cn } from "../../../../helpers/classname";
  import Select from "../../../../components/Select/Select.svelte";
  import Input from "../../../../components/Input/Input.svelte";
  import Toggle from "../../../../components/Toggle/Toggle.svelte";

  interface Props {
    trans?: (k: string) => string;
    ban_nftpriority?: string;
    ban_allowflag?: string;
    ban_bcp38?: boolean;
    ban_icmplimit?: string;
    ban_synlimit?: string;
    ban_udplimit?: string;
  }

  let {
    trans = (k: string) => k,
    ban_nftpriority = $bindable(""),
    ban_allowflag = $bindable(""),
    ban_bcp38 = $bindable(false),
    ban_icmplimit = $bindable(""),
    ban_synlimit = $bindable(""),
    ban_udplimit = $bindable(""),
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
    )}>{trans("Table/Chain Settings")}</span
  >
</div>
<div class={cn("h-px", "bg-border")}></div>
<p class={cn("text-[10px]", "text-muted")}>
  {trans("Changes on this tab needs a banIP service restart to take effect.")}
</p>
<div class={cn("h-px", "bg-border")}></div>

<Select
  label={trans("Chain Priority")}
  bind:value={ban_nftpriority}
  options={[
    { value: "", label: trans("-- default --") },
    { value: "10", label: "10" },
    { value: "0", label: "0" },
    { value: "-100", label: "-100" },
    { value: "-150", label: "-150" },
  ]}
/>
<Input
  label={trans("Allow Protocol/Ports")}
  bind:value={ban_allowflag}
  placeholder="tcp 80 443-445"
/>
<Toggle
  label={trans("Enable BCP38")}
  description={trans("Block packets with spoofed source IP addresses.")}
  bind:checked={ban_bcp38}
/>
<Select
  label={trans("ICMP-Threshold")}
  bind:value={ban_icmplimit}
  options={[
    { value: "", label: trans("-- default --") },
    { value: "0", label: "0" },
    { value: "25", label: "25" },
    { value: "50", label: "50" },
    { value: "100", label: "100" },
    { value: "250", label: "250" },
    { value: "500", label: "500" },
    { value: "1000", label: "1000" },
  ]}
/>
<Select
  label={trans("SYN-Threshold")}
  bind:value={ban_synlimit}
  options={[
    { value: "", label: trans("-- default --") },
    { value: "0", label: "0" },
    { value: "10", label: "10" },
    { value: "50", label: "50" },
    { value: "100", label: "100" },
    { value: "250", label: "250" },
    { value: "500", label: "500" },
    { value: "1000", label: "1000" },
  ]}
/>
<Select
  label={trans("UDP-Threshold")}
  bind:value={ban_udplimit}
  options={[
    { value: "", label: trans("-- default --") },
    { value: "0", label: "0" },
    { value: "100", label: "100" },
    { value: "250", label: "250" },
    { value: "500", label: "500" },
    { value: "1000", label: "1000" },
    { value: "2500", label: "2500" },
    { value: "5000", label: "5000" },
  ]}
/>
