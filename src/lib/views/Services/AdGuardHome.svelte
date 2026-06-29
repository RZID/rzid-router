<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { Shield, RefreshCw, Save } from "@lucide/svelte";
  import { cn } from "../../helpers/classname";
  import { t as _t, getLocale, onLocaleChange } from "../../i18n";
  import { uciGet, uciSet, uciCommit, call, execCommand } from "../../api/ubus";
  import GeneralTab from "./AdGuardHome/GeneralTab.svelte";
  import JailTab from "./AdGuardHome/JailTab.svelte";
  import AdvancedTab from "./AdGuardHome/AdvancedTab.svelte";

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

  let version = $state(""),
    running = $state(false),
    tab = $state<"general" | "jail" | "advanced">("general");
  let config_file = $state(""),
    work_dir = $state(""),
    user = $state(""),
    group = $state("");
  let verbose = $state(false),
    advanced_settings = $state(false);
  let jail_mount: string[] = $state([]),
    jail_mount_rw: string[] = $state([]);
  let gc = $state(""),
    maxprocs = $state(""),
    memlimit = $state("");
  let config_file_err = $state(""),
    work_dir_err = $state("");
  let jail_mount_input = $state(""),
    jail_mount_rw_input = $state("");
  let saving = $state(false),
    saveFeedback = $state("");
  let pollTimer: ReturnType<typeof setInterval> | undefined;

  const getStatus = async () => {
    try {
      const res = await call<any>("service", "list", { name: "adguardhome" });
      running = res?.adguardhome?.instances?.adguardhome?.running ?? false;
    } catch {
      running = false;
    }
  };
  const getVersion = async () => {
    const res = await execCommand("/usr/bin/AdGuardHome", ["--version"]).catch(
      () => null,
    );
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
    if (/^\/etc(\/[^\/]+)?\/?$/.test(v))
      return "Configuration file must be stored in its own directory, and not in '/etc'.";
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
      const sec =
        (Object.values(uci.values || {}) as any[]).find(
          (s: any) => s[".type"] === "adguardhome",
        ) || {};
      config_file = sec.config_file || "";
      work_dir = sec.work_dir || "";
      user = sec.user || "";
      group = sec.group || "";
      verbose = sec.verbose === "1";
      gc = sec.gc || "";
      maxprocs = sec.maxprocs || "";
      memlimit = sec.memlimit || "";
      jail_mount = Array.isArray(sec.jail_mount)
        ? sec.jail_mount
        : sec.jail_mount
          ? [sec.jail_mount]
          : [];
      jail_mount_rw = Array.isArray(sec.jail_mount_rw)
        ? sec.jail_mount_rw
        : sec.jail_mount_rw
          ? [sec.jail_mount_rw]
          : [];
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
        jail_mount: jail_mount.length ? jail_mount.join(" ") : undefined,
        jail_mount_rw: jail_mount_rw.length ? jail_mount_rw.join(" ") : undefined,
      });
      await uciCommit("adguardhome");
      await execCommand("/etc/init.d/AdGuardHome", ["reload"]).catch(() => {});
      saveFeedback = "Saved";
    } catch {
      saveFeedback = "Save failed";
    }
    saving = false;
    setTimeout(() => {
      saveFeedback = "";
    }, 3000);
  };

  onMount(async () => {
    await Promise.all([load(), getStatus(), getVersion()]);
    pollTimer = setInterval(getStatus, 5000);
  });
  onDestroy(() => {
    clearInterval(pollTimer);
  });
</script>

<div
  class={cn("p-6", "flex", "flex-col", "min-h-0", "animate-fade-in", "gap-5")}
>
  <div
    class={cn("shrink-0", "flex", "items-start", "justify-between", "gap-4")}
  >
    <div class={cn("flex", "items-center", "gap-3")}>
      <div
        class={cn(
          "w-9",
          "h-9",
          "rounded-xl",
          "bg-accent/10",
          "flex",
          "items-center",
          "justify-center",
          "ring-1",
          "ring-accent/20",
          "shrink-0",
        )}
      >
        <Shield size={16} class={cn("text-accent")} />
      </div>
      <div>
        <h1 class={cn("text-lg", "font-semibold", "text-white")}>
          AdGuard Home
        </h1>
        <p class={cn("text-sm", "mt-0.5", "text-muted")}>
          {trans(
            "Free and open source, powerful network-wide ads & trackers blocking DNS server.",
          )}
        </p>
      </div>
    </div>
    <div class={cn("flex", "items-center", "gap-3")}>
      {#if saveFeedback}<span
          class={cn(
            "text-xs",
            "font-mono",
            saveFeedback === "Saved" ? "text-accent" : "text-danger",
          )}
          >{saveFeedback === "Saved"
            ? trans("Saved")
            : trans("Save failed")}</span
        >{/if}
      <button
        onclick={save}
        disabled={saving}
        class={cn(
          "inline-flex",
          "items-center",
          "gap-1.5",
          "px-3",
          "py-1.5",
          "text-xs",
          "rounded-lg",
          "font-medium",
          "transition-all",
          "duration-150",
          "cursor-pointer",
          "select-none",
          "border",
          saving
            ? "text-muted bg-surface-2 border-border"
            : "text-accent bg-accent/10 border-accent/20 hover:bg-accent/20",
          "disabled:opacity-30",
        )}
        ><Save size={14} />{saving
          ? trans("Saving...")
          : trans("Save & Apply")}</button
      >
    </div>
  </div>

  <div
    class={cn(
      "shrink-0",
      "glass",
      "p-4",
      "rounded-xl",
      "flex",
      "items-center",
      "gap-6",
    )}
  >
    <div class={cn("flex", "items-center", "gap-2")}>
      <span
        class={cn(
          "text-[10px]",
          "uppercase",
          "text-muted",
          "font-semibold",
          "tracking-wider",
        )}>{trans("Version")}</span
      ><span class={cn("text-xs", "font-mono", "text-fg")}>{version}</span>
    </div>
    <div class={cn("w-px", "h-4", "bg-border")}></div>
    <div class={cn("flex", "items-center", "gap-2")}>
      <span
        class={cn(
          "text-[10px]",
          "uppercase",
          "text-muted",
          "font-semibold",
          "tracking-wider",
        )}>{trans("Service Status")}</span
      ><span
        class={cn(
          "text-xs",
          "font-semibold",
          running ? "text-green-400" : "text-red-400",
        )}>{running ? trans("Running") : trans("Not running")}</span
      >
    </div>
    <button
      onclick={getStatus}
      class={cn(
        "p-1",
        "rounded-md",
        "hover:bg-white/5",
        "transition-colors",
        "text-muted",
        "hover:text-fg",
        "cursor-pointer",
      )}><RefreshCw size={14} /></button
    >
  </div>

  <div
    class={cn(
      "shrink-0",
      "flex",
      "gap-1",
      "p-0.5",
      "w-fit",
      "border",
      "rounded-lg",
      "bg-surface-2",
      "border-border",
    )}
  >
    {#each [{ id: "general" as const, label: trans("General Settings") }, { id: "jail" as const, label: trans("File System Access") }, ...(advanced_settings ? [{ id: "advanced" as const, label: trans("Advanced Settings") }] : [])] as t}
      <button
        class={cn(
          "px-3",
          "py-1.5",
          "text-xs",
          "rounded-md",
          "font-medium",
          "transition-all",
          "cursor-pointer",
          tab === t.id ? "bg-accent text-surface" : "bg-transparent text-muted",
        )}
        onclick={() => (tab = t.id)}>{t.label}</button
      >
    {/each}
  </div>

  {#key tab}
    <div class={cn("glass", "p-5", "rounded-xl", "space-y-5")}>
      {#if tab === "general"}
        <GeneralTab
          bind:config_file
          {config_file_err}
          bind:work_dir
          {work_dir_err}
          bind:user
          bind:group
          bind:verbose
          {validateConfigFile}
          {validateWorkDir}
          {trans}
        />
      {:else if tab === "jail"}
        <JailTab
          bind:jail_mount
          bind:jail_mount_input
          bind:jail_mount_rw
          bind:jail_mount_rw_input
          {trans}
        />
      {:else if tab === "advanced"}
        <AdvancedTab
          bind:gc
          bind:maxprocs
          bind:memlimit
          {advanced_settings}
          {trans}
        />
      {/if}
    </div>
  {/key}
</div>
