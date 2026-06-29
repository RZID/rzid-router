<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { Shield, RefreshCw, Square, Play, RotateCcw } from "@lucide/svelte";
  import { getLocale, onLocaleChange, t } from "../../../i18n";
  import { banipGetActual, banipGetFeeds, banipGetRuntime, banipInitAction, uciCommit, uciGet, uciSet, type BanipRuntime } from "../../../api/ubus";
  import { cn } from "../../../helpers/classname";
  import TabBar from "../../../components/TabBar/TabBar.svelte";
  import GeneralTab from "./Overview/GeneralTab.svelte";
  import AdvancedTab from "./Overview/AdvancedTab.svelte";
  import AdvChainTab from "./Overview/AdvChainTab.svelte";
  import AdvSetTab from "./Overview/AdvSetTab.svelte";
  import AdvLogTab from "./Overview/AdvLogTab.svelte";
  import AdvEmailTab from "./Overview/AdvEmailTab.svelte";
  import FeedsTab from "./Overview/FeedsTab.svelte";

  let locale = $state(getLocale());
  let trans = $derived.by(() => { locale; return (k: string) => t(k); });
  $effect(() => onLocaleChange(() => { locale = getLocale(); }));

  let tab = $state<"general"|"advanced"|"adv_chain"|"adv_set"|"adv_log"|"adv_email"|"feeds">("general");
  let info: BanipRuntime | null = $state(null);
  let infoParseErr = $state(0);

  let uciLoaded = $state(false);
  let ban_enabled = $state(false), ban_debug = $state(false), ban_autodetect = $state(true);
  let ban_protov4 = $state(true), ban_protov6 = $state(true);
  let ban_dev: string[] = $state([]), ban_ifv4: string[] = $state([]), ban_ifv6: string[] = $state([]);
  let ban_fetchcmd = $state(""), ban_fetchparm = $state("");
  let ban_trigger: string[] = $state([]), ban_triggerdelay = $state(""), ban_fetchretry = $state("");
  let ban_fetchinsecure = $state(false), ban_nftcount = $state(false), ban_map = $state(false);

  let ban_nicelimit = $state(""), ban_filelimit = $state(""), ban_cores = $state("");
  let ban_splitsize = $state(""), ban_basedir = $state(""), ban_backupdir = $state("");
  let ban_reportdir = $state(""), ban_errordir = $state(""), ban_deduplicate = $state(true);

  let ban_nftpriority = $state(""), ban_allowflag = $state("");
  let ban_vlanallow: string[] = $state([]), ban_vlanblock: string[] = $state([]);
  let ban_bcp38 = $state(false), ban_icmplimit = $state(""), ban_synlimit = $state(""), ban_udplimit = $state("");

  let ban_nftpolicy = $state(""), ban_nftretry = $state(""), ban_blockpolicy = $state("");
  let ban_feedin: string[] = $state([]), ban_feedout: string[] = $state([]), ban_feedinout: string[] = $state([]);
  let ban_feedreset: string[] = $state([]), ban_feedcomplete: string[] = $state([]);

  let ban_nftloglevel = $state(""), ban_logprerouting = $state(false);
  let ban_loginbound = $state(false), ban_logoutbound = $state(false);
  let ban_logreadfile = $state(""), ban_loglimit = $state(""), ban_logcount = $state("");
  let ban_logratelimit = $state(""), ban_logburstlimit = $state(""), ban_logterm: string[] = $state([]);
  let ban_remotelog = $state(false), ban_remotetoken = $state("");

  let ban_mailnotification = $state(false), ban_mailreceiver = $state(""), ban_mailsender = $state("");
  let ban_mailtopic = $state(""), ban_mailprofile = $state("");

  let ban_feed: string[] = $state([]), ban_country: string[] = $state([]), ban_region: string[] = $state([]);
  let ban_countrysplit = $state(false), ban_asn: string[] = $state([]), ban_asnsplit = $state(false);
  let ban_allowurl: string[] = $state([]), ban_autoallowlist = $state(true), ban_autoallowuplink = $state("");
  let ban_autoblocklist = $state(true), ban_autoblocksubnet = $state(false);
  let ban_nftexpiry = $state(""), ban_allowlistonly = $state(false);

  let saving = $state(false), saveFeedback = $state(""), actionBusy = $state(false);

  let ban_dev_input = $state(""), ban_ifv4_input = $state(""), ban_ifv6_input = $state("");
  let ban_trigger_input = $state(""), ban_asn_input = $state(""), ban_allowurl_input = $state("");

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
    const sec =
      (Object.values(uci.values || {}) as any[]).find(
        (s: any) => s[".type"] === "banip" || s[".type"] === "global",
      ) || {};
    const g = (v: any, def = "") => (v != null ? String(v) : def);
    const f = (v: any) => v === "1";
    const arr = (v: any): string[] =>
      v ? (Array.isArray(v) ? v.map(String) : [String(v)]) : [];

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
    const arr = (v: string[]) => (v.length ? v : undefined);
    const f = (v: boolean) => (v ? "1" : undefined);
    const f0 = (v: boolean) => (v ? "1" : "0");

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
    } catch { saveFeedback = "Save failed"; }
    saving = false;
    setTimeout(() => { saveFeedback = ""; }, 3000);
  };

  const handleAction = async (action: "stop" | "reload" | "restart") => {
    actionBusy = true;
    if (action === "reload" || action === "restart") await save();
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

  onDestroy(() => {
    clearInterval(pollTimer);
  });
</script>

<div class={cn("flex", "flex-col", "min-h-0", "animate-fade-in", "gap-5")}>
  <div class={cn("shrink-0", "flex", "items-start", "justify-between", "gap-4")}>
    <div class={cn("flex", "items-center", "gap-3")}>
      <div class={cn("w-9", "h-9", "rounded-xl", "bg-accent/10", "flex", "items-center", "justify-center", "ring-1", "ring-accent/20", "shrink-0")}>
        <Shield size={16} class={cn("text-accent")} />
      </div>
      <div>
        <h1 class={cn("text-lg", "font-semibold", "text-white")}>banIP</h1>
        <p class={cn("text-sm", "mt-0.5", "text-muted")}>
          {trans("Configuration of the banIP package to ban incoming and outgoing IPs via named nftables Sets.")}
          <a href="https://github.com/openwrt/packages/blob/master/net/banip/files/README.md" target="_blank" rel="noreferrer noopener" class={cn("text-accent", "hover:underline", "ml-1")}>{trans("online documentation")}</a>
        </p>
      </div>
    </div>
    <div class={cn("flex", "items-center", "gap-3")}>
      {#if saveFeedback}
        <span class={cn("text-xs", "font-mono", saveFeedback === "Saved" ? "text-accent" : "text-danger")}>{saveFeedback}</span>
      {/if}
      <button onclick={save} disabled={saving} class={cn("inline-flex", "items-center", "gap-1.5", "px-3", "py-1.5", "text-xs", "rounded-lg", "font-medium", "transition-all", "duration-150", "cursor-pointer", "select-none", "border", saving ? "text-muted bg-surface-2 border-border" : "text-accent bg-accent/10 border-accent/20 hover:bg-accent/20", "disabled:opacity-30")}>
        <Play size={14} />
        {saving ? trans("Saving...") : trans("Save & Apply")}
      </button>
    </div>
  </div>

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

  <div class={cn("shrink-0")}>
    <TabBar tabs={tabsList} active={tab} onchange={(id) => (tab = id as typeof tab)} />
  </div>

  {#key tab}
    <div class={cn("glass", "p-5", "rounded-xl", "space-y-5", "animate-slide-up")}>
      {#if tab === "general"}
        <GeneralTab {trans}
          bind:ban_enabled bind:ban_debug bind:ban_autodetect
          bind:ban_protov4 bind:ban_protov6
          bind:ban_dev bind:ban_ifv4 bind:ban_ifv6
          bind:ban_fetchcmd bind:ban_fetchparm
          bind:ban_trigger bind:ban_triggerdelay bind:ban_fetchretry
          bind:ban_fetchinsecure bind:ban_nftcount bind:ban_map
          bind:ban_dev_input bind:ban_ifv4_input bind:ban_ifv6_input bind:ban_trigger_input
        />
      {:else if tab === "advanced"}
        <AdvancedTab {trans}
          bind:ban_nicelimit bind:ban_filelimit bind:ban_cores
          bind:ban_splitsize bind:ban_basedir bind:ban_backupdir
          bind:ban_reportdir bind:ban_errordir bind:ban_deduplicate
        />
      {:else if tab === "adv_chain"}
        <AdvChainTab {trans}
          bind:ban_nftpriority bind:ban_allowflag
          bind:ban_bcp38 bind:ban_icmplimit bind:ban_synlimit bind:ban_udplimit
        />
      {:else if tab === "adv_set"}
        <AdvSetTab {trans}
          bind:ban_nftpolicy bind:ban_nftretry bind:ban_blockpolicy
        />
      {:else if tab === "adv_log"}
        <AdvLogTab {trans}
          bind:ban_nftloglevel bind:ban_logprerouting
          bind:ban_loginbound bind:ban_logoutbound
          bind:ban_logreadfile bind:ban_loglimit bind:ban_logcount
          bind:ban_logratelimit bind:ban_logburstlimit
          bind:ban_remotelog bind:ban_remotetoken
        />
      {:else if tab === "adv_email"}
        <AdvEmailTab {trans}
          bind:ban_mailnotification
          bind:ban_mailreceiver bind:ban_mailsender bind:ban_mailtopic bind:ban_mailprofile
        />
      {:else if tab === "feeds"}
        <FeedsTab {trans}
          bind:feedKeys bind:countryOptions
          bind:ban_feed bind:ban_country bind:ban_region bind:ban_countrysplit
          bind:ban_asn bind:ban_asnsplit
          bind:ban_allowurl bind:ban_autoallowlist bind:ban_autoallowuplink
          bind:ban_autoblocklist bind:ban_autoblocksubnet
          bind:ban_nftexpiry bind:ban_allowlistonly
          bind:ban_asn_input bind:ban_allowurl_input
        />
      {/if}
    </div>
  {/key}

  <div class={cn("shrink-0", "flex", "items-center", "gap-2", "animate-slide-up")}>
    <button onclick={() => handleAction("stop")} disabled={actionBusy} class={cn("px-3", "py-1.5", "text-xs", "rounded-lg", "font-medium", "duration-150", "transition-all", "inline-flex", "items-center", "gap-1.5", "border", "bg-danger/10 text-danger border-danger/20 hover:bg-danger/20", "cursor-pointer", "disabled:opacity-30")}>
      <Square size={14} />
      {trans("Stop")}
    </button>
    <button onclick={() => handleAction("reload")} disabled={actionBusy} class={cn("px-3", "py-1.5", "text-xs", "rounded-lg", "font-medium", "duration-150", "transition-all", "inline-flex", "items-center", "gap-1.5", "border", "text-accent bg-accent/10 border-accent/20 hover:bg-accent/20", "cursor-pointer", "disabled:opacity-30")}>
      <RotateCcw size={14} />
      {trans("Save & Reload")}
    </button>
    <button onclick={() => handleAction("restart")} disabled={actionBusy} class={cn("px-3", "py-1.5", "text-xs", "rounded-lg", "font-medium", "duration-150", "transition-all", "inline-flex", "items-center", "gap-1.5", "border", "text-accent bg-accent/10 border-accent/20 hover:bg-accent/20", "cursor-pointer", "disabled:opacity-30")}>
      <Play size={14} />
      {trans("Save & Restart")}
    </button>
  </div>
</div>