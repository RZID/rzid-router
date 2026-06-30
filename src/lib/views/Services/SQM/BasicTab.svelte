<script lang="ts">
  import { cn } from "../../../helpers/classname";
  import Toggle from "../../../components/Toggle/Toggle.svelte";
  import Input from "../../../components/Input/Input.svelte";
  import Select from "../../../components/Select/Select.svelte";
  import DeviceSelect from "../../../components/DeviceSelect/DeviceSelect.svelte";
  import type { QueueSection } from "./sqm-store.svelte";
  import { t } from "./sqm-store.svelte";

  let { q }: { q: QueueSection } = $props();

  const verbosityOptions = [
    { value: "0", label: "silent" },
    { value: "1", label: t("error") },
    { value: "2", label: t("warning") },
    { value: "5", label: `${t("info")} (${t("default")})` },
    { value: "8", label: t("debug") },
    { value: "10", label: "trace" },
  ];
</script>

<div class={cn("flex", "flex-col", "gap-4")}>
  <Toggle label={t("Enable this SQM instance.")} checked={q.enabled} onchange={(v) => q.enabled = v} />

  <DeviceSelect label={t("Interface name")} bind:value={q.interface} placeholder={t("Select...")} />

  <div class={cn("grid", "grid-cols-2", "gap-3")}>
    <Input label={t("Download speed (ingress)")} bind:value={q.download} placeholder="0" type="number" description={t("Download speed (kbit/s) (ingress) set to 0 to disable ingress shaping selectively")} />
    <Input label={t("Upload speed (egress)")} bind:value={q.upload} placeholder="0" type="number" description={t("Upload speed (kbit/s) (egress) set to 0 to selectively disable egress shaping")} />
  </div>

  <Toggle label={t("Enable debug logging")} description={t("Create log file for this SQM instance under /var/run/sqm/${Interface_name}.[start|stop]-sqm.log.")}
    checked={q.debug_logging} onchange={(v) => q.debug_logging = v} />

  <Select label={t("Log verbosity")} options={verbosityOptions} bind:value={q.verbosity}
    description={t("Verbosity of SQM's output into the system log.")} />
</div>
