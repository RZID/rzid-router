<script lang="ts">
  import { Download, Trash2 } from "@lucide/svelte";
  import { cn } from "../../helpers/classname";
  import Select from "../../components/Select/Select.svelte";

  let {
    hasSysupgrade,
    mtdblocks,
    selectedMtd = $bindable(),
    hostname,
    restoreErr,
    restoreLoading,
    flashUploading,
    trans,
    onBackup,
    onReset,
    onMtdDownload,
    onRestoreUpload,
    onFlashUpload,
  }: {
    hasSysupgrade: boolean;
    mtdblocks: { id: string; name: string }[];
    selectedMtd: string;
    hostname: string;
    restoreErr: string;
    restoreLoading: boolean;
    flashUploading: boolean;
    trans: (k: string) => string;
    onBackup: () => void;
    onReset: () => void;
    onMtdDownload: (mtdId: string) => void;
    onRestoreUpload: (ev: Event) => void;
    onFlashUpload: (ev: Event) => void;
  } = $props();

  const btnCls =
    "px-3 py-1.5 rounded-lg text-xs font-medium border bg-accent/10 text-accent border-accent/20 transition-all duration-150 cursor-pointer hover:bg-accent/15 hover:border-accent/30";
</script>

<div
  class={cn(
    "flex-1",
    "min-h-0",
    "overflow-y-auto",
    "flex",
    "flex-col",
    "gap-4",
  )}
>
  {#if !hasSysupgrade}
    <div class={cn("glass", "rounded-xl", "p-4", "shrink-0")}>
      <p class={cn("text-xs", "text-danger")}>
        {trans(
          "Sorry, there is no sysupgrade support present; a new firmware image must be flashed manually.",
        )}
      </p>
    </div>
  {/if}

  <div class={cn("glass", "rounded-xl", "p-4", "shrink-0")}>
    <h2 class={cn("text-sm", "font-semibold", "text-white", "mb-1")}>
      {trans("Backup")}
    </h2>
    <p class={cn("text-xs", "text-muted", "mb-3")}>
      {trans(
        'Click "Generate archive" to download a tar archive of the current configuration files.',
      )}
    </p>
    <div class={cn("flex", "items-center", "gap-3")}>
      <span class={cn("text-xs", "text-fg")}>{trans("Download backup")}</span>
      <button onclick={onBackup} class={btnCls}
        ><Download size={12} class={cn("inline", "mr-1.5")} />{trans(
          "Generate archive",
        )}</button
      >
    </div>
  </div>

  <div class={cn("glass", "rounded-xl", "p-4", "shrink-0")}>
    <h2 class={cn("text-sm", "font-semibold", "text-white", "mb-1")}>
      {trans("Restore")}
    </h2>
    <p class={cn("text-xs", "text-muted", "mb-3")}>
      {trans(
        "To restore configuration files, you can upload a previously generated backup archive here.",
      )}
    </p>
    <div class={cn("flex", "items-center", "gap-3", "mb-2")}>
      <span class={cn("text-xs", "text-fg", "shrink-0")}
        >{trans("Restore backup")}</span
      >
      <input
        type="file"
        accept=".tar.gz,.tgz"
        onchange={onRestoreUpload}
        class={cn(
          "text-xs",
          "text-muted",
          "file:mr-3 file:py-1 file:px-3 file:rounded-lg file:text-xs file:font-medium",
          "file:border file:border-accent/20 file:bg-accent/8 file:text-accent",
          "file:cursor-pointer file:transition-all file:duration-150",
          "hover:file:bg-accent/15",
        )}
      />
      {#if restoreLoading}<span class={cn("text-xs", "text-muted")}
          >{trans("Checking archive…")}</span
        >{/if}
    </div>
    {#if restoreErr}<p class={cn("text-xs", "text-danger", "mb-2")}>
        ✗ {restoreErr}
      </p>{/if}
    <p class={cn("text-xs", "text-muted", "mb-3")}>
      {trans(
        "Custom files (certificates, scripts) may remain on the system. To prevent this, perform a factory-reset first.",
      )}
    </p>
    <button
      onclick={onReset}
      class={cn(
        "px-3 py-1.5 rounded-lg text-xs font-medium border bg-danger/10 text-danger border-danger/20 transition-all duration-150 cursor-pointer hover:bg-danger/20",
      )}
    >
      <Trash2 size={12} class={cn("inline", "mr-1.5")} />{trans(
        "Perform reset",
      )}
    </button>
  </div>

  {#if mtdblocks.length}
    <div class={cn("glass", "rounded-xl", "p-4", "shrink-0")}>
      <h2 class={cn("text-sm", "font-semibold", "text-white", "mb-1")}>
        {trans("Save mtdblock contents")}
      </h2>
      <p class={cn("text-xs", "text-muted", "mb-3")}>
        {trans(
          'Click "Save mtdblock" to download specified mtdblock file. (NOTE: THIS FEATURE IS FOR PROFESSIONALS!)',
        )}
      </p>
      <div class={cn("flex", "items-center", "gap-3")}>
        <Select
          options={mtdblocks.map((b) => ({
            value: b.id,
            label: `${b.name} (mtd${b.id})`,
          }))}
          bind:value={selectedMtd}
        />
        <span class={cn("text-xs", "text-fg")}
          >{trans("Download mtdblock")}</span
        >
        <button onclick={() => onMtdDownload(selectedMtd)} class={btnCls}
          ><Download size={12} class={cn("inline", "mr-1.5")} />{trans(
            "Save mtdblock",
          )}</button
        >
      </div>
    </div>
  {/if}

  <div class={cn("glass", "rounded-xl", "p-4", "shrink-0")}>
    <h2 class={cn("text-sm", "font-semibold", "text-white", "mb-1")}>
      {trans("Flash new firmware image")}
    </h2>
    <p class={cn("text-xs", "text-muted", "mb-3")}>
      {trans(
        "Upload a sysupgrade-compatible image here to replace the running firmware.",
      )}
    </p>
    <div class={cn("flex", "items-center", "gap-3")}>
      <span class={cn("text-xs", "text-fg", "shrink-0")}>{trans("Image")}</span>
      <input
        type="file"
        accept=".bin,.img"
        onchange={onFlashUpload}
        class={cn(
          "text-xs",
          "text-muted",
          "file:mr-3 file:py-1 file:px-3 file:rounded-lg file:text-xs file:font-medium",
          "file:border file:border-accent/20 file:bg-accent/8 file:text-accent",
          "file:cursor-pointer file:transition-all file:duration-150",
          "hover:file:bg-accent/15",
        )}
      />
      {#if flashUploading}<span class={cn("text-xs", "text-muted")}
          >{trans("Checking image…")}</span
        >{/if}
    </div>
  </div>
</div>
