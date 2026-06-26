<script lang="ts">
  import { onMount, onDestroy } from "svelte";
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

  let tab = $state<"syslog" | "dmesg">("syslog");
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

<div class="h-full flex flex-col overflow-hidden p-6 gap-4 animate-fade-in">
  <!-- Header -->
  <div class="shrink-0 flex items-start justify-between gap-4">
    <div>
      <h1 class="text-lg font-semibold text-white">System Log</h1>
      <p class="text-sm mt-0.5" style="color: var(--text-muted)">
        Kernel and system logs
      </p>
    </div>

    <div
      class="flex gap-1 rounded-lg p-0.5 shrink-0"
      style="background:var(--surface-2);border:1px solid var(--border)"
    >
      <button
        class="px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer"
        style="background:{tab === 'syslog'
          ? 'var(--accent)'
          : 'transparent'};color:{tab === 'syslog'
          ? '#0d1117'
          : 'var(--text-muted)'}"
        onclick={() => {
          tab = "syslog";
          refresh();
        }}
      >
        System Log
      </button>
      <button
        class="px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer"
        style="background:{tab === 'dmesg'
          ? 'var(--accent)'
          : 'transparent'};color:{tab === 'dmesg'
          ? '#0d1117'
          : 'var(--text-muted)'}"
        onclick={() => {
          tab = "dmesg";
          refresh();
        }}
      >
        Kernel Log
      </button>
    </div>
  </div>

  <!-- Main panel -->
  <div
    class="glass flex-1 flex flex-col min-h-0 overflow-hidden animate-slide-up"
  >
    <!-- Filters -->
    <div class="shrink-0 p-4" style="border-bottom:1px solid var(--border)">
      <div class="flex items-center justify-between mb-3">
        <span
          class="text-xs font-semibold uppercase tracking-wider"
          style="color:var(--text-muted)"
        >
          Filters
        </span>
        {#if loading}
          <span
            class="text-xs flex items-center gap-1.5"
            style="color:var(--accent)"
          >
            <span
              class="w-1.5 h-1.5 rounded-full animate-pulse"
              style="background:var(--accent)"
            ></span>
            Refreshing…
          </span>
        {/if}
      </div>

      {#if tab === "syslog"}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div
            class="rounded-lg p-3"
            style="background:var(--surface-2);border:1px solid var(--border)"
          >
            <label
              class="block text-[10px] font-semibold uppercase tracking-wider mb-2"
              style="color:var(--text-muted)"
            >
              Facility
            </label>
            <div class="flex items-center gap-2">
              <select
                class="flex-1 min-w-0 px-2.5 py-1.5 rounded-md text-xs outline-none focus:ring-1 focus:ring-[var(--accent)]"
                style="background:var(--surface);border:1px solid var(--border);color:var(--text)"
                bind:value={sysFilters.facility}
                onchange={applyFilters}
              >
                {#each LOG_FACILITIES as opt}
                  <option value={opt.value}>{opt.label}</option>
                {/each}
              </select>
              <button
                type="button"
                class="shrink-0 px-2 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all cursor-pointer"
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
                Not
              </button>
            </div>
          </div>

          <div
            class="rounded-lg p-3"
            style="background:var(--surface-2);border:1px solid var(--border)"
          >
            <label
              class="block text-[10px] font-semibold uppercase tracking-wider mb-2"
              style="color:var(--text-muted)"
            >
              Severity
            </label>
            <div class="flex items-center gap-2">
              <select
                class="flex-1 min-w-0 px-2.5 py-1.5 rounded-md text-xs outline-none focus:ring-1 focus:ring-[var(--accent)]"
                style="background:var(--surface);border:1px solid var(--border);color:var(--text)"
                bind:value={sysFilters.severity}
                onchange={applyFilters}
              >
                {#each LOG_SEVERITIES as opt}
                  <option value={opt.value}>{opt.label}</option>
                {/each}
              </select>
              <button
                type="button"
                class="shrink-0 px-2 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all cursor-pointer"
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
                Not
              </button>
            </div>
          </div>

          <div
            class="rounded-lg p-3 sm:col-span-2 lg:col-span-1"
            style="background:var(--surface-2);border:1px solid var(--border)"
          >
            <label
              class="block text-[10px] font-semibold uppercase tracking-wider mb-2"
              style="color:var(--text-muted)"
            >
              Search
            </label>
            <div class="flex items-center gap-2">
              <input
                class="flex-1 min-w-0 px-2.5 py-1.5 rounded-md text-xs font-mono outline-none focus:ring-1 focus:ring-[var(--accent)]"
                style="background:var(--surface);border:1px solid var(--border);color:var(--text)"
                bind:value={sysFilters.text}
                oninput={applyFilters}
                placeholder="Filter text…"
              />
              <button
                type="button"
                class="shrink-0 px-2 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all cursor-pointer"
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
                Not
              </button>
            </div>
          </div>

          <div
            class="rounded-lg p-3"
            style="background:var(--surface-2);border:1px solid var(--border)"
          >
            <label
              class="block text-[10px] font-semibold uppercase tracking-wider mb-2"
              style="color:var(--text-muted)"
            >
              Max rows
            </label>
            <input
              type="number"
              min="1"
              class="w-full px-2.5 py-1.5 rounded-md text-xs font-mono outline-none focus:ring-1 focus:ring-[var(--accent)]"
              style="background:var(--surface);border:1px solid var(--border);color:var(--text)"
              bind:value={sysFilters.maxRows}
              onchange={applyFilters}
            />
          </div>
        </div>
      {:else}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div
            class="rounded-lg p-3 sm:col-span-2"
            style="background:var(--surface-2);border:1px solid var(--border)"
          >
            <label
              class="block text-[10px] font-semibold uppercase tracking-wider mb-2"
              style="color:var(--text-muted)"
            >
              Time range
            </label>
            <div class="flex flex-wrap items-center gap-2">
              <input
                type="number"
                min="0"
                step="0.1"
                class="flex-1 min-w-[6rem] px-2.5 py-1.5 rounded-md text-xs font-mono outline-none focus:ring-1 focus:ring-[var(--accent)]"
                style="background:var(--surface);border:1px solid var(--border);color:var(--text)"
                bind:value={dmesgFilters.fromTime}
                oninput={applyFilters}
                placeholder="From"
              />
              <span class="text-xs" style="color:var(--text-muted)">→</span>
              <input
                type="number"
                min="0"
                step="0.1"
                class="flex-1 min-w-[6rem] px-2.5 py-1.5 rounded-md text-xs font-mono outline-none focus:ring-1 focus:ring-[var(--accent)]"
                style="background:var(--surface);border:1px solid var(--border);color:var(--text)"
                bind:value={dmesgFilters.toTime}
                oninput={applyFilters}
                placeholder="To"
              />
              <button
                type="button"
                class="shrink-0 px-2 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all cursor-pointer"
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
                Not
              </button>
            </div>
          </div>

          <div
            class="rounded-lg p-3"
            style="background:var(--surface-2);border:1px solid var(--border)"
          >
            <label
              class="block text-[10px] font-semibold uppercase tracking-wider mb-2"
              style="color:var(--text-muted)"
            >
              Severity
            </label>
            <div class="flex items-center gap-2">
              <select
                class="flex-1 min-w-0 px-2.5 py-1.5 rounded-md text-xs outline-none focus:ring-1 focus:ring-[var(--accent)]"
                style="background:var(--surface);border:1px solid var(--border);color:var(--text)"
                bind:value={dmesgFilters.minSeverity}
                onchange={applyFilters}
              >
                {#each DMESG_SEVERITIES as opt}
                  <option value={opt.value}>{opt.label}</option>
                {/each}
              </select>
              <button
                type="button"
                class="shrink-0 px-2 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all cursor-pointer"
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
                Not
              </button>
            </div>
            <p class="text-[10px] mt-1.5" style="color:var(--text-muted)">
              and above
            </p>
          </div>

          <div
            class="rounded-lg p-3"
            style="background:var(--surface-2);border:1px solid var(--border)"
          >
            <label
              class="block text-[10px] font-semibold uppercase tracking-wider mb-2"
              style="color:var(--text-muted)"
            >
              Search
            </label>
            <div class="flex items-center gap-2">
              <input
                class="flex-1 min-w-0 px-2.5 py-1.5 rounded-md text-xs font-mono outline-none focus:ring-1 focus:ring-[var(--accent)]"
                style="background:var(--surface);border:1px solid var(--border);color:var(--text)"
                bind:value={dmesgFilters.text}
                oninput={applyFilters}
                placeholder="Filter text…"
              />
              <button
                type="button"
                class="shrink-0 px-2 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all cursor-pointer"
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
                Not
              </button>
            </div>
          </div>

          <div
            class="rounded-lg p-3 flex items-end"
            style="background:var(--surface-2);border:1px solid var(--border)"
          >
            <button
              type="button"
              class="w-full px-2.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer"
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
              Reverse sort
            </button>
          </div>
        </div>
      {/if}

      {#if error}
        <p
          class="text-xs mt-3 px-3 py-2 rounded-lg"
          style="color:var(--danger);background:rgba(255,77,79,0.08);border:1px solid rgba(255,77,79,0.2)"
        >
          {error}
        </p>
      {/if}
    </div>

    <!-- Log output -->
    <div class="flex-1 flex flex-col min-h-0">
      <div
        class="shrink-0 flex items-center justify-between px-4 py-2"
        style="border-bottom:1px solid var(--border);background:rgba(0,0,0,0.15)"
      >
        <span class="text-xs font-mono" style="color:var(--text-muted)">
          {lineCount}
          {lineCount === 1 ? "line" : "lines"}
        </span>
        <div class="flex items-center gap-1.5">
          <button
            type="button"
            class="px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer hover:bg-white/5"
            style="color:var(--text-muted);border:1px solid var(--border)"
            onclick={scrollToHead}
          >
            ↑ Head
          </button>
          <button
            type="button"
            class="px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer hover:bg-white/5"
            style="color:var(--text-muted);border:1px solid var(--border)"
            onclick={scrollToTail}
          >
            ↓ Tail
          </button>
        </div>
      </div>

      <div class="flex-1 min-h-0 p-3">
        <textarea
          bind:this={logArea}
          readonly
          wrap="off"
          class="w-full h-full rounded-lg p-3 text-xs font-mono outline-none resize-none overflow-auto block"
          style="background:var(--surface);border:1px solid var(--border);color:var(--text);line-height:1.6"
          value={logText}
        ></textarea>
      </div>
    </div>
  </div>
</div>
