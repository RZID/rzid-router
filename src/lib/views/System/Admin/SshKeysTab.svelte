<script lang="ts">
  import { Terminal, RotateCw, Plus, Trash2 } from "@lucide/svelte";
  import { cn } from "../../../helpers/classname";
  import { readFile, writeFile } from "../../../api/ubus";
  import type { ParsedKey } from "./types";

  let { trans }: { trans: (k: string) => string } = $props();

  let saving = $state(false);
  let parsedKeys = $state<ParsedKey[]>([]);
  let sshKeysLoading = $state(true);
  let sshAddInput = $state("");

  const lengthDecode = (s: string, off: number) => {
    const l =
      (s.charCodeAt(off) << 24) |
      (s.charCodeAt(off + 1) << 16) |
      (s.charCodeAt(off + 2) << 8) |
      s.charCodeAt(off + 3);
    if (l < 0 || off + 4 + l > s.length) return -1;
    return l;
  };

  const decodePubkey = (s: string): ParsedKey | null => {
    const parts = s
      .trim()
      .match(
        /^((?:(?:^|,)[^ =,]+(?:=(?:[^ ",]+|"(?:[^"\\]|\\.)*"))?)+ +)?(ssh-dss|ssh-rsa|ssh-ed25519|ecdsa-sha2-nistp[0-9]+|sk-ecdsa-sha2-nistp256@openssh\.com|sk-ssh-ed25519@openssh\.com) +([^ ]+)( +.*)?$/,
      );
    if (!parts) return null;
    let key: string | null = null;
    try {
      key = atob(parts[3]);
    } catch {}
    if (!key) return null;
    let off = 0;
    let len = lengthDecode(key, off);
    if (len <= 0) return null;
    const type = key.substring(off + 4, off + 4 + len);
    if (type !== parts[2]) return null;
    off += 4 + len;
    let len1 = off < key.length ? lengthDecode(key, off) : 0;
    if (len1 <= 0) return null;
    let curve: string | null = null,
      shortType = type;
    if (type.startsWith("ecdsa-sha2-")) {
      curve = key.substring(off + 4, off + 4 + len1);
      if (!len1 || type.substring(11) !== curve) return null;
      shortType = "ecdsa-sha2";
      curve = curve.replace(/^nistp(\d+)$/, "NIST P-$1");
    }
    off += 4 + len1;
    const len2 = off < key.length ? lengthDecode(key, off) : 0;
    if (len2 < 0) return null;
    const comment = (parts[4] || "").trim();
    const fprint =
      parts[3].length > 68
        ? parts[3].substring(0, 33) +
          "…" +
          parts[3].substring(parts[3].length - 34)
        : parts[3];
    const opt: Record<string, string> = {};
    (parts[1] || "")
      .trim()
      .replace(
        /(?:^|,)([^ =,]+)(?:=(?:([^ ",]+)|"((?:[^"\\]|\\.)*)"))?/g,
        (_m: string, k: string, p?: string, q?: string) => {
          opt[k] = q || p || "true";
          return "";
        },
      );
    const labels: Record<
      string,
      { type: string; bits?: number; curve?: string }
    > = {
      "ssh-rsa": { type: "RSA", bits: len2 * 8 },
      "ssh-dss": { type: "DSA", bits: len1 * 8 },
      "ssh-ed25519": { type: "EdDSA", curve: "Curve25519" },
      "ecdsa-sha2": { type: "ECDSA", curve: curve || undefined },
      "sk-ecdsa-sha2-nistp256@openssh.com": {
        type: "ECDSA-SK",
        curve: "NIST P-256",
      },
      "sk-ssh-ed25519@openssh.com": { type: "EdDSA-SK", curve: "Curve25519" },
    };
    return {
      ...(labels[shortType] || { type: shortType }),
      comment,
      fprint,
      src: s,
      options: Object.keys(opt).length ? opt : null,
    };
  };

  const loadSshKeys = async () => {
    sshKeysLoading = true;
    const res = await readFile("/etc/dropbear/authorized_keys");
    parsedKeys = (res?.data || "")
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => decodePubkey(l))
      .filter(Boolean) as ParsedKey[];
    sshKeysLoading = false;
  };

  const addSshKey = async () => {
    const raw = sshAddInput.trim();
    if (!raw) return;
    const pk = decodePubkey(raw);
    if (!pk) return;
    saving = true;
    await writeFile(
      "/etc/dropbear/authorized_keys",
      [...parsedKeys.map((k) => k.src), raw].join("\n") + "\n",
      384,
    );
    sshAddInput = "";
    await loadSshKeys();
    saving = false;
  };

  const deleteSshKey = async (k: ParsedKey) => {
    saving = true;
    await writeFile(
      "/etc/dropbear/authorized_keys",
      parsedKeys
        .filter((x) => x.fprint !== k.fprint)
        .map((x) => x.src)
        .join("\n") + "\n",
      384,
    );
    await loadSshKeys();
    saving = false;
  };

  const keyTypeIcon = (t: string) => {
    if (t === "RSA") return "RSA";
    if (t === "EdDSA" || t === "EdDSA-SK") return "Ed";
    if (t?.startsWith("ECDSA")) return "EC";
    return t?.substring(0, 3) || "KEY";
  };

  $effect(() => {
    loadSshKeys();
  });
</script>

<div class={cn("space-y-4", "max-w-2xl")}>
  <div class={cn("glass", "p-5", "animate-slide-up")}>
    <div class={cn("flex", "items-center", "gap-2", "mb-4")}>
      <Terminal size={14} class={cn("text-accent")} />
      <span
        class={cn(
          "inline-flex items-center gap-1.5 text-[10px] uppercase text-muted font-semibold tracking-wider mb-1.5",
        )}>{trans("SSH Public Keys")}</span
      >
      {#if !sshKeysLoading}
        <span
          class={cn(
            "ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border",
            parsedKeys.length > 0
              ? "text-accent bg-accent/10 border-accent/20"
              : "text-muted bg-surface-3 border-border",
          )}
        >
          <span
            class={cn(
              "w-1.5 h-1.5 rounded-full",
              parsedKeys.length > 0 ? "bg-accent" : "bg-muted",
            )}
          ></span>
          {parsedKeys.length}
          {trans(parsedKeys.length === 1 ? "key" : "keys")}
        </span>
      {/if}
    </div>
    <p class={cn("text-[10px]", "text-muted", "mb-4")}>
      {trans(
        "Public keys allow passwordless SSH logins. Paste an OpenSSH public key or drag a .pub file.",
      )}
    </p>
    {#if sshKeysLoading}
      <div class={cn("flex", "items-center", "justify-center", "py-12")}>
        <RotateCw size={20} class={cn("text-muted animate-spin")} />
      </div>
    {:else}
      {#if parsedKeys.length === 0}
        <div class={cn("py-8", "text-center", "text-xs", "text-muted")}>
          {trans("No public keys present yet.")}
        </div>
      {:else}
        <div class={cn("space-y-2", "mb-4")}>
          {#each parsedKeys as k}
            <div
              class={cn(
                "group flex items-start gap-3 p-3 rounded-lg border border-border",
                "bg-surface-1 transition-all duration-150",
              )}
            >
              <div
                class={cn(
                  "shrink-0 w-10 h-7 flex items-center justify-center rounded text-[9px] font-bold",
                  "bg-accent/10 text-accent border border-accent/20",
                )}
              >
                {keyTypeIcon(k.type)}
              </div>
              <div class={cn("flex-1", "min-w-0")}>
                <div class={cn("flex", "items-center", "gap-2")}>
                  <span class={cn("text-xs", "font-medium", "text-white")}
                    >{k.comment || trans("Unnamed key")}</span
                  >
                </div>
                <div class={cn("text-[10px]", "text-muted", "mt-0.5")}>
                  {k.type}{k.bits ? ` ${k.bits}-bit` : ""}{k.curve
                    ? ` (${k.curve})`
                    : ""}{#if k.options}<span
                      class={cn("ml-2", "text-accent-dim")}
                    >
                      / {trans("Options:")}
                      {Object.keys(k.options).sort().join(", ")}</span
                    >{/if}
                </div>
                <code
                  class={cn(
                    "block",
                    "text-[10px]",
                    "text-muted/60",
                    "mt-0.5",
                    "truncate",
                  )}>{k.fprint}</code
                >
              </div>
              <button
                onclick={() => deleteSshKey(k)}
                disabled={saving}
                class={cn(
                  "shrink-0 p-1.5 rounded-md transition-all duration-150",
                  "opacity-0 group-hover:opacity-100 focus:opacity-100",
                  "text-muted hover:text-danger hover:bg-danger/10",
                )}
                title={trans("Delete key")}><Trash2 size={13} /></button
              >
            </div>
          {/each}
        </div>
      {/if}
      <div class={cn("border-t", "border-border", "pt-4")}>
        <div class={cn("flex", "items-center", "gap-2")}>
          <div class={cn("flex-1", "relative")}>
            <input
              type="text"
              bind:value={sshAddInput}
              placeholder={trans("Paste or drag SSH key file…")}
              class={cn(
                "w-full px-2.5 py-1.5 pr-8 border text-xs rounded-md",
                "bg-surface outline-none transition-all duration-150",
                "border-border text-fg font-mono",
                "focus:border-(--accent) focus:shadow-[0_0_0_1px_var(--accent)]",
              )}
            />
          </div>
          <button
            onclick={addSshKey}
            disabled={saving || !sshAddInput.trim()}
            class={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium transition-all duration-150 cursor-pointer select-none",
              saving || !sshAddInput.trim()
                ? "border text-muted bg-surface-3 border-transparent cursor-not-allowed"
                : "border text-accent bg-accent/10 border-accent/20",
            )}><Plus size={12} />{trans("Add key")}</button
          >
        </div>
      </div>
    {/if}
  </div>
</div>
