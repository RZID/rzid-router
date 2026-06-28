<script lang="ts">
  import { onMount } from "svelte";
  import { Play, Globe, Network as NetworkIcon, Search, ChevronDown } from "@lucide/svelte";
  import { cn } from "../helpers/classname";
  import { t as _t, getLocale, onLocaleChange } from "../i18n";
  import { execCommand, call, uciGet, uciSet, uciCommit, uciSetSection } from "../api/ubus";

  let locale = $state(getLocale());
  let trans = $derived.by(() => { locale; return (k: string) => _t(k); });
  $effect(() => onLocaleChange(() => { locale = getLocale(); }));

  let hasPing6 = $state(false);
  let hasTr6 = $state(false);
  let hasArpScan = $state(false);

  let dnsDefault = $state("openwrt.org");
  let pingDefault = $state("openwrt.org");
  let routeDefault = $state("openwrt.org");

  let interfaces: string[] = $state([]);
  let arpIface = $state("");

  let pingAddr = $state("");
  let trAddr = $state("");
  let nsAddr = $state("");

  let running = $state<string | null>(null);
  let output = $state("");

  let showPingMenu = $state(false);
  let showTrMenu = $state(false);

  let saving = $state(false);
  let saveFeedback = $state("");

  const statFile = async (path: string) => {
    const res = await call<{ exists?: boolean }>("file", "stat", { path });
    return res?.exists ?? false;
  };

  const detectFeatures = async () => {
    const [p6, t6, arp, uci] = await Promise.all([
      statFile("/bin/ping6"),
      statFile("/bin/traceroute6"),
      statFile("/usr/bin/arp-scan"),
      uciGet("luci"),
    ]);
    hasPing6 = p6;
    hasTr6 = t6;
    hasArpScan = arp;

    if (uci?.values) {
      const diag = (Object.values(uci.values) as any[]).find((s: any) => s[".type"] === "diag") || {};
      dnsDefault = diag.dns || "openwrt.org";
      pingDefault = diag.ping || "openwrt.org";
      routeDefault = diag.route || "openwrt.org";
    }
    pingAddr = pingDefault;
    trAddr = routeDefault;
    nsAddr = dnsDefault;
  };

  const loadInterfaces = async () => {
    const devs = await call<{ device: string[] }>("network", "get_devices", {});
    if (devs?.device) {
      interfaces = devs.device;
      arpIface = devs.device[0] || "";
    }
  };

  const runCmd = async (
    id: string,
    command: string,
    args: string[],
  ) => {
    running = id;
    output = "";
    const res = await execCommand(command, args);
    if (res) {
      output = res.stdout || "";
      if (res.stderr) output += "\n" + res.stderr;
      if (res.code !== undefined && res.code !== 0) {
        output += `\n\nexit code: ${res.code}`;
      }
    } else {
      output = trans("Command failed");
    }
    running = null;
  };

  const doPing = (v6: boolean) => {
    const addr = pingAddr.trim() || pingDefault;
    if (!addr) return;
    if (v6 && hasPing6) {
      runCmd("ping6", "ping6", ["-6", "-c", "5", addr]);
    } else {
      runCmd("ping", "ping", ["-4", "-c", "5", "-W", "1", addr]);
    }
  };

  const doTraceroute = (v6: boolean) => {
    const addr = trAddr.trim() || routeDefault;
    if (!addr) return;
    if (v6 && hasTr6) {
      runCmd("tr6", "traceroute", ["-6", "-q", "1", "-w", "2", "-n", addr]);
    } else {
      runCmd("traceroute", "traceroute", ["-4", "-q", "1", "-w", "1", "-n", "-m", "20", addr]);
    }
  };

  const doNslookup = () => {
    const addr = nsAddr.trim() || dnsDefault;
    if (!addr) return;
    runCmd("nslookup", "nslookup", [addr]);
  };

  const doArpScan = () => {
    if (!arpIface) return;
    runCmd("arp", "arp-scan", ["-l", "-I", arpIface]);
  };

  const saveDefaults = async () => {
    saving = true;
    saveFeedback = "";
    try {
      const uci = await uciGet("luci");
      let diagId = "";
      if (uci?.values) {
        const found = (Object.entries(uci.values) as [string, any][]).find(([, s]) => s[".type"] === "diag");
        if (found) diagId = found[0];
      }
      if (diagId) {
        await uciSetSection("luci", diagId, {
          ping: pingAddr || pingDefault,
          dns: nsAddr || dnsDefault,
          route: trAddr || routeDefault,
        });
      } else {
        await call("uci", "add", { config: "luci", type: "diag" });
        const uci2 = await uciGet("luci");
        if (uci2?.values) {
          const found = (Object.entries(uci2.values) as [string, any][]).find(([, s]) => s[".type"] === "diag");
          if (found) {
            await uciSetSection("luci", found[0], {
              ping: pingAddr || pingDefault,
              dns: nsAddr || dnsDefault,
              route: trAddr || routeDefault,
            });
          }
        }
      }
      await uciCommit("luci");
      saveFeedback = "saved";
    } catch {
      saveFeedback = "error";
    }
    saving = false;
    setTimeout(() => { saveFeedback = ""; }, 3000);
  };

  const isRunning = (id: string) => running?.startsWith(id);

  onMount(() => {
    detectFeatures();
    loadInterfaces();
  });
</script>

<div class={cn("p-6", "max-w-4xl", "mx-auto")}>
  <h1 class={cn("text-2xl", "font-bold", "text-[var(--text)]", "mb-1")}>
    {trans("Diagnostics")}
  </h1>
  <p class={cn("text-sm", "text-[var(--text-muted)]", "mb-6")}>
    {trans("Ping, traceroute, nslookup")}
  </p>

  <div class={cn(
    "bg-[var(--surface)]", "border", "border-[var(--border)]", "rounded-xl", "p-5",
  )}>
    <!-- Ping -->
    <div class={cn("flex", "items-center", "gap-3", "mb-3")}>
      <div class={cn("flex-1")}>
        <input
          type="text"
          bind:value={pingAddr}
          placeholder={pingDefault}
          class={cn(
            "w-full", "bg-[var(--surface)]", "border", "border-[var(--border)]",
            "rounded-lg", "px-3", "py-2", "text-sm", "text-[var(--text)]",
            "placeholder:text-[var(--text-muted)]",
            "focus:outline-none", "focus:border-[var(--accent)]", "focus:ring-1", "focus:ring-[var(--accent)]",
            "transition-colors",
          )}
        />
      </div>
      <div class={cn("flex", "items-center", "gap-1")}>
        <button
          onclick={() => doPing(false)}
          disabled={isRunning("ping")}
          class={cn(
            "flex", "items-center", "gap-1.5", "px-4", "py-2", "rounded-lg",
            "text-sm", "font-medium", "transition-all", "duration-150",
            "bg-[var(--accent)]", "text-white",
            "hover:brightness-110", "active:brightness-90",
            "disabled:opacity-50", "disabled:cursor-not-allowed",
            !hasPing6 ? "rounded-lg" : "rounded-r-none",
          )}
        >
          <Play size={14} />
          {isRunning("ping") ? trans("Running...") : "Ping"}
        </button>
        {#if hasPing6}
          <div class={cn("relative")}>
            <button
              onclick={() => { showPingMenu = !showPingMenu; }}
              disabled={isRunning("ping")}
              class={cn(
                "flex", "items-center", "px-2", "py-2", "rounded-r-lg",
                "text-sm", "font-medium", "transition-all", "duration-150",
                "bg-[var(--accent)]", "text-white",
                "hover:brightness-110", "active:brightness-90",
                "border-l", "border-white/20",
                "disabled:opacity-50", "disabled:cursor-not-allowed",
              )}
            >
              <ChevronDown size={14} />
            </button>
            {#if showPingMenu}
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                class={cn(
                  "absolute", "right-0", "top-full", "mt-1", "z-50",
                  "bg-[var(--surface)]", "border", "border-[var(--border)]",
                  "rounded-lg", "shadow-xl", "py-1", "min-w-[140px]",
                )}
                onclick={() => { showPingMenu = false; }}
                onmouseleave={() => { showPingMenu = false; }}
              >
                <button
                  onclick={() => doPing(false)}
                  class={cn(
                    "w-full", "text-left", "px-4", "py-2", "text-sm",
                    "text-[var(--text)]", "hover:bg-[var(--border)]", "transition-colors",
                  )}
                >
                  IPv4 Ping
                </button>
                <button
                  onclick={() => doPing(true)}
                  class={cn(
                    "w-full", "text-left", "px-4", "py-2", "text-sm",
                    "text-[var(--text)]", "hover:bg-[var(--border)]", "transition-colors",
                  )}
                >
                  IPv6 Ping
                </button>
              </div>
            {/if}
          </div>
        {/if}
      </div>
      <Globe size={16} class={cn("text-[var(--text-muted)]", "shrink-0")} />
    </div>

    <!-- Traceroute -->
    <div class={cn("flex", "items-center", "gap-3", "mb-3")}>
      <div class={cn("flex-1")}>
        <input
          type="text"
          bind:value={trAddr}
          placeholder={routeDefault}
          class={cn(
            "w-full", "bg-[var(--surface)]", "border", "border-[var(--border)]",
            "rounded-lg", "px-3", "py-2", "text-sm", "text-[var(--text)]",
            "placeholder:text-[var(--text-muted)]",
            "focus:outline-none", "focus:border-[var(--accent)]", "focus:ring-1", "focus:ring-[var(--accent)]",
            "transition-colors",
          )}
        />
      </div>
      <div class={cn("flex", "items-center", "gap-1")}>
        <button
          onclick={() => doTraceroute(false)}
          disabled={isRunning("tr")}
          class={cn(
            "flex", "items-center", "gap-1.5", "px-4", "py-2",
            "text-sm", "font-medium", "transition-all", "duration-150",
            "bg-[var(--accent)]", "text-white",
            "hover:brightness-110", "active:brightness-90",
            "disabled:opacity-50", "disabled:cursor-not-allowed",
            !hasTr6 ? "rounded-lg" : "rounded-r-none",
            isRunning("tr") ? "rounded-lg" : "",
          )}
        >
          <NetworkIcon size={14} />
          {isRunning("tr") ? trans("Running...") : "Traceroute"}
        </button>
        {#if hasTr6}
          <div class={cn("relative")}>
            <button
              onclick={() => { showTrMenu = !showTrMenu; }}
              disabled={isRunning("tr")}
              class={cn(
                "flex", "items-center", "px-2", "py-2", "rounded-r-lg",
                "text-sm", "font-medium", "transition-all", "duration-150",
                "bg-[var(--accent)]", "text-white",
                "hover:brightness-110", "active:brightness-90",
                "border-l", "border-white/20",
                "disabled:opacity-50", "disabled:cursor-not-allowed",
              )}
            >
              <ChevronDown size={14} />
            </button>
            {#if showTrMenu}
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                class={cn(
                  "absolute", "right-0", "top-full", "mt-1", "z-50",
                  "bg-[var(--surface)]", "border", "border-[var(--border)]",
                  "rounded-lg", "shadow-xl", "py-1", "min-w-[170px]",
                )}
                onclick={() => { showTrMenu = false; }}
                onmouseleave={() => { showTrMenu = false; }}
              >
                <button
                  onclick={() => doTraceroute(false)}
                  class={cn(
                    "w-full", "text-left", "px-4", "py-2", "text-sm",
                    "text-[var(--text)]", "hover:bg-[var(--border)]", "transition-colors",
                  )}
                >
                  IPv4 Traceroute
                </button>
                <button
                  onclick={() => doTraceroute(true)}
                  class={cn(
                    "w-full", "text-left", "px-4", "py-2", "text-sm",
                    "text-[var(--text)]", "hover:bg-[var(--border)]", "transition-colors",
                  )}
                >
                  IPv6 Traceroute
                </button>
              </div>
            {/if}
          </div>
        {/if}
      </div>
      <NetworkIcon size={16} class={cn("text-[var(--text-muted)]", "shrink-0")} />
    </div>

    <!-- Nslookup -->
    <div class={cn("flex", "items-center", "gap-3", "mb-3")}>
      <div class={cn("flex-1")}>
        <input
          type="text"
          bind:value={nsAddr}
          placeholder={dnsDefault}
          class={cn(
            "w-full", "bg-[var(--surface)]", "border", "border-[var(--border)]",
            "rounded-lg", "px-3", "py-2", "text-sm", "text-[var(--text)]",
            "placeholder:text-[var(--text-muted)]",
            "focus:outline-none", "focus:border-[var(--accent)]", "focus:ring-1", "focus:ring-[var(--accent)]",
            "transition-colors",
          )}
        />
      </div>
      <button
        onclick={doNslookup}
        disabled={isRunning("nslookup")}
        class={cn(
          "flex", "items-center", "gap-1.5", "px-4", "py-2", "rounded-lg",
          "text-sm", "font-medium", "transition-all", "duration-150",
          "bg-[var(--accent)]", "text-white",
          "hover:brightness-110", "active:brightness-90",
          "disabled:opacity-50", "disabled:cursor-not-allowed",
        )}
      >
        <Search size={14} />
        {isRunning("nslookup") ? trans("Running...") : "Nslookup"}
      </button>
      <Search size={16} class={cn("text-[var(--text-muted)]", "shrink-0")} />
    </div>

    <!-- ARP Scan -->
    {#if hasArpScan}
      <div class={cn("flex", "items-center", "gap-3")}>
        <div class={cn("flex-1")}>
          <select
            bind:value={arpIface}
            class={cn(
              "w-full", "bg-[var(--surface)]", "border", "border-[var(--border)]",
              "rounded-lg", "px-3", "py-2", "text-sm", "text-[var(--text)]",
              "focus:outline-none", "focus:border-[var(--accent)]", "focus:ring-1", "focus:ring-[var(--accent)]",
              "transition-colors", "cursor-pointer",
            )}
          >
            {#each interfaces as iface}
              <option value={iface}>{iface}</option>
            {/each}
          </select>
        </div>
        <button
          onclick={doArpScan}
          disabled={isRunning("arp")}
          class={cn(
            "flex", "items-center", "gap-1.5", "px-4", "py-2", "rounded-lg",
            "text-sm", "font-medium", "transition-all", "duration-150",
            "bg-[var(--accent)]", "text-white",
            "hover:brightness-110", "active:brightness-90",
            "disabled:opacity-50", "disabled:cursor-not-allowed",
          )}
        >
          <Search size={14} />
          {isRunning("arp") ? trans("Running...") : "ARP Scan"}
        </button>
        <NetworkIcon size={16} class={cn("text-[var(--text-muted)]", "shrink-0")} />
      </div>
    {/if}
  </div>

  <!-- Output -->
  <div class={cn("mt-4")}>
    <div class={cn("flex", "items-center", "justify-between", "mb-2")}>
      <span class={cn("text-sm", "font-medium", "text-[var(--text)]")}>
        {trans("Command Output")}
      </span>
      <button
        onclick={() => { output = ""; }}
        class={cn(
          "text-xs", "text-[var(--text-muted)]", "hover:text-[var(--text)]",
          "transition-colors", "cursor-pointer",
        )}
      >
        Clear
      </button>
    </div>
    <textarea
      readonly
      bind:value={output}
      class={cn(
        "w-full", "h-[400px]", "bg-[var(--surface)]", "border", "border-[var(--border)]",
        "rounded-xl", "px-4", "py-3", "text-sm", "font-mono", "text-[var(--text)]",
        "resize-y", "whitespace-pre", "wrap-off",
        "focus:outline-none",
      )}
      id="widget.command-output"
      placeholder={trans("Run a command to see output here")}
    ></textarea>
  </div>

  <!-- Save defaults -->
  <div class={cn("mt-6", "flex", "items-center", "gap-4")}>
    <button
      onclick={saveDefaults}
      disabled={saving}
      class={cn(
        "flex", "items-center", "gap-1.5", "px-5", "py-2", "rounded-lg",
        "text-sm", "font-medium", "transition-all", "duration-150",
        "bg-[var(--accent)]", "text-white",
        "hover:brightness-110", "active:brightness-90",
        "disabled:opacity-50", "disabled:cursor-not-allowed",
      )}
    >
      {saving ? trans("Saving...") : trans("Save & Apply")}
    </button>
    {#if saveFeedback === "saved"}
      <span class={cn("text-sm", "text-green-500")}>{trans("Saved")}</span>
    {:else if saveFeedback === "error"}
      <span class={cn("text-sm", "text-red-500")}>{trans("Save failed")}</span>
    {/if}
  </div>
</div>

<style>
  :global(textarea#widget\.command-output) {
    field-sizing: content;
  }
</style>
