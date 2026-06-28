<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { Shield, RefreshCw, Square, Play, RotateCcw } from "@lucide/svelte";
  import { flip } from "svelte/animate";
  import { cn } from "../../helpers/classname";
  import { t as _t, getLocale, onLocaleChange } from "../../i18n";
  import {
    uciGet, uciSet, uciCommit,
    banipGetRuntime, banipGetActual, banipInitAction, banipGetFeeds,
    readFile, writeFile, execCommand,
  } from "../../api/ubus";
  import Input from "../../components/Input/index.svelte";
  import Select from "../../components/Select/index.svelte";
  import Toggle from "../../components/Toggle/index.svelte";
  import TabBar from "../../components/TabBar/index.svelte";

  let locale = $state(getLocale());
  let trans = $derived.by(() => { locale; return (k: string) => _t(k); });
  $effect(() => onLocaleChange(() => { locale = getLocale(); }));

  let tab = $state<"general" | "advanced" | "adv_chain" | "adv_set" | "adv_log" | "adv_email" | "feeds">("general");

  let info: BanipRuntime | null = $state(null);
  let infoParseErr = $state(0);

  let uciLoaded = $state(false);
  let ban_enabled = $state(false);
  let ban_debug = $state(false);
  let ban_autodetect = $state(true);
  let ban_protov4 = $state(true);
  let ban_protov6 = $state(true);
  let ban_dev: string[] = $state([]);
  let ban_ifv4: string[] = $state([]);
  let ban_ifv6: string[] = $state([]);
  let ban_fetchcmd = $state("");
  let ban_fetchparm = $state("");
  let ban_trigger: string[] = $state([]);
  let ban_triggerdelay = $state("");
  let ban_fetchretry = $state("");
  let ban_fetchinsecure = $state(false);
  let ban_nftcount = $state(false);
  let ban_map = $state(false);

  let ban_nicelimit = $state("");
  let ban_filelimit = $state("");
  let ban_cores = $state("");
  let ban_splitsize = $state("");
  let ban_basedir = $state("");
  let ban_backupdir = $state("");
  let ban_reportdir = $state("");
  let ban_errordir = $state("");
  let ban_deduplicate = $state(true);

  let ban_nftpriority = $state("");
  let ban_allowflag = $state("");
  let ban_vlanallow: string[] = $state([]);
  let ban_vlanblock: string[] = $state([]);
  let ban_bcp38 = $state(false);
  let ban_icmplimit = $state("");
  let ban_synlimit = $state("");
  let ban_udplimit = $state("");

  let ban_nftpolicy = $state("");
  let ban_nftretry = $state("");
  let ban_blockpolicy = $state("");
  let ban_feedin: string[] = $state([]);
  let ban_feedout: string[] = $state([]);
  let ban_feedinout: string[] = $state([]);
  let ban_feedreset: string[] = $state([]);
  let ban_feedcomplete: string[] = $state([]);

  let ban_nftloglevel = $state("");
  let ban_logprerouting = $state(false);
  let ban_loginbound = $state(false);
  let ban_logoutbound = $state(false);
  let ban_logreadfile = $state("");
  let ban_loglimit = $state("");
  let ban_logcount = $state("");
  let ban_logratelimit = $state("");
  let ban_logburstlimit = $state("");
  let ban_logterm: string[] = $state([]);
  let ban_remotelog = $state(false);
  let ban_remotetoken = $state("");

  let ban_mailnotification = $state(false);
  let ban_mailreceiver = $state("");
  let ban_mailsender = $state("");
  let ban_mailtopic = $state("");
  let ban_mailprofile = $state("");

  let ban_feed: string[] = $state([]);
  let ban_country: string[] = $state([]);
  let ban_region: string[] = $state([]);
  let ban_countrysplit = $state(false);
  let ban_asn: string[] = $state([]);
  let ban_asnsplit = $state(false);
  let ban_allowurl: string[] = $state([]);
  let ban_autoallowlist = $state(true);
  let ban_autoallowuplink = $state("");
  let ban_autoblocklist = $state(true);
  let ban_autoblocksubnet = $state(false);
  let ban_nftexpiry = $state("");
  let ban_allowlistonly = $state(false);

  let saving = $state(false);
  let saveFeedback = $state("");
  let actionBusy = $state(false);

  let ban_dev_input = $state("");
  let ban_ifv4_input = $state("");
  let ban_ifv6_input = $state("");
  let ban_trigger_input = $state("");
  let ban_vlanallow_input = $state("");
  let ban_vlanblock_input = $state("");
  let ban_feedin_input = $state("");
  let ban_feedout_input = $state("");
  let ban_feedinout_input = $state("");
  let ban_feedreset_input = $state("");
  let ban_feedcomplete_input = $state("");
  let ban_logterm_input = $state("");
  let ban_asn_input = $state("");
  let ban_allowurl_input = $state("");

  let feedsData: { default: string; custom: string; countries: string } = $state({ default: "", custom: "", countries: "" });
  let feedKeys: string[] = $state([]);
  let countryOptions: { value: string; label: string }[] = $state([]);

  let pollTimer: ReturnType<typeof setInterval> | undefined;

  let infoItems = $derived([
    { label: "Status", key: "status", val: info?.status ?? null },
    { label: "Element Count", key: "element_count", val: info?.element_count != null ? String(info.element_count) : null },
    { label: "Active Feeds", key: "active_feeds", val: info?.active_feeds?.length ? info.active_feeds.join(", ") : null },
    { label: "Active Devices", key: "devices", val: info ? `wan-dev: ${info.wan_devices?.join(", ") || "-"} / wan-if: ${info.wan_interfaces?.join(", ") || "-"}` : null },
    { label: "Active Uplink", key: "uplink", val: info?.active_uplink?.join(", ") || null },
    { label: "NFT Information", key: "nft_info", val: info?.nft_info || null },
    { label: "Run Information", key: "run_info", val: info?.run_info || null },
    { label: "Run Flags", key: "run_flags", val: info?.run_flags || null },
    { label: "Last Run", key: "last_run", val: info?.last_run || null },
    { label: "System Info", key: "system_info", val: info?.system_info || null },
  ]);

  const tabsList = $derived([
    { id: "general", label: trans("General Settings") },
    { id: "advanced", label: trans("Advanced Settings") },
    { id: "adv_chain", label: trans("Table/Chain Settings") },
    { id: "adv_set", label: trans("Feed/Set Settings") },
    { id: "adv_log", label: trans("Log Settings") },
    { id: "adv_email", label: trans("E-Mail Settings") },
    { id: "feeds", label: trans("Feed Selection") },
  ]);

  const loadUci = async () => {
    const uci = await uciGet("banip").catch(() => null);
    if (!uci) return;
    uciLoaded = true;
    const sec = (Object.values(uci.values || {}) as any[]).find((s: any) => s[".type"] === "banip" || s[".type"] === "global") || {};
    const g = (v: any, def = "") => v != null ? String(v) : def;
    const f = (v: any) => v === "1";
    const arr = (v: any): string[] => v ? (Array.isArray(v) ? v.map(String) : [String(v)]) : [];

    ban_enabled = f(sec.ban_enabled);
    ban_debug = f(sec.ban_debug);
    ban_autodetect = f(sec.ban_autodetect);
    ban_protov4 = f(sec.ban_protov4);
    ban_protov6 = f(sec.ban_protov6);
    ban_dev = arr(sec.ban_dev);
    ban_ifv4 = arr(sec.ban_ifv4);
    ban_ifv6 = arr(sec.ban_ifv6);
    ban_fetchcmd = g(sec.ban_fetchcmd);
    ban_fetchparm = g(sec.ban_fetchparm);
    ban_trigger = arr(sec.ban_trigger);
    ban_triggerdelay = g(sec.ban_triggerdelay);
    ban_fetchretry = g(sec.ban_fetchretry);
    ban_fetchinsecure = f(sec.ban_fetchinsecure);
    ban_nftcount = f(sec.ban_nftcount);
    ban_map = f(sec.ban_map);

    ban_nicelimit = g(sec.ban_nicelimit);
    ban_filelimit = g(sec.ban_filelimit);
    ban_cores = g(sec.ban_cores);
    ban_splitsize = g(sec.ban_splitsize);
    ban_basedir = g(sec.ban_basedir);
    ban_backupdir = g(sec.ban_backupdir);
    ban_reportdir = g(sec.ban_reportdir);
    ban_errordir = g(sec.ban_errordir);
    ban_deduplicate = sec.ban_deduplicate !== "0";

    ban_nftpriority = g(sec.ban_nftpriority);
    ban_allowflag = g(sec.ban_allowflag);
    ban_vlanallow = arr(sec.ban_vlanallow);
    ban_vlanblock = arr(sec.ban_vlanblock);
    ban_bcp38 = f(sec.ban_bcp38);
    ban_icmplimit = g(sec.ban_icmplimit);
    ban_synlimit = g(sec.ban_synlimit);
    ban_udplimit = g(sec.ban_udplimit);

    ban_nftpolicy = g(sec.ban_nftpolicy);
    ban_nftretry = g(sec.ban_nftretry);
    ban_blockpolicy = g(sec.ban_blockpolicy);
    ban_feedin = arr(sec.ban_feedin);
    ban_feedout = arr(sec.ban_feedout);
    ban_feedinout = arr(sec.ban_feedinout);
    ban_feedreset = arr(sec.ban_feedreset);
    ban_feedcomplete = arr(sec.ban_feedcomplete);

    ban_nftloglevel = g(sec.ban_nftloglevel);
    ban_logprerouting = f(sec.ban_logprerouting);
    ban_loginbound = f(sec.ban_loginbound);
    ban_logoutbound = f(sec.ban_logoutbound);
    ban_logreadfile = g(sec.ban_logreadfile);
    ban_loglimit = g(sec.ban_loglimit);
    ban_logcount = g(sec.ban_logcount);
    ban_logratelimit = g(sec.ban_logratelimit);
    ban_logburstlimit = g(sec.ban_logburstlimit);
    ban_logterm = arr(sec.ban_logterm);
    ban_remotelog = f(sec.ban_remotelog);
    ban_remotetoken = g(sec.ban_remotetoken);

    ban_mailnotification = f(sec.ban_mailnotification);
    ban_mailreceiver = g(sec.ban_mailreceiver);
    ban_mailsender = g(sec.ban_mailsender);
    ban_mailtopic = g(sec.ban_mailtopic);
    ban_mailprofile = g(sec.ban_mailprofile);

    ban_feed = arr(sec.ban_feed);
    ban_country = arr(sec.ban_country);
    ban_region = arr(sec.ban_region);
    ban_countrysplit = f(sec.ban_countrysplit);
    ban_asn = arr(sec.ban_asn);
    ban_asnsplit = f(sec.ban_asnsplit);
    ban_allowurl = arr(sec.ban_allowurl);
    ban_autoallowlist = sec.ban_autoallowlist !== "0";
    ban_autoallowuplink = g(sec.ban_autoallowuplink);
    ban_autoblocklist = sec.ban_autoblocklist !== "0";
    ban_autoblocksubnet = f(sec.ban_autoblocksubnet);
    ban_nftexpiry = g(sec.ban_nftexpiry);
    ban_allowlistonly = f(sec.ban_allowlistonly);
  };

  const loadFeeds = async () => {
    const data = await banipGetFeeds();
    feedsData = data;
    let feeds: any = null;
    if (data.custom?.trim()) {
      try { feeds = JSON.parse(data.custom); } catch {}
    }
    if (!feeds && data.default?.trim()) {
      try { feeds = JSON.parse(data.default); } catch {}
    }
    feedKeys = feeds ? Object.keys(feeds) : [];
    countryOptions = [];
    if (data.countries?.trim()) {
      for (const line of data.countries.trim().split("\n")) {
        const m = line.match(/^(\w+)\t(\w+)\t(.*)$/);
        if (m) {
          countryOptions = [...countryOptions, { value: m[1], label: `${m[3]} (${m[2]})` }];
        }
      }
    }
  };

  const collectUciValues = () => {
    const opts = (v: string) => v || undefined;
    const arr = (v: string[]) => v.length ? v : undefined;
    const f = (v: boolean) => v ? "1" : undefined;
    const f0 = (v: boolean) => v ? "1" : "0";

    return {
      ban_enabled: f0(ban_enabled),
      ban_debug: f(ban_debug),
      ban_autodetect: f(ban_autodetect),
      ...(!ban_autodetect ? {
        ban_protov4: f(ban_protov4),
        ban_protov6: f(ban_protov6),
        ban_dev: arr(ban_dev),
        ban_ifv4: arr(ban_ifv4),
        ban_ifv6: arr(ban_ifv6),
        ban_fetchcmd: opts(ban_fetchcmd),
        ban_fetchparm: opts(ban_fetchparm),
      } : {}),
      ban_trigger: arr(ban_trigger),
      ban_triggerdelay: opts(ban_triggerdelay),
      ban_fetchretry: opts(ban_fetchretry),
      ban_fetchinsecure: f(ban_fetchinsecure),
      ban_nftcount: f(ban_nftcount),
      ban_map: ban_map ? "1" : undefined,
      ban_nicelimit: opts(ban_nicelimit),
      ban_filelimit: opts(ban_filelimit),
      ban_cores: opts(ban_cores),
      ban_splitsize: opts(ban_splitsize),
      ban_basedir: opts(ban_basedir),
      ban_backupdir: opts(ban_backupdir),
      ban_reportdir: opts(ban_reportdir),
      ban_errordir: opts(ban_errordir),
      ban_deduplicate: f0(ban_deduplicate),
      ban_nftpriority: opts(ban_nftpriority),
      ban_allowflag: opts(ban_allowflag),
      ban_vlanallow: arr(ban_vlanallow),
      ban_vlanblock: arr(ban_vlanblock),
      ban_bcp38: f(ban_bcp38),
      ban_icmplimit: opts(ban_icmplimit),
      ban_synlimit: opts(ban_synlimit),
      ban_udplimit: opts(ban_udplimit),
      ban_nftpolicy: opts(ban_nftpolicy),
      ban_nftretry: opts(ban_nftretry),
      ban_blockpolicy: opts(ban_blockpolicy),
      ban_feedin: arr(ban_feedin),
      ban_feedout: arr(ban_feedout),
      ban_feedinout: arr(ban_feedinout),
      ban_feedreset: arr(ban_feedreset),
      ban_feedcomplete: arr(ban_feedcomplete),
      ban_nftloglevel: opts(ban_nftloglevel),
      ban_logprerouting: f(ban_logprerouting),
      ban_loginbound: f(ban_loginbound),
      ban_logoutbound: f(ban_logoutbound),
      ban_logreadfile: opts(ban_logreadfile),
      ban_loglimit: opts(ban_loglimit),
      ban_logcount: opts(ban_logcount),
      ban_logratelimit: opts(ban_logratelimit),
      ban_logburstlimit: opts(ban_logburstlimit),
      ban_logterm: arr(ban_logterm),
      ban_remotelog: f(ban_remotelog),
      ban_remotetoken: opts(ban_remotetoken),
      ban_mailnotification: f(ban_mailnotification),
      ban_mailreceiver: opts(ban_mailreceiver),
      ban_mailsender: opts(ban_mailsender),
      ban_mailtopic: opts(ban_mailtopic),
      ban_mailprofile: opts(ban_mailprofile),
      ban_feed: arr(ban_feed),
      ban_country: arr(ban_country),
      ban_region: arr(ban_region),
      ban_countrysplit: f(ban_countrysplit),
      ban_asn: arr(ban_asn),
      ban_asnsplit: f(ban_asnsplit),
      ban_allowurl: arr(ban_allowurl),
      ban_autoallowlist: f0(ban_autoallowlist),
      ban_autoallowuplink: opts(ban_autoallowuplink),
      ban_autoblocklist: f0(ban_autoblocklist),
      ban_autoblocksubnet: f(ban_autoblocksubnet),
      ban_nftexpiry: opts(ban_nftexpiry),
      ban_allowlistonly: f(ban_allowlistonly),
    };
  };

  const save = async () => {
    saving = true;
    saveFeedback = "";
    try {
      await uciSet("banip", "global", collectUciValues());
      await uciCommit("banip");
      saveFeedback = "Saved";
    } catch {
      saveFeedback = "Save failed";
    }
    saving = false;
    setTimeout(() => { saveFeedback = ""; }, 3000);
  };

  const handleAction = async (action: "stop" | "reload" | "restart") => {
    actionBusy = true;
    if (action === "reload" || action === "restart") {
      await save();
    }
    await banipInitAction(action);
    actionBusy = false;
  };

  const pollInfo = async () => {
    const actual = await banipGetActual();
    const rt = await banipGetRuntime();
    if (rt) {
      rt.status = rt.status ? `${rt.status}: ${actual}` : actual;
      info = rt;
      infoParseErr = 0;
    } else {
      infoParseErr++;
      if (infoParseErr >= 6) clearInterval(pollTimer);
    }
  };

  onMount(async () => {
    await Promise.all([loadUci(), loadFeeds(), pollInfo()]);
    pollTimer = setInterval(pollInfo, 2000);
  });

  onDestroy(() => { clearInterval(pollTimer); });
</script>

<div class={cn("flex", "flex-col", "min-h-0", "animate-fade-in", "gap-5")}>
  <!-- Header -->
  <div class={cn("shrink-0", "flex", "items-start", "justify-between", "gap-4")}>
    <div class={cn("flex", "items-center", "gap-3")}>
      <div class={cn("w-9", "h-9", "rounded-xl", "bg-accent/10", "flex", "items-center", "justify-center", "ring-1", "ring-accent/20", "shrink-0")}>
        <Shield size={16} class={cn("text-accent")} />
      </div>
      <div>
        <h1 class={cn("text-lg", "font-semibold", "text-white")}>banIP</h1>
        <p class={cn("text-sm", "mt-0.5", "text-muted")}>
          {trans("Configuration of the banIP package to ban incoming and outgoing IPs via named nftables Sets.")}
          <a href="https://github.com/openwrt/packages/blob/master/net/banip/files/README.md" target="_blank" rel="noreferrer noopener" class={cn("text-accent", "hover:underline", "ml-1")}>
            {trans("online documentation")}
          </a>
        </p>
      </div>
    </div>
    <div class={cn("flex", "items-center", "gap-3")}>
      {#if saveFeedback}
        <span class={cn("text-xs", "font-mono", saveFeedback === "Saved" ? "text-accent" : "text-danger")}>
          {saveFeedback}
        </span>
      {/if}
      <button
        onclick={save}
        disabled={saving}
        class={cn("inline-flex", "items-center", "gap-1.5", "px-3", "py-1.5", "text-xs", "rounded-lg", "font-medium", "transition-all", "duration-150", "cursor-pointer", "select-none", "border", saving ? "text-muted bg-surface-2 border-border" : "text-accent bg-accent/10 border-accent/20 hover:bg-accent/20", "disabled:opacity-30")}
      >
        <Play size={14} />
        {saving ? trans("Saving...") : trans("Save & Apply")}
      </button>
    </div>
  </div>

  <!-- Information Section -->
  <div class={cn("shrink-0", "glass", "p-4", "rounded-xl", "animate-slide-up")}>
    <div class={cn("flex", "items-center", "gap-2", "mb-3")}>
      <Shield size={14} class={cn("text-accent")} />
      <span class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>{trans("Information")}</span>
      <button onclick={pollInfo} class={cn("p-1", "rounded-md", "hover:bg-white/5", "transition-colors", "text-muted", "hover:text-fg", "cursor-pointer")}>
        <RefreshCw size={14} />
      </button>
    </div>
    <div class={cn("space-y-1")}>
      {#each infoItems as item}
        <div class={cn("flex", "items-baseline", "gap-4", "py-0.5")}>
          <span class={cn("text-[10px]", "text-muted", "font-semibold", "shrink-0", "w-28")}>{trans(item.label)}</span>
          <span class={cn("text-xs", "font-mono", "text-accent", "break-all")}>{item.val ?? "-"}</span>
        </div>
      {/each}
    </div>
  </div>

  <!-- Settings sub-tabs -->
  <div class={cn("shrink-0")}>
    <TabBar tabs={tabsList} active={tab} onchange={(id) => tab = id as typeof tab} />
  </div>

  {#key tab}
    <div class={cn("glass", "p-5", "rounded-xl", "space-y-5", "animate-slide-up")}>
      {#if tab === "general"}
        <div class={cn("flex", "items-center", "gap-2")}>
          <span class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>{trans("General Settings")}</span>
        </div>
        <div class={cn("h-px", "bg-border")}></div>
        <p class={cn("text-[10px]", "text-muted")}>{trans("Changes on this tab needs a banIP service restart to take effect.")}</p>
        <div class={cn("h-px", "bg-border")}></div>

        <Toggle label={trans("Enabled")} description={trans("Enable the banIP service.")} bind:checked={ban_enabled} />
        <Toggle label={trans("Verbose Debug Logging")} description={trans("Enable verbose debug logging in case of processing errors.")} bind:checked={ban_debug} />
        <Toggle label={trans("Auto Detection")} description={trans("Detect relevant network devices, interfaces, subnets, protocols and utilities automatically.")} bind:checked={ban_autodetect} />

        {#if !ban_autodetect}
          <div class={cn("h-px", "bg-border")}></div>
          <div class={cn("grid", "grid-cols-2", "gap-4")}>
            <Toggle label={trans("IPv4 Support")} description={trans("Enables IPv4 support.")} bind:checked={ban_protov4} />
            <Toggle label={trans("IPv6 Support")} description={trans("Enables IPv6 support.")} bind:checked={ban_protov6} />
          </div>

          <div>
            <span class={cn("block", "text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider", "mb-2")}>{trans("Network Devices")}</span>
            <p class={cn("text-[10px]", "text-muted", "mb-2")}>{trans("Select the WAN network device(s).")}</p>
            <div class={cn("space-y-1", "mb-1")}>
              {#each ban_dev as item, i}
                <div class={cn("flex", "items-center", "gap-1")}>
                  <input readonly value={item} class={cn("flex-1", "px-2.5", "py-1", "border", "text-xs", "rounded-md", "bg-surface-2", "outline-none", "text-fg", "border-border", "cursor-default")} />
                  <button type="button" onclick={() => { ban_dev = ban_dev.toSpliced(i, 1); }} class={cn("px-1.5", "py-1", "text-[10px]", "rounded", "text-danger", "hover:bg-danger/10", "transition-colors", "cursor-pointer")}>{trans("Remove")}</button>
                </div>
              {/each}
            </div>
            <div class={cn("flex", "items-center", "gap-1")}>
              <input bind:value={ban_dev_input} placeholder="eth0" class={cn("flex-1", "px-2.5", "py-1", "border", "text-xs", "rounded-md", "bg-surface", "outline-none", "text-fg", "border-border", "focus:border-(--accent)")} onkeydown={(e) => { if (e.key === "Enter" && ban_dev_input.trim()) { e.preventDefault(); ban_dev = [...ban_dev, ban_dev_input.trim()]; ban_dev_input = ""; }}} />
              <button type="button" disabled={!ban_dev_input.trim()} onclick={() => { if (ban_dev_input.trim()) { ban_dev = [...ban_dev, ban_dev_input.trim()]; ban_dev_input = ""; }}} class={cn("px-2", "py-1", "text-[10px]", "rounded-md", "bg-accent", "text-surface", "font-medium", "disabled:opacity-40", "cursor-pointer")}>+</button>
            </div>
          </div>

          <div>
            <span class={cn("block", "text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider", "mb-2")}>{trans("IPv4 Network Interfaces")}</span>
            <p class={cn("text-[10px]", "text-muted", "mb-2")}>{trans("Select the logical WAN IPv4 network interface(s).")}</p>
            <div class={cn("space-y-1", "mb-1")}>{#each ban_ifv4 as item, i}<div class={cn("flex", "items-center", "gap-1")}><input readonly value={item} class={cn("flex-1", "px-2.5", "py-1", "border", "text-xs", "rounded-md", "bg-surface-2", "outline-none", "text-fg", "border-border", "cursor-default")} /><button type="button" onclick={() => { ban_ifv4 = ban_ifv4.toSpliced(i, 1); }} class={cn("px-1.5", "py-1", "text-[10px]", "rounded", "text-danger", "hover:bg-danger/10", "transition-colors", "cursor-pointer")}>{trans("Remove")}</button></div>{/each}</div>
            <div class={cn("flex", "items-center", "gap-1")}><input bind:value={ban_ifv4_input} placeholder="wan" class={cn("flex-1", "px-2.5", "py-1", "border", "text-xs", "rounded-md", "bg-surface", "outline-none", "text-fg", "border-border", "focus:border-(--accent)")} onkeydown={(e) => { if (e.key === "Enter" && ban_ifv4_input.trim()) { e.preventDefault(); ban_ifv4 = [...ban_ifv4, ban_ifv4_input.trim()]; ban_ifv4_input = ""; }}} /><button type="button" disabled={!ban_ifv4_input.trim()} onclick={() => { if (ban_ifv4_input.trim()) { ban_ifv4 = [...ban_ifv4, ban_ifv4_input.trim()]; ban_ifv4_input = ""; }}} class={cn("px-2", "py-1", "text-[10px]", "rounded-md", "bg-accent", "text-surface", "font-medium", "disabled:opacity-40", "cursor-pointer")}>+</button></div>
          </div>

          <div>
            <span class={cn("block", "text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider", "mb-2")}>{trans("IPv6 Network Interfaces")}</span>
            <p class={cn("text-[10px]", "text-muted", "mb-2")}>{trans("Select the logical WAN IPv6 network interface(s).")}</p>
            <div class={cn("space-y-1", "mb-1")}>{#each ban_ifv6 as item, i}<div class={cn("flex", "items-center", "gap-1")}><input readonly value={item} class={cn("flex-1", "px-2.5", "py-1", "border", "text-xs", "rounded-md", "bg-surface-2", "outline-none", "text-fg", "border-border", "cursor-default")} /><button type="button" onclick={() => { ban_ifv6 = ban_ifv6.toSpliced(i, 1); }} class={cn("px-1.5", "py-1", "text-[10px]", "rounded", "text-danger", "hover:bg-danger/10", "transition-colors", "cursor-pointer")}>{trans("Remove")}</button></div>{/each}</div>
            <div class={cn("flex", "items-center", "gap-1")}><input bind:value={ban_ifv6_input} placeholder="wan6" class={cn("flex-1", "px-2.5", "py-1", "border", "text-xs", "rounded-md", "bg-surface", "outline-none", "text-fg", "border-border", "focus:border-(--accent)")} onkeydown={(e) => { if (e.key === "Enter" && ban_ifv6_input.trim()) { e.preventDefault(); ban_ifv6 = [...ban_ifv6, ban_ifv6_input.trim()]; ban_ifv6_input = ""; }}} /><button type="button" disabled={!ban_ifv6_input.trim()} onclick={() => { if (ban_ifv6_input.trim()) { ban_ifv6 = [...ban_ifv6, ban_ifv6_input.trim()]; ban_ifv6_input = ""; }}} class={cn("px-2", "py-1", "text-[10px]", "rounded-md", "bg-accent", "text-surface", "font-medium", "disabled:opacity-40", "cursor-pointer")}>+</button></div>
          </div>

          <Select label={trans("Download Utility")} bind:value={ban_fetchcmd} options={[{ value: "", label: trans("-- default --") }, { value: "uclient-fetch", label: "uclient-fetch" }, { value: "wget", label: "wget" }, { value: "curl", label: "curl" }]} />
          <Input label={trans("Download Parameters")} bind:value={ban_fetchparm} placeholder={trans("Override pre-configured options")} />
          <div class={cn("h-px", "bg-border")}></div>
        {/if}

        <div>
          <span class={cn("block", "text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider", "mb-2")}>{trans("Startup Trigger Interface")}</span>
          <p class={cn("text-[10px]", "text-muted", "mb-2")}>{trans("Interface(s) that trigger the processing of banIP.")}</p>
          <div class={cn("space-y-1", "mb-1")}>{#each ban_trigger as item, i}<div class={cn("flex", "items-center", "gap-1")}><input readonly value={item} class={cn("flex-1", "px-2.5", "py-1", "border", "text-xs", "rounded-md", "bg-surface-2", "outline-none", "text-fg", "border-border", "cursor-default")} /><button type="button" onclick={() => { ban_trigger = ban_trigger.toSpliced(i, 1); }} class={cn("px-1.5", "py-1", "text-[10px]", "rounded", "text-danger", "hover:bg-danger/10", "transition-colors", "cursor-pointer")}>{trans("Remove")}</button></div>{/each}</div>
          <div class={cn("flex", "items-center", "gap-1")}><input bind:value={ban_trigger_input} placeholder="wan" class={cn("flex-1", "px-2.5", "py-1", "border", "text-xs", "rounded-md", "bg-surface", "outline-none", "text-fg", "border-border", "focus:border-(--accent)")} onkeydown={(e) => { if (e.key === "Enter" && ban_trigger_input.trim()) { e.preventDefault(); ban_trigger = [...ban_trigger, ban_trigger_input.trim()]; ban_trigger_input = ""; }}} /><button type="button" disabled={!ban_trigger_input.trim()} onclick={() => { if (ban_trigger_input.trim()) { ban_trigger = [...ban_trigger, ban_trigger_input.trim()]; ban_trigger_input = ""; }}} class={cn("px-2", "py-1", "text-[10px]", "rounded-md", "bg-accent", "text-surface", "font-medium", "disabled:opacity-40", "cursor-pointer")}>+</button></div>
        </div>
        <Input label={trans("Trigger Delay")} bind:value={ban_triggerdelay} placeholder="10" type="number" />
        <Select label={trans("Download Retries")} bind:value={ban_fetchretry} options={[{ value: "", label: trans("-- default --") }, { value: "1", label: "1" }, { value: "3", label: "3" }, { value: "5", label: "5" }, { value: "10", label: "10" }, { value: "20", label: "20" }]} />
        <Toggle label={trans("Download Insecure")} description={trans("Don't check SSL server certificates during download.")} bind:checked={ban_fetchinsecure} />
        <Toggle label={trans("Reporting Counters")} description={trans("Enable NFT counters for Set elements and chain rules.")} bind:checked={ban_nftcount} />
        {#if ban_nftcount}
          <Toggle label={trans("Enable GeoIP Map")} description={trans("Enable a GeoIP Map with suspicious Set elements.")} bind:checked={ban_map} />
        {/if}

      {:else if tab === "advanced"}
        <div class={cn("flex", "items-center", "gap-2")}><span class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>{trans("Advanced Settings")}</span></div>
        <div class={cn("h-px", "bg-border")}></div>
        <p class={cn("text-[10px]", "text-muted")}>{trans("Changes on this tab needs a banIP service restart to take effect.")}</p>
        <div class={cn("h-px", "bg-border")}></div>

        <Select label={trans("Nice Level")} bind:value={ban_nicelimit} options={[{ value: "", label: trans("-- default --") }, { value: "-20", label: trans("Highest Priority") }, { value: "-10", label: trans("High Priority") }, { value: "0", label: trans("Normal Priority") }, { value: "10", label: trans("Less Priority") }, { value: "19", label: trans("Least Priority") }]} />
        <Select label={trans("Max Open Files")} bind:value={ban_filelimit} options={[{ value: "", label: trans("-- default --") }, { value: "512", label: "512" }, { value: "1024", label: "1024" }, { value: "2048", label: "2048" }, { value: "4096", label: "4096" }]} />
        <Select label={trans("CPU Cores")} bind:value={ban_cores} options={[{ value: "", label: trans("-- default --") }, { value: "1", label: "1" }, { value: "2", label: "2" }, { value: "4", label: "4" }, { value: "8", label: "8" }, { value: "16", label: "16" }]} />
        <Select label={trans("Set Split Size")} bind:value={ban_splitsize} options={[{ value: "", label: trans("-- default --") }, { value: "512", label: "512" }, { value: "1024", label: "1024" }, { value: "2048", label: "2048" }, { value: "4096", label: "4096" }, { value: "8192", label: "8192" }, { value: "16384", label: "16384" }]} />
        <Input label={trans("Base Directory")} bind:value={ban_basedir} placeholder="/tmp" />
        <Input label={trans("Backup Directory")} bind:value={ban_backupdir} placeholder="/tmp/banIP-backup" />
        <Input label={trans("Report Directory")} bind:value={ban_reportdir} placeholder="/tmp/banIP-report" />
        <Input label={trans("Error Directory")} bind:value={ban_errordir} placeholder="/tmp/banIP-error" />
        <Toggle label={trans("Deduplicate IPs")} description={trans("Deduplicate IP addresses across all active Sets.")} bind:checked={ban_deduplicate} />

      {:else if tab === "adv_chain"}
        <div class={cn("flex", "items-center", "gap-2")}><span class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>{trans("Table/Chain Settings")}</span></div>
        <div class={cn("h-px", "bg-border")}></div>
        <p class={cn("text-[10px]", "text-muted")}>{trans("Changes on this tab needs a banIP service restart to take effect.")}</p>
        <div class={cn("h-px", "bg-border")}></div>

        <Select label={trans("Chain Priority")} bind:value={ban_nftpriority} options={[{ value: "", label: trans("-- default --") }, { value: "10", label: "10" }, { value: "0", label: "0" }, { value: "-100", label: "-100" }, { value: "-150", label: "-150" }]} />
        <Input label={trans("Allow Protocol/Ports")} bind:value={ban_allowflag} placeholder="tcp 80 443-445" />
        <Toggle label={trans("Enable BCP38")} description={trans("Block packets with spoofed source IP addresses.")} bind:checked={ban_bcp38} />
        <Select label={trans("ICMP-Threshold")} bind:value={ban_icmplimit} options={[{ value: "", label: trans("-- default --") }, { value: "0", label: "0" }, { value: "25", label: "25" }, { value: "50", label: "50" }, { value: "100", label: "100" }, { value: "250", label: "250" }, { value: "500", label: "500" }, { value: "1000", label: "1000" }]} />
        <Select label={trans("SYN-Threshold")} bind:value={ban_synlimit} options={[{ value: "", label: trans("-- default --") }, { value: "0", label: "0" }, { value: "10", label: "10" }, { value: "50", label: "50" }, { value: "100", label: "100" }, { value: "250", label: "250" }, { value: "500", label: "500" }, { value: "1000", label: "1000" }]} />
        <Select label={trans("UDP-Threshold")} bind:value={ban_udplimit} options={[{ value: "", label: trans("-- default --") }, { value: "0", label: "0" }, { value: "100", label: "100" }, { value: "250", label: "250" }, { value: "500", label: "500" }, { value: "1000", label: "1000" }, { value: "2500", label: "2500" }, { value: "5000", label: "5000" }]} />

      {:else if tab === "adv_set"}
        <div class={cn("flex", "items-center", "gap-2")}><span class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>{trans("Feed/Set Settings")}</span></div>
        <div class={cn("h-px", "bg-border")}></div>
        <p class={cn("text-[10px]", "text-muted")}>{trans("Changes on this tab needs a banIP service restart to take effect.")}</p>
        <div class={cn("h-px", "bg-border")}></div>

        <Select label={trans("Set Policy")} bind:value={ban_nftpolicy} options={[{ value: "", label: trans("-- default --") }, { value: "memory", label: trans("memory") }, { value: "performance", label: trans("performance") }]} />
        <Select label={trans("Set Load Retries")} bind:value={ban_nftretry} options={[{ value: "", label: trans("-- default --") }, { value: "1", label: "1" }, { value: "3", label: "3" }, { value: "5", label: "5" }]} />
        <Select label={trans("Inbound Block Policy")} bind:value={ban_blockpolicy} options={[{ value: "", label: trans("-- default --") }, { value: "drop", label: trans("drop") }, { value: "reject", label: trans("reject") }]} />

      {:else if tab === "adv_log"}
        <div class={cn("flex", "items-center", "gap-2")}><span class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>{trans("Log Settings")}</span></div>
        <div class={cn("h-px", "bg-border")}></div>
        <p class={cn("text-[10px]", "text-muted")}>{trans("Changes on this tab needs a banIP service restart to take effect.")}</p>
        <div class={cn("h-px", "bg-border")}></div>

        <Select label={trans("NFT Log Level")} bind:value={ban_nftloglevel} options={[{ value: "", label: trans("-- default --") }, { value: "emerg", label: "emerg" }, { value: "alert", label: "alert" }, { value: "crit", label: "crit" }, { value: "err", label: "err" }, { value: "warn", label: "warn" }, { value: "notice", label: "notice" }, { value: "info", label: "info" }, { value: "debug", label: "debug" }]} />
        <div class={cn("grid", "grid-cols-3", "gap-4")}>
          <Toggle label={trans("Log Prerouting")} bind:checked={ban_logprerouting} />
          <Toggle label={trans("Log Inbound")} bind:checked={ban_loginbound} />
          <Toggle label={trans("Log Outbound")} bind:checked={ban_logoutbound} />
        </div>
        <Input label={trans("Logfile Location")} bind:value={ban_logreadfile} placeholder="/var/log/messages" />
        <Select label={trans("Log Limit")} bind:value={ban_loglimit} options={[{ value: "", label: trans("-- default --") }, { value: "0", label: "0" }, { value: "50", label: "50" }, { value: "100", label: "100" }, { value: "250", label: "250" }, { value: "500", label: "500" }, { value: "1000", label: "1000" }]} />
        <Input label={trans("Log Count")} bind:value={ban_logcount} placeholder="1" type="number" />
        <Select label={trans("Log Rate Limit")} bind:value={ban_logratelimit} options={[{ value: "", label: trans("-- default --") }, { value: "0", label: "0" }, { value: "1", label: "1" }, { value: "5", label: "5" }, { value: "10", label: "10" }, { value: "25", label: "25" }, { value: "50", label: "50" }, { value: "100", label: "100" }]} />
        {#if ban_logratelimit !== "0"}
          <Select label={trans("Log Burst Limit")} bind:value={ban_logburstlimit} options={[{ value: "", label: trans("-- default --") }, { value: "1", label: "1" }, { value: "5", label: "5" }, { value: "10", label: "10" }, { value: "25", label: "25" }, { value: "50", label: "50" }]} />
        {/if}
        <Toggle label={trans("Enable Remote Logging")} bind:checked={ban_remotelog} />
        {#if ban_remotelog}
          <Input label={trans("Remote Token")} bind:value={ban_remotetoken} placeholder={trans("Token to communicate with the cgi interface")} />
        {/if}

      {:else if tab === "adv_email"}
        <div class={cn("flex", "items-center", "gap-2")}><span class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>{trans("E-Mail Settings")}</span></div>
        <div class={cn("h-px", "bg-border")}></div>
        <p class={cn("text-[10px]", "text-muted")}>{trans("To enable email notifications, set up the 'msmtp' package and specify a valid E-Mail receiver address.")}</p>
        <div class={cn("h-px", "bg-border")}></div>

        <Toggle label={trans("E-Mail Notification")} bind:checked={ban_mailnotification} />
        <Input label={trans("E-Mail Receiver Address")} bind:value={ban_mailreceiver} placeholder="name@example.com" />
        <Input label={trans("E-Mail Sender Address")} bind:value={ban_mailsender} placeholder="no-reply@banIP" />
        <Input label={trans("E-Mail Topic")} bind:value={ban_mailtopic} placeholder="banIP notification" />
        <Input label={trans("E-Mail Profile")} bind:value={ban_mailprofile} placeholder="ban_notify" />

      {:else if tab === "feeds"}
        <div class={cn("flex", "items-center", "gap-2")}><span class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>{trans("Feed Selection")}</span></div>
        <div class={cn("h-px", "bg-border")}></div>
        <p class={cn("text-[10px]", "text-muted", "text-center")}>{trans("Changes on this tab needs a banIP service reload to take effect.")}</p>
        <div class={cn("h-px", "bg-border")}></div>

        <p class={cn("text-[10px]", "font-semibold", "text-fg")}>{trans("External Blocklist Feeds")}</p>

        {#if feedKeys.length}
          <div class={cn("grid", "grid-cols-2", "gap-x-4", "gap-y-1")}>
            {#each feedKeys as feed}
              <label class={cn("flex", "items-center", "gap-2", "cursor-pointer", "select-none", "py-0.5")}>
                <input type="checkbox" checked={ban_feed.includes(feed)} onchange={() => { ban_feed = ban_feed.includes(feed) ? ban_feed.filter(f => f !== feed) : [...ban_feed, feed]; }} class={cn("accent-(--accent)", "w-3.5", "h-3.5", "rounded", "cursor-pointer")} />
                <span class={cn("text-xs", "text-fg")}>{feed}</span>
              </label>
            {/each}
          </div>
        {:else}
          <p class={cn("text-[10px]", "text-muted", "italic")}>{trans("No feeds available")}</p>
        {/if}

        <div class={cn("h-px", "bg-border")}></div>
        <p class={cn("text-[10px]", "font-semibold", "text-fg")}>{trans("Country Selection")}</p>

        {#if countryOptions.length}
          <div class={cn("grid", "grid-cols-2", "gap-x-4", "gap-y-1")}>
            {#each countryOptions as opt}
              <label class={cn("flex", "items-center", "gap-2", "cursor-pointer", "select-none", "py-0.5")}>
                <input type="checkbox" checked={ban_country.includes(opt.value)} onchange={() => { ban_country = ban_country.includes(opt.value) ? ban_country.filter(c => c !== opt.value) : [...ban_country, opt.value]; }} class={cn("accent-(--accent)", "w-3.5", "h-3.5", "rounded", "cursor-pointer")} />
                <span class={cn("text-xs", "text-fg")}>{opt.label}</span>
              </label>
            {/each}
          </div>
        {:else}
          <p class={cn("text-[10px]", "text-muted", "italic")}>{trans("No countries available")}</p>
        {/if}

        <div>
          <p class={cn("text-[10px]", "font-semibold", "text-fg", "mb-1")}>{trans("Regional Internet Registry")}</p>
          <p class={cn("text-[10px]", "text-muted", "mb-2")}>{trans("Summary of countries based on the Regional Internet Registry (RIR).")}</p>
          <div class={cn("grid", "grid-cols-1", "gap-y-0.5")}>
            {#each ["AFRINIC", "APNIC", "ARIN", "LACNIC", "RIPE"] as rir}
              <label class={cn("flex", "items-center", "gap-2", "cursor-pointer", "select-none", "py-0.5")}>
                <input type="checkbox" checked={ban_region.includes(rir)} onchange={() => { ban_region = ban_region.includes(rir) ? ban_region.filter(r => r !== rir) : [...ban_region, rir]; }} class={cn("accent-(--accent)", "w-3.5", "h-3.5", "rounded", "cursor-pointer")} />
                <span class={cn("text-xs", "text-fg")}>{rir}</span>
              </label>
            {/each}
          </div>
        </div>
        <Toggle label={trans("Split Country Set")} description={trans("The selected Countries are stored in separate Sets.")} bind:checked={ban_countrysplit} />

        <div class={cn("h-px", "bg-border")}></div>
        <p class={cn("text-[10px]", "font-semibold", "text-fg")}>{trans("ASN Selection")}</p>
        <div>
          <p class={cn("text-[10px]", "text-muted", "mb-2")}>{trans("Collection of IP addresses based on Autonomous System Numbers.")}</p>
          <div class={cn("space-y-1", "mb-1")}>
            {#each ban_asn as item, i}
              <div class={cn("flex", "items-center", "gap-1")}>
                <input readonly value={item} class={cn("flex-1", "px-2.5", "py-1", "border", "text-xs", "rounded-md", "bg-surface-2", "outline-none", "text-fg", "border-border", "cursor-default")} />
                <button type="button" onclick={() => { ban_asn = ban_asn.toSpliced(i, 1); }} class={cn("px-1.5", "py-1", "text-[10px]", "rounded", "text-danger", "hover:bg-danger/10", "transition-colors", "cursor-pointer")}>{trans("Remove")}</button>
              </div>
            {/each}
          </div>
          <div class={cn("flex", "items-center", "gap-1")}>
            <input bind:value={ban_asn_input} placeholder="AS1234" class={cn("flex-1", "px-2.5", "py-1", "border", "text-xs", "rounded-md", "bg-surface", "outline-none", "text-fg", "border-border", "focus:border-(--accent)")} onkeydown={(e) => { if (e.key === "Enter" && ban_asn_input.trim()) { e.preventDefault(); ban_asn = [...ban_asn, ban_asn_input.trim()]; ban_asn_input = ""; }}} />
            <button type="button" disabled={!ban_asn_input.trim()} onclick={() => { if (ban_asn_input.trim()) { ban_asn = [...ban_asn, ban_asn_input.trim()]; ban_asn_input = ""; }}} class={cn("px-2", "py-1", "text-[10px]", "rounded-md", "bg-accent", "text-surface", "font-medium", "disabled:opacity-40", "cursor-pointer")}>+</button>
          </div>
        </div>
        <Toggle label={trans("Split ASN Set")} description={trans("The selected ASNs are stored in separate Sets.")} bind:checked={ban_asnsplit} />

        <div class={cn("h-px", "bg-border")}></div>
        <p class={cn("text-[10px]", "font-semibold", "text-fg")}>{trans("External Allowlist Feeds")}</p>
        <div>
          {#if countryOptions.length}
            <div class={cn("space-y-1", "mb-1")}>
              {#each ban_allowurl as item, i}
                <div class={cn("flex", "items-center", "gap-1")}>
                  <input readonly value={item} class={cn("flex-1", "px-2.5", "py-1", "border", "text-xs", "rounded-md", "bg-surface-2", "outline-none", "text-fg", "border-border", "cursor-default")} />
                  <button type="button" onclick={() => { ban_allowurl = ban_allowurl.toSpliced(i, 1); }} class={cn("px-1.5", "py-1", "text-[10px]", "rounded", "text-danger", "hover:bg-danger/10", "transition-colors", "cursor-pointer")}>{trans("Remove")}</button>
                </div>
              {/each}
            </div>
            <div class={cn("flex", "items-center", "gap-1")}>
              <input bind:value={ban_allowurl_input} placeholder="https://..." class={cn("flex-1", "px-2.5", "py-1", "border", "text-xs", "rounded-md", "bg-surface", "outline-none", "text-fg", "border-border", "focus:border-(--accent)")} onkeydown={(e) => { if (e.key === "Enter" && ban_allowurl_input.trim()) { e.preventDefault(); ban_allowurl = [...ban_allowurl, ban_allowurl_input.trim()]; ban_allowurl_input = ""; }}} />
              <button type="button" disabled={!ban_allowurl_input.trim()} onclick={() => { if (ban_allowurl_input.trim()) { ban_allowurl = [...ban_allowurl, ban_allowurl_input.trim()]; ban_allowurl_input = ""; }}} class={cn("px-2", "py-1", "text-[10px]", "rounded-md", "bg-accent", "text-surface", "font-medium", "disabled:opacity-40", "cursor-pointer")}>+</button>
            </div>
          {:else}
            <p class={cn("text-[10px]", "text-muted", "italic")}>{trans("No countries data loaded")}</p>
          {/if}
        </div>

        <div class={cn("h-px", "bg-border")}></div>
        <p class={cn("text-[10px]", "font-semibold", "text-fg")}>{trans("Local Feed Settings")}</p>
        <Toggle label={trans("Auto Allowlist")} description={trans("Automatically add resolved domains and uplink IPs to the local allowlist.")} bind:checked={ban_autoallowlist} />
        {#if ban_autoallowlist}
          <Select label={trans("Auto Allow Uplink")} bind:value={ban_autoallowuplink} options={[{ value: "", label: trans("-- default --") }, { value: "disable", label: trans("Disable") }, { value: "subnet", label: trans("Subnet") }, { value: "ip", label: trans("IP") }]} />
        {/if}
        <Toggle label={trans("Auto Blocklist")} description={trans("Automatically add resolved domains and suspicious IPs to the local blocklist.")} bind:checked={ban_autoblocklist} />
        <Toggle label={trans("Auto Block Subnet")} description={trans("Automatically add entire subnets based on RDAP request.")} bind:checked={ban_autoblocksubnet} />
        <Input label={trans("Blocklist Set Expiry")} bind:value={ban_nftexpiry} placeholder="5m" />
        <Toggle label={trans("Allowlist Only")} description={trans("Restrict the internet access from/to a small number of secure IPs.")} bind:checked={ban_allowlistonly} />
      {/if}
    </div>
  {/key}

  <!-- Action buttons -->
  <div class={cn("shrink-0", "flex", "items-center", "gap-2", "animate-slide-up")}>
    <button
      onclick={() => handleAction("stop")}
      disabled={actionBusy}
      class={cn("px-3", "py-1.5", "text-xs", "rounded-lg", "font-medium", "duration-150", "transition-all", "inline-flex", "items-center", "gap-1.5", "border", "bg-danger/10 text-danger border-danger/20 hover:bg-danger/20", "cursor-pointer", "disabled:opacity-30")}
    >
      <Square size={14} />
      {trans("Stop")}
    </button>
    <button
      onclick={() => handleAction("reload")}
      disabled={actionBusy}
      class={cn("px-3", "py-1.5", "text-xs", "rounded-lg", "font-medium", "duration-150", "transition-all", "inline-flex", "items-center", "gap-1.5", "border", "text-accent bg-accent/10 border-accent/20 hover:bg-accent/20", "cursor-pointer", "disabled:opacity-30")}
    >
      <RotateCcw size={14} />
      {trans("Save & Reload")}
    </button>
    <button
      onclick={() => handleAction("restart")}
      disabled={actionBusy}
      class={cn("px-3", "py-1.5", "text-xs", "rounded-lg", "font-medium", "duration-150", "transition-all", "inline-flex", "items-center", "gap-1.5", "border", "text-accent bg-accent/10 border-accent/20 hover:bg-accent/20", "cursor-pointer", "disabled:opacity-30")}
    >
      <Play size={14} />
      {trans("Save & Restart")}
    </button>
  </div>
</div>
