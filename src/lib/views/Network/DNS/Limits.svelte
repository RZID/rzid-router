<script lang="ts">
  // Helpers
  import { getLocale, onLocaleChange, t } from "../../../i18n";

  // Components
  import Input from "../../../components/Input/Input.svelte";

  // Props
  let { dnsForm } = $props<{
    dnsForm: Record<string, string | boolean | string[]>;
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

<Input
  type="number"
  placeholder="1280"
  bind:value={dnsForm.ednspacket_max}
  label={trans("Max. EDNS0 packet size")}
  description={trans("Maximum allowed size of EDNS0 UDP packets.")}
/>
<Input
  type="number"
  placeholder="150"
  bind:value={dnsForm.dnsforwardmax}
  label={trans("Max. concurrent queries")}
  description={trans("Maximum allowed number of concurrent DNS queries.")}
/>
<Input
  type="number"
  placeholder="150"
  bind:value={dnsForm.cachesize}
  label={trans("Size of DNS query cache")}
  description={trans(
    "Number of cached DNS entries, 10000 is maximum, 0 is no caching.",
  )}
/>
<Input
  type="number"
  placeholder="60"
  label={trans("Min cache TTL")}
  bind:value={dnsForm.min_cache_ttl}
  description={trans(
    "Extend short TTL values to the seconds value given when caching them. Use with caution.",
  ) +
    " " +
    trans("(Max 1h == 3600)")}
/>
<Input
  type="number"
  placeholder="3600"
  label={trans("Max cache TTL")}
  bind:value={dnsForm.max_cache_ttl}
  description={trans(
    "Set a maximum seconds TTL value for entries in the cache.",
  )}
/>
