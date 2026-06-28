<script lang="ts">
  import { onMount } from "svelte";
  import { batchCall, uciAdd, uciCommit, call } from "../api/ubus";
  import { getSystemFeatures } from "../api/ubus";
  import { cn } from "../helpers/classname";
  import { t as _t, getLocale, onLocaleChange } from "../i18n";
  import Input from "../components/Input/index.svelte";
  import Toggle from "../components/Toggle/index.svelte";
  import Select from "../components/Select/index.svelte";
  import TabBar from "../components/TabBar/index.svelte";
  import { Plus, Pencil, Trash2, Save, X } from "@lucide/svelte";

  let locale = $state(getLocale());
  let trans = $derived.by(() => { locale; return (k: string) => _t(k); });
  $effect(() => onLocaleChange(() => { locale = getLocale(); }));

  function ltoA(v: any): string[] {
    if (Array.isArray(v)) return v;
    if (v?.split) return v.split(/\s+/).filter(Boolean);
    return [];
  }

  const recordTypes = ["ANY","A","AAAA","ALIAS","CAA","CERT","CNAME","DS","HINFO","HIP","HTTPS","KEY","LOC","MX","NAPTR","NS","OPENPGPKEY","PTR","RP","SIG","SOA","SRV","SSHFP","SVCB","TLSA","TXT","URI"];

  type DnsTab = "general" | "cache" | "devices" | "dnsrecords" | "dnssecopt" | "filteropts" | "forward" | "limits" | "logging" | "files" | "ipsets";
  const mainTabs: { id: DnsTab; label: string }[] = [
    { id: "general", label: "General" },
    { id: "cache", label: "Cache" },
    { id: "devices", label: "Devices & Ports" },
    { id: "dnsrecords", label: "DNS Records" },
    { id: "dnssecopt", label: "DNSSEC" },
    { id: "filteropts", label: "Filter" },
    { id: "forward", label: "Forwards" },
    { id: "limits", label: "Limits" },
    { id: "logging", label: "Log" },
    { id: "files", label: "Resolv & Hosts Files" },
    { id: "ipsets", label: "IP Sets" },
  ];
  let mainTab = $state<DnsTab>("general");

  type RecTab = "hosts" | "srvhosts" | "mxhosts" | "cnamehosts" | "dnsrr";
  const recTabs: { id: RecTab; label: string }[] = [
    { id: "hosts", label: "Hostnames" },
    { id: "srvhosts", label: "SRV" },
    { id: "mxhosts", label: "MX" },
    { id: "cnamehosts", label: "CNAME" },
    { id: "dnsrr", label: "DNS-RR" },
  ];
  let recTab = $state<RecTab>("hosts");

  let uciDhcp = $state<Record<string, any>>({});
  let uciFw = $state<Record<string, any>>({});
  let hostHints = $state<Record<string, any>>({});
  let loading = $state(true);
  let busy = $state<Record<string, string>>({});
  let dnsForm = $state<Record<string, any>>({});
  let hasDnssec = $state(false);

  let newItems = $state<Record<string, string>>({});

  let instances = $state<{ id: string; name: string; isDefault: boolean }[]>([]);
  let newInstanceName = $state("");

  const getSections = (type: string) =>
    Object.entries(uciDhcp).filter(([, v]: [string, any]) => v[".type"] === type);

  const dnsmasqSec = $derived(
    (Object.entries(uciDhcp).find(([, v]: [string, any]) => v[".type"] === "dnsmasq") || [null, {}]) as [string | null, any]
  );

  const fwIpsets = $derived(
    Object.entries(uciFw).filter(([, v]: [string, any]) => v[".type"] === "ipset").map(([, v]) => v.name as string).filter(Boolean)
  );

  const hostIpMap = $derived.by(() => {
    const m: Record<string, string> = {};
    Object.entries(hostHints).forEach(([, v]: [string, any]) => {
      const addrs = v.ipaddrs || v.ipv4 || [];
      (Array.isArray(addrs) ? addrs : [addrs]).forEach((a: string) => { m[a] = v.name || v.macaddr || ""; });
    });
    return m;
  });

  const fetchData = async () => {
    loading = true;
    const [uciRes, fwRes, hints, features] = await batchCall<any>([
      { object: "uci", method: "get", params: { config: "dhcp" } },
      { object: "uci", method: "get", params: { config: "firewall" } },
      { object: "luci-rpc", method: "getHostHints" },
      { object: "luci", method: "getFeatures" },
    ]);
    uciDhcp = uciRes?.values || {};
    uciFw = fwRes?.values || {};
    hostHints = hints || {};

    hasDnssec = !!(features?.dnsmasq?.dnssec || features?.dnsmasq?.dnsmasq_full_dnssec);

    instances = getSections("dnsmasq").map(([id, sec]) => ({
      id,
      name: sec[".name"] || "",
      isDefault: getSections("dnsmasq").length === 1,
    }));

    const s = dnsmasqSec[1];
    if (s) {
      dnsForm = {
        local: s.local ?? "",
        domain: s.domain ?? "",
        expandhosts: s.expandhosts === "1",
        address: ltoA(s.address),
        allservers: s.allservers === "1",
        cache_rr: ltoA(s.cache_rr),
        nonwildcard: s.nonwildcard !== "0",
        interface: ltoA(s.interface),
        listen_address: ltoA(s.listen_address),
        notinterface: ltoA(s.notinterface),
        port: s.port ?? "",
        queryport: s.queryport ?? "",
        minport: s.minport ?? "",
        maxport: s.maxport ?? "",
        dnssec: s.dnssec === "1",
        dnsseccheckunsigned: s.dnsseccheckunsigned !== "0",
        domainneeded: s.domainneeded === "1",
        rebind_protection: s.rebind_protection !== "0",
        rebind_localhost: s.rebind_localhost === "1",
        rebind_domain: ltoA(s.rebind_domain),
        localservice: s.localservice !== "0",
        boguspriv: s.boguspriv !== "0",
        filterwin2k: s.filterwin2k === "1",
        filter_aaaa: s.filter_aaaa === "1",
        filter_a: s.filter_a === "1",
        filter_rr: ltoA(s.filter_rr),
        localise_queries: s.localise_queries === "1",
        nonegcache: s.nonegcache === "1",
        bogusnxdomain: ltoA(s.bogusnxdomain),
        server: ltoA(s.server),
        serversfile: s.serversfile ?? "",
        addmac: s.addmac ?? "",
        stripmac: s.stripmac === "1",
        addsubnet: s.addsubnet ?? "",
        stripsubnet: s.stripsubnet === "1",
        ednspacket_max: s.ednspacket_max ?? "",
        dnsforwardmax: s.dnsforwardmax ?? "",
        cachesize: s.cachesize ?? "",
        min_cache_ttl: s.min_cache_ttl ?? "",
        max_cache_ttl: s.max_cache_ttl ?? "",
        logqueries: s.logqueries === "1",
        logfacility: s.logfacility ?? "",
        noresolv: s.noresolv === "1",
        resolvfile: s.resolvfile ?? "",
        strictorder: s.strictorder === "1",
        ignore_hosts_dir: s.ignore_hosts_dir === "1",
        nohosts: s.nohosts === "1",
        addnhosts: ltoA(s.addnhosts),
      };
    }
    loading = false;
  };

  const setFormVal = (field: string, val: any) => {
    dnsForm = { ...dnsForm, [field]: val };
  };

  const saveDnsmasq = async () => {
    const [name] = dnsmasqSec;
    if (!name) return;
    busy = { ...busy, dnsmasq: "save" };
    const f = dnsForm;

    const vals: Record<string, any> = {
      local: f.local || "",
      domain: f.domain || "",
      address: f.address,
      cache_rr: f.cache_rr.join(" ") || "",
      interface: f.interface,
      listen_address: f.listen_address,
      notinterface: f.notinterface,
      port: f.port || "",
      queryport: f.queryport || "",
      minport: f.minport || "",
      maxport: f.maxport || "",
      server: f.server,
      serversfile: f.serversfile || "",
      addmac: f.addmac || "",
      addsubnet: f.addsubnet || "",
      ednspacket_max: f.ednspacket_max || "",
      dnsforwardmax: f.dnsforwardmax || "",
      cachesize: f.cachesize || "",
      min_cache_ttl: f.min_cache_ttl || "",
      max_cache_ttl: f.max_cache_ttl || "",
      logfacility: f.logfacility || "",
      resolvfile: f.resolvfile || "",
      rebind_domain: f.rebind_domain,
      bogusnxdomain: f.bogusnxdomain,
      addnhosts: f.addnhosts,
      filter_rr: f.filter_rr.join(" ") || "",
      expandhosts: f.expandhosts ? "1" : "",
      allservers: f.allservers ? "1" : "",
      nonwildcard: f.nonwildcard ? "1" : "",
      domainneeded: f.domainneeded ? "1" : "",
      rebind_protection: f.rebind_protection ? "1" : "",
      rebind_localhost: f.rebind_localhost ? "1" : "",
      localservice: f.localservice ? "1" : "",
      boguspriv: f.boguspriv ? "1" : "",
      filterwin2k: f.filterwin2k ? "1" : "",
      filter_aaaa: f.filter_aaaa ? "1" : "",
      filter_a: f.filter_a ? "1" : "",
      localise_queries: f.localise_queries ? "1" : "",
      nonegcache: f.nonegcache ? "1" : "",
      stripmac: f.stripmac ? "1" : "",
      stripsubnet: f.stripsubnet ? "1" : "",
      logqueries: f.logqueries ? "1" : "",
      noresolv: f.noresolv ? "1" : "",
      strictorder: f.strictorder ? "1" : "",
      ignore_hosts_dir: f.ignore_hosts_dir ? "1" : "",
      nohosts: f.nohosts ? "1" : "",
    };
    vals.dnssec = f.dnssec ? "1" : "";
    vals.dnsseccheckunsigned = f.dnsseccheckunsigned ? "1" : "";
    await call("uci", "set", { config: "dhcp", section: name, values: vals });
    await uciCommit("dhcp");
    await fetchData();
    busy = Object.fromEntries(Object.entries(busy).filter(([k]) => k !== "dnsmasq"));
  };

  const toggleMV = (field: string, val: string) => {
    const arr = dnsForm[field] as string[];
    if (arr.includes(val)) {
      setFormVal(field, arr.filter((x) => x !== val));
    } else {
      setFormVal(field, [...arr, val]);
    }
  };

  function addList(field: string) {
    const val = (newItems[field] || "").trim();
    if (!val) return;
    setFormVal(field, [...(dnsForm[field] as string[]), val]);
    newItems = { ...newItems, [field]: "" };
  }

  function rmList(field: string, i: number) {
    const arr = dnsForm[field] as string[];
    setFormVal(field, arr.filter((_, idx) => idx !== i));
  }

  function updateList(field: string, i: number, val: string) {
    const arr = [...(dnsForm[field] as string[])];
    arr[i] = val;
    setFormVal(field, arr);
  }

  async function addInstance() {
    const name = newInstanceName.trim();
    if (!name) return;
    await uciAdd("dhcp", "dnsmasq", name);
    await uciCommit("dhcp");
    newInstanceName = "";
    await fetchData();
  }

  async function removeInstance(id: string) {
    busy = { ...busy, ["del_" + id]: "delete" };
    await call("uci", "set", { config: "dhcp", section: id, values: { "": "" } });
    await uciCommit("dhcp");
    await fetchData();
    busy = Object.fromEntries(Object.entries(busy).filter(([k]) => !k.startsWith("del_")));
  }

  // ── Record section modals ──
  let editing: { id: string; type: string } | null = $state(null);
  let edForm = $state<Record<string, any>>({});
  const hexDecode = (s: string) => {
    const h = s.replace(/[\s:]/g, "");
    let r = "";
    for (let i = 0; i < h.length; i += 2) r += String.fromCharCode(parseInt(h.substr(i, 2), 16));
    return r;
  };
  const hexEncode = (s: string) => s.split("").map(c => c.charCodeAt(0).toString(16).padStart(2, "0")).join("").toUpperCase();

  const openRec = (type: string, id?: string) => {
    const sec = id ? uciDhcp[id] || {} : {};
    if (type === "domain") {
      edForm = { name: sec.name ?? "", ip: sec.ip ?? "" };
    } else if (type === "srvhost") {
      edForm = { srv: sec.srv ?? "", target: sec.target ?? "", port: sec.port ?? "", class: sec.class ?? "", weight: sec.weight ?? "" };
    } else if (type === "mxhost") {
      edForm = { domain: sec.domain ?? "", relay: sec.relay ?? "", pref: sec.pref ?? "" };
    } else if (type === "cname") {
      edForm = { cname: sec.cname ?? "", target: sec.target ?? "" };
    } else if (type === "dnsrr") {
      const hexdata = sec.hexdata ?? "";
      edForm = { rrname: sec.rrname ?? "", rrnumber: sec.rrnumber ?? "", hexdata, _hexdata: hexDecode(hexdata), showSvcb: sec.rrnumber === "65", _svc_priority: sec._svc_priority ?? "", _svc_target: sec._svc_target ?? "", _svc_params: sec._svc_params ?? "" };
    }
    editing = { id: id || "__new__", type };
  };
  const closeRec = () => { editing = null; edForm = {}; };

  const saveRec = async () => {
    if (!editing) return;
    const vals: Record<string, any> = { ".type": editing.type };
    if (editing.type === "domain") {
      vals.name = edForm.name || "";
      vals.ip = edForm.ip || "";
    } else if (editing.type === "srvhost") {
      for (const k of ["srv", "target", "port", "class", "weight"]) if (edForm[k]) vals[k] = edForm[k];
    } else if (editing.type === "mxhost") {
      for (const k of ["domain", "relay", "pref"]) if (edForm[k]) vals[k] = edForm[k];
    } else if (editing.type === "cname") {
      for (const k of ["cname", "target"]) if (edForm[k]) vals[k] = edForm[k];
    } else if (editing.type === "dnsrr") {
      vals.rrname = edForm.rrname || "";
      const n = edForm.rrnumber || "";
      vals.rrnumber = n;
      if (n === "65") {
        const priority = edForm._svc_priority || "1";
        const target = edForm._svc_target || ".";
        const params = (edForm._svc_params || "").split("\n").map((l: string) => l.trim()).filter(Boolean);
        const paramHex = params.map((p: string) => {
          const eq = p.indexOf("=");
          if (eq === -1) return "";
          const key = p.slice(0, eq);
          const val = p.slice(eq + 1);
          // Simplified SVCB param encoding: key as hex(key#val) where each char is hex-encoded
          const kv = key + "=" + val;
          return kv.split("").map(c => c.charCodeAt(0).toString(16).padStart(2, "0")).join("").toUpperCase();
        }).join("");
        const prioHex = parseInt(priority).toString(16).padStart(4, "0").toUpperCase();
        const tgtHex = target.split("").map((c: string) => c.charCodeAt(0).toString(16).padStart(2, "0")).join("").toUpperCase();
        vals.hexdata = prioHex + tgtHex + paramHex;
      } else {
        const raw = edForm._hexdata || "";
        if (raw) vals.hexdata = hexEncode(raw);
      }
    }
    if (editing.id === "__new__") {
      const name = await uciAdd("dhcp", editing.type);
      await call("uci", "set", { config: "dhcp", section: name, values: vals });
    } else {
      await call("uci", "set", { config: "dhcp", section: editing.id, values: vals });
    }
    await uciCommit("dhcp");
    await fetchData();
    closeRec();
  };

  const deleteSection = async (id: string) => {
    busy = { ...busy, [id]: "delete" };
    await call("uci", "set", { config: "dhcp", section: id, values: { "": "" } });
    await uciCommit("dhcp");
    await fetchData();
    busy = Object.fromEntries(Object.entries(busy).filter(([k]) => k !== id));
  };

  // ── IP set modal ──
  let editingIpset: string | null = $state(null);
  let ipForm = $state<Record<string, any>>({});
  const openIpset = (id?: string) => {
    const sec = id ? uciDhcp[id] || {} : {};
    ipForm = { name: ltoA(sec.name), domain: ltoA(sec.domain), table: sec.table ?? "", table_family: sec.table_family ?? "" };
    editingIpset = id || "__new__";
  };
  const closeIpset = () => { editingIpset = null; ipForm = {}; };
  const saveIpset = async () => {
    const vals: Record<string, any> = { ".type": "ipset", name: ipForm.name, domain: ipForm.domain, table: ipForm.table || "", table_family: ipForm.table_family || "" };
    if (editingIpset === "__new__") {
      const name = await uciAdd("dhcp", "ipset");
      await call("uci", "set", { config: "dhcp", section: name, values: vals });
    } else if (editingIpset) {
      await call("uci", "set", { config: "dhcp", section: editingIpset, values: vals });
    }
    await uciCommit("dhcp");
    await fetchData();
    closeIpset();
  };

  onMount(() => { fetchData(); });

  const th = "text-xs font-medium pb-2 px-3 text-left whitespace-nowrap";
  const td = "py-1.5 px-3 text-xs font-mono whitespace-nowrap";
  const labelCls = "block text-[10px] uppercase text-muted font-semibold tracking-wider mb-1.5";
</script>

<div class={cn("p-6", "animate-fade-in")}>
  <h1 class={cn("text-lg", "font-semibold", "text-white")}>{trans("DNS")}</h1>
  <p class={cn("text-sm", "mt-0.5", "mb-4", "text-muted")}>{trans("DNS")}</p>

  <div class={cn("overflow-x-auto", "pb-1")}>
    <TabBar tabs={mainTabs} active={mainTab} onchange={(id: string) => { mainTab = id as DnsTab; }} />
  </div>

  {#if loading}
    <p class={cn("text-xs", "text-muted", "italic", "mt-6", "text-center")}>{trans("Loading...")}</p>
  {:else}

  <div class={cn("mt-4", "relative")}>
    <div class={cn("glass", "rounded-xl", "p-5", "pb-16", "space-y-5")}>

      <!-- ════ GENERAL ════ -->
      {#if mainTab === "general"}
        <Input label={trans("Resolve these locally")} bind:value={dnsForm.local} placeholder="/internal.example.com/private.example.com/example.org"
          description={trans("Never forward these matching domains or subdomains; resolve from DHCP or hosts files only.")} />
        <Input label={trans("Local domain")} bind:value={dnsForm.domain} placeholder="lan"
          description={trans("Local domain suffix appended to DHCP names and hosts file entries.")} />
        <Toggle label={trans("Expand hosts")} description={trans("Add local domain suffix to names served from hosts files.")} bind:checked={dnsForm.expandhosts} />
        <div>
          <label class={labelCls}>{trans("Addresses")}</label>
          <p class={cn("text-xs", "text-muted", "mb-1")}>
            {trans("Resolve specified FQDNs to an IP.")}
            <br />{trans("Syntax: /fqdn[/fqdn…]/[ipaddr]")}
            <br />/example.com/ {trans("returns NXDOMAIN.")}
            <br />/#/ {trans("matches any domain (and returns NXDOMAIN).")}
            <br />/example.com/# {trans("returns NULL addresses (0.0.0.0, ::) for example.com and its subdomains.")}
          </p>
            {#each dnsForm.address as item, i}
              <div class={cn("flex", "items-center", "gap-1.5", "mb-1")}>
                <input type="text" value={item} oninput={(e) => updateList("address", i, e.currentTarget.value)}
                  placeholder="/router.local/router.lan/192.168.0.1"
                  class={cn("flex-1", "px-2.5", "py-1.5", "text-xs", "font-mono", "rounded-md", "bg-surface", "border", "border-border", "text-fg", "outline-none", "focus:border-(--accent)", "focus:shadow-[0_0_0_1px_var(--accent)]", "transition-all", "duration-150")} />
                <button onclick={() => rmList("address", i)}
                  class={cn("p-1.5", "rounded", "text-muted", "hover:text-danger", "cursor-pointer", "shrink-0")}><X size={12} /></button>
              </div>
            {/each}
            <div class={cn("flex", "items-center", "gap-1.5")}>
              <input type="text" bind:value={newItems.address} onkeydown={(e) => { if (e.key === "Enter") addList("address"); }}
                placeholder="/router.local/router.lan/192.168.0.1"
                class={cn("flex-1", "px-2.5", "py-1.5", "text-xs", "font-mono", "rounded-md", "bg-surface", "border", "border-border", "text-fg", "outline-none", "placeholder:text-text-muted", "focus:border-(--accent)", "focus:shadow-[0_0_0_1px_var(--accent)]", "transition-all", "duration-150")} />
              <button onclick={() => addList("address")}
                class={cn("flex", "items-center", "gap-1", "px-2", "py-1.5", "text-xs", "rounded-md", "bg-accent", "text-black", "cursor-pointer", "font-medium", "shrink-0", "hover:opacity-90")}><Plus size={12} />{trans("Add")}</button>
            </div>
          </div>
        <Toggle label={trans("All servers")} description={trans("Query all available upstream resolvers. First answer wins.")} bind:checked={dnsForm.allservers} />

      <!-- ════ CACHE ════ -->
      {:else if mainTab === "cache"}
        <div>
          <label class={cn(labelCls, "mb-2")}>{trans("Cache arbitrary RR")}</label>
          <p class={cn("text-xs", "text-muted", "mb-2")}>{trans("By default, dnsmasq caches A, AAAA, CNAME and SRV DNS record types. This option adds additional record types to the cache.")}</p>
          <div class={cn("flex", "flex-wrap", "gap-1.5")}>
            {#each recordTypes as t}
              {@const active = (dnsForm.cache_rr as string[]).includes(t)}
              <label class={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md cursor-pointer select-none border text-xs font-mono transition-all duration-150", active ? "bg-accent/15 text-accent border-accent/30" : "bg-surface text-muted border-border hover:border-white/30 hover:text-fg")}>
                <input type="checkbox" checked={active} onchange={() => toggleMV("cache_rr", t)}
                  class={cn("accent-(--accent)", "w-3", "h-3")} />
                <span>{t}</span>
              </label>
            {/each}
          </div>
        </div>

      <!-- ════ DEVICES & PORTS ════ -->
      {:else if mainTab === "devices"}
        <Toggle label={trans("Non-wildcard")} description={trans("Bind only to configured interface addresses, instead of the wildcard address.")} bind:checked={dnsForm.nonwildcard} />
        <div>
          <label class={labelCls}>{trans("Listen interfaces")}</label>
          {#each dnsForm.interface as item, i}
            <div class={cn("flex", "items-center", "gap-1.5", "mb-1")}>
              <input type="text" value={item} oninput={(e) => updateList("interface", i, e.currentTarget.value)}
                class={cn("flex-1", "px-2.5", "py-1.5", "text-xs", "rounded-md", "bg-surface", "border", "border-border", "text-fg", "outline-none", "focus:border-(--accent)", "transition-all")} />
              <button onclick={() => rmList("interface", i)}
                class={cn("p-1.5", "rounded", "text-muted", "hover:text-danger", "cursor-pointer", "shrink-0")}><X size={12} /></button>
            </div>
          {/each}
          <div class={cn("flex", "items-center", "gap-1.5")}>
            <input type="text" bind:value={newItems.interface} onkeydown={(e) => { if (e.key === "Enter") addList("interface"); }}
              placeholder={trans("(all)")}
              class={cn("flex-1", "px-2.5", "py-1.5", "text-xs", "rounded-md", "bg-surface", "border", "border-border", "text-fg", "outline-none", "placeholder:text-text-muted", "focus:border-(--accent)", "transition-all")} />
            <button onclick={() => addList("interface")}
              class={cn("flex", "items-center", "gap-1", "px-2", "py-1.5", "text-xs", "rounded-md", "bg-accent", "text-black", "cursor-pointer", "font-medium", "shrink-0", "hover:opacity-90")}><Plus size={12} />{trans("Add")}</button>
          </div>
        </div>
        <div>
          <label class={labelCls}>{trans("Listen addresses")}</label>
          {#each dnsForm.listen_address as item, i}
            <div class={cn("flex", "items-center", "gap-1.5", "mb-1")}>
              <input type="text" value={item} oninput={(e) => updateList("listen_address", i, e.currentTarget.value)}
                class={cn("flex-1", "px-2.5", "py-1.5", "text-xs", "font-mono", "rounded-md", "bg-surface", "border", "border-border", "text-fg", "outline-none", "focus:border-(--accent)", "transition-all")} />
              <button onclick={() => rmList("listen_address", i)}
                class={cn("p-1.5", "rounded", "text-muted", "hover:text-danger", "cursor-pointer", "shrink-0")}><X size={12} /></button>
            </div>
          {/each}
          <div class={cn("flex", "items-center", "gap-1.5")}>
            <input type="text" bind:value={newItems.listen_address} onkeydown={(e) => { if (e.key === "Enter") addList("listen_address"); }}
              placeholder="0.0.0.0"
              class={cn("flex-1", "px-2.5", "py-1.5", "text-xs", "font-mono", "rounded-md", "bg-surface", "border", "border-border", "text-fg", "outline-none", "placeholder:text-text-muted", "focus:border-(--accent)", "transition-all")} />
            <button onclick={() => addList("listen_address")}
              class={cn("flex", "items-center", "gap-1", "px-2", "py-1.5", "text-xs", "rounded-md", "bg-accent", "text-black", "cursor-pointer", "font-medium", "shrink-0", "hover:opacity-90")}><Plus size={12} />{trans("Add")}</button>
          </div>
        </div>
        <div>
          <label class={labelCls}>{trans("Exclude interfaces")}</label>
          {#each dnsForm.notinterface as item, i}
            <div class={cn("flex", "items-center", "gap-1.5", "mb-1")}>
              <input type="text" value={item} oninput={(e) => updateList("notinterface", i, e.currentTarget.value)}
                class={cn("flex-1", "px-2.5", "py-1.5", "text-xs", "rounded-md", "bg-surface", "border", "border-border", "text-fg", "outline-none", "focus:border-(--accent)", "transition-all")} />
              <button onclick={() => rmList("notinterface", i)}
                class={cn("p-1.5", "rounded", "text-muted", "hover:text-danger", "cursor-pointer", "shrink-0")}><X size={12} /></button>
            </div>
          {/each}
          <div class={cn("flex", "items-center", "gap-1.5")}>
            <input type="text" bind:value={newItems.notinterface} onkeydown={(e) => { if (e.key === "Enter") addList("notinterface"); }}
              placeholder={trans("(none)")}
              class={cn("flex-1", "px-2.5", "py-1.5", "text-xs", "rounded-md", "bg-surface", "border", "border-border", "text-fg", "outline-none", "placeholder:text-text-muted", "focus:border-(--accent)", "transition-all")} />
            <button onclick={() => addList("notinterface")}
              class={cn("flex", "items-center", "gap-1", "px-2", "py-1.5", "text-xs", "rounded-md", "bg-accent", "text-black", "cursor-pointer", "font-medium", "shrink-0", "hover:opacity-90")}><Plus size={12} />{trans("Add")}</button>
          </div>
        </div>
        <div class={cn("flex", "items-center", "gap-2", "opacity-40")}>
          <div class={cn("h-px", "flex-1", "bg-border")} /><span class={cn("text-[10px]", "uppercase", "font-semibold", "tracking-wider", "text-muted")}>{trans("Ports")}</span><div class={cn("h-px", "flex-1", "bg-border")} />
        </div>
        <Input label={trans("DNS server port")} bind:value={dnsForm.port} placeholder="53"
          description={trans("Listening port for inbound DNS queries.")} type="number" />
        <Input label={trans("DNS query port")} bind:value={dnsForm.queryport} placeholder={trans("any")}
          description={trans("Fixed source port for outbound DNS queries.")} type="number" />
        {#if !dnsForm.queryport}
          <Input label={trans("Minimum source port #")} bind:value={dnsForm.minport} placeholder="1024"
            description={trans("Min valid value 1024. Useful for systems behind firewalls.")} type="number" />
          <Input label={trans("Maximum source port #")} bind:value={dnsForm.maxport} placeholder="50000"
            description={trans("Max valid value 65535. Useful for systems behind firewalls.")} type="number" />
        {/if}

      <!-- ════ DNS RECORDS ════ -->
      {:else if mainTab === "dnsrecords"}
        <TabBar tabs={recTabs} active={recTab} onchange={(id: string) => { recTab = id as RecTab; }} />
        <div class={cn("mt-3")}>
          {#if recTab === "hosts"}
            <p class={cn("text-xs", "text-muted", "mb-2")}>{trans("Hostnames are used to bind a domain name to an IP address. This setting is redundant for hostnames already configured with static leases, but it can be useful to rebind an FQDN.")}</p>
            <div class={cn("flex", "justify-end", "mb-2")}>
              <button onclick={() => openRec("domain")}
                class={cn("flex", "items-center", "gap-1", "px-2", "py-1", "text-xs", "rounded", "bg-accent", "text-black", "cursor-pointer")}
              ><Plus size={11} />{trans("Add")}</button>
            </div>
            {#if getSections("domain").length === 0}
              <p class={cn("text-xs", "text-muted", "italic", "text-center", "py-2")}>{trans("This section contains no values yet")}</p>
            {:else}
              <div class={cn("glass", "rounded-xl", "overflow-hidden")}>
                <table class={cn("w-full", "text-xs")}>
                  <thead><tr class={cn("text-left", "text-muted", "bg-surface", "border-b", "border-border")}>
                    <th class={th}>{trans("Hostname")}</th><th class={th}>{trans("IP address")}</th><th class={th}>{trans("Actions")}</th>
                  </tr></thead>
                  <tbody>
                    {#each getSections("domain") as [id, sec], i}
                      <tr class={cn("border-b", "border-border", "hover:bg-white/[0.04]", i % 2 === 0 && "bg-white/[0.015]")}>
                        <td class={td}>{sec.name || "—"}</td>
                        <td class={td}>{sec.ip || "—"}</td>
                        <td class={td}>
                          <button onclick={() => openRec("domain", id)} class={cn("p-1", "rounded", "text-muted", "hover:text-fg", "cursor-pointer")} title={trans("Edit")}><Pencil size={11} /></button>
                          <button onclick={() => deleteSection(id)} class={cn("p-1", "rounded", "text-muted", "hover:text-danger", "cursor-pointer")} title={trans("Delete")}><Trash2 size={11} /></button>
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}

          {:else if recTab === "srvhosts"}
            <p class={cn("text-xs", "text-muted", "mb-2")}>{trans("Bind service records to a domain name: specify the location of services. See RFC2782.")}</p>
            <div class={cn("flex", "justify-end", "mb-2")}>
              <button onclick={() => openRec("srvhost")}
                class={cn("flex", "items-center", "gap-1", "px-2", "py-1", "text-xs", "rounded", "bg-accent", "text-black", "cursor-pointer")}
              ><Plus size={11} />{trans("Add")}</button>
            </div>
            {#if getSections("srvhost").length === 0}
              <p class={cn("text-xs", "text-muted", "italic", "text-center", "py-2")}>{trans("This section contains no values yet")}</p>
            {:else}
              <div class={cn("glass", "rounded-xl", "overflow-hidden")}>
                <table class={cn("w-full", "text-xs")}>
                  <thead><tr class={cn("text-left", "text-muted", "bg-surface", "border-b", "border-border")}>
                    <th class={th}>SRV</th><th class={th}>{trans("Target")}</th><th class={th}>{trans("Port")}</th><th class={th}>{trans("Priority")}</th><th class={th}>{trans("Weight")}</th><th class={th}>{trans("Actions")}</th>
                  </tr></thead>
                  <tbody>
                    {#each getSections("srvhost") as [id, sec], i}
                      <tr class={cn("border-b", "border-border", "hover:bg-white/[0.04]", i % 2 === 0 && "bg-white/[0.015]")}>
                        <td class={td}>{sec.srv || "—"}</td>
                        <td class={td}>{sec.target || "—"}</td>
                        <td class={td}>{sec.port || "—"}</td>
                        <td class={td}>{sec.class || "—"}</td>
                        <td class={td}>{sec.weight || "—"}</td>
                        <td class={td}>
                          <button onclick={() => openRec("srvhost", id)} class={cn("p-1", "rounded", "text-muted", "hover:text-fg", "cursor-pointer")} title={trans("Edit")}><Pencil size={11} /></button>
                          <button onclick={() => deleteSection(id)} class={cn("p-1", "rounded", "text-muted", "hover:text-danger", "cursor-pointer")} title={trans("Delete")}><Trash2 size={11} /></button>
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}

          {:else if recTab === "mxhosts"}
            <p class={cn("text-xs", "text-muted", "mb-2")}>{trans("Bind service records to a domain name: specify the location of services. You may add multiple records for the same domain.")}</p>
            <div class={cn("flex", "justify-end", "mb-2")}>
              <button onclick={() => openRec("mxhost")}
                class={cn("flex", "items-center", "gap-1", "px-2", "py-1", "text-xs", "rounded", "bg-accent", "text-black", "cursor-pointer")}
              ><Plus size={11} />{trans("Add")}</button>
            </div>
            {#if getSections("mxhost").length === 0}
              <p class={cn("text-xs", "text-muted", "italic", "text-center", "py-2")}>{trans("This section contains no values yet")}</p>
            {:else}
              <div class={cn("glass", "rounded-xl", "overflow-hidden")}>
                <table class={cn("w-full", "text-xs")}>
                  <thead><tr class={cn("text-left", "text-muted", "bg-surface", "border-b", "border-border")}>
                    <th class={th}>{trans("Domain")}</th><th class={th}>{trans("Relay")}</th><th class={th}>{trans("Priority")}</th><th class={th}>{trans("Actions")}</th>
                  </tr></thead>
                  <tbody>
                    {#each getSections("mxhost") as [id, sec], i}
                      <tr class={cn("border-b", "border-border", "hover:bg-white/[0.04]", i % 2 === 0 && "bg-white/[0.015]")}>
                        <td class={td}>{sec.domain || "—"}</td>
                        <td class={td}>{sec.relay || "—"}</td>
                        <td class={td}>{sec.pref || "—"}</td>
                        <td class={td}>
                          <button onclick={() => openRec("mxhost", id)} class={cn("p-1", "rounded", "text-muted", "hover:text-fg", "cursor-pointer")} title={trans("Edit")}><Pencil size={11} /></button>
                          <button onclick={() => deleteSection(id)} class={cn("p-1", "rounded", "text-muted", "hover:text-danger", "cursor-pointer")} title={trans("Delete")}><Trash2 size={11} /></button>
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}

          {:else if recTab === "cnamehosts"}
            <p class={cn("text-xs", "text-muted", "mb-2")}>{trans("Set an alias for a hostname.")}</p>
            <div class={cn("flex", "justify-end", "mb-2")}>
              <button onclick={() => openRec("cname")}
                class={cn("flex", "items-center", "gap-1", "px-2", "py-1", "text-xs", "rounded", "bg-accent", "text-black", "cursor-pointer")}
              ><Plus size={11} />{trans("Add")}</button>
            </div>
            {#if getSections("cname").length === 0}
              <p class={cn("text-xs", "text-muted", "italic", "text-center", "py-2")}>{trans("This section contains no values yet")}</p>
            {:else}
              <div class={cn("glass", "rounded-xl", "overflow-hidden")}>
                <table class={cn("w-full", "text-xs")}>
                  <thead><tr class={cn("text-left", "text-muted", "bg-surface", "border-b", "border-border")}>
                    <th class={th}>{trans("Domain")}</th><th class={th}>{trans("Target")}</th><th class={th}>{trans("Actions")}</th>
                  </tr></thead>
                  <tbody>
                    {#each getSections("cname") as [id, sec], i}
                      <tr class={cn("border-b", "border-border", "hover:bg-white/[0.04]", i % 2 === 0 && "bg-white/[0.015]")}>
                        <td class={td}>{sec.cname || "—"}</td>
                        <td class={td}>{sec.target || "—"}</td>
                        <td class={td}>
                          <button onclick={() => openRec("cname", id)} class={cn("p-1", "rounded", "text-muted", "hover:text-fg", "cursor-pointer")} title={trans("Edit")}><Pencil size={11} /></button>
                          <button onclick={() => deleteSection(id)} class={cn("p-1", "rounded", "text-muted", "hover:text-danger", "cursor-pointer")} title={trans("Delete")}><Trash2 size={11} /></button>
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}

          {:else if recTab === "dnsrr"}
            <p class={cn("text-xs", "text-muted", "mb-2")}>{trans("Set an arbitrary resource record (RR) type. Hexdata is automatically en/decoded on save and load.")}</p>
            <div class={cn("flex", "justify-end", "mb-2")}>
              <button onclick={() => openRec("dnsrr")}
                class={cn("flex", "items-center", "gap-1", "px-2", "py-1", "text-xs", "rounded", "bg-accent", "text-black", "cursor-pointer")}
              ><Plus size={11} />{trans("Add")}</button>
            </div>
            {#if getSections("dnsrr").length === 0}
              <p class={cn("text-xs", "text-muted", "italic", "text-center", "py-2")}>{trans("This section contains no values yet")}</p>
            {:else}
              <div class={cn("glass", "rounded-xl", "overflow-hidden")}>
                <table class={cn("w-full", "text-xs")}>
                  <thead><tr class={cn("text-left", "text-muted", "bg-surface", "border-b", "border-border")}>
                    <th class={th}>{trans("Name")}</th><th class={th}>{trans("RR Number")}</th><th class={th}>{trans("Hex Data")}</th><th class={th}>{trans("Actions")}</th>
                  </tr></thead>
                  <tbody>
                    {#each getSections("dnsrr") as [id, sec], i}
                      <tr class={cn("border-b", "border-border", "hover:bg-white/[0.04]", i % 2 === 0 && "bg-white/[0.015]")}>
                        <td class={td}>{sec.rrname || "—"}</td>
                        <td class={td}>{sec.rrnumber || "—"}</td>
                        <td class={td}>{sec.hexdata ? (sec.hexdata as string).replace(/:/g, "").replace(/(.{2})/g, "$1 ").trim().substring(0, 30) + "…" : "—"}</td>
                        <td class={td}>
                          <button onclick={() => openRec("dnsrr", id)} class={cn("p-1", "rounded", "text-muted", "hover:text-fg", "cursor-pointer")} title={trans("Edit")}><Pencil size={11} /></button>
                          <button onclick={() => deleteSection(id)} class={cn("p-1", "rounded", "text-muted", "hover:text-danger", "cursor-pointer")} title={trans("Delete")}><Trash2 size={11} /></button>
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}
          {/if}
        </div>

      <!-- ════ DNSSEC (conditional) ════ -->
      {:else if mainTab === "dnssecopt"}
        <Toggle label={trans("DNSSEC")} description={trans("Validate DNS replies and cache DNSSEC data, requires upstream to support DNSSEC.")} bind:checked={dnsForm.dnssec} />
        <Toggle label={trans("DNSSEC check unsigned")} description={trans("Verify unsigned domain responses really come from unsigned domains.")} bind:checked={dnsForm.dnsseccheckunsigned} />

      <!-- ════ FILTER ════ -->
      {:else if mainTab === "filteropts"}
        <Toggle label={trans("Domain required")} description={trans("Never forward DNS queries which lack dots or domain parts.") + " " + trans("Names not in /etc/hosts are answered Not found.")} bind:checked={dnsForm.domainneeded} />
        <Toggle label={trans("Rebind protection")} description={trans("Discard upstream responses containing RFC1918 addresses.") + " " + trans("Discard also upstream responses containing RFC4193, Link-Local and private IPv4-Mapped RFC4291 IPv6 Addresses.")} bind:checked={dnsForm.rebind_protection} />
        {#if dnsForm.rebind_protection}
          <Toggle label={trans("Allow localhost")} description={trans("Exempt 127.0.0.0/8 and ::1 from rebinding checks, e.g. for RBL services.")} bind:checked={dnsForm.rebind_localhost} />
          <div>
            <label class={labelCls}>{trans("Domain whitelist")}</label>
            {#each dnsForm.rebind_domain as item, i}
              <div class={cn("flex", "items-center", "gap-1.5", "mb-1")}>
                <input type="text" value={item} oninput={(e) => updateList("rebind_domain", i, e.currentTarget.value)}
                  placeholder="ihost.netflix.com"
                  class={cn("flex-1", "px-2.5", "py-1.5", "text-xs", "font-mono", "rounded-md", "bg-surface", "border", "border-border", "text-fg", "outline-none", "focus:border-(--accent)", "transition-all")} />
                <button onclick={() => rmList("rebind_domain", i)}
                  class={cn("p-1.5", "rounded", "text-muted", "hover:text-danger", "cursor-pointer", "shrink-0")}><X size={12} /></button>
              </div>
            {/each}
            <div class={cn("flex", "items-center", "gap-1.5")}>
              <input type="text" bind:value={newItems.rebind_domain} onkeydown={(e) => { if (e.key === "Enter") addList("rebind_domain"); }}
                placeholder="ihost.netflix.com"
                class={cn("flex-1", "px-2.5", "py-1.5", "text-xs", "font-mono", "rounded-md", "bg-surface", "border", "border-border", "text-fg", "outline-none", "placeholder:text-text-muted", "focus:border-(--accent)", "transition-all")} />
              <button onclick={() => addList("rebind_domain")}
                class={cn("flex", "items-center", "gap-1", "px-2", "py-1.5", "text-xs", "rounded-md", "bg-accent", "text-black", "cursor-pointer", "font-medium", "shrink-0", "hover:opacity-90")}><Plus size={12} />{trans("Add")}</button>
            </div>
          </div>
        {/if}
        <Toggle label={trans("Local service only")} description={trans("Accept DNS queries only from hosts whose address is on a local subnet.")} bind:checked={dnsForm.localservice} />
        <Toggle label={trans("Filter private")} description={trans("Reject reverse lookups to RFC6303 IP ranges not in /etc/hosts.")} bind:checked={dnsForm.boguspriv} />
        <Toggle label={trans("Filter SRV/SOA service discovery")} description={trans("Filters SRV/SOA service discovery, to avoid triggering dial-on-demand links.")} bind:checked={dnsForm.filterwin2k} />
        <Toggle label={trans("Filter IPv6 AAAA records")} description={trans("Remove IPv6 addresses from the results and only return IPv4 addresses.") + " " + trans("Can be useful if ISP has IPv6 nameservers but does not provide IPv6 routing.")} bind:checked={dnsForm.filter_aaaa} />
        <Toggle label={trans("Filter IPv4 A records")} description={trans("Remove IPv4 addresses from the results and only return IPv6 addresses.")} bind:checked={dnsForm.filter_a} />
        <div>
          <label class={cn(labelCls, "mb-2")}>{trans("Filter arbitrary RR")}</label>
          <p class={cn("text-xs", "text-muted", "mb-2")}>{trans("Removes records of the specified type(s) from answers.")}</p>
          <div class={cn("flex", "flex-wrap", "gap-1.5")}>
            {#each recordTypes as t}
              {@const active = (dnsForm.filter_rr as string[]).includes(t)}
              <label class={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md cursor-pointer select-none border text-xs font-mono transition-all duration-150", active ? "bg-accent/15 text-accent border-accent/30" : "bg-surface text-muted border-border hover:border-white/30 hover:text-fg")}>
                <input type="checkbox" checked={active} onchange={() => toggleMV("filter_rr", t)}
                  class={cn("accent-(--accent)", "w-3", "h-3")} />
                <span>{t}</span>
              </label>
            {/each}
          </div>
        </div>
        <Toggle label={trans("Localise queries")} description={trans("Limit response records (from /etc/hosts) to those that fall within the subnet of the querying interface.") + " " + trans("Note: IPv4 only.")} bind:checked={dnsForm.localise_queries} />
        <Toggle label={trans("No negative cache")} description={trans("Do not cache negative replies, e.g. for non-existent domains.")} bind:checked={dnsForm.nonegcache} />
        <div>
          <label class={labelCls}>{trans("IPs to override with NXDOMAIN")}</label>
          {#each dnsForm.bogusnxdomain as item, i}
            <div class={cn("flex", "items-center", "gap-1.5", "mb-1")}>
              <input type="text" value={item} oninput={(e) => updateList("bogusnxdomain", i, e.currentTarget.value)}
                placeholder="64.94.110.11"
                class={cn("flex-1", "px-2.5", "py-1.5", "text-xs", "font-mono", "rounded-md", "bg-surface", "border", "border-border", "text-fg", "outline-none", "focus:border-(--accent)", "transition-all")} />
              <button onclick={() => rmList("bogusnxdomain", i)}
                class={cn("p-1.5", "rounded", "text-muted", "hover:text-danger", "cursor-pointer", "shrink-0")}><X size={12} /></button>
            </div>
          {/each}
          <div class={cn("flex", "items-center", "gap-1.5")}>
            <input type="text" bind:value={newItems.bogusnxdomain} onkeydown={(e) => { if (e.key === "Enter") addList("bogusnxdomain"); }}
              placeholder="64.94.110.11"
              class={cn("flex-1", "px-2.5", "py-1.5", "text-xs", "font-mono", "rounded-md", "bg-surface", "border", "border-border", "text-fg", "outline-none", "placeholder:text-text-muted", "focus:border-(--accent)", "transition-all")} />
            <button onclick={() => addList("bogusnxdomain")}
              class={cn("flex", "items-center", "gap-1", "px-2", "py-1.5", "text-xs", "rounded-md", "bg-accent", "text-black", "cursor-pointer", "font-medium", "shrink-0", "hover:opacity-90")}><Plus size={12} />{trans("Add")}</button>
          </div>
        </div>

      <!-- ════ FORWARDS ════ -->
      {:else if mainTab === "forward"}
        <div>
          <label class={labelCls}>{trans("DNS Forwards")}</label>
          <p class={cn("text-xs", "text-muted", "mb-1")}>{trans("Forward specific domain queries to specific upstream servers.")}</p>
          {#each dnsForm.server as item, i}
            <div class={cn("flex", "items-center", "gap-1.5", "mb-1")}>
              <input type="text" value={item} oninput={(e) => updateList("server", i, e.currentTarget.value)}
                placeholder="/*.example.org/10.1.2.3"
                class={cn("flex-1", "px-2.5", "py-1.5", "text-xs", "font-mono", "rounded-md", "bg-surface", "border", "border-border", "text-fg", "outline-none", "focus:border-(--accent)", "transition-all")} />
              <button onclick={() => rmList("server", i)}
                class={cn("p-1.5", "rounded", "text-muted", "hover:text-danger", "cursor-pointer", "shrink-0")}><X size={12} /></button>
            </div>
          {/each}
          <div class={cn("flex", "items-center", "gap-1.5")}>
            <input type="text" bind:value={newItems.server} onkeydown={(e) => { if (e.key === "Enter") addList("server"); }}
              placeholder="/*.example.org/10.1.2.3"
              class={cn("flex-1", "px-2.5", "py-1.5", "text-xs", "font-mono", "rounded-md", "bg-surface", "border", "border-border", "text-fg", "outline-none", "placeholder:text-text-muted", "focus:border-(--accent)", "transition-all")} />
            <button onclick={() => addList("server")}
              class={cn("flex", "items-center", "gap-1", "px-2", "py-1.5", "text-xs", "rounded-md", "bg-accent", "text-black", "cursor-pointer", "font-medium", "shrink-0", "hover:opacity-90")}><Plus size={12} />{trans("Add")}</button>
          </div>
        </div>
        <Input label={trans("Additional servers file")} bind:value={dnsForm.serversfile} placeholder="/etc/dnsmasq.servers"
          description={trans("File listing upstream resolvers, optionally domain-specific, e.g. server=1.2.3.4, server=/domain/1.2.3.4.")} />
        <Select label={trans("Add requestor MAC")} description={trans("Add the MAC address of the requestor to DNS queries which are forwarded upstream.")} bind:value={dnsForm.addmac}
          options={[
            { value: "", label: trans("off") },
            { value: "1", label: trans("enabled (default)") },
            { value: "base64", label: "base64" },
            { value: "text", label: "text" },
          ]} placeholder={trans("Select...")} />
        <Toggle label={trans("Remove MAC address before forwarding query")} description={trans("Remove any MAC address information already in downstream queries before forwarding upstream.")} bind:checked={dnsForm.stripmac} />
        <Input label={trans("Add subnet address to forwards")} bind:value={dnsForm.addsubnet} placeholder="0,0"
          description={trans("Add a subnet address to the DNS queries which are forwarded upstream, leaving this value empty disables the feature.")} />
        <Toggle label={trans("Remove subnet address before forwarding query")} description={trans("Remove any subnet address already present in a downstream query before forwarding it upstream.")} bind:checked={dnsForm.stripsubnet} />

      <!-- ════ LIMITS ════ -->
      {:else if mainTab === "limits"}
        <Input label={trans("Max. EDNS0 packet size")} bind:value={dnsForm.ednspacket_max} placeholder="1280"
          description={trans("Maximum allowed size of EDNS0 UDP packets.")} type="number" />
        <Input label={trans("Max. concurrent queries")} bind:value={dnsForm.dnsforwardmax} placeholder="150"
          description={trans("Maximum allowed number of concurrent DNS queries.")} type="number" />
        <Input label={trans("Size of DNS query cache")} bind:value={dnsForm.cachesize} placeholder="150"
          description={trans("Number of cached DNS entries, 10000 is maximum, 0 is no caching.")} type="number" />
        <Input label={trans("Min cache TTL")} bind:value={dnsForm.min_cache_ttl} placeholder="60"
          description={trans("Extend short TTL values to the seconds value given when caching them. Use with caution.") + " " + trans("(Max 1h == 3600)")} type="number" />
        <Input label={trans("Max cache TTL")} bind:value={dnsForm.max_cache_ttl} placeholder="3600"
          description={trans("Set a maximum seconds TTL value for entries in the cache.")} type="number" />

      <!-- ════ LOG ════ -->
      {:else if mainTab === "logging"}
        <Toggle label={trans("Log queries")} description={trans("Write received DNS queries to syslog.") + " " + trans("Dump cache on SIGUSR1, include requesting IP.")} bind:checked={dnsForm.logqueries} />
        <div>
          <label class={labelCls}>{trans("Log facility")}</label>
          <p class={cn("text-xs", "text-muted", "mb-1")}>{trans("Set log class/facility for syslog entries.")}</p>
          <select bind:value={dnsForm.logfacility}
            class={cn("w-full", "px-2.5", "py-1.5", "text-xs", "rounded-md", "bg-surface", "border", "border-border", "text-fg", "outline-none", "focus:border-(--accent)")}>
            <option value="">{trans("Select...")}</option>
            {#each ["KERN","USER","MAIL","DAEMON","AUTH","LPR","NEWS","UUCP","CRON","LOCAL0","LOCAL1","LOCAL2","LOCAL3","LOCAL4","LOCAL5","LOCAL6","LOCAL7"] as f}
              <option value={f}>{f}</option>
            {/each}
            <option value="-">stderr</option>
          </select>
        </div>

      <!-- ════ RESOLV & HOSTS FILES ════ -->
      {:else if mainTab === "files"}
        <Toggle label={trans("Ignore resolv file")} bind:checked={dnsForm.noresolv} />
        {#if !dnsForm.noresolv}
          <Input label={trans("Resolv file")} bind:value={dnsForm.resolvfile} placeholder="/tmp/resolv.conf.d/resolv.conf.auto"
            description={trans("File with upstream resolvers.")} />
        {/if}
        <Toggle label={trans("Strict order")} description={trans("Query upstream resolvers in the order they appear in the resolv file.")} bind:checked={dnsForm.strictorder} />
        <Toggle label={trans("Ignore hosts files directory")} description={trans("On: use instance specific hosts file only. Off: use all files in the directory including the instance specific hosts file.")} bind:checked={dnsForm.ignore_hosts_dir} />
        <Toggle label={trans("Ignore /etc/hosts file")} description={trans("Ignore /etc/hosts file")} bind:checked={dnsForm.nohosts} />
        <div>
          <label class={labelCls}>{trans("Additional hosts files")}</label>
          {#each dnsForm.addnhosts as item, i}
            <div class={cn("flex", "items-center", "gap-1.5", "mb-1")}>
              <input type="text" value={item} oninput={(e) => updateList("addnhosts", i, e.currentTarget.value)}
                placeholder="/etc/dnsmasq.hosts"
                class={cn("flex-1", "px-2.5", "py-1.5", "text-xs", "font-mono", "rounded-md", "bg-surface", "border", "border-border", "text-fg", "outline-none", "focus:border-(--accent)", "transition-all")} />
              <button onclick={() => rmList("addnhosts", i)}
                class={cn("p-1.5", "rounded", "text-muted", "hover:text-danger", "cursor-pointer", "shrink-0")}><X size={12} /></button>
            </div>
          {/each}
          <div class={cn("flex", "items-center", "gap-1.5")}>
            <input type="text" bind:value={newItems.addnhosts} onkeydown={(e) => { if (e.key === "Enter") addList("addnhosts"); }}
              placeholder="/etc/dnsmasq.hosts"
              class={cn("flex-1", "px-2.5", "py-1.5", "text-xs", "font-mono", "rounded-md", "bg-surface", "border", "border-border", "text-fg", "outline-none", "placeholder:text-text-muted", "focus:border-(--accent)", "transition-all")} />
            <button onclick={() => addList("addnhosts")}
              class={cn("flex", "items-center", "gap-1", "px-2", "py-1.5", "text-xs", "rounded-md", "bg-accent", "text-black", "cursor-pointer", "font-medium", "shrink-0", "hover:opacity-90")}><Plus size={12} />{trans("Add")}</button>
          </div>
        </div>

      <!-- ════ IP SETS ════ -->
      {:else if mainTab === "ipsets"}
        <p class={cn("text-xs", "text-muted", "mb-2")}>{trans("List of IP sets to populate with the IPs of DNS lookup results of the FQDNs also specified here.")}<br />{trans("The netfilter components below are only regarded when running fw4.")}</p>
        <div class={cn("flex", "justify-end", "mb-2")}>
          <button onclick={() => openIpset()}
            class={cn("flex", "items-center", "gap-1", "px-2", "py-1", "text-xs", "rounded", "bg-accent", "text-black", "cursor-pointer")}
          ><Plus size={11} />{trans("Add")}</button>
        </div>
        {#if getSections("ipset").length === 0}
          <p class={cn("text-xs", "text-muted", "italic", "text-center", "py-2")}>{trans("This section contains no values yet")}</p>
        {:else}
          <div class={cn("glass", "rounded-xl", "overflow-hidden")}>
            <table class={cn("w-full", "text-xs")}>
              <thead><tr class={cn("text-left", "text-muted", "bg-surface", "border-b", "border-border")}>
                <th class={th}>{trans("Name")}</th><th class={th}>{trans("FQDN")}</th><th class={th}>{trans("Table")}</th><th class={th}>{trans("Family")}</th><th class={th}>{trans("Actions")}</th>
              </tr></thead>
              <tbody>
                {#each getSections("ipset") as [id, sec], i}
                  <tr class={cn("border-b", "border-border", "hover:bg-white/[0.04]", i % 2 === 0 && "bg-white/[0.015]")}>
                    <td class={td}>{ltoA(sec.name).join(", ") || "—"}</td>
                    <td class={td}>{ltoA(sec.domain).join(", ") || "—"}</td>
                    <td class={td}>{sec.table || "—"}</td>
                    <td class={td}>{sec.table_family || "inet"}</td>
                    <td class={td}>
                      <button onclick={() => openIpset(id)} class={cn("p-1", "rounded", "text-muted", "hover:text-fg", "cursor-pointer")} title={trans("Edit")}><Pencil size={11} /></button>
                      <button onclick={() => deleteSection(id)} class={cn("p-1", "rounded", "text-muted", "hover:text-danger", "cursor-pointer")} title={trans("Delete")}><Trash2 size={11} /></button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      {/if}
    </div>

    {#if mainTab !== "dnsrecords" && mainTab !== "ipsets"}
      <div class={cn("sticky", "bottom-0", "flex", "justify-end", "px-5", "py-3", "bg-gradient-to-t", "from-surface", "via-surface/95", "to-transparent", "-mt-10", "pointer-events-none")}>
        <button onclick={saveDnsmasq} disabled={busy.dnsmasq !== undefined}
          class={cn("flex", "items-center", "gap-1.5", "px-4", "py-2", "text-xs", "font-semibold", "rounded-lg", "bg-accent", "text-black", "hover:opacity-90", "disabled:opacity-50", "transition-all", "cursor-pointer", "pointer-events-auto")}
        ><Save size={13} />{trans("Save")}</button>
      </div>
    {/if}
  </div>

  <!-- ════════ INSTANCE MANAGER ════════ -->
  <div class={cn("mt-4", "glass", "rounded-xl", "p-5")}>
    <h3 class={cn("text-sm", "font-semibold", "text-[var(--text)]", "mb-2")}>{trans("Server Instances")}</h3>
    {#each instances as inst, i}
      <div class={cn("flex", "items-center", "justify-between", "py-1.5", "px-2", "rounded", "hover:bg-white/[0.03]", i % 2 === 1 && "bg-white/[0.015]")}>
        <span class={cn("text-xs", "text-[var(--text)]")}>
          {inst.name || (inst.isDefault ? trans("Default instance") : trans("Unnamed instance") + " #" + (i + 1))}
        </span>
        {#if !inst.isDefault}
          <button onclick={() => removeInstance(inst.id)} disabled={busy["del_" + inst.id] !== undefined}
            class={cn("p-1", "rounded", "text-muted", "hover:text-danger", "cursor-pointer", "disabled:opacity-50")}><Trash2 size={12} /></button>
        {/if}
      </div>
    {/each}
    <div class={cn("flex", "items-center", "gap-2", "mt-3", "pt-3", "border-t", "border-[var(--border)]")}>
      <input type="text" bind:value={newInstanceName} onkeydown={(e) => { if (e.key === "Enter") addInstance(); }}
        placeholder={trans("New instance name...")}
        class={cn("flex-1", "px-2.5", "py-1.5", "text-xs", "rounded-md", "bg-[var(--surface)]", "border", "border-[var(--border)]", "text-[var(--text)]", "outline-none", "placeholder:text-[var(--text-muted)]", "focus:border-[var(--accent)]", "transition-all")} />
      <button onclick={addInstance}
        class={cn("flex", "items-center", "gap-1", "px-3", "py-1.5", "text-xs", "rounded-md", "bg-[var(--accent)]", "text-white", "cursor-pointer", "font-medium", "hover:opacity-90", "shrink-0")}>
        <Plus size={12} />{trans("Add server instance")}
      </button>
    </div>
  </div>
  {/if}
</div>

<!-- ════════ DNS RECORD MODAL ════════ -->
{#if editing}
  <div class={cn("fixed", "inset-0", "z-50", "flex", "items-start", "justify-center", "pt-12")} onclick={closeRec} role="dialog" aria-modal="true">
    <div class={cn("absolute", "inset-0", "bg-black/60", "backdrop-blur-sm")} />
    <div onclick={(e: MouseEvent) => e.stopPropagation()} class={cn("relative", "w-full", "max-w-md", "max-h-[85vh]", "overflow-y-auto", "glass", "rounded-xl", "p-5", "animate-fade-in", "shadow-2xl")}>
      <div class={cn("flex", "items-center", "justify-between", "mb-4")}>
        <h2 class={cn("text-sm", "font-semibold", "text-white")}>{editing.id === "__new__" ? trans("Add") : trans("Edit")} {editing.type}</h2>
        <button onclick={closeRec} class={cn("p-1", "rounded", "text-muted", "hover:text-fg", "cursor-pointer")}><X size={14} /></button>
      </div>
      <div class={cn("space-y-4")}>
        {#if editing.type === "domain"}
          <Input label={trans("Hostname")} bind:value={edForm.name} placeholder="myhost.local" />
          <Select label={trans("IP address")} bind:value={edForm.ip} options={[{ value: "", label: "" }, ...Object.entries(hostIpMap).map(([addr, name]) => ({ value: addr, label: `${addr} (${name})` }))]} placeholder={trans("Select...")} />
        {:else if editing.type === "srvhost"}
          <Input label="SRV" bind:value={edForm.srv} placeholder="_sip._tcp.example.com." description={trans("Syntax: _service._proto.example.com.")} />
          <Input label={trans("Target")} bind:value={edForm.target} placeholder="sip.example.com." description={trans("CNAME or fqdn")} />
          <Input label={trans("Port")} bind:value={edForm.port} placeholder="5060" type="number" />
          <Input label={trans("Priority")} bind:value={edForm.class} placeholder="10" description={trans("Ordinal: lower comes first.")} type="number" />
          <Input label={trans("Weight")} bind:value={edForm.weight} placeholder="50" type="number" />
        {:else if editing.type === "mxhost"}
          <Input label={trans("Domain")} bind:value={edForm.domain} placeholder="example.com." />
          <Input label={trans("Relay")} bind:value={edForm.relay} placeholder="relay.example.com." />
          <Input label={trans("Priority")} bind:value={edForm.pref} placeholder="0" description={trans("Ordinal: lower comes first.")} type="number" />
        {:else if editing.type === "cname"}
          <Input label={trans("Domain")} bind:value={edForm.cname} placeholder="www.example.com." />
          <Input label={trans("Target")} bind:value={edForm.target} placeholder="example.com." />
        {:else if editing.type === "dnsrr"}
          <Input label={trans("Resource Record Name")} bind:value={edForm.rrname} placeholder="svcb.example.com." />
          <Input label={trans("Resource Record Number")} bind:value={edForm.rrnumber} placeholder="64" type="number" />
          {#if edForm.rrnumber === "65"}
            <p class={cn("text-xs", "text-muted", "italic", "mb-2")}>{trans("Type 65 SVCB records are configured via the fields below. Hex is auto-generated on save.")}</p>
            <Input label={trans("Svc Priority")} bind:value={edForm._svc_priority} placeholder="1" type="number" />
            <Input label={trans("Svc Target")} bind:value={edForm._svc_target} placeholder="svc.example.com." />
            <div>
              <label class={labelCls}>{trans("Svc Parameters")}</label>
              <textarea bind:value={edForm._svc_params} class={cn("w-full", "px-2.5", "py-1.5", "text-xs", "font-mono", "rounded-md", "bg-surface", "border", "border-border", "text-fg", "outline-none", "focus:border-(--accent)", "transition-all", "resize-y", "min-h-[60px]")} placeholder="alpn=h2,h3&#10;ipv4hint=192.0.2.1,192.0.2.2&#10;ipv6hint=2001:db8::1,2001:db8::2&#10;port=8000" rows={4}></textarea>
            </div>
          {:else}
            <div>
              <label class={labelCls}>{trans("Raw Data")}</label>
              <textarea bind:value={edForm._hexdata} class={cn("w-full", "px-2.5", "py-1.5", "text-xs", "font-mono", "rounded-md", "bg-surface", "border", "border-border", "text-fg", "outline-none", "focus:border-(--accent)", "transition-all", "resize-y", "min-h-[60px]")} placeholder="free-form string" rows={4}></textarea>
            </div>
          {/if}
        {/if}
      </div>
      <div class={cn("flex", "justify-end", "gap-2", "mt-5")}>
        <button onclick={closeRec} class={cn("px-3", "py-1.5", "text-xs", "rounded-lg", "bg-surface-2", "border", "border-border", "text-muted", "hover:text-fg", "cursor-pointer")}>{trans("Cancel")}</button>
        <button onclick={saveRec} class={cn("flex", "items-center", "gap-1.5", "px-3", "py-1.5", "text-xs", "rounded-lg", "bg-accent", "text-black", "hover:opacity-90", "cursor-pointer")}><Save size={12} />{trans("Save")}</button>
      </div>
    </div>
  </div>
{/if}

<!-- ════════ IP SET MODAL ════════ -->
{#if editingIpset}
  <div class={cn("fixed", "inset-0", "z-50", "flex", "items-start", "justify-center", "pt-12")} onclick={closeIpset} role="dialog" aria-modal="true">
    <div class={cn("absolute", "inset-0", "bg-black/60", "backdrop-blur-sm")} />
    <div onclick={(e: MouseEvent) => e.stopPropagation()} class={cn("relative", "w-full", "max-w-md", "glass", "rounded-xl", "p-5", "animate-fade-in", "shadow-2xl")}>
      <div class={cn("flex", "items-center", "justify-between", "mb-4")}>
        <h2 class={cn("text-sm", "font-semibold", "text-white")}>{editingIpset === "__new__" ? trans("Add") : trans("Edit")} {trans("IP set")}</h2>
        <button onclick={closeIpset} class={cn("p-1", "rounded", "text-muted", "hover:text-fg", "cursor-pointer")}><X size={14} /></button>
      </div>
      <div class={cn("space-y-4")}>
        <Input label={trans("Name")} bind:value={ipForm.name} placeholder={trans("Set name")}
          description={trans("Name of the set.")} />
        <Input label={trans("FQDN")} bind:value={ipForm.domain} placeholder="example.com"
          description={trans("FQDN to resolve and add to this set.")} />
        <Select label={trans("Netfilter table name")} bind:value={ipForm.table}
          options={[{ value: "", label: "fw4" }, ...fwIpsets.map((n) => ({ value: n, label: n }))]}
          placeholder={trans("Select...")} />
        <Select label={trans("Table IP family")} bind:value={ipForm.table_family}
          options={[
            { value: "", label: trans("IPv4+6") },
            { value: "inet", label: trans("IPv4+6") },
            { value: "ip", label: trans("IPv4") },
            { value: "ip6", label: trans("IPv6") },
          ]} placeholder={trans("Select...")} />
      </div>
      <div class={cn("flex", "justify-end", "gap-2", "mt-5")}>
        <button onclick={closeIpset} class={cn("px-3", "py-1.5", "text-xs", "rounded-lg", "bg-surface-2", "border", "border-border", "text-muted", "hover:text-fg", "cursor-pointer")}>{trans("Cancel")}</button>
        <button onclick={saveIpset} class={cn("flex", "items-center", "gap-1.5", "px-3", "py-1.5", "text-xs", "rounded-lg", "bg-accent", "text-black", "hover:opacity-90", "cursor-pointer")}><Save size={12} />{trans("Save")}</button>
      </div>
    </div>
  </div>
{/if}
