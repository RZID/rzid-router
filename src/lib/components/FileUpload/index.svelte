<script lang="ts">
  import { onMount } from "svelte";
  import { FolderOpen, Upload, Trash2, Download } from "@lucide/svelte";
  import { cn } from "../../helpers/classname";
  import { listDir, readFile, writeFile, removeFile } from "../../api/ubus";

  let {
    label = "",
    value = $bindable(""),
    rootDir = "/usr/lib/ddns",
    class: className = "",
    onchange,
  }: {
    label?: string;
    value?: string;
    rootDir?: string;
    class?: string;
    onchange?: () => void;
  } = $props();

  let files = $state<string[]>([]);
  let loading = $state(true);
  let open = $state(false);
  let uploadName = $state("");
  let uploadContent = $state("");
  let uploadStatus = $state("");
  let focused = $state(false);
  let listboxEl: HTMLDivElement | undefined = $state();

  onMount(async () => { await refresh(); });

  async function refresh() {
    loading = true;
    const res = await listDir(rootDir).catch(() => null);
    if (res?.entries) {
      files = res.entries.map((e) => e.name).filter((n) => n.endsWith(".sh") || !n.includes(".")).sort();
    }
    loading = false;
  }

  function toggle() { if (!loading) open = !open; }
  function close() { if (open) open = false; }
  function select(f: string) { value = f; close(); onchange?.(); }

  async function handleUpload() {
    if (!uploadName) return;
    uploadStatus = "Uploading...";
    const res = await writeFile(`${rootDir}/${uploadName}`, uploadContent).catch(() => null);
    if (res) { uploadStatus = "Uploaded"; uploadName = ""; uploadContent = ""; await refresh(); }
    else uploadStatus = "Failed";
    setTimeout(() => { uploadStatus = ""; }, 2000);
  }

  async function handleRemove(f: string) {
    await removeFile(`${rootDir}/${f}`);
    if (value === f) value = "";
    await refresh();
    onchange?.();
  }

  async function handleDownload(f: string) {
    const res = await readFile(`${rootDir}/${f}`);
    if (res?.data) {
      const blob = new Blob([res.data], { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = f;
      a.click();
      URL.revokeObjectURL(a.href);
    }
  }
</script>

<svelte:window onclick={close} />

<div>
  {#if label}
    <span class={cn("block", "text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider", "mb-1.5")}>{label}</span>
  {/if}
  <div class={cn("relative")}>
    <div class={cn("flex", "gap-1")}>
      <button
        type="button"
        onclick={toggle}
        onfocus={() => (focused = true)}
        onblur={() => (focused = false)}
        class={cn(
          "flex-1", "px-2.5", "py-1.5", "border", "text-xs", "text-left", "rounded-md", "bg-surface", "outline-none",
          "transition-all", "duration-150", "flex", "items-center", "gap-1.5",
          focused ? cn("border-(--accent)", "shadow-[0_0_0_1px_var(--accent)]") : cn("border-border", "hover:border-white/30"),
          className,
        )}
      >
        <FolderOpen size={12} class="text-muted" />
        <span class={cn("flex-1", "truncate", "font-mono", value ? "text-fg" : "text-muted")}>
          {value || "Browse..."}
        </span>
      </button>
      {#if value}
        <button
          type="button"
          onclick={() => handleDownload(value)}
          title="Download"
          class={cn("p-1.5", "rounded", "border", "border-border", "text-muted", "hover:text-fg", "hover:bg-white/5", "cursor-pointer", "transition-colors")}
        ><Download size={12} /></button>
        <button
          type="button"
          onclick={() => handleRemove(value)}
          title="Remove"
          class={cn("p-1.5", "rounded", "border", "border-border", "text-danger", "hover:bg-danger/20", "cursor-pointer", "transition-colors")}
        ><Trash2 size={12} /></button>
      {/if}
    </div>

    {#if open}
      <div bind:this={listboxEl} class={cn("z-[9999]", "mt-1", "border", "rounded-lg", "bg-surface-2", "border-border", "shadow-lg", "overflow-hidden", "absolute", "w-full")}>
        <div class={cn("p-2", "border-b", "border-border", "space-y-1.5")}>
          <input
            type="text"
            placeholder="New file name..."
            bind:value={uploadName}
            class={cn("w-full", "px-2", "py-1", "border", "text-xs", "text-fg", "rounded-md", "bg-surface", "border-border", "outline-none", "font-mono")}
          />
          <textarea
            placeholder="File content (paste here)..."
            bind:value={uploadContent}
            rows={2}
            class={cn("w-full", "px-2", "py-1", "border", "text-xs", "text-fg", "rounded-md", "bg-surface", "border-border", "outline-none", "font-mono", "resize-none")}
          ></textarea>
          <div class={cn("flex", "items-center", "gap-1")}>
            <button
              type="button"
              onclick={handleUpload}
              disabled={!uploadName}
              class={cn("px-2", "py-1", "text-[10px]", "rounded", "bg-accent/10", "text-accent", "border", "border-accent/20", "font-medium", "cursor-pointer", "hover:bg-accent/20", "transition-colors", "disabled:opacity-30")}
            ><Upload size={10} /> Upload</button>
            {#if uploadStatus}
              <span class={cn("text-[10px]", "font-mono", uploadStatus === "Failed" ? "text-danger" : "text-accent")}>{uploadStatus}</span>
            {/if}
          </div>
        </div>
        <div class={cn("overflow-y-auto", "max-h-48")}>
          {#if loading}
            <div class={cn("px-3", "py-2", "text-xs", "text-muted")}>Loading...</div>
          {:else if files.length === 0}
            <div class={cn("px-3", "py-2", "text-xs", "text-muted")}>No files</div>
          {:else}
            {#each files as f}
              <button
                type="button"
                onclick={() => select(f)}
                class={cn("w-full", "px-3", "py-1.5", "text-xs", "text-left", "font-mono", "transition-colors", "cursor-pointer",
                  f === value ? "bg-accent/15 text-fg font-semibold" : "hover:bg-white/5 text-fg")}
              >{f}</button>
            {/each}
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>
