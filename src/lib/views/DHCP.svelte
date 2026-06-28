<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { batchCall, uciAdd, uciCommit, call } from "../api/ubus";
  import { cn } from "../helpers/classname";
  import { t as _t, getLocale, onLocaleChange } from "../i18n";
  import Input from "../components/Input/index.svelte";
  import Toggle from "../components/Toggle/index.svelte";
  import Select from "../components/Select/index.svelte";
  import TabBar from "../components/TabBar/index.svelte";
  import SectionHeader from "../components/SectionHeader/index.svelte";
  import { Plus, Pencil, Trash2, Save, X } from "@lucide/svelte";

  let locale = $state(getLocale());
  let trans = $derived.by(() => { locale; return (k: string) => _t(k); });
  $effect(() => onLocaleChange(() => { locale = getLocale(); }));

  function ltoA(v: any): string[] {
    if (Array.isArray(v)) return v;
    if (v?.split) return v.split(/\s+/).filter(Boolean);
    return [];
  }

  type TabId = "leases" | "dnsmasq" | "odhcpd";
  const mainTabs: { id: TabId; label: string }[] = [
    { id: "leases", label: "Leases" },
    { id: "dnsmasq", label: "dnsmasq" },
    { id: "odhcpd", label: "odhcpd" },
  ];
  let mainTab = $state<TabId>("leases");

  type DnsmasqTab = "general" | "devices" | "logging" | "files" | "relay" | "pxe" | "tags";
  const dnsmasqTabs: { id: DnsmasqTab; label: string }[] = [
    { id: "general", label: "General" },
    { id: "devices", label: "Devices & Ports" },
    { id: "logging", label: "Log" },
    { id: "files", label: "Files" },
    { id: "relay", label: "Relay" },
    { id: "pxe", label: "PXE/TFTP" },
    { id: "tags", label: "Tags" },
  ];
  let dnsmasqTab = $state<DnsmasqTab>("general");

  type OdhcpdTab = "general" | "pxe6";
  const odhcpdTabs: { id: OdhcpdTab; label: string }[] = [
    { id: "general", label: "General" },
    { id: "pxe6", label: "PXE over IPv6" },
  ];
  let odhcpdTab = $state<OdhcpdTab>("general");

  type TagsTab = "matchtags" | "settags" | "vc" | "uc";
  const tagsTabs: { id: TagsTab; label: string }[] = [
    { id: "matchtags", label: "Match Tags" },
    { id: "settags", label: "Set Tags" },
    { id: "vc", label: "VC" },
    { id: "uc", label: "UC" },
  ];
  let tagsTab = $state<TagsTab>("matchtags");

  let uciDhcp = $state<Record<string, any>>({});
  let loading = $state(true);
  let leases4 = $state<any[]>([]);
  let leases6 = $state<any[]>([]);
  let hosts = $state<Record<string, any>>({});
  let interfaces = $state<string[]>([]);
  let pollInterval: ReturnType<typeof setInterval>;

  let editing: { section: string; type: string } | null = $state(null);
  let editSubTab = $state("general");
  let form = $state<Record<string, any>>({});
  let addingNew = $state(false);
  let newName = $state("");
  let newNameError = $state("");

  let busy = $state<Record<string, string>>({});
  let dnsmasqForm = $state<Record<string, any>>({});
  let odhcpdForm = $state<Record<string, any>>({});

  const hasDhcpV4 = true; // TODO: detect odhcpd dhcpv4 feature
  const hasDhcpV6 = true; // TODO: detect dnsmasq dhcpv6 / odhcpd

  const getSections = (type: string) =>
    Object.entries(uciDhcp).filter(([, v]: [string, any]) => v[".type"] === type);

  const dnsmasqSec = $derived(
    (Object.entries(uciDhcp).find(([, v]: [string, any]) => v[".type"] === "dnsmasq") || [null, {}]) as [string | null, any]
  );
  const odhcpdSec = $derived(
    (Object.entries(uciDhcp).find(([, v]: [string, any]) => v[".type"] === "odhcpd") || [null, {}]) as [string | null, any]
  );

  const fetchData = async () => {
    loading = true;
    const [uciRes, leaseRes, hostRes, netRes] = await batchCall<any>([
      { object: "uci", method: "get", params: { config: "dhcp" } },
      { object: "luci-rpc", method: "getDHCPLeases" },
      { object: "luci-rpc", method: "getHostHints" },
      { object: "network.interface", method: "dump" },
    ]);
    uciDhcp = uciRes?.values || {};
    leases4 = leaseRes?.dhcp_leases || [];
    leases6 = leaseRes?.dhcp6_leases || [];
    hosts = hostRes || {};
    interfaces = (netRes?.interface || []).map((i: any) => i.interface);

    if (dnsmasqSec[1]) {
      const s = dnsmasqSec[1];
      dnsmasqForm = {
        authoritative: s.authoritative === "1",
        domain: s.domain ?? "",
        sequential_ip: s.sequential_ip === "1",
        dhcpleasemax: s.dhcpleasemax ?? "",
        address_as_local: s.address_as_local === "1",
        nonwildcard: s.nonwildcard !== "0",
        interface: s.interface ?? "",
        listen_address: s.listen_address ?? "",
        notinterface: s.notinterface ?? "",
        logdhcp: s.logdhcp === "1",
        logfacility: s.logfacility ?? "",
        quietdhcp: s.quietdhcp === "1",
        readethers: s.readethers === "1",
        leasefile: s.leasefile ?? "",
        enable_tftp: s.enable_tftp === "1",
        tftp_root: s.tftp_root ?? "",
        dhcp_boot: s.dhcp_boot ?? "",
      };
    }
    if (odhcpdSec[1]) {
      const s = odhcpdSec[1];
      odhcpdForm = {
        maindhcp: s.maindhcp === "1",
        leasefile: s.leasefile ?? "",
        leasetrigger: s.leasetrigger ?? "",
        hostsdir: s.hostsdir ?? "",
        piodir: s.piodir ?? "",
        loglevel: s.loglevel ?? "",
      };
    }
    loading = false;
  };

  const fmtLeaseTime = (expires: any) => {
    if (expires === false) return trans("unlimited");
    if (expires <= 0) return trans("expired");
    const s = Math.floor(expires);
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
    return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
  };

  const hostHint = (mac: string) => hosts[mac?.toLowerCase()];

  const openEdit = (section: string) => {
    const sec = uciDhcp[section] || {};
    editing = { section, type: sec[".type"] || "host" };
    form = {
      name: sec.name || "",
      mac: Array.isArray(sec.mac) ? sec.mac.join(" ") : sec.mac || "",
      ip: sec.ip || "",
      leasetime: sec.leasetime || "",
      duid: Array.isArray(sec.duid) ? sec.duid.join(" ") : sec.duid || "",
      hostid: sec.hostid || "",
      tag: Array.isArray(sec.tag) ? sec.tag.join(" ") : sec.tag || "",
      match_tag: Array.isArray(sec.match_tag) ? sec.match_tag.join(" ") : sec.match_tag || "",
      instance: sec.instance || "",
      broadcast: sec.broadcast === "1",
      dns: sec.dns === "1",
    };
    editSubTab = "general";
  };

  const closeEdit = () => { editing = null; form = {}; };

  const saveEdit = async () => {
    if (!editing) return;
    const path = editing.section;
    const vals: Record<string, any> = {
      name: form.name || "",
      mac: ltoA(form.mac),
      ip: form.ip || "",
      leasetime: form.leasetime || "",
      duid: ltoA(form.duid),
      hostid: form.hostid || "",
      tag: ltoA(form.tag),
      match_tag: ltoA(form.match_tag),
      instance: form.instance || "",
      broadcast: form.broadcast ? "1" : "",
      dns: form.dns ? "1" : "",
      ".type": editing.type,
    };
    busy = { ...busy, [path]: "save" };
    await call("uci", "set", { config: "dhcp", section: path, values: vals });
    await uciCommit("dhcp");
    await fetchData();
    busy = Object.fromEntries(Object.entries(busy).filter(([k]) => k !== path));
    closeEdit();
  };

  const deleteSection = async (section: string) => {
    busy = { ...busy, [section]: "delete" };
    await call("uci", "set", { config: "dhcp", section, values: { "": "" } });
    await uciCommit("dhcp");
    await fetchData();
    busy = Object.fromEntries(Object.entries(busy).filter(([k]) => k !== section));
  };

  const addHost = async () => {
    addingNew = true;
    newName = "";
    newNameError = "";
  };

  const confirmAdd = async () => {
    if (!newName.trim()) { newNameError = trans("Name is required"); return; }
    if (uciDhcp[newName.trim()]) { newNameError = trans("Name already exists"); return; }
    const name = await uciAdd("dhcp", "host", newName.trim());
    await fetchData();
    addingNew = false;
    openEdit(name);
  };

  const saveDnsmasq = async () => {
    const [name] = dnsmasqSec;
    if (!name) return;
    busy = { ...busy, dnsmasq: "save" };
    const f = dnsmasqForm;
    const vals: Record<string, any> = {
      domain: f.domain || "",
      dhcpleasemax: f.dhcpleasemax || "",
      logfacility: f.logfacility || "",
      leasefile: f.leasefile || "",
      tftp_root: f.tftp_root || "",
      dhcp_boot: f.dhcp_boot || "",
      interface: f.interface || "",
      listen_address: f.listen_address || "",
      notinterface: f.notinterface || "",
      authoritative: f.authoritative ? "1" : "",
      sequential_ip: f.sequential_ip ? "1" : "",
      address_as_local: f.address_as_local ? "1" : "",
      nonwildcard: f.nonwildcard ? "1" : "",
      logdhcp: f.logdhcp ? "1" : "",
      quietdhcp: f.quietdhcp ? "1" : "",
      readethers: f.readethers ? "1" : "",
      enable_tftp: f.enable_tftp ? "1" : "",
    };
    await call("uci", "set", { config: "dhcp", section: name, values: vals });
    await uciCommit("dhcp");
    await fetchData();
    busy = Object.fromEntries(Object.entries(busy).filter(([k]) => k !== "dnsmasq"));
  };

  const saveOdhcpd = async () => {
    let [name] = odhcpdSec;
    if (!name) {
      name = await uciAdd("dhcp", "odhcpd");
    }
    busy = { ...busy, odhcpd: "save" };
    const f = odhcpdForm;
    const vals: Record<string, any> = {
      leasefile: f.leasefile || "",
      leasetrigger: f.leasetrigger || "",
      hostsdir: f.hostsdir || "",
      piodir: f.piodir || "",
      loglevel: f.loglevel || "",
      maindhcp: f.maindhcp ? "1" : "",
    };
    await call("uci", "set", { config: "dhcp", section: name, values: vals });
    await uciCommit("dhcp");
    await fetchData();
    busy = Object.fromEntries(Object.entries(busy).filter(([k]) => k !== "odhcpd"));
  };

  const relaySections = $derived(getSections("relay"));
  let relayForm = $state<Record<string, any>>({});
  let editingRelay: string | null = $state(null);

  const bootSections = $derived(getSections("boot"));
  let bootForm = $state<Record<string, any>>({});
  let editingBoot: string | null = $state(null);

  const tagSections = $derived(getSections("tag"));
  const matchSections = $derived(getSections("match"));
  const vcSections = $derived(getSections("vendorclass"));
  const ucSections = $derived(getSections("userclass"));
  const boot6Sections = $derived(getSections("boot6"));

  const openRelay = (section?: string) => {
    if (section) {
      const s = uciDhcp[section] || {};
      relayForm = { local_addr: s.local_addr || "", server_addr: s.server_addr || "", interface: s.interface || "" };
      editingRelay = section;
    } else {
      relayForm = { local_addr: "", server_addr: "", interface: "" };
      editingRelay = "__new__";
    }
  };
  const saveRelay = async () => {
    if (editingRelay === "__new__") {
      const name = await uciAdd("dhcp", "relay");
      await call("uci", "set", { config: "dhcp", section: name, values: { ...relayForm, ".type": "relay" } });
    } else if (editingRelay) {
      await call("uci", "set", { config: "dhcp", section: editingRelay, values: { ...relayForm, ".type": "relay" } });
    }
    await uciCommit("dhcp");
    await fetchData();
    editingRelay = null;
  };

  const openBoot = (section?: string) => {
    if (section) {
      const s = uciDhcp[section] || {};
      bootForm = { filename: s.filename || "", servername: s.servername || "", serveraddress: s.serveraddress || "",
        dhcp_option: Array.isArray(s.dhcp_option) ? s.dhcp_option.join(" ") : s.dhcp_option || "",
        networkid: s.networkid || "", force: s.force === "1", instance: s.instance ?? "" };
      editingBoot = section;
    } else {
      bootForm = { filename: "", servername: "", serveraddress: "", dhcp_option: "", networkid: "", force: false, instance: "" };
      editingBoot = "__new__";
    }
  };
  const saveBoot = async () => {
    const vals: Record<string, any> = {};
    for (const [k, v] of Object.entries(bootForm)) {
      if (k === "force") { vals.force = v ? "1" : ""; continue; }
      if (v !== "" && v !== undefined && v !== false) vals[k] = v;
    }
    if (editingBoot === "__new__") {
      const name = await uciAdd("dhcp", "boot");
      await call("uci", "set", { config: "dhcp", section: name, values: vals });
    } else if (editingBoot) {
      await call("uci", "set", { config: "dhcp", section: editingBoot, values: vals });
    }
    await uciCommit("dhcp");
    await fetchData();
    editingBoot = null;
  };

  const openTag = async (type: string, section?: string) => {
    const sec = section ? uciDhcp[section] || {} : {};
    const common = (k: string) => {
      if (k === "dhcp_option") return Array.isArray(sec[k]) ? sec[k].join(" ") : sec[k] || "";
      if (k === "force") return sec[k] === "1";
      return sec[k] || "";
    };
    tagForm = { dhcp_option: common("dhcp_option"), force: common("force") };
    tagForm._type = type;
    if (type === "tag") {
      tagForm.name = "";
      editingTag = section ? { section, type } : { section: "__new__", type };
    } else if (type === "match") {
      tagForm.match = common("match");
      tagForm.networkid = common("networkid");
      editingTag = section ? { section, type } : { section: "__new__", type };
    } else if (type === "vendorclass") {
      tagForm.vendorclass = common("vendorclass");
      tagForm.networkid = common("networkid");
      editingTag = section ? { section, type } : { section: "__new__", type };
    } else if (type === "userclass") {
      tagForm.userclass = common("userclass");
      tagForm.networkid = common("networkid");
      editingTag = section ? { section, type } : { section: "__new__", type };
    }
  };

  let tagForm = $state<Record<string, any>>({});
  let editingTag: { section: string; type: string } | null = $state(null);

  const saveTag = async () => {
    const vals: Record<string, any> = {};
    for (const [k, v] of Object.entries(tagForm)) {
      if (k === "_type") continue;
      if (k === "force") { vals.force = v ? "1" : ""; continue; }
      if (v !== "" && v !== undefined && v !== false) vals[k] = v;
    }
    if (!editingTag) return;
    if (editingTag.section === "__new__") {
      const name = await uciAdd("dhcp", editingTag.type);
      await call("uci", "set", { config: "dhcp", section: name, values: vals });
    } else {
      await call("uci", "set", { config: "dhcp", section: editingTag.section, values: vals });
    }
    await uciCommit("dhcp");
    await fetchData();
    editingTag = null;
  };

  const openBoot6 = (section?: string) => {
    const s = section ? uciDhcp[section] || {} : {};
    boot6Form = { url: s.url || "", arch: s.arch ?? "" };
    editingBoot6 = section || "__new__";
  };
  let boot6Form = $state<Record<string, any>>({});
  let editingBoot6: string | null = $state(null);
  const saveBoot6 = async () => {
    const vals: Record<string, any> = {};
    for (const [k, v] of Object.entries(boot6Form)) {
      if (v !== "" && v !== undefined) vals[k] = v;
    }
    if (editingBoot6 === "__new__") {
      const name = await uciAdd("dhcp", "boot6");
      await call("uci", "set", { config: "dhcp", section: name, values: vals });
    } else if (editingBoot6) {
      await call("uci", "set", { config: "dhcp", section: editingBoot6, values: vals });
    }
    await uciCommit("dhcp");
    await fetchData();
    editingBoot6 = null;
  };

  onMount(() => {
    fetchData();
    pollInterval = setInterval(async () => {
      const leaseRes = await call<any>("luci-rpc", "getDHCPLeases");
      if (leaseRes) {
        leases4 = leaseRes.dhcp_leases || [];
        leases6 = leaseRes.dhcp6_leases || [];
      }
    }, 10000);
  });
  onDestroy(() => clearInterval(pollInterval));

  const th = "text-xs font-medium pb-2 px-3 text-left whitespace-nowrap";
  const td = "py-1.5 px-3 text-xs font-mono whitespace-nowrap";
</script>

<div class={cn("p-6", "animate-fade-in")}>
  <h1 class={cn("text-lg", "font-semibold", "text-white")}>{trans("DHCP")}</h1>
  <p class={cn("text-sm", "mt-0.5", "mb-4", "text-muted")}>{trans("DHCP server & lease configuration")}</p>

  <TabBar tabs={mainTabs} active={mainTab} onchange={(id: string) => { mainTab = id as TabId; }} />

  {#if loading}
    <p class={cn("text-xs", "text-muted", "italic", "mt-6", "text-center")}>{trans("Loading...")}</p>
  {:else}

  <!-- ════════ LEASES ════════ -->
  {#if mainTab === "leases"}
    <div class={cn("mt-4", "space-y-8")}>
      <!-- Static Leases -->
      <section>
        <h3 class={cn("text-sm", "font-semibold", "text-white", "mb-3")}>{trans("Static Leases")}</h3>
        <p class={cn("text-xs", "text-muted", "mb-3")}>{trans("Static leases assign fixed IP addresses and symbolic hostnames to DHCP clients.")}</p>
        <div class={cn("flex", "justify-end", "mb-3")}>
          <button onclick={addHost}
            class={cn("flex", "items-center", "gap-1.5", "px-3", "py-1.5", "text-xs", "font-medium", "rounded-lg", "bg-accent", "text-black", "hover:opacity-90", "transition-all", "cursor-pointer")}
          ><Plus size={12} />{trans("Add")}</button>
        </div>
        {#if getSections("host").length === 0}
          <p class={cn("text-xs", "text-muted", "italic", "text-center", "py-4")}>{trans("No static leases defined")}</p>
        {:else}
          <div class={cn("glass", "rounded-xl", "overflow-hidden")}>
            <table class={cn("w-full", "text-xs")}>
              <thead>
                <tr class={cn("text-left", "text-muted", "bg-surface", "border-b", "border-border")}>
                  <th class={th}>{trans("Hostname")}</th>
                  <th class={th}>{trans("MAC Addresses")}</th>
                  <th class={th}>{trans("IPv4 address")}</th>
                  <th class={th}>{trans("Lease time")}</th>
                  <th class={th}>{trans("DUID/IAIDs")}</th>
                  <th class={th}>{trans("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {#each getSections("host") as [name, sec], i}
                  <tr class={cn("border-b", "border-border", "hover:bg-white/[0.04]", i % 2 === 0 && "bg-white/[0.015]")}>
                    <td class={td}>{sec.name || "—"}</td>
                    <td class={td}>{ltoA(sec.mac).join(", ") || "—"}</td>
                    <td class={cn(td, "text-accent")}>{sec.ip || "—"}</td>
                    <td class={td}>{sec.leasetime || "—"}</td>
                    <td class={td}>{ltoA(sec.duid).join(", ").substring(0, 40) || "—"}</td>
                    <td class={td}>
                      <div class={cn("flex", "items-center", "gap-1")}>
                        <button onclick={() => openEdit(name)}
                          class={cn("p-1", "rounded", "text-muted", "hover:text-fg", "hover:bg-white/5", "cursor-pointer")}
                          title={trans("Edit")}><Pencil size={11} /></button>
                        <button onclick={() => deleteSection(name)} disabled={busy[name] !== undefined}
                          class={cn("p-1", "rounded", "text-muted", "hover:text-danger", "hover:bg-danger/5", "disabled:opacity-30", "cursor-pointer")}
                          title={trans("Delete")}><Trash2 size={11} /></button>
                      </div>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </section>

      <!-- Active DHCPv4 Leases -->
      <section>
        <h3 class={cn("text-sm", "font-semibold", "text-white", "mb-3")}>{trans("Active DHCPv4 Leases")}</h3>
        {#if leases4.length === 0}
          <p class={cn("text-xs", "text-muted", "italic", "text-center", "py-4")}>{trans("There are no active leases")}</p>
        {:else}
          <div class={cn("glass", "rounded-xl", "overflow-hidden")}>
            <table class={cn("w-full", "text-xs")}>
              <thead>
                <tr class={cn("text-left", "text-muted", "bg-surface", "border-b", "border-border")}>
                  <th class={th}>{trans("Interface")}</th>
                  <th class={th}>{trans("Hostname")}</th>
                  <th class={th}>{trans("IPv4 address")}</th>
                  <th class={th}>{trans("MAC address")}</th>
                  <th class={th}>{trans("DUID")}</th>
                  <th class={th}>{trans("IAID")}</th>
                  <th class={th}>{trans("Remaining time")}</th>
                </tr>
              </thead>
              <tbody>
                {#each leases4 as l, i}
                  <tr class={cn("border-b", "border-border", "hover:bg-white/[0.04]", i % 2 === 0 && "bg-white/[0.015]")}>
                    <td class={td}>{l.interface || "—"}</td>
                    <td class={td}>{l.hostname || hostHint(l.macaddr)?.name || "—"}</td>
                    <td class={cn(td, "text-accent")}>{l.ipaddr}</td>
                    <td class={td}>{l.macaddr?.toUpperCase() || "—"}</td>
                    <td class={td}>{l.duid || "—"}</td>
                    <td class={td}>{l.iaid || "—"}</td>
                    <td class={td}>{l.expires === undefined ? "—" : fmtLeaseTime(l.expires)}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </section>

      {#if hasDhcpV6}
      <!-- Active DHCPv6 Leases -->
      <section>
        <h3 class={cn("text-sm", "font-semibold", "text-white", "mb-3")}>{trans("Active DHCPv6 Leases")}</h3>
        {#if leases6.length === 0}
          <p class={cn("text-xs", "text-muted", "italic", "text-center", "py-4")}>{trans("There are no active leases")}</p>
        {:else}
          <div class={cn("glass", "rounded-xl", "overflow-hidden")}>
            <table class={cn("w-full", "text-xs")}>
              <thead>
                <tr class={cn("text-left", "text-muted", "bg-surface", "border-b", "border-border")}>
                  <th class={th}>{trans("Hostname")}</th>
                  <th class={th}>{trans("IPv6 addresses")}</th>
                  <th class={th}>{trans("DUID")}</th>
                  <th class={th}>{trans("IAID")}</th>
                  <th class={th}>{trans("Remaining time")}</th>
                </tr>
              </thead>
              <tbody>
                {#each leases6 as l, i}
                  <tr class={cn("border-b", "border-border", "hover:bg-white/[0.04]", i % 2 === 0 && "bg-white/[0.015]")}>
                    <td class={td}>{l.hostname || hostHint(l.macaddr)?.name || "—"}</td>
                    <td class={cn(td, "text-accent")}>{(l.ip6addrs || [l.ip6addr]).filter(Boolean).join("<br />")}</td>
                    <td class={td}>{l.duid || "—"}</td>
                    <td class={td}>{l.iaid || "—"}</td>
                    <td class={td}>{l.expires === undefined ? "—" : fmtLeaseTime(l.expires)}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </section>
      {/if}
    </div>

  <!-- ════════ DNSMASQ ════════ -->
  {:else if mainTab === "dnsmasq"}
    <div class={cn("mt-4")}>
      <TabBar tabs={dnsmasqTabs} active={dnsmasqTab} onchange={(id: string) => { dnsmasqTab = id as DnsmasqTab; }} />
      <div class={cn("mt-4", "glass", "rounded-xl", "p-5", "space-y-5")}>
        {#if dnsmasqTab === "general"}
          <Toggle label={trans("Authoritative")} description={trans("This is the only DHCP server in the local network.")} bind:checked={dnsmasqForm.authoritative} />

          <Input label={trans("Local domain")} bind:value={dnsmasqForm.domain} placeholder="lan"
            description={trans("Local domain suffix appended to DHCP names.")} />

          <Toggle label={trans("Allocate IPs sequentially")} description={trans("Allocate IP addresses sequentially, starting from the lowest available address.")} bind:checked={dnsmasqForm.sequential_ip} />

          <Input label={trans("Max. DHCP leases")} bind:value={dnsmasqForm.dhcpleasemax} placeholder="150"
            description={trans("Maximum allowed number of active DHCP leases.")} />

          <Toggle label={trans("Resolve addresses locally")} description={trans("Never send queries for FQDNs in the Address option to an upstream resolver.")} bind:checked={dnsmasqForm.address_as_local} />

        {:else if dnsmasqTab === "devices"}
          <Toggle label={trans("Non-wildcard")} description={trans("Bind only to configured interface addresses.")} bind:checked={dnsmasqForm.nonwildcard} />

          <Input label={trans("Listen interfaces")} bind:value={dnsmasqForm.interface} placeholder={trans("(all)")}
            description={trans("Listen only on the specified interfaces.")} />
          <Input label={trans("Listen addresses")} bind:value={dnsmasqForm.listen_address} placeholder="0.0.0.0"
            description={trans("Listen only on the specified addresses.")} />
          <Input label={trans("Exclude interfaces")} bind:value={dnsmasqForm.notinterface}
            description={trans("Do not listen on the specified interfaces.")} />

        {:else if dnsmasqTab === "logging"}
          <Toggle label={trans("Extra DHCP logging")} description={trans("Log all options sent to DHCP clients.")} bind:checked={dnsmasqForm.logdhcp} />

          <Select label={trans("Log facility")} bind:value={dnsmasqForm.logfacility}
            options={[
              ...["KERN","USER","MAIL","DAEMON","AUTH","LPR","NEWS","UUCP","CRON","LOCAL0","LOCAL1","LOCAL2","LOCAL3","LOCAL4","LOCAL5","LOCAL6","LOCAL7"].map(v => ({ value: v, label: v })),
              { value: "-", label: "stderr" },
            ]} placeholder={trans("Select...")} />

          <Toggle label={trans("Suppress logging")} description={trans("Suppress logging of routine DHCP operations.")} bind:checked={dnsmasqForm.quietdhcp} />

        {:else if dnsmasqTab === "files"}
          <Toggle label={trans("Use /etc/ethers")} description={trans("Read /etc/ethers to configure the DHCP server.")} bind:checked={dnsmasqForm.readethers} />
          <Input label={trans("Lease file")} bind:value={dnsmasqForm.leasefile} placeholder="/tmp/dhcp.leases"
            description={trans("File to store DHCP lease information.")} />

        {:else if dnsmasqTab === "relay"}
          <p class={cn("text-xs", "text-muted", "mb-3")}>{trans("Relay DHCP requests elsewhere.")}</p>
          {#if relaySections.length === 0}
            <p class={cn("text-xs", "text-muted", "italic", "text-center", "py-2")}>{trans("No relay entries")}</p>
          {:else}
            <div class={cn("glass", "rounded-xl", "overflow-hidden", "mb-3")}>
              <table class={cn("w-full", "text-xs")}>
                <thead><tr class={cn("text-left", "text-muted", "bg-surface", "border-b", "border-border")}>
                  <th class={th}>{trans("Relay from")}</th><th class={th}>{trans("Relay to address")}</th><th class={th}>{trans("Interface")}</th><th class={th}>{trans("Actions")}</th>
                </tr></thead>
                <tbody>
                  {#each relaySections as [name, sec], i}
                    <tr class={cn("border-b", "border-border", "hover:bg-white/[0.04]", i % 2 === 0 && "bg-white/[0.015]")}>
                      <td class={td}>{sec.local_addr || "—"}</td>
                      <td class={td}>{sec.server_addr || "—"}</td>
                      <td class={td}>{sec.interface || "—"}</td>
                      <td class={td}>
                        <button onclick={() => openRelay(name)}
                          class={cn("p-1", "rounded", "text-muted", "hover:text-fg", "cursor-pointer")}
                          title={trans("Edit")}><Pencil size={11} /></button>
                        <button onclick={() => deleteSection(name)}
                          class={cn("p-1", "rounded", "text-muted", "hover:text-danger", "cursor-pointer")}
                          title={trans("Delete")}><Trash2 size={11} /></button>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
          <button onclick={() => openRelay()}
            class={cn("flex", "items-center", "gap-1", "text-xs", "text-accent", "hover:underline", "cursor-pointer")}
          ><Plus size={11} />{trans("Add relay entry")}</button>

        {:else if dnsmasqTab === "pxe"}
          <div class={cn("space-y-4")}>
            <Toggle label={trans("Enable TFTP server")} description={trans("Enable the built-in single-instance TFTP server.")} bind:checked={dnsmasqForm.enable_tftp} />
            <Input label={trans("TFTP server root")} bind:value={dnsmasqForm.tftp_root} placeholder="/"
              description={trans("Root directory for files served via TFTP.")} />
            <Input label={trans("Network boot image")} bind:value={dnsmasqForm.dhcp_boot} placeholder="pxelinux.0"
              description={trans("Filename of the boot image advertised to clients.")} />

            <SectionHeader title={trans("PXE Boot Options")} open={true}>
              {#if bootSections.length === 0}
                <p class={cn("text-xs", "text-muted", "italic", "py-2")}>{trans("No boot options")}</p>
              {:else}
                <div class={cn("glass", "rounded-xl", "overflow-hidden")}>
                  <table class={cn("w-full", "text-xs")}>
                  <thead><tr class={cn("text-left", "text-muted", "bg-surface", "border-b", "border-border")}>
                    <th class={th}>{trans("Filename")}</th><th class={th}>{trans("Server name")}</th><th class={th}>{trans("Server address")}</th><th class={th}>{trans("Actions")}</th>
                  </tr></thead>
                  <tbody>
                    {#each bootSections as [name, sec], i}
                      <tr class={cn("border-b", "border-border", "hover:bg-white/[0.04]", i % 2 === 0 && "bg-white/[0.015]")}>
                          <td class={td}>{sec.filename || "—"}</td>
                          <td class={td}>{sec.servername || "—"}</td>
                          <td class={td}>{sec.serveraddress || "—"}</td>
                          <td class={td}>
                            <button onclick={() => openBoot(name)}
                              class={cn("p-1", "rounded", "text-muted", "hover:text-fg", "cursor-pointer")}
                              title={trans("Edit")}><Pencil size={11} /></button>
                            <button onclick={() => deleteSection(name)}
                              class={cn("p-1", "rounded", "text-muted", "hover:text-danger", "cursor-pointer")}
                              title={trans("Delete")}><Trash2 size={11} /></button>
                          </td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              {/if}
              <button onclick={() => openBoot()}
                class={cn("flex", "items-center", "gap-1", "text-xs", "text-accent", "hover:underline", "mt-2", "cursor-pointer")}
              ><Plus size={11} />{trans("Add boot option")}</button>
            </SectionHeader>
          </div>

        {:else if dnsmasqTab === "tags"}
          <TabBar tabs={tagsTabs} active={tagsTab} onchange={(id: string) => { tagsTab = id as TagsTab; }} />
          <div class={cn("mt-3")}>
            {#if tagsTab === "matchtags"}
              <p class={cn("text-xs", "text-muted", "mb-3")}>{trans("Tags filter which options apply to which hosts.")}</p>
              <div class={cn("flex", "justify-end", "mb-2")}>
                <button onclick={() => openTag("tag")}
                  class={cn("flex", "items-center", "gap-1", "px-2", "py-1", "text-xs", "rounded", "bg-accent", "text-black", "cursor-pointer")}
                ><Plus size={11} />{trans("Add tag")}</button>
              </div>
              {#if tagSections.length === 0}
                <p class={cn("text-xs", "text-muted", "italic", "text-center", "py-2")}>{trans("No tags defined")}</p>
              {:else}
                {#each tagSections as [name, sec]}
                  <div class={cn("flex", "items-center", "justify-between", "py-1.5", "border-b", "border-border")}>
                    <span class={cn("text-xs", "font-mono", "text-accent")}>{name}</span>
                    <div class={cn("flex", "gap-1")}>
                      <button onclick={() => openTag("tag", name)}
                        class={cn("p-1", "rounded", "text-muted", "hover:text-fg", "cursor-pointer")}
                        title={trans("Edit")}><Pencil size={10} /></button>
                      <button onclick={() => deleteSection(name)}
                        class={cn("p-1", "rounded", "text-muted", "hover:text-danger", "cursor-pointer")}
                        title={trans("Delete")}><Trash2 size={10} /></button>
                    </div>
                  </div>
                {/each}
              {/if}
            {:else if tagsTab === "settags"}
              <p class={cn("text-xs", "text-muted", "mb-3")}>{trans("Match client options to set tags.")}</p>
              <div class={cn("flex", "justify-end", "mb-2")}>
                <button onclick={() => openTag("match")}
                  class={cn("flex", "items-center", "gap-1", "px-2", "py-1", "text-xs", "rounded", "bg-accent", "text-black", "cursor-pointer")}
                ><Plus size={11} />{trans("Add match")}</button>
              </div>
              {#if matchSections.length === 0}
                <p class={cn("text-xs", "text-muted", "italic", "text-center", "py-2")}>{trans("No matches defined")}</p>
              {:else}
                <div class={cn("glass", "rounded-xl", "overflow-hidden")}>
                  <table class={cn("w-full", "text-xs")}>
                    <thead><tr class={cn("text-left", "text-muted", "bg-surface", "border-b", "border-border")}>
                      <th class={th}>{trans("Match")}</th><th class={th}>{trans("Set Tag")}</th><th class={th}>{trans("Actions")}</th>
                    </tr></thead>
                    <tbody>
                      {#each matchSections as [name, sec], i}
                        <tr class={cn("border-b", "border-border", "hover:bg-white/[0.04]", i % 2 === 0 && "bg-white/[0.015]")}>
                          <td class={td}>{sec.match || "—"}</td>
                          <td class={td}>{sec.networkid || "—"}</td>
                          <td class={td}>
                            <button onclick={() => openTag("match", name)}
                              class={cn("p-1", "rounded", "text-muted", "hover:text-fg", "cursor-pointer")}
                              title={trans("Edit")}><Pencil size={11} /></button>
                            <button onclick={() => deleteSection(name)}
                              class={cn("p-1", "rounded", "text-muted", "hover:text-danger", "cursor-pointer")}
                              title={trans("Delete")}><Trash2 size={11} /></button>
                          </td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              {/if}
            {:else if tagsTab === "vc"}
              <p class={cn("text-xs", "text-muted", "mb-3")}>{trans("Match Vendor Class strings to set tags.")}</p>
              <div class={cn("flex", "justify-end", "mb-2")}>
                <button onclick={() => openTag("vendorclass")}
                  class={cn("flex", "items-center", "gap-1", "px-2", "py-1", "text-xs", "rounded", "bg-accent", "text-black", "cursor-pointer")}
                ><Plus size={11} />{trans("Add VC")}</button>
              </div>
              {#if vcSections.length === 0}
                <p class={cn("text-xs", "text-muted", "italic", "text-center", "py-2")}>{trans("No VC entries")}</p>
              {:else}
                <div class={cn("glass", "rounded-xl", "overflow-hidden")}>
                  <table class={cn("w-full", "text-xs")}>
                    <thead><tr class={cn("text-left", "text-muted", "bg-surface", "border-b", "border-border")}>
                      <th class={th}>{trans("Vendor Class")}</th><th class={th}>{trans("Set Tag")}</th><th class={th}>{trans("Actions")}</th>
                    </tr></thead>
                    <tbody>
                      {#each vcSections as [name, sec], i}
                        <tr class={cn("border-b", "border-border", "hover:bg-white/[0.04]", i % 2 === 0 && "bg-white/[0.015]")}>
                          <td class={td}>{sec.vendorclass || "—"}</td>
                          <td class={td}>{sec.networkid || "—"}</td>
                          <td class={td}>
                            <button onclick={() => openTag("vendorclass", name)}
                              class={cn("p-1", "rounded", "text-muted", "hover:text-fg", "cursor-pointer")}
                              title={trans("Edit")}><Pencil size={11} /></button>
                            <button onclick={() => deleteSection(name)}
                              class={cn("p-1", "rounded", "text-muted", "hover:text-danger", "cursor-pointer")}
                              title={trans("Delete")}><Trash2 size={11} /></button>
                          </td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              {/if}
            {:else if tagsTab === "uc"}
              <p class={cn("text-xs", "text-muted", "mb-3")}>{trans("Match User Class strings to set tags.")}</p>
              <div class={cn("flex", "justify-end", "mb-2")}>
                <button onclick={() => openTag("userclass")}
                  class={cn("flex", "items-center", "gap-1", "px-2", "py-1", "text-xs", "rounded", "bg-accent", "text-black", "cursor-pointer")}
                ><Plus size={11} />{trans("Add UC")}</button>
              </div>
              {#if ucSections.length === 0}
                <p class={cn("text-xs", "text-muted", "italic", "text-center", "py-2")}>{trans("No UC entries")}</p>
              {:else}
                <div class={cn("glass", "rounded-xl", "overflow-hidden")}>
                  <table class={cn("w-full", "text-xs")}>
                    <thead><tr class={cn("text-left", "text-muted", "bg-surface", "border-b", "border-border")}>
                      <th class={th}>{trans("User Class")}</th><th class={th}>{trans("Set Tag")}</th><th class={th}>{trans("Actions")}</th>
                    </tr></thead>
                    <tbody>
                      {#each ucSections as [name, sec], i}
                        <tr class={cn("border-b", "border-border", "hover:bg-white/[0.04]", i % 2 === 0 && "bg-white/[0.015]")}>
                          <td class={td}>{sec.userclass || "—"}</td>
                          <td class={td}>{sec.networkid || "—"}</td>
                          <td class={td}>
                            <button onclick={() => openTag("userclass", name)}
                              class={cn("p-1", "rounded", "text-muted", "hover:text-fg", "cursor-pointer")}
                              title={trans("Edit")}><Pencil size={11} /></button>
                            <button onclick={() => deleteSection(name)}
                              class={cn("p-1", "rounded", "text-muted", "hover:text-danger", "cursor-pointer")}
                              title={trans("Delete")}><Trash2 size={11} /></button>
                          </td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              {/if}
            {/if}
          </div>
        {/if}

        {#if dnsmasqTab !== "relay" && dnsmasqTab !== "pxe" && dnsmasqTab !== "tags"}
          <div class={cn("flex", "justify-end", "pt-2")}>
            <button onclick={saveDnsmasq} disabled={busy.dnsmasq !== undefined}
              class={cn("flex", "items-center", "gap-1.5", "px-3", "py-1.5", "text-xs", "font-medium", "rounded-lg", "bg-accent", "text-black", "hover:opacity-90", "disabled:opacity-50", "transition-all", "cursor-pointer")}
            ><Save size={12} />{trans("Save")}</button>
          </div>
        {/if}
      </div>
    </div>

  <!-- ════════ ODHPCD ════════ -->
  {:else if mainTab === "odhcpd"}
    <div class={cn("mt-4")}>
      <TabBar tabs={odhcpdTabs} active={odhcpdTab} onchange={(id: string) => { odhcpdTab = id as OdhcpdTab; }} />
      <div class={cn("mt-4", "glass", "rounded-xl", "p-5", "space-y-5")}>
        {#if odhcpdTab === "general"}
          <Toggle label={trans("DHCPv4")} description={trans("Use odhcp for DHCPv4. This will disable DHCPv4 support in dnsmasq.")} bind:checked={odhcpdForm.maindhcp} />
          <Input label={trans("Lease file")} bind:value={odhcpdForm.leasefile} placeholder="/tmp/odhcpd.leases" />
          <Input label={trans("Lease trigger")} bind:value={odhcpdForm.leasetrigger} description={trans("Path to a script to run each time the lease file changes.")} />
          <Input label={trans("Hosts file")} bind:value={odhcpdForm.hostsdir} description={trans("Directory to store hosts files.")} />
          <Input label={trans("PIO directory")} bind:value={odhcpdForm.piodir} description={trans("Directory to store IPv6 prefix information files.")} />
          <Select label={trans("Log level")} bind:value={odhcpdForm.loglevel}
            options={[["0","Emergency"],["1","Alert"],["2","Critical"],["3","Error"],["4","Warning"],["5","Notice"],["6","Info"],["7","Debug"]].map(([v,l]) => ({value:v,label:l}))}
            placeholder={trans("Select...")} />

        {:else if odhcpdTab === "pxe6"}
          <p class={cn("text-xs", "text-muted", "mb-3")}>{trans("PXE over IPv6 boot options.")}</p>
          <div class={cn("flex", "justify-end", "mb-2")}>
            <button onclick={() => openBoot6()}
              class={cn("flex", "items-center", "gap-1", "px-2", "py-1", "text-xs", "rounded", "bg-accent", "text-black", "cursor-pointer")}
            ><Plus size={11} />{trans("Add boot entry")}</button>
          </div>
          {#if boot6Sections.length === 0}
            <p class={cn("text-xs", "text-muted", "italic", "text-center", "py-2")}>{trans("No boot options")}</p>
          {:else}
            <div class={cn("glass", "rounded-xl", "overflow-hidden")}>
              <table class={cn("w-full", "text-xs")}>
                <thead><tr class={cn("text-left", "text-muted", "bg-surface", "border-b", "border-border")}>
                  <th class={th}>{trans("URL")}</th><th class={th}>{trans("Architecture")}</th><th class={th}>{trans("Actions")}</th>
                </tr></thead>
                <tbody>
                  {#each boot6Sections as [name, sec], i}
                    <tr class={cn("border-b", "border-border", "hover:bg-white/[0.04]", i % 2 === 0 && "bg-white/[0.015]")}>
                      <td class={cn(td, "font-mono")}>{sec.url || "—"}</td>
                      <td class={td}>{sec.arch || trans("(default)")}</td>
                      <td class={td}>
                        <button onclick={() => openBoot6(name)}
                          class={cn("p-1", "rounded", "text-muted", "hover:text-fg", "cursor-pointer")}
                          title={trans("Edit")}><Pencil size={11} /></button>
                        <button onclick={() => deleteSection(name)}
                          class={cn("p-1", "rounded", "text-muted", "hover:text-danger", "cursor-pointer")}
                          title={trans("Delete")}><Trash2 size={11} /></button>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        {/if}

        {#if odhcpdTab === "general"}
          <div class={cn("flex", "justify-end", "pt-2")}>
            <button onclick={saveOdhcpd} disabled={busy.odhcpd !== undefined}
              class={cn("flex", "items-center", "gap-1.5", "px-3", "py-1.5", "text-xs", "font-medium", "rounded-lg", "bg-accent", "text-black", "hover:opacity-90", "disabled:opacity-50", "transition-all", "cursor-pointer")}
            ><Save size={12} />{trans("Save")}</button>
          </div>
        {/if}
      </div>
    </div>
  {/if}
{/if}
</div>

<!-- ════════ NEW HOST MODAL ════════ -->
{#if addingNew}
  <div class={cn("fixed", "inset-0", "z-50", "flex", "items-start", "justify-center", "pt-24")} onclick={() => { addingNew = false; }} role="dialog" aria-modal="true">
    <div class={cn("absolute", "inset-0", "bg-black/60", "backdrop-blur-sm")} />
    <div onclick={(e: MouseEvent) => e.stopPropagation()} class={cn("relative", "w-full", "max-w-sm", "glass", "rounded-xl", "p-5", "animate-fade-in", "shadow-2xl")}>
      <div class={cn("flex", "items-center", "justify-between", "mb-4")}>
        <h2 class={cn("text-sm", "font-semibold", "text-white")}>{trans("Add static lease")}</h2>
        <button onclick={() => { addingNew = false; }} class={cn("p-1", "rounded", "text-muted", "hover:text-fg", "cursor-pointer")}><X size={14} /></button>
      </div>
      <div class={cn("flex", "flex-col", "gap-1", "mb-3")}>
        <label class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>{trans("Name")}</label>
        <input type="text" bind:value={newName} placeholder="myhost"
          class={cn("w-full", "px-2.5", "py-1.5", "text-xs", "rounded-lg", "bg-surface-2", "border", newNameError ? "border-danger" : "border-border", "text-fg", "font-mono", "outline-none", "focus:border-accent")} />
        {#if newNameError}<p class={cn("text-[10px]", "text-danger")}>{newNameError}</p>{/if}
      </div>
      <div class={cn("flex", "justify-end", "gap-2")}>
        <button onclick={() => { addingNew = false; }}
          class={cn("px-3", "py-1.5", "text-xs", "rounded-lg", "bg-surface-2", "border", "border-border", "text-muted", "cursor-pointer")}>{trans("Cancel")}</button>
        <button onclick={confirmAdd}
          class={cn("px-3", "py-1.5", "text-xs", "rounded-lg", "bg-accent", "text-black", "cursor-pointer")}>{trans("Add")}</button>
      </div>
    </div>
  </div>
{/if}

<!-- ════════ EDIT HOST MODAL ════════ -->
{#if editing}
  <div class={cn("fixed", "inset-0", "z-50", "flex", "items-start", "justify-center", "pt-12")} onclick={closeEdit} role="dialog" aria-modal="true">
    <div class={cn("absolute", "inset-0", "bg-black/60", "backdrop-blur-sm")} />
    <div onclick={(e: MouseEvent) => e.stopPropagation()} class={cn("relative", "w-full", "max-w-lg", "max-h-[85vh]", "overflow-y-auto", "glass", "rounded-xl", "p-5", "animate-fade-in", "shadow-2xl")}>
      <div class={cn("flex", "items-center", "justify-between", "mb-4")}>
        <h2 class={cn("text-sm", "font-semibold", "text-white")}>{trans("Edit static lease")}: <span class={cn("font-mono", "text-accent")}>{editing.section}</span></h2>
        <button onclick={closeEdit} class={cn("p-1", "rounded", "text-muted", "hover:text-fg", "cursor-pointer")}><X size={14} /></button>
      </div>
      <div class={cn("space-y-4")}>
        <Input label={trans("Hostname")} bind:value={form.name} placeholder="myhost"
          description={trans("The hostname for this host (optional).")} />
        <Input label={trans("MAC Addresses")} bind:value={form.mac} placeholder="xx:xx:xx:xx:xx:xx"
          description={trans("MAC address(es) of this host. Separate multiple with spaces.")} />
        <Input label={trans("IPv4 address")} bind:value={form.ip} placeholder="192.168.1.100"
          description={trans("The IPv4 address for this host, or 'ignore' to ignore DHCP requests.")} />

        <Select label={trans("Lease time")} bind:value={form.leasetime}
          options={[
            {value:"", label:trans("(default)")},
            {value:"5m", label:"5m (5 minutes)"},
            {value:"3h", label:"3h (3 hours)"},
            {value:"12h", label:"12h (12 hours - default)"},
            {value:"7d", label:"7d (7 days)"},
            {value:"infinite", label:trans("infinite")},
          ]} placeholder={trans("Select...")} />

        <Input label={trans("DUID/IAIDs")} bind:value={form.duid} placeholder="00:01:00:01:..."
          description={trans("DHCPv6 DUIDs and optional IAIDs. Separate multiple with spaces.")} />
        <Input label={trans("IPv6 Token")} bind:value={form.hostid} placeholder="::1"
          description={trans("The hexadecimal IPv6 token for this host.")} />
        <Input label={trans("Set Tag")} bind:value={form.tag}
          description={trans("Additional tags for this host.")} />
        <Input label={trans("Match Tag")} bind:value={form.match_tag}
          description={trans("Tags to match for this host.")} />
        <Input label={trans("Instance")} bind:value={form.instance}
          description={trans("Dnsmasq instance to bind to.")} />
        <Toggle label={trans("Broadcast")} bind:checked={form.broadcast} />
        <Toggle label={trans("Forward/reverse DNS")} description={trans("Add static forward and reverse DNS entries for this host.")} bind:checked={form.dns} />
      </div>
      <div class={cn("flex", "justify-end", "gap-2", "mt-5")}>
        <button onclick={closeEdit}
          class={cn("px-3", "py-1.5", "text-xs", "rounded-lg", "bg-surface-2", "border", "border-border", "text-muted", "hover:text-fg", "cursor-pointer")}>{trans("Cancel")}</button>
        <button onclick={saveEdit} disabled={busy[editing.section] !== undefined}
          class={cn("flex", "items-center", "gap-1.5", "px-3", "py-1.5", "text-xs", "rounded-lg", "bg-accent", "text-black", "hover:opacity-90", "disabled:opacity-50", "cursor-pointer")}
        ><Save size={12} />{trans("Save")}</button>
      </div>
    </div>
  </div>
{/if}

<!-- ════════ RELAY MODAL ════════ -->
{#if editingRelay}
  <div class={cn("fixed", "inset-0", "z-50", "flex", "items-start", "justify-center", "pt-24")} onclick={() => { editingRelay = null; }} role="dialog" aria-modal="true">
    <div class={cn("absolute", "inset-0", "bg-black/60", "backdrop-blur-sm")} />
    <div onclick={(e: MouseEvent) => e.stopPropagation()} class={cn("relative", "w-full", "max-w-md", "glass", "rounded-xl", "p-5", "animate-fade-in", "shadow-2xl")}>
      <h2 class={cn("text-sm", "font-semibold", "text-white", "mb-4")}>{trans("Edit relay entry")}</h2>
      <div class={cn("space-y-4")}>
        <Input label={trans("Relay from")} bind:value={relayForm.local_addr} placeholder="192.168.1.1" />
        <Input label={trans("Relay to address")} bind:value={relayForm.server_addr} placeholder="192.168.10.1#535" />
        <Input label={trans("Only accept replies via")} bind:value={relayForm.interface} placeholder="lan" />
      </div>
      <div class={cn("flex", "justify-end", "gap-2", "mt-4")}>
        <button onclick={() => { editingRelay = null; }}
          class={cn("px-3", "py-1.5", "text-xs", "rounded-lg", "bg-surface-2", "border", "border-border", "text-muted", "cursor-pointer")}>{trans("Cancel")}</button>
        <button onclick={saveRelay}
          class={cn("px-3", "py-1.5", "text-xs", "rounded-lg", "bg-accent", "text-black", "cursor-pointer")}><Save size={12} />{trans("Save")}</button>
      </div>
    </div>
  </div>
{/if}

<!-- ════════ BOOT MODAL ════════ -->
{#if editingBoot}
  <div class={cn("fixed", "inset-0", "z-50", "flex", "items-start", "justify-center", "pt-24")} onclick={() => { editingBoot = null; }} role="dialog" aria-modal="true">
    <div class={cn("absolute", "inset-0", "bg-black/60", "backdrop-blur-sm")} />
    <div onclick={(e: MouseEvent) => e.stopPropagation()} class={cn("relative", "w-full", "max-w-md", "glass", "rounded-xl", "p-5", "animate-fade-in", "shadow-2xl")}>
      <h2 class={cn("text-sm", "font-semibold", "text-white", "mb-4")}>{trans("Edit PXE/TFTP/BOOTP Host")}</h2>
      <div class={cn("space-y-4")}>
        <Input label={trans("Filename")} bind:value={bootForm.filename} placeholder="pxelinux.0" />
        <Input label={trans("Server name")} bind:value={bootForm.servername} placeholder="myNAS" />
        <Input label={trans("Server address")} bind:value={bootForm.serveraddress} placeholder="192.168.1.2" />
        <Input label={trans("DHCP Options")} bind:value={bootForm.dhcp_option} placeholder="option:root-path,192.168.1.2:/data"
          description={trans("Additional options to send.")} />
        <Input label={trans("Match this Tag")} bind:value={bootForm.networkid} />
        <Toggle label={trans("Force")} bind:checked={bootForm.force} />
        <Input label={trans("Instance")} bind:value={bootForm.instance} />
      </div>
      <div class={cn("flex", "justify-end", "gap-2", "mt-4")}>
        <button onclick={() => { editingBoot = null; }}
          class={cn("px-3", "py-1.5", "text-xs", "rounded-lg", "bg-surface-2", "border", "border-border", "text-muted", "cursor-pointer")}>{trans("Cancel")}</button>
        <button onclick={saveBoot}
          class={cn("px-3", "py-1.5", "text-xs", "rounded-lg", "bg-accent", "text-black", "cursor-pointer")}><Save size={12} />{trans("Save")}</button>
      </div>
    </div>
  </div>
{/if}

<!-- ════════ TAG MODAL ════════ -->
{#if editingTag}
  <div class={cn("fixed", "inset-0", "z-50", "flex", "items-start", "justify-center", "pt-24")} onclick={() => { editingTag = null; }} role="dialog" aria-modal="true">
    <div class={cn("absolute", "inset-0", "bg-black/60", "backdrop-blur-sm")} />
    <div onclick={(e: MouseEvent) => e.stopPropagation()} class={cn("relative", "w-full", "max-w-md", "glass", "rounded-xl", "p-5", "animate-fade-in", "shadow-2xl")}>
      <h2 class={cn("text-sm", "font-semibold", "text-white", "mb-4")}>
        {editingTag.type === "tag" ? trans("Edit tag") :
         editingTag.type === "match" ? trans("Edit Match") :
         editingTag.type === "vendorclass" ? trans("Edit VC") : trans("Edit UC")}
      </h2>
      <div class={cn("space-y-4")}>
        {#if editingTag.type === "tag"}
          <Input label={trans("Name")} bind:value={tagForm.name} placeholder={trans("tag name")} />
        {:else if editingTag.type === "match"}
          <Input label={trans("Match this client option(+value)")} bind:value={tagForm.match} placeholder="61,8c:80:90:01:02:03" />
          <Input label={trans("In order to Set this Tag")} bind:value={tagForm.networkid} />
        {:else if editingTag.type === "vendorclass"}
          <Input label={trans("Match this Vendor Class")} bind:value={tagForm.vendorclass} />
          <Input label={trans("In order to set this Tag")} bind:value={tagForm.networkid} />
        {:else if editingTag.type === "userclass"}
          <Input label={trans("Match this User Class")} bind:value={tagForm.userclass} />
          <Input label={trans("In order to set this Tag")} bind:value={tagForm.networkid} />
        {/if}
        {#if editingTag.type !== "tag"}
          <Input label={trans("DHCP Options")} bind:value={tagForm.dhcp_option} placeholder="3,192.168.10.1"
            description={trans("Options to be added for this tag.")} />
          <Toggle label={trans("Force")} bind:checked={tagForm.force} />
        {/if}
      </div>
      <div class={cn("flex", "justify-end", "gap-2", "mt-4")}>
        <button onclick={() => { editingTag = null; }}
          class={cn("px-3", "py-1.5", "text-xs", "rounded-lg", "bg-surface-2", "border", "border-border", "text-muted", "cursor-pointer")}>{trans("Cancel")}</button>
        <button onclick={saveTag}
          class={cn("px-3", "py-1.5", "text-xs", "rounded-lg", "bg-accent", "text-black", "cursor-pointer")}><Save size={12} />{trans("Save")}</button>
      </div>
    </div>
  </div>
{/if}

<!-- ════════ BOOT6 MODAL ════════ -->
{#if editingBoot6}
  <div class={cn("fixed", "inset-0", "z-50", "flex", "items-start", "justify-center", "pt-24")} onclick={() => { editingBoot6 = null; }} role="dialog" aria-modal="true">
    <div class={cn("absolute", "inset-0", "bg-black/60", "backdrop-blur-sm")} />
    <div onclick={(e: MouseEvent) => e.stopPropagation()} class={cn("relative", "w-full", "max-w-md", "glass", "rounded-xl", "p-5", "animate-fade-in", "shadow-2xl")}>
      <h2 class={cn("text-sm", "font-semibold", "text-white", "mb-4")}>{trans("Edit PXE over IPv6 boot entry")}</h2>
      <div class={cn("space-y-4")}>
        <Input label={trans("URL")} bind:value={boot6Form.url} placeholder="tftp://[fd11::1]/pxe.efi" />
        <Select label={trans("Architecture")} bind:value={boot6Form.arch}
          options={[
            {value:"", label:trans("(default)")},
            {value:"0", label:"00: x86 BIOS"},
            {value:"6", label:"06: x86 UEFI (IA32)"},
            {value:"7", label:"07: x64 UEFI"},
            {value:"10", label:"10: ARM 32-bit UEFI"},
            {value:"11", label:"11: ARM 64-bit UEFI"},
            {value:"15", label:"15: x86 UEFI boot from HTTP"},
            {value:"16", label:"16: x64 UEFI boot from HTTP"},
            {value:"17", label:"17: ebc boot from HTTP"},
            {value:"18", label:"18: ARM UEFI 32 boot from HTTP"},
            {value:"19", label:"19: ARM UEFI 64 boot from HTTP"},
            {value:"20", label:"20: pc/at bios boot from HTTP"},
            {value:"21", label:"21: ARM 32 uboot"},
            {value:"22", label:"22: ARM 64 uboot"},
            {value:"23", label:"23: ARM uboot 32 boot from HTTP"},
            {value:"24", label:"24: ARM uboot 64 boot from HTTP"},
            {value:"25", label:"25: RISC-V 32-bit UEFI"},
            {value:"26", label:"26: RISC-V 32-bit UEFI boot from HTTP"},
            {value:"27", label:"27: RISC-V 64-bit UEFI"},
            {value:"28", label:"28: RISC-V 64-bit UEFI boot from HTTP"},
            {value:"29", label:"29: RISC-V 128-bit UEFI"},
            {value:"30", label:"30: RISC-V 128-bit UEFI boot from HTTP"},
            {value:"31", label:"31: s390 Basic"},
            {value:"32", label:"32: s390 Extended"},
            {value:"33", label:"33: MIPS 32-bit UEFI"},
            {value:"34", label:"34: MIPS 64-bit UEFI"},
            {value:"35", label:"35: Sunway 32-bit UEFI"},
            {value:"36", label:"36: Sunway 64-bit UEFI"},
            {value:"37", label:"37: LoongArch 32-bit UEFI"},
            {value:"38", label:"38: LoongArch 32-bit UEFI boot from HTTP"},
            {value:"39", label:"39: LoongArch 64-bit UEFI"},
            {value:"40", label:"40: LoongArch 64-bit UEFI boot from HTTP"},
            {value:"41", label:"41: ARM rpiboot"},
          ]} placeholder={trans("Select...")} />
      </div>
      <div class={cn("flex", "justify-end", "gap-2", "mt-4")}>
        <button onclick={() => { editingBoot6 = null; }}
          class={cn("px-3", "py-1.5", "text-xs", "rounded-lg", "bg-surface-2", "border", "border-border", "text-muted", "cursor-pointer")}>{trans("Cancel")}</button>
        <button onclick={saveBoot6}
          class={cn("px-3", "py-1.5", "text-xs", "rounded-lg", "bg-accent", "text-black", "cursor-pointer")}><Save size={12} />{trans("Save")}</button>
      </div>
    </div>
  </div>
{/if}




