<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { cn } from "../helpers/classname";
  import { t as _t, getLocale, onLocaleChange } from "../i18n";
  import {
    uciGet, uciSet, uciCommit, call, execCommand,
  } from "../api/ubus";

  let locale = $state(getLocale());
  let trans = $derived.by(() => { locale; return (k: string) => _t(k); });
  $effect(() => onLocaleChange(() => { locale = getLocale(); }));

  const DEFAULT_CONFIG_FILE = "/etc/adguardhome/adguardhome.yaml";
  const DEFAULT_WORK_DIR = "/var/lib/adguardhome";
  const DEFAULT_USER = "adguardhome";
  const DEFAULT_GROUP = "adguardhome";

  let version = $state("");
  let running = $state(false);
  let tab = $state<"general" | "jail" | "advanced">("general");

  // ── UCI form state ──
  let config_file = $state("");
  let work_dir = $state("");
  let user = $state("");
  let group = $state("");
  let verbose = $state(false);
  let advanced_settings = $state(false);
  let jail_mount: string[] = $state([]);
  let jail_mount_rw: string[] = $state([]);
  let gc = $state("");
  let maxprocs = $state("");
  let memlimit = $state("");

  // errors
  let config_file_err = $state("");
  let work_dir_err = $state("");

  // Dynamic list helpers (new item input)
  let jail_mount_input = $state("");
  let jail_mount_rw_input = $state("");

  let saving = $state(false);
  let feedback = $state("");

  let pollTimer: ReturnType<typeof setInterval> | undefined;

  const getStatus = async () => {
    try {
      const res = await call<any>("service", "list", { name: "adguardhome" });
      running = res?.adguardhome?.instances?.adguardhome?.running ?? false;
    } catch { running = false; }
  };

  const getVersion = async () => {
    const res = await execCommand("/usr/bin/AdGuardHome", ["--version"]).catch(() => null);
    if (res?.stdout) {
      const m = res.stdout.match(/version\s+(.*)/);
      version = m ? m[1] : res.stdout.trim();
    } else {
      version = "unknown version";
    }
  };

  const validateConfigFile = (v: string): string => {
    if (!v) return "";
    if (!v.startsWith("/")) return "Path must be absolute.";
    if (v.endsWith("/")) return "Path must not end with a slash.";
    if (/^\/etc(\/[^\/]+)?\/?$/.test(v)) return "Configuration file must be stored in its own directory, and not in '/etc'.";
    return "";
  };

  const validateWorkDir = (v: string): string => {
    if (!v) return "";
    if (!v.startsWith("/")) return "Path must be absolute.";
    return "";
  };

  const load = async () => {
    const [uci] = await Promise.all([
      uciGet("adguardhome").catch(() => null),
    ]);
    if (uci) {
      const sec = (Object.values(uci.values || {}) as any[]).find((s: any) => s[".type"] === "adguardhome") || {};
      config_file = sec.config_file || "";
      work_dir = sec.work_dir || "";
      user = sec.user || "";
      group = sec.group || "";
      verbose = sec.verbose === "1";
      gc = sec.gc || "";
      maxprocs = sec.maxprocs || "";
      memlimit = sec.memlimit || "";
      jail_mount = Array.isArray(sec.jail_mount) ? sec.jail_mount : (sec.jail_mount ? [sec.jail_mount] : []);
      jail_mount_rw = Array.isArray(sec.jail_mount_rw) ? sec.jail_mount_rw : (sec.jail_mount_rw ? [sec.jail_mount_rw] : []);
    }
  };

  const save = async () => {
    config_file_err = validateConfigFile(config_file);
    work_dir_err = validateWorkDir(work_dir);
    if (config_file_err || work_dir_err) return;

    saving = true;
    feedback = "";
    try {
      await uciSet("adguardhome", "adguardhome", {
        config_file: config_file || undefined,
        work_dir: work_dir || undefined,
        user: user || undefined,
        group: group || undefined,
        verbose: verbose ? "1" : "0",
        gc: gc || undefined,
        maxprocs: maxprocs || undefined,
        memlimit: memlimit || undefined,
        jail_mount: jail_mount.length ? jail_mount : undefined,
        jail_mount_rw: jail_mount_rw.length ? jail_mount_rw : undefined,
      });
      await uciCommit("adguardhome");
      await execCommand("/etc/init.d/AdGuardHome", ["reload"]).catch(() => {});
      feedback = "Configuration saved.";
    } catch {
      feedback = "Save failed.";
    }
    saving = false;
  };

  onMount(async () => {
    await Promise.all([load(), getStatus(), getVersion()]);
    pollTimer = setInterval(getStatus, 5000);
  });

  onDestroy(() => {
    clearInterval(pollTimer);
  });
</script>

<div class={cn("space-y-6")}>
  <!-- Version & Status -->
  <div class={cn("flex", "items-center", "gap-8", "px-5", "py-3", "rounded-xl", "bg-surface-2", "border", "border-border")}>
    <div class={cn("flex", "items-center", "gap-2")}>
      <span class={cn("text-xs", "text-muted", "font-medium")}>{trans("Version")}</span>
      <span class={cn("text-xs", "font-mono", "text-fg")}>{version}</span>
    </div>
    <div class={cn("flex", "items-center", "gap-2")}>
      <span class={cn("text-xs", "text-muted", "font-medium")}>{trans("Service Status")}</span>
      <span class={cn("text-xs", "font-semibold", running ? "text-green-400" : "text-red-400")}>
        {running ? trans("Running") : trans("Not running")}
      </span>
    </div>
  </div>

  <form onsubmit={(e) => { e.preventDefault(); save(); }}>
    <!-- Sub-tabs -->
    <div class={cn("flex", "gap-1", "p-0.5", "mb-5", "border", "rounded-lg", "bg-surface-2", "border-border", "w-fit")}>
      {#each ([
        { id: "general", label: trans("General Settings") },
        { id: "jail", label: trans("File System Access") },
        { id: "advanced", label: trans("Advanced Settings") },
      ] as const) as t}
        <button
          type="button"
          class={cn("px-3", "py-1", "text-xs", "rounded-md", "font-medium", "transition-all", tab === t.id ? "bg-accent text-surface" : "bg-transparent text-muted")}
          onclick={() => tab = t.id}
        >{t.label}</button>
      {/each}
    </div>

    {#if tab === "general"}
      <div class={cn("p-5", "rounded-xl", "bg-surface", "border", "border-border", "space-y-5")}>
        <!-- config_file -->
        <div>
          <label class={cn("block", "text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider", "mb-1.5")}>
            {trans("Configuration file")}
          </label>
          <input
            bind:value={config_file}
            placeholder={DEFAULT_CONFIG_FILE}
            class={cn("w-full", "px-2.5", "py-1.5", "border", "text-xs", "rounded-md", "bg-surface", "outline-none", "text-fg", config_file_err ? "border-red-400" : "border-border", "focus:border-(--accent)")}
            oninput={() => { config_file_err = validateConfigFile(config_file); }}
          />
          {#if config_file_err}
            <p class={cn("text-[10px]", "text-red-400", "mt-1")}>{config_file_err}</p>
          {:else}
            <p class={cn("text-[10px]", "text-muted", "mt-1")}>
              {trans("Configuration file must be stored in its own directory, and not in '/etc'.")}<br />
              {trans("Parent directory will be owned by the service user.")}<br />
              {trans("If empty, defaults to")} '{DEFAULT_CONFIG_FILE}'.
            </p>
          {/if}
        </div>

        <!-- work_dir -->
        <div>
          <label class={cn("block", "text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider", "mb-1.5")}>
            {trans("Working directory")}
          </label>
          <input
            bind:value={work_dir}
            placeholder={DEFAULT_WORK_DIR}
            class={cn("w-full", "px-2.5", "py-1.5", "border", "text-xs", "rounded-md", "bg-surface", "outline-none", "text-fg", work_dir_err ? "border-red-400" : "border-border", "focus:border-(--accent)")}
            oninput={() => { work_dir_err = validateWorkDir(work_dir); }}
          />
          {#if work_dir_err}
            <p class={cn("text-[10px]", "text-red-400", "mt-1")}>{work_dir_err}</p>
          {:else}
            <p class={cn("text-[10px]", "text-muted", "mt-1")}>
              {trans("Directory where filters, logs, and statistics are stored.")}<br />
              {trans("Will be owned by the service user.")}<br />
              {trans("If empty, defaults to")} '{DEFAULT_WORK_DIR}'.
            </p>
          {/if}
        </div>

        <!-- user -->
        <div>
          <label class={cn("block", "text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider", "mb-1.5")}>
            {trans("Service user")}
          </label>
          <input
            bind:value={user}
            placeholder={DEFAULT_USER}
            class={cn("w-full", "px-2.5", "py-1.5", "border", "text-xs", "rounded-md", "bg-surface", "outline-none", "text-fg", "border-border", "focus:border-(--accent)")}
          />
          <p class={cn("text-[10px]", "text-muted", "mt-1")}>
            {trans("User the service runs under.")} {trans("If empty, defaults to")} '{DEFAULT_USER}'.
          </p>
        </div>

        <!-- group -->
        <div>
          <label class={cn("block", "text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider", "mb-1.5")}>
            {trans("Service group")}
          </label>
          <input
            bind:value={group}
            placeholder={DEFAULT_GROUP}
            class={cn("w-full", "px-2.5", "py-1.5", "border", "text-xs", "rounded-md", "bg-surface", "outline-none", "text-fg", "border-border", "focus:border-(--accent)")}
          />
          <p class={cn("text-[10px]", "text-muted", "mt-1")}>
            {trans("Group the service runs under.")} {trans("If empty, defaults to")} '{DEFAULT_GROUP}'.
          </p>
        </div>

        <!-- verbose -->
        <label class={cn("flex", "items-center", "gap-2", "cursor-pointer")}>
          <input type="checkbox" bind:checked={verbose} class={cn("accent-(--accent)", "w-3.5", "h-3.5", "rounded", "cursor-pointer")} />
          <span class={cn("text-xs", "text-fg", "select-none")}>{trans("Verbose logging")}</span>
        </label>

        <!-- advanced_settings -->
        <label class={cn("flex", "items-center", "gap-2", "cursor-pointer")}>
          <input type="checkbox" bind:checked={advanced_settings} class={cn("accent-(--accent)", "w-3.5", "h-3.5", "rounded", "cursor-pointer")} />
          <span class={cn("text-xs", "text-fg", "select-none")}>{trans("Advanced Settings")}</span>
        </label>
      </div>

    {:else if tab === "jail"}
      <div class={cn("p-5", "rounded-xl", "bg-surface", "border", "border-border", "space-y-5")}>
        <p class={cn("text-[10px]", "text-muted")}>
          {trans("Files and directories that AdGuard Home should have read-only or read-write access to.")}
        </p>

        <!-- jail_mount -->
        <div>
          <label class={cn("block", "text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider", "mb-1.5")}>
            {trans("Read-only access")}
          </label>
          <div class={cn("space-y-1")}>
            {#each jail_mount as item, i}
              <div class={cn("flex", "items-center", "gap-1")}>
                <input
                  readonly
                  value={item}
                  class={cn("flex-1", "px-2.5", "py-1", "border", "text-xs", "rounded-md", "bg-surface-2", "outline-none", "text-fg", "border-border", "cursor-default")}
                />
                <button
                  type="button"
                  onclick={() => { jail_mount = jail_mount.toSpliced(i, 1); }}
                  class={cn("px-1.5", "py-1", "text-[10px]", "rounded", "text-red-400", "hover:bg-red-500/10", "transition-colors")}
                >{trans("Remove")}</button>
              </div>
            {/each}
          </div>
          <div class={cn("flex", "items-center", "gap-1", "mt-1")}>
            <input
              bind:value={jail_mount_input}
              placeholder="/path/to/dir"
              class={cn("flex-1", "px-2.5", "py-1", "border", "text-xs", "rounded-md", "bg-surface", "outline-none", "text-fg", "border-border", "focus:border-(--accent)")}
              onkeydown={(e) => { if (e.key === "Enter" && jail_mount_input.trim()) { e.preventDefault(); jail_mount = [...jail_mount, jail_mount_input.trim()]; jail_mount_input = ""; }}}
            />
            <button
              type="button"
              disabled={!jail_mount_input.trim()}
              onclick={() => { if (jail_mount_input.trim()) { jail_mount = [...jail_mount, jail_mount_input.trim()]; jail_mount_input = ""; }}}
              class={cn("px-2", "py-1", "text-[10px]", "rounded-md", "bg-accent", "text-surface", "font-medium", "disabled:opacity-40")}
            >+</button>
          </div>
        </div>

        <!-- jail_mount_rw -->
        <div>
          <label class={cn("block", "text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider", "mb-1.5")}>
            {trans("Read-write access")}
          </label>
          <div class={cn("space-y-1")}>
            {#each jail_mount_rw as item, i}
              <div class={cn("flex", "items-center", "gap-1")}>
                <input
                  readonly
                  value={item}
                  class={cn("flex-1", "px-2.5", "py-1", "border", "text-xs", "rounded-md", "bg-surface-2", "outline-none", "text-fg", "border-border", "cursor-default")}
                />
                <button
                  type="button"
                  onclick={() => { jail_mount_rw = jail_mount_rw.toSpliced(i, 1); }}
                  class={cn("px-1.5", "py-1", "text-[10px]", "rounded", "text-red-400", "hover:bg-red-500/10", "transition-colors")}
                >{trans("Remove")}</button>
              </div>
            {/each}
          </div>
          <div class={cn("flex", "items-center", "gap-1", "mt-1")}>
            <input
              bind:value={jail_mount_rw_input}
              placeholder="/path/to/dir"
              class={cn("flex-1", "px-2.5", "py-1", "border", "text-xs", "rounded-md", "bg-surface", "outline-none", "text-fg", "border-border", "focus:border-(--accent)")}
              onkeydown={(e) => { if (e.key === "Enter" && jail_mount_rw_input.trim()) { e.preventDefault(); jail_mount_rw = [...jail_mount_rw, jail_mount_rw_input.trim()]; jail_mount_rw_input = ""; }}}
            />
            <button
              type="button"
              disabled={!jail_mount_rw_input.trim()}
              onclick={() => { if (jail_mount_rw_input.trim()) { jail_mount_rw = [...jail_mount_rw, jail_mount_rw_input.trim()]; jail_mount_rw_input = ""; }}}
              class={cn("px-2", "py-1", "text-[10px]", "rounded-md", "bg-accent", "text-surface", "font-medium", "disabled:opacity-40")}
            >+</button>
          </div>
        </div>
      </div>

    {:else if tab === "advanced"}
      <div class={cn("p-5", "rounded-xl", "bg-surface", "border", "border-border", "space-y-5")}>
        <p class={cn("text-[10px]", "text-muted")}>
          {trans("Go environment variables that tune garbage collector and memory management.")}
          {trans("Modify at your own risk.")}
        </p>

        <!-- GOGC -->
        <div>
          <label class={cn("block", "text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider", "mb-1.5")}>GOGC</label>
          <input
            bind:value={gc}
            placeholder="0"
            class={cn("w-full", "px-2.5", "py-1.5", "border", "text-xs", "rounded-md", "bg-surface", "outline-none", "text-fg", "border-border", "focus:border-(--accent)")}
          />
          <p class={cn("text-[10px]", "text-muted", "mt-1")}>
            {trans("Tunes the garbage collector's aggressiveness by setting the percentage of heap growth allowed before the next collection cycle triggers.")}<br />
            {trans("If empty, defaults to")} {trans("unset and 100")}.<br />
            <a href="https://go.dev/doc/gc-guide#GOGC" target="_blank" class={cn("text-accent", "hover:underline")}>https://go.dev/doc/gc-guide#GOGC</a>
          </p>
        </div>

        <!-- GOMAXPROCS -->
        <div>
          <label class={cn("block", "text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider", "mb-1.5")}>GOMAXPROCS</label>
          <input
            bind:value={maxprocs}
            placeholder="0"
            class={cn("w-full", "px-2.5", "py-1.5", "border", "text-xs", "rounded-md", "bg-surface", "outline-none", "text-fg", "border-border", "focus:border-(--accent)")}
          />
          <p class={cn("text-[10px]", "text-muted", "mt-1")}>
            {trans("The maximum number of operating system threads that can execute user-level Go code simultaneously.")}<br />
            {trans("If empty, defaults to")} {trans("unset and matching the number of CPUs")}.
          </p>
        </div>

        <!-- GOMEMLIMIT -->
        <div>
          <label class={cn("block", "text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider", "mb-1.5")}>GOMEMLIMIT</label>
          <input
            bind:value={memlimit}
            placeholder="0"
            class={cn("w-full", "px-2.5", "py-1.5", "border", "text-xs", "rounded-md", "bg-surface", "outline-none", "text-fg", "border-border", "focus:border-(--accent)")}
          />
          <p class={cn("text-[10px]", "text-muted", "mt-1")}>
            {trans("A soft memory cap for the Go runtime, allowing the garbage collector to run more frequently as usage approaches the limit to prevent Out-of-Memory (OOM) kills.")}<br />
            {trans("If empty, defaults to")} {trans("unset")}.
          </p>
        </div>
      </div>
    {/if}

    <!-- Feedback -->
    {#if feedback}
      <div
        class={cn("mt-4", "px-4", "py-2", "text-xs", "rounded-lg", feedback === "Configuration saved." ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20")}
      >
        {feedback}
      </div>
    {/if}

    <!-- Save & Apply -->
    <div class={cn("mt-4", "flex", "items-center", "gap-2")}>
      <button
        type="submit"
        disabled={saving}
        class={cn("px-4", "py-2", "text-xs", "rounded-lg", "bg-accent", "text-surface", "font-semibold", "hover:opacity-90", "transition-opacity", "disabled:opacity-40")}
      >
        {saving ? trans("Saving...") : trans("Save & Apply")}
      </button>
      <button
        type="button"
        onclick={async () => { await load(); feedback = ""; }}
        class={cn("px-4", "py-2", "text-xs", "rounded-lg", "border", "border-border", "text-muted", "hover:bg-white/5", "transition-colors")}
      >
        {trans("Reset")}
      </button>
    </div>
  </form>
</div>
