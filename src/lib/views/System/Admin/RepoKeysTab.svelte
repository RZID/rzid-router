<script lang="ts">
  import { Lock, RotateCw, Plus, Trash2 } from "@lucide/svelte";
  import { cn } from "../../../helpers/classname";
  import Textarea from "../../../components/Textarea/Textarea.svelte";
  import {
    readFile,
    writeFile,
    listDir,
    removeFile,
    statFile,
    execCommand,
  } from "../../../api/ubus";

  let { trans }: { trans: (k: string) => string } = $props();
  let showFeedback = $state<(msg: string, type: "success" | "error") => void>(
    () => {},
  );

  type RepoKey = { filename: string; key: string; protected: boolean };
  const SAFE_KEYS = ["d310c6f2833e97f7", "openwrt-snapshots.pem"];

  let saving = $state(false);
  let apkMode = $state(false);
  let repoKeys = $state<RepoKey[]>([]);
  let repoKeysLoading = $state(true);
  let newRepoKeyInput = $state("");

  const isPemFormat = (s: string) =>
    /-BEGIN\s+([A-Z]+\s+)?PUBLIC\s+KEY-/.test(s);
  const isSafeKey = (filename: string) => {
    for (const safe of SAFE_KEYS) {
      if (filename === safe) return true;
      const lower = filename.toLowerCase();
      if (lower.replace(/^openwrt-\d+\.\d+/i, "") !== lower) return true;
      if (lower.replace(/^openwrt-snapshots/i, "") !== lower) return true;
    }
    return false;
  };
  const detectKeyEnv = async () => {
    const stat = await statFile("/etc/apk/keys");
    if (stat) {
      apkMode = true;
      return "/etc/apk/keys/";
    }
    apkMode = false;
    return "/etc/opkg/keys/";
  };

  const loadRepoKeys = async () => {
    repoKeysLoading = true;
    try {
      const keyDir = await detectKeyEnv();
      const entries = (await listDir(keyDir))?.entries || [];
      const keys: RepoKey[] = [];
      for (const e of entries) {
        if (e.type !== "file") continue;
        const content = await readFile(keyDir + e.name);
        keys.push({
          filename: e.name,
          key: content?.data || "",
          protected: isSafeKey(e.name),
        });
      }
      repoKeys = keys;
    } catch {
      repoKeys = [];
    }
    repoKeysLoading = false;
  };

  const addRepoKey = async () => {
    const key = newRepoKeyInput.trim();
    if (!key) return;
    if (/^https?:\/\/\S+$/i.test(key)) {
      saving = true;
      try {
        const res = await fetch(key);
        if (!res.ok) {
          saving = false;
          return;
        }
        const text = await res.text();
        const trimmed = text.trim();
        if (trimmed.length < 32 || trimmed.length > 8192) {
          saving = false;
          return;
        }
        newRepoKeyInput = trimmed;
        await addRepoKey();
        newRepoKeyInput = "";
      } catch {
        /* ignore */
      }
      saving = false;
      return;
    }
    const isPem = isPemFormat(key);
    if (apkMode && !isPem) return;
    if (!apkMode && isPem) return;
    const normalized = key.replace(/\s+/g, " ").trim();
    if (repoKeys.some((k) => k.key.replace(/\s+/g, " ").trim() === normalized))
      return;
    saving = true;
    const keyDir = apkMode ? "/etc/apk/keys/" : "/etc/opkg/keys/";
    const ext = apkMode ? ".pem" : "";
    const ok = await writeFile(
      keyDir + `key_${Date.now()}${ext}`,
      key + "\n",
      384,
    );
    if (ok) {
      newRepoKeyInput = "";
      await loadRepoKeys();
    }
    saving = false;
  };

  const deleteRepoKey = async (k: RepoKey) => {
    if (k.protected) return;
    saving = true;
    const keyDir = apkMode ? "/etc/apk/keys/" : "/etc/opkg/keys/";
    await removeFile(keyDir + k.filename);
    await loadRepoKeys();
    saving = false;
  };

  $effect(() => {
    loadRepoKeys();
  });
</script>

<div class={cn("space-y-4", "max-w-2xl")}>
  <div class={cn("glass", "p-5", "animate-slide-up")}>
    <div class={cn("flex", "items-center", "gap-2", "mb-4")}>
      <Lock size={14} class={cn("text-accent")} />
      <span
        class={cn(
          "inline-flex items-center gap-1.5 text-[10px] uppercase text-muted font-semibold tracking-wider mb-1.5",
        )}>{trans("Repository Public Keys")}</span
      >
      {#if !repoKeysLoading}
        <span
          class={cn(
            "ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border",
            repoKeys.length > 0
              ? "text-accent bg-accent/10 border-accent/20"
              : "text-muted bg-surface-3 border-border",
          )}
        >
          <span
            class={cn(
              "w-1.5 h-1.5 rounded-full",
              repoKeys.length > 0 ? "bg-accent" : "bg-muted",
            )}
          ></span>
          {repoKeys.length}
          {trans(repoKeys.length === 1 ? "key" : "keys")}
        </span>
      {/if}
    </div>
    <p class={cn("text-[10px]", "text-muted", "mb-4")}>
      {trans(
        "Each software repository public key allows packages signed by it to be installed.",
      )}<br />{trans("Stored in")}<code
        class={cn("text-accent bg-accent/5 px-1 rounded")}
        >{apkMode ? "/etc/apk/keys/" : "/etc/opkg/keys/"}</code
      >
    </p>
    {#if repoKeysLoading}
      <div class={cn("flex", "items-center", "justify-center", "py-12")}>
        <RotateCw size={20} class={cn("text-muted animate-spin")} />
      </div>
    {:else}
      {#if repoKeys.length === 0}
        <div class={cn("py-8", "text-center", "text-xs", "text-muted")}>
          {trans("No repository keys installed.")}
        </div>
      {:else}
        <div class={cn("space-y-2", "mb-4")}>
          {#each repoKeys as k}
            <div
              class={cn(
                "group flex items-start gap-3 p-3 rounded-lg border border-border",
                "bg-surface-1 transition-all duration-150",
                k.protected ? "opacity-60" : "",
              )}
            >
              <div
                class={cn(
                  "shrink-0 w-8 h-8 flex items-center justify-center rounded text-[9px] font-bold",
                  k.protected
                    ? "bg-surface-3 text-muted border border-border"
                    : "bg-accent/10 text-accent border border-accent/20",
                )}
              >
                <Lock size={12} />
              </div>
              <div class={cn("flex-1", "min-w-0")}>
                <div class={cn("flex", "items-center", "gap-2")}>
                  <span class={cn("text-xs", "font-medium", "text-white")}
                    >{k.filename}</span
                  >
                  {#if k.protected}<span
                      class={cn(
                        "text-[9px]",
                        "px-1.5",
                        "py-0.5",
                        "rounded",
                        "bg-surface-3",
                        "text-muted",
                        "border",
                        "border-border",
                      )}>{trans("Protected")}</span
                    >{/if}
                </div>
                <code
                  class={cn(
                    "block",
                    "text-[10px]",
                    "text-muted/60",
                    "mt-1",
                    "truncate",
                  )}
                  >{k.key.substring(0, 80)}{k.key.length > 80 ? "…" : ""}</code
                >
              </div>
              {#if !k.protected}
                <button
                  onclick={() => deleteRepoKey(k)}
                  disabled={saving}
                  class={cn(
                    "shrink-0 p-1.5 rounded-md transition-all duration-150",
                    "opacity-0 group-hover:opacity-100 focus:opacity-100",
                    "text-muted hover:text-danger hover:bg-danger/10",
                  )}
                  title={trans("Delete key")}><Trash2 size={13} /></button
                >
              {/if}
            </div>
          {/each}
        </div>
      {/if}
      <div class={cn("border-t", "border-border", "pt-4")}>
        <p class={cn("text-[10px]", "text-muted", "mb-2")}>
          {trans(
            "Add new repository public key by pasting its content or a URL.",
          )}
        </p>
        <div class={cn("flex", "items-start", "gap-2")}>
          <Textarea
            bind:value={newRepoKeyInput}
            rows={3}
            placeholder={trans("Paste key content or URL…")}
            class={cn("flex-1", "font-mono")}
          />
          <button
            onclick={addRepoKey}
            disabled={saving || !newRepoKeyInput.trim()}
            class={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium transition-all duration-150 cursor-pointer select-none",
              saving || !newRepoKeyInput.trim()
                ? "border text-muted bg-surface-3 border-transparent cursor-not-allowed"
                : "border text-accent bg-accent/10 border-accent/20",
            )}
          >
            {#if saving}<RotateCw
                size={12}
                class={cn("animate-spin")}
              />{:else}<Plus size={12} />{/if}{trans("Add key")}
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>
