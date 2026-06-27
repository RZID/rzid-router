<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import {
    Play, Square, RefreshCw, ExternalLink, Download, Trash2, ChevronDown, Globe, FileText,
  } from "@lucide/svelte";
  import { flip } from "svelte/animate";
  import { cn } from "../helpers/classname";
  import { t as _t, getLocale, onLocaleChange } from "../i18n";
  import {
    uciGet, uciSet, uciCommit, execCommand, readFile, writeFile,
    adguardGetStatus, adguardGetLog, adguardDeleteLog, adguardDoUpdate,
    adguardCheckUpdate, adguardGetTemplateConfig, adguardGetConfigContent,
    adguardSaveConfigContent, adguardReloadConfig, adguardGetVersion,
  } from "../api/ubus";
  import Input from "../components/Input/index.svelte";
  import Select from "../components/Select/index.svelte";
  import Toggle from "../components/Toggle/index.svelte";
  import TabBar from "../components/TabBar/index.svelte";

  let locale = $state(getLocale());
  let trans = $derived.by(() => { locale; return (k: string) => _t(k); });
  $effect(() => onLocaleChange(() => { locale = getLocale(); }));

  let tab = $state<"base" | "log" | "manual">("base");

  // ── Status ──
  let running = $state(false);
  let redirect = $state(false);
  let statusInterval: ReturnType<typeof setInterval> | undefined;

  // ── UCI Data ──
  let uciConfig: any = $state(null);
  let loading = $state(true);
  let saving = $state(false);
  let feedback = $state("");

  // Form fields from UCI
  let enabled = $state(false);
  let httpport = $state("3000");
  let redirectMode = $state("none");
  let binpath = $state("/usr/bin/AdGuardHome/AdGuardHome");
  let upxflag = $state("");
  let configpath = $state("/etc/AdGuardHome.yaml");
  let workdir = $state("/usr/bin/AdGuardHome");
  let logfile = $state("");
  let verbose = $state(false);
  let gfwupstream = $state("tcp://208.67.220.220:5353");
  let hashpass = $state("");
  let upprotect: string[] = $state([]);
  let waitonboot = $state(true);
  let backupfile: string[] = $state([]);
  let backupwdpath = $state("/usr/bin/AdGuardHome");
  let crontab: string[] = $state([]);
  let downloadlinks = $state("");
  let version = $state("");

  // ── Log ──
  let logContent = $state("");
  let logReverse = $state(true);
  let logLocalTime = $state(true);
  let logPos = $state(0);
  let logInterval: ReturnType<typeof setInterval> | undefined;

  // ── Manual ──
  let yamlContent = $state("");
  let yamlOriginal = $state("");
  let yamlValidation = $state("");

  // ── Update ──
  let updating = $state(false);
  let updateLog = $state("");
  let updatePos = $state(0);
  let updateInterval: ReturnType<typeof setInterval> | undefined;

  const load = async () => {
    loading = true;
    const uci = await uciGet("AdGuardHome").catch(() => null);
    if (uci) {
      uciConfig = uci;
      const sec = (Object.values(uci.values || {}) as any[]).find((s: any) => s[".type"] === "AdGuardHome") || (uci.values?.AdGuardHome || {});
      enabled = sec.enabled === "1";
      httpport = sec.httpport || "3000";
      redirectMode = sec.redirect || "none";
      binpath = sec.binpath || "/usr/bin/AdGuardHome/AdGuardHome";
      upxflag = sec.upxflag || "";
      configpath = sec.configpath || "/etc/AdGuardHome.yaml";
      workdir = sec.workdir || "/usr/bin/AdGuardHome";
      logfile = sec.logfile || "";
      verbose = sec.verbose === "1";
      gfwupstream = sec.gfwupstream || "tcp://208.67.220.220:5353";
      hashpass = sec.hashpass || "";
      upprotect = sec.upprotect ? (Array.isArray(sec.upprotect) ? sec.upprotect : [sec.upprotect]) : [];
      waitonboot = sec.waitonboot !== "0";
      backupfile = sec.backupfile ? (Array.isArray(sec.backupfile) ? sec.backupfile : [sec.backupfile]) : [];
      backupwdpath = sec.backupwdpath || "/usr/bin/AdGuardHome";
      crontab = sec.crontab ? (Array.isArray(sec.crontab) ? sec.crontab : [sec.crontab]) : [];
    }
    const v = await adguardGetVersion().catch(() => null);
    if (v) version = v;
    loading = false;
  };

  const loadLinks = async () => {
    const res = await readFile("/usr/share/AdGuardHome/links.txt").catch(() => null);
    if (res) downloadlinks = res.data;
  };

  const save = async () => {
    saving = true;
    feedback = "";
    const vals: Record<string, any> = {
      enabled: enabled ? "1" : "0",
      httpport,
      redirect: redirectMode,
      binpath,
      configpath,
      workdir,
      logfile,
      verbose: verbose ? "1" : "0",
      gfwupstream,
      waitonboot: waitonboot ? "1" : "0",
      backupwdpath,
      upxflag: upxflag || undefined,
    };
    if (hashpass) vals.hashpass = hashpass;
    if (upprotect.length) vals.upprotect = upprotect;
    if (backupfile.length) vals.backupfile = backupfile;
    if (crontab.length) vals.crontab = crontab;
    try {
      await uciSet("AdGuardHome", "AdGuardHome", vals);
      await uciCommit("AdGuardHome");
      if (downloadlinks) {
        await writeFile("/usr/share/AdGuardHome/links.txt", downloadlinks);
      }
      await execCommand("/etc/init.d/AdGuardHome", ["reload"]).catch(() => {});
      feedback = "Saved";
    } catch {
      feedback = "Save failed";
    }
    saving = false;
  };

  // Status polling
  const pollStatus = async () => {
    const st = await adguardGetStatus();
    if (st) {
      running = st.running;
      redirect = st.redirect;
    }
  };

  // Log polling
  const pollLog = async () => {
    const res = await adguardGetLog(logPos);
    if (res.content) {
      logPos = res.pos;
      let text = res.content;
      if (logLocalTime) {
        text = text.split("\n").map((line: string) => {
          const m = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\.?\d*Z?(.*)/);
          if (m) {
            const d = new Date(m[1] + "Z");
            if (!isNaN(d.getTime())) {
              const pad = (n: number) => String(n).padStart(2, "0");
              return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${m[2]}`;
            }
          }
          return line;
        }).join("\n");
      }
      if (logReverse) {
        logContent = text.split("\n").reverse().join("\n") + logContent;
      } else {
        logContent += text;
      }
    }
  };

  // Update polling
  const pollUpdate = async () => {
    const res = await adguardCheckUpdate(updatePos);
    if (res.content) {
      updatePos = res.pos;
      const nullChar = res.content.indexOf("\0");
      if (nullChar >= 0) {
        updateLog += res.content.substring(0, nullChar);
        updating = false;
        clearInterval(updateInterval);
        updateInterval = undefined;
      } else {
        updateLog += res.content;
      }
    }
  };

  const startUpdate = async (force = false) => {
    updating = true;
    updateLog = "";
    updatePos = 0;
    await adguardDoUpdate(force);
    updateInterval = setInterval(pollUpdate, 3000);
  };

  let tabs = $derived([
    { id: "base", label: trans("Base Setting") },
    { id: "log", label: trans("Log") },
    { id: "manual", label: trans("Manual Config") },
  ]);

  const openWebUI = () => {
    window.open(`http://${window.location.hostname}:${httpport}/`, "_blank");
  };

  const downloadLog = () => {
    const blob = new Blob([logContent], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    const dt = new Date();
    a.download = `AdGuardHome_${dt.getMonth() + 1}-${dt.getDate()}-${dt.getHours()}_${dt.getMinutes()}.log`;
    a.click();
    URL.revokeObjectURL(blob);
  };

  const delLog = async () => {
    await adguardDeleteLog();
    logContent = "";
    logPos = 0;
  };

  const loadYaml = async () => {
    yamlContent = await adguardGetConfigContent();
    yamlOriginal = yamlContent;
    yamlValidation = "";
  };

  const useTemplate = async () => {
    const tpl = await adguardGetTemplateConfig();
    if (tpl) yamlContent = tpl;
  };

  const saveYaml = async () => {
    try {
      await adguardSaveConfigContent(yamlContent);
      yamlOriginal = yamlContent;
      yamlValidation = trans("Config saved");
    } catch (e: any) {
      yamlValidation = e.message || trans("Validation failed");
    }
  };

  onMount(async () => {
    await load();
    await loadLinks();
    await pollStatus();
    statusInterval = setInterval(pollStatus, 3000);
  });

  onDestroy(() => {
    clearInterval(statusInterval);
    clearInterval(logInterval);
    clearInterval(updateInterval);
  });
</script>

<div class={cn("space-y-6")}>
  <TabBar {tabs} active={tab} onchange={(id: string) => {
    tab = id as typeof tab;
    if (id === "log") {
      logPos = 0;
      logContent = "";
      pollLog();
      logInterval = setInterval(pollLog, 3000);
    } else {
      clearInterval(logInterval);
      logInterval = undefined;
    }
    if (id === "manual") loadYaml();
  }} />

  {#if tab === "base"}
    <!-- Status bar -->
    <div class={cn("flex", "items-center", "gap-3", "px-5", "py-3", "rounded-xl", "bg-surface-2", "border", "border-border")}>
      <span class={cn("w-2", "h-2", "rounded-full", running ? "bg-green-400" : "bg-red-400")} />
      <span class={cn("text-xs", "font-semibold")}>
        {running ? trans("Running") : trans("Not Running")}
      </span>
      <span class={cn("w-px", "h-4", "bg-border")} />
      <span class={cn("w-2", "h-2", "rounded-full", redirect ? "bg-green-400" : "bg-red-400")} />
      <span class={cn("text-xs")}>
        {redirect ? trans("Redirected") : trans("Not redirect")}
      </span>
      {#if version}
        <span class={cn("ml-auto", "text-[10px]", "font-mono", "text-muted")}>{version}</span>
      {/if}
      <button
        onclick={pollStatus}
        class={cn("p-1", "rounded-md", "hover:bg-white/5", "transition-colors", "text-muted", "hover:text-fg")}
      >
        <RefreshCw size={14} />
      </button>
    </div>

    <form
      onsubmit={(e) => { e.preventDefault(); save(); }}
      class={cn("space-y-4")}
    >
      <!-- Service Config -->
      <div class={cn("p-5", "rounded-xl", "bg-surface", "border", "border-border", "space-y-4")}>
        <div class={cn("flex", "items-center", "gap-2", "mb-3")}>
          <Play size={14} class={cn("text-accent")} />
          <span class={cn("text-xs", "uppercase", "font-semibold", "tracking-wider", "text-muted")}>
            {trans("Service Config")}
          </span>
        </div>
        <div class={cn("grid", "grid-cols-2", "gap-4")}>
          <Toggle label={trans("Enable")} bind:checked={enabled} />
          <div></div>
        </div>
      </div>

      <!-- Web Interface -->
      <div class={cn("p-5", "rounded-xl", "bg-surface", "border", "border-border", "space-y-4")}>
        <div class={cn("flex", "items-center", "gap-2", "mb-3")}>
          <Globe size={14} class={cn("text-accent")} />
          <span class={cn("text-xs", "uppercase", "font-semibold", "tracking-wider", "text-muted")}>
            {trans("Web Interface")}
          </span>
        </div>
        <div class={cn("grid", "grid-cols-2", "gap-4")}>
          <Input label={trans("Browser management port")} bind:value={httpport} placeholder="3000" type="number" />
          <div class={cn("flex", "items-end", "pb-1")}>
            <button
              type="button"
              onclick={openWebUI}
              class={cn("flex", "items-center", "gap-1.5", "px-3", "py-1.5", "text-xs", "rounded-md", "border", "border-accent/30", "text-accent", "hover:bg-accent/10", "transition-colors")}
            >
              <ExternalLink size={14} />
              {trans("Open Web UI")}
            </button>
          </div>
        </div>
      </div>

      <!-- Redirect -->
      <div class={cn("p-5", "rounded-xl", "bg-surface", "border", "border-border", "space-y-4")}>
        <div class={cn("flex", "items-center", "gap-2", "mb-3")}>
          <ChevronDown size={14} class={cn("text-accent")} />
          <span class={cn("text-xs", "uppercase", "font-semibold", "tracking-wider", "text-muted")}>
            {trans("Redirect")}
          </span>
        </div>
        <div class={cn("grid", "grid-cols-2", "gap-4")}>
          <Select
            label={trans("AdGuardHome redirect mode")}
            bind:value={redirectMode}
            options={[
              { value: "none", label: trans("none") },
              { value: "dnsmasq-upstream", label: trans("Run as dnsmasq upstream server") },
              { value: "redirect", label: trans("Redirect 53 port to AdGuardHome") },
              { value: "exchange", label: trans("Use port 53 replace dnsmasq") },
            ]}
          />
          <div></div>
        </div>
      </div>

      <!-- Paths -->
      <div class={cn("p-5", "rounded-xl", "bg-surface", "border", "border-border", "space-y-4")}>
        <div class={cn("flex", "items-center", "gap-2", "mb-3")}>
          <FileText size={14} class={cn("text-accent")} />
          <span class={cn("text-xs", "uppercase", "font-semibold", "tracking-wider", "text-muted")}>
            {trans("Paths")}
          </span>
        </div>
        <div class={cn("grid", "grid-cols-2", "gap-4")}>
          <Input label={trans("Bin Path")} bind:value={binpath} placeholder="/usr/bin/AdGuardHome/AdGuardHome" />
          <Input label={trans("Config Path")} bind:value={configpath} placeholder="/etc/AdGuardHome.yaml" />
          <Input label={trans("Work dir")} bind:value={workdir} placeholder="/usr/bin/AdGuardHome" />
          <Input label={trans("Runtime log file")} bind:value={logfile} placeholder="/var/log/AdGuardHome.log" />
        </div>
      </div>

      <!-- Advanced -->
      <div class={cn("p-5", "rounded-xl", "bg-surface", "border", "border-border", "space-y-4")}>
        <div class={cn("flex", "items-center", "gap-2", "mb-3")}>
          <ChevronDown size={14} class={cn("text-accent")} />
          <span class={cn("text-xs", "uppercase", "font-semibold", "tracking-wider", "text-muted")}>
            {trans("Advanced")}
          </span>
        </div>
        <div class={cn("grid", "grid-cols-2", "gap-4")}>
          <Select
            label={trans("use upx to compress bin after download")}
            bind:value={upxflag}
            options={[
              { value: "", label: trans("none") },
              { value: "-1", label: trans("compress faster") },
              { value: "-9", label: trans("compress better") },
              { value: "--best", label: trans("compress best") },
              { value: "--brute", label: trans("try all available methods") },
              { value: "--ultra-brute", label: trans("try even more variants") },
            ]}
          />
          <Toggle label={trans("Verbose log")} bind:checked={verbose} />
          <Input label={trans("Gfwlist upstream dns server")} bind:value={gfwupstream} placeholder="tcp://208.67.220.220:5353" />
          <Toggle label={trans("On boot when network ok restart")} bind:checked={waitonboot} />
        </div>
      </div>

      <!-- Update Core -->
      <div class={cn("p-5", "rounded-xl", "bg-surface", "border", "border-border", "space-y-4")}>
        <div class={cn("flex", "items-center", "gap-2", "mb-3")}>
          <RefreshCw size={14} class={cn("text-accent")} />
          <span class={cn("text-xs", "uppercase", "font-semibold", "tracking-wider", "text-muted")}>
            {trans("Update Core")}
          </span>
        </div>
        <div class={cn("flex", "flex-wrap", "gap-2", "items-center")}>
          <button
            type="button"
            disabled={updating}
            onclick={() => startUpdate(false)}
            class={cn("flex", "items-center", "gap-1.5", "px-3", "py-1.5", "text-xs", "rounded-md", "border", "border-accent/30", "text-accent", "hover:bg-accent/10", "transition-colors", "disabled:opacity-40")}
          >
            <RefreshCw size={14} />
            {trans("Update core version")}
          </button>
          <button
            type="button"
            disabled={updating}
            onclick={() => startUpdate(true)}
            class={cn("flex", "items-center", "gap-1.5", "px-3", "py-1.5", "text-xs", "rounded-md", "border", "border-border", "text-muted", "hover:bg-white/5", "transition-colors", "disabled:opacity-40")}
          >
            {trans("Force update")}
          </button>
        </div>
        {#if updateLog}
          <textarea
            readonly
            class={cn("w-full", "px-2.5", "py-1.5", "text-xs", "font-mono", "rounded-md", "bg-surface-2", "border", "border-border", "text-fg", "resize-y")}
            rows="5"
            bind:value={updateLog}
          />
        {/if}
      </div>

      <!-- Download Links -->
      <div class={cn("p-5", "rounded-xl", "bg-surface", "border", "border-border", "space-y-4")}>
        <div class={cn("flex", "items-center", "gap-2", "mb-3")}>
          <Download size={14} class={cn("text-accent")} />
          <span class={cn("text-xs", "uppercase", "font-semibold", "tracking-wider", "text-muted")}>
            {trans("Download links for update")}
          </span>
        </div>
        <textarea
          class={cn("w-full", "px-2.5", "py-1.5", "text-xs", "font-mono", "rounded-md", "bg-surface", "border", "border-border", "text-fg", "resize-y")}
          rows="4"
          bind:value={downloadlinks}
        />
      </div>

      <!-- Save -->
      {#if feedback}
        <div
          class={cn("px-4", "py-2", "text-xs", "rounded-lg", feedback === "Saved" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20")}
        >
          {feedback}
        </div>
      {/if}
      <button
        type="submit"
        disabled={saving}
        class={cn("px-4", "py-2", "text-xs", "rounded-lg", "bg-accent", "text-surface", "font-semibold", "hover:opacity-90", "transition-opacity", "disabled:opacity-40")}
      >
        {saving ? trans("Saving...") : trans("Save & Apply")}
      </button>
    </form>

  {:else if tab === "log"}
    <!-- Log Viewer -->
    <div class={cn("p-5", "rounded-xl", "bg-surface", "border", "border-border", "space-y-3")}>
      <div class={cn("flex", "items-center", "gap-4", "flex-wrap")}>
        <label class={cn("flex", "items-center", "gap-1.5", "text-xs", "text-muted", "cursor-pointer")}>
          <input type="checkbox" bind:checked={logReverse} class={cn("accent-(--accent)", "w-3", "h-3")} />
          {trans("reverse")}
        </label>
        <label class={cn("flex", "items-center", "gap-1.5", "text-xs", "text-muted", "cursor-pointer")}>
          <input type="checkbox" bind:checked={logLocalTime} class={cn("accent-(--accent)", "w-3", "h-3")} />
          {trans("localtime")}
        </label>
        <div class={cn("flex-1")} />
        <button
          type="button"
          onclick={downloadLog}
          class={cn("flex", "items-center", "gap-1", "px-2", "py-1", "text-xs", "rounded-md", "border", "border-border", "text-muted", "hover:bg-white/5", "transition-colors")}
        >
          <Download size={14} />
          {trans("download log")}
        </button>
        <button
          type="button"
          onclick={delLog}
          class={cn("flex", "items-center", "gap-1", "px-2", "py-1", "text-xs", "rounded-md", "border", "border-border", "text-red-400", "hover:bg-red-500/10", "transition-colors")}
        >
          <Trash2 size={14} />
          {trans("dellog")}
        </button>
      </div>
      <textarea
        readonly
        class={cn("w-full", "px-2.5", "py-1.5", "text-xs", "font-mono", "rounded-md", "bg-surface-2", "border", "border-border", "text-fg", "resize-y")}
        rows="32"
        bind:value={logContent}
      />
    </div>

  {:else if tab === "manual"}
    <!-- Manual YAML Config -->
    <form
      onsubmit={(e) => { e.preventDefault(); saveYaml(); }}
      class={cn("space-y-4")}
    >
      {#if yamlValidation}
        <div
          class={cn("px-4", "py-2", "text-xs", "rounded-lg", yamlValidation === "Config saved" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20")}
        >
          {yamlValidation}
        </div>
      {/if}
      <div class={cn("p-5", "rounded-xl", "bg-surface", "border", "border-border", "space-y-3")}>
        <div class={cn("flex", "items-center", "gap-2", "flex-wrap")}>
          <button
            type="button"
            onclick={useTemplate}
            class={cn("flex", "items-center", "gap-1", "px-3", "py-1.5", "text-xs", "rounded-md", "border", "border-accent/30", "text-accent", "hover:bg-accent/10", "transition-colors")}
          >
            <FileText size={14} />
            {trans("Use template")}
          </button>
          <div class={cn("flex-1")} />
          <button
            type="submit"
            class={cn("flex", "items-center", "gap-1", "px-3", "py-1.5", "text-xs", "rounded-md", "bg-accent", "text-surface", "font-semibold", "hover:opacity-90", "transition-opacity")}
          >
            {trans("Save & Apply")}
          </button>
        </div>
        <textarea
          class={cn("w-full", "px-2.5", "py-1.5", "text-xs", "font-mono", "rounded-md", "bg-surface-2", "border", "border-border", "text-fg", "resize-y")}
          rows="40"
          wrap="off"
          bind:value={yamlContent}
        />
      </div>
    </form>
  {/if}
</div>
