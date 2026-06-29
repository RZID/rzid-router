<script lang="ts">
  import { Globe, Save } from "@lucide/svelte";
  import { cn } from "../../../helpers/classname";
  import Toggle from "../../../components/Toggle/Toggle.svelte";
  import { uciGet, uciSetSection, uciCommit } from "../../../api/ubus";

  let { trans }: { trans: (k: string) => string } = $props();

  let saving = $state(false);
  let uhRedirectHttps = $state(false);
  let uhttpdSection = $state("");

  const loadUhttpdConfig = async () => {
    const cfg = await uciGet("uhttpd");
    if (!cfg?.values) return;
    const main = Object.values(cfg.values).find(
      (s: any) => s[".type"] === "uhttpd",
    ) as any;
    if (!main) return;
    uhttpdSection = main[".name"];
    uhRedirectHttps = main.redirect_https === "1";
  };

  const saveUhttpdConfig = async () => {
    if (!uhttpdSection) return;
    saving = true;
    await uciSetSection("uhttpd", uhttpdSection, {
      redirect_https: uhRedirectHttps ? "1" : "0",
    });
    await uciCommit("uhttpd");
    saving = false;
  };

  $effect(() => {
    loadUhttpdConfig();
  });

  const btnBase =
    "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium transition-all duration-150 cursor-pointer select-none";
  const btnPrimary = (d: boolean) =>
    cn(
      btnBase,
      d
        ? "border text-muted bg-surface-3 border-transparent cursor-not-allowed"
        : "border text-accent bg-accent/10 border-accent/20",
    );
</script>

<div class={cn("space-y-4", "max-w-lg")}>
  <div class={cn("glass", "p-5", "animate-slide-up")}>
    <div class={cn("flex", "items-center", "gap-2", "mb-4")}>
      <Globe size={14} class={cn("text-accent")} />
      <span
        class={cn(
          "inline-flex items-center gap-1.5 text-[10px] uppercase text-muted font-semibold tracking-wider mb-1.5",
        )}>{trans("HTTP(S) Server (uHTTPd)")}</span
      >
    </div>
    <p class={cn("text-[10px]", "text-muted", "mb-4")}>
      {trans(
        "uHTTPd offers HTTP or HTTPS network access to the web interface.",
      )}
    </p>
    <Toggle
      label={trans("Redirect to HTTPS")}
      description={trans(
        "Enable automatic redirection of HTTP requests to the HTTPS port",
      )}
      bind:checked={uhRedirectHttps}
    />
    <div class={cn("flex", "items-center", "gap-2", "mt-4")}>
      <button
        onclick={saveUhttpdConfig}
        disabled={saving}
        class={btnPrimary(saving)}
      >
        {#if saving}<Save size={12} class={cn("animate-pulse")} />{:else}<Save
            size={12}
          />{/if}
        {saving ? trans("Saving…") : trans("Save & Apply")}
      </button>
    </div>
  </div>
</div>
