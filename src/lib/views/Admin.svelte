<script lang="ts">
  import { onMount } from "svelte";
  import {
    KeyRound, Terminal, Shield, Globe, RotateCw, Plus, Trash2,
    CheckCircle2, XCircle, Save, Lock, Upload, Wifi, Network,
    Server, Edit3, AlertTriangle,
  } from "@lucide/svelte";
  import Input from "../components/Input/index.svelte";
  import Toggle from "../components/Toggle/index.svelte";
  import Select from "../components/Select/index.svelte";
  import { cn } from "../helpers/classname";
  import { t as _t, getLocale, onLocaleChange } from "../i18n";
  import {
    uciGet, uciSetSection, uciCommit, uciAdd as uciAddSection,
    setPassword, readFile, writeFile, listDir, removeFile, statFile,
    execCommand,
  } from "../api/ubus";

  type RepoKey = { filename: string; key: string; protected: boolean };

  interface ParsedKey {
    type: string;
    bits?: number;
    curve?: string;
    comment: string;
    fprint: string;
    src: string;
    options: Record<string, string> | null;
  }

  interface DropbearInstance {
    name: string;
    enable: boolean;
    port: string;
    iface: string;
    passwordAuth: boolean;
    rootPasswordAuth: boolean;
    gatewayPorts: boolean;
  }

  let locale = $state(getLocale());
  let trans = $derived.by(() => { locale; return (k: string) => _t(k); });
  $effect(() => onLocaleChange(() => { locale = getLocale(); }));

  const tabIds = ["password", "sshkeys", "sshaccess", "httpaccess", "repokeys"] as const;
  type TabId = typeof tabIds[number];

  let tab = $state<TabId>("password");
  let tabDir = $state("left");
  let saving = $state(false);
  let saveFeedback = $state("");
  let feedbackType = $state<"success" | "error" | "">("");

  const tabs = [
    { id: "password" as TabId, label: "Router Password", icon: KeyRound },
    { id: "sshkeys" as TabId, label: "SSH Keys", icon: Terminal },
    { id: "sshaccess" as TabId, label: "SSH Access", icon: Shield },
    { id: "httpaccess" as TabId, label: "HTTP(S) Access", icon: Globe },
    { id: "repokeys" as TabId, label: "Repo Keys", icon: Lock },
  ];

  const SAFE_KEYS = ["d310c6f2833e97f7", "openwrt-snapshots.pem"];

  let feedbackTimer: ReturnType<typeof setTimeout>;

  const showFeedback = (msg: string, type: "success" | "error" = "success") => {
    saveFeedback = msg;
    feedbackType = type;
    clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(() => { saveFeedback = ""; feedbackType = ""; }, 3000);
  };

  const switchTab = (id: TabId) => {
    if (id === tab) return;
    tabDir = tabIds.indexOf(id) > tabIds.indexOf(tab) ? "left" : "right";
    tab = id;
  };

  // ── shared helpers ──────────────────────────────────────
  const toArray = (v: any): string[] => {
    if (Array.isArray(v)) return v;
    if (v && typeof v === "object") return Object.values(v);
    if (v) return [v];
    return [];
  };

  const btnBase = cn(
    "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium",
    "transition-all duration-150 cursor-pointer select-none",
  );

  const btnPrimary = (disabled: boolean) => cn(
    btnBase,
    disabled
      ? "border text-muted bg-surface-3 border-transparent cursor-not-allowed"
      : "border text-accent bg-accent/10 border-accent/20",
  );

  const btnGhost = cn(
    btnBase,
    "border text-muted bg-surface-2 border-border",
  );

  const sectionLabel = cn(
    "inline-flex items-center gap-1.5 text-[10px] uppercase text-muted font-semibold tracking-wider mb-1.5",
  );

  // ═══════════════════════════════════════════════════════
  //  TAB 1 — Router Password
  // ═══════════════════════════════════════════════════════
  let hasUhttpd = $state(false);
  let knownUsers = $state<string[]>(["root"]);
  let pwRpcd = $state(false);
  let pwRpcUser = $state("root");
  let pwUser = $state("root");
  let pwOld = $state("");
  let pwNew = $state("");
  let pwConfirm = $state("");

  const pwStrength = $derived.by(() => {
    const v = pwNew;
    if (!v) return { label: "", color: "" };
    if (/^(?=.{8,})(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*\W).*$/.test(v))
      return { label: "Strong", color: "var(--accent)" };
    if (/^(?=.{7,})(((?=.*[A-Z])(?=.*[a-z]))|((?=.*[A-Z])(?=.*[0-9]))|((?=.*[a-z])(?=.*[0-9]))).*$/.test(v))
      return { label: "Medium", color: "var(--warn)" };
    if (/(?=.{6,}).*/.test(v))
      return { label: "Weak", color: "var(--danger)" };
    return { label: "Too short", color: "var(--danger)" };
  });

  const savePassword = async () => {
    if (pwRpcd && !pwOld) { showFeedback("Old password required for rpcd user", "error"); return; }
    if (!pwNew) { showFeedback("New password required", "error"); return; }
    if (pwNew !== pwConfirm) { showFeedback("Passwords do not match", "error"); return; }
    saving = true;
    const user = pwRpcd ? pwRpcUser : pwUser;
    const res = await setPassword(user, pwNew, pwOld, pwRpcd);
    if (res?.result) {
      showFeedback("Password changed successfully");
      pwOld = pwNew = pwConfirm = "";
    } else {
      showFeedback("Password change failed", "error");
    }
    saving = false;
  };

  // ═══════════════════════════════════════════════════════
  //  TAB 2 — SSH Keys
  // ═══════════════════════════════════════════════════════
  let parsedKeys = $state<ParsedKey[]>([]);
  let sshKeysLoading = $state(true);
  let sshAddInput = $state("");

  const lengthDecode = (s: string, off: number) => {
    const l = (s.charCodeAt(off) << 24) | (s.charCodeAt(off + 1) << 16) |
              (s.charCodeAt(off + 2) << 8) | s.charCodeAt(off + 3);
    if (l < 0 || off + 4 + l > s.length) return -1;
    return l;
  };

  const decodePubkey = (s: string): ParsedKey | null => {
    const parts = s.trim().match(
      /^((?:(?:^|,)[^ =,]+(?:=(?:[^ ",]+|"(?:[^"\\]|\\.)*"))?)+ +)?(ssh-dss|ssh-rsa|ssh-ed25519|ecdsa-sha2-nistp[0-9]+|sk-ecdsa-sha2-nistp256@openssh\.com|sk-ssh-ed25519@openssh\.com) +([^ ]+)( +.*)?$/,
    );
    if (!parts) return null;

    let key: string | null = null;
    try { key = atob(parts[3]); } catch {}
    if (!key) return null;

    let off = 0;
    let len = lengthDecode(key, off);
    if (len <= 0) return null;
    const type = key.substring(off + 4, off + 4 + len);
    if (type !== parts[2]) return null;
    off += 4 + len;

    let len1 = off < key.length ? lengthDecode(key, off) : 0;
    if (len1 <= 0) return null;
    let curve: string | null = null;
    let shortType = type;
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
        ? parts[3].substring(0, 33) + "…" + parts[3].substring(parts[3].length - 34)
        : parts[3];

    const opt: Record<string, string> = {};
    (parts[1] || "").trim().replace(
      /(?:^|,)([^ =,]+)(?:=(?:([^ ",]+)|"((?:[^"\\]|\\.)*)"))?/g,
      (_m: string, k: string, p?: string, q?: string) => { opt[k] = q || p || "true"; return ""; },
    );

    const labels: Record<string, { type: string; bits?: number; curve?: string }> = {
      "ssh-rsa": { type: "RSA", bits: len2 * 8 },
      "ssh-dss": { type: "DSA", bits: len1 * 8 },
      "ssh-ed25519": { type: "EdDSA", curve: "Curve25519" },
      "ecdsa-sha2": { type: "ECDSA", curve: curve || undefined },
      "sk-ecdsa-sha2-nistp256@openssh.com": { type: "ECDSA-SK", curve: "NIST P-256" },
      "sk-ssh-ed25519@openssh.com": { type: "EdDSA-SK", curve: "Curve25519" },
    };
    const info = labels[shortType] || { type: shortType };
    return { ...info, comment, fprint, src: s, options: Object.keys(opt).length ? opt : null };
  };

  const loadSshKeys = async () => {
    sshKeysLoading = true;
    const res = await readFile("/etc/dropbear/authorized_keys");
    const lines = (res?.data || "").split("\n").filter(l => l.trim());
    parsedKeys = [];
    for (const line of lines) {
      const pk = decodePubkey(line);
      if (pk) parsedKeys = [...parsedKeys, pk];
    }
    sshKeysLoading = false;
  };

  const addSshKey = async () => {
    const raw = sshAddInput.trim();
    if (!raw) return;
    const pk = decodePubkey(raw);
    if (!pk) { showFeedback("Invalid SSH public key", "error"); return; }
    if (parsedKeys.some(k => k.fprint === pk.fprint)) {
      showFeedback("Key already exists", "error");
      return;
    }
    saving = true;
    const allKeys = [...parsedKeys.map(k => k.src), raw];
    const ok = await writeFile("/etc/dropbear/authorized_keys", allKeys.join("\n") + "\n", 384);
    if (ok) {
      showFeedback("Key added");
      sshAddInput = "";
      await loadSshKeys();
    } else {
      showFeedback("Failed to add key", "error");
    }
    saving = false;
  };

  const deleteSshKey = async (k: ParsedKey) => {
    saving = true;
    const allKeys = parsedKeys.filter(x => x.fprint !== k.fprint).map(x => x.src);
    const ok = await writeFile("/etc/dropbear/authorized_keys", allKeys.join("\n") + "\n", 384);
    if (ok) {
      showFeedback("Key deleted");
      await loadSshKeys();
    } else {
      showFeedback("Failed to delete key", "error");
    }
    saving = false;
  };

  // ═══════════════════════════════════════════════════════
  //  TAB 3 — SSH Access (Dropbear)
  // ═══════════════════════════════════════════════════════
  let dbInstances = $state<DropbearInstance[]>([]);

  const loadDropbearConfig = async () => {
    const cfg = await uciGet("dropbear");
    if (!cfg?.values) return;
    const sections = Object.values(cfg.values) as any[];
    dbInstances = sections
      .filter((s: any) => s[".type"] === "dropbear")
      .map((s: any) => ({
        name: s[".name"],
        enable: s.enable !== "0",
        port: s.Port || "22",
        iface: s.Interface || "",
        passwordAuth: s.PasswordAuth !== "off",
        rootPasswordAuth: s.RootPasswordAuth !== "off",
        gatewayPorts: s.GatewayPorts === "on",
      }));
  };

  const saveDropbearInstances = async () => {
    saving = true;
    for (const inst of dbInstances) {
      await uciSetSection("dropbear", inst.name, {
        enable: inst.enable ? "1" : "0",
        Port: inst.port,
        Interface: inst.iface,
        PasswordAuth: inst.passwordAuth ? "on" : "off",
        RootPasswordAuth: inst.rootPasswordAuth ? "on" : "off",
        GatewayPorts: inst.gatewayPorts ? "on" : "off",
      });
    }
    await uciCommit("dropbear");
    showFeedback("SSH access settings saved");
    saving = false;
  };

  const addDropbearInstance = async () => {
    saving = true;
    const res = await uciAddSection("dropbear", "dropbear");
    if (res && typeof res === "object" && "section" in res) {
      dbInstances = [
        ...dbInstances,
        { name: res.section as string, enable: true, port: "22", iface: "",
          passwordAuth: true, rootPasswordAuth: true, gatewayPorts: false },
      ];
    }
    saving = false;
  };

  const removeDropbearInstance = async (name: string) => {
    saving = true;
    await execCommand("/sbin/uci", ["delete", `dropbear.${name}`]);
    await execCommand("/sbin/uci", ["commit", "dropbear"]);
    dbInstances = dbInstances.filter(i => i.name !== name);
    showFeedback("Instance removed");
    saving = false;
  };

  // ═══════════════════════════════════════════════════════
  //  TAB 4 — HTTP(S) Access
  // ═══════════════════════════════════════════════════════
  let uhRedirectHttps = $state(false);
  let uhttpdSection = $state("");

  const loadUhttpdConfig = async () => {
    const cfg = await uciGet("uhttpd");
    if (!cfg?.values) return;
    const sections = Object.values(cfg.values) as any[];
    const main = sections.find((s: any) => s[".type"] === "uhttpd");
    if (!main) return;
    uhttpdSection = main[".name"];
    uhRedirectHttps = main.redirect_https === "1";
  };

  const saveUhttpdConfig = async () => {
    if (!uhttpdSection) return;
    saving = true;
    await uciSetSection("uhttpd", uhttpdSection, {
      redirect_https: uhRedirectHttps ? "1" : "0",
    });
    await uciCommit("uhttpd");
    showFeedback("HTTP(S) access settings saved");
    saving = false;
  };

  // ═══════════════════════════════════════════════════════
  //  TAB 5 — Repo Keys
  // ═══════════════════════════════════════════════════════
  let apkMode = $state(false);
  let repoKeys = $state<RepoKey[]>([]);
  let repoKeysLoading = $state(true);
  let newRepoKeyInput = $state("");

  const isPemFormat = (s: string) => /-BEGIN\s+([A-Z]+\s+)?PUBLIC\s+KEY-/.test(s);
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
    if (stat) { apkMode = true; return "/etc/apk/keys/"; }
    apkMode = false;
    return "/etc/opkg/keys/";
  };

  const loadRepoKeys = async () => {
    repoKeysLoading = true;
    try {
      const keyDir = await detectKeyEnv();
      const listing = await listDir(keyDir);
      const entries = listing?.entries || [];
      const keys: RepoKey[] = [];
      for (const e of entries) {
        if (e.type !== "file") continue;
        const content = await readFile(keyDir + e.name);
        keys.push({ filename: e.name, key: content?.data || "", protected: isSafeKey(e.name) });
      }
      repoKeys = keys;
    } catch { repoKeys = []; }
    repoKeysLoading = false;
  };

  const addRepoKey = async () => {
    const key = newRepoKeyInput.trim();
    if (!key) return;

    if (/^https?:\/\/\S+$/i.test(key)) {
      saving = true;
      try {
        const res = await fetch(key);
        if (!res.ok) { showFeedback(`HTTP ${res.status}`, "error"); saving = false; return; }
        const text = await res.text();
        const trimmed = text.trim();
        if (trimmed.length < 32 || trimmed.length > 8192) {
          showFeedback("Key content too short or too long", "error");
          saving = false;
          return;
        }
        newRepoKeyInput = trimmed;
        await addRepoKey();
        newRepoKeyInput = "";
      } catch (e: any) { showFeedback(`Fetch failed: ${e.message}`, "error"); }
      saving = false;
      return;
    }

    const isPem = isPemFormat(key);
    if (apkMode && !isPem) { showFeedback("APK requires PEM format", "error"); return; }
    if (!apkMode && isPem) { showFeedback("OPKG does not support PEM", "error"); return; }

    const normalized = key.replace(/\s+/g, " ").trim();
    if (repoKeys.some(k => k.key.replace(/\s+/g, " ").trim() === normalized)) {
      showFeedback("Key already exists", "error");
      return;
    }

    saving = true;
    const keyDir = apkMode ? "/etc/apk/keys/" : "/etc/opkg/keys/";
    const ext = apkMode ? ".pem" : "";
    const filename = `key_${Date.now()}${ext}`;
    const ok = await writeFile(keyDir + filename, key + "\n", 384);
    if (ok) { showFeedback("Key added"); newRepoKeyInput = ""; await loadRepoKeys(); }
    else showFeedback("Failed to add key", "error");
    saving = false;
  };

  const deleteRepoKey = async (k: RepoKey) => {
    if (k.protected) { showFeedback("Key is protected", "error"); return; }
    saving = true;
    const keyDir = apkMode ? "/etc/apk/keys/" : "/etc/opkg/keys/";
    const ok = await removeFile(keyDir + k.filename);
    if (ok) { showFeedback("Key deleted"); await loadRepoKeys(); }
    else showFeedback("Failed to delete key", "error");
    saving = false;
  };

  // ── init ───────────────────────────────────────────────
  onMount(() => {
    (async () => {
      const [uhttpdStat, passwd] = await Promise.all([
        statFile("/usr/sbin/uhttpd"),
        execCommand("/bin/cat", ["/etc/passwd"]),
        loadSshKeys(),
        loadDropbearConfig(),
        loadUhttpdConfig(),
        loadRepoKeys(),
      ]);
      hasUhttpd = !!uhttpdStat;
      if (passwd?.stdout) {
        knownUsers = passwd.stdout.split("\n")
          .map(l => l.split(":")[0])
          .filter(Boolean);
      }
    })();
  });

  // ── helpers for SSH key types ──────────────────────────
  const keyTypeIcon = (t: string) => {
    if (t === "RSA") return "RSA";
    if (t === "EdDSA" || t === "EdDSA-SK") return "Ed";
    if (t?.startsWith("ECDSA")) return "EC";
    return t?.substring(0, 3) || "KEY";
  };
</script>

<div class={cn("p-6", "flex", "flex-col", "h-screen", "gap-4", "animate-fade-in")}>
  <!-- Header -->
  <div class={cn("shrink-0", "flex", "items-start", "justify-between", "gap-4")}>
    <div class={cn("flex", "items-center", "gap-3")}>
      <div>
        <h1 class={cn("text-lg", "font-semibold", "text-white")}>{trans("Administration")}</h1>
        <p class={cn("text-sm", "mt-0.5", "text-muted")}>
          {trans("Password, SSH keys, access control")}
        </p>
      </div>
    </div>
    <div class={cn("flex", "items-center", "gap-3")}>
      {#if saveFeedback}
        <div
          class={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md font-medium animate-slide-up",
            feedbackType === "error"
              ? "text-danger bg-danger/10 border border-danger/20"
              : "text-accent bg-accent/10 border border-accent/20",
          )}
        >
          {#if feedbackType === "error"}
            <XCircle size={12} />
          {:else}
            <CheckCircle2 size={12} />
          {/if}
          {saveFeedback}
        </div>
      {/if}
    </div>
  </div>

  <!-- Tab bar -->
  <div
    class={cn(
      "flex", "gap-1", "w-fit", "shrink-0", "p-0.5",
      "border rounded-lg bg-surface-2 border-border",
    )}
  >
    {#each tabs as t}
      <button
        class={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md font-medium",
          "transition-all duration-150 cursor-pointer select-none",
          tab === t.id
            ? "bg-accent text-surface shadow-sm"
            : "bg-transparent text-muted hover:text-white/80",
        )}
        onclick={() => switchTab(t.id)}
      >
        <t.icon size={13} />
        {t.label}
      </button>
    {/each}
  </div>

  <!-- Content -->
  <div class={cn("flex-1", "min-h-0", "overflow-y-auto")}>
    {#key tab}
    <div class={cn(tabDir === "left" ? "animate-slide-left" : "animate-slide-right")}>

      {#if tab === "password"}
        <div class={cn("space-y-4", "max-w-lg")}>
          <div class={cn("glass", "p-5", "animate-slide-up")}>
            <div class={cn("flex", "items-center", "gap-2", "mb-4")}>
              <KeyRound size={14} class="text-accent" />
              <span class={sectionLabel}>{trans("Change Password")}</span>
            </div>

            {#if hasUhttpd}
              <div class={cn("mb-4")}>
                <Toggle
                  label={trans("Change password for rpcd user")}
                  bind:checked={pwRpcd}
                />
              </div>

              {#if pwRpcd}
                <div class={cn("space-y-3", "mb-4")}>
                  <Select
                    label={trans("rpcd Username")}
                    options={knownUsers.filter(u => u !== "root").map(u => ({ value: u, label: u }))}
                    bind:value={pwRpcUser}
                  />
                  <Input
                    label={trans("Old Password")}
                    type="password"
                    bind:value={pwOld}
                    placeholder="••••••••"
                  />
                </div>
              {:else}
                <div class={cn("mb-4")}>
                  <Select
                    label={trans("Router Username")}
                    options={knownUsers.map(u => ({ value: u, label: u }))}
                    bind:value={pwUser}
                  />
                </div>
              {/if}
            {:else}
              <div class={cn("mb-4")}>
                <Select
                  label={trans("Router Username")}
                  options={knownUsers.map(u => ({ value: u, label: u }))}
                  bind:value={pwUser}
                />
              </div>
            {/if}

            <div class={cn("space-y-3")}>
              <div>
                <Input
                  label={trans("New Password")}
                  type="password"
                  bind:value={pwNew}
                  placeholder="••••••••"
                />
                {#if pwNew}
                  <div class={cn("flex", "items-center", "gap-2", "mt-1")}>
                    <div
                      class={cn("h-1", "rounded-full", "transition-all", "duration-300")}
                      style={`
                        width: ${pwStrength.label === "Strong" ? "100%" : pwStrength.label === "Medium" ? "66%" : pwStrength.label === "Weak" ? "33%" : "10%"};
                        background: ${pwStrength.color};
                      `}
                    ></div>
                    <span class={cn("text-[10px]", "font-mono")} style="color: {pwStrength.color}">
                      {pwStrength.label}
                    </span>
                  </div>
                {/if}
              </div>
              <Input
                label={trans("Confirmation")}
                type="password"
                bind:value={pwConfirm}
                placeholder="••••••••"
              />
            </div>

            <div class={cn("flex", "items-center", "gap-2", "mt-4")}>
              <button
                onclick={savePassword}
                disabled={saving}
                class={btnPrimary(saving)}
              >
                {#if saving}<Save size={12} class="animate-pulse" />{:else}<Save size={12} />{/if}
                {saving ? trans("Saving…") : trans("Save & Apply")}
              </button>
            </div>
          </div>
        </div>

      {:else if tab === "sshkeys"}
        <div class={cn("space-y-4", "max-w-2xl")}>
          <div class={cn("glass", "p-5", "animate-slide-up")}>
            <div class={cn("flex", "items-center", "gap-2", "mb-4")}>
              <Terminal size={14} class="text-accent" />
              <span class={sectionLabel}>{trans("SSH Public Keys")}</span>
              {#if !sshKeysLoading}
                <span
                  class={cn(
                    "ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border",
                    parsedKeys.length > 0
                      ? "text-accent bg-accent/10 border-accent/20"
                      : "text-muted bg-surface-3 border-border",
                  )}
                >
                  <span class={cn("w-1.5 h-1.5 rounded-full", parsedKeys.length > 0 ? "bg-accent" : "bg-muted")}></span>
                  {parsedKeys.length} {trans(parsedKeys.length === 1 ? "key" : "keys")}
                </span>
              {/if}
            </div>
            <p class={cn("text-[10px]", "text-muted", "mb-4")}>
              {trans("Public keys allow passwordless SSH logins. Paste an OpenSSH public key or drag a .pub file.")}
            </p>

            {#if sshKeysLoading}
              <div class={cn("flex", "items-center", "justify-center", "py-12")}>
                <RotateCw size={20} class="text-muted animate-spin" />
              </div>
            {:else}
              <!-- Key list -->
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
                      <!-- Type badge -->
                      <div
                        class={cn(
                          "shrink-0 w-10 h-7 flex items-center justify-center rounded text-[9px] font-bold",
                          "bg-accent/10 text-accent border border-accent/20",
                        )}
                      >
                        {keyTypeIcon(k.type)}
                      </div>
                      <!-- Info -->
                      <div class={cn("flex-1", "min-w-0")}>
                        <div class={cn("flex", "items-center", "gap-2")}>
                          <span class={cn("text-xs", "font-medium", "text-white")}>
                            {k.comment || trans("Unnamed key")}
                          </span>
                        </div>
                        <div class={cn("text-[10px]", "text-muted", "mt-0.5")}>
                          {k.type}{k.bits ? ` ${k.bits}-bit` : ""}{k.curve ? ` (${k.curve})` : ""}
                          {#if k.options}
                            <span class={cn("ml-2", "text-accent-dim")}>
                              / {trans("Options:")} {Object.keys(k.options).sort().join(", ")}
                            </span>
                          {/if}
                        </div>
                        <code class={cn("block", "text-[10px]", "text-muted/60", "mt-0.5", "truncate")}>
                          {k.fprint}
                        </code>
                      </div>
                      <!-- Delete -->
                      <button
                        onclick={() => deleteSshKey(k)}
                        disabled={saving}
                        class={cn(
                          "shrink-0 p-1.5 rounded-md transition-all duration-150",
                          "opacity-0 group-hover:opacity-100 focus:opacity-100",
                          "text-muted hover:text-danger hover:bg-danger/10",
                        )}
                        title={trans("Delete key")}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  {/each}
                </div>
              {/if}

              <!-- Add key -->
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
                    class={btnPrimary(saving || !sshAddInput.trim())}
                  >
                    <Plus size={12} />
                    {trans("Add key")}
                  </button>
                </div>
              </div>
            {/if}
          </div>
        </div>

      {:else if tab === "sshaccess"}
        <div class={cn("space-y-4", "max-w-lg")}>
          {#each dbInstances as inst, i}
            <div class={cn("glass", "p-5", "animate-slide-up")}>
              <div class={cn("flex", "items-center", "justify-between", "mb-4")}>
                <div class={cn("flex", "items-center", "gap-2")}>
                  <Shield size={14} class="text-accent" />
                  <span class={sectionLabel}>
                    {trans("Dropbear Instance")} #{i + 1}
                    <code class={cn("ml-1", "text-[9px]", "text-muted")}>{inst.name}</code>
                  </span>
                </div>
                {#if dbInstances.length > 1}
                  <button
                    onclick={() => removeDropbearInstance(inst.name)}
                    disabled={saving}
                    class={cn(
                      "p-1.5 rounded-md transition-all duration-150",
                      "text-muted hover:text-danger hover:bg-danger/10",
                    )}
                    title={trans("Remove instance")}
                  >
                    <Trash2 size={13} />
                  </button>
                {/if}
              </div>

              <div class={cn("space-y-4")}>
                <div class={cn("space-y-3")}>
                  <Toggle
                    label={trans("Enable Instance")}
                    bind:checked={dbInstances[i].enable}
                  />
                  <Input
                    label={trans("Port")}
                    type="number"
                    bind:value={dbInstances[i].port}
                    placeholder="22"
                    class="max-w-28"
                  />
                  <Input
                    label={trans("Interface")}
                    bind:value={dbInstances[i].iface}
                    placeholder={trans("lan (leave empty for all)")}
                  />
                </div>
                <div class={cn("border-t", "border-border", "pt-3", "space-y-3")}>
                  <Toggle
                    label={trans("Password Authentication")}
                    bind:checked={dbInstances[i].passwordAuth}
                  />
                  <Toggle
                    label={trans("Root Password Authentication")}
                    bind:checked={dbInstances[i].rootPasswordAuth}
                  />
                  <Toggle
                    label={trans("Gateway Ports")}
                    bind:checked={dbInstances[i].gatewayPorts}
                  />
                </div>
              </div>
            </div>
          {/each}

          <!-- Add instance + Save -->
          <div class={cn("flex", "items-center", "gap-2")}>
            <button
              onclick={addDropbearInstance}
              disabled={saving}
              class={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg font-medium",
                "transition-all duration-150 cursor-pointer",
                "border border-dashed border-accent/20 text-accent bg-accent/5",
              )}
            >
              <Plus size={12} />
              {trans("Add instance")}
            </button>
            <button
              onclick={saveDropbearInstances}
              disabled={saving}
              class={btnPrimary(saving)}
            >
              {#if saving}<Save size={12} class="animate-pulse" />{:else}<Save size={12} />{/if}
              {saving ? trans("Saving…") : trans("Save & Apply")}
            </button>
          </div>
        </div>

      {:else if tab === "httpaccess"}
        <div class={cn("space-y-4", "max-w-lg")}>
          <div class={cn("glass", "p-5", "animate-slide-up")}>
            <div class={cn("flex", "items-center", "gap-2", "mb-4")}>
              <Globe size={14} class="text-accent" />
              <span class={sectionLabel}>{trans("HTTP(S) Server (uHTTPd)")}</span>
            </div>
            <p class={cn("text-[10px]", "text-muted", "mb-4")}>
              {trans("uHTTPd offers HTTP or HTTPS network access to the web interface.")}
            </p>
            <Toggle
              label={trans("Redirect to HTTPS")}
              description={trans("Enable automatic redirection of HTTP requests to the HTTPS port")}
              bind:checked={uhRedirectHttps}
            />
            <div class={cn("flex", "items-center", "gap-2", "mt-4")}>
              <button
                onclick={saveUhttpdConfig}
                disabled={saving}
                class={btnPrimary(saving)}
              >
                {#if saving}<Save size={12} class="animate-pulse" />{:else}<Save size={12} />{/if}
                {saving ? trans("Saving…") : trans("Save & Apply")}
              </button>
            </div>
          </div>
        </div>

      {:else if tab === "repokeys"}
        <div class={cn("space-y-4", "max-w-2xl")}>
          <div class={cn("glass", "p-5", "animate-slide-up")}>
            <div class={cn("flex", "items-center", "gap-2", "mb-4")}>
              <Lock size={14} class="text-accent" />
              <span class={sectionLabel}>{trans("Repository Public Keys")}</span>
              {#if !repoKeysLoading}
                <span
                  class={cn(
                    "ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border",
                    repoKeys.length > 0
                      ? "text-accent bg-accent/10 border-accent/20"
                      : "text-muted bg-surface-3 border-border",
                  )}
                >
                  <span class={cn("w-1.5 h-1.5 rounded-full", repoKeys.length > 0 ? "bg-accent" : "bg-muted")}></span>
                  {repoKeys.length} {trans(repoKeys.length === 1 ? "key" : "keys")}
                </span>
              {/if}
            </div>
            <p class={cn("text-[10px]", "text-muted", "mb-4")}>
              {trans("Each software repository public key allows packages signed by it to be installed.")}
              <br />
              {trans("Stored in")} <code class="text-accent bg-accent/5 px-1 rounded">{apkMode ? "/etc/apk/keys/" : "/etc/opkg/keys/"}</code>
            </p>

            {#if repoKeysLoading}
              <div class={cn("flex", "items-center", "justify-center", "py-12")}>
                <RotateCw size={20} class="text-muted animate-spin" />
              </div>
            {:else}
              <!-- Key list -->
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
                          <span class={cn("text-xs", "font-medium", "text-white")}>
                            {k.filename}
                          </span>
                          {#if k.protected}
                            <span class={cn("text-[9px]", "px-1.5", "py-0.5", "rounded", "bg-surface-3", "text-muted", "border", "border-border")}>
                              {trans("Protected")}
                            </span>
                          {/if}
                        </div>
                        <code class={cn("block", "text-[10px]", "text-muted/60", "mt-1", "truncate")}>
                          {k.key.substring(0, 80)}{k.key.length > 80 ? "…" : ""}
                        </code>
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
                          title={trans("Delete key")}
                        >
                          <Trash2 size={13} />
                        </button>
                      {/if}
                    </div>
                  {/each}
                </div>
              {/if}

              <!-- Add key -->
              <div class={cn("border-t", "border-border", "pt-4")}>
                <p class={cn("text-[10px]", "text-muted", "mb-2")}>
                  {trans("Add new repository public key by pasting its content or a URL.")}
                </p>
                <div class={cn("flex", "items-start", "gap-2")}>
                  <textarea
                    bind:value={newRepoKeyInput}
                    rows={3}
                    placeholder={trans("Paste key content or URL…")}
                    class={cn(
                      "flex-1 px-2.5 py-1.5 border text-xs rounded-md resize-vertical",
                      "bg-surface outline-none transition-all duration-150 font-mono",
                      "border-border text-fg",
                      "focus:border-(--accent) focus:shadow-[0_0_0_1px_var(--accent)]",
                    )}
                  ></textarea>
                  <button
                    onclick={addRepoKey}
                    disabled={saving || !newRepoKeyInput.trim()}
                    class={cn(btnPrimary(saving || !newRepoKeyInput.trim()), "mt-0")}
                  >
                    {#if saving}<RotateCw size={12} class="animate-spin" />{:else}<Plus size={12} />{/if}
                    {trans("Add key")}
                  </button>
                </div>
              </div>
            {/if}
          </div>
        </div>
      {/if}

    </div>
    {/key}
  </div>
</div>
