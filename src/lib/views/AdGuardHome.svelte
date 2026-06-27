<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { Shield, RefreshCw, Save } from "@lucide/svelte";
  import { cn } from "../helpers/classname";
  import { t as _t, getLocale, onLocaleChange } from "../i18n";
  import {
    uciGet, uciSet, uciCommit, call, execCommand,
  } from "../api/ubus";
  import Input from "../components/Input/index.svelte";

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

  let config_file_err = $state("");
  let work_dir_err = $state("");

  let jail_mount_input = $state("");
  let jail_mount_rw_input = $state("");

  let saving = $state(false);
  let saveFeedback = $state("");

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
    const uci = await uciGet("adguardhome").catch(() => null);
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
      saveFeedback = "Saved";
    } catch {
      saveFeedback = "Save failed";
    }
    saving = false;
    setTimeout(() => { saveFeedback = ""; }, 3000);
  };

  onMount(async () => {
    await Promise.all([load(), getStatus(), getVersion()]);
    pollTimer = setInterval(getStatus, 5000);
  });

  onDestroy(() => {
    clearInterval(pollTimer);
  });
</script>

<div class={cn("p-6", "flex", "flex-col", "min-h-0", "animate-fade-in", "gap-5")}>
  <!-- Header -->
  <div class={cn("shrink-0", "flex", "items-start", "justify-between", "gap-4")}>
    <div class={cn("flex", "items-center", "gap-3")}>
      <div class={cn("w-9", "h-9", "rounded-xl", "bg-accent/10", "flex", "items-center", "justify-center", "ring-1", "ring-accent/20", "shrink-0")}>
        <Shield size={16} class={cn("text-accent")} />
      </div>
      <div>
        <h1 class={cn("text-lg", "font-semibold", "text-white")}>AdGuard Home</h1>
        <p class={cn("text-sm", "mt-0.5", "text-muted")}>{trans("Free and open source, powerful network-wide ads & trackers blocking DNS server.")}</p>
      </div>
    </div>
    <div class={cn("flex", "items-center", "gap-3")}>
      {#if saveFeedback}
        <span class={cn("text-xs", "font-mono", saveFeedback === "Saved" ? "text-accent" : "text-danger")}>
          {saveFeedback === "Saved" ? trans("Saved") : trans("Save failed")}
        </span>
      {/if}
      <button
        onclick={save}
        disabled={saving}
        class={cn(
          "inline-flex", "items-center", "gap-1.5", "px-3", "py-1.5",
          "text-xs", "rounded-lg", "font-medium", "transition-all", "duration-150",
          "cursor-pointer", "select-none", "border",
          saving
            ? "text-muted bg-surface-2 border-border"
            : "text-accent bg-accent/10 border-accent/20 hover:bg-accent/20",
          "disabled:opacity-30",
        )}
      >
        <Save size={14} />
        {saving ? trans("Saving...") : trans("Save & Apply")}
      </button>
    </div>
  </div>

  <!-- Version + Status bar -->
  <div class={cn("shrink-0", "glass", "p-4", "rounded-xl", "flex", "items-center", "gap-6")}>
    <div class={cn("flex", "items-center", "gap-2")}>
      <span class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>{trans("Version")}</span>
      <span class={cn("text-xs", "font-mono", "text-fg")}>{version}</span>
    </div>
    <div class={cn("w-px", "h-4", "bg-border")} />
    <div class={cn("flex", "items-center", "gap-2")}>
      <span class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>{trans("Service Status")}</span>
      <span class={cn("text-xs", "font-semibold", running ? "text-green-400" : "text-red-400")}>
        {running ? trans("Running") : trans("Not running")}
      </span>
    </div>
    <button
      onclick={getStatus}
      class={cn("p-1", "rounded-md", "hover:bg-white/5", "transition-colors", "text-muted", "hover:text-fg", "cursor-pointer")}
    >
      <RefreshCw size={14} />
    </button>
  </div>

  <!-- Sub-tabs -->
  <div class={cn("shrink-0", "flex", "gap-1", "p-0.5", "w-fit", "border", "rounded-lg", "bg-surface-2", "border-border")}>
    {#each [
      { id: "general", label: trans("General Settings") },
      { id: "jail", label: trans("File System Access") },
      { id: "advanced", label: trans("Advanced Settings") },
    ] as t}
      <button
        class={cn(
          "px-3", "py-1.5", "text-xs", "rounded-md", "font-medium",
          "transition-all", "cursor-pointer",
          tab === t.id ? "bg-accent text-surface" : "bg-transparent text-muted",
        )}
        onclick={() => (tab = t.id)}
      >
        {t.label}
      </button>
    {/each}
  </div>

  {#key tab}
    <div class={cn("glass", "p-5", "rounded-xl", "space-y-5")}>
      {#if tab === "general"}
        <div class={cn("space-y-5")}>
          <div class={cn("flex", "items-center", "gap-2")}>
            <Shield size={14} class={cn("text-accent")} />
            <span class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>
              {trans("General Settings")}
            </span>
          </div>
          <div class={cn("h-px", "bg-border")} />

          <Input
            label={trans("Configuration file")}
            bind:value={config_file}
            placeholder={DEFAULT_CONFIG_FILE}
            oninput={() => { config_file_err = validateConfigFile(config_file); }}
          />
          {#if config_file_err}
            <p class={cn("text-[10px]", "text-danger", "mt-1")}>{config_file_err}</p>
          {:else}
            <p class={cn("text-[10px]", "text-muted", "-mt-3")}>
              {trans("Configuration file must be stored in its own directory, and not in '/etc'.")}<br />
              {trans("Parent directory will be owned by the service user.")}<br />
              {trans("If empty, defaults to")} '{DEFAULT_CONFIG_FILE}'.
            </p>
          {/if}

          <Input
            label={trans("Working directory")}
            bind:value={work_dir}
            placeholder={DEFAULT_WORK_DIR}
            oninput={() => { work_dir_err = validateWorkDir(work_dir); }}
          />
          {#if work_dir_err}
            <p class={cn("text-[10px]", "text-danger", "mt-1")}>{work_dir_err}</p>
          {:else}
            <p class={cn("text-[10px]", "text-muted", "-mt-3")}>
              {trans("Directory where filters, logs, and statistics are stored.")}<br />
              {trans("Will be owned by the service user.")}<br />
              {trans("If empty, defaults to")} '{DEFAULT_WORK_DIR}'.
            </p>
          {/if}

          <div class={cn("grid", "grid-cols-2", "gap-4")}>
            <Input
              label={trans("Service user")}
              bind:value={user}
              placeholder={DEFAULT_USER}
            />
            <Input
              label={trans("Service group")}
              bind:value={group}
              placeholder={DEFAULT_GROUP}
            />
          </div>
          <p class={cn("text-[10px]", "text-muted", "-mt-3")}>
            {trans("User and group the service runs under.")} {trans("If empty, defaults to")} '{DEFAULT_USER}' / '{DEFAULT_GROUP}'.
          </p>

          <div class={cn("h-px", "bg-border")} />

          <label class={cn("flex", "items-center", "gap-2", "cursor-pointer", "select-none")}>
            <input type="checkbox" bind:checked={verbose} class={cn("accent-(--accent)", "w-3.5", "h-3.5", "rounded", "cursor-pointer")} />
            <span class={cn("text-xs", "text-fg")}>{trans("Verbose logging")}</span>
          </label>

          <div class={cn("h-px", "bg-border")} />

          <label class={cn("flex", "items-center", "gap-2", "cursor-pointer", "select-none")}>
            <input type="checkbox" bind:checked={advanced_settings} class={cn("accent-(--accent)", "w-3.5", "h-3.5", "rounded", "cursor-pointer")} />
            <span class={cn("text-xs", "text-fg")}>{trans("Advanced Settings")}</span>
          </label>
        </div>

      {:else if tab === "jail"}
        <div class={cn("space-y-5")}>
          <div class={cn("flex", "items-center", "gap-2")}>
            <Shield size={14} class={cn("text-accent")} />
            <span class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>
              {trans("File System Access")}
            </span>
          </div>
          <div class={cn("h-px", "bg-border")} />

          <p class={cn("text-[10px]", "text-muted")}>
            {trans("Files and directories that AdGuard Home should have read-only or read-write access to.")}
          </p>

          <div>
            <span class={cn("block", "text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider", "mb-2")}>
              {trans("Read-only access")}
            </span>
            <div class={cn("space-y-1", "mb-1")}>
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
                    class={cn("px-1.5", "py-1", "text-[10px]", "rounded", "text-danger", "hover:bg-danger/10", "transition-colors", "cursor-pointer")}
                  >{trans("Remove")}</button>
                </div>
              {/each}
            </div>
            <div class={cn("flex", "items-center", "gap-1")}>
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
                class={cn("px-2", "py-1", "text-[10px]", "rounded-md", "bg-accent", "text-surface", "font-medium", "disabled:opacity-40", "cursor-pointer")}
              >+</button>
            </div>
          </div>

          <div class={cn("h-px", "bg-border")} />

          <div>
            <span class={cn("block", "text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider", "mb-2")}>
              {trans("Read-write access")}
            </span>
            <div class={cn("space-y-1", "mb-1")}>
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
                    class={cn("px-1.5", "py-1", "text-[10px]", "rounded", "text-danger", "hover:bg-danger/10", "transition-colors", "cursor-pointer")}
                  >{trans("Remove")}</button>
                </div>
              {/each}
            </div>
            <div class={cn("flex", "items-center", "gap-1")}>
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
                class={cn("px-2", "py-1", "text-[10px]", "rounded-md", "bg-accent", "text-surface", "font-medium", "disabled:opacity-40", "cursor-pointer")}
              >+</button>
            </div>
          </div>
        </div>

      {:else if tab === "advanced"}
        <div class={cn("space-y-5")}>
          <div class={cn("flex", "items-center", "gap-2")}>
            <Shield size={14} class={cn("text-accent")} />
            <span class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>
              {trans("Advanced Settings")}
            </span>
          </div>
          <div class={cn("h-px", "bg-border")} />

          <p class={cn("text-[10px]", "text-muted")}>
            {trans("Go environment variables that tune garbage collector and memory management.")}
            {trans("Modify at your own risk.")}
          </p>

          {#if advanced_settings}
            <Input
              label="GOGC"
              bind:value={gc}
              placeholder="0"
            />
            <p class={cn("text-[10px]", "text-muted", "-mt-3")}>
              {trans("Tunes the garbage collector's aggressiveness by setting the percentage of heap growth allowed before the next collection cycle triggers.")}<br />
              {trans("If empty, defaults to")} {trans("unset and 100")}.<br />
              <a href="https://go.dev/doc/gc-guide#GOGC" target="_blank" class={cn("text-accent", "hover:underline")}>https://go.dev/doc/gc-guide#GOGC</a>
            </p>

            <Input
              label="GOMAXPROCS"
              bind:value={maxprocs}
              placeholder="0"
            />
            <p class={cn("text-[10px]", "text-muted", "-mt-3")}>
              {trans("The maximum number of operating system threads that can execute user-level Go code simultaneously.")}<br />
              {trans("If empty, defaults to")} {trans("unset and matching the number of CPUs")}.
            </p>

            <Input
              label="GOMEMLIMIT"
              bind:value={memlimit}
              placeholder="0"
            />
            <p class={cn("text-[10px]", "text-muted", "-mt-3")}>
              {trans("A soft memory cap for the Go runtime, allowing the garbage collector to run more frequently as usage approaches the limit to prevent Out-of-Memory (OOM) kills.")}<br />
              {trans("If empty, defaults to")} {trans("unset")}.
            </p>
          {:else}
            <div class={cn("py-8", "flex", "flex-col", "items-center", "justify-center", "gap-2")}>
              <span class={cn("text-xs", "text-muted")}>
                {trans("Enable 'Advanced Settings' in the General tab to configure Go runtime parameters.")}
              </span>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/key}
</div>
