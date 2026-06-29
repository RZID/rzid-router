<script lang="ts">
  // Helpers
  import { cn } from "../../../helpers/classname";
  import { getLocale, onLocaleChange, t } from "../../../i18n";

  // Components
  import Toggle from "../../../components/Toggle/Toggle.svelte";

  // Props
  let { dnsForm, labelCls } = $props<{
    dnsForm: Record<string, any>;
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
  <!-- svelte-ignore a11y_label_has_associated_control -->
  <label class={labelCls}>{trans("Log facility")}</label>
  <p class={cn("text-xs", "text-muted", "mb-1")}>
    {trans("Set log class/facility for syslog entries.")}
  </p>
  <select
    bind:value={dnsForm.logfacility}
    class={cn(
      "w-full",
      "px-2.5",
      "py-1.5",
      "border",
      "text-xs",
      "text-fg",
      "rounded-md",
      "bg-surface",
      "outline-none",
      "border-border",
      "focus:border-(--accent)",
    )}
  >
    <option value="">{trans("Select...")}</option>
    {#each ["KERN", "USER", "MAIL", "DAEMON", "AUTH", "LPR", "NEWS", "UUCP", "CRON", "LOCAL0", "LOCAL1", "LOCAL2", "LOCAL3", "LOCAL4", "LOCAL5", "LOCAL6", "LOCAL7"] as f}
      <option value={f}>{f}</option>
    {/each}
    <option value="-">stderr</option>
  </select>
</div>
