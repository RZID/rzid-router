<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { readLogEntries, readDmesg, uciGet } from "../../api/ubus";
  import {
    LOG_FACILITIES,
    LOG_SEVERITIES,
    DMESG_SEVERITIES,
    formatSystemLogLines,
    filterSystemLogLines,
    parseDmesg,
    filterDmesgLines,
    parseSystemClockPrefs,
    type SystemLogFilters,
    type DmesgFilters,
  } from "../../logs";
  import { cn } from "../../helpers/classname";
  import { t as _t, getLocale, onLocaleChange } from "../../i18n";
  import SyslogFilters from "./Logs/SyslogFilters.svelte";
  import DmesgFilterPanel from "./Logs/DmesgFilters.svelte";
  import LogOutput from "./Logs/LogOutput.svelte";

  let locale = $state(getLocale());
  let trans = $derived.by(() => {
    locale;
    return (k: string) => _t(k);
  });
  $effect(() =>
    onLocaleChange(() => {
      locale = getLocale();
    }),
  );

  let tab = $state<"syslog" | "dmesg">("syslog");
  let tabDir = $state("left");

  const switchTab = (t: "syslog" | "dmesg") => {
    if (t === tab) return;
    tabDir = t === "syslog" ? "right" : "left";
    tab = t;
    refresh();
  };

  let logText = $state("");
  let loading = $state(true);
  let error = $state("");
  let interval: ReturnType<typeof setInterval>;
  let clockPrefs = $state(parseSystemClockPrefs(null));

  let sysFilters = $state<SystemLogFilters>({
    facility: "any",
    invertFacility: false,
    severity: "any",
    invertSeverity: false,
    text: "",
    invertText: false,
    maxRows: 1000,
  });

  let dmesgFilters = $state<DmesgFilters>({
    fromTime: "",
    toTime: "",
    invertTimeRange: false,
    minSeverity: "",
    invertSeverity: false,
    reverseSort: false,
    text: "",
    invertText: false,
  });

  const lineCount = $derived(logText ? logText.split("\n").length : 0);

  const refreshSyslog = async () => {
    const entries = await readLogEntries(sysFilters.maxRows);
    if (!entries) {
      error = "Unable to load log data";
      logText = "";
      return;
    }
    error = "";
    logText = filterSystemLogLines(
      formatSystemLogLines(entries, clockPrefs),
      sysFilters,
    ).join("\n");
  };

  const refreshDmesg = async () => {
    const res = await readDmesg();
    if (!res?.stdout) {
      error = "Unable to load kernel log data";
      logText = "";
      return;
    }
    error = "";
    logText = filterDmesgLines(parseDmesg(res.stdout), dmesgFilters)
      .map((l) => l.text)
      .join("\n");
  };

  const refresh = async () => {
    loading = true;
    if (tab === "syslog") await refreshSyslog();
    else await refreshDmesg();
    loading = false;
  };

  const applyFilters = () => refresh();

  onMount(async () => {
    const uci = await uciGet("system");
    if (uci) clockPrefs = parseSystemClockPrefs(uci);
    await refresh();
    interval = setInterval(refresh, 3000);
  });

  onDestroy(() => clearInterval(interval));
</script>

<div
  class={cn(
    "p-6",
    "flex",
    "gap-4",
    "h-full",
    "flex-col",
    "overflow-hidden",
    "animate-fade-in",
  )}
>
  <div
    class={cn("shrink-0", "flex", "items-start", "justify-between", "gap-4")}
  >
    <div>
      <h1 class={cn("text-lg", "font-semibold", "text-white")}>
        {trans("System Log")}
      </h1>
      <p class={cn("text-sm", "mt-0.5")}>{trans("Kernel and system logs")}</p>
    </div>
    <div
      class={cn(
        "flex",
        "gap-1",
        "p-0.5",
        "border",
        "shrink-0",
        "rounded-lg",
        "bg-surface-2",
        "border-border",
      )}
    >
      <button
        class={cn(
          "px-3",
          "py-1.5",
          "text-xs",
          "rounded-md",
          "font-medium",
          "transition-all",
          "cursor-pointer",
        )}
        style="background:{tab === 'syslog'
          ? 'var(--accent)'
          : 'transparent'};color:{tab === 'syslog'
          ? '#0d1117'
          : 'var(--text-muted)'}"
        onclick={() => switchTab("syslog")}>{trans("System Log")}</button
      >
      <button
        class={cn(
          "px-3",
          "py-1.5",
          "text-xs",
          "rounded-md",
          "font-medium",
          "transition-all",
          "cursor-pointer",
        )}
        style="background:{tab === 'dmesg'
          ? 'var(--accent)'
          : 'transparent'};color:{tab === 'dmesg'
          ? '#0d1117'
          : 'var(--text-muted)'}"
        onclick={() => switchTab("dmesg")}>{trans("Kernel Log")}</button
      >
    </div>
  </div>

  {#key tab}
    <div
      class={cn(
        "flex",
        "glass",
        "animate-slide-up",
        "flex-1",
        "min-h-0",
        "flex-col",
        "overflow-hidden",
        tabDir === "left" ? "animate-slide-left" : "animate-slide-right",
      )}
    >
      <div class={cn("shrink-0", "p-4", "border-b", "border-border")}>
        <div class={cn("flex", "items-center", "justify-between", "mb-3")}>
          <span
            class={cn(
              "text-xs",
              "uppercase",
              "text-muted",
              "font-semibold",
              "tracking-wider",
            )}>{trans("Filters")}</span
          >
          {#if loading}
            <span
              class={cn(
                "flex",
                "text-xs",
                "gap-1.5",
                "items-center",
                "text-accent",
              )}
            >
              <span
                class={cn(
                  "w-1.5",
                  "h-1.5",
                  "bg-accent",
                  "rounded-full",
                  "animate-pulse",
                )}
              ></span>
              {trans("Refreshing...")}
            </span>
          {/if}
        </div>
        {#if tab === "syslog"}
          <SyslogFilters filters={sysFilters} onapply={applyFilters} {trans} />
        {:else}
          <DmesgFilterPanel filters={dmesgFilters} onapply={applyFilters} {trans} />
        {/if}
        {#if error}
          <p
            class={cn(
              "mt-3",
              "px-3",
              "py-2",
              "border",
              "text-xs",
              "rounded-lg",
              "text-danger",
              "bg-danger/10",
              "border-danger/20",
            )}
          >
            {error}
          </p>
        {/if}
      </div>
      <LogOutput {logText} {lineCount} {trans} />
    </div>
  {/key}
</div>
