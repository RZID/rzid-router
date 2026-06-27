<script lang="ts">
  import { onMount } from "svelte";
  import {
    Download, Upload, RotateCw, AlertTriangle, Save,
    Trash2, FileText, List, HardDrive,
  } from "@lucide/svelte";
  import { cn } from "../helpers/classname";
  import { t as _t, getLocale, onLocaleChange } from "../i18n";
  import {
    readFile, writeFile, execCommand, call,
    getSession,
  } from "../api/ubus";
  import TabBar from "../components/TabBar/index.svelte";

  let locale = $state(getLocale());
  let trans = $derived.by(() => { locale; return (k: string) => _t(k); });
  $effect(() => onLocaleChange(() => { locale = getLocale(); }));

  let tab = $state<"backup" | "flash" | "config">("backup");

  // --- sysupgrade.conf ---
  let configContent = $state("");
  let configOriginal = $state("");
  let configLoading = $state(true);
  let configSaving = $state(false);
  let configFeedback = $state("");
  let backupFileList = $state<string[]>([]);
  let backupListLoading = $state(false);

  // --- Reset ---
  let resetConfirm = $state(false);

  // --- Restore ---
  let restoreFile: File | null = $state(null);
  let restoreLoading = $state(false);
  let restoreFeedback = $state("");

  // --- Flash ---
  let flashFile: File | null = $state(null);
  let flashLoading = $state(false);
  let flashFeedback = $state("");
  let flashValidating = $state(false);
  let flashValidation: { valid: boolean; forcable: boolean } | null = $state(null);
  let flashKeepSettings = $state(true);
  let flashForce = $state(false);
  let flashSkipOrig = $state(true);
  let flashBackupPkgs = $state(true);
  let flashImageTooBig = $state(false);
  let flashSysupgradeOk = $state<boolean | null>(null);
  let flashSysupgradeStderr = $state("");

  const configDirty = $derived(configContent !== configOriginal);

  const CGI_UPLOAD = "/cgi-bin/cgi-upload";
  const CGI_BACKUP = "/cgi-bin/cgi-backup";

  async function loadConfig() {
    configLoading = true;
    try {
      const res = await readFile("/etc/sysupgrade.conf");
      configContent = res?.data ?? "";
      configOriginal = configContent;
    } catch {
      configContent = "";
    }
    configLoading = false;
  }

  async function saveConfig() {
    configSaving = true;
    configFeedback = "";
    try {
      const value = configContent.trim().replace(/\r\n/g, "\n") + "\n";
      await writeFile("/etc/sysupgrade.conf", value);
      configContent = value;
      configOriginal = value;
      configFeedback = "saved";
    } catch {
      configFeedback = "error";
    }
    configSaving = false;
    setTimeout(() => { configFeedback = ""; }, 3000);
  }

  async function showBackupList() {
    backupListLoading = true;
    const res = await execCommand("/sbin/sysupgrade", ["--list-backup"]);
    backupFileList = res?.stdout ? res.stdout.trim().split("\n") : [];
    backupListLoading = false;
  }

  async function doReset() {
    resetConfirm = false;
    await execCommand("/sbin/firstboot", ["-r", "-y"]);
    await execCommand("/sbin/reboot");

    document.body.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0d1117;color:#8b949e;font-family:sans-serif;flex-direction:column;gap:16px">
      <div class="spinning" style="width:32px;height:32px;border:2px solid #00d4aa;border-top-color:transparent;border-radius:50%;animation:spin .8s linear infinite"></div>
      <p style="font-size:14px">${trans("The system is rebooting now…")}</p>
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
    </div>`;
  }

  async function uploadFile(file: File): Promise<string | null> {
    const fd = new FormData();
    fd.append("sessionid", getSession());
    fd.append("file", file);
    try {
      const res = await fetch(CGI_UPLOAD, { method: "POST", body: fd });
      const data = await res.json();
      return data?.path ?? null;
    } catch {
      return null;
    }
  }

  async function doRestore() {
    if (!restoreFile) return;
    restoreLoading = true;
    restoreFeedback = "";

    const path = await uploadFile(restoreFile);
    if (!path) { restoreFeedback = "upload_fail"; restoreLoading = false; return; }

    const check = await execCommand("/bin/tar", ["-tzf", path]);
    if (check?.code !== 0) {
      await execCommand("/bin/rm", [path]);
      restoreFeedback = "invalid_archive";
      restoreLoading = false;
      return;
    }

    const res = await execCommand("/sbin/sysupgrade", ["--restore-backup", path]);
    if (res?.code !== 0) {
      restoreFeedback = "restore_fail";
      restoreLoading = false;
      return;
    }

    restoreFeedback = "restored";
    await execCommand("/sbin/reboot");

    document.body.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0d1117;color:#8b949e;font-family:sans-serif;flex-direction:column;gap:16px">
      <div class="spinning" style="width:32px;height:32px;border:2px solid #00d4aa;border-top-color:transparent;border-radius:50%;animation:spin .8s linear infinite"></div>
      <p style="font-size:14px">${trans("The system is rebooting now…")}</p>
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
    </div>`;
  }

  async function doFlash() {
    if (!flashFile) return;
    flashLoading = true;
    flashFeedback = "";
    flashValidation = null;
    flashImageTooBig = false;
    flashSysupgradeOk = null;

    const path = await uploadFile(flashFile);
    if (!path) { flashFeedback = "upload_fail"; flashLoading = false; return; }

    flashValidating = true;
    const ubusValidate = await call<{ valid: boolean; forcable: boolean }>(
      "system", "validate_firmware_image", { path },
    );
    flashValidation = ubusValidate ?? { valid: false, forcable: false };

    const testRes = await execCommand("/sbin/sysupgrade", ["--test", path]);
    flashSysupgradeOk = testRes?.code === 0;
    flashSysupgradeStderr = testRes?.stderr ?? "";

    const storageSize = 0;

    if (storageSize > 0 && flashFile.size > storageSize) {
      flashImageTooBig = true;
    }

    if (flashValidation.valid && flashSysupgradeOk && !flashImageTooBig) {
      const args: string[] = [];
      if (!flashKeepSettings) args.push("-n");
      if (flashForce) args.push("--force");
      if (flashKeepSettings && flashSkipOrig) args.push("-u");
      if (flashKeepSettings && flashBackupPkgs) args.push("-k");
      args.push(path);

      flashFeedback = "flashing";
      await execCommand("/sbin/sysupgrade", args);
      await new Promise(() => {}); // never resolves — sysupgrade reboots
    } else {
      flashFeedback = "validation_failed";
    }
    flashValidating = false;
    flashLoading = false;
  }

  function triggerBackupDownload() {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = CGI_BACKUP;
    form.enctype = "application/x-www-form-urlencoded";
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "sessionid";
    input.value = getSession();
    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  }

  onMount(() => { loadConfig(); });
</script>

<div class={cn("p-6", "flex", "flex-col", "h-dvh", "gap-4", "animate-fade-in")}>
  <!-- Header -->
  <div class={cn("shrink-0", "flex", "items-center", "gap-3")}>
    <div class={cn("w-9", "h-9", "rounded-xl", "bg-accent/10", "flex", "items-center", "justify-center", "ring-1", "ring-accent/20", "shrink-0")}>
      <HardDrive size={16} class="text-accent" />
    </div>
    <div>
      <h1 class={cn("text-lg", "font-semibold", "text-white", "tracking-tight")}>{trans("Backup / Flash")}</h1>
      <p class={cn("text-xs", "text-muted")}>{trans("Backup, restore, firmware upgrade")}</p>
    </div>
  </div>

  <!-- Tabs -->
  <div class={cn("shrink-0")}>
    <TabBar
      tabs={[
        { id: "backup", label: trans("Backup / Restore") },
        { id: "flash", label: trans("Flash Firmware") },
        { id: "config", label: trans("Configuration") },
      ]}
      active={tab}
      onchange={(id) => tab = id as typeof tab}
    />
  </div>

  {#if tab === "backup"}
    <!-- Backup / Restore tab -->
    <div class={cn("flex-1", "min-h-0", "overflow-y-auto", "flex", "flex-col", "gap-4")}>
      <!-- Download Backup -->
      <div class={cn("glass", "rounded-xl", "p-4", "shrink-0")}>
        <div class={cn("flex", "items-start", "justify-between")}>
          <div>
            <h2 class={cn("text-sm", "font-semibold", "text-white")}>{trans("Backup")}</h2>
            <p class={cn("text-xs", "text-muted", "mt-1")}>{trans("Download a tar archive of the current configuration files.")}</p>
          </div>
          <button onclick={triggerBackupDownload}
            class={cn(
              "px-3", "py-1.5", "rounded-lg", "text-xs", "font-medium", "shrink-0",
              "border", "bg-accent/10", "text-accent", "border-accent/20",
              "transition-all", "duration-150", "cursor-pointer",
              "hover:bg-accent/15", "hover:border-accent/30",
            )}
          >
            <Download size={12} class={cn("inline", "mr-1.5")} />
            {trans("Generate archive")}
          </button>
        </div>
      </div>

      <!-- Restore Backup -->
      <div class={cn("glass", "rounded-xl", "p-4", "shrink-0")}>
        <h2 class={cn("text-sm", "font-semibold", "text-white")}>{trans("Restore")}</h2>
        <p class={cn("text-xs", "text-muted", "mt-1")}>{trans("Upload a previously generated backup archive to restore configuration files.")}</p>

        <div class={cn("mt-3", "flex", "items-center", "gap-3")}>
          <input
            type="file"
            accept=".tar.gz,.tgz"
            onchange={(e) => {
              const el = e.currentTarget as HTMLInputElement;
              restoreFile = el.files?.[0] ?? null;
            }}
            class={cn(
              "flex-1", "text-xs", "text-muted",
              "file:mr-3 file:py-1 file:px-3 file:rounded-lg file:text-xs file:font-medium",
              "file:border file:border-accent/20 file:bg-accent/8 file:text-accent",
              "file:cursor-pointer file:transition-all file:duration-150",
              "hover:file:bg-accent/15",
            )}
          />
          <button onclick={doRestore}
            disabled={!restoreFile || restoreLoading}
            class={cn(
              "px-3", "py-1.5", "rounded-lg", "text-xs", "font-medium", "shrink-0",
              "border", "bg-accent/10", "text-accent", "border-accent/20",
              "transition-all", "duration-150", "cursor-pointer",
              "hover:bg-accent/15", "hover:border-accent/30",
              "disabled:opacity-30 disabled:cursor-not-allowed",
              restoreLoading && "animate-pulse",
            )}
          >
            <Upload size={12} class={cn("inline", "mr-1.5")} />
            {restoreLoading ? trans("Uploading…") : trans("Upload archive...")}
          </button>
        </div>

        {#if restoreFeedback === "upload_fail"}
          <p class={cn("text-xs", "text-danger", "mt-2")}>✗ {trans("Upload failed")}</p>
        {:else if restoreFeedback === "invalid_archive"}
          <p class={cn("text-xs", "text-danger", "mt-2")}>✗ {trans("The uploaded backup archive is not readable")}</p>
        {:else if restoreFeedback === "restore_fail"}
          <p class={cn("text-xs", "text-danger", "mt-2")}>✗ {trans("Restore command failed")}</p>
        {:else if restoreFeedback === "restored"}
          <p class={cn("text-xs", "text-accent", "mt-2")}>✓ {trans("Restore successful. Rebooting…")}</p>
        {/if}
      </div>

      <!-- Reset to defaults -->
      <div class={cn("glass", "rounded-xl", "p-4", "shrink-0")}>
        <h2 class={cn("text-sm", "font-semibold", "text-white")}>{trans("Reset to defaults")}</h2>
        <p class={cn("text-xs", "text-muted", "mt-1")}>{trans("Reset the firmware to its initial state (only possible with squashfs images).")}</p>

        <div class={cn("mt-3")}>
          {#if resetConfirm}
            <div class={cn("flex", "items-center", "gap-2", "p-3", "rounded-lg", "bg-danger/10", "border", "border-danger/20")}>
              <AlertTriangle size={14} class={cn("text-danger", "shrink-0")} />
              <span class={cn("text-xs", "text-danger", "flex-1")}>{trans("Do you really want to erase all settings?")}</span>
              <button onclick={doReset}
                class={cn(
                  "px-3", "py-1.5", "rounded-lg", "text-xs", "font-medium",
                  "border", "bg-danger/10", "text-danger", "border-danger/20",
                  "transition-all", "duration-150", "cursor-pointer",
                  "hover:bg-danger/20",
                )}
              >
                {trans("Confirm")}
              </button>
              <button onclick={() => resetConfirm = false}
                class={cn(
                  "px-3", "py-1.5", "rounded-lg", "text-xs", "font-medium",
                  "border", "border-border", "bg-surface-2", "text-muted",
                  "transition-all", "duration-150", "cursor-pointer",
                  "hover:text-fg",
                )}
              >
                {trans("Cancel")}
              </button>
            </div>
          {:else}
            <button onclick={() => resetConfirm = true}
              class={cn(
                "px-3", "py-1.5", "rounded-lg", "text-xs", "font-medium",
                "border", "bg-danger/10", "text-danger", "border-danger/20",
                "transition-all", "duration-150", "cursor-pointer",
                "hover:bg-danger/20",
              )}
            >
              <Trash2 size={12} class={cn("inline", "mr-1.5")} />
              {trans("Perform reset")}
            </button>
          {/if}
        </div>
      </div>
    </div>

  {:else if tab === "flash"}
    <!-- Flash Firmware tab -->
    <div class={cn("flex-1", "min-h-0", "overflow-y-auto", "flex", "flex-col", "gap-4")}>
      <div class={cn("glass", "rounded-xl", "p-4", "shrink-0")}>
        <h2 class={cn("text-sm", "font-semibold", "text-white")}>{trans("Flash new firmware image")}</h2>
        <p class={cn("text-xs", "text-muted", "mt-1")}>{trans("Upload a sysupgrade-compatible image here to replace the running firmware.")}</p>

        <div class={cn("mt-3", "flex", "items-center", "gap-3")}>
          <input
            type="file"
            accept=".bin,.img"
            onchange={(e) => {
              const el = e.currentTarget as HTMLInputElement;
              flashFile = el.files?.[0] ?? null;
              flashValidation = null;
              flashFeedback = "";
            }}
            class={cn(
              "flex-1", "text-xs", "text-muted",
              "file:mr-3 file:py-1 file:px-3 file:rounded-lg file:text-xs file:font-medium",
              "file:border file:border-accent/20 file:bg-accent/8 file:text-accent",
              "file:cursor-pointer file:transition-all file:duration-150",
              "hover:file:bg-accent/15",
            )}
          />
          <button onclick={doFlash}
            disabled={!flashFile || flashLoading}
            class={cn(
              "px-3", "py-1.5", "rounded-lg", "text-xs", "font-medium", "shrink-0",
              "border", "bg-accent/10", "text-accent", "border-accent/20",
              "transition-all", "duration-150", "cursor-pointer",
              "hover:bg-accent/15", "hover:border-accent/30",
              "disabled:opacity-30 disabled:cursor-not-allowed",
              flashLoading && "animate-pulse",
            )}
          >
            <Upload size={12} class={cn("inline", "mr-1.5")} />
            {flashLoading ? trans("Uploading…") : trans("Flash image...")}
          </button>
        </div>

        {#if flashFeedback === "upload_fail"}
          <p class={cn("text-xs", "text-danger", "mt-2")}>✗ {trans("Upload failed")}</p>
        {:else if flashFeedback === "validation_failed"}
          <p class={cn("text-xs", "text-danger", "mt-2")}>✗ {trans("Image validation failed")}</p>
        {:else if flashFeedback === "flashing"}
          <p class={cn("text-xs", "text-accent", "mt-2")}>{trans("Flashing...")}</p>
        {/if}

        <!-- Validation results -->
        {#if flashValidation}
          <div class={cn("mt-3", "p-3", "rounded-lg", "border")}>
            <div class={cn("grid", "grid-cols-2", "gap-2", "text-xs")}>
              <span class={cn("text-muted")}>{trans("Valid image")}:</span>
              <span class={flashValidation.valid ? "text-accent" : "text-danger"}>
                {flashValidation.valid ? "✓" : "✗"}
              </span>
              <span class={cn("text-muted")}>{trans("Sysupgrade test")}:</span>
              <span class={flashSysupgradeOk ? "text-accent" : "text-danger"}>
                {flashSysupgradeOk === null ? "…" : flashSysupgradeOk ? "✓" : "✗"}
              </span>
            </div>
            {#if flashSysupgradeStderr}
              <pre class={cn("mt-2", "text-[10px]", "text-danger", "whitespace-pre-wrap")}>{flashSysupgradeStderr}</pre>
            {/if}

            {#if flashValidation.valid && flashSysupgradeOk}
              <!-- Options -->
              <div class={cn("mt-3", "space-y-2")}>
                <label class={cn("flex", "items-center", "gap-2", "cursor-pointer")}>
                  <input type="checkbox" bind:checked={flashKeepSettings} class={cn("accent-accent")} />
                  <span class={cn("text-xs", "text-fg")}>{trans("Keep settings and retain the current configuration")}</span>
                </label>
                {#if flashKeepSettings}
                  <label class={cn("flex", "items-center", "gap-2", "cursor-pointer", "ml-5")}>
                    <input type="checkbox" bind:checked={flashSkipOrig} class={cn("accent-accent")} />
                    <span class={cn("text-xs", "text-muted")}>{trans("Skip from backup files that are equal to those in /rom")}</span>
                  </label>
                  <label class={cn("flex", "items-center", "gap-2", "cursor-pointer", "ml-5")}>
                    <input type="checkbox" bind:checked={flashBackupPkgs} class={cn("accent-accent")} />
                    <span class={cn("text-xs", "text-muted")}>{trans("Include in backup a list of current installed packages")}</span>
                  </label>
                {/if}
                <label class={cn("flex", "items-center", "gap-2", "cursor-pointer")}>
                  <input type="checkbox" bind:checked={flashForce} class={cn("accent-danger")} />
                  <span class={cn("text-xs", "text-danger")}>{trans("Force upgrade")}</span>
                </label>
              </div>
            {/if}

            {#if flashImageTooBig}
              <p class={cn("mt-2", "text-xs", "text-danger")}>{trans("The image does not fit into the flash memory.")}</p>
            {/if}
            {#if !flashValidation.valid && flashValidation.forcable}
              <p class={cn("mt-2", "text-xs", "text-warn")}>{trans("Select 'Force upgrade' to flash even if the image format check fails.")}</p>
            {/if}
          </div>
        {/if}
      </div>
    </div>

  {:else if tab === "config"}
    <!-- Configuration tab -->
    <div class={cn("flex-1", "min-h-0", "rounded-xl", "overflow-hidden", "flex", "flex-col")}>
      <div class={cn("glass", "rounded-xl", "h-full", "flex", "flex-col")}>
        <div class={cn("shrink-0", "p-4", "border-b", "border-border")}>
          <h2 class={cn("text-sm", "font-semibold", "text-white")}>{trans("Configuration")}</h2>
          <p class={cn("text-xs", "text-muted", "mt-1")}>{trans("Shell glob patterns for files to include during sysupgrade.")}</p>
        </div>

        <div class={cn("shrink-0", "p-3", "border-b", "border-border", "flex", "items-center", "gap-3")}>
          <button onclick={showBackupList}
            disabled={backupListLoading}
            class={cn(
              "px-3", "py-1.5", "rounded-lg", "text-xs", "font-medium",
              "border", "border-border", "bg-surface-2", "text-muted",
              "transition-all", "duration-150", "cursor-pointer",
              "hover:bg-surface-3", "hover:text-fg",
            )}
          >
            <List size={12} class={cn("inline", "mr-1.5")} />
            {trans("Show current backup file list")}
          </button>
        </div>

        {#if backupFileList.length > 0}
          <div class={cn("shrink-0", "mx-3", "mb-2", "p-3", "rounded-lg", "bg-surface-2", "border", "border-border", "max-h-40", "overflow-y-auto")}>
            <ul class={cn("space-y-0.5")}>
              {#each backupFileList as line}
                <li class={cn("text-[10px]", "font-mono", "text-muted", "leading-relaxed")}>{line}</li>
              {/each}
            </ul>
          </div>
        {/if}

        <div class={cn("flex-1", "min-h-0", "relative")}>
          {#if configLoading}
            <div class={cn("absolute", "inset-0", "flex", "items-center", "justify-center")}>
              <div class={cn("w-8", "h-8", "rounded-lg", "bg-surface-3", "animate-pulse")}></div>
            </div>
          {:else}
            <textarea
              bind:value={configContent}
              class={cn(
                "w-full", "h-full", "p-4", "font-mono", "text-xs", "leading-relaxed",
                "bg-transparent", "text-fg", "outline-none", "resize-none",
                "placeholder:text-muted/30", "whitespace-pre", "break-normal",
              )}
              placeholder={trans("# Enter shell glob patterns here")}
            ></textarea>
          {/if}
        </div>

        <div class={cn("shrink-0", "p-3", "border-t", "border-border", "flex", "items-center", "justify-between")}>
          <div>
            {#if configFeedback === "saved"}
              <span class={cn("text-xs", "text-accent")}>✓ {trans("Contents have been saved.")}</span>
            {:else if configFeedback === "error"}
              <span class={cn("text-xs", "text-danger")}>✗ {trans("Failed to save")}</span>
            {:else if configDirty}
              <span class={cn("text-xs", "text-warn")}>{trans("Unsaved changes")}</span>
            {:else}
              <span class={cn("text-xs", "text-muted")}>{trans("No changes")}</span>
            {/if}
          </div>
          <button onclick={saveConfig}
            disabled={!configDirty || configSaving}
            class={cn(
              "px-3", "py-1.5", "rounded-lg", "text-xs", "font-medium",
              "border", "bg-accent/10", "text-accent", "border-accent/20",
              "transition-all", "duration-150", "cursor-pointer",
              "hover:bg-accent/15", "hover:border-accent/30",
              "disabled:opacity-30 disabled:cursor-not-allowed",
              configSaving && "animate-pulse",
            )}
          >
            <Save size={12} class={cn("inline", "mr-1.5")} />
            {configSaving ? trans("Saving…") : trans("Save")}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
