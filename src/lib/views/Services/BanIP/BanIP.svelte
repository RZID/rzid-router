<script lang="ts">
  import { cn } from "../../../helpers/classname";
  import { t as _t, getLocale, onLocaleChange } from "../../../i18n";
  import TabBar from "../../../components/TabBar/TabBar.svelte";
  import Overview from "./Overview.svelte";
  import Allowlist from "./Allowlist.svelte";
  import Blocklist from "./Blocklist.svelte";
  import CustomFeed from "./CustomFeed.svelte";
  import FirewallLog from "./FirewallLog.svelte";
  import ProcessingLog from "./ProcessingLog.svelte";
  import SetReport from "./SetReport.svelte";
  let locale = $state(getLocale());
  let trans = $derived.by(() => {
    locale;
    return (k: string) => _t(k);
  });
  $effect(() =>
    onLocaleChange(() => {
      locale = getLocale();
    }),
  );

  type SubId =
    | "overview"
    | "allowlist"
    | "blocklist"
    | "feeds"
    | "setreport"
    | "fwlog"
    | "proclog";
  let activeSub = $state<SubId>("overview");

  const subPages = [
    { id: "overview", label: "Overview" },
    { id: "allowlist", label: "Edit Allowlist" },
    { id: "blocklist", label: "Edit Blocklist" },
    { id: "feeds", label: "Custom Feed Editor" },
    { id: "setreport", label: "Set Reporting" },
    { id: "fwlog", label: "Firewall Log" },
    { id: "proclog", label: "Processing Log" },
  ];
</script>

<div
  class={cn("p-6", "flex", "flex-col", "min-h-0", "animate-fade-in", "gap-4")}
>
  <div class={cn("shrink-0")}>
    <TabBar
      tabs={subPages}
      active={activeSub}
      onchange={(id) => (activeSub = id as SubId)}
    />
  </div>

  {#key activeSub}
    {#if activeSub === "overview"}
      <Overview />
    {:else if activeSub === "allowlist"}
      <Allowlist />
    {:else if activeSub === "blocklist"}
      <Blocklist />
    {:else if activeSub === "feeds"}
      <CustomFeed />
    {:else if activeSub === "setreport"}
      <SetReport />
    {:else if activeSub === "fwlog"}
      <FirewallLog />
    {:else if activeSub === "proclog"}
      <ProcessingLog />
    {/if}
  {/key}
</div>
