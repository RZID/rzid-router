<script lang="ts">
  // Deps
  import { onMount } from "svelte";
  import { FolderOpen, Upload, Trash2, Download } from "@lucide/svelte";

  // Helpers
  import { cn } from "../../helpers/classname";

  // APIs
  import { listDir, readFile, writeFile, removeFile } from "../../api/ubus";

  // Types
  import type { Props } from "./types";

  // Props
  let {
    label = "",
    value = $bindable(""),
    rootDir = "/usr/lib/ddns",
    class: className = "",
    onchange,
  }: Props = $props();

  // States
  let files = $state<string[]>([]),
    loading = $state(true),
    open = $state(false),
    uploadName = $state(""),
    uploadContent = $state(""),
    uploadStatus = $state(""),
    focused = $state(false),
    listboxEl: HTMLDivElement | undefined = $state();

  // Hooks
  onMount(async () => {
    await refresh();
  });

  // Methods
  const refresh = async () => {
      loading = true;
      const res = await listDir(rootDir).catch(() => null);
      if (res?.entries) {
        files = res.entries
          .map((e) => e.name)
          .filter((n) => n.endsWith(".sh") || !n.includes("."))
          .sort();
      }
      loading = false;
    },
    toggle = () => {
      if (!loading) open = !open;
    },
    close = () => {
      if (open) open = false;
    },
    select = (f: string) => {
      value = f;
      close();
      onchange?.();
    },
    handleUpload = async () => {
      if (!uploadName) return;
      uploadStatus = "Uploading...";
      const res = await writeFile(
        `${rootDir}/${uploadName}`,
        uploadContent,
      ).catch(() => null);
      if (res) {
        uploadStatus = "Uploaded";
        uploadName = "";
        uploadContent = "";
        await refresh();
      } else uploadStatus = "Failed";
      setTimeout(() => {
        uploadStatus = "";
      }, 2000);
    },
    handleRemove = async (f: string) => {
      await removeFile(`${rootDir}/${f}`);
      if (value === f) value = "";
      await refresh();
      onchange?.();
    },
    handleDownload = async (f: string) => {
      const res = await readFile(`${rootDir}/${f}`);
      if (res?.data) {
        const blob = new Blob([res.data], { type: "text/plain" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = f;
        a.click();
        URL.revokeObjectURL(a.href);
      }
    };
</script>

<svelte:window onclick={close} />

<div>
  {#if label}
    <span
      class={cn(
        "block",
        "mb-1.5",
        "uppercase",
        "text-muted",
        "text-[10px]",
        "font-semibold",
        "tracking-wider",
      )}
    >
      {label}
    </span>
  {/if}
  <div class={cn("relative")}>
    <div class={cn("flex", "gap-1")}>
      <button
        type="button"
        onclick={toggle}
        onfocus={() => (focused = true)}
        onblur={() => (focused = false)}
        class={cn(
          "flex",
          "flex-1",
          "px-2.5",
          "py-1.5",
          "border",
          "gap-1.5",
          "text-xs",
          "text-left",
          "rounded-md",
          "bg-surface",
          "outline-none",
          "duration-150",
          "items-center",
          "transition-all",
          focused
            ? cn("border-(--accent)", "shadow-[0_0_0_1px_var(--accent)]")
            : cn("border-border", "hover:border-white/30"),
          className,
        )}
      >
        <FolderOpen size={12} class={cn("text-muted")} />
        <span
          class={cn(
            "flex-1",
            "truncate",
            "font-mono",
            value ? "text-fg" : "text-muted",
          )}
        >
          {value || "Browse..."}
        </span>
      </button>
      {#if value}
        <button
          type="button"
          onclick={() => handleDownload(value)}
          title="Download"
          class={cn(
            "p-1.5",
            "border",
            "rounded",
            "text-muted",
            "hover:text-fg",
            "cursor-pointer",
            "border-border",
            "transition-colors",
            "hover:bg-white/5",
          )}
        >
          <Download size={12} />
        </button>
        <button
          type="button"
          onclick={() => handleRemove(value)}
          title="Remove"
          class={cn(
            "p-1.5",
            "border",
            "rounded",
            "text-danger",
            "cursor-pointer",
            "border-border",
            "transition-colors",
            "hover:bg-danger/20",
          )}
        >
          <Trash2 size={12} />
        </button>
      {/if}
    </div>

    {#if open}
      <div
        bind:this={listboxEl}
        class={cn(
          "mt-1",
          "z-9999",
          "border",
          "w-full",
          "absolute",
          "shadow-lg",
          "rounded-lg",
          "bg-surface-2",
          "border-border",
          "overflow-hidden",
        )}
      >
        <div class={cn("p-2", "border-b", "border-border", "space-y-1.5")}>
          <input
            type="text"
            placeholder="New file name..."
            bind:value={uploadName}
            class={cn(
              "px-2",
              "py-1",
              "w-full",
              "border",
              "text-xs",
              "text-fg",
              "font-mono",
              "rounded-md",
              "bg-surface",
              "outline-none",
              "border-border",
            )}
          />
          <textarea
            placeholder="File content (paste here)..."
            bind:value={uploadContent}
            rows={2}
            class={cn(
              "px-2",
              "py-1",
              "w-full",
              "border",
              "text-xs",
              "text-fg",
              "font-mono",
              "rounded-md",
              "resize-none",
              "bg-surface",
              "outline-none",
              "border-border",
            )}
          ></textarea>
          <div class={cn("flex", "items-center", "gap-1")}>
            <button
              type="button"
              onclick={handleUpload}
              disabled={!uploadName}
              class={cn(
                "px-2",
                "py-1",
                "border",
                "rounded",
                "text-[10px]",
                "font-medium",
                "text-accent",
                "bg-accent/10",
                "cursor-pointer",
                "transition-colors",
                "border-accent/20",
                "disabled:opacity-30",
                "hover:bg-accent/20",
              )}
            >
              <Upload size={10} />
              Upload
            </button>
            {#if uploadStatus}
              <span
                class={cn(
                  "text-[10px]",
                  "font-mono",
                  uploadStatus === "Failed" ? "text-danger" : "text-accent",
                )}
              >
                {uploadStatus}
              </span>
            {/if}
          </div>
        </div>
        <div class={cn("overflow-y-auto", "max-h-48")}>
          {#if loading}
            <div class={cn("px-3", "py-2", "text-xs", "text-muted")}>
              Loading...
            </div>
          {:else if files.length === 0}
            <div class={cn("px-3", "py-2", "text-xs", "text-muted")}>
              No files
            </div>
          {:else}
            {#each files as f}
              <button
                type="button"
                onclick={() => select(f)}
                class={cn(
                  "px-3",
                  "w-full",
                  "py-1.5",
                  "text-xs",
                  "text-left",
                  "font-mono",
                  "cursor-pointer",
                  "transition-colors",
                  f === value
                    ? cn("bg-accent/15", "text-fg", "font-semibold")
                    : cn("hover:bg-white/5", "text-fg"),
                )}>{f}</button
              >
            {/each}
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>
