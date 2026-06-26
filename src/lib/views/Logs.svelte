<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { ArrowRight, ArrowUp, ArrowDown } from "@lucide/svelte";
  import { readLogEntries, readDmesg, uciGet } from "../api/ubus";
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
  } from "../logs";
  import Select from "../components/Select/index.svelte";
  import Input from "../components/Input/index.svelte";
  import { cn } from "../helpers/classname";
  import { t as _t, getLocale, onLocaleChange } from "../i18n";

  let locale = $state(getLocale());
  let trans = $derived.by(() => { locale; return (k: string) => _t(k); });
  $effect(() => onLocaleChange(() => { locale = getLocale(); }));

  let tab = $state<"syslog" | "dmesg">("syslog");
  let prevTab = $state("syslog");
  let tabDir = $state("left");

  const switchTab = (t: "syslog" | "dmesg") => {
    if (t === tab) return;
    tabDir = t === "syslog" ? "right" : "left";
    prevTab = t;
    tab = t;
    refresh();
  };
  let logText = $state("");
  let loading = $state(true);
  let error = $state("");
  let interval: ReturnType<typeof setInterval>;
  let logArea: HTMLTextAreaElement | undefined = $state();
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
    const lines = formatSystemLogLines(entries, clockPrefs);
    logText = filterSystemLogLines(lines, sysFilters).join("\n");
  };

  const refreshDmesg = async () => {
    const res = await readDmesg();
    if (!res?.stdout) {
      error = "Unable to load kernel log data";
      logText = "";
      return;
    }
    error = "";
    const lines = filterDmesgLines(parseDmesg(res.stdout), dmesgFilters);
    logText = lines.map((l) => l.text).join("\n");
  };

  const refresh = async () => {
    loading = true;
    if (tab === "syslog") await refreshSyslog();
    else await refreshDmesg();
    loading = false;
  };

  const applyFilters = () => refresh();

  const scrollToHead = () => logArea?.scrollTo({ top: 0, behavior: "smooth" });
  const scrollToTail = () => {
    if (logArea)
      logArea.scrollTo({ top: logArea.scrollHeight, behavior: "smooth" });
  };

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
  <!-- Header -->
  <div
    class={cn("shrink-0", "flex", "items-start", "justify-between", "gap-4")}
  >
    <div>
      <h1 class={cn("text-lg", "font-semibold", "text-white")}>{trans("System Log")}</h1>
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
        onclick={() => switchTab("syslog")}
      >
{trans("System Log")}
      </button>
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
        onclick={() => switchTab("dmesg")}
      >
        {trans("Kernel Log")}
      </button>
    </div>
  </div>

  <!-- Main panel -->
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
    <!-- Filters -->
    <div class={cn("shrink-0", "p-4", "border-b", "border-border")}>
      <div class={cn("flex", "items-center", "justify-between", "mb-3")}>
        <span
          class={cn(
            "text-xs",
            "uppercase",
            "text-muted",
            "font-semibold",
            "tracking-wider",
          )}
        >
{trans("Filters")}
        </span>
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
        <div
          class={cn(
            "grid",
            "gap-3",
            "grid-cols-1",
            "sm:grid-cols-2",
            "lg:grid-cols-4",
          )}
        >
          <div
            class={cn(
              "p-3",
              "border",
              "rounded-lg",
              "bg-surface-2",
              "border-border",
            )}
          >
            <label
              class={cn(
                "mb-2",
                "block",
                "uppercase",
                "text-muted",
                "text-[10px]",
                "font-semibold",
                "tracking-wider",
              )}
              for="facility-select"
            >
{trans("Facility")}
            </label>
            <div
              id="facility-select"
              class={cn("flex", "items-center", "gap-2")}
            >
              <Select
                options={LOG_FACILITIES}
                bind:value={sysFilters.facility}
                onchange={applyFilters}
                class="flex-1"
              />
              <button
                type="button"
                class={cn(
                  "px-2",
                  "py-1.5",
                  "shrink-0",
                  "uppercase",
                  "rounded-md",
                  "text-[10px]",
                  "font-semibold",
                  "tracking-wide",
                  "transition-all",
                  "cursor-pointer",
                )}
                style="background:{sysFilters.invertFacility
                  ? 'rgba(255,77,79,0.15)'
                  : 'var(--surface)'};color:{sysFilters.invertFacility
                  ? 'var(--danger)'
                  : 'var(--text-muted)'};border:1px solid {sysFilters.invertFacility
                  ? 'rgba(255,77,79,0.3)'
                  : 'var(--border)'}"
                onclick={() => {
                  sysFilters.invertFacility = !sysFilters.invertFacility;
                  applyFilters();
                }}
              >
                {trans("Not")}
              </button>
            </div>
          </div>

          <div
            class={cn(
              "rounded-lg",
              "p-3",
              "bg-surface-2",
              "border",
              "border-border",
            )}
          >
            <label
              for="severity-select"
              class={cn(
                "mb-2",
                "block",
                "uppercase",
                "text-muted",
                "text-[10px]",
                "font-semibold",
                "tracking-wider",
              )}
            >
              {trans("Severity")}
            </label>
            <div
              class={cn("flex", "items-center", "gap-2")}
              id="severity-select"
            >
              <Select
                options={LOG_SEVERITIES}
                bind:value={sysFilters.severity}
                onchange={applyFilters}
                class="flex-1"
              />
              <button
                type="button"
                class={cn(
                  "px-2",
                  "py-1.5",
                  "shrink-0",
                  "uppercase",
                  "rounded-md",
                  "text-[10px]",
                  "font-semibold",
                  "tracking-wide",
                  "transition-all",
                  "cursor-pointer",
                )}
                style="background:{sysFilters.invertSeverity
                  ? 'rgba(255,77,79,0.15)'
                  : 'var(--surface)'};color:{sysFilters.invertSeverity
                  ? 'var(--danger)'
                  : 'var(--text-muted)'};border:1px solid {sysFilters.invertSeverity
                  ? 'rgba(255,77,79,0.3)'
                  : 'var(--border)'}"
                onclick={() => {
                  sysFilters.invertSeverity = !sysFilters.invertSeverity;
                  applyFilters();
                }}
              >
                {trans("Not")}
              </button>
            </div>
          </div>

          <div
            class={cn(
              "p-3",
              "border",
              "rounded-lg",
              "sm:col-span-2",
              "lg:col-span-1",
              "bg-surface-2",
              "border-border",
            )}
          >
            <label
              for="search-select"
              class={cn(
                "mb-2",
                "block",
                "uppercase",
                "text-muted",
                "text-[10px]",
                "font-semibold",
                "tracking-wider",
              )}
            >
              {trans("Search")}
            </label>
            <div id="search-select" class={cn("flex", "items-center", "gap-2")}>
              <Input
                bind:value={sysFilters.text}
                oninput={applyFilters}
                placeholder={trans("Filter text...")}
                mono
                class="flex-1"
              />
              <button
                type="button"
                class={cn(
                  "px-2",
                  "py-1.5",
                  "shrink-0",
                  "uppercase",
                  "rounded-md",
                  "text-[10px]",
                  "font-semibold",
                  "tracking-wide",
                  "transition-all",
                  "cursor-pointer",
                )}
                style="background:{sysFilters.invertText
                  ? 'rgba(255,77,79,0.15)'
                  : 'var(--surface)'};color:{sysFilters.invertText
                  ? 'var(--danger)'
                  : 'var(--text-muted)'};border:1px solid {sysFilters.invertText
                  ? 'rgba(255,77,79,0.3)'
                  : 'var(--border)'}"
                onclick={() => {
                  sysFilters.invertText = !sysFilters.invertText;
                  applyFilters();
                }}
              >
                {trans("Not")}
              </button>
            </div>
          </div>

          <div
            class={cn(
              "p-3",
              "border",
              "rounded-lg",
              "bg-surface-2",
              "border-border",
            )}
          >
            <label
              for="max-rows-select"
              class={cn(
                "mb-2",
                "block",
                "uppercase",
                "text-muted",
                "text-[10px]",
                "font-semibold",
                "tracking-wider",
              )}
            >
              {trans("Max rows")}
            </label>
            <Input
              type="number"
              bind:value={sysFilters.maxRows}
              onchange={applyFilters}
              mono
              class="w-full"
            />
          </div>
        </div>
      {:else}
        <div
          class={cn(
            "grid",
            "gap-3",
            "grid-cols-1",
            "sm:grid-cols-2",
            "lg:grid-cols-4",
          )}
        >
          <div
            class={cn(
              "p-3",
              "border",
              "rounded-lg",
              "sm:col-span-2",
              "bg-surface-2",
              "border-border",
            )}
          >
            <label
              for="time-range-select"
              class={cn(
                "mb-2",
                "block",
                "uppercase",
                "text-muted",
                "text-[10px]",
                "font-semibold",
                "tracking-wider",
              )}
            >
              {trans("Time range")}
            </label>
            <div
              id="time-range-select"
              class={cn("flex", "flex-wrap", "items-center", "gap-2")}
            >
              <Input
                type="number"
                bind:value={dmesgFilters.fromTime}
                oninput={applyFilters}
                placeholder={trans("From")}
                mono
                class="flex-1 min-w-24"
              />
              <span class={cn("text-xs", "text-muted")}
                ><ArrowRight size={14} class={cn("text-muted")} /></span
              >
              <Input
                type="number"
                bind:value={dmesgFilters.toTime}
                oninput={applyFilters}
                placeholder={trans("To")}
                mono
                class="flex-1 min-w-24"
              />
              <button
                type="button"
                class={cn(
                  "px-2",
                  "py-1.5",
                  "shrink-0",
                  "uppercase",
                  "rounded-md",
                  "text-[10px]",
                  "font-semibold",
                  "tracking-wide",
                  "transition-all",
                  "cursor-pointer",
                )}
                style="background:{dmesgFilters.invertTimeRange
                  ? 'rgba(255,77,79,0.15)'
                  : 'var(--surface)'};color:{dmesgFilters.invertTimeRange
                  ? 'var(--danger)'
                  : 'var(--text-muted)'};border:1px solid {dmesgFilters.invertTimeRange
                  ? 'rgba(255,77,79,0.3)'
                  : 'var(--border)'}"
                onclick={() => {
                  dmesgFilters.invertTimeRange = !dmesgFilters.invertTimeRange;
                  applyFilters();
                }}
              >
                {trans("Not")}
              </button>
            </div>
          </div>

          <div
            class={cn(
              "p-3",
              "border",
              "rounded-lg",
              "bg-surface-2",
              "border-border",
            )}
          >
            <label
              for="severity-select"
              class={cn(
                "mb-2",
                "block",
                "uppercase",
                "text-muted",
                "text-[10px]",
                "font-semibold",
                "tracking-wider",
              )}
            >
              {trans("Severity")}
            </label>
            <div
              id="severity-select"
              class={cn("flex", "items-center", "gap-2")}
            >
              <Select
                options={DMESG_SEVERITIES}
                bind:value={dmesgFilters.minSeverity}
                onchange={applyFilters}
                class="flex-1"
              />
              <button
                type="button"
                class={cn(
                  "px-2",
                  "py-1.5",
                  "shrink-0",
                  "uppercase",
                  "rounded-md",
                  "text-[10px]",
                  "font-semibold",
                  "tracking-wide",
                  "transition-all",
                  "cursor-pointer",
                )}
                style="background:{dmesgFilters.invertSeverity
                  ? 'rgba(255,77,79,0.15)'
                  : 'var(--surface)'};color:{dmesgFilters.invertSeverity
                  ? 'var(--danger)'
                  : 'var(--text-muted)'};border:1px solid {dmesgFilters.invertSeverity
                  ? 'rgba(255,77,79,0.3)'
                  : 'var(--border)'}"
                onclick={() => {
                  dmesgFilters.invertSeverity = !dmesgFilters.invertSeverity;
                  applyFilters();
                }}
              >
                {trans("Not")}
              </button>
            </div>
            <p class={cn("text-[10px]", "mt-1.5", "text-muted")}>{trans("and above")}</p>
          </div>

          <div
            class={cn(
              "p-3",
              "border",
              "rounded-lg",
              "bg-surface-2",
              "border-border",
            )}
          >
            <label
              for="search-input"
              class={cn(
                "mb-2",
                "block",
                "uppercase",
                "text-muted",
                "text-[10px]",
                "font-semibold",
                "tracking-wider",
              )}
            >
              {trans("Search")}
            </label>
            <div class={cn("flex", "items-center", "gap-2")}>
              <Input
                bind:value={dmesgFilters.text}
                oninput={applyFilters}
                placeholder={trans("Filter text...")}
                mono
                class="flex-1"
              />
              <button
                type="button"
                class={cn(
                  "px-2",
                  "py-1.5",
                  "shrink-0",
                  "uppercase",
                  "rounded-md",
                  "text-[10px]",
                  "font-semibold",
                  "tracking-wide",
                  "transition-all",
                  "cursor-pointer",
                )}
                style="background:{dmesgFilters.invertText
                  ? 'rgba(255,77,79,0.15)'
                  : 'var(--surface)'};color:{dmesgFilters.invertText
                  ? 'var(--danger)'
                  : 'var(--text-muted)'};border:1px solid {dmesgFilters.invertText
                  ? 'rgba(255,77,79,0.3)'
                  : 'var(--border)'}"
                onclick={() => {
                  dmesgFilters.invertText = !dmesgFilters.invertText;
                  applyFilters();
                }}
              >
                {trans("Not")}
              </button>
            </div>
          </div>

          <div
            class={cn(
              "p-3",
              "flex",
              "border",
              "items-end",
              "rounded-lg",
              "bg-surface-2",
              "border-border",
            )}
          >
            <button
              type="button"
              class={cn(
                "w-full",
                "px-2.5",
                "py-1.5",
                "text-xs",
                "rounded-md",
                "font-medium",
                "transition-all",
                "cursor-pointer",
              )}
              style="background:{dmesgFilters.reverseSort
                ? 'rgba(0,212,170,0.15)'
                : 'var(--surface)'};color:{dmesgFilters.reverseSort
                ? 'var(--accent)'
                : 'var(--text-muted)'};border:1px solid {dmesgFilters.reverseSort
                ? 'rgba(0,212,170,0.3)'
                : 'var(--border)'}"
              onclick={() => {
                dmesgFilters.reverseSort = !dmesgFilters.reverseSort;
                applyFilters();
              }}
            >
              {trans("Reverse sort")}
            </button>
          </div>
        </div>
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

    <!-- Log output -->
    <div class={cn("flex-1", "flex", "flex-col", "min-h-0")}>
      <div
        class={cn(
          "px-4",
          "py-2",
          "flex",
          "shrink-0",
          "border-b",
          "items-center",
          "bg-black/15",
          "border-border",
          "justify-between",
        )}
      >
        <span class={cn("text-xs", "font-mono", "text-muted")}>
          {lineCount}
          {lineCount === 1 ? trans("line") : trans("lines")}
        </span>
        <div class={cn("flex", "items-center", "gap-1.5")}>
          <button
            type="button"
            class={cn(
              "py-1",
              "px-2.5",
              "border",
              "rounded-md",
              "text-[11px]",
              "text-muted",
              "font-medium",
              "transition-all",
              "cursor-pointer",
              "hover:bg-white/5",
              "border-border",
            )}
            onclick={scrollToHead}
          >
            <ArrowUp size={14} class={cn("text-muted")} /> {trans("Head")}
          </button>
          <button
            type="button"
            class={cn(
              "py-1",
              "px-2.5",
              "border",
              "text-muted",
              "rounded-md",
              "text-[11px]",
              "font-medium",
              "transition-all",
              "cursor-pointer",
              "hover:bg-white/5",
              "border-border",
            )}
            onclick={scrollToTail}
          >
            <ArrowDown size={14} class={cn("text-muted")} /> {trans("Tail")}
          </button>
        </div>
      </div>

      <div class={cn("flex-1", "min-h-0", "p-3")}>
        <textarea
          bind:this={logArea}
          readonly
          wrap="off"
          class={cn(
            "p-3",
            "block",
            "w-full",
            "h-full",
            "border",
            "text-xs",
            "text-fg",
            "font-mono",
            "rounded-lg",
            "resize-none",
            "bg-surface",
            "outline-none",
            "overflow-auto",
            "border-border",
          )}
          value={logText}
        ></textarea>
      </div>
    </div>
  </div>
  {/key}
</div>
