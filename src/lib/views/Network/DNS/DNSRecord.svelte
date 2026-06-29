<script lang="ts">
  import { cn } from "../../../helpers/classname";
  import { getLocale, onLocaleChange, t } from "../../../i18n";
  import TabBar from "../../../components/TabBar/TabBar.svelte";
  import RecordTable from "./RecordTable.svelte";
  import type { RecTab } from "./types";

  let { recTab, openRec, deleteSection, getSections, td, th } = $props<{
    recTab: string;
    openRec: (type: string, id?: string) => void;
    deleteSection: (id: string) => void;
    getSections: (type: string) => [string, Record<string, any>][];
    td: string;
    th: string;
  }>();

  let locale = $state(getLocale());
  let trans = $derived.by(() => {
    locale;
    return (k: string) => t(k);
  });
  $effect(() =>
    onLocaleChange(() => {
      locale = getLocale();
    }),
  );

  const recTabs: { id: RecTab; label: string }[] = [
    { id: "hosts", label: "Hostnames" },
    { id: "srvhosts", label: "SRV" },
    { id: "mxhosts", label: "MX" },
    { id: "cnamehosts", label: "CNAME" },
    { id: "dnsrr", label: "DNS-RR" },
  ];
</script>

<TabBar
  tabs={recTabs}
  active={recTab}
  onchange={(id: string) => {
    recTab = id as RecTab;
  }}
/>
<div class={cn("mt-3")}>
  {#if recTab === "hosts"}
    <RecordTable
      type="domain"
      columns={[
        { key: "name", label: trans("Hostname") },
        { key: "ip", label: trans("IP address") },
      ]}
      sections={getSections("domain")}
      description="Hostnames are used to bind a domain name to an IP address. This setting is redundant for hostnames already configured with static leases, but it can be useful to rebind an FQDN."
      {openRec}
      {deleteSection}
      {trans}
      {td}
      {th}
    />
  {:else if recTab === "srvhosts"}
    <RecordTable
      type="srvhost"
      columns={[
        { key: "srv", label: "SRV" },
        { key: "target", label: trans("Target") },
        { key: "port", label: trans("Port") },
        { key: "class", label: trans("Priority") },
        { key: "weight", label: trans("Weight") },
      ]}
      sections={getSections("srvhost")}
      description="Bind service records to a domain name: specify the location of services. See RFC2782."
      {openRec}
      {deleteSection}
      {trans}
      {td}
      {th}
    />
  {:else if recTab === "mxhosts"}
    <RecordTable
      type="mxhost"
      columns={[
        { key: "domain", label: trans("Domain") },
        { key: "relay", label: trans("Relay") },
        { key: "pref", label: trans("Priority") },
      ]}
      sections={getSections("mxhost")}
      description="Bind service records to a domain name: specify the location of services. You may add multiple records for the same domain."
      {openRec}
      {deleteSection}
      {trans}
      {td}
      {th}
    />
  {:else if recTab === "cnamehosts"}
    <RecordTable
      type="cname"
      columns={[
        { key: "cname", label: trans("Domain") },
        { key: "target", label: trans("Target") },
      ]}
      sections={getSections("cname")}
      description="Set an alias for a hostname."
      {openRec}
      {deleteSection}
      {trans}
      {td}
      {th}
    />
  {:else if recTab === "dnsrr"}
    <RecordTable
      type="dnsrr"
      columns={[
        { key: "rrname", label: trans("Name") },
        { key: "rrnumber", label: trans("RR Number") },
        {
          key: "hexdata",
          label: trans("Hex Data"),
          render: (v: string) =>
            v
              ? v
                  .replace(/:/g, "")
                  .replace(/(.{2})/g, "$1 ")
                  .trim()
                  .substring(0, 30) + "…"
              : "—",
        },
      ]}
      sections={getSections("dnsrr")}
      description="Set an arbitrary resource record (RR) type. Hexdata is automatically en/decoded on save and load."
      {openRec}
      {deleteSection}
      {trans}
      {td}
      {th}
    />
  {/if}
</div>
