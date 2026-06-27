<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { flip } from "svelte/animate";
  import { slide } from "svelte/transition";
  import { X, Play, Square, RefreshCw, Plus, Trash2, Eye, FileText, Download, GripVertical, Globe } from "@lucide/svelte";
  import { cn } from "../helpers/classname";
  import Input from "../components/Input/index.svelte";
  import Select from "../components/Select/index.svelte";
  import Toggle from "../components/Toggle/index.svelte";
  import NetworkSelect from "../components/NetworkSelect/index.svelte";
  import DeviceSelect from "../components/DeviceSelect/index.svelte";
  import FileUpload from "../components/FileUpload/index.svelte";
  import { t as _t, getLocale, onLocaleChange } from "../i18n";
  import {
    uciGet,
    uciSet,
    uciSetSection,
    uciCommit,
    uciAdd,
    callDdnsGetState,
    callDdnsGetEnv,
    callDdnsGetServicesStatus,
    callDdnsGetLog,
    callSetInitAction,
    ddnsServiceInstall,
    ddnsServiceUpdateList,
    ddnsStopService,
    ddnsReloadService,
    readFile,
    listDir,
    execCommand,
    type DdnsState,
    type DdnsEnv,
    type DdnsServiceStatus,
  } from "../api/ubus";

  let locale = $state(getLocale());
  let trans = $derived.by(() => { locale; return (k: string) => _t(k); });
  $effect(() => onLocaleChange(() => { locale = getLocale(); }));

  // ── Data ──
  let status = $state<DdnsState | null>(null);
  let env = $state<DdnsEnv | null>(null);
  let servicesStatus = $state<Record<string, DdnsServiceStatus>>({} as Record<string, DdnsServiceStatus>);
  let uciConfig: any = $state(null);
  let providerServices = $state<Record<string, boolean>>({});
  let providerServicesData = $state<Record<string, any>>({});
  let saving = $state(false);
  let saveFeedback = $state("");
  let logContent = $state("");

  // ── Edit modal state ──
  let serviceAvailable = $state(true);
  let serviceSupported = $state(true);
  let serviceUpdateUrl = $state<string | null>(null);
  let editValidationErrors = $state<string[]>([]);

  // ── UI state ──
  let tab = $state<"info" | "global" | "services">("info");
  let showAddModal = $state(false);
  let editSectionId = $state<string | null>(null);
  let editTab = $state<"basic" | "advanced" | "timer" | "logview">("basic");

  // ── Global settings form ──
  let g = $state({
    upd_privateip: false,
    ddns_dateformat: "%F %R",
    ddns_rundir: "/var/run/ddns",
    ddns_logdir: "/var/log/ddns",
    ddns_loglines: "250",
    use_curl: false,
    cacert: "",
    services_url: "",
  });

  // ── Add service form ──
  let addForm = $state({
    name: "",
    use_ipv6: "0",
    service_name: "-",
  });
  let addServiceSupported = $state(true);

  // ── Edit service form ──
  interface ServiceForm {
    enabled: boolean;
    lookup_host: string;
    use_ipv6: string;
    service_name: string;
    update_url: string;
    update_script: string;
    domain: string;
    username: string;
    password: string;
    param_enc: string;
    param_opt: string;
    use_https: boolean;
    cacert: string;
    ip_source: string;
    ip_network: string;
    ip_url: string;
    ip_interface: string;
    ip_script: string;
    interface: string;
    bind_network: string;
    force_ipversion: boolean;
    dns_server: string;
    force_dnstcp: boolean;
    proxy: string;
    use_syslog: string;
    use_logfile: boolean;
    check_interval: string;
    check_unit: string;
    force_interval: string;
    force_unit: string;
    retry_max_count: string;
    retry_interval: string;
    retry_unit: string;
  }

  let editForm = $state<ServiceForm>({
    enabled: true, lookup_host: "", use_ipv6: "0", service_name: "-",
    update_url: "", update_script: "", domain: "", username: "", password: "",
    param_enc: "", param_opt: "", use_https: false, cacert: "",
    ip_source: "network", ip_network: "wan", ip_url: "", ip_interface: "", ip_script: "",
    interface: "", bind_network: "", force_ipversion: false, dns_server: "", force_dnstcp: false,
    proxy: "", use_syslog: "2", use_logfile: true,
    check_interval: "10", check_unit: "minutes", force_interval: "72", force_unit: "hours",
    retry_max_count: "0", retry_interval: "60", retry_unit: "seconds",
  });

  // ── Original values for switch check ──
  let originalServiceName = $state("");
  let originalUseIpv6 = $state("0");

  // ── Drag state ──
  let dragSectionId = $state<string | null>(null);

  // ── Service sections from UCI ──
  let serviceSections = $state<string[]>([]);
  let pollInterv: ReturnType<typeof setInterval>;

  // ── Helpers ──
  const nextUpdateLabels: Record<string, string> = {
    Verify: "Verify",
    "Run once": "Run once",
    Disabled: "Disabled",
    Stopped: "Stopped",
  };

  const timeRes: Record<string, number> = {
    seconds: 1, minutes: 60, hours: 3600,
  };

  // ── Load data ──
  const load = async () => {
    const [st, ev, ss, uci] = await Promise.all([
      callDdnsGetState(),
      callDdnsGetEnv(),
      callDdnsGetServicesStatus(),
      uciGet("ddns").catch(() => null),
    ]);
    if (st) status = st;
    if (ev) env = ev;
    if (ss) servicesStatus = ss;
    if (uci) {
      uciConfig = uci;
      const sections = Object.values(uci.values || {}) as any[];
      serviceSections = sections
        .filter((s: any) => s[".type"] === "service")
        .map((s: any) => s[".name"]);

      // Load global settings
      const globalSec = sections.find((s: any) => s[".type"] === "ddns");
      if (globalSec) {
        g.upd_privateip = globalSec.upd_privateip === "1";
        g.ddns_dateformat = globalSec.ddns_dateformat || "%F %R";
        g.ddns_rundir = globalSec.ddns_rundir || "/var/run/ddns";
        g.ddns_logdir = globalSec.ddns_logdir || "/var/log/ddns";
        g.ddns_loglines = globalSec.ddns_loglines || "250";
        g.use_curl = globalSec.use_curl === "1";
        g.cacert = globalSec.cacert || "";
        g.services_url = globalSec.services_url || "";
      }
    }
    await loadProviderServices();
  };

  const loadProviderServices = async () => {
    const [def, cust, listData] = await Promise.all([
      listDir("/usr/share/ddns/default").catch(() => null),
      listDir("/usr/share/ddns/custom").catch(() => null),
      readFile("/usr/share/ddns/list").catch(() => null),
    ]);
    const svcs: Record<string, boolean> = {};
    const svcData: Record<string, any> = {};
    const loadJson = async (dir: string, entries: any[]) => {
      for (const e of entries) {
        const name = e.name.replace(".json", "");
        svcs[name] = true;
        const raw = await readFile(`${dir}/${e.name}`).catch(() => null);
        if (raw?.data) try { svcData[name] = JSON.parse(raw.data); } catch {}
      }
    };
    if (def?.entries) await loadJson("/usr/share/ddns/default", def.entries);
    if (cust?.entries) await loadJson("/usr/share/ddns/custom", cust.entries);
    const listLines = listData?.data?.split("\n").filter(Boolean) || [];
    listLines.forEach((s: string) => { if (svcs[s] === undefined) svcs[s] = false; });
    providerServices = svcs;
    providerServicesData = svcData;
  };

  // ── Poll ──
  const pollStatus = async () => {
    const [st, ss] = await Promise.all([
      callDdnsGetState(),
      callDdnsGetServicesStatus(),
    ]);
    if (st) status = st;
    if (ss) servicesStatus = ss;
  };

  // ── Actions ──
  const handleToggleDdns = async () => {
    const action = status?._enabled ? "disable" : "enable";
    await callSetInitAction("ddns", action);
    await callSetInitAction("ddns", action === "enable" ? "start" : "stop");
    await load();
  };

  const handleRestartDdns = async () => {
    await callSetInitAction("ddns", "restart");
    await load();
  };

  const handleRefreshServicesList = async () => {
    await ddnsServiceUpdateList();
    await load();
  };

  const getServiceData = async (service: string): Promise<any> => {
    const [cust, def] = await Promise.all([
      readFile(`/usr/share/ddns/custom/${service}.json`).catch(() => null),
      readFile(`/usr/share/ddns/default/${service}.json`).catch(() => null),
    ]);
    const raw = cust?.data || def?.data || null;
    return raw ? JSON.parse(raw) : null;
  };

  const handleAddService = async () => {
    if (!addForm.name) return;
    saving = true;
    try {
      await uciAdd("ddns", "service", addForm.name);
      if (addForm.service_name !== "-") {
        await uciSet("ddns", addForm.name, { service_name: addForm.service_name });
      }
      await uciSet("ddns", addForm.name, { use_ipv6: addForm.use_ipv6 });
      await uciCommit("ddns");
      showAddModal = false;
      addForm = { name: "", use_ipv6: "0", service_name: "-" };
      await load();
    } catch { saveFeedback = "Failed to add service"; }
    saving = false;
  };

  const handleCheckService = async (svc: string, ipv6: string) => {
    if (svc === "-") { addServiceSupported = true; return; }
    const data = await getServiceData(svc);
    if (!data) { addServiceSupported = false; return; }
    if (ipv6 === "1" && !data.ipv6) { addServiceSupported = false; return; }
    addServiceSupported = true;
  };

  const openEdit = async (sectionId: string) => {
    editSectionId = sectionId;
    editTab = "basic";
    editValidationErrors = [];
    const sections = Object.values(uciConfig?.values || {}) as any[];
    const sec = sections.find((s: any) => s[".name"] === sectionId) || {};
    editForm = {
      enabled: sec.enabled === "1",
      lookup_host: sec.lookup_host || "",
      use_ipv6: sec.use_ipv6 || "0",
      service_name: sec.service_name || "-",
      update_url: sec.update_url || "",
      update_script: sec.update_script || "",
      domain: sec.domain || "",
      username: sec.username || "",
      password: sec.password || "",
      param_enc: sec.param_enc || "",
      param_opt: sec.param_opt || "",
      use_https: sec.use_https === "1",
      cacert: sec.cacert || "",
      ip_source: sec.ip_source || "network",
      ip_network: sec.ip_network || "wan",
      ip_url: sec.ip_url || "",
      ip_interface: sec.ip_interface || "",
      ip_script: sec.ip_script || "",
      interface: sec.interface || "",
      bind_network: sec.bind_network || "",
      force_ipversion: sec.force_ipversion === "1",
      dns_server: sec.dns_server || "",
      force_dnstcp: sec.force_dnstcp === "1",
      proxy: sec.proxy || "",
      use_syslog: sec.use_syslog || "2",
      use_logfile: sec.use_logfile !== "0",
      check_interval: sec.check_interval || "10",
      check_unit: sec.check_unit || "minutes",
      force_interval: sec.force_interval || "72",
      force_unit: sec.force_unit || "hours",
      retry_max_count: sec.retry_max_count || "0",
      retry_interval: sec.retry_interval || "60",
      retry_unit: sec.retry_unit || "seconds",
    };
    originalServiceName = editForm.service_name;
    originalUseIpv6 = editForm.use_ipv6;
    logContent = "";
    await checkServiceData(editForm.service_name, editForm.use_ipv6);
  };

  const checkServiceData = async (service: string, ipv6: string) => {
    if (service === "-") { serviceAvailable = true; serviceSupported = true; serviceUpdateUrl = null; return; }
    const data = providerServicesData[service];
    if (!data) { serviceAvailable = false; serviceSupported = true; serviceUpdateUrl = null; return; }
    serviceAvailable = true;
    if (ipv6 === "1" && !data.ipv6) { serviceSupported = false; serviceUpdateUrl = null; return; }
    serviceSupported = true;
    serviceUpdateUrl = ipv6 === "1" ? (data.ipv6?.url || null) : (data.ipv4?.url || null);
  };

  const handleSaveService = async () => {
    if (!editSectionId) return;
    saving = true;
    saveFeedback = "";
    editValidationErrors = [];

    // ── Validation ──
    const errs: string[] = [];

    // update_url / update_script mutual exclusive
    if (editForm.service_name === "-") {
      const hasUrl = !!editForm.update_url;
      const hasScript = !!editForm.update_script;
      if (!hasUrl && !hasScript) errs.push("Provide either an Update URL OR an Update Script");
      if (hasUrl && hasScript) errs.push("Provide either an Update URL OR an Update Script");
    }

    // check_interval minimum 300 seconds
    const ci = parseInt(editForm.check_interval) || 0;
    const cu = editForm.check_unit;
    const ciSec = ci * (cu === "seconds" ? 1 : cu === "minutes" ? 60 : 3600);
    if (ci > 0 && ciSec < 300) errs.push("Check Interval: values below 5 minutes (300 seconds) are not supported");

    // force_interval >= check_interval (unless 0)
    const fi = parseInt(editForm.force_interval) || 0;
    const fu = editForm.force_unit;
    const fiSec = fi * (fu === "minutes" ? 60 : fu === "hours" ? 3600 : fu === "days" ? 86400 : 1);
    if (fi > 0 && fiSec < ciSec) errs.push("Force Interval: values lower than Check Interval (except 0) are invalid");

    // lookup_host hostname validation (basic)
    if (!editForm.lookup_host || editForm.lookup_host.length < 3)
      errs.push("Lookup Hostname must be at least 3 characters");

    if (errs.length > 0) {
      editValidationErrors = errs;
      saving = false;
      return;
    }

    try {
      // Event Network auto-populate when ip_source = network
      let interfaceVal = editForm.interface;
      if (editForm.ip_source === "network" && !interfaceVal) {
        interfaceVal = editForm.ip_network || "wan";
      }

      const vals: Record<string, any> = {
        enabled: editForm.enabled ? "1" : "0",
        lookup_host: editForm.lookup_host,
        use_ipv6: editForm.use_ipv6,
        domain: editForm.domain,
        username: editForm.username,
        param_enc: editForm.param_enc,
        param_opt: editForm.param_opt,
        ip_source: editForm.ip_source,
        use_syslog: editForm.use_syslog,
        use_logfile: editForm.use_logfile ? "1" : "0",
        check_interval: editForm.check_interval,
        check_unit: editForm.check_unit,
        force_interval: editForm.force_interval,
        force_unit: editForm.force_unit,
        retry_max_count: editForm.retry_max_count,
        retry_interval: editForm.retry_interval,
        retry_unit: editForm.retry_unit,
        interface: interfaceVal,
      };
      if (editForm.password) vals.password = editForm.password;
      if (editForm.update_url) vals.update_url = editForm.update_url;
      if (editForm.update_script) vals.update_script = editForm.update_script;
      if (editForm.ip_network) vals.ip_network = editForm.ip_network;
      if (editForm.ip_url) vals.ip_url = editForm.ip_url;
      if (editForm.ip_interface) vals.ip_interface = editForm.ip_interface;
      if (editForm.ip_script) vals.ip_script = editForm.ip_script;
      if (editForm.interface) vals.interface = editForm.interface;
      if (editForm.bind_network) vals.bind_network = editForm.bind_network;
      if (editForm.force_ipversion) vals.force_ipversion = "1";
      if (editForm.dns_server) vals.dns_server = editForm.dns_server;
      if (editForm.force_dnstcp) vals.force_dnstcp = "1";
      if (editForm.proxy) vals.proxy = editForm.proxy;
      if (editForm.use_https) vals.use_https = "1";
      if (editForm.cacert) vals.cacert = editForm.cacert;

      if (editForm.service_name !== "-") {
        vals.service_name = editForm.service_name;
      } else {
        vals.service_name = "";
        vals.update_url = editForm.update_url;
        vals.update_script = editForm.update_script;
      }

      await uciSetSection("ddns", editSectionId, vals);
      await uciCommit("ddns");
      editSectionId = null;
      saveFeedback = trans("Saved");
      await load();
    } catch { saveFeedback = trans("Save failed"); }
    saving = false;
    setTimeout(() => { saveFeedback = ""; }, 3000);
  };

  const handleDeleteService = async (sectionId: string) => {
    await execCommand("/sbin/uci", ["delete", `ddns.${sectionId}`]);
    await execCommand("/sbin/uci", ["commit", "ddns"]);
    await load();
  };

  const handleInstallService = async (service: string) => {
    await ddnsServiceInstall(service);
    await loadProviderServices();
  };

  const handleReadLog = async () => {
    if (!editSectionId) return;
    const res = await callDdnsGetLog(editSectionId);
    if (res?.result) logContent = res.result;
  };

  // ── Derived ──
  const envHints = $derived.by(() => {
    if (!env) return [];
    const hints: { title: string; desc: string[] }[] = [];
    if (!env.has_ipv6) {
      hints.push({
        title: trans("IPv6 not supported"),
        desc: [trans("IPv6 is not supported by this system")],
      });
    }
    if (!env.has_ssl) {
      hints.push({
        title: trans("HTTPS not supported"),
        desc: [
          trans("Install 'wget' or 'curl' or 'uclient-fetch' with 'libustream-*ssl' package."),
        ],
      });
    }
    if (!env.has_bindnet) {
      hints.push({
        title: trans("Binding to a specific network not supported"),
        desc: [trans("Install 'wget' or 'curl' package for multiple WAN support.")],
      });
    }
    if (!env.has_proxy) {
      hints.push({
        title: trans("cURL without Proxy Support"),
        desc: [trans("Install 'wget' or 'uclient-fetch' package.")],
      });
    }
    if (!env.has_bindhost) {
      hints.push({
        title: trans("DNS requests via TCP not supported"),
        desc: [trans("Install 'bind-host' or 'knot-host' or 'drill' package.")],
      });
    }
    if (!env.has_dnsserver) {
      hints.push({
        title: trans("Using specific DNS Server not supported"),
        desc: [trans("Install 'bind-host' or 'knot-host' or 'drill' or 'hostip' package.")],
      });
    }
    if (env.has_ssl && !env.has_cacerts) {
      hints.push({
        title: trans("No certificates found"),
        desc: [trans("Install 'ca-certificates' package.")],
      });
    }
    return hints;
  });

  // ── Lifecycle ──
  onMount(() => {
    load();
    pollInterv = setInterval(pollStatus, 5000);
  });
  onDestroy(() => clearInterval(pollInterv));

  // ── IP source options ──
  const ipSourceOptions = [
    { value: "network", label: "Network" },
    { value: "web", label: "URL" },
    { value: "interface", label: "Interface" },
    { value: "script", label: "Script" },
  ];

  const syslogOptions = [
    { value: "0", label: "No logging" },
    { value: "1", label: "Info" },
    { value: "2", label: "Notice" },
    { value: "3", label: "Warning" },
    { value: "4", label: "Error" },
  ];

  const unitOptions = [
    { value: "seconds", label: "seconds" },
    { value: "minutes", label: "minutes" },
    { value: "hours", label: "hours" },
    { value: "days", label: "days" },
  ];

  const retryUnitOptions = [
    { value: "seconds", label: "seconds" },
    { value: "minutes", label: "minutes" },
  ];
</script>

<div class={cn("p-6", "flex", "flex-col", "min-h-0", "animate-fade-in", "gap-5")}>
  <!-- Header -->
  <div class={cn("shrink-0", "flex", "items-start", "justify-between", "gap-4")}>
    <div>
      <h1 class={cn("text-lg", "font-semibold", "text-white")}>{trans("Dynamic DNS")}</h1>
      <p class={cn("text-sm", "mt-0.5", "text-muted")}>
        {trans("DDNS service configuration")}
      </p>
    </div>
    {#if saveFeedback}
      <span class={cn("shrink-0", "mt-1", "px-2", "py-0.5", "text-[10px]", "rounded", "font-medium", "font-mono", saveFeedback === "Saved" ? "bg-accent/10 text-accent" : "bg-danger/10 text-danger")}>{saveFeedback}</span>
    {/if}
  </div>

  <!-- Tab bar (info / global only) -->
  <div class={cn("flex", "gap-1", "p-0.5", "w-fit", "shrink-0", "border", "rounded-lg", "bg-surface-2", "border-border")}>
    {#each [
      { id: "info" as const, label: trans("Information") },
      { id: "global" as const, label: trans("Global Settings") },
    ] as t}
      <button
        class={cn("px-3", "py-1.5", "text-xs", "rounded-md", "font-medium", "transition-all", "cursor-pointer")}
        style="background:{tab === t.id ? 'var(--accent)' : 'transparent'};color:{tab === t.id ? '#0d1117' : 'var(--text-muted)'}"
        onclick={() => (tab = t.id)}
      >
        {t.label}
      </button>
    {/each}
  </div>

  <!-- Info tab -->
  {#if tab === "info"}
    <div class={cn("space-y-4")}>
      <!-- Status bar -->
      <div class={cn("glass", "p-4", "rounded-xl", "flex", "items-center", "flex-wrap", "gap-x-6", "gap-y-3")}>
        <div class={cn("flex", "items-center", "gap-3")}>
          <div class={cn("w-8", "h-8", "rounded-lg", "flex", "items-center", "justify-center", "bg-accent/10")}>
            <span class={cn("text-xs", "font-bold", "text-accent")}>DD</span>
          </div>
          <div>
            <p class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>{trans("Version")}</p>
            <p class={cn("text-xs", "font-mono", "text-fg", "mt-px")}>{status?._version || "—"}</p>
          </div>
        </div>
        <div class={cn("w-px", "h-8", "bg-border")} />
        <div class={cn("flex", "items-center", "gap-2.5")}>
          <span class={cn("w-2", "h-2", "rounded-full", status?._enabled ? "bg-(--accent)" : "bg-(--text-muted)")} />
          <div>
            <p class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>{trans("State")}</p>
            <p class={cn("text-xs", "mt-px")} style="color:{status?._enabled ? 'var(--accent)' : 'var(--text-muted)'}">
              {status?._enabled ? trans("Autostart enabled") : trans("Autostart disabled")}
            </p>
          </div>
        </div>
        <div class={cn("flex-1")} />
        <div class={cn("flex", "items-center", "gap-2")}>
          <button onclick={handleToggleDdns}
            class={cn(
              "px-3", "py-1.5", "text-xs", "rounded-lg", "font-medium", "transition-all", "cursor-pointer",
              status?._enabled
                ? "bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20"
                : "bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20"
            )}>
            {status?._enabled ? trans("Stop DDNS") : trans("Start DDNS")}
          </button>
          <button onclick={handleRestartDdns}
            class={cn("px-3", "py-1.5", "text-xs", "rounded-lg", "font-medium", "transition-all", "cursor-pointer", "bg-surface-2 text-muted border border-border hover:bg-white/5 hover:text-fg")}>
            {trans("Restart")}
          </button>
        </div>
      </div>

      <!-- Services list update -->
      <div class={cn("glass", "p-4", "rounded-xl", "flex", "items-center", "justify-between")}>
        <div class={cn("flex", "items-center", "gap-3")}>
          <RefreshCw size={14} class={cn("text-muted", "shrink-0")} />
          <div>
            <p class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>{trans("Services list last update")}</p>
            <p class={cn("text-xs", "text-fg", "mt-px")}>{status?._services_list || "—"}</p>
          </div>
        </div>
        <button onclick={handleRefreshServicesList}
          class={cn("inline-flex", "items-center", "gap-1.5", "px-3", "py-1.5", "text-xs", "rounded-lg", "font-medium", "transition-all", "cursor-pointer", "bg-surface-2 text-muted border border-border hover:bg-white/5 hover:text-fg")}>
          <RefreshCw size={14} /> {trans("Update List")}
        </button>
      </div>

      <!-- Environment hints -->
      {#each envHints as hint}
        <div class={cn("rounded-xl", "p-4", "flex", "items-start", "gap-3")} style="background:color-mix(in srgb, var(--warning) 8%, transparent);border:1px solid color-mix(in srgb, var(--warning) 20%, transparent)">
          <div class={cn("w-1.5", "h-1.5", "rounded-full", "mt-1", "shrink-0")} style="background:var(--warning)" />
          <div>
            <p class={cn("text-xs", "font-semibold")} style="color:var(--warning)">{hint.title}</p>
            {#each hint.desc as d}
              <p class={cn("text-[10px]", "text-muted", "mt-1", "leading-relaxed")}>{d}</p>
            {/each}
          </div>
        </div>
      {/each}
    </div>

  <!-- Global Settings tab -->
  {:else if tab === "global"}
    <div class={cn("space-y-4")}>
      <div class={cn("glass", "p-5", "rounded-xl", "space-y-5")}>
        <div>
          <span class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>{trans("General")}</span>
          <div class={cn("mt-3", "space-y-4")}>
            <Toggle bind:checked={g.upd_privateip} label={trans("Allow non-public IPs")} description={trans("Allow private IPs 10/8, 172.16/12, 192.168/16 and IPv6 private ranges.")} />
            <Input label={trans("Date format")} bind:value={g.ddns_dateformat} placeholder="%F %R" mono />
            <p class={cn("text-[10px]", "text-muted", "-mt-2")}>
              {trans("Current:")} <span class={cn("font-mono")}>{status?._curr_dateformat || "%F %R"}</span>
            </p>
          </div>
        </div>
        <div class={cn("h-px", "bg-border")} />
        <div>
          <span class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>{trans("Paths")}</span>
          <div class={cn("mt-3", "space-y-4")}>
            <Input label={trans("Status directory")} bind:value={g.ddns_rundir} placeholder="/var/run/ddns" mono />
            <Input label={trans("Log directory")} bind:value={g.ddns_logdir} placeholder="/var/log/ddns" mono />
            <Input label={trans("Log length")} bind:value={g.ddns_loglines} placeholder="250" />
          </div>
        </div>
        <div class={cn("h-px", "bg-border")} />
        <div>
          <span class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>{trans("Network")}</span>
          <div class={cn("mt-3", "space-y-4")}>
            {#if env?.has_wget && env?.has_curl}
              <Toggle bind:checked={g.use_curl} label={trans("Use cURL")} description={trans("Use cURL instead of Wget for communication.")} />
            {/if}
            <Input label={trans("CA cert bundle file")} bind:value={g.cacert} placeholder="IGNORE" mono />
          </div>
        </div>
        <div class={cn("h-px", "bg-border")} />
        <div>
          <span class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>{trans("Services")}</span>
          <div class={cn("mt-3", "space-y-4")}>
            <Input label={trans("Services URL Download")} bind:value={g.services_url} placeholder="https://..." mono />
          </div>
        </div>
      </div>
      <!-- Save -->
      <div class={cn("flex", "justify-end", "gap-2")}>
        <button onclick={async () => {
            saving = true;
            try {
              const globalSec: any = Object.values(uciConfig?.values || {}).find((s: any) => s[".type"] === "ddns");
              if (!globalSec) return;
              await uciSetSection("ddns", globalSec[".name"] as string, {
                upd_privateip: g.upd_privateip ? "1" : "0",
                ddns_dateformat: g.ddns_dateformat,
                ddns_rundir: g.ddns_rundir,
                ddns_logdir: g.ddns_logdir,
                ddns_loglines: g.ddns_loglines,
                use_curl: g.use_curl ? "1" : "0",
                cacert: g.cacert || "IGNORE",
                services_url: g.services_url,
              });
              await uciCommit("ddns");
              saveFeedback = trans("Saved");
            } catch { saveFeedback = trans("Save failed"); }
            saving = false;
            setTimeout(() => { saveFeedback = ""; }, 3000);
          }}
          class={cn("px-4", "py-1.5", "text-xs", "rounded-lg", "font-medium", "transition-all", "cursor-pointer", "border", "text-accent", "bg-accent/10", "border-accent/20", "hover:bg-accent/20")}>
          {saving ? trans("Saving...") : trans("Save & Apply")}
        </button>
      </div>
    </div>
  {/if}

  <!-- Services section (always visible) -->
  <div class={cn("space-y-3")}>
    <div class={cn("flex", "items-center", "justify-between")}>
      <div class={cn("flex", "items-center", "gap-2.5")}>
        <h2 class={cn("text-sm", "font-semibold", "text-white")}>{trans("Services")}</h2>
        {#if serviceSections.length > 0}
          <span class={cn("px-1.5", "py-0.5", "text-[10px]", "rounded-full", "bg-surface-2", "text-muted", "font-mono")}>{serviceSections.length}</span>
        {/if}
      </div>
      <button onclick={() => { showAddModal = true; addForm = { name: "", use_ipv6: "0", service_name: "-" }; }}
        class={cn("flex", "items-center", "gap-1.5", "px-3", "py-1.5", "text-xs", "rounded-lg", "font-medium", "transition-all", "cursor-pointer", "bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20")}>
        <Plus size={13} /> {trans("Add service")}
      </button>
    </div>

    {#if serviceSections.length === 0}
      <div class={cn("glass", "rounded-xl", "py-16", "flex", "flex-col", "items-center", "justify-center", "gap-3")}>
        <div class={cn("w-10", "h-10", "rounded-xl", "bg-surface-2", "flex", "items-center", "justify-center")}>
          <Globe size={18} class={cn("text-muted")} />
        </div>
        <p class={cn("text-sm", "text-muted")}>{trans("No DDNS services configured.")}</p>
        <button onclick={() => { showAddModal = true; addForm = { name: "", use_ipv6: "0", service_name: "-" }; }}
          class={cn("px-3", "py-1.5", "text-xs", "rounded-lg", "font-medium", "transition-all", "cursor-pointer", "bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20")}>
          <Plus size={12} /> {trans("Add your first service")}
        </button>
      </div>
    {:else}
      <div class={cn("glass", "rounded-xl", "overflow-hidden")}>
        <div class={cn("overflow-x-auto")}>
          <table class={cn("w-full", "text-xs")}>
            <thead>
              <tr class={cn("text-muted", "border-b", "border-border")}>
                <th class={cn("p-3", "w-8")}></th>
                <th class={cn("p-3", "text-left", "font-medium", "tracking-wider")}>{trans("Status")}</th>
                <th class={cn("p-3", "text-left", "font-medium", "tracking-wider")}>{trans("Name")}</th>
                <th class={cn("p-3", "text-left", "font-medium", "tracking-wider")}>{trans("Hostname / IP")}</th>
                <th class={cn("p-3", "text-center", "font-medium", "tracking-wider")}>{trans("Enabled")}</th>
                <th class={cn("p-3", "text-left", "font-medium", "tracking-wider")}>{trans("Schedule")}</th>
                <th class={cn("p-3", "text-center", "font-medium", "tracking-wider")}>{trans("Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {#each serviceSections as sectionId, idx (sectionId)}
                {@const svc = servicesStatus[sectionId] || {}}
                {@const sectionData = (Object.values(uciConfig?.values || {}) as any[]).find((s: any) => s[".name"] === sectionId) || {}}
                {@const enabled = sectionData.enabled === "1"}
                {@const lookupHost = sectionData.lookup_host || trans("Configuration Error")}
                <tr
                  class={cn("border-b", "border-border", "transition-colors", "duration-150", dragSectionId === sectionId ? "opacity-40" : "hover:bg-white/[0.015]")}
                  draggable="true"
                  ondragstart={() => (dragSectionId = sectionId)}
                  ondragover={(e) => e.preventDefault()}
                  ondrop={async () => {
                    if (!dragSectionId || dragSectionId === sectionId) { dragSectionId = null; return; }
                    const fromIdx = serviceSections.indexOf(dragSectionId);
                    const toIdx = idx;
                    if (fromIdx === -1) { dragSectionId = null; return; }
                    const newOrder = [...serviceSections];
                    const [moved] = newOrder.splice(fromIdx, 1);
                    newOrder.splice(toIdx, 0, moved);
                    serviceSections = newOrder;
                    for (let i = 0; i < newOrder.length; i++) {
                      await execCommand("/sbin/uci", ["reorder", `ddns.${newOrder[i]}`, String(i + 1)]);
                    }
                    await execCommand("/sbin/uci", ["commit", "ddns"]);
                    dragSectionId = null;
                    await load();
                  }}
                  ondragend={() => (dragSectionId = null)}
                >
                  <td class={cn("p-3", "cursor-grab", "text-muted", "hover:text-fg", "transition-colors")}>
                    <GripVertical size={12} />
                  </td>
                  <td class={cn("p-3")}>
                    {#if svc.pid}
                      <span class={cn("inline-flex", "items-center", "gap-1.5", "px-2", "py-0.5", "rounded-full", "text-accent")} style="background:color-mix(in srgb, var(--accent) 12%, transparent)">
                        <span class={cn("w-1.5", "h-1.5", "rounded-full", "animate-pulse")} style="background:var(--accent)" />
                        <span class={cn("text-[10px]", "font-semibold")}>{trans("Running")}</span>
                        <span class={cn("text-[10px]", "font-mono", "opacity-60")}>{svc.pid}</span>
                      </span>
                    {:else}
                      <span class={cn("inline-flex", "items-center", "gap-1.5", "px-2", "py-0.5", "rounded-full", "bg-surface-2", "text-muted")}>
                        <span class={cn("w-1.5", "h-1.5", "rounded-full")} style="background:var(--text-muted)" />
                        <span class={cn("text-[10px]", "font-semibold")}>{trans("Stopped")}</span>
                      </span>
                    {/if}
                  </td>
                  <td class={cn("p-3")}>
                    <span class={cn("font-semibold", "text-fg")}>{sectionId}</span>
                  </td>
                  <td class={cn("p-3")}>
                    <span class={cn("text-fg")}>{lookupHost}</span><br />
                    <span class={cn("text-[10px]", "font-mono", "text-muted")}>{svc.ip || trans("—")}</span>
                  </td>
                  <td class={cn("p-3", "text-center")}>
                    <button
                      onclick={async () => {
                        await uciSet("ddns", sectionId, { enabled: enabled ? "0" : "1" });
                        await uciCommit("ddns");
                        await load();
                      }}
                      class={cn("relative", "w-9", "h-5", "rounded-full", "transition-colors", "duration-200", "cursor-pointer", "border", enabled ? "bg-accent border-accent/30" : "bg-surface-2 border-border")}
                    >
                      <span class={cn("absolute", "top-0.5", "w-3.5", "h-3.5", "rounded-full", "bg-white", "transition-all", "duration-200", enabled ? "left-[19px]" : "left-[3px]")} />
                    </button>
                  </td>
                  <td class={cn("p-3", "text-muted")}>
                    <div class={cn("space-y-0.5")}>
                      <span class={cn("block", "text-[10px]")}><span class={cn("text-muted/60")}>U:</span> {svc.last_update || trans("Never")}</span>
                      <span class={cn("block", "text-[10px]")}><span class={cn("text-muted/60")}>V:</span> {svc.next_check || trans("—")}</span>
                      <span class={cn("block", "text-[10px]")}><span class={cn("text-muted/60")}>N:</span> {nextUpdateLabels[svc.next_update as string] || svc.next_update || trans("—")}</span>
                    </div>
                  </td>
                  <td class={cn("p-3")}>
                    <div class={cn("flex", "items-center", "justify-center", "gap-1")}>
                      <button title={trans("Stop")} disabled={!svc.pid}
                        onclick={async () => { await ddnsStopService(sectionId); await load(); }}
                        class={cn("p-1.5", "rounded-lg", "transition-all", "duration-150", "cursor-pointer",
                          svc.pid ? "text-danger hover:bg-danger/10" : "text-muted opacity-30")}>
                        <Square size={14} />
                      </button>
                      <button title={trans("Reload")} disabled={!status?._enabled || !enabled}
                        onclick={async () => { await ddnsReloadService(sectionId); await load(); }}
                        class={cn("p-1.5", "rounded-lg", "transition-all", "duration-150", "cursor-pointer",
                          status?._enabled && enabled ? "text-accent hover:bg-accent/10" : "text-muted opacity-30")}>
                        <RefreshCw size={14} />
                      </button>
                      <button title={trans("Edit")}
                        onclick={() => openEdit(sectionId)}
                        class={cn("p-1.5", "rounded-lg", "transition-all", "duration-150", "cursor-pointer", "text-muted", "hover:text-fg", "hover:bg-white/5")}>
                        <FileText size={14} />
                      </button>
                      <button title={trans("Delete")}
                        onclick={async () => { await handleDeleteService(sectionId); }}
                        class={cn("p-1.5", "rounded-lg", "transition-all", "duration-150", "cursor-pointer", "text-muted", "hover:text-danger", "hover:bg-danger/10")}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}
  </div>
</div>

<!-- Add Service Modal -->
{#if showAddModal}
  <div class={cn("fixed", "inset-0", "z-50", "flex", "items-center", "justify-center", "bg-black/60", "backdrop-blur-sm")} onclick={() => (showAddModal = false)}>
    <div class={cn("glass", "p-6", "rounded-xl", "max-w-md", "w-full", "mx-4", "space-y-5", "shadow-2xl")} onclick={(e) => e.stopPropagation()} transition:slide|local={{ duration: 150 }}>
      <div class={cn("flex", "items-center", "justify-between")}>
        <div class={cn("flex", "items-center", "gap-2.5")}>
          <div class={cn("w-7", "h-7", "rounded-lg", "bg-accent/10", "flex", "items-center", "justify-center")}>
            <Plus size={14} class={cn("text-accent")} />
          </div>
          <h3 class={cn("text-sm", "font-semibold", "text-white")}>{trans("Add new service")}</h3>
        </div>
        <button onclick={() => (showAddModal = false)} class={cn("p-1", "rounded-lg", "cursor-pointer", "hover:bg-white/10", "text-muted", "transition-colors")}><X size={14} /></button>
      </div>

      <div class={cn("space-y-4")}>
        <Input label={trans("Name")} bind:value={addForm.name} placeholder={trans("New DDNS Service")} />

        <Select label={trans("IP address version")} options={[
          { value: "0", label: "IPv4-Address" },
          ...(env?.has_ipv6 ? [{ value: "1", label: "IPv6-Address" }] : []),
        ]} bind:value={addForm.use_ipv6} onchange={() => handleCheckService(addForm.service_name, addForm.use_ipv6)} />

        <Select label={trans("DDNS Service provider")} options={[
          { value: "-", label: "📝 custom" },
          ...Object.keys(providerServices).sort().map((k) => ({ value: k, label: k })),
        ]} bind:value={addForm.service_name} onchange={() => handleCheckService(addForm.service_name, addForm.use_ipv6)} />

        {#if !addServiceSupported}
          <div class={cn("px-3", "py-2", "rounded-lg", "bg-danger/10", "border", "border-danger/20")}>
            <p class={cn("text-xs", "text-danger")}>{trans("Service doesn't support this IP type")}</p>
          </div>
        {/if}
      </div>

      <div class={cn("flex", "justify-end", "gap-2", "pt-1")}>
        <button onclick={() => (showAddModal = false)}
          class={cn("px-3", "py-1.5", "text-xs", "rounded-lg", "cursor-pointer", "text-muted", "border", "border-border", "hover:bg-white/5", "transition-all")}>{trans("Cancel")}</button>
        <button onclick={handleAddService} disabled={saving || !addForm.name}
          class={cn("px-3", "py-1.5", "text-xs", "rounded-lg", "font-medium", "cursor-pointer", "transition-all", "border", "text-accent", "bg-accent/10", "border-accent/20", "hover:bg-accent/20", "disabled:opacity-30")}>
          {saving ? trans("Saving...") : trans("Create service")}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Edit Service Modal -->
{#if editSectionId}
  <div class={cn("fixed", "inset-0", "z-50", "flex", "items-center", "justify-center", "bg-black/60", "backdrop-blur-sm")} onclick={() => (editSectionId = null)}>
    <div class={cn("glass", "p-6", "rounded-xl", "max-w-2xl", "w-full", "mx-4", "max-h-[85vh]", "overflow-y-auto", "space-y-5", "shadow-2xl")} onclick={(e) => e.stopPropagation()} transition:slide|local={{ duration: 150 }}>
      <div class={cn("flex", "items-center", "justify-between", "shrink-0")}>
        <div class={cn("flex", "items-center", "gap-2.5")}>
          <div class={cn("w-7", "h-7", "rounded-lg", "bg-accent/10", "flex", "items-center", "justify-center")}>
            <FileText size={14} class={cn("text-accent")} />
          </div>
          <h3 class={cn("text-sm", "font-semibold", "text-white")}>{trans("DDNS Service")} <span class={cn("text-muted")}>»</span> <span class={cn("font-mono")}>{editSectionId}</span></h3>
        </div>
        <button onclick={() => (editSectionId = null)} class={cn("p-1", "rounded-lg", "cursor-pointer", "hover:bg-white/10", "text-muted", "transition-colors")}><X size={14} /></button>
      </div>

      <!-- Edit tabs -->
      <div class={cn("flex", "gap-1", "p-0.5", "w-fit", "border", "rounded-lg", "bg-surface-2", "border-border", "shrink-0")}>
        {#each [
          { id: "basic" as const, label: trans("Basic Settings") },
          { id: "advanced" as const, label: trans("Advanced Settings") },
          { id: "timer" as const, label: trans("Timer Settings") },
          { id: "logview" as const, label: trans("Log File Viewer") },
        ] as t}
          <button
            class={cn("px-2.5", "py-1", "text-[10px]", "rounded-md", "font-medium", "transition-all", "cursor-pointer")}
            style="background:{editTab === t.id ? 'var(--accent)' : 'transparent'};color:{editTab === t.id ? '#0d1117' : 'var(--text-muted)'}"
            onclick={() => (editTab = t.id)}
          >{t.label}</button>
        {/each}
      </div>

      {#key editTab}
        {#if editTab === "basic"}
          <div class={cn("space-y-4")}>
            {#if editValidationErrors.length > 0}
              <div class={cn("p-3", "rounded-lg", "bg-danger/10", "border", "border-danger/20")}>
                {#each editValidationErrors as err}
                  <p class={cn("text-xs", "text-danger")}>{err}</p>
                {/each}
              </div>
            {/if}

            <Toggle bind:checked={editForm.enabled} label={trans("Enabled")} description={trans("If disabled, this service will not be started.")} />
            <Input label={trans("Lookup Hostname")} bind:value={editForm.lookup_host} placeholder="myhost.example.com" />
            <Select label={trans("IP address version")} options={[
              { value: "0", label: "IPv4-Address" },
              ...(env?.has_ipv6 ? [{ value: "1", label: "IPv6-Address" }] : []),
            ]} bind:value={editForm.use_ipv6} onchange={() => checkServiceData(editForm.service_name, editForm.use_ipv6)} />
            <Select label={trans("DDNS Service provider")} options={[
              { value: "-", label: "📝 custom" },
              ...Object.keys(providerServices).sort().map((k) => ({ value: k, label: k })),
            ]} bind:value={editForm.service_name} onchange={() => checkServiceData(editForm.service_name, editForm.use_ipv6)} />

            {#if !serviceAvailable && editForm.service_name !== "-"}
              <div class={cn("p-3", "rounded-lg", "bg-warn/10", "border", "border-warn/20", "space-y-2")}>
                <p class={cn("text-xs", "text-warn")}>{trans("Service not installed")}</p>
                <button
                  onclick={async () => { await ddnsServiceInstall(editForm.service_name); await loadProviderServices(); await checkServiceData(editForm.service_name, editForm.use_ipv6); }}
                  class={cn("px-3", "py-1.5", "border", "text-xs", "rounded-md", "font-medium", "transition-all", "cursor-pointer", "text-accent", "bg-accent/10", "border-accent/20")}
                >
                  <Download size={12} /> {trans("Install Service")}
                </button>
              </div>
            {/if}

            {#if !serviceSupported}
              <p class={cn("text-xs", "text-danger")}>{trans("Service doesn't support this IP type")}</p>
            {/if}

            {#if editForm.service_name !== originalServiceName || editForm.use_ipv6 !== originalUseIpv6}
              <div class={cn("p-3", "rounded-lg", "bg-accent/10", "border", "border-accent/20")}>
                <p class={cn("text-xs", "text-fg", "mb-2")}>{trans("Service or IP version has changed. Switching will update the configuration.")}</p>
                <button
                  onclick={async () => {
                    if (!editSectionId) return;
                    saving = true;
                    try {
                      await uciSet("ddns", editSectionId, { service_name: editForm.service_name, use_ipv6: editForm.use_ipv6 });
                      await uciCommit("ddns");
                      originalServiceName = editForm.service_name;
                      originalUseIpv6 = editForm.use_ipv6;
                      await checkServiceData(editForm.service_name, editForm.use_ipv6);
                      saveFeedback = trans("Service switched");
                    } catch { saveFeedback = trans("Switch failed"); }
                    saving = false;
                    setTimeout(() => { saveFeedback = ""; }, 3000);
                  }}
                  disabled={saving}
                  class={cn("px-3", "py-1.5", "border", "text-xs", "rounded-md", "font-medium", "transition-all", "cursor-pointer", "text-accent", "bg-accent/20", "border-accent/30")}
                >
                  {saving ? trans("Switching...") : trans("Switch Service")}
                </button>
              </div>
            {/if}

            {#if serviceUpdateUrl}
              <div class={cn("p-3", "rounded-lg", "bg-surface-2", "border", "border-border")}>
                <span class={cn("block", "text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider", "mb-1")}>{trans("Update URL")}</span>
                <code class={cn("text-xs", "font-mono", "text-fg", "break-all")}>{serviceUpdateUrl}</code>
              </div>
            {/if}

            {#if editForm.service_name === "-"}
              <Input label={trans("Custom update-URL")} bind:value={editForm.update_url} placeholder="http://..." />
              <FileUpload label={trans("Custom update-script")} bind:value={editForm.update_script} rootDir="/usr/lib/ddns" />
            {/if}
            <Input label={trans("Domain")} bind:value={editForm.domain} placeholder="example.com" />
            <Input label={trans("Username")} bind:value={editForm.username} />
            <Input label={trans("Password")} type="password" bind:value={editForm.password} />
            <Input label={trans("Optional Encoded Parameter")} bind:value={editForm.param_enc} />
            <Input label={trans("Optional Parameter")} bind:value={editForm.param_opt} />
            {#if env?.has_ssl}
              <Toggle bind:checked={editForm.use_https} label={trans("Use HTTP Secure")} />
              {#if editForm.use_https}
                <Input label={trans("Path to CA-Certificate")} bind:value={editForm.cacert} placeholder="/etc/ssl/certs" />
              {/if}
            {/if}
          </div>

        {:else if editTab === "advanced"}
          <div class={cn("space-y-4")}>
            <Select label={trans("IP address source")} options={ipSourceOptions} bind:value={editForm.ip_source} />
            {#if editForm.ip_source === "network"}
              <NetworkSelect label={trans("Network")} bind:value={editForm.ip_network} />
            {:else if editForm.ip_source === "web"}
              <Input label={trans("URL to detect")} bind:value={editForm.ip_url} placeholder="http://checkip.dyndns.com" />
            {:else if editForm.ip_source === "interface"}
              <DeviceSelect label={trans("Interface")} bind:value={editForm.ip_interface} />
            {:else if editForm.ip_source === "script"}
              <Input label={trans("Script")} bind:value={editForm.ip_script} placeholder="/path/to/script.sh" mono />
            {/if}
            {#if editForm.ip_source === "network"}
              <Input label={trans("Event Network")} bind:value={editForm.interface} placeholder={trans("Auto-set from Network")} />
              <p class={cn("text-[10px]", "text-muted", "-mt-3")}>{trans("Will be auto-set to the selected network if left empty")}</p>
            {:else}
              <Input label={trans("Event Network")} bind:value={editForm.interface} placeholder="wan" />
            {/if}
            {#if env?.has_bindnet}
              <Input label={trans("Bind Network")} bind:value={editForm.bind_network} placeholder="wan" />
            {/if}
            {#if env?.has_forceip}
              <Toggle bind:checked={editForm.force_ipversion} label={trans("Force IP Version")} />
            {/if}
            {#if env?.has_dnsserver}
              <Input label={trans("DNS-Server")} bind:value={editForm.dns_server} placeholder="mydns.lan" />
            {/if}
            {#if env?.has_bindhost}
              <Toggle bind:checked={editForm.force_dnstcp} label={trans("Force TCP on DNS")} />
            {/if}
            {#if env?.has_proxy}
              <Input label={trans("PROXY-Server")} bind:value={editForm.proxy} placeholder="[user:password@]proxyhost:port" />
            {/if}
            <Select label={trans("Log to syslog")} options={syslogOptions} bind:value={editForm.use_syslog} />
            <Toggle bind:checked={editForm.use_logfile} label={trans("Log to file")} />
          </div>

        {:else if editTab === "timer"}
          <div class={cn("space-y-4")}>
            <div class={cn("flex", "items-end", "gap-2")}>
              <div class={cn("flex-1")}>
                <Input label={trans("Check Interval")} bind:value={editForm.check_interval} placeholder="10" />
              </div>
              <div class={cn("w-28")}>
                <Select label={trans("Unit")} options={unitOptions.slice(0, 3)} bind:value={editForm.check_unit} />
              </div>
            </div>
            <div class={cn("flex", "items-end", "gap-2")}>
              <div class={cn("flex-1")}>
                <Input label={trans("Force Interval")} bind:value={editForm.force_interval} placeholder="72" />
              </div>
              <div class={cn("w-28")}>
                <Select label={trans("Unit")} options={unitOptions} bind:value={editForm.force_unit} />
              </div>
            </div>
            <div class={cn("glass", "p-3")}>
              <span class={cn("block", "text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider", "mb-2")}>{trans("Retry Settings")}</span>
              <div class={cn("space-y-3")}>
                <Input label={trans("Error Max Retry Counter")} bind:value={editForm.retry_max_count} placeholder="0" />
                <div class={cn("flex", "items-end", "gap-2")}>
                  <div class={cn("flex-1")}>
                    <Input label={trans("Error Retry Interval")} bind:value={editForm.retry_interval} placeholder="60" />
                  </div>
                  <div class={cn("w-28")}>
                    <Select label={trans("Unit")} options={retryUnitOptions} bind:value={editForm.retry_unit} />
                  </div>
                </div>
              </div>
            </div>
          </div>

        {:else if editTab === "logview"}
          <div class={cn("space-y-3")}>
            <button
              onclick={handleReadLog}
              class={cn("px-3", "py-1.5", "border", "text-xs", "rounded-md", "font-medium", "transition-all", "cursor-pointer", "hover:bg-accent/15", "text-accent", "bg-accent/10", "border-accent/20")}
            >
              <Eye size={12} /> {trans("Read / Reread log file")}
            </button>
            <textarea
              readonly
              class={cn("w-full", "h-60", "p-3", "text-xs", "font-mono", "text-fg", "bg-surface", "border", "border-border", "rounded-lg", "resize-none")}
              style="font-size:10px"
              value={logContent || trans("Press [Read] button to load log.")}
            ></textarea>
          </div>
        {/if}
      {/key}

      <div class={cn("flex", "justify-end", "gap-2", "pt-1")}>
        <button onclick={() => (editSectionId = null)}
          class={cn("px-3", "py-1.5", "text-xs", "rounded-lg", "cursor-pointer", "text-muted", "border", "border-border", "hover:bg-white/5", "transition-all")}>{trans("Cancel")}</button>
        <button onclick={handleSaveService} disabled={saving}
          class={cn("px-3", "py-1.5", "text-xs", "rounded-lg", "font-medium", "cursor-pointer", "transition-all", "border", "text-accent", "bg-accent/10", "border-accent/20", "hover:bg-accent/20", "disabled:opacity-30")}>
          {saving ? trans("Saving...") : trans("Save")}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  :global(.animate-slide-up) { animation: slideUp 0.3s ease-out; }
  @keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  :global(.animate-fade-in) { animation: fadeIn 0.2s ease-out; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  :global(.animate-slide-left) { animation: slideLeft 0.2s ease-out; }
  @keyframes slideLeft { from { opacity: 0; transform: translateX(12px); } to { opacity: 1; transform: translateX(0); } }
  :global(.animate-slide-right) { animation: slideRight 0.2s ease-out; }
  @keyframes slideRight { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }
</style>
