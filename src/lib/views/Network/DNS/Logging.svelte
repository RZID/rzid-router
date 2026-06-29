<script lang="ts">
  // Helpers
  import { cn } from "../../../helpers/classname";
  import { getLocale, onLocaleChange, t } from "../../../i18n";

  // Components
  import Toggle from "../../../components/Toggle/Toggle.svelte";
  import Select from "../../../components/Select/Select.svelte";

  // Props
  let { dnsForm, labelCls } = $props<{
    dnsForm: Record<string, string | boolean | string[]>;
    labelCls: string;
  }>();

  // States
  let locale = $state(getLocale());

  // Derives
  let trans = $derived.by(() => {
    locale;
    return (k: string) => t(k);
  });

  // Effects
  $effect(() =>
    onLocaleChange(() => {
      locale = getLocale();
    }),
  );
</script>

<Toggle
  label={trans("Log queries")}
  description={trans("Write received DNS queries to syslog.") +
    " " +
    trans("Dump cache on SIGUSR1, include requesting IP.")}
  bind:checked={dnsForm.logqueries}
/>
<div>
  <Select
    label={trans("Log facility")}
    description={trans("Set log class/facility for syslog entries.")}
    bind:value={dnsForm.logfacility}
    placeholder={trans("Select...")}
    options={[
      ...["KERN", "USER", "MAIL", "DAEMON", "AUTH", "LPR", "NEWS", "UUCP", "CRON", "LOCAL0", "LOCAL1", "LOCAL2", "LOCAL3", "LOCAL4", "LOCAL5", "LOCAL6", "LOCAL7"].map((f) => ({ value: f, label: f })),
      { value: "-", label: "stderr" },
    ]}
  />
</div>
