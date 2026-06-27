<script lang="ts">
  import { onMount } from "svelte";
  import { Clock, Save, RefreshCw } from "@lucide/svelte";
  import { cn } from "../helpers/classname";
  import { t as _t, getLocale, onLocaleChange } from "../i18n";
  import { readFile, writeFile, execCommand } from "../api/ubus";

  let locale = $state(getLocale());
  let trans = $derived.by(() => { locale; return (k: string) => _t(k); });
  $effect(() => onLocaleChange(() => { locale = getLocale(); }));

  let content = $state("");
  let original = $state("");
  let loading = $state(true);
  let saving = $state(false);
  let feedback = $state("");

  const CRON_PATH = "/etc/crontabs/root";

  const dirty = $derived(content !== original);

  async function load() {
    loading = true;
    try {
      const res = await readFile(CRON_PATH);
      content = res?.data ?? "";
      original = res?.data ?? "";
    } catch (err) {
      console.error("Failed to read crontab", err);
      content = "# Error reading crontab\n";
    }
    loading = false;
  }

  async function save() {
    saving = true;
    feedback = "";
    try {
      const value = content.trim().replace(/\r\n/g, "\n") + "\n";
      await writeFile(CRON_PATH, value);
      await execCommand("/etc/init.d/cron", ["reload"]);
      content = value;
      original = value;
      feedback = "saved";
    } catch (err) {
      console.error("Failed to save crontab", err);
      feedback = "error";
    }
    saving = false;
    setTimeout(() => { feedback = ""; }, 3000);
  }

  onMount(() => { load(); });
</script>

<div class={cn("p-6", "flex", "flex-col", "h-dvh", "gap-4", "animate-fade-in")}>
  <!-- Header -->
  <div class={cn("shrink-0", "flex", "items-center", "gap-3")}>
    <div class={cn("w-9", "h-9", "rounded-xl", "bg-accent/10", "flex", "items-center", "justify-center", "ring-1", "ring-accent/20", "shrink-0")}>
      <Clock size={16} class="text-accent" />
    </div>
    <div>
      <h1 class={cn("text-lg", "font-semibold", "text-white", "tracking-tight")}>{trans("Scheduled Tasks")}</h1>
      <p class={cn("text-xs", "text-muted")}>{trans("This is the system crontab in which scheduled tasks can be defined.")}</p>
    </div>
  </div>

  <!-- Editor -->
  <div class={cn("flex-1", "min-h-0", "rounded-xl", "overflow-hidden")}>
    <div class={cn("glass", "rounded-xl", "h-full", "flex", "flex-col")}>
      <div class={cn("shrink-0", "p-3", "border-b", "border-border", "flex", "items-center", "justify-between")}>
        <span class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>
          {CRON_PATH}
        </span>
        <span class={cn("text-[10px]", "text-muted")}>
          {content.split("\n").length} {trans("lines")}
        </span>
      </div>
      <div class={cn("flex-1", "min-h-0", "relative")}>
        {#if loading}
          <div class={cn("absolute", "inset-0", "flex", "items-center", "justify-center")}>
            <div class={cn("flex", "flex-col", "items-center", "gap-3")}>
              <div class={cn("w-8", "h-8", "rounded-lg", "bg-surface-3", "animate-pulse")}></div>
              <span class={cn("text-xs", "text-muted", "animate-pulse")}>{trans("Loading…")}</span>
            </div>
          </div>
        {:else}
          <textarea
            bind:value={content}
            class={cn(
              "w-full", "h-full", "p-4",
              "font-mono", "text-xs", "leading-relaxed",
              "bg-transparent", "text-fg",
              "outline-none", "resize-none",
              "placeholder:text-muted/30",
              "whitespace-pre", "break-normal",
              "tab-size-4",
            )}
            placeholder={trans("# Enter cron jobs here\n# Format: minute hour day month weekday command\n")}
          ></textarea>
        {/if}
      </div>
    </div>
  </div>

  <!-- Actions -->
  <div class={cn("shrink-0", "glass", "p-4", "rounded-xl", "flex", "items-center", "justify-between")}>
    <div class={cn("flex", "items-center", "gap-2")}>
      {#if feedback === "saved"}
        <span class={cn("text-xs", "text-accent")}>✓ {trans("Contents have been saved.")}</span>
      {:else if feedback === "error"}
        <span class={cn("text-xs", "text-danger")}>✗ {trans("Failed to save")}</span>
      {:else if dirty}
        <span class={cn("text-xs", "text-warn")}>{trans("Unsaved changes")}</span>
      {:else}
        <span class={cn("text-xs", "text-muted")}>{trans("No changes")}</span>
      {/if}
    </div>
    <div class={cn("flex", "items-center", "gap-2")}>
      <button
        onclick={() => { content = original; feedback = ""; }}
        disabled={!dirty}
        class={cn(
          "px-3", "py-1.5", "rounded-lg", "text-xs", "font-medium",
          "border", "border-border", "bg-surface-2", "text-muted",
          "transition-all", "duration-150", "cursor-pointer",
          "hover:bg-surface-3", "hover:text-fg",
          "disabled:opacity-30", "disabled:cursor-not-allowed",
        )}
      >
        <RefreshCw size={12} class={cn("inline", "mr-1.5")} />
        {trans("Reset")}
      </button>
      <button
        onclick={save}
        disabled={!dirty || saving}
        class={cn(
          "px-3", "py-1.5", "rounded-lg", "text-xs", "font-medium",
          "border", "bg-accent/10", "text-accent", "border-accent/20",
          "transition-all", "duration-150", "cursor-pointer",
          "hover:bg-accent/15", "hover:border-accent/30",
          "disabled:opacity-30", "disabled:cursor-not-allowed",
          saving && "animate-pulse",
        )}
      >
        <Save size={12} class={cn("inline", "mr-1.5")} />
        {saving ? trans("Saving…") : trans("Save")}
      </button>
    </div>
  </div>
</div>
