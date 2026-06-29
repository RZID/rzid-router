<script lang="ts">
  import { cn } from "../../../../helpers/classname";
  import Select from "../../../../components/Select/Select.svelte";

  interface Props {
    trans?: (k: string) => string;
    ban_nftpolicy?: string;
    ban_nftretry?: string;
    ban_blockpolicy?: string;
  }

  let {
    trans = (k: string) => k,
    ban_nftpolicy = $bindable(""),
    ban_nftretry = $bindable(""),
    ban_blockpolicy = $bindable(""),
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
    )}>{trans("Feed/Set Settings")}</span
  >
</div>
<div class={cn("h-px", "bg-border")}></div>
<p class={cn("text-[10px]", "text-muted")}>
  {trans("Changes on this tab needs a banIP service restart to take effect.")}
</p>
<div class={cn("h-px", "bg-border")}></div>

<Select
  label={trans("Set Policy")}
  bind:value={ban_nftpolicy}
  options={[
    { value: "", label: trans("-- default --") },
    { value: "memory", label: trans("memory") },
    { value: "performance", label: trans("performance") },
  ]}
/>
<Select
  label={trans("Set Load Retries")}
  bind:value={ban_nftretry}
  options={[
    { value: "", label: trans("-- default --") },
    { value: "1", label: "1" },
    { value: "3", label: "3" },
    { value: "5", label: "5" },
  ]}
/>
<Select
  label={trans("Inbound Block Policy")}
  bind:value={ban_blockpolicy}
  options={[
    { value: "", label: trans("-- default --") },
    { value: "drop", label: trans("drop") },
    { value: "reject", label: trans("reject") },
  ]}
/>
