<script lang="ts">
  import { onMount } from "svelte";
  import { HardDrive } from "@lucide/svelte";
  import { cn } from "../../helpers/classname";
  import { t as _t, getLocale, onLocaleChange } from "../../i18n";
  import { readFile, writeFile, execCommand, call, getSession } from "../../api/ubus";
  import TabBar from "../../components/TabBar/TabBar.svelte";
  import FlashActions from "./FlashActions.svelte";
  import ConfigEditor from "./ConfigEditor.svelte";
  import RestoreModal from "./RestoreModal.svelte";
  import FlashModal from "./FlashModal.svelte";

  let locale = $state(getLocale());
  let trans = $derived.by(() => { locale; return (k: string) => _t(k); });
  $effect(() => onLocaleChange(() => { locale = getLocale(); }));

  let tab = $state<"actions" | "config">("actions");
  let hostname = $state("");
  let hasSysupgrade = $state(true);
  let mtdblocks = $state<{ id: string; name: string }[]>([]);

  // Restore state
  let restoreModal = $state(false);
  let restoreFileList = $state("");
  let restoreLoading = $state(false);
  let restoreErr = $state("");

  // Flash state
  let flashModal = $state(false);
  let flashFileSize = $state(0);
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
  let selectedMtd = $state("0");

  const CGI_UPLOAD = "/cgi-bin/cgi-upload";
  const CGI_BACKUP = "/cgi-bin/cgi-backup";

  const loadAll = async () => {
    const [conf, plat, host, mtd] = await Promise.all([
      readFile("/etc/sysupgrade.conf"),
      execCommand("stat", ["/lib/upgrade/platform.sh"]),
      execCommand("cat", ["/proc/sys/kernel/hostname"]),
      execCommand("cat", ["/proc/mtd"]),
    ]);
    hasSysupgrade = plat?.code === 0;
    hostname = host?.stdout?.trim() ?? "openwrt";
    if (mtd?.stdout) {
      const blocks: { id: string; name: string }[] = [];
      for (const ln of mtd.stdout.split("\n")) { const m = ln.match(/^mtd(\d+): .+ "(.+?)"$/); if (m) blocks.push({ id: m[1], name: m[2] }); }
      mtdblocks = blocks;
      if (blocks.length) selectedMtd = blocks[0].id;
    }
  };

  const triggerBackupDownload = () => {
    const form = document.createElement("form");
    form.method = "POST"; form.action = CGI_BACKUP; form.enctype = "application/x-www-form-urlencoded";
    const input = document.createElement("input"); input.type = "hidden"; input.name = "sessionid"; input.value = getSession();
    form.appendChild(input); document.body.appendChild(form); form.submit(); document.body.removeChild(form);
  };

  const doReset = () => {
    execCommand("/sbin/firstboot", ["-r", "-y"]);
    document.body.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0d1117;color:#8b949e;font-family:sans-serif;flex-direction:column;gap:16px"><div class="spinning" style="width:32px;height:32px;border:2px solid #00d4aa;border-top-color:transparent;border-radius:50%;animation:spin .8s linear infinite"></div><p style="font-size:14px">${trans("The system is erasing the configuration partition now and will reboot itself when finished.")}</p><style>@keyframes spin{to{transform:rotate(360deg)}}</style></div>`;
  };

  const triggerMtdDownload = (mtdId: string) => {
    const form = document.createElement("form"); form.method = "POST"; form.action = "/cgi-bin/cgi-download"; form.enctype = "application/x-www-form-urlencoded";
    const sid = document.createElement("input"); sid.type = "hidden"; sid.name = "sessionid"; sid.value = getSession(); form.appendChild(sid);
    const p = document.createElement("input"); p.type = "hidden"; p.name = "path"; p.value = `/dev/mtdblock${mtdId}`; form.appendChild(p);
    const f = document.createElement("input"); f.type = "hidden"; f.name = "filename";
    const block = mtdblocks.find((b) => b.id === mtdId);
    f.value = `${hostname}.mtd${mtdId}.${block?.name?.replace(/[^a-zA-Z0-9]+/g, "-") ?? "unknown"}.bin`; form.appendChild(f);
    document.body.appendChild(form); form.submit(); document.body.removeChild(form);
  };

  const uploadAndRestore = async (ev: Event) => {
    const input = ev.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    restoreLoading = true; restoreErr = "";
    const fd = new FormData(); fd.append("sessionid", getSession()); fd.append("file", file);
    try {
      const res = await fetch(CGI_UPLOAD, { method: "POST", body: fd });
      const data = await res.json();
      const path: string = data?.path;
      if (!path) { restoreErr = trans("Upload failed"); restoreLoading = false; return; }
      const check = await execCommand("/bin/tar", ["-tzf", path]);
      if (check?.code !== 0) { await execCommand("/bin/rm", [path]); restoreErr = trans("The uploaded backup archive is not readable"); restoreLoading = false; return; }
      restoreFileList = check.stdout?.trim() ?? "";
      restoreModal = true;
    } catch { restoreErr = trans("Upload failed"); }
    restoreLoading = false; input.value = "";
  };

  const cancelModal = () => {
    restoreModal = false; flashModal = false;
    execCommand("/bin/rm", ["-f", "/tmp/backup.tar.gz", "/tmp/firmware.bin"]);
  };

  const uploadAndFlash = async (ev: Event) => {
    const input = ev.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    flashUploading = true; flashModal = false;
    const fd = new FormData(); fd.append("sessionid", getSession()); fd.append("file", file);
    try {
      const res = await fetch(CGI_UPLOAD, { method: "POST", body: fd });
      const data = await res.json();
      const path: string = data?.path;
      if (!path) { flashUploading = false; return; }
      const validate = (await call<{ valid: boolean; forceable: boolean; allow_backup: boolean }>("system", "validate_firmware_image", { path })) ?? { valid: false, forceable: false, allow_backup: true };
      const testRes = await execCommand("/sbin/sysupgrade", ["--test", path]);
      flashFileSize = file.size; flashValid = validate.valid; flashForceable = validate.forceable;
      flashAllowBackup = validate.allow_backup ?? true; flashTestCode = testRes?.code ?? -1;
      flashTestStderr = testRes?.stderr ?? ""; flashKeepSettings = validate.allow_backup !== false;
      flashForce = false; flashSkipOrig = true; flashBackupPkgs = true;
      flashModal = true;
    } catch { /* ignore */ }
    flashUploading = false;
  };

  const confirmFlash = async () => {
    const args: string[] = [];
    if (!flashKeepSettings) args.push("-n");
    if (flashForce) args.push("--force");
    if (flashKeepSettings && flashSkipOrig) args.push("-u");
    if (flashKeepSettings && flashBackupPkgs) args.push("-k");
    args.push("/tmp/firmware.bin");
    flashModal = false;
    document.body.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0d1117;color:#8b949e;font-family:sans-serif;flex-direction:column;gap:16px"><div class="spinning" style="width:32px;height:32px;border:2px solid #00d4aa;border-top-color:transparent;border-radius:50%;animation:spin .8s linear infinite"></div><p style="font-size:14px">${trans("The system is flashing now.<br /> DO NOT POWER OFF THE DEVICE!<br /> Wait a few minutes before you try to reconnect.")}</p><style>@keyframes spin{to{transform:rotate(360deg)}}</style></div>`;
    await execCommand("/sbin/sysupgrade", args);
  };

  onMount(() => loadAll());
</script>

<div class={cn("p-6", "flex", "flex-col", "h-dvh", "gap-4", "animate-fade-in")}>
  <div class={cn("shrink-0", "flex", "items-center", "gap-3")}>
    <div class={cn("w-9", "h-9", "rounded-xl", "bg-accent/10", "flex", "items-center", "justify-center", "ring-1", "ring-accent/20", "shrink-0")}><HardDrive size={16} class={cn("text-accent")} /></div>
    <div>
      <h1 class={cn("text-lg", "font-semibold", "text-white", "tracking-tight")}>{trans("Backup / Flash")}</h1>
      <p class={cn("text-xs", "text-muted")}>{trans("Backup, restore, firmware upgrade")}</p>
    </div>
  </div>
  <div class={cn("shrink-0")}>
    <TabBar tabs={[{ id: "actions", label: trans("Flash operations") }, { id: "config", label: trans("Configuration") }]} active={tab} onchange={(id) => (tab = id as typeof tab)} />
  </div>
  {#if tab === "actions"}
    <FlashActions {hasSysupgrade} {mtdblocks} bind:selectedMtd {hostname} {restoreErr} {restoreLoading} {flashUploading} {trans}
      onBackup={triggerBackupDownload} onReset={doReset} onMtdDownload={triggerMtdDownload} onRestoreUpload={uploadAndRestore} onFlashUpload={uploadAndFlash} />
  {:else}
    <ConfigEditor {trans} onfeedback={() => {}} />
  {/if}
</div>

{#if restoreModal}
  <RestoreModal {restoreFileList} oncancel={cancelModal} />
{/if}

{#if flashModal}
  <FlashModal {flashFileSize} {flashValid} {flashForceable} {flashTestCode} {flashTestStderr}
    bind:flashKeepSettings {flashAllowBackup} bind:flashForce bind:flashSkipOrig bind:flashBackupPkgs
    oncancel={cancelModal} onconfirm={confirmFlash} />
{/if}
