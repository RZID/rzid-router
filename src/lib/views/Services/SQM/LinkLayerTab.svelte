<script lang="ts">
  import { cn } from "../../../helpers/classname";
  import Toggle from "../../../components/Toggle/Toggle.svelte";
  import Input from "../../../components/Input/Input.svelte";
  import Select from "../../../components/Select/Select.svelte";
  import type { QueueSection } from "./sqm-store.svelte";
  import { t } from "./sqm-store.svelte";

  let { q }: { q: QueueSection } = $props();

  const linklayerOptions = [
    { value: "none", label: `none (${t("default")})` },
    { value: "ethernet", label: t("Ethernet with overhead: select for e.g. VDSL2.") },
    { value: "atm", label: t("ATM: select for e.g. ADSL1, ADSL2, ADSL2+.") },
  ];

  const adaptOptions = [
    { value: "default", label: `default (${t("default")})` },
    { value: "cake", label: "cake" },
    { value: "htb_private", label: "htb_private" },
    { value: "tc_stab", label: "tc_stab" },
  ];
</script>

<div class={cn("flex", "flex-col", "gap-4")}>
  <Select label={t("Link layer")} description={t("Which link layer technology to account for")}
    options={linklayerOptions} bind:value={q.linklayer} />

  {#if q.linklayer !== "none"}
    <Input label={t("Per Packet Overhead (bytes)")} bind:value={q.overhead} placeholder="0" type="number" />

    <Toggle label={t("Advanced Linklayer Options")} description={t("Advanced options will only be used as long as this box is checked (only needed if MTU > 1500).")}
      checked={q.linklayer_advanced} onchange={(v) => q.linklayer_advanced = v} />

    {#if q.linklayer_advanced}
      <div class={cn("flex", "flex-col", "gap-4", "pl-4", "border-l", "border-border")}>
        <div class={cn("grid", "grid-cols-3", "gap-3")}>
          <Input label={t("Maximum packet size")} description={t("Maximal Size for size and rate calculations, tcMTU (byte); needs to be >= interface MTU + overhead")}
            bind:value={q.tcMTU} placeholder="2047" type="number" />
          <Input label={t("Rate table size")} description={t("Number of entries in size/rate tables, TSIZE; for ATM choose TSIZE = (tcMTU + 1) / 16")}
            bind:value={q.tcTSIZE} placeholder="128" type="number" />
          <Input label={t("Minimum packet size")} description={t("Minimal packet size, MPU (byte); needs to be > 0 for ethernet size tables")}
            bind:value={q.tcMPU} placeholder="0" type="number" />
        </div>
        <Select label={t("Linklayer adaptation mechanism")} description={t("Which linklayer adaptation mechanism to use; for testing only")}
          options={adaptOptions} bind:value={q.linklayer_adaptation_mechanism} />
      </div>
    {/if}
  {/if}
</div>
