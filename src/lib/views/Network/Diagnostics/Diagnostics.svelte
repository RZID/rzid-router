<script lang="ts">
  import { onMount } from "svelte";
  import { cn } from "../../../helpers/classname";
  import { t as _t, getLocale, onLocaleChange } from "../../../i18n";
  import {
    execCommand,
    call,
    uciGet,
    uciSet,
    uciCommit,
    uciSetSection,
  } from "../../../api/ubus";
  import PingTool from "./PingTool.svelte";
  import TracerouteTool from "./TracerouteTool.svelte";
  import NslookupTool from "./NslookupTool.svelte";
  import ArpScanTool from "./ArpScanTool.svelte";

  let locale = $state(getLocale());
  let trans = $derived.by(() => {
    locale;
    return (k: string) => _t(k);
  });
  $effect(() =>
    onLocaleChange(() => {
      locale = getLocale();
    }),
  );

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
      const diag =
        (Object.values(uci.values) as any[]).find(
          (s: any) => s[".type"] === "diag",
        ) || {};
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

  const runCmd = async (id: string, command: string, args: string[]) => {
    running = id;
    output = "";
    const res = await execCommand(command, args);
    if (res) {
      output = res.stdout || "";
      if (res.stderr) output += "\n" + res.stderr;
      if (res.code !== undefined && res.code !== 0)
        output += `\n\nexit code: ${res.code}`;
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
      runCmd("traceroute", "traceroute", [
        "-4",
        "-q",
        "1",
        "-w",
        "1",
        "-n",
        "-m",
        "20",
        addr,
      ]);
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
        const found = (Object.entries(uci.values) as [string, any][]).find(
          ([, s]) => s[".type"] === "diag",
        );
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
          const found = (Object.entries(uci2.values) as [string, any][]).find(
            ([, s]) => s[".type"] === "diag",
          );
          if (found)
            await uciSetSection("luci", found[0], {
              ping: pingAddr || pingDefault,
              dns: nsAddr || dnsDefault,
              route: trAddr || routeDefault,
            });
        }
      }
      await uciCommit("luci");
      saveFeedback = "saved";
    } catch {
      saveFeedback = "error";
    }
    saving = false;
    setTimeout(() => {
      saveFeedback = "";
    }, 3000);
  };

  const isRunning = (id: string) => !!running?.startsWith(id);

  onMount(() => {
    detectFeatures();
    loadInterfaces();
  });
</script>

<div class={cn("p-6", "max-w-4xl", "mx-auto")}>
  <h1 class={cn("text-2xl", "font-bold", "text-text", "mb-1")}>
    {trans("Diagnostics")}
  </h1>
  <p class={cn("text-sm", "text-text-muted", "mb-6")}>
    {trans("Ping, traceroute, nslookup")}
  </p>

  <div class={cn("bg-surface", "border", "border-border", "rounded-xl", "p-5")}>
    <PingTool
      value={pingAddr}
      placeholder={pingDefault}
      hasV6={hasPing6}
      running={isRunning("ping")}
      onrun={doPing}
    />
    <TracerouteTool
      value={trAddr}
      placeholder={routeDefault}
      hasV6={hasTr6}
      running={isRunning("tr")}
      onrun={doTraceroute}
    />
    <NslookupTool
      value={nsAddr}
      placeholder={dnsDefault}
      running={isRunning("nslookup")}
      onrun={doNslookup}
    />
    {#if hasArpScan}
      <ArpScanTool
        value={arpIface}
        options={interfaces}
        running={isRunning("arp")}
        onrun={doArpScan}
      />
    {/if}
  </div>

  <div class={cn("mt-4")}>
    <div class={cn("flex", "items-center", "justify-between", "mb-2")}>
      <span class={cn("text-sm", "font-medium", "text-text")}
        >{trans("Command Output")}</span
      >
      <button
        onclick={() => {
          output = "";
        }}
        class={cn(
          "text-xs",
          "text-text-muted",
          "hover:text-text",
          "transition-colors",
          "cursor-pointer",
        )}>{trans("Clear")}</button
      >
    </div>
    <textarea
      readonly
      bind:value={output}
      class={cn(
        "w-full",
        "h-100",
        "bg-surface",
        "border",
        "border-border",
        "rounded-xl",
        "px-4",
        "py-3",
        "text-sm",
        "font-mono",
        "text-text",
        "resize-y",
        "whitespace-pre",
        "wrap-off",
        "focus:outline-none",
      )}
      id="widget.command-output"
      placeholder={trans("Run a command to see output here")}
    ></textarea>
  </div>

  <div class={cn("mt-6", "flex", "items-center", "gap-4")}>
    <button
      onclick={saveDefaults}
      disabled={saving}
      class={cn(
        "flex",
        "items-center",
        "gap-1.5",
        "px-5",
        "py-2",
        "rounded-lg",
        "text-sm",
        "font-medium",
        "transition-all",
        "duration-150",
        "bg-accent",
        "text-white",
        "hover:brightness-110",
        "active:brightness-90",
        "disabled:opacity-50",
        "disabled:cursor-not-allowed",
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
