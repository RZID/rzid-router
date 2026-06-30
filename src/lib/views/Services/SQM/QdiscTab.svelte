<script lang="ts">
  import { cn } from "../../../helpers/classname";
  import Toggle from "../../../components/Toggle/Toggle.svelte";
  import Input from "../../../components/Input/Input.svelte";
  import Select from "../../../components/Select/Select.svelte";
  import type { QueueSection } from "./sqm-store.svelte";
  import { t } from "./sqm-store.svelte";

  let { q }: { q: QueueSection } = $props();

  const qdiscOptions = [
    { value: "fq_codel", label: "fq_codel" },
    { value: "cake", label: "CAKE" },
    { value: "codel", label: "codel" },
    { value: "pie", label: "PIE" },
    { value: "sfq", label: "SFQ" },
  ];

  const scriptOptions = [
    { value: "simplest.qos", label: "simplest.qos — Single-band fq_codel + HTB" },
    { value: "simplest_tbf.qos", label: "simplest_tbf.qos — Single-band fq_codel + TBF" },
    { value: "simple.qos", label: "simple.qos — Three-band fq_codel + HTB" },
    { value: "piece_of_cake.qos", label: "piece_of_cake.qos — Single-band CAKE besteffort" },
    { value: "layer_cake.qos", label: "layer_cake.qos — Single-band CAKE diffserv3" },
  ];

  const ynOptions = [
    { value: "1", label: "SQUASH" },
    { value: "0", label: t("DO NOT SQUASH") },
  ];

  const ignoreOptions = [
    { value: "1", label: t("Ignore") },
    { value: "0", label: t("Allow") },
  ];

  const ecnOptions = [
    { value: "ECN", label: `ECN (${t("default")})` },
    { value: "NOECN", label: "NOECN" },
  ];

  const ecnEgressOptions = [
    { value: "NOECN", label: `NOECN (${t("default")})` },
    { value: "ECN", label: "ECN" },
  ];
</script>

<div class={cn("flex", "flex-col", "gap-4")}>
  <Select label={t("Queueing discipline")} options={qdiscOptions} bind:value={q.qdisc}
    description={t("Lists queuing disciplines useable on this system. After installing a new qdisc, you need to restart the router to see updates!")} />

  <Select label={t("Queue setup script")} options={scriptOptions} bind:value={q.script} />

  <Toggle label={t("Advanced Configuration")} description={t("Advanced options will only be used as long as this box is checked.")}
    checked={q.qdisc_advanced} onchange={(v) => q.qdisc_advanced = v} />

  {#if q.qdisc_advanced}
    <div class={cn("flex", "flex-col", "gap-4", "pl-4", "border-l", "border-border")}>
      <Toggle label={t("Enable multi-queue config")} description={t("Enable multi-queue qdisc on supported hardware. If .qos script does not support mq this option is ignored.")}
        checked={q.use_mq} onchange={(v) => q.use_mq = v} />

      <Select label={t("Squash DSCP (ingress)")} description={t("Squash DSCP markings on inbound packets")}
        options={ynOptions} bind:value={q.squash_dscp} />

      <Select label={t("Ignore DSCP (ingress)")} description={t("Ignore DSCP markings on inbound packets")}
        options={ignoreOptions} bind:value={q.squash_ingress} />

      <Select label={t("ECN (ingress)")} description={t("Explicit congestion notification (ECN) status on inbound packets")}
        options={ecnOptions} bind:value={q.ingress_ecn} />

      <Select label={t("ECN (egress)")} description={t("Explicit congestion notification (ECN) status on outbound packets")}
        options={ecnEgressOptions} bind:value={q.egress_ecn} />

      <Toggle label={t("Dangerous Configuration")} description={t("Dangerous options will only be used as long as this box is checked.")}
        checked={q.qdisc_really_really_advanced} onchange={(v) => q.qdisc_really_really_advanced = v} />

      {#if q.qdisc_really_really_advanced}
        <div class={cn("flex", "flex-col", "gap-4", "pl-4", "border-l", "border-border")}>
          <div class={cn("grid", "grid-cols-2", "gap-3")}>
            <Input label={t("Hard queue limit (ingress)")} description={t("Hard limit on ingress queues; leave empty for default.")}
              bind:value={q.ilimit} placeholder={t("empty")} type="number" />
            <Input label={t("Hard queue limit (egress)")} description={t("Hard limit on egress queues; leave empty for default.")}
              bind:value={q.elimit} placeholder={t("empty")} type="number" />
          </div>
          <div class={cn("grid", "grid-cols-2", "gap-3")}>
            <Input label={t("Latency target (ingress)")} description={t("Latency target for ingress, e.g 5ms [units: s, ms, or us]; leave empty for automatic selection, put in the word default for the qdisc's default.")}
              bind:value={q.itarget} placeholder="5ms" />
            <Input label={t("Latency target (egress)")} description={t("Latency target for egress, e.g. 5ms [units: s, ms, or us]; leave empty for automatic selection, put in the word default for the qdisc's default.")}
              bind:value={q.etarget} placeholder="5ms" />
          </div>
          <div class={cn("grid", "grid-cols-2", "gap-3")}>
            <Input label={t("Qdisc options (ingress)")} description={t("Advanced option string to pass to the ingress queueing disciplines; no error checking, use very carefully.")}
              bind:value={q.iqdisc_opts} placeholder="" mono />
            <Input label={t("Qdisc options (egress)")} description={t("Advanced option string to pass to the egress queueing disciplines; no error checking, use very carefully.")}
              bind:value={q.eqdisc_opts} placeholder="" mono />
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>
