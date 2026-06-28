<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { cn } from "../../helpers/classname";
  import { t as _t, getLocale, onLocaleChange } from "../../i18n";
  import { readLogEntries } from "../../api/ubus";

  let locale = $state(getLocale());
  let trans = $derived.by(() => { locale; return (k: string) => _t(k); });
  $effect(() => onLocaleChange(() => { locale = getLocale(); }));

  let logText = $state("");
  let pollTimer: ReturnType<typeof setInterval> | undefined;
  let textareaEl: HTMLTextAreaElement | undefined;

  const pollLog = async () => {
    const entries = await readLogEntries(1000);
    if (!entries) {
      logText = trans("No banIP related logs yet!");
      return;
    }
    const filtered = entries
      .filter(e => e.msg?.includes("banIP/"))
      .map(e => {
        const d = e.time ? new Date(e.time * 1000) : new Date();
        const pad = (n: number) => String(n).padStart(2, "0");
        const date = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
        const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        return `[${date}-${time}] ${e.msg}`;
      });
    logText = filtered.length > 0 ? filtered.join("\n") : trans("No banIP related logs yet!");
  };

  $effect(() => {
    if (logText && textareaEl) {
      textareaEl.scrollTop = textareaEl.scrollHeight;
    }
  });

  onMount(() => {
    pollLog();
    pollTimer = setInterval(pollLog, 5000);
  });

  onDestroy(() => clearInterval(pollTimer));
</script>

<div class={cn("flex", "flex-col", "min-h-0", "animate-fade-in", "gap-4")}>
  <div class={cn("shrink-0")}>
    <h1 class={cn("text-lg", "font-semibold", "text-white")}>{trans("Firewall Log")}</h1>
    <p class={cn("text-sm", "mt-0.5", "text-muted")}>
      {trans("The syslog output, pre-filtered for messages related to: banIP")}
    </p>
  </div>

  <div class={cn("glass", "p-5", "rounded-xl", "animate-slide-up")}>
    <textarea
      bind:this={textareaEl}
      readonly
      class={cn("w-full", "min-h-[500px]", "px-2.5", "py-1.5", "border", "text-xs", "font-mono", "text-fg", "rounded-md", "bg-surface", "outline-none", "border-border", "resize-vertical")}
      bind:value={logText}
    ></textarea>
  </div>
</div>
