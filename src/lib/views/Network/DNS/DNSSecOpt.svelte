<script lang="ts">
  // Helpers
  import { getLocale, onLocaleChange, t } from "../../../i18n";

  // Components
  import Toggle from "../../../components/Toggle/Toggle.svelte";

  // States
  let locale = $state(getLocale());

  // Derives
  let trans = $derived.by(() => {
    locale;
    return (k: string) => t(k);
  });

  // Hooks
  $effect(() =>
    onLocaleChange(() => {
      locale = getLocale();
    }),
  );

  // Props
  let { dnsForm } = $props<{
    dnsForm: Record<string, string | boolean | string[]>;
  }>();
</script>

<Toggle
  label={trans("DNSSEC")}
  description={trans(
    "Validate DNS replies and cache DNSSEC data, requires upstream to support DNSSEC.",
  )}
  bind:checked={dnsForm.dnssec}
/>
<Toggle
  label={trans("DNSSEC check unsigned")}
  description={trans(
    "Verify unsigned domain responses really come from unsigned domains.",
  )}
  bind:checked={dnsForm.dnsseccheckunsigned}
/>
