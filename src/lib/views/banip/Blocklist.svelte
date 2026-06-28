<script lang="ts">
  import { onMount } from "svelte";
  import { Save } from "@lucide/svelte";
  import { cn } from "../../helpers/classname";
  import { t as _t, getLocale, onLocaleChange } from "../../i18n";
  import { readFile, writeFile, statFile } from "../../api/ubus";
  import Textarea from "../../components/Textarea/index.svelte";

  let locale = $state(getLocale());
  let trans = $derived.by(() => { locale; return (k: string) => _t(k); });
  $effect(() => onLocaleChange(() => { locale = getLocale(); }));

  let content = $state("");
  let loading = $state(true);
  let saving = $state(false);
  let feedback = $state("");

  const LOCAL_FILE = "/etc/banip/banip.blocklist";

  onMount(async () => {
    const stat = await statFile(LOCAL_FILE).catch(() => null);
    if (!stat) {
      await writeFile(LOCAL_FILE, "").catch(() => {});
      loading = false;
      return;
    }
    const res = await readFile(LOCAL_FILE).catch(() => null);
    if (res?.data) content = res.data;
    loading = false;
  });

  const save = async () => {
    saving = true;
    feedback = "";
    try {
      const val = (content || "").trim().toLowerCase().replace(/\r\n?/g, "\n");
      await writeFile(LOCAL_FILE, val + "\n");
      content = val + "\n";
      feedback = "Saved";
    } catch {
      feedback = "Save failed";
    }
    saving = false;
    setTimeout(() => { feedback = ""; }, 3000);
  };
</script>

<div class={cn("flex", "flex-col", "min-h-0", "animate-fade-in", "gap-5")}>
  <div class={cn("shrink-0")}>
    <div>
      <h1 class={cn("text-lg", "font-semibold", "text-white")}>{trans("Edit Blocklist")}</h1>
      <p class={cn("text-sm", "mt-0.5", "text-muted")}>
        {trans("This is the local banIP blocklist.")}<br />
        {trans("Add only exactly one MAC/IPv4/IPv6 address or domain name per line.")}
      </p>
    </div>
  </div>
  <div class={cn("flex", "items-center", "gap-3")}>
    {#if feedback}
      <span class={cn("text-xs", "font-mono", feedback === "Saved" ? "text-accent" : "text-danger")}>{feedback}</span>
    {/if}
    <button
      onclick={save}
      disabled={saving || loading}
      class={cn("px-3", "py-1.5", "text-xs", "rounded-lg", "font-medium", "duration-150", "transition-all", "inline-flex", "items-center", "gap-1.5", "border", "cursor-pointer", saving ? "text-muted bg-surface-3 border-transparent" : "text-accent bg-accent/10 border-accent/20", "disabled:opacity-30")}
    >
      <Save size={14} />
      {saving ? trans("Saving...") : trans("Save")}
    </button>
  </div>

  {#if loading}
    <div class={cn("glass", "p-8", "rounded-xl", "animate-slide-up", "flex", "items-center", "justify-center")}>
      <span class={cn("text-xs", "text-muted")}>{trans("Loading...")}</span>
    </div>
  {:else}
    <div class={cn("glass", "p-5", "rounded-xl", "animate-slide-up")}>
      <Textarea bind:value={content} rows={25} placeholder={trans("Enter MAC/IPv4/IPv6 addresses, one per line...")} />
    </div>
  {/if}
</div>
