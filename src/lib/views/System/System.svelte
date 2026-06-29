<script lang="ts">
  import { onMount } from "svelte";
  import { cn } from "../../helpers/classname";
  import {
    uciGet,
    uciSetSection,
    uciCommit,
    uciAdd,
    rcInit,
    getTimezones,
    getUnixtime,
    getSystemFeatures,
  } from "../../api/ubus";
  import { t as _t, getLocale, setLocale, onLocaleChange } from "../../i18n";
  import { getTheme, setTheme, onThemeChange } from "../../theme";
  import General from "./Settings/General.svelte";
  import Logging from "./Settings/Logging.svelte";
  import LanguageStyle from "./Settings/LanguageStyle.svelte";
  import TimeSync from "./Settings/TimeSync.svelte";

  const FALLBACK_TIMEZONES: Record<string, { tzstring: string }> = {};
  let locale = $state(getLocale());
  let theme = $state(getTheme());
  let tablefilters = $state(false);
  let langOptions = $state([
    { value: "id", label: "Indonesian" },
    { value: "en", label: "English" },
    { value: "jaksel", label: "Jaksel" },
    { value: "bogorian", label: "Bogorian" },
  ]);
  let themeOptions = $state([
    { value: "", label: "Default" },
    { value: "/luci-static/bootstrap", label: "Bootstrap" },
    { value: "/luci-static/material", label: "Material" },
    { value: "/luci-static/openwrt2020", label: "OpenWrt 2020" },
  ]);
  const defaultNTPServers = [
    "0.openwrt.pool.ntp.org",
    "1.openwrt.pool.ntp.org",
    "2.openwrt.pool.ntp.org",
    "3.openwrt.pool.ntp.org",
  ];
  let tab = $state<"general" | "logging" | "timesync" | "languageandstyle">(
    "general",
  );
  let tabDir = $state("left");
  let saving = $state(false);
  let saveFeedback = $state("");
  let timezoneMap =
    $state<Record<string, { tzstring: string }>>(FALLBACK_TIMEZONES);
  let unixtime = $state(0);
  let ntpdAvailable = $state(false);
  let systemSection = $state("");
  let ntpSection = $state("");
  let hostname = $state(""),
    description = $state(""),
    notes = $state(""),
    zonename = $state("UTC");
  let clockTimestyle = $state(false),
    clockHourcycle = $state("");
  let logSize = $state(""),
    logIp = $state(""),
    logPort = $state(""),
    logProto = $state("udp"),
    logFile = $state("");
  let conloglevel = $state("7"),
    cronloglevel = $state("7");
  let ntpEnabled = $state(false),
    ntpEnableServer = $state(false),
    ntpInterface = $state(""),
    ntpUseDhcp = $state(true);
  let ntpServers = $state<string[]>([]);
  let pollTimer: ReturnType<typeof setInterval>;

  const tzOptions = $derived(
    Object.keys(timezoneMap)
      .sort()
      .map((k) => ({ value: k, label: k })),
  );
  let trans = $derived.by(() => {
    locale;
    return (key: string) => _t(key);
  });

  const formatLocaltime = (epoch: number) => {
    if (!epoch || isNaN(epoch)) return "Loading…";
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "long",
        timeZone: zonename?.replace(/_/g, " ") || "UTC",
      }).format(new Date(epoch * 1000));
    } catch {
      return new Date(epoch * 1000).toLocaleString();
    }
  };

  const switchTab = (t: typeof tab) => {
    if (t === tab) return;
    tabDir =
      ["general", "logging", "timesync", "languageandstyle"].indexOf(t) >
      ["general", "logging", "timesync", "languageandstyle"].indexOf(tab)
        ? "left"
        : "right";
    tab = t;
  };

  const fetchData = async () => {
    const ut = await getUnixtime();
    if (ut) unixtime = ut;
  };

  const save = async () => {
    saving = true;
    saveFeedback = "";
    try {
      await uciSetSection("system", systemSection, {
        hostname,
        description,
        notes,
        zonename,
        timezone: timezoneMap[zonename]?.tzstring || zonename,
        clock_timestyle: clockTimestyle ? "1" : "0",
        clock_hourcycle: clockHourcycle,
        log_size: logSize,
        log_ip: logIp,
        log_port: logPort,
        log_proto: logProto,
        log_file: logFile,
        conloglevel,
        cronloglevel,
      });
      if (ntpdAvailable) {
        if (ntpEnabled && !ntpSection) {
          await uciAdd("system", "timeserver", "ntp");
          ntpSection = "ntp";
          await uciSetSection("system", ntpSection, {
            server: defaultNTPServers,
          });
        }
        if (ntpSection) {
          await uciSetSection("system", ntpSection, {
            enabled: ntpEnabled ? "1" : "0",
            enable_server: ntpEnableServer ? "1" : "0",
            interface: ntpInterface,
            use_dhcp: ntpUseDhcp ? "1" : "0",
            server: ntpServers.length > 0 ? ntpServers : defaultNTPServers,
          });
        }
        await rcInit("sysntpd", "restart");
      }
      setLocale(locale);
      setTheme(theme);
      await uciSetSection("luci", "main", {
        tablefilters: tablefilters ? "1" : "0",
      });
      await uciCommit("system");
      await uciCommit("luci");
      saveFeedback = trans("Saved");
    } catch {
      saveFeedback = trans("Save failed");
    }
    saving = false;
    setTimeout(() => {
      saveFeedback = "";
    }, 3000);
  };

  const syncBrowser = async () => {
    await fetch("/ubus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "call",
        params: [
          localStorage.getItem("owrt_session") ||
            "00000000000000000000000000000000",
          "luci",
          "setLocaltime",
          { localtime: Math.floor(Date.now() / 1000) },
        ],
      }),
    });
    await fetchData();
  };

  const syncNTP = async () => {
    await rcInit("sysntpd", "restart");
    setTimeout(fetchData, 2000);
  };

  onMount(() => {
    (async () => {
      const [sysConfig, tzData, ut, features] = await Promise.all([
        uciGet("system"),
        getTimezones(),
        getUnixtime(),
        getSystemFeatures(),
      ]);
      if (tzData) timezoneMap = { ...FALLBACK_TIMEZONES, ...tzData };
      if (ut && typeof ut === "number") unixtime = ut;
      ntpdAvailable = features?.sysntpd === true;
      const sysSections = Object.values(sysConfig?.values || {}) as any[];
      if (sysSections.length) {
        const sys = sysSections.find((s: any) => s[".type"] === "system");
        const ntp = sysSections.find((s: any) => s[".type"] === "timeserver");
        if (sys) {
          systemSection = sys[".name"];
          hostname = sys.hostname || "";
          description = sys.description || "";
          notes = sys.notes || "";
          zonename = sys.zonename || "UTC";
          clockTimestyle = sys.clock_timestyle === "1";
          clockHourcycle = sys.clock_hourcycle || "";
          logSize = sys.log_size || "";
          logIp = sys.log_ip || "";
          logPort = sys.log_port || "";
          logProto = sys.log_proto || "udp";
          logFile = sys.log_file || "";
          conloglevel = sys.conloglevel || "7";
          cronloglevel = sys.cronloglevel || "7";
        }
        if (ntp) {
          ntpSection = ntp[".name"];
          ntpEnabled = ntp.enabled !== "0";
          ntpEnableServer = ntp.enable_server === "1";
          ntpInterface = ntp.interface || "";
          ntpUseDhcp = ntp.use_dhcp !== "0";
          ntpServers = Array.isArray(ntp.server)
            ? [...ntp.server]
            : ntp.server && typeof ntp.server === "object"
              ? Object.values(ntp.server)
              : ntp.server
                ? [ntp.server]
                : [];
        }
      }
      const luciConfig = await uciGet("luci");
      const main = (Object.values(luciConfig?.values || {}) as any[]).find(
        (s: any) => s[".type"] === "main",
      );
      if (main) tablefilters = main.tablefilters === "1";
    })();
    const unsubLocale = onLocaleChange(() => {
      locale = getLocale();
    });
    const unsubTheme = onThemeChange(() => {
      theme = getTheme();
    });
    pollTimer = setInterval(fetchData, 5000);
    return () => {
      clearInterval(pollTimer);
      unsubLocale();
      unsubTheme();
    };
  });
</script>

<div
  class={cn("p-6", "flex", "flex-col", "h-screen", "gap-4", "animate-fade-in")}
>
  <div
    class={cn("shrink-0", "flex", "items-start", "justify-between", "gap-4")}
  >
    <div>
      <h1 class={cn("text-lg", "font-semibold", "text-white")}>
        {trans("System")}
      </h1>
      <p class={cn("text-sm", "mt-0.5", "text-muted")}>
        {trans("Hostname, timezone, logging, NTP")}
      </p>
    </div>
    <div class={cn("flex", "items-center", "gap-3")}>
      {#if saveFeedback}
        <span
          class={cn(
            "text-xs",
            "font-mono",
            saveFeedback === "Saved" ? "text-accent" : "text-danger",
          )}>{saveFeedback}</span
        >
      {/if}
      <button
        onclick={save}
        disabled={saving}
        class={cn(
          "px-3",
          "py-1.5",
          "text-xs",
          "rounded-lg",
          "font-medium",
          "transition-all",
          "cursor-pointer",
          saving
            ? cn("border", "text-muted", "bg-surface-3", "border-transparent")
            : cn("border", "text-accent", "bg-accent/10", "border-accent/20"),
        )}
      >
        {saving ? trans("Saving...") : trans("Save & Apply")}
      </button>
    </div>
  </div>

  <div
    class={cn(
      "flex",
      "gap-1",
      "p-0.5",
      "w-fit",
      "shrink-0",
      "border",
      "rounded-lg",
      "bg-surface-2",
      "border-border",
    )}
  >
    {#each [{ id: "general" as const, label: trans("General Settings") }, { id: "logging" as const, label: trans("Logging") }, { id: "timesync" as const, label: trans("Time Synchronization") }, { id: "languageandstyle" as const, label: trans("Language and Style") }] as t}
      <button
        class={cn(
          "px-3",
          "py-1.5",
          "text-xs",
          "rounded-md",
          "font-medium",
          "transition-all",
          "cursor-pointer",
        )}
        style="background:{tab === t.id
          ? 'var(--accent)'
          : 'transparent'};color:{tab === t.id
          ? '#0d1117'
          : 'var(--text-muted)'}"
        onclick={() => switchTab(t.id)}>{t.label}</button
      >
    {/each}
  </div>

  <div class={cn("flex-1", "min-h-0", "overflow-y-auto")}>
    {#key tab}
      <div
        class={cn(
          tabDir === "left" ? "animate-slide-left" : "animate-slide-right",
        )}
      >
        {#if tab === "general"}
          <General
            {unixtime}
            {hostname}
            {description}
            {notes}
            {zonename}
            {clockTimestyle}
            {clockHourcycle}
            {tzOptions}
            {ntpdAvailable}
            {formatLocaltime}
            {syncBrowser}
            {syncNTP}
            {trans}
          />
        {:else if tab === "logging"}
          <Logging
            {logSize}
            {logIp}
            {logPort}
            {logProto}
            {logFile}
            {conloglevel}
            {cronloglevel}
            {trans}
          />
        {:else if tab === "languageandstyle"}
          <LanguageStyle
            {locale}
            {theme}
            {tablefilters}
            {langOptions}
            {themeOptions}
            {setLocale}
            {setTheme}
            {trans}
          />
        {:else if tab === "timesync"}
          <TimeSync
            {ntpdAvailable}
            {ntpEnabled}
            {ntpEnableServer}
            {ntpInterface}
            {ntpUseDhcp}
            {ntpServers}
            {trans}
          />
        {/if}
      </div>
    {/key}
  </div>
</div>
