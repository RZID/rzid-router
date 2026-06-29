<script lang="ts">
  import { List, Save } from "@lucide/svelte";
  import { cn } from "../../helpers/classname";
  import { readFile, writeFile, execCommand } from "../../api/ubus";

  let {
    trans,
    onfeedback,
  }: {
    trans: (k: string) => string;
    onfeedback: (msg: string, type: "success" | "error") => void;
  } = $props();

  let configContent = $state("");
  let configOriginal = $state("");
  let configLoading = $state(true);
  let configSaving = $state(false);
  let backupFileList = $state("");
  let backupListLoading = $state(false);

  const loadConfig = async () => {
    configLoading = true;
    const conf = await readFile("/etc/sysupgrade.conf");
    configContent = conf?.data ?? "";
    configOriginal = configContent;
    configLoading = false;
  };

  const saveConfig = async () => {
    configSaving = true;
    try {
      const value = configContent.trim().replace(/\r\n/g, "\n") + "\n";
      await writeFile("/etc/sysupgrade.conf", value);
      configContent = value;
      configOriginal = value;
      onfeedback("saved", "success");
    } catch {
      onfeedback("error", "error");
    }
    configSaving = false;
  };

  const showBackupList = async () => {
    backupListLoading = true;
    const res = await execCommand("/sbin/sysupgrade", ["--list-backup"]);
    backupFileList = res?.stdout?.trim() ?? "";
    backupListLoading = false;
  };

  $effect(() => {
    loadConfig();
  });
</script>

<div
  class={cn(
    "flex-1",
    "min-h-0",
    "rounded-xl",
    "overflow-hidden",
    "flex",
    "flex-col",
  )}
>
  <div class={cn("glass", "rounded-xl", "h-full", "flex", "flex-col")}>
    <div class={cn("shrink-0", "p-4", "border-b", "border-border")}>
      <h2 class={cn("text-sm", "font-semibold", "text-white")}>
        {trans("Configuration")}
      </h2>
      <p class={cn("text-xs", "text-muted", "mt-1")}>
        {trans(
          "This is a list of shell glob patterns for matching files and directories to include during sysupgrade.",
        )}
      </p>
    </div>
    <div
      class={cn(
        "shrink-0",
        "p-3",
        "border-b",
        "border-border",
        "flex",
        "items-center",
        "gap-3",
      )}
    >
      <button
        onclick={showBackupList}
        disabled={backupListLoading}
        class={cn(
          "px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-surface-2 text-muted transition-all duration-150 cursor-pointer hover:bg-surface-3 hover:text-fg",
        )}
      >
        <List size={12} class={cn("inline", "mr-1.5")} />{trans(
          "Show current backup file list",
        )}
      </button>
    </div>
    {#if backupFileList}
      <div
        class={cn(
          "shrink-0",
          "mx-3",
          "mb-2",
          "p-3",
          "rounded-lg",
          "bg-surface-2",
          "border",
          "border-border",
          "max-h-40",
          "overflow-y-auto",
        )}
      >
        <p class={cn("text-xs", "text-muted", "mb-2")}>
          {trans("Below is the determined list of files to backup.")}
        </p>
        <ul class={cn("space-y-0.5")}>
          {#each backupFileList.split("\n") as line}<li
              class={cn(
                "text-[10px]",
                "font-mono",
                "text-muted",
                "leading-relaxed",
              )}
            >
              {line}
            </li>{/each}
        </ul>
      </div>
    {/if}
    <div class={cn("flex-1", "min-h-0", "relative")}>
      {#if configLoading}
        <div
          class={cn(
            "absolute",
            "inset-0",
            "flex",
            "items-center",
            "justify-center",
          )}
        >
          <div
            class={cn(
              "w-8",
              "h-8",
              "rounded-lg",
              "bg-surface-3",
              "animate-pulse",
            )}
          ></div>
        </div>
      {:else}
        <textarea
          bind:value={configContent}
          class={cn(
            "w-full h-full p-4 font-mono text-xs leading-relaxed bg-transparent text-fg outline-none resize-none placeholder:text-muted/30 whitespace-pre break-normal",
          )}
        ></textarea>
      {/if}
    </div>
    <div
      class={cn(
        "shrink-0",
        "p-3",
        "border-t",
        "border-border",
        "flex",
        "items-center",
        "justify-between",
      )}
    >
      <div>
        {#if configContent !== configOriginal}
          <span class={cn("text-xs", "text-warn")}
            >{trans("Unsaved changes")}</span
          >
        {:else}
          <span class={cn("text-xs", "text-muted")}>{trans("No changes")}</span>
        {/if}
      </div>
      <button
        onclick={saveConfig}
        disabled={configContent === configOriginal || configSaving}
        class={cn(
          "px-3 py-1.5 rounded-lg text-xs font-medium border bg-accent/10 text-accent border-accent/20 transition-all duration-150 cursor-pointer hover:bg-accent/15 hover:border-accent/30 disabled:opacity-30 disabled:cursor-not-allowed",
          configSaving && "animate-pulse",
        )}
      >
        <Save size={12} class={cn("inline", "mr-1.5")} />{configSaving
          ? trans("Saving…")
          : trans("Save")}
      </button>
    </div>
  </div>
</div>
