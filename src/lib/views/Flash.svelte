<script lang="ts">
  import { onMount } from "svelte";
  import {
    Download, Save, Trash2, List, HardDrive,
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

  let tab = $state<"actions" | "config">("actions");

  // --- Config ---
  let configContent = $state("");
  let configOriginal = $state("");
  let configLoading = $state(true);
  let configSaving = $state(false);
  let configFeedback = $state("");
  let backupFileList = $state("");
  let backupListLoading = $state(false);

  // --- Hostname ---
  let hostname = $state("");

  // --- Sysupgrade check ---
  let hasSysupgrade = $state(true);

  // --- MTD blocks ---
  let mtdblocks = $state<{ id: string; name: string }[]>([]);
  let selectedMtd = $state("0");

  // --- Reset ---
  let resetConfirm = $state(false);

  // --- Restore modal ---
  let restoreModal = $state(false);
  let restoreFileList = $state("");
  let restoreLoading = $state(false);
  let restoreErr = $state("");

  // --- Flash modal ---
  let flashModal = $state(false);
  let flashFileSize = $state(0);
  let flashChecksum = $state("");
  let flashSha256 = $state("");
  let flashValid = $state(false);
  let flashForceable = $state(false);
  let flashAllowBackup = $state(true);
  let flashTestCode = $state(-1);
  let flashTestStderr = $state("");
  let flashKeepSettings = $state(true);
  let flashForce = $state(false);
  let flashSkipOrig = $state(true);
  let flashBackupPkgs = $state(true);
  let flashUploading = $state(false);

  const CGI_UPLOAD = "/cgi-bin/cgi-upload";
  const CGI_BACKUP = "/cgi-bin/cgi-backup";

  async function loadAll() {
    configLoading = true;

    const [conf, plat, host, mtd] = await Promise.all([
      readFile("/etc/sysupgrade.conf"),
      execCommand("stat", ["/lib/upgrade/platform.sh"]),
      execCommand("cat", ["/proc/sys/kernel/hostname"]),
      execCommand("cat", ["/proc/mtd"]),
    ]);

    configContent = conf?.data ?? "";
    configOriginal = configContent;

    hasSysupgrade = plat?.code === 0;
    hostname = host?.stdout?.trim() ?? "openwrt";

    if (mtd?.stdout) {
      const blocks: { id: string; name: string }[] = [];
      for (const ln of mtd.stdout.split("\n")) {
        const m = ln.match(/^mtd(\d+): .+ "(.+?)"$/);
        if (m) blocks.push({ id: m[1], name: m[2] });
      }
      mtdblocks = blocks;
      if (blocks.length) selectedMtd = blocks[0].id;
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
    backupFileList = res?.stdout?.trim() ?? "";
    backupListLoading = false;
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

  function doReset() {
    if (!confirm(trans("Do you really want to erase all settings?"))) return;
    resetConfirm = false;
    execCommand("/sbin/firstboot", ["-r", "-y"]);
    document.body.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0d1117;color:#8b949e;font-family:sans-serif;flex-direction:column;gap:16px">
      <div class="spinning" style="width:32px;height:32px;border:2px solid #00d4aa;border-top-color:transparent;border-radius:50%;animation:spin .8s linear infinite"></div>
      <p style="font-size:14px">${trans("The system is erasing the configuration partition now and will reboot itself when finished.")}</p>
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
    </div>`;
  }

  function triggerMtdDownload() {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/cgi-bin/cgi-download";
    form.enctype = "application/x-www-form-urlencoded";
    const sid = document.createElement("input");
    sid.type = "hidden"; sid.name = "sessionid"; sid.value = getSession();
    form.appendChild(sid);
    const p = document.createElement("input");
    p.type = "hidden"; p.name = "path"; p.value = `/dev/mtdblock${selectedMtd}`;
    form.appendChild(p);
    const f = document.createElement("input");
    f.type = "hidden"; f.name = "filename";
    const block = mtdblocks.find(b => b.id === selectedMtd);
    const name = block?.name?.replace(/[^a-zA-Z0-9]+/g, "-") ?? "unknown";
    f.value = `${hostname}.mtd${selectedMtd}.${name}.bin`;
    form.appendChild(f);
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  }

  async function uploadAndRestore(ev: Event) {
    const input = ev.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    restoreLoading = true;
    restoreErr = "";

    const fd = new FormData();
    fd.append("sessionid", getSession());
    fd.append("file", file);

    try {
      const res = await fetch(CGI_UPLOAD, { method: "POST", body: fd });
      const data = await res.json();
      const path: string = data?.path;

      if (!path) { restoreErr = trans("Upload failed"); restoreLoading = false; return; }

      const check = await execCommand("/bin/tar", ["-tzf", path]);
      if (check?.code !== 0) {
        await execCommand("/bin/rm", [path]);
        restoreErr = trans("The uploaded backup archive is not readable");
        restoreLoading = false;
        return;
      }

      restoreFileList = check.stdout?.trim() ?? "";
      restoreModal = true;
    } catch {
      restoreErr = trans("Upload failed");
    }
    restoreLoading = false;
    input.value = "";
  }

  async function confirmRestore(ev: Event) {
    const btn = ev.currentTarget as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = trans("Rebooting…");

    const res = await execCommand("/sbin/sysupgrade", ["--restore-backup", "/tmp/backup.tar.gz"]);
    if (res?.code !== 0) {
      btn.disabled = false;
      btn.textContent = trans("Continue");
      restoreErr = trans("Restore command failed");
      return;
    }

    await execCommand("/sbin/reboot");

    document.body.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0d1117;color:#8b949e;font-family:sans-serif;flex-direction:column;gap:16px">
      <div class="spinning" style="width:32px;height:32px;border:2px solid #00d4aa;border-top-color:transparent;border-radius:50%;animation:spin .8s linear infinite"></div>
      <p style="font-size:14px">${trans("The system is rebooting now.")}</p>
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
    </div>`;
  }

  async function uploadAndFlash(ev: Event) {
    const input = ev.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    flashUploading = true;
    flashModal = false;

    const fd = new FormData();
    fd.append("sessionid", getSession());
    fd.append("file", file);

    try {
      const res = await fetch(CGI_UPLOAD, { method: "POST", body: fd });
      const data = await res.json();
      const path: string = data?.path;

      if (!path) { flashUploading = false; return; }

      const validate = await call<{ valid: boolean; forceable: boolean; allow_backup: boolean }>(
        "system", "validate_firmware_image", { path },
      ) ?? { valid: false, forceable: false, allow_backup: true };

      const testRes = await execCommand("/sbin/sysupgrade", ["--test", path]);

      flashFileSize = file.size;
      flashValid = validate.valid;
      flashForceable = validate.forceable;
      flashAllowBackup = validate.allow_backup ?? true;
      flashTestCode = testRes?.code ?? -1;
      flashTestStderr = testRes?.stderr ?? "";
      flashChecksum = "";
      flashSha256 = "";
      flashKeepSettings = validate.allow_backup !== false;
      flashForce = false;
      flashSkipOrig = true;
      flashBackupPkgs = true;

      flashModal = true;
    } catch {
      flashUploading = false;
    }
    flashUploading = false;
  }

  async function confirmFlash() {
    const args: string[] = [];
    if (!flashKeepSettings) args.push("-n");
    if (flashForce) args.push("--force");
    if (flashKeepSettings && flashSkipOrig) args.push("-u");
    if (flashKeepSettings && flashBackupPkgs) args.push("-k");
    args.push("/tmp/firmware.bin");

    flashModal = false;

    document.body.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0d1117;color:#8b949e;font-family:sans-serif;flex-direction:column;gap:16px">
      <div class="spinning" style="width:32px;height:32px;border:2px solid #00d4aa;border-top-color:transparent;border-radius:50%;animation:spin .8s linear infinite"></div>
      <p style="font-size:14px">${trans("The system is flashing now.<br /> DO NOT POWER OFF THE DEVICE!<br /> Wait a few minutes before you try to reconnect.")}</p>
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
    </div>`;

    await execCommand("/sbin/sysupgrade", args);
  }

  function cancelModal() {
    restoreModal = false;
    flashModal = false;
    execCommand("/bin/rm", ["-f", "/tmp/backup.tar.gz", "/tmp/firmware.bin"]);
  }

  onMount(() => { loadAll(); });
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
        { id: "actions", label: trans("Flash operations") },
        { id: "config", label: trans("Configuration") },
      ]}
      active={tab}
      onchange={(id) => tab = id as typeof tab}
    />
  </div>

  {#if tab === "actions"}
    <div class={cn("flex-1", "min-h-0", "overflow-y-auto", "flex", "flex-col", "gap-4")}>
      {#if !hasSysupgrade}
        <div class={cn("glass", "rounded-xl", "p-4", "shrink-0")}>
          <p class={cn("text-xs", "text-danger")}>{trans("Sorry, there is no sysupgrade support present; a new firmware image must be flashed manually.")}</p>
        </div>
      {/if}

      <!-- Backup -->
      <div class={cn("glass", "rounded-xl", "p-4", "shrink-0")}>
        <h2 class={cn("text-sm", "font-semibold", "text-white", "mb-1")}>{trans("Backup")}</h2>
        <p class={cn("text-xs", "text-muted", "mb-3")}>{trans('Click "Generate archive" to download a tar archive of the current configuration files.')}</p>
        <div class={cn("flex", "items-center", "gap-3")}>
          <span class={cn("text-xs", "text-fg")}>{trans("Download backup")}</span>
          <button onclick={triggerBackupDownload}
            class={cn(
              "px-3", "py-1.5", "rounded-lg", "text-xs", "font-medium",
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

      <!-- Restore -->
      <div class={cn("glass", "rounded-xl", "p-4", "shrink-0")}>
        <h2 class={cn("text-sm", "font-semibold", "text-white", "mb-1")}>{trans("Restore")}</h2>
        <p class={cn("text-xs", "text-muted", "mb-3")}>{trans("To restore configuration files, you can upload a previously generated backup archive here.")}</p>
        <div class={cn("flex", "items-center", "gap-3", "mb-2")}>
          <span class={cn("text-xs", "text-fg", "shrink-0")}>{trans("Restore backup")}</span>
          <input
            type="file" accept=".tar.gz,.tgz"
            onchange={uploadAndRestore}
            class={cn(
              "text-xs", "text-muted",
              "file:mr-3 file:py-1 file:px-3 file:rounded-lg file:text-xs file:font-medium",
              "file:border file:border-accent/20 file:bg-accent/8 file:text-accent",
              "file:cursor-pointer file:transition-all file:duration-150",
              "hover:file:bg-accent/15",
            )}
          />
          {#if restoreLoading}
            <span class={cn("text-xs", "text-muted")}>{trans("Checking archive…")}</span>
          {/if}
        </div>
        {#if restoreErr}
          <p class={cn("text-xs", "text-danger", "mb-2")}>✗ {restoreErr}</p>
        {/if}
        <p class={cn("text-xs", "text-muted", "mb-3")}>{trans("Custom files (certificates, scripts) may remain on the system. To prevent this, perform a factory-reset first.")}</p>
        <button onclick={doReset}
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
      </div>

      <!-- Save mtdblock contents -->
      {#if mtdblocks.length}
        <div class={cn("glass", "rounded-xl", "p-4", "shrink-0")}>
          <h2 class={cn("text-sm", "font-semibold", "text-white", "mb-1")}>{trans("Save mtdblock contents")}</h2>
          <p class={cn("text-xs", "text-muted", "mb-3")}>{trans('Click "Save mtdblock" to download specified mtdblock file. (NOTE: THIS FEATURE IS FOR PROFESSIONALS!)')}</p>
          <div class={cn("flex", "items-center", "gap-3")}>
            <select bind:value={selectedMtd}
              class={cn(
                "px-2.5", "py-1.5", "border", "text-xs", "rounded-lg",
                "bg-surface", "text-fg", "border-border", "outline-none",
                "transition-all", "duration-150",
                "focus:border-(--accent) focus:shadow-[0_0_0_1px_var(--accent)]",
              )}
            >
              {#each mtdblocks as b}
                <option value={b.id}>{b.name} (mtd{b.id})</option>
              {/each}
            </select>
            <span class={cn("text-xs", "text-fg")}>{trans("Download mtdblock")}</span>
            <button onclick={triggerMtdDownload}
              class={cn(
                "px-3", "py-1.5", "rounded-lg", "text-xs", "font-medium", "shrink-0",
                "border", "bg-accent/10", "text-accent", "border-accent/20",
                "transition-all", "duration-150", "cursor-pointer",
                "hover:bg-accent/15", "hover:border-accent/30",
              )}
            >
              <Download size={12} class={cn("inline", "mr-1.5")} />
              {trans("Save mtdblock")}
            </button>
          </div>
        </div>
      {/if}

      <!-- Flash new firmware image -->
      <div class={cn("glass", "rounded-xl", "p-4", "shrink-0")}>
        <h2 class={cn("text-sm", "font-semibold", "text-white", "mb-1")}>{trans("Flash new firmware image")}</h2>
        <p class={cn("text-xs", "text-muted", "mb-3")}>{trans("Upload a sysupgrade-compatible image here to replace the running firmware.")}</p>
        <div class={cn("flex", "items-center", "gap-3")}>
          <span class={cn("text-xs", "text-fg", "shrink-0")}>{trans("Image")}</span>
          <input
            type="file" accept=".bin,.img"
            onchange={uploadAndFlash}
            class={cn(
              "text-xs", "text-muted",
              "file:mr-3 file:py-1 file:px-3 file:rounded-lg file:text-xs file:font-medium",
              "file:border file:border-accent/20 file:bg-accent/8 file:text-accent",
              "file:cursor-pointer file:transition-all file:duration-150",
              "hover:file:bg-accent/15",
            )}
          />
          {#if flashUploading}
            <span class={cn("text-xs", "text-muted")}>{trans("Checking image…")}</span>
          {/if}
        </div>
      </div>
    </div>

  {:else if tab === "config"}
    <div class={cn("flex-1", "min-h-0", "rounded-xl", "overflow-hidden", "flex", "flex-col")}>
      <div class={cn("glass", "rounded-xl", "h-full", "flex", "flex-col")}>
        <div class={cn("shrink-0", "p-4", "border-b", "border-border")}>
          <h2 class={cn("text-sm", "font-semibold", "text-white")}>{trans("Configuration")}</h2>
          <p class={cn("text-xs", "text-muted", "mt-1")}>{trans("This is a list of shell glob patterns for matching files and directories to include during sysupgrade.")}</p>
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

        {#if backupFileList}
          <div class={cn("shrink-0", "mx-3", "mb-2", "p-3", "rounded-lg", "bg-surface-2", "border", "border-border", "max-h-40", "overflow-y-auto")}>
            <p class={cn("text-xs", "text-muted", "mb-2")}>{trans("Below is the determined list of files to backup.")}</p>
            <ul class={cn("space-y-0.5")}>
              {#each backupFileList.split("\n") as line}
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
            ></textarea>
          {/if}
        </div>

        <div class={cn("shrink-0", "p-3", "border-t", "border-border", "flex", "items-center", "justify-between")}>
          <div>
            {#if configFeedback === "saved"}
              <span class={cn("text-xs", "text-accent")}>✓ {trans("Contents have been saved.")}</span>
            {:else if configFeedback === "error"}
              <span class={cn("text-xs", "text-danger")}>✗ {trans("Unable to save contents")}</span>
            {:else if configContent !== configOriginal}
              <span class={cn("text-xs", "text-warn")}>{trans("Unsaved changes")}</span>
            {:else}
              <span class={cn("text-xs", "text-muted")}>{trans("No changes")}</span>
            {/if}
          </div>
          <button onclick={saveConfig}
            disabled={configContent === configOriginal || configSaving}
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

<!-- Restore modal -->
{#if restoreModal}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class={cn("fixed", "inset-0", "z-50", "flex", "items-center", "justify-center", "bg-black/60")} onclick={cancelModal} role="presentation">
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class={cn("glass", "rounded-xl", "p-5", "max-w-lg", "w-full", "mx-4", "max-h-[80vh]", "flex", "flex-col")} onclick={(e) => e.stopPropagation()} onkeydown={(e) => { if (e.key === "Escape") cancelModal(); }} role="dialog">
      <h3 class={cn("text-sm", "font-semibold", "text-white", "mb-2")}>{trans("Apply backup?")}</h3>
      <p class={cn("text-xs", "text-muted", "mb-3")}>{trans("The uploaded backup archive appears to be valid and contains the files listed below. Press \"Continue\" to restore the backup and reboot, or \"Cancel\" to abort the operation.")}</p>
      <pre class={cn("flex-1", "min-h-0", "overflow-y-auto", "p-3", "rounded-lg", "bg-surface", "text-[10px]", "font-mono", "text-muted", "mb-3", "border", "border-border")}>{restoreFileList}</pre>
      {#if restoreErr}
        <p class={cn("text-xs", "text-danger", "mb-3")}>✗ {restoreErr}</p>
      {/if}
      <div class={cn("flex", "items-center", "justify-end", "gap-2")}>
        <button onclick={cancelModal}
          class={cn(
            "px-3", "py-1.5", "rounded-lg", "text-xs", "font-medium",
            "border", "border-border", "bg-surface-2", "text-muted",
            "transition-all", "duration-150", "cursor-pointer",
            "hover:text-fg",
          )}
        >{trans("Cancel")}</button>
        <button onclick={confirmRestore}
          class={cn(
            "px-3", "py-1.5", "rounded-lg", "text-xs", "font-medium",
            "border", "bg-accent/10", "text-accent", "border-accent/20",
            "transition-all", "duration-150", "cursor-pointer",
            "hover:bg-accent/15", "hover:border-accent/30",
          )}
        >{trans("Continue")}</button>
      </div>
    </div>
  </div>
{/if}

<!-- Flash confirmation modal -->
{#if flashModal}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class={cn("fixed", "inset-0", "z-50", "flex", "items-center", "justify-center", "bg-black/60")} onclick={cancelModal} role="presentation">
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class={cn("glass", "rounded-xl", "p-5", "max-w-lg", "w-full", "mx-4", "max-h-[80vh]", "flex", "flex-col", "overflow-y-auto")} onclick={(e) => e.stopPropagation()} onkeydown={(e) => { if (e.key === "Escape") cancelModal(); }} role="dialog">
      <h3 class={cn("text-sm", "font-semibold", "text-white", "mb-2")}>{trans("Flash image?")}</h3>
      <p class={cn("text-xs", "text-muted", "mb-3")}>{trans("The flash image was uploaded. Click 'Continue' below to start the flash procedure.")}</p>

      {#if flashFileSize > 0}
        <ul class={cn("text-xs", "text-muted", "space-y-1", "mb-3")}>
          <li>{trans("Size")}: {(flashFileSize / 1048576).toFixed(2)} MB</li>
        </ul>
      {/if}

      <label class={cn("flex", "items-center", "gap-2", "mb-2", "cursor-pointer")}>
        <input type="checkbox" bind:checked={flashKeepSettings} class={cn("accent-accent")} disabled={!flashAllowBackup} />
        <span class={cn("text-xs", "text-fg")}>{trans("Keep settings and retain the current configuration")}</span>
      </label>

      {#if flashKeepSettings && flashAllowBackup}
        <label class={cn("flex", "items-center", "gap-2", "ml-5", "mb-1", "cursor-pointer")}>
          <input type="checkbox" bind:checked={flashSkipOrig} class={cn("accent-accent")} />
          <span class={cn("text-xs", "text-muted")}>{trans("Skip from backup files that are equal to those in /rom")}</span>
        </label>
        <label class={cn("flex", "items-center", "gap-2", "ml-5", "mb-2", "cursor-pointer")}>
          <input type="checkbox" bind:checked={flashBackupPkgs} class={cn("accent-accent")} />
          <span class={cn("text-xs", "text-muted")}>{trans("Include in backup a list of current installed packages")}</span>
        </label>
      {/if}

      {#if flashTestCode !== 0}
        <div class={cn("p-3", "rounded-lg", "bg-danger/10", "border", "border-danger/20", "mb-2")}>
          <p class={cn("text-xs", "text-danger", "font-semibold", "mb-1")}>{trans("Image check failed:")}</p>
          <pre class={cn("text-[10px]", "text-danger", "whitespace-pre-wrap", "font-mono")}>{flashTestStderr}</pre>
        </div>
      {/if}

      {#if !flashValid}
        <div class={cn("p-3", "rounded-lg", "bg-warn/10", "border", "border-warn/20", "mb-2")}>
          <p class={cn("text-xs", "text-warn")}>{trans("The uploaded image file does not contain a supported format.")}</p>
        </div>
      {/if}

      {#if (!flashValid || flashTestCode !== 0) && flashForceable}
        <label class={cn("flex", "items-center", "gap-2", "p-3", "rounded-lg", "bg-danger/10", "border", "border-danger/20", "mb-2", "cursor-pointer")}>
          <input type="checkbox" bind:checked={flashForce} class={cn("accent-danger")} />
          <div>
            <span class={cn("text-xs", "text-danger", "font-semibold")}>{trans("Force upgrade")}</span>
            <p class={cn("text-[10px]", "text-danger", "mt-0.5")}>{trans("Select 'Force upgrade' to flash the image even if the image format check fails.")}</p>
          </div>
        </label>
      {/if}

      <div class={cn("flex", "items-center", "justify-end", "gap-2", "mt-2")}>
        <button onclick={cancelModal}
          class={cn(
            "px-3", "py-1.5", "rounded-lg", "text-xs", "font-medium",
            "border", "border-border", "bg-surface-2", "text-muted",
            "transition-all", "duration-150", "cursor-pointer",
            "hover:text-fg",
          )}
        >{trans("Cancel")}</button>
        <button onclick={confirmFlash}
          disabled={(!flashValid || flashTestCode !== 0) && !flashForce}
          class={cn(
            "px-3", "py-1.5", "rounded-lg", "text-xs", "font-medium",
            "border", "bg-accent/10", "text-accent", "border-accent/20",
            "transition-all", "duration-150", "cursor-pointer",
            "hover:bg-accent/15", "hover:border-accent/30",
            "disabled:opacity-30 disabled:cursor-not-allowed",
          )}
        >{trans("Continue")}</button>
      </div>
    </div>
  </div>
{/if}
