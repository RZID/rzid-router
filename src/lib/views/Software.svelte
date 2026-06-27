<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import {
    Package, Download, RefreshCw, Trash2, CheckCircle2, XCircle, RotateCw,
    AlertTriangle, ArrowLeft, ArrowRight, HardDrive, Upload, Settings,
    Globe, Search, ArrowUp, ArrowDown,
  } from "@lucide/svelte";
  import { cn } from "../helpers/classname";
  import { fmtBytes } from "../helpers/format";
  import { t as _t, getLocale, onLocaleChange } from "../i18n";
  import { execCommand, getSystemFeatures, call, readFile, writeFile, listDir, cgiExec } from "../api/ubus";

  type Pkg = Record<string, any>;
  type PkgMap = { providers: Record<string, Pkg[]>; pkgs: Record<string, Pkg> };

  let locale = $state(getLocale());
  let trans = $derived.by(() => { locale; return (k: string) => _t(k); });
  $effect(() => onLocaleChange(() => { locale = getLocale(); }));

  let isApk = $state(false);
  let loading = $state(true);
  let operating = $state(false);
  let diskTotal = $state(0);
  let diskFree = $state(0);
  let tab = $state<"available" | "installed" | "updates">("available");
  let filter = $state("");
  let i18nFilter = $state<"lang" | "all" | "none">("lang");
  let languages: string[] = $state(["en"]);

  const PAGE_SIZE = 100;

  let available: PkgMap = $state({ providers: {}, pkgs: {} });
  let installed: PkgMap = $state({ providers: {}, pkgs: {} });

  let currentRows: any[][] = $state([]);
  let pageOffset = $state(0);
  let filterInput: HTMLInputElement | undefined = $state(undefined);

  let sortField = $state<"name" | "version" | "size">("name");
  let sortDir = $state<"asc" | "desc">("asc");

  // modal
  let modalOpen = $state(false);
  let modalTitleHtml = $state("");
  let modalBody: any = $state<HTMLElement | string>("");
  let modalActions: any[] = $state([]);

  function closeModal() { modalOpen = false; }

  function showModal(titleHtml: string, body: any, actions?: any[]) {
    modalTitleHtml = titleHtml;
    modalBody = body;
    modalActions = actions || [];
    modalOpen = true;
  }

  const pkgMgr = $derived(isApk ? "APK" : "OPKG");

  // ── helpers ────────────────────────────────────────

  function orderOf(c: string): number {
    if (c === "~") return -1;
    if (c === "" || (c >= "0" && c <= "9")) return 0;
    if ((c >= "a" && c <= "z") || (c >= "A" && c <= "Z")) return c.charCodeAt(0);
    return c.charCodeAt(0) + 256;
  }

  function compareVersion(val: string | undefined, ref: string | undefined): number {
    val = val || "";
    ref = ref || "";
    if (val === ref) return 0;

    const isdigit: Record<string, boolean> = {};
    for (let d = 0; d <= 9; d++) isdigit[String(d)] = true;

    let vi = 0, ri = 0;
    while (vi < val.length || ri < ref.length) {
      let firstDiff = 0;
      while ((vi < val.length && !isdigit[val[vi]]) || (ri < ref.length && !isdigit[ref[ri]])) {
        const vc = orderOf(val[vi]), rc = orderOf(ref[ri]);
        if (vc !== rc) return vc - rc;
        vi++; ri++;
      }
      while (val[vi] === "0") vi++;
      while (ref[ri] === "0") ri++;
      while (isdigit[val[vi]] && isdigit[ref[ri]]) {
        firstDiff = firstDiff || (val.charCodeAt(vi) - ref.charCodeAt(ri));
        vi++; ri++;
      }
      if (isdigit[val[vi]]) return 1;
      if (isdigit[ref[ri]]) return -1;
      if (firstDiff) return firstDiff;
    }
    return 0;
  }

  function versionSatisfied(ver: string, ref: string, vop: string): boolean {
    const r = compareVersion(ver, ref);
    switch (vop) {
      case "<": case "<=": return r <= 0;
      case ">": case ">=": return r >= 0;
      case "<<": return r < 0;
      case ">>": return r > 0;
      case "=": return r === 0;
    }
    return false;
  }

  function parseList(s: string, dest: PkgMap) {
    dest.pkgs = {};
    dest.providers = {};
    const re = /([^\n]*)\n/g;
    let pkg: any = null, key: string | null = null, val: string | null = null, m: RegExpExecArray | null;

    while ((m = re.exec(s)) !== null) {
      if (m[1].match(/^\s(.*)$/)) {
        if (pkg !== null && key !== null && val !== null)
          val += "\n" + (m[1] as string).trim();
        continue;
      }
      if (key !== null && val !== null) {
        switch (key) {
          case "package":
            pkg = { name: val };
            break;
          case "depends": case "provides": {
            const list = val.split(/\s*,\s*/);
            if (list.length !== 1 || list[0].length > 0)
              pkg[key] = list;
            break;
          }
          case "installed-time":
            pkg.installtime = new Date(+val * 1000);
            break;
          case "installed-size":
            pkg.installsize = +val;
            break;
          case "status": {
            const stat = val.split(/\s+/);
            if (stat[1] === "user") pkg.user = true;
            if (stat[1] === "hold") pkg.hold = true;
            if (stat[2] === "installed") pkg.installed = true;
            break;
          }
          case "essential":
            if (val === "yes") pkg.essential = true;
            break;
          case "size":
            pkg.size = +val;
            break;
          case "architecture": case "auto-installed": case "filename":
          case "sha256sum": case "section":
            break;
          default:
            pkg[key] = val;
            break;
        }
        key = val = null;
      }

      const trimMatch = m[1].trim().match(/^([\w-]+)\s*:(.+)$/);
      if (trimMatch) {
        key = trimMatch[1].toLowerCase();
        val = trimMatch[2].trim();
      } else if (pkg) {
        dest.pkgs[pkg.name] = pkg;
        const provides: string[] = dest.providers[pkg.name] ? [] : [pkg.name];
        if (pkg.provides) provides.push(...pkg.provides);
        provides.forEach((p: string) => {
          dest.providers[p] = dest.providers[p] || [];
          dest.providers[p].push(pkg);
        });
        pkg = null;
      }
    }
  }

  function parsePmcJson(text: string, dest: PkgMap, installed: boolean) {
    dest.pkgs = {};
    dest.providers = {};
    let data: any[];
    try { data = JSON.parse(text); } catch { return; }
    if (!Array.isArray(data)) return;
    for (const item of data) {
      const { name, 'file-size': size, ...attrs } = item;
      const pkg: Record<string, any> = { name, size, ...attrs };
      if (installed) {
        pkg.installed = true;
        if (!pkg.status) pkg.status = ["installed"];
      }
      dest.pkgs[name] = pkg;
      const provides = [name, ...(Array.isArray(pkg.provides) ? pkg.provides : [])];
      for (let p of provides) {
        p = p.split('=')[0];
        dest.providers[p] = dest.providers[p] || [];
        if (!dest.providers[p].includes(pkg)) dest.providers[p].push(pkg);
      }
    }
  }

  function parseApkDb(text: string, dest: PkgMap, installed: boolean) {
    dest.pkgs = {};
    dest.providers = {};
    let pn = "", pv = "", pd = "";
    for (const raw of text.split("\n")) {
      const s = raw.trim();
      if (!s) {
        if (pn) {
          const p: Record<string, any> = { name: pn, version: pv || "?" };
          if (pd) p.description = pd;
          if (installed) p.installed = true;
          dest.pkgs[pn] = p;
          dest.providers[pn] = [p];
          pn = pv = pd = "";
        }
        continue;
      }
      const m = s.match(/^(\w):(.*)/);
      if (!m) continue;
      if (m[1] === "P") pn = m[2].trim();
      else if (m[1] === "V") pv = m[2].trim();
      else if (m[1] === "L") pd = m[2].trim();
    }
    if (pn) {
      const p: Record<string, any> = { name: pn, version: pv || "?" };
      if (pd) p.description = pd;
      if (installed) p.installed = true;
      dest.pkgs[pn] = p;
      dest.providers[pn] = [p];
    }
  }

  function truncateVersion(v: string, op?: string): string {
    v = v.replace(/\b(([a-f0-9]{8})[a-f0-9]{24,32})\b/, (_m, _f, s8) => s8 + "…");
    if (!op || op === "=") return v;
    return `${op} ${v}`;
  }

  function pkgStatus(
    pkg: Pkg, vop: string | null, ver: string | null, info: Record<string, any>
  ): { label: string; cls: string } {
    info.errors = info.errors || [];
    info.install = info.install || [];

    if (pkg.installed) {
      if (vop && !versionSatisfied(pkg.version, ver!, vop)) {
        let repl: Pkg | null = null;
        (available.providers[pkg.name] || []).forEach((p: Pkg) => {
          if (!repl && versionSatisfied(p.version, ver!, vop)) repl = p;
        });
        if (repl) {
          info.install.push(repl);
          return { label: "Needs upgrade", cls: "accent" };
        }
        info.errors.push(
          `The installed version is not compatible, require ${truncateVersion(ver!, vop)} while ${truncateVersion(pkg.version)} is installed.`
        );
        return { label: "Version incompatible", cls: "danger" };
      }
      return { label: "Installed", cls: "accent" };
    } else if (!pkg.missing) {
      if (!vop || versionSatisfied(pkg.version, ver!, vop)) {
        info.install.push(pkg);
        return { label: "Not installed", cls: "muted" };
      }
      info.errors.push(
        `Repository version is not compatible, require ${truncateVersion(ver!, vop)} but only ${truncateVersion(pkg.version)} is available.`
      );
      return { label: "Version incompatible", cls: "danger" };
    } else {
      info.errors.push(`Required dependency ${pkg.name} is not available in any repository.`);
      return { label: "Not available", cls: "danger" };
    }
  }

  function renderDependencyItem(dep: any, info: Record<string, any>, flat?: boolean): string {
    const vop = dep.version ? dep.version[0] : null;
    const ver = dep.version ? dep.version[1] : null;
    let html = "<li>";
    const items: string[] = [];
    const depends: string[] = [];

    for (let i = 0; dep.pkgs && i < dep.pkgs.length; i++) {
      const pkg = installed.pkgs[dep.pkgs[i]] || available.pkgs[dep.pkgs[i]] || { name: dep.name };
      if (i > 0) html += " | ";
      let text = pkg.name;
      if (pkg.installsize) text += ` (${fmtBytes(pkg.installsize)})`;
      else if (pkg.size) text += ` (~${fmtBytes(pkg.size)})`;

      const st = pkgStatus(pkg, vop, ver, info);
      html += `<span class="font-mono text-xs">${text} <span class="${st.cls === 'danger' ? 'text-danger' : st.cls === 'accent' ? 'text-accent' : 'text-muted'} text-[10px] px-1 py-0.5 rounded ${st.cls === 'danger' ? 'bg-danger/8' : st.cls === 'accent' ? 'bg-accent/8' : 'bg-surface-3'}">${st.label}</span></span>`;

      (pkg.depends || []).forEach((d: string) => { if (!depends.includes(d)) depends.push(d); });
    }

    if (!items.length && !html.includes("<span")) {
      const st = pkgStatus({ name: dep.name, missing: true }, vop, ver, info);
      html += `<span class="font-mono text-xs">${dep.name} <span class="${st.cls === 'danger' ? 'text-danger' : 'text-accent'} text-[10px]">${st.label}</span></span>`;
    }

    if (!flat) {
      const sub = renderDependencies(depends, info);
      if (sub) html += sub;
    }
    html += "</li>";
    return html;
  }

  function renderDependencies(depends: string[], info: Record<string, any>, flat?: boolean): string {
    info.seen = info.seen || [];
    const items: string[] = [];

    for (let i = 0; i < depends.length; i++) {
      if (depends[i] === "libc") continue;
      const depMatch = depends[i].match(/^(.+?)\s+\((<=|>=|<<|>>|<|>|=)(.+?)\)/);
      let dep: string, vop: string | null, ver: string | null;
      if (depMatch) {
        dep = depMatch[1].trim();
        vop = depMatch[2].trim();
        ver = depMatch[3].trim();
      } else {
        dep = depends[i].trim();
        vop = ver = null;
      }
      if (info.seen[dep]) continue;

      const pkgs: string[] = [];
      (installed.providers[dep] || []).forEach((p: Pkg) => { if (!pkgs.includes(p.name)) pkgs.push(p.name); });
      (available.providers[dep] || []).forEach((p: Pkg) => { if (!pkgs.includes(p.name)) pkgs.push(p.name); });

      info.seen[dep] = { name: dep, pkgs, version: [vop, ver] };
      items.push(renderDependencyItem(info.seen[dep], info, flat));
    }

    if (items.length) return `<ul class="space-y-0.5 mt-1 text-xs" style="padding-left:1em">${items.join("")}</ul>`;
    return "";
  }

  // ── actions ────────────────────────────────────────

  function showDetail(name: string) {
    const src = tab === "available" ? available : installed;
    const pkg = src.pkgs[name];
    if (!pkg) return;
    const avail = available.pkgs[name] || {};
    const instPkg = installed.pkgs[name];

    const size = avail.installsize
      ? `~${fmtBytes(avail.installsize)} installed`
      : avail.size ? `~${fmtBytes(avail.size)} compressed` : "unknown";

    const depcache: Record<string, any> = {};
    const deps = renderDependencies(pkg.depends, depcache);
    let errs = "";
    let inst = "";
    let tree = "";
    let desc = "";
    let i18nSection = "";
    let overwriteSection = "";
    let totalsize = avail.installsize || avail.size || 0;
    let totalpkgs = 1;

    if (depcache.install && depcache.install.length)
      depcache.install.forEach((ipkg: Pkg) => { totalsize += ipkg.installsize || ipkg.size || 0; totalpkgs++; });

    if (depcache.errors && depcache.errors.length)
      errs = `<ul class="space-y-0.5 mt-2 text-xs" style="padding-left:1em">${depcache.errors.map((e: string) => `<li class="text-danger" style="list-style:none;padding-left:1.5em">⚠ ${e}</li>`).join("")}</ul>`;

    inst = `<p class="text-xs text-muted mt-2">Require approx. ${fmtBytes(totalsize)} for ${totalpkgs} package(s) to install.</p>`;

    if (deps) tree = `<li><strong class="text-xs text-white">Dependencies:</strong>${deps}</li>`;

    // ── Extra info rows ──
    let extraRows = "";
    if (avail.section) extraRows += `<li class="flex items-center gap-2"><span class="text-muted w-20 shrink-0">Section</span><span class="text-fg font-mono">${avail.section}</span></li>`;
    if (avail.architecture) extraRows += `<li class="flex items-center gap-2"><span class="text-muted w-20 shrink-0">Arch</span><span class="text-fg font-mono">${avail.architecture}</span></li>`;
    if (avail.repository) extraRows += `<li class="flex items-center gap-2"><span class="text-muted w-20 shrink-0">Repository</span><span class="text-fg font-mono">${avail.repository}</span></li>`;
    if (pkg.installtime) extraRows += `<li class="flex items-center gap-2"><span class="text-muted w-20 shrink-0">Installed</span><span class="text-fg font-mono">${pkg.installtime.toLocaleString()}</span></li>`;

    // ── Badges ──
    let badges = "";
    if (avail.essential) badges += `<span class="text-[10px] px-1.5 py-0.5 rounded font-medium bg-accent/8 text-accent">Essential</span>`;
    if (avail["auto-installed"]) badges += `<span class="text-[10px] px-1.5 py-0.5 rounded font-medium bg-warn/8 text-warn">Auto</span>`;
    if (pkg.hold || avail.hold) badges += `<span class="text-[10px] px-1.5 py-0.5 rounded font-medium bg-danger/8 text-danger">Hold</span>`;
    if (badges) extraRows += `<li class="flex items-center gap-1"><span class="text-muted w-20 shrink-0">Flags</span>${badges}</li>`;

    // ── Provides ──
    let providesHtml = "";
    if (pkg.provides?.length) {
      providesHtml = `<li><strong class="text-xs text-white">Provides:</strong><ul class="space-y-0.5 mt-1 text-xs" style="padding-left:1em">${pkg.provides.map((p: string) => `<li class="text-muted font-mono">${p}</li>`).join("")}</ul></li>`;
    }

    // ── Reverse dependencies ──
    let rdepHtml = "";
    const rdepends: string[] = [];
    for (const pn in installed.pkgs) {
      const ip = installed.pkgs[pn];
      if (!ip?.installed || pn === name) continue;
      if (ip.depends && (ip.depends as string[]).some(d => d === name || d.startsWith(name + " "))) {
        rdepends.push(pn);
      }
    }
    if (rdepends.length) {
      rdepHtml = `<li><strong class="text-xs text-white">Required by:</strong><ul class="space-y-0.5 mt-1 text-xs" style="padding-left:1em">${rdepends.map(p => `<li class="text-muted font-mono">${p}</li>`).join("")}</ul></li>`;
    }

    // i18n suggestions
    const luciMatch = avail.name?.match(/^luci-([^-]+)-(.+)$/);
    let i18nPkgs: string[] = [];
    if (luciMatch && (luciMatch[1] !== "i18n" || luciMatch[2].indexOf("base-") === 0)) {
      let i18nRe: RegExp | null = null;
      if (luciMatch[1] === "i18n") {
        const basenames: string[] = [];
        for (const pn in installed.pkgs) {
          const m = pn.match(/^luci-([^-]+)-(.+)$/);
          if (m && m[1] !== "i18n") basenames.push(m[2]);
        }
        if (basenames.length)
          i18nRe = new RegExp("^luci-i18n-(" + basenames.join("|") + ")-" + avail.name.replace(/^luci-i18n-base-/, "") + "$");
      } else {
        i18nRe = new RegExp("^luci-i18n-" + luciMatch[2] + "-(" + languages.join("|") + ")$");
      }
      if (i18nRe) {
        for (const pn in available.pkgs)
          if (pn !== avail.name && pn.match(i18nRe)) i18nPkgs.push(pn);
      }
    }

    if (i18nPkgs.length) {
      i18nSection = `<div class="mt-3 pt-3 border-t border-border"><label class="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked id="i18n-cb" data-pkgs="${i18nPkgs.join(" ")}" class="accent-(--accent)" /> <span class="text-muted">Install suggested translation packages as well</span></label></div>`;
    }

    overwriteSection = `<div class="mt-2"><label class="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" id="overwrite-cb" class="accent-(--accent)" /> <span class="text-muted">Allow overwriting conflicting package files</span></label></div>`;

    if (avail.description)
      desc = `<div class="mt-3 pt-3 border-t border-border"><h5 class="text-xs font-semibold text-white mb-1">Description</h5><p class="text-xs text-muted leading-relaxed">${avail.description}</p></div>`;

    let html = `<ul class="space-y-1.5 text-xs" style="padding-left:0">`;
    html += `<li class="flex items-center gap-2"><span class="text-muted w-20 shrink-0">Version</span><code class="text-accent bg-accent/8 px-2 py-0.5 rounded font-mono">${pkg.version || "-"}</code></li>`;
    html += `<li class="flex items-center gap-2"><span class="text-muted w-20 shrink-0">Size</span><span class="text-fg font-mono">${size}</span></li>`;
    html += extraRows;
    html += tree;
    html += providesHtml;
    html += rdepHtml;
    html += `</ul>`;
    html += desc;
    html += errs || inst ? `<div class="mt-3 pt-3 border-t border-border">${errs}${inst}</div>` : "";
    html += i18nSection;
    html += overwriteSection;

    const act: any[] = [
      { label: "Cancel", action: closeModal },
    ];

    if (tab === "available") {
      if (instPkg?.installed && instPkg.version !== pkg.version) {
        act.unshift({ label: "Upgrade", action: () => handlePkg("upgrade", name), accent: true });
      } else if (!instPkg?.installed) {
        act.unshift({ label: "Install", action: () => handlePkg("install", name), accent: true });
      }
    } else if (tab === "installed" && pkg.installed) {
      if (!pkg.hold && !avail.hold) {
        act.unshift({ label: "Hold", action: () => handleHold(name), accent: true });
      } else {
        act.unshift({ label: "Unhold", action: () => handleUnhold(name), accent: true });
      }
      act.unshift({ label: "Remove", action: () => handleRemoveModal(name), danger: true });
    }

    showModal(`Package: ${name}`, html, act);
  }

  function handleRemoveModal(name: string) {
    const pkg = installed.pkgs[name] || available.pkgs[name] || {};
    const avail = available.pkgs[name] || {};

    const size = avail.installsize
      ? `~${fmtBytes(avail.installsize)} installed`
      : avail.size ? `~${fmtBytes(avail.size)} compressed` : "unknown";

    let desc = "";
    if (avail.description)
      desc = `<div class="mt-3 pt-3 border-t border-border"><h5 class="text-xs font-semibold text-white mb-1">Description</h5><p class="text-xs text-muted leading-relaxed">${avail.description}</p></div>`;

    const apkDisabled = isApk ? "disabled" : "";

    let html = `<ul class="space-y-1.5 text-xs">`;
    html += `<li class="flex items-center gap-2"><span class="text-muted w-20 shrink-0">Version</span><code class="text-accent bg-accent/8 px-2 py-0.5 rounded font-mono">${pkg.version || "-"}</code></li>`;
    html += `<li class="flex items-center gap-2"><span class="text-muted w-20 shrink-0">Size</span><span class="text-fg font-mono">${size}</span></li>`;
    html += `</ul>${desc}`;
    html += `<div class="mt-3 pt-3 border-t border-border flex items-center justify-between flex-wrap gap-2">`;
    html += `<label class="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked id="autoremove-cb" ${apkDisabled} class="accent-(--accent)" /> <span class="text-muted">Automatically remove unused dependencies</span></label>`;
    html += `</div>`;

    showModal(`Remove ${name}`, html, [
      { label: "Cancel", action: closeModal },
      { label: "Remove", action: () => handlePkg("remove", name), danger: true },
    ]);
  }

  function handleManualInstall() {
    const val = filterInput?.value?.trim() || "";
    if (!val) return;

    let warning = "";
    let installBtn: any = { label: "Install", action: () => { doManualInstall(val); }, accent: true };

    if (val.indexOf("/") !== -1) {
      warning = `<p class="text-xs text-muted">Installing packages from untrusted sources is a potential security risk! Really attempt to install <code class="text-accent bg-accent/8 px-1.5 py-0.5 rounded font-mono">${val}</code>?</p>`;
    } else if (!available.providers[val]) {
      warning = `<p class="text-xs text-muted">The package <code class="text-accent bg-accent/8 px-1.5 py-0.5 rounded font-mono">${val}</code> is not available in any configured repository.</p>`;
      installBtn = null as any;
    } else {
      warning = `<p class="text-xs text-muted">Really attempt to install <code class="text-accent bg-accent/8 px-1.5 py-0.5 rounded font-mono">${val}</code>?</p>`;
    }

    showModal("Manually install package", warning, [
      { label: "Cancel", action: closeModal },
      ...(installBtn ? [installBtn] : []),
    ]);
  }

  function doManualInstall(name: string) {
    closeModal();
    if (filterInput) filterInput.value = "";
    execPkgCmd("install", name);
  }

  function handleUpload() {
    showModal(
      "Upload Package",
      `<div class="flex flex-col items-center gap-3 py-4"><p class="text-xs text-muted">Upload an .ipk or .apk file to install.</p><input type="file" id="upload-file" accept="${isApk ? ".apk" : ".ipk,.ipk"}" class="text-xs text-muted file:mr-2 file:px-3 file:py-1.5 file:text-xs file:rounded-lg file:font-medium file:border file:border-accent/20 file:bg-accent/8 file:text-accent file:cursor-pointer hover:file:bg-accent/15" /></div>`,
      [
        { label: "Cancel", action: closeModal },
        { label: "Upload & Install", action: doUpload, accent: true },
      ],
    );
  }

  async function doUpload() {
    const input = document.querySelector<HTMLInputElement>("#upload-file");
    if (!input?.files?.length) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = async () => {
      const b64 = (reader.result as string).split(",")[1];
      const path = `/tmp/upload.${isApk ? "apk" : "ipk"}`;
      await writeFile(path, b64, "base64");
      closeModal();
      execPkgCmd("install", path);
    };
    reader.readAsDataURL(file);
  }

  function handleConfig() {
    const baseDir = isApk ? "/etc/apk" : "/etc/opkg";
    showModal(
      `${pkgMgr} Configuration`,
      `<div class="flex flex-col items-center gap-3 py-4"><RotateCw size={20} class="text-muted animate-spin" /><span class="text-xs text-muted">Loading configuration data…</span></div>`,
      [],
    );

    (async () => {
      try {
        const partials: any[] = await listDir(baseDir);
        const files: string[] = [];

        if (isApk) {
          files.push(`${baseDir}/repositories.d/customfeeds.list`);
          files.push(`${baseDir}/repositories.d/distfeeds.list`);
        } else {
          files.push(`${baseDir}.conf`);
        }

        for (const p of partials || []) {
          if (p.type === "file") {
            if (isApk) {
              if (p.name === "repositories") files.push(`${baseDir}/${p.name}`);
            } else if (p.name.match(/\.conf$/)) {
              files.push(`${baseDir}/${p.name}`);
            }
          }
        }

        const conf: Record<string, string> = {};
        for (const f of files) {
          try {
            conf[f] = await readFile(f) || "";
          } catch {}
        }

        const desc = isApk
          ? `<p class="text-xs text-muted mb-3">Below is a listing of the various configuration files used by <em>apk</em>. The configuration in the other files may be changed but is usually not preserved by <em>sysupgrade</em>.</p>`
          : `<p class="text-xs text-muted mb-3">Below is a listing of the various configuration files used by <em>opkg</em>. Use <em>opkg.conf</em> for global settings and <em>customfeeds.conf</em> for custom repository entries. The configuration in the other files may be changed but is usually not preserved by <em>sysupgrade</em>.</p>`;

        let body = desc;
        const sortedFiles = Object.keys(conf).sort();
        for (const file of sortedFiles) {
          const nLines = (conf[file].match(/\n/g) || []).length;
          body += `<h5 class="text-xs font-semibold text-white mt-3 mb-1">${file}</h5>`;
          body += `<textarea class="w-full text-xs font-mono bg-surface border border-border rounded-lg p-2 text-fg outline-none focus:border-(--accent)" rows="${Math.max(Math.min(nLines, 10), 3)}">${conf[file]}</textarea>`;
        }

        showModal(`${pkgMgr} Configuration`, body, [
          { label: "Cancel", action: closeModal },
          { label: "Save", action: () => saveConfig(sortedFiles), accent: true },
        ]);
      } catch (err: any) {
        showModal("Configuration Error", `<p class="text-xs text-danger">Failed to load configuration: ${err}</p>`, [{ label: "OK", action: closeModal }]);
      }
    })();
  }

  async function saveConfig(files: string[]) {
    const textareas = document.querySelectorAll<HTMLTextAreaElement>(".modal textarea");
    const data: Record<string, string> = {};
    textareas.forEach((ta) => { data[ta.previousElementSibling?.textContent || ""] = ta.value; });
    showModal(`${pkgMgr} Configuration`, `<div class="flex items-center gap-2 py-4"><RotateCw size={16} class="text-accent animate-spin" /><span class="text-xs text-muted">Saving configuration data…</span></div>`, []);
    try {
      for (const [file, content] of Object.entries(data)) {
        await writeFile(file, content);
      }
      closeModal();
    } catch (err: any) {
      showModal(`${pkgMgr} Configuration`, `<p class="text-xs text-danger">Failed to save: ${err}</p>`, [{ label: "OK", action: closeModal }]);
    }
  }

  function handleReset() {
    filter = "";
    applyDisplay();
  }

  function handleInput() {
    clearTimeout((handleInput as any)._t);
    (handleInput as any)._t = setTimeout(() => applyDisplay(), 250);
  }

  function execPkgCmd(cmd: string, pkg?: string) {
    operating = true;
    const name = pkg || "";
    showModal(
      `Executing ${pkgMgr}`,
      `<div class="flex flex-col items-center gap-3 py-6"><div class="relative"><RotateCw size={28} class="text-accent animate-spin" /><div class="absolute inset-0 rounded-full animate-ping bg-accent/20"></div></div><span class="text-xs text-muted">Waiting for ${pkgMgr} ${cmd} ${name} to complete…</span></div>`,
      [],
    );
    execCmd(cmd, name);
  }

  function handlePkg(action: string, name: string) {
    closeModal();
    const autoremove = document.querySelector<HTMLInputElement>("#autoremove-cb");
    const overwrite = document.querySelector<HTMLInputElement>("#overwrite-cb");
    const i18n = document.querySelector<HTMLInputElement>("#i18n-cb");

    const argv: string[] = [action];

    if (action === "remove") argv.push("--force-removal-of-dependent-packages");
    if (autoremove?.checked) argv.push("--autoremove");
    if (overwrite?.checked) argv.push("--force-overwrite");
    if (i18n?.checked) {
      const pkgs = (i18n.getAttribute("data-pkgs") || "").split(" ");
      argv.push(...pkgs.filter(Boolean));
    }
    if (name) argv.push(name);

    execPkgCmdRaw(argv, action);
  }

  async function execPkgCmdRaw(argv: string[], action: string) {
    operating = true;
    showModal(
      `Executing ${pkgMgr}`,
      `<div class="flex flex-col items-center gap-3 py-6"><div class="relative"><RotateCw size={28} class="text-accent animate-spin" /><div class="absolute inset-0 rounded-full animate-ping bg-accent/20"></div></div><span class="text-xs text-muted">Waiting for ${pkgMgr} ${action} to complete…</span></div>`,
      [],
    );

    let res: any;
    res = await execCommand("/usr/libexec/package-manager-call", argv);
    if (!res || res.code !== 0) {
      const fallback = isApk ? "/sbin/apk" : "/bin/opkg";
      const fallbackArgs = isApk
        ? argv.map(a => a === "list-available" ? "list" : a === "list-installed" ? "info" : a)
        : argv;
      res = await execCommand(fallback, fallbackArgs);
    }

    const code = res?.code || 0;
    const hasErr = code !== 0;
    let html = `<div class="space-y-3">`;
    html += `<div class="flex items-center gap-2 ${hasErr ? "text-danger" : "text-accent"}">`;
    html += hasErr
      ? `<span class="w-5 h-5 rounded-full bg-danger/10 flex items-center justify-center text-danger"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></span>`
      : `<span class="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center text-accent"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></span>`;
    html += `<span class="text-sm font-medium">${hasErr ? `${pkgMgr} ${action} failed` : `${pkgMgr} ${action} completed`}</span></div>`;
    if (res?.stdout) html += `<pre class="text-[11px] font-mono text-muted bg-surface-2 p-3 rounded border border-border overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto">${res.stdout}</pre>`;
    if (res?.stderr) html += `<pre class="text-[11px] font-mono text-danger bg-danger/5 p-3 rounded border border-danger/20 overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto">${res.stderr}</pre>`;
    if (hasErr) html += `<p class="text-xs text-danger">The command failed with code ${code}</p>`;
    html += `</div>`;

    showModal(`${pkgMgr} ${action}`, html, [
      { label: "Dismiss", action: async () => { closeModal(); await refreshLists(); } },
    ]);
    operating = false;
  }

  function execCmd(cmd: string, name: string) {
    execPkgCmdRaw(
      (() => {
        if (cmd === "upgrade") return ["install", "--upgrade", name];
        if (cmd === "update") return ["update"];
        return [cmd, name];
      })(),
      cmd,
    );
  }

  function handleHold(name: string) {
    closeModal();
    const argv = isApk ? ["add", "--no-upgrade", name] : ["flag", "hold", name];
    execPkgCmdRaw(argv, "hold");
  }

  function handleUnhold(name: string) {
    closeModal();
    const argv = isApk ? ["add", "--no-upgrade", name] : ["flag", "user", name];
    execPkgCmdRaw(argv, "unhold");
  }

  function handleUpdateAll() {
    execPkgCmdRaw(isApk ? ["upgrade", "--available"] : ["upgrade"], "update-all");
  }

  function handleUpdateLists() {
    execCmd("update", "");
  }

  // ── display ────────────────────────────────────────

  function applyDisplay() {
    const src = tab === "updates" ? installed : tab === "installed" ? installed : available;
    const rows: any[][] = [];
    const pattern = filter ? new RegExp(filter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig") : null;

    let i18nRegex: RegExp | null = null;
    switch (i18nFilter) {
      case "all":
        i18nRegex = /^luci-i18n-/;
        break;
      case "lang":
        i18nRegex = new RegExp("^luci-i18n-(base-.+|.+-(" + languages.join("|") + "))$");
        break;
    }

    for (const name in src.pkgs) {
      const pkg = src.pkgs[name];
      let desc = pkg.description || "";
      if (!desc && available.pkgs[name]) desc = available.pkgs[name].description || "";
      const descLines = desc.split(/\n/);
      desc = descLines[0].trim() + (descLines.length > 1 ? "…" : "");

      if (pattern && !name.match(pattern) && !desc.match(pattern)) continue;
      if (name.indexOf("luci-i18n-") === 0 && (!i18nRegex || !name.match(i18nRegex))) continue;

      const altsize = !pkg.size && available.pkgs[name] ? available.pkgs[name].size : null;
      let btn: any, ver: string;

      if (tab === "updates") {
        const avail = available.pkgs[name];
        const inst = installed.pkgs[name];
        if (!inst?.installed || !avail || compareVersion(avail.version, pkg.version) <= 0) continue;
        ver = `${pkg.version || "-"} » ${avail.version || "-"}`;
        btn = { label: "Upgrade…", action: "upgrade" };
      } else if (tab === "installed") {
        if (!pkg.installed) continue;
        ver = pkg.version || "-";
        btn = { label: "Remove…", action: "remove" };
      } else {
        const instPkg = installed.pkgs[name];
        ver = pkg.version || "-";
        if (!instPkg?.installed) btn = { label: "Install…", action: "install" };
        else if (instPkg.installed && instPkg.version !== pkg.version) btn = { label: "Upgrade…", action: "upgrade" };
        else btn = { label: "Installed", action: "" };
      }

      rows.push([name, ver, pkg.size || altsize || 0, desc, btn]);
    }

    rows.sort((a, b) => {
      let cmp: number;
      if (sortField === "size") {
        cmp = (a[2] as number) - (b[2] as number);
      } else if (sortField === "version") {
        cmp = compareVersion(a[1] as string, b[1] as string);
      } else {
        cmp = (a[0] as string).localeCompare(b[0] as string);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    currentRows = rows;
    pageOffset = 0;
  }

  let debounceTimer: ReturnType<typeof setTimeout>;

  function onFilterInput() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(applyDisplay, 250);
  }

  function switchTab(t: typeof tab) {
    if (t === tab) return;
    tab = t;
    applyDisplay();
  }

  const pagedRows = $derived(currentRows.slice(pageOffset, pageOffset + PAGE_SIZE));
  const totalPages = $derived(Math.ceil(currentRows.length / PAGE_SIZE));
  const currentPage = $derived(Math.floor(pageOffset / PAGE_SIZE) + 1);

  function goPrevPage() { pageOffset = Math.max(0, pageOffset - PAGE_SIZE); }
  function goNextPage() { pageOffset = Math.min(pageOffset + PAGE_SIZE, Math.max(0, currentRows.length - PAGE_SIZE)); }
  function goPage(pg: number) { pageOffset = (pg - 1) * PAGE_SIZE; }

  function toggleSort(field: typeof sortField) {
    if (sortField === field) {
      sortDir = sortDir === "asc" ? "desc" : "asc";
    } else {
      sortField = field;
      sortDir = "asc";
    }
    applyDisplay();
  }

  // ── lifecycle ──────────────────────────────────────

  async function fetchPkgList(method: "list-installed" | "list-available", dest: PkgMap, installedFlag: boolean): Promise<boolean> {
    // Try multiple methods in order of preference
    // 1. cgiExec with package-manager-call (bypasses UBUS output limits)
    const cgi = await cgiExec("/usr/libexec/package-manager-call", [method]);
    if (cgi) {
      parsePmcJson(cgi, dest, installedFlag);
      if (Object.keys(dest.pkgs).length > 0) return true;
    }

    // 2. execCommand with package-manager-call (via UBUS file.exec)
    const pmc = await execCommand("/usr/libexec/package-manager-call", [method]);
    if (pmc && pmc.code === 0 && pmc.stdout) {
      parsePmcJson(pmc.stdout, dest, installedFlag);
      if (Object.keys(dest.pkgs).length > 0) return true;
    }

    // 3. Direct native package manager binaries
    if (isApk) {
      if (method === "list-installed") {
        const apk = await cgiExec("/sbin/apk", ["info"]);
        if (apk) {
          const lines = apk.trim().split("\n");
          for (const line of lines) {
            const p = line.trim();
            if (!p) continue;
            dest.pkgs[p] = { name: p, version: "?", installed: true };
            dest.providers[p] = [dest.pkgs[p]];
          }
          if (Object.keys(dest.pkgs).length > 0) return true;
        }
        const apk2 = await execCommand("/sbin/apk", ["info"]);
        if (apk2?.stdout) {
          const lines = apk2.stdout.trim().split("\n");
          for (const line of lines) {
            const p = line.trim();
            if (!p) continue;
            dest.pkgs[p] = { name: p, version: "?", installed: true };
            dest.providers[p] = [dest.pkgs[p]];
          }
          if (Object.keys(dest.pkgs).length > 0) return true;
        }
      } else {
        const apk = await cgiExec("/sbin/apk", ["list"]);
        if (apk) {
          for (const line of apk.trim().split("\n")) {
            const m = line.match(/^(\S+)\s+(.+?)\s+(.+)$/);
            if (m) {
              dest.pkgs[m[1]] = { name: m[1], version: m[2], repository: m[3] };
              dest.providers[m[1]] = [dest.pkgs[m[1]]];
            }
          }
          if (Object.keys(dest.pkgs).length > 0) return true;
        }
      }
    } else {
      const bin = method === "list-installed" ? "/bin/opkg" : "/bin/opkg";
      const args = method === "list-installed" ? ["list-installed"] : ["list"];
      const opkg = await cgiExec(bin, args);
      if (opkg) {
        for (const line of opkg.trim().split("\n")) {
          const m = line.match(/^(\S+)\s*-\s*(\S+)\s*-\s*(.+)$/);
          if (m) {
            dest.pkgs[m[1]] = { name: m[1], version: m[2], description: m[3], ...(installedFlag ? { installed: true } : {}) };
            dest.providers[m[1]] = [dest.pkgs[m[1]]];
          }
        }
        if (Object.keys(dest.pkgs).length > 0) return true;
      }
    }

    // 4. Read database files directly (APK only)
    if (method === "list-installed") {
      const db = await readFile("/lib/apk/db/installed");
      if (db?.data) {
        parseApkDb(db.data, dest, true);
        if (Object.keys(dest.pkgs).length > 0) return true;
      }
    }

    return false;
  }

  async function refreshLists() {
    loading = true;
    try {
      const [mountsRes, features] = await Promise.all([
        call<{ result: any[] }>("luci", "getMountPoints", {}),
        getSystemFeatures(),
      ]);
      isApk = features?.apk === true;

      const mounts = mountsRes?.result;

      // ── Installed packages ──────────────────────
      await fetchPkgList("list-installed", installed, true);

      // ── Available packages ──────────────────────
      await fetchPkgList("list-available", available, false);

      // post-process
      const langs = new Set(["en"]);
      for (const pn in installed.pkgs) {
        if (pn.indexOf("luci-i18n-base-") === 0) langs.add(pn.substring(15));
      }
      languages = [...langs];
      if (mounts?.length) {
        const root = mounts
          .filter((m: any) => m.mount === "/" || m.mount === "/overlay")
          .sort((a: any, b: any) => a.mount > b.mount ? 1 : -1)[0];
        if (root) { diskTotal = root.size; diskFree = root.free; }
      }
      applyDisplay();
    } catch (err) {
      console.error("refreshLists error", err);
    }
    loading = false;
  }

  const diskUsed = $derived(diskTotal - diskFree);
  const diskPct = $derived(diskTotal > 0 ? Math.round((diskUsed / diskTotal) * 100) : 0);

  const tabCounts = $derived.by(() => {
    let i18nRegex: RegExp | null = null;
    switch (i18nFilter) {
      case "all": i18nRegex = /^luci-i18n-/; break;
      case "lang": i18nRegex = new RegExp("^luci-i18n-(base-.+|.+-(" + languages.join("|") + "))$"); break;
    }
    let avail = 0, inst = 0, updates = 0;
    for (const n in available.pkgs) {
      if (n.indexOf("luci-i18n-") === 0 && (!i18nRegex || !n.match(i18nRegex))) continue;
      avail++;
    }
    for (const n in installed.pkgs) {
      if (!installed.pkgs[n]?.installed) continue;
      if (n.indexOf("luci-i18n-") === 0 && (!i18nRegex || !n.match(i18nRegex))) continue;
      inst++;
      const a = available.pkgs[n];
      if (a && compareVersion(a.version, installed.pkgs[n].version) > 0) updates++;
    }
    return { available: avail, installed: inst, updates };
  });

  function formatSize(size: number): string {
    return fmtBytes(size).replace(" ", "");
  }

  // URL query
  let queryParam = $state("");

  onMount(async () => {
    const m = window.location.search.match(/\bquery=([^&=]+)\b/);
    if (m) {
      queryParam = decodeURIComponent(m[1]);
      filter = queryParam;
    }
    await refreshLists();
  });
  onDestroy(() => { clearTimeout(debounceTimer); clearTimeout((handleInput as any)._t); });
</script>

<div class={cn("p-6", "flex", "flex-col", "h-dvh", "gap-4", "animate-fade-in", "overflow-hidden")}>
  <!-- Header -->
  <div class={cn("shrink-0", "space-y-2")}>
    <div class={cn("flex", "items-center", "gap-3")}>
      <div class={cn("w-9", "h-9", "rounded-xl", "bg-accent/10", "flex", "items-center", "justify-center", "ring-1", "ring-accent/20", "shrink-0")}>
        <Package size={16} class="text-accent" />
      </div>
      <div>
        <h1 class={cn("text-lg", "font-semibold", "text-white", "tracking-tight")}>{trans("Software")}</h1>
        <p class={cn("text-xs", "text-muted")}>
          {trans("Install additional software and upgrade existing packages with {pkg}.").replace("{pkg}", pkgMgr)}
        </p>
      </div>
    </div>

    <!-- Warning -->
    <div class={cn("flex", "items-start", "gap-2", "p-3", "rounded-lg", "bg-warn/5", "border", "border-warn/10")}>
      <AlertTriangle size={14} class="text-warn shrink-0 mt-0.5" />
      <p class={cn("text-[11px]", "text-warn/80")}>
        {trans("Package operations can break your system. Proceed with caution.")}
      </p>
    </div>
  </div>

  <!-- Controls -->
  <div class={cn("shrink-0", "glass", "p-4", "rounded-xl", "space-y-3")}>
    <!-- Row 1: Disk + Actions -->
    <div class={cn("flex", "flex-wrap", "items-center", "gap-4")}>
      <div class={cn("flex", "items-center", "gap-3", "flex-1", "min-w-48")}>
        <div class={cn("w-8", "h-8", "rounded-lg", "bg-surface-3", "flex", "items-center", "justify-center", "shrink-0")}>
          <HardDrive size={14} class="text-muted" />
        </div>
        <div class={cn("flex-1", "min-w-0")}>
          <div class={cn("flex", "items-center", "justify-between", "mb-1")}>
            <span class={cn("text-[10px]", "font-medium", "text-muted", "uppercase", "tracking-wider")}>{trans("Disk space")}</span>
            <span class={cn("text-[10px]", "font-mono", "text-muted")}>{fmtBytes(diskUsed)} / {fmtBytes(diskTotal)}</span>
          </div>
          <div class={cn("h-2", "rounded-full", "bg-surface-3", "overflow-hidden", "ring-1", "ring-inset", "ring-white/5")} title={`${fmtBytes(diskUsed)} used (${diskPct}%), ${fmtBytes(diskFree)} free`}>
            <div
              class={cn("h-full", "rounded-full", "transition-all", "duration-1000", "ease-out", "relative", "overflow-hidden")}
              style="width: {diskPct}%; background: {diskPct > 80 ? 'var(--danger)' : diskPct > 60 ? 'var(--warn)' : 'var(--accent)'}"
            >
              <div class={cn("absolute", "inset-0", "bg-gradient-to-r", "from-transparent", "via-white/15", "to-transparent", "animate-shimmer")}></div>
            </div>
          </div>
        </div>
      </div>

      <div class={cn("flex", "items-center", "gap-1.5")}>
        <button onclick={handleUpdateLists} disabled={operating} class={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium border transition-all duration-150 cursor-pointer active:scale-95",
          "text-accent bg-accent/8 border-accent/15 hover:bg-accent/15 hover:border-accent/25 disabled:opacity-40 disabled:cursor-not-allowed",
        )}>
          <RefreshCw size={12} />
          {trans("Update lists…")}
        </button>
        {#if tab === "updates" && tabCounts.updates > 0}
          <button onclick={handleUpdateAll} disabled={operating} class={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium border transition-all duration-150 cursor-pointer active:scale-95",
            "text-accent bg-accent/8 border-accent/15 hover:bg-accent/15 hover:border-accent/25 disabled:opacity-40 disabled:cursor-not-allowed",
          )}>
            <RefreshCw size={12} />
            {trans("Upgrade All ({n})").replace("{n}", String(tabCounts.updates))}
          </button>
        {/if}
        <button onclick={handleUpload} disabled={operating} class={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium border transition-all duration-150 cursor-pointer active:scale-95",
          "text-accent bg-accent/8 border-accent/15 hover:bg-accent/15 hover:border-accent/25 disabled:opacity-40 disabled:cursor-not-allowed",
        )}>
          <Upload size={12} />
          {trans("Upload Package…")}
        </button>
        <button onclick={handleConfig} disabled={operating} class={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium border border-border transition-all duration-150 cursor-pointer active:scale-95",
          "text-muted bg-surface-2 hover:bg-surface-3 hover:text-fg disabled:opacity-40 disabled:cursor-not-allowed",
        )}>
          <Settings size={12} />
          {trans("Configure {mgr}").replace("{mgr}", pkgMgr)}
        </button>
      </div>
    </div>

    <!-- Row 2: Filter + Install -->
    <div class={cn("flex", "flex-wrap", "items-end", "gap-3")}>
      <div class={cn("flex-1", "min-w-40")}>
        <label class={cn("block", "text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider", "mb-1.5")}>
          {trans("Filter")}
        </label>
        <div class={cn("flex", "gap-1.5")}>
          <div class={cn("relative", "flex-1")}>
            <Search size={12} class={cn("absolute", "left-2.5", "top-1/2", "-translate-y-1/2", "text-muted", "pointer-events-none")} />
            <input
              type="text"
              bind:this={filterInput}
              bind:value={filter}
              oninput={onFilterInput}
              placeholder={trans("Type to filter…")}
              class={cn(
                "w-full pl-7 pr-2 py-1.5 border text-xs rounded-lg",
                "bg-surface outline-none transition-all duration-150",
                "border-border text-fg placeholder:text-muted/50",
                "focus:border-(--accent) focus:shadow-[0_0_0_1px_var(--accent)]",
              )}
            />
          </div>
          <button onclick={handleReset} class={cn(
            "px-3 py-1.5 text-xs rounded-lg font-medium border border-border transition-all duration-150 cursor-pointer",
            "text-muted bg-surface-2 hover:bg-surface-3 hover:text-fg active:scale-95",
          )}>
            {trans("Clear")}
          </button>
        </div>
      </div>

      <div>
        <label class={cn("block", "text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider", "mb-1.5")}>
          {trans("Download and install package")}
        </label>
        <div class={cn("flex", "gap-1.5")}>
          <input
            type="text"
            placeholder={trans("Package name or URL…")}
            onkeydown={(e: KeyboardEvent) => { if (e.key === "Enter") handleManualInstall(); }}
            class={cn(
              "w-44 px-2.5 py-1.5 border text-xs rounded-lg",
              "bg-surface outline-none transition-all duration-150",
              "border-border text-fg placeholder:text-muted/50 font-mono",
              "focus:border-(--accent) focus:shadow-[0_0_0_1px_var(--accent)]",
            )}
          />
          <button onclick={handleManualInstall} disabled={operating} class={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium border transition-all duration-150 cursor-pointer active:scale-95",
            "text-accent bg-accent/8 border-accent/15 hover:bg-accent/15 hover:border-accent/25 disabled:opacity-40 disabled:cursor-not-allowed",
          )}>
            {trans("OK")}
          </button>
        </div>
      </div>
    </div>

    <!-- Row 3: i18n filter -->
    <div>
      <label class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider", "block", "mb-1.5")}>
        <Globe size={10} class="inline mr-1" />
        {trans("Display LuCI translation packages")}
      </label>
      <div class={cn("flex", "flex-wrap", "items-center", "gap-3", "text-xs")}>
        {#each [
          { value: "lang" as const, label: trans("filtered"), tooltip: "Display base translation packages and translation packages for already installed languages only" },
          { value: "all" as const, label: trans("all"), tooltip: "Display all available translation packages" },
          { value: "none" as const, label: trans("none"), tooltip: "Hide all translation packages" },
        ] as opt}
          <label class={cn("flex", "items-center", "gap-1.5", "cursor-pointer", "text-muted", "hover:text-fg")} title={opt.tooltip}>
            <input
              type="radio"
              name="i18n_filter"
              value={opt.value}
              checked={i18nFilter === opt.value}
              onchange={() => { i18nFilter = opt.value; applyDisplay(); }}
              class={cn("accent-(--accent)")}
            />
            {opt.label}
          </label>
        {/each}
      </div>
    </div>
  </div>

  <!-- Tab bar -->
  <div class={cn("shrink-0", "flex", "gap-1", "w-fit", "p-0.5", "border", "rounded-lg", "bg-surface-2", "border-border", "animate-slide-up")}>
    {#each [
      { id: "available" as const, label: trans("Available") },
      { id: "installed" as const, label: trans("Installed") },
      { id: "updates" as const, label: trans("Updates") },
    ] as t}
      <button
        class={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md font-medium transition-all duration-150 cursor-pointer",
          tab === t.id
            ? "bg-accent text-surface shadow-sm shadow-accent/20"
            : "bg-transparent text-muted hover:text-fg",
        )}
        onclick={() => switchTab(t.id)}
      >
        {t.label}
        <span class={cn(
          "ml-0.5 text-[10px] px-1.5 py-0.5 rounded font-medium",
          tab === t.id ? "bg-white/15 text-surface" : "bg-surface-3 text-muted",
        )}>
          {t.id === "updates" ? tabCounts.updates : tabCounts[t.id].toLocaleString()}
        </span>
      </button>
    {/each}
  </div>

  <!-- Table -->
  {#if loading}
    <div class={cn("flex-1", "flex", "items-center", "justify-center")}>
      <div class={cn("flex", "flex-col", "items-center", "gap-3")}>
        <div class={cn("relative")}>
          <div class={cn("w-10", "h-10", "rounded-xl", "bg-surface-3", "animate-pulse", "flex", "items-center", "justify-center")}>
            <Package size={18} class="text-accent/40" />
          </div>
          <div class={cn("absolute", "-top-1", "-right-1", "w-3", "h-3", "rounded-full", "bg-accent/30", "animate-ping")}></div>
        </div>
        <span class={cn("text-xs", "text-muted", "animate-pulse")}>{trans("Loading package information…")}</span>
      </div>
    </div>
  {:else}
    <!-- Pager top -->
    <div class={cn("shrink-0", "flex", "items-center", "justify-center")}>
      <div class={cn("inline-flex", "items-center", "gap-2", "px-3", "py-1", "rounded-lg", "bg-surface-2", "border", "border-border")}>
        <button onclick={goPrevPage} disabled={pageOffset < 100} class={cn(
          "px-2 py-1 text-xs rounded-md font-medium border transition-all duration-150",
          pageOffset < 100
            ? "text-muted/30 bg-surface-3 border-border cursor-not-allowed"
            : "text-muted bg-surface-2 border-border hover:bg-surface-3 cursor-pointer active:scale-95",
        )}>
          <ArrowLeft size={12} />
        </button>
        <span class={cn("text-xs", "text-muted", "tabular-nums")}>
          {currentRows.length
            ? trans("Displaying {n}-{m} of {total}").replace("{n}", String(pageOffset + 1)).replace("{m}", String(Math.min(pageOffset + PAGE_SIZE, currentRows.length))).replace("{total}", String(currentRows.length))
            : trans("No packages")}
        </span>
        <button onclick={goNextPage} disabled={pageOffset + PAGE_SIZE >= currentRows.length} class={cn(
          "px-2 py-1 text-xs rounded-md font-medium border transition-all duration-150",
          pageOffset + PAGE_SIZE >= currentRows.length
            ? "text-muted/30 bg-surface-3 border-border cursor-not-allowed"
            : "text-muted bg-surface-2 border-border hover:bg-surface-3 cursor-pointer active:scale-95",
        )}>
          <ArrowRight size={12} />
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class={cn("flex-1", "min-h-0", "rounded-xl", "overflow-hidden")}>
      <div class={cn("glass", "rounded-xl", "h-full", "overflow-y-auto")}>
        <table class={cn("w-full", "text-xs")}>
          <thead class={cn("sticky", "top-0", "z-10")}>
            <tr class={cn("border-b", "border-border", "bg-surface-2/95", "backdrop-blur-sm")}>
              <th onclick={() => toggleSort("name")} class={cn("text-left", "p-3", "text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider", "cursor-pointer", "hover:text-white", "select-none")}>
                <span class={cn("inline-flex", "items-center", "gap-1")}>
                  {trans("Package name")}
                  {#if sortField === "name" && sortDir === "asc"}<ArrowUp size={10} class="text-accent" />{/if}
                  {#if sortField === "name" && sortDir === "desc"}<ArrowDown size={10} class="text-accent" />{/if}
                </span>
              </th>
              <th onclick={() => toggleSort("version")} class={cn("text-left", "p-3", "text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider", "hidden", "sm:table-cell", "cursor-pointer", "hover:text-white", "select-none")}>
                <span class={cn("inline-flex", "items-center", "gap-1")}>
                  {trans("Version")}
                  {#if sortField === "version" && sortDir === "asc"}<ArrowUp size={10} class="text-accent" />{/if}
                  {#if sortField === "version" && sortDir === "desc"}<ArrowDown size={10} class="text-accent" />{/if}
                </span>
              </th>
              <th onclick={() => toggleSort("size")} class={cn("text-center", "p-3", "text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider", "hidden", "md:table-cell", "cursor-pointer", "hover:text-white", "select-none")}>
                <span class={cn("inline-flex", "items-center", "gap-1")}>
                  {trans("Size ({ext})").replace("{ext}", isApk ? ".apk" : ".ipk")}
                  {#if sortField === "size" && sortDir === "asc"}<ArrowUp size={10} class="text-accent" />{/if}
                  {#if sortField === "size" && sortDir === "desc"}<ArrowDown size={10} class="text-accent" />{/if}
                </span>
              </th>
              <th class={cn("text-left", "p-3", "text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider", "hidden", "lg:table-cell")}>{trans("Description")}</th>
              <th class={cn("text-right", "p-3", "text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {#each pagedRows as [name, version, size, desc, btn], i}
              <tr
                class={cn(
                  "border-b border-border/50 transition-all duration-150 cursor-pointer group",
                  "hover:bg-surface-1/60",
                  i % 2 === 0 ? "bg-surface-1/20" : "bg-transparent",
                )}
                onclick={() => showDetail(name)}
                style="animation: slideUp 0.2s ease-out {i * 15}ms both;"
              >
                <td class={cn("p-3", "font-medium", "text-white", "truncate", "max-w-0")}>
                  <div class={cn("flex", "items-center", "gap-2")}>
                    <span class={cn("truncate", "block")}>{@html name}</span>
                  </div>
                </td>
                <td class={cn("p-3", "font-mono", "hidden", "sm:table-cell", "truncate", "max-w-40")}>
                  {#if btn.action === "upgrade"}
                    <span class={cn("text-accent", "text-[10px]")}>{@html version}</span>
                  {:else}
                    <span class={cn("text-muted")}>{version}</span>
                  {/if}
                </td>
                <td class={cn("p-3", "text-center", "text-muted", "font-mono", "hidden", "md:table-cell")}>
                  {size ? formatSize(size) : "-"}
                </td>
                <td class={cn("p-3", "text-muted", "truncate", "max-w-0", "hidden", "lg:table-cell")}>
                  <span class={cn("truncate", "block", "text-[11px]")}>{@html desc || "-"}</span>
                </td>
                <td class={cn("p-3", "text-right")}>
                  {#if btn.action === "install"}
                    <button onclick={(e: MouseEvent) => { e.stopPropagation(); showDetail(name); }} class={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1 text-[10px] rounded-md font-medium border transition-all duration-150 cursor-pointer active:scale-95",
                      "text-accent bg-accent/8 border-accent/15 hover:bg-accent/15 hover:border-accent/25",
                    )}>
                      <Download size={10} />
                      {trans("Install…")}
                    </button>
                  {:else if btn.action === "upgrade"}
                    <button onclick={(e: MouseEvent) => { e.stopPropagation(); showDetail(name); }} class={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1 text-[10px] rounded-md font-medium border transition-all duration-150 cursor-pointer active:scale-95",
                      "text-accent bg-accent/8 border-accent/15 hover:bg-accent/15 hover:border-accent/25",
                    )}>
                      <RefreshCw size={10} />
                      {trans("Upgrade…")}
                    </button>
                  {:else if btn.action === "remove"}
                    <button onclick={(e: MouseEvent) => { e.stopPropagation(); handleRemoveModal(name); }} class={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1 text-[10px] rounded-md font-medium border transition-all duration-150 cursor-pointer active:scale-95",
                      "text-danger bg-danger/8 border-danger/15 hover:bg-danger/15 hover:border-danger/25",
                    )}>
                      <Trash2 size={10} />
                      {trans("Remove…")}
                    </button>
                  {:else}
                    <span class={cn("inline-flex", "items-center", "gap-1", "px-2", "py-1", "text-[10px]", "font-medium", "text-accent/60")}>
                      <CheckCircle2 size={10} />
                      {trans("Installed")}
                    </span>
                  {/if}
                </td>
              </tr>
            {:else}
              <tr>
                <td colspan="5">
                  <div class={cn("flex", "flex-col", "items-center", "gap-3", "py-12", "text-center")}>
                    <div class={cn("w-10", "h-10", "rounded-xl", "bg-surface-3", "flex", "items-center", "justify-center")}>
                      <Package size={16} class="text-muted" />
                    </div>
                    <div>
                      <p class={cn("text-sm", "font-medium", "text-muted")}>
                        {filter
                          ? trans("No packages matching \"{filter}\".").replace("{filter}", filter)
                          : trans("No packages")}
                      </p>
                      {#if filter}
                        <button onclick={handleReset} class={cn("text-xs", "text-accent", "hover:underline", "mt-1", "cursor-pointer")}>{trans("Reset")}</button>
                      {/if}
                    </div>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Pager bottom -->
    <div class={cn("shrink-0", "flex", "items-center", "justify-center")}>
      <div class={cn("inline-flex", "items-center", "gap-2", "px-3", "py-1", "rounded-lg", "bg-surface-2", "border", "border-border")}>
        <button onclick={goPrevPage} disabled={pageOffset < 100} class={cn(
          "px-2 py-1 text-xs rounded-md font-medium border transition-all duration-150",
          pageOffset < 100
            ? "text-muted/30 bg-surface-3 border-border cursor-not-allowed"
            : "text-muted bg-surface-2 border-border hover:bg-surface-3 cursor-pointer active:scale-95",
        )}>
          <ArrowLeft size={12} />
        </button>
        <span class={cn("text-xs", "text-muted", "tabular-nums")}>
          {currentRows.length
            ? trans("Displaying {n}-{m} of {total}").replace("{n}", String(pageOffset + 1)).replace("{m}", String(Math.min(pageOffset + PAGE_SIZE, currentRows.length))).replace("{total}", String(currentRows.length))
            : trans("No packages")}
        </span>
        <button onclick={goNextPage} disabled={pageOffset + PAGE_SIZE >= currentRows.length} class={cn(
          "px-2 py-1 text-xs rounded-md font-medium border transition-all duration-150",
          pageOffset + PAGE_SIZE >= currentRows.length
            ? "text-muted/30 bg-surface-3 border-border cursor-not-allowed"
            : "text-muted bg-surface-2 border-border hover:bg-surface-3 cursor-pointer active:scale-95",
        )}>
          <ArrowRight size={12} />
        </button>
      </div>
    </div>
  {/if}
</div>

<!-- Modal -->
{#if modalOpen}
  <div
    class={cn("fixed", "inset-0", "z-50", "flex", "items-center", "justify-center", "p-4")}
    style="background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);"
    onclick={(e: MouseEvent) => { if (e.target === e.currentTarget) closeModal(); }}
  >
    <div
      class={cn("glass", "p-5", "rounded-xl", "max-w-lg", "w-full", "animate-slide-up", "max-h-[85vh]", "overflow-y-auto", "shadow-2xl")}
      onclick={(e: MouseEvent) => e.stopPropagation()}
    >
      <div class={cn("flex", "items-center", "justify-between", "mb-4")}>
        <h3 class={cn("text-sm", "font-semibold", "text-white", "truncate", "flex", "items-center", "gap-2")}>
          {@html modalTitleHtml}
        </h3>
        <button onclick={closeModal} class={cn("p-1.5", "rounded-lg", "text-muted", "hover:text-white", "hover:bg-surface-3", "transition-all", "duration-150", "cursor-pointer", "shrink-0")}>
          <XCircle size={14} />
        </button>
      </div>
      <div>{@html typeof modalBody === "string" ? modalBody : ""}</div>
      {#if modalActions.length > 0}
        <div class={cn("flex", "items-center", "justify-end", "gap-2", "mt-4", "pt-3", "border-t", "border-border")}>
          {#each modalActions as a}
            <button onclick={a.action} class={cn(
              "px-3 py-1.5 text-xs rounded-lg font-medium border transition-all duration-150 cursor-pointer active:scale-95",
              a.danger
                ? "text-danger bg-danger/8 border-danger/15 hover:bg-danger/15 hover:border-danger/25"
                : a.accent
                  ? "text-accent bg-accent/8 border-accent/15 hover:bg-accent/15 hover:border-accent/25"
                  : "text-muted bg-surface-2 border-border hover:bg-surface-3 hover:text-fg",
            )}>
              {a.label}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  :global(.scrollbar-thin)::-webkit-scrollbar { width: 4px; }
  :global(.scrollbar-thin)::-webkit-scrollbar-track { background: transparent; }
  :global(.scrollbar-thin)::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
  :global(.scrollbar-thin)::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.12); }
</style>
