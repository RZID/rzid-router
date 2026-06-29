<script lang="ts">
  import { onMount } from "svelte";
  import { Save } from "@lucide/svelte";
  import { batchCall, uciAdd, uciCommit, call } from "../../../api/ubus";
  import { cn } from "../../../helpers/classname";
  import { t as _t, getLocale, onLocaleChange } from "../../../i18n";
  import Input from "../../../components/Input/Input.svelte";
  import Select from "../../../components/Select/Select.svelte";
  import TabBar from "../../../components/TabBar/TabBar.svelte";
  import Cache from "./Cache.svelte";
  import Files from "./Files.svelte";
  import IPSets from "./IPSets.svelte";
  import Limits from "./Limits.svelte";
  import General from "./General.svelte";
  import Devices from "./Devices.svelte";
  import Forward from "./Forward.svelte";
  import Logging from "./Logging.svelte";
  import DNSRecord from "./DNSRecord.svelte";
  import DNSSecOpt from "./DNSSecOpt.svelte";
  import FilterOpts from "./FilterOpts.svelte";
  import RecordModal from "./RecordModal.svelte";
  import IpsetModal from "./IpsetModal.svelte";
  import InstanceManager from "./InstanceManager.svelte";
  import type { RecTab } from "./types";

  type DnsTab =
    | "general"
    | "cache"
    | "devices"
    | "dnsrecords"
    | "dnssecopt"
    | "filteropts"
    | "forward"
    | "limits"
    | "logging"
    | "files"
    | "ipsets";
  const recordTypes = [
    "ANY",
    "A",
    "AAAA",
    "ALIAS",
    "CAA",
    "CERT",
    "CNAME",
    "DS",
    "HINFO",
    "HIP",
    "HTTPS",
    "KEY",
    "LOC",
    "MX",
    "NAPTR",
    "NS",
    "OPENPGPKEY",
    "PTR",
    "RP",
    "SIG",
    "SOA",
    "SRV",
    "SSHFP",
    "SVCB",
    "TLSA",
    "TXT",
    "URI",
  ];

  let locale = $state(getLocale()),
    loading = $state(true),
    hasDnssec = $state(false),
    newInstanceName = $state("");
  let recTab = $state<RecTab>("hosts"),
    mainTab = $state<DnsTab>("general"),
    uciFw = $state<Record<string, any>>({});
  let ipForm = $state<Record<string, any>>({}),
    edForm = $state<Record<string, any>>({});
  let uciDhcp = $state<Record<string, any>>({}),
    busy = $state<Record<string, string>>({});
  let dnsForm = $state<Record<string, any>>({}),
    editingIpset: string | null = $state(null);
  let hostHints = $state<Record<string, any>>({}),
    newItems = $state<Record<string, string>>({});
  let editing: { id: string; type: string } | null = $state(null);
  let instances = $state<{ id: string; name: string; isDefault: boolean }[]>(
    [],
  );

  let trans = $derived.by(() => {
    locale;
    return (k: string) => _t(k);
  });
  let mainTabs: { id: DnsTab; label: string }[] = $derived([
    { id: "general", label: trans("General") },
    { id: "cache", label: trans("Cache") },
    { id: "devices", label: trans("Devices & Ports") },
    { id: "dnsrecords", label: trans("DNS Records") },
    { id: "dnssecopt", label: trans("DNSSEC") },
    { id: "filteropts", label: trans("Filter") },
    { id: "forward", label: trans("Forwards") },
    { id: "limits", label: trans("Limits") },
    { id: "logging", label: trans("Log") },
    { id: "files", label: trans("Resolv & Hosts Files") },
    { id: "ipsets", label: trans("IP Sets") },
  ]);
  let dnsmasqSec = $derived(
    (Object.entries(uciDhcp).find(
      ([, v]: [string, any]) => v[".type"] === "dnsmasq",
    ) || [null, {}]) as [string | null, any],
  );
  let fwIpsets = $derived(
    Object.entries(uciFw)
      .filter(([, v]: [string, any]) => v[".type"] === "ipset")
      .map(([, v]) => v.name as string)
      .filter(Boolean),
  );
  let hostIpMap = $derived.by(() => {
    const m: Record<string, string> = {};
    Object.entries(hostHints).forEach(([, v]: [string, any]) => {
      const addrs = v.ipaddrs || v.ipv4 || [];
      (Array.isArray(addrs) ? addrs : [addrs]).forEach((a: string) => {
        m[a] = v.name || v.macaddr || "";
      });
    });
    return m;
  });

  const ltoA = (v: any): string[] => {
    if (Array.isArray(v)) return v;
    if (v?.split) return v.split(/\s+/).filter(Boolean);
    return [];
  };
  const getSections = (type: string) =>
    Object.entries(uciDhcp).filter(
      ([, v]: [string, any]) => v[".type"] === type,
    );
  const setFormVal = (field: string, val: any) => {
    dnsForm = { ...dnsForm, [field]: val };
  };

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
    hasDnssec = !!(
      features?.dnsmasq?.dnssec || features?.dnsmasq?.dnsmasq_full_dnssec
    );
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
      dnssec: f.dnssec ? "1" : "",
      dnsseccheckunsigned: f.dnsseccheckunsigned ? "1" : "",
    };
    await call("uci", "set", { config: "dhcp", section: name, values: vals });
    await uciCommit("dhcp");
    await fetchData();
    busy = Object.fromEntries(
      Object.entries(busy).filter(([k]) => k !== "dnsmasq"),
    );
  };

  const toggleMV = (field: string, val: string) => {
    const arr = dnsForm[field] as string[];
    setFormVal(
      field,
      arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val],
    );
  };
  const addList = (field: string) => {
    const val = (newItems[field] || "").trim();
    if (!val) return;
    setFormVal(field, [...(dnsForm[field] as string[]), val]);
    newItems = { ...newItems, [field]: "" };
  };
  const rmList = (field: string, i: number) => {
    const arr = dnsForm[field] as string[];
    setFormVal(
      field,
      arr.filter((_, idx) => idx !== i),
    );
  };
  const updateList = (field: string, i: number, val: string) => {
    const arr = [...(dnsForm[field] as string[])];
    arr[i] = val;
    setFormVal(field, arr);
  };
  const addInstance = async () => {
    const name = newInstanceName.trim();
    if (!name) return;
    await uciAdd("dhcp", "dnsmasq", name);
    await uciCommit("dhcp");
    newInstanceName = "";
    await fetchData();
  };
  const removeInstance = async (id: string) => {
    busy = { ...busy, ["del_" + id]: "delete" };
    await call("uci", "set", {
      config: "dhcp",
      section: id,
      values: { "": "" },
    });
    await uciCommit("dhcp");
    await fetchData();
    busy = Object.fromEntries(
      Object.entries(busy).filter(([k]) => !k.startsWith("del_")),
    );
  };
  const hexDecode = (s: string) => {
    const h = s.replace(/[\s:]/g, "");
    let r = "";
    for (let i = 0; i < h.length; i += 2)
      r += String.fromCharCode(parseInt(h.substr(i, 2), 16));
    return r;
  };
  const hexEncode = (s: string) =>
    s
      .split("")
      .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  const openRec = (type: string, id?: string) => {
    const sec = id ? uciDhcp[id] || {} : {};
    if (type === "domain") {
      edForm = { name: sec.name ?? "", ip: sec.ip ?? "" };
    } else if (type === "srvhost") {
      edForm = {
        srv: sec.srv ?? "",
        target: sec.target ?? "",
        port: sec.port ?? "",
        class: sec.class ?? "",
        weight: sec.weight ?? "",
      };
    } else if (type === "mxhost") {
      edForm = {
        domain: sec.domain ?? "",
        relay: sec.relay ?? "",
        pref: sec.pref ?? "",
      };
    } else if (type === "cname") {
      edForm = { cname: sec.cname ?? "", target: sec.target ?? "" };
    } else if (type === "dnsrr") {
      const hexdata = sec.hexdata ?? "";
      edForm = {
        rrname: sec.rrname ?? "",
        rrnumber: sec.rrnumber ?? "",
        hexdata,
        _hexdata: hexDecode(hexdata),
        showSvcb: sec.rrnumber === "65",
        _svc_priority: sec._svc_priority ?? "",
        _svc_target: sec._svc_target ?? "",
        _svc_params: sec._svc_params ?? "",
      };
    }
    editing = { id: id || "__new__", type };
  };
  const closeRec = () => {
    editing = null;
    edForm = {};
  };
  const saveRec = async () => {
    if (!editing) return;
    const vals: Record<string, any> = { ".type": editing.type };
    if (editing.type === "domain") {
      vals.name = edForm.name || "";
      vals.ip = edForm.ip || "";
    } else if (editing.type === "srvhost") {
      for (const k of ["srv", "target", "port", "class", "weight"])
        if (edForm[k]) vals[k] = edForm[k];
    } else if (editing.type === "mxhost") {
      for (const k of ["domain", "relay", "pref"])
        if (edForm[k]) vals[k] = edForm[k];
    } else if (editing.type === "cname") {
      for (const k of ["cname", "target"]) if (edForm[k]) vals[k] = edForm[k];
    } else if (editing.type === "dnsrr") {
      vals.rrname = edForm.rrname || "";
      const n = edForm.rrnumber || "";
      vals.rrnumber = n;
      if (n === "65") {
        const priority = edForm._svc_priority || "1",
          target = edForm._svc_target || ".";
        const params = (edForm._svc_params || "")
          .split("\n")
          .map((l: string) => l.trim())
          .filter(Boolean);
        const paramHex = params
          .map((p: string) => {
            const eq = p.indexOf("=");
            if (eq === -1) return "";
            const key = p.slice(0, eq),
              val = p.slice(eq + 1);
            const kv = key + "=" + val;
            return kv
              .split("")
              .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
              .join("")
              .toUpperCase();
          })
          .join("");
        const prioHex = parseInt(priority)
          .toString(16)
          .padStart(4, "0")
          .toUpperCase();
        const tgtHex = target
          .split("")
          .map((c: string) => c.charCodeAt(0).toString(16).padStart(2, "0"))
          .join("")
          .toUpperCase();
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
      await call("uci", "set", {
        config: "dhcp",
        section: editing.id,
        values: vals,
      });
    }
    await uciCommit("dhcp");
    await fetchData();
    closeRec();
  };
  const deleteSection = async (id: string) => {
    busy = { ...busy, [id]: "delete" };
    await call("uci", "set", {
      config: "dhcp",
      section: id,
      values: { "": "" },
    });
    await uciCommit("dhcp");
    await fetchData();
    busy = Object.fromEntries(Object.entries(busy).filter(([k]) => k !== id));
  };
  const openIpset = (id?: string) => {
    const sec = id ? uciDhcp[id] || {} : {};
    ipForm = {
      name: ltoA(sec.name),
      domain: ltoA(sec.domain),
      table: sec.table ?? "",
      table_family: sec.table_family ?? "",
    };
    editingIpset = id || "__new__";
  };
  const closeIpset = () => {
    editingIpset = null;
    ipForm = {};
  };
  const saveIpset = async () => {
    const vals: Record<string, any> = {
      ".type": "ipset",
      name: ipForm.name,
      domain: ipForm.domain,
      table: ipForm.table || "",
      table_family: ipForm.table_family || "",
    };
    if (editingIpset === "__new__") {
      const name = await uciAdd("dhcp", "ipset");
      await call("uci", "set", { config: "dhcp", section: name, values: vals });
    } else if (editingIpset) {
      await call("uci", "set", {
        config: "dhcp",
        section: editingIpset,
        values: vals,
      });
    }
    await uciCommit("dhcp");
    await fetchData();
    closeIpset();
  };

  $effect(() =>
    onLocaleChange(() => {
      locale = getLocale();
    }),
  );
  onMount(() => fetchData());

  const th = "text-xs font-medium pb-2 px-3 text-left whitespace-nowrap";
  const td = "py-1.5 px-3 text-xs font-mono whitespace-nowrap";
  const labelCls =
    "block text-[10px] uppercase text-muted font-semibold tracking-wider mb-1.5";
</script>

<div class={cn("p-6", "animate-fade-in")}>
  <h1 class={cn("text-lg", "font-semibold", "text-white")}>{trans("DNS")}</h1>
  <p class={cn("text-sm", "mt-0.5", "mb-4", "text-muted")}>{trans("DNS")}</p>
  <div class={cn("overflow-x-auto", "pb-1")}>
    <TabBar
      tabs={mainTabs}
      active={mainTab}
      onchange={(id: string) => {
        mainTab = id as DnsTab;
      }}
    />
  </div>
  {#if loading}
    <p class={cn("text-xs", "text-muted", "italic", "mt-6", "text-center")}>
      {trans("Loading...")}
    </p>
  {:else}
    <div class={cn("mt-4", "relative")}>
      <div class={cn("glass", "rounded-xl", "p-5", "pb-16", "space-y-5")}>
        {#if mainTab === "general"}
          <General
            {rmList}
            {dnsForm}
            {addList}
            {labelCls}
            {newItems}
            {updateList}
          />
        {:else if mainTab === "cache"}
          <Cache {dnsForm} {labelCls} {toggleMV} {recordTypes} />
        {:else if mainTab === "devices"}
          <Devices
            {rmList}
            {dnsForm}
            {addList}
            {labelCls}
            {newItems}
            {updateList}
          />
        {:else if mainTab === "dnsrecords"}
          <DNSRecord
            {td}
            {th}
            {recTab}
            {openRec}
            {getSections}
            {deleteSection}
          />
        {:else if mainTab === "dnssecopt"}
          <DNSSecOpt {dnsForm} />
        {:else if mainTab === "filteropts"}
          <FilterOpts
            {rmList}
            {dnsForm}
            {addList}
            {labelCls}
            {newItems}
            {toggleMV}
            {updateList}
            {recordTypes}
          />
        {:else if mainTab === "forward"}
          <Forward
            {rmList}
            {dnsForm}
            {addList}
            {labelCls}
            {newItems}
            {updateList}
          />
        {:else if mainTab === "limits"}
          <Limits {dnsForm} />
        {:else if mainTab === "logging"}
          <Logging {dnsForm} {labelCls} />
        {:else if mainTab === "files"}
          <Files
            {rmList}
            {dnsForm}
            {addList}
            {labelCls}
            {newItems}
            {updateList}
          />
        {:else if mainTab === "ipsets"}
          <IPSets {deleteSection} {getSections} {ltoA} {openIpset} {td} {th} />
        {/if}
      </div>
      {#if mainTab !== "dnsrecords" && mainTab !== "ipsets"}
        <div
          class={cn(
            "flex",
            "px-5",
            "py-3",
            "-mt-10",
            "sticky",
            "bottom-0",
            "justify-end",
            "to-transparent",
            "bg-linear-to-t",
            "from-surface",
            "via-surface/95",
            "pointer-events-none",
          )}
        >
          <button
            onclick={saveDnsmasq}
            disabled={busy.dnsmasq !== undefined}
            class={cn(
              "flex",
              "py-2",
              "px-4",
              "gap-1.5",
              "text-xs",
              "rounded-lg",
              "bg-accent",
              "items-center",
              "text-black",
              "font-semibold",
              "transition-all",
              "cursor-pointer",
              "hover:opacity-90",
              "disabled:opacity-50",
              "pointer-events-auto",
            )}
          >
            <Save size={13} />{trans("Save")}
          </button>
        </div>
      {/if}
    </div>
    <InstanceManager
      {instances}
      bind:newInstanceName
      {busy}
      onadd={addInstance}
      onremove={removeInstance}
      {trans}
    />
  {/if}
</div>

{#if editing}
  <RecordModal
    {editing}
    {edForm}
    {hostIpMap}
    {labelCls}
    onclose={closeRec}
    onsave={saveRec}
    {trans}
  />
{/if}

{#if editingIpset}
  <IpsetModal
    {editingIpset}
    {ipForm}
    {fwIpsets}
    onclose={closeIpset}
    onsave={saveIpset}
    {trans}
  />
{/if}
