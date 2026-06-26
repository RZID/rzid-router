<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import Select from "../components/Select/index.svelte";
  import Input from "../components/Input/index.svelte";
  import Textarea from "../components/Textarea/index.svelte";
  import Toggle from "../components/Toggle/index.svelte";
  import { cn } from "../helpers/classname";
  import {
    uciGet,
    uciSetSection,
    uciCommit,
    uciAdd,
    rcInit,
    getTimezones,
    getUnixtime,
    getSystemFeatures,
  } from "../api/ubus";

  const FALLBACK_TIMEZONES: Record<string, { tzstring: string }> = {
    UTC: { tzstring: "UTC" },
    "Asia/Jakarta": { tzstring: "WIB-7" },
    "Asia/Makassar": { tzstring: "WITA-8" },
    "Asia/Jayapura": { tzstring: "WIT-9" },
    "Asia/Singapore": { tzstring: "SGT-8" },
    "Asia/Hong_Kong": { tzstring: "HKT-8" },
    "Asia/Tokyo": { tzstring: "JST-9" },
    "Asia/Shanghai": { tzstring: "CST-8" },
    "Asia/Kolkata": { tzstring: "IST-5:30" },
    "Asia/Dubai": { tzstring: "GST-4" },
    "Europe/London": { tzstring: "GMT0" },
    "Europe/Berlin": { tzstring: "CET-1CEST,M3.5.0,M10.5.0/3" },
    "Europe/Paris": { tzstring: "CET-1CEST,M3.5.0,M10.5.0/3" },
    "Europe/Moscow": { tzstring: "MSK-3" },
    "US/Eastern": { tzstring: "EST5EDT,M3.2.0,M11.1.0" },
    "US/Central": { tzstring: "CST6CDT,M3.2.0,M11.1.0" },
    "US/Mountain": { tzstring: "MST7MDT,M3.2.0,M11.1.0" },
    "US/Pacific": { tzstring: "PST8PDT,M3.2.0,M11.1.0" },
    "Australia/Sydney": { tzstring: "AEST-10AEDT,M10.1.0,M4.1.0/3" },
    "Pacific/Auckland": { tzstring: "NZST-12NZDT,M9.5.0,M4.1.0/3" },
  };

  let lang = $state("auto");
  let mediaurlbase = $state("");
  let tablefilters = $state(false);
  let langOptions = $state<{ value: string; label: string }[]>([{ value: "auto", label: "auto" }, { value: "en", label: "English" }]);
  let themeOptions = $state<{ value: string; label: string }[]>([]);

  const defaultNTPServers = [
    "0.openwrt.pool.ntp.org",
    "1.openwrt.pool.ntp.org",
    "2.openwrt.pool.ntp.org",
    "3.openwrt.pool.ntp.org",
  ];

  let tab = $state<"general" | "logging" | "timesync" | "languageandstyle">("general");
  let prevTab = $state("general");
  let tabDir = $state("left");
  let saving = $state(false);
  let saveFeedback = $state("");

  let timezoneMap = $state<
    Record<string, { tzstring: string }>
  >(FALLBACK_TIMEZONES);
  let unixtime = $state(0);
  let ntpdAvailable = $state(false);
  let systemSection = $state("");
  let ntpSection = $state("");

  let hostname = $state("");
  let description = $state("");
  let notes = $state("");
  let zonename = $state("UTC");
  let clockTimestyle = $state(false);
  let clockHourcycle = $state("");

  let logSize = $state("");
  let logIp = $state("");
  let logPort = $state("");
  let logProto = $state("udp");
  let logFile = $state("");
  let conloglevel = $state("7");
  let cronloglevel = $state("7");

  let ntpEnabled = $state(false);
  let ntpEnableServer = $state(false);
  let ntpInterface = $state("");
  let ntpUseDhcp = $state(true);
  let ntpServers = $state<string[]>([]);

  let pollTimer: ReturnType<typeof setInterval>;

  const tzOptions = $derived(
    Object.keys(timezoneMap)
      .sort()
      .map((k) => ({ value: k, label: k })),
  );

  const formatLocaltime = (epoch: number) => {
    if (!epoch || isNaN(epoch)) return "Loading…";
    try {
      const date = new Date(epoch * 1000);
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "long",
        timeZone: zonename?.replace(/_/g, " ") || "UTC",
      }).format(date);
    } catch {
      return new Date(epoch * 1000).toLocaleString();
    }
  };

  const switchTab = (t: "general" | "logging" | "timesync" | "languageandstyle") => {
    if (t === tab) return;
    const order = ["general", "logging", "timesync", "languageandstyle"];
    tabDir = order.indexOf(t) > order.indexOf(tab) ? "left" : "right";
    prevTab = t;
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

      await uciSetSection("luci", "main", {
        lang,
        mediaurlbase,
        tablefilters: tablefilters ? "1" : "0",
      });

      await uciCommit("system");
      await uciCommit("luci");
      saveFeedback = "Saved";
    } catch {
      saveFeedback = "Save failed";
    }

    saving = false;
    setTimeout(() => { saveFeedback = ""; }, 3000);
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
          localStorage.getItem("owrt_session") || "00000000000000000000000000000000",
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

  onMount(async () => {
    const [sysConfig, luciConfig, tzData, ut, features] = await Promise.all([
      uciGet("system"),
      uciGet("luci"),
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
        ntpServers = Array.isArray(ntp.server) ? [...ntp.server] :
          ntp.server && typeof ntp.server === "object" ? Object.values(ntp.server) :
          ntp.server ? [ntp.server] : [];
      }
    }

    const luciSections = Object.values(luciConfig?.values || {}) as any[];
    if (luciSections.length) {
      const main = luciSections.find((s: any) => s[".type"] === "main");
      const langs = luciSections.find((s: any) => s[".type"] === "languages");
      const themes = luciSections.find((s: any) => s[".type"] === "themes");

      if (main) {
        lang = main.lang || "auto";
        mediaurlbase = main.mediaurlbase || "";
        tablefilters = main.tablefilters === "1";
      }

      if (langs) {
        const entries = Object.entries(langs)
          .filter(([k]) => !k.startsWith("."))
          .map(([k, v]) => ({ value: k, label: v as string }))
          .sort((a, b) => a.label.localeCompare(b.label));
        langOptions = [
          { value: "auto", label: "auto" },
          { value: "en", label: "English" },
          ...entries,
        ];
      }

      if (themes) {
        themeOptions = Object.entries(themes)
          .filter(([k]) => !k.startsWith("."))
          .map(([k, v]) => ({ value: v as string, label: k }))
          .sort((a, b) => a.label.localeCompare(b.label));
      }
    }

    pollTimer = setInterval(fetchData, 5000);
  });

  onDestroy(() => clearInterval(pollTimer));
</script>

<div class={cn("p-6", "flex", "flex-col", "h-screen", "gap-4", "animate-fade-in")}>
  <!-- Header -->
  <div class={cn("shrink-0", "flex", "items-start", "justify-between", "gap-4")}>
    <div>
      <h1 class={cn("text-lg", "font-semibold", "text-white")}>System</h1>
      <p class={cn("text-sm", "mt-0.5", "text-muted")}>
        Hostname, timezone, logging, NTP
      </p>
    </div>

    <div class={cn("flex", "items-center", "gap-3")}>
      {#if saveFeedback}
        <span
          class={cn(
            "text-xs",
            "font-mono",
            saveFeedback === "Saved" ? "text-accent" : "text-danger",
          )}
        >
          {saveFeedback}
        </span>
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
        {saving ? "Saving…" : "Save & Apply"}
      </button>
    </div>
  </div>

  <!-- Tab bar -->
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
    {#each [
      { id: "general" as const, label: "General Settings" },
      { id: "logging" as const, label: "Logging" },
      { id: "timesync" as const, label: "Time Synchronization" },
      { id: "languageandstyle" as const, label: "Language and Style" },
    ] as t}
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
        onclick={() => switchTab(t.id)}
      >
        {t.label}
      </button>
    {/each}
  </div>

  <!-- Content -->
  <div class={cn("flex-1", "min-h-0", "overflow-y-auto")}>
    {#key tab}
    <div
      class={cn(
        tabDir === "left" ? "animate-slide-left" : "animate-slide-right",
      )}
    >
      {#if tab === "general"}
        <div class={cn("space-y-4")}>
          <!-- Local Time -->
          <div class={cn("glass", "p-5", "animate-slide-up")}>
            <span
              class={cn(
                "block",
                "text-[10px]",
                "uppercase",
                "text-muted",
                "font-semibold",
                "tracking-wider",
                "mb-1.5",
              )}
            >
              Local Time
            </span>
            <div class={cn("flex", "items-center", "gap-3")}>
              <Input
                readonly
                mono
                value={formatLocaltime(unixtime)}
                class="flex-1"
              />
              <button
                onclick={syncBrowser}
                class={cn(
                  "px-2.5",
                  "py-1.5",
                  "border",
                  "text-xs",
                  "rounded-md",
                  "font-medium",
                  "transition-all",
                  "cursor-pointer",
                  "hover:bg-accent/15",
                  "text-accent",
                  "bg-accent/10",
                  "border-accent/20",
                )}
              >
                Sync with browser
              </button>
              {#if ntpdAvailable}
                <button
                  onclick={syncNTP}
                  class={cn(
                    "px-2.5",
                    "py-1.5",
                    "border",
                    "text-xs",
                    "rounded-md",
                    "font-medium",
                    "transition-all",
                    "cursor-pointer",
                    "hover:bg-accent/15",
                    "text-accent",
                    "bg-accent/10",
                    "border-accent/20",
                  )}
                >
                  Sync with NTP
                </button>
              {/if}
            </div>
          </div>

          <!-- Hostname -->
          <div class={cn("glass", "p-5", "animate-slide-up")}>
            <Input
              label="Hostname"
              bind:value={hostname}
              placeholder="OpenWrt"
              class="max-w-sm"
            />
          </div>

          <!-- Description -->
          <div class={cn("glass", "p-5", "animate-slide-up")}>
            <Input
              label="Description"
              bind:value={description}
              placeholder="Optional device description"
              class="max-w-sm"
            />
            <p class={cn("text-[10px]", "text-muted", "mt-1")}>
              An optional, short description for this device
            </p>
          </div>

          <!-- Notes -->
          <div class={cn("glass", "p-5", "animate-slide-up")}>
            <Textarea
              label="Notes"
              bind:value={notes}
              placeholder="Optional free-form notes"
              class="max-w-lg"
            />
            <p class={cn("text-[10px]", "text-muted", "mt-1")}>
              Optional, free-form notes about this device
            </p>
          </div>

          <!-- Timezone -->
          <div class={cn("glass", "p-5", "animate-slide-up")}>
            <Select
              label="Timezone"
              options={tzOptions}
              bind:value={zonename}
            />
          </div>

          <!-- Time Format -->
          <div class={cn("glass", "p-5", "animate-slide-up")}>
            <Toggle
              label="Full TimeZone Name"
              description="Unchecked means the timezone offset (E.g. GMT+1) is displayed"
              bind:checked={clockTimestyle}
            />
            <Select
              label="Time Format"
              options={[
                { value: "", label: "Default" },
                { value: "h12", label: "12-Hour Clock" },
                { value: "h23", label: "24-Hour Clock" },
              ]}
              bind:value={clockHourcycle}
            />
          </div>
        </div>

      {:else if tab === "logging"}
        <div class={cn("space-y-4")}>
          <!-- Log buffer size -->
          <div class={cn("glass", "p-5", "animate-slide-up")}>
            <Input
              label="System log buffer size (kiB)"
              type="number"
              bind:value={logSize}
              placeholder="128"
              class="max-w-xs"
            />
          </div>

          <!-- External log server -->
          <div class={cn("glass", "p-5", "animate-slide-up")}>
            <span
              class={cn(
                "block",
                "text-[10px]",
                "uppercase",
                "text-muted",
                "font-semibold",
                "tracking-wider",
                "mb-1.5",
              )}
            >
              External system log server
            </span>
            <div class={cn("flex", "flex-wrap", "items-center", "gap-2")}>
              <Input
                bind:value={logIp}
                placeholder="0.0.0.0"
                class="w-44"
              />
              <span class={cn("text-xs", "text-muted")}>:</span>
              <Input
                type="number"
                bind:value={logPort}
                placeholder="514"
                class="w-24"
              />
              <Select
                options={[
                  { value: "udp", label: "UDP" },
                  { value: "tcp", label: "TCP" },
                ]}
                bind:value={logProto}
                class="w-20"
              />
            </div>
          </div>

          <!-- Log file -->
          <div class={cn("glass", "p-5", "animate-slide-up")}>
            <Input
              label="Write system log to file"
              bind:value={logFile}
              placeholder="/tmp/system.log"
              class="max-w-sm"
              mono
            />
          </div>

          <!-- Log output level -->
          <div class={cn("glass", "p-5", "animate-slide-up")}>
            <Select
              label="Log output level"
              options={[
                { value: "8", label: "Debug" },
                { value: "7", label: "Info" },
                { value: "6", label: "Notice" },
                { value: "5", label: "Warning" },
                { value: "4", label: "Error" },
                { value: "3", label: "Critical" },
                { value: "2", label: "Alert" },
                { value: "1", label: "Emergency" },
              ]}
              bind:value={conloglevel}
            />
            <p class={cn("text-[10px]", "text-muted", "mt-1")}>
              Only affects dmesg kernel log
            </p>
          </div>

          <!-- Cron log level -->
          <div class={cn("glass", "p-5", "animate-slide-up")}>
            <Select
              label="Cron Log Level"
              options={[
                { value: "7", label: "Normal" },
                { value: "9", label: "Disabled" },
                { value: "5", label: "Debug" },
              ]}
              bind:value={cronloglevel}
            />
          </div>
        </div>

      {:else if tab === "languageandstyle"}
        <div class={cn("space-y-4")}>
          <div class={cn("glass", "p-5", "animate-slide-up")}>
            <Select
              label="Language"
              options={langOptions}
              bind:value={lang}
            />
          </div>

          <div class={cn("glass", "p-5", "animate-slide-up")}>
            <Select
              label="Design"
              options={themeOptions}
              bind:value={mediaurlbase}
              placeholder="Default"
            />
          </div>

          <div class={cn("glass", "p-5", "animate-slide-up")}>
            <Toggle
              label="Table Filters"
              description="Enable column filter inputs in overview tables"
              bind:checked={tablefilters}
            />
          </div>
        </div>

      {:else if tab === "timesync"}
        <div class={cn("space-y-4")}>
          {#if !ntpdAvailable}
            <div
              class={cn(
                "glass",
                "p-5",
                "animate-slide-up",
                "text-xs",
                "text-muted",
              )}
            >
              NTP daemon is not available on this system
            </div>
          {:else}
            <div class={cn("glass", "p-5", "animate-slide-up")}>
            <Toggle label="Enable NTP client" bind:checked={ntpEnabled} />
            </div>

            {#if ntpEnabled}
              <div class={cn("glass", "p-5", "animate-slide-up")}>
                <Toggle
                  label="Provide NTP server"
                  bind:checked={ntpEnableServer}
                />

                {#if ntpEnableServer}
                  <Input
                    label="Bind NTP server to interface"
                    bind:value={ntpInterface}
                    placeholder="All interfaces"
                    class="max-w-sm"
                  />
                {/if}
              </div>

              <div class={cn("glass", "p-5", "animate-slide-up")}>
                <Toggle
                  label="Use DHCP advertised servers"
                  bind:checked={ntpUseDhcp}
                />
              </div>

              <div class={cn("glass", "p-5", "animate-slide-up")}>
                <span
                  class={cn(
                    "block",
                    "text-[10px]",
                    "uppercase",
                    "text-muted",
                    "font-semibold",
                    "tracking-wider",
                    "mb-1.5",
                  )}
                >
                  NTP server candidates
                </span>
                <p class={cn("text-[10px]", "text-muted", "mb-3")}>
                  List of upstream NTP server candidates with which to synchronize
                </p>
                <div class={cn("space-y-2")}>
                  {#each ntpServers as _, i}
                    <div class={cn("flex", "items-center", "gap-2")}>
                      <Input
                        bind:value={ntpServers[i]}
                        placeholder="pool.ntp.org"
                        class="flex-1 max-w-sm"
                        mono
                      />
                      <button
                        onclick={() => { ntpServers = ntpServers.filter((_, j) => j !== i); }}
                        class={cn(
                          "px-2",
                          "py-1",
                          "border",
                          "text-xs",
                          "rounded-md",
                          "font-medium",
                          "transition-all",
                          "cursor-pointer",
                          "hover:bg-danger/20",
                          "text-danger",
                          "bg-danger/10",
                          "border-danger/20",
                        )}
                      >
                        Remove
                      </button>
                    </div>
                  {/each}
                </div>
                <button
                  onclick={() => { ntpServers = [...ntpServers, ""]; }}
                  class={cn(
                    "mt-2",
                    "px-2.5",
                    "py-1.5",
                    "border",
                    "text-xs",
                    "rounded-md",
                    "font-medium",
                    "transition-all",
                    "cursor-pointer",
                    "hover:bg-accent/15",
                    "text-accent",
                    "bg-accent/10",
                    "border-accent/20",
                  )}
                >
                  Add server
                </button>
              </div>
            {/if}
          {/if}
        </div>
      {/if}
    </div>
    {/key}
  </div>
</div>
