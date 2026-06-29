<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { Save } from "@lucide/svelte";

  import { batchCall, uciAdd, uciCommit, call } from "../../../api/ubus";
  import { cn } from "../../../helpers/classname";
  import { t as _t, getLocale, onLocaleChange } from "../../../i18n";
  import TabBar from "../../../components/TabBar/TabBar.svelte";

  import LeasesPanel from "./LeasesPanel.svelte";
  import DnsmasqGeneral from "./DnsmasqGeneral.svelte";
  import DnsmasqRelay from "./DnsmasqRelay.svelte";
  import DnsmasqPxe from "./DnsmasqPxe.svelte";
  import DnsmasqTags from "./DnsmasqTags.svelte";
  import OdhcpdGeneral from "./OdhcpdGeneral.svelte";
  import OdhcpdPxe6 from "./OdhcpdPxe6.svelte";
  import ModalNewHost from "./ModalNewHost.svelte";
  import ModalEditHost from "./ModalEditHost.svelte";
  import ModalRelay from "./ModalRelay.svelte";
  import ModalBoot from "./ModalBoot.svelte";
  import ModalTag from "./ModalTag.svelte";
  import ModalBoot6 from "./ModalBoot6.svelte";

  type TabId = "leases" | "dnsmasq" | "odhcpd";
  type DnsmasqTab =
    | "general"
    | "devices"
    | "logging"
    | "files"
    | "relay"
    | "pxe"
    | "tags";
  type OdhcpdTab = "general" | "pxe6";
  type TagsTab = "matchtags" | "settags" | "vc" | "uc";

  let locale = $state(getLocale()),
    mainTab = $state<TabId>("leases"),
    dnsmasqTab = $state<DnsmasqTab>("general"),
    odhcpdTab = $state<OdhcpdTab>("general"),
    tagsTab = $state<TagsTab>("matchtags"),
    uciDhcp = $state<Record<string, any>>({}),
    loading = $state(true),
    leases4 = $state<any[]>([]),
    leases6 = $state<any[]>([]),
    hosts = $state<Record<string, any>>({}),
    pollInterval: ReturnType<typeof setInterval>,
    editing: { section: string; type: string } | null = $state(null),
    form = $state<Record<string, any>>({}),
    addingNew = $state(false),
    busy = $state<Record<string, string>>({}),
    dnsmasqForm = $state<Record<string, any>>({}),
    odhcpdForm = $state<Record<string, any>>({}),
    relayForm = $state<Record<string, any>>({}),
    editingRelay: string | null = $state(null),
    bootForm = $state<Record<string, any>>({}),
    editingBoot: string | null = $state(null),
    tagForm = $state<Record<string, any>>({}),
    editingTag: { section: string; type: string } | null = $state(null),
    boot6Form = $state<Record<string, any>>({}),
    editingBoot6: string | null = $state(null);

  let getSections = (type: string) =>
      Object.entries(uciDhcp).filter(
        ([, v]: [string, any]) => v[".type"] === type,
      ),
    fetchData = async () => {
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
    },
    openEdit = (section: string) => {
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
        match_tag: Array.isArray(sec.match_tag)
          ? sec.match_tag.join(" ")
          : sec.match_tag || "",
        instance: sec.instance || "",
        broadcast: sec.broadcast === "1",
        dns: sec.dns === "1",
      };
    },
    saveEdit = async () => {
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
      busy = Object.fromEntries(
        Object.entries(busy).filter(([k]) => k !== path),
      );
      editing = null;
      form = {};
    },
    deleteSection = async (section: string) => {
      busy = { ...busy, [section]: "delete" };
      await call("uci", "set", { config: "dhcp", section, values: { "": "" } });
      await uciCommit("dhcp");
      await fetchData();
      busy = Object.fromEntries(
        Object.entries(busy).filter(([k]) => k !== section),
      );
    },
    confirmAdd = async (name: string) => {
      const sec = await uciAdd("dhcp", "host", name);
      await fetchData();
      openEdit(sec);
    },
    saveDnsmasq = async () => {
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
      busy = Object.fromEntries(
        Object.entries(busy).filter(([k]) => k !== "dnsmasq"),
      );
    },
    saveOdhcpd = async () => {
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
      busy = Object.fromEntries(
        Object.entries(busy).filter(([k]) => k !== "odhcpd"),
      );
    },
    ltoA = (v: any): string[] => {
      if (Array.isArray(v)) return v;
      if (v?.split) return v.split(/\s+/).filter(Boolean);
      return [];
    },
    openRelay = (section?: string) => {
      if (section) {
        const s = uciDhcp[section] || {};
        relayForm = {
          local_addr: s.local_addr || "",
          server_addr: s.server_addr || "",
          interface: s.interface || "",
        };
        editingRelay = section;
      } else {
        relayForm = { local_addr: "", server_addr: "", interface: "" };
        editingRelay = "__new__";
      }
    },
    saveRelay = async () => {
      if (editingRelay === "__new__") {
        const name = await uciAdd("dhcp", "relay");
        await call("uci", "set", {
          config: "dhcp",
          section: name,
          values: { ...relayForm, ".type": "relay" },
        });
      } else if (editingRelay) {
        await call("uci", "set", {
          config: "dhcp",
          section: editingRelay,
          values: { ...relayForm, ".type": "relay" },
        });
      }
      await uciCommit("dhcp");
      await fetchData();
      editingRelay = null;
    },
    openBoot = (section?: string) => {
      if (section) {
        const s = uciDhcp[section] || {};
        bootForm = {
          filename: s.filename || "",
          servername: s.servername || "",
          serveraddress: s.serveraddress || "",
          dhcp_option: Array.isArray(s.dhcp_option)
            ? s.dhcp_option.join(" ")
            : s.dhcp_option || "",
          networkid: s.networkid || "",
          force: s.force === "1",
          instance: s.instance ?? "",
        };
        editingBoot = section;
      } else {
        bootForm = {
          filename: "",
          servername: "",
          serveraddress: "",
          dhcp_option: "",
          networkid: "",
          force: false,
          instance: "",
        };
        editingBoot = "__new__";
      }
    },
    saveBoot = async () => {
      const vals: Record<string, any> = {};
      for (const [k, v] of Object.entries(bootForm)) {
        if (k === "force") {
          vals.force = v ? "1" : "";
          continue;
        }
        if (v !== "" && v !== undefined && v !== false) vals[k] = v;
      }
      if (editingBoot === "__new__") {
        const name = await uciAdd("dhcp", "boot");
        await call("uci", "set", {
          config: "dhcp",
          section: name,
          values: vals,
        });
      } else if (editingBoot) {
        await call("uci", "set", {
          config: "dhcp",
          section: editingBoot,
          values: vals,
        });
      }
      await uciCommit("dhcp");
      await fetchData();
      editingBoot = null;
    },
    openTag = async (type: string, section?: string) => {
      const sec = section ? uciDhcp[section] || {} : {};
      const common = (k: string) => {
        if (k === "dhcp_option")
          return Array.isArray(sec[k]) ? sec[k].join(" ") : sec[k] || "";
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
    },
    saveTag = async () => {
      const vals: Record<string, any> = {};
      for (const [k, v] of Object.entries(tagForm)) {
        if (k === "_type") continue;
        if (k === "force") {
          vals.force = v ? "1" : "";
          continue;
        }
        if (v !== "" && v !== undefined && v !== false) vals[k] = v;
      }
      if (!editingTag) return;
      if (editingTag.section === "__new__") {
        const name = await uciAdd("dhcp", editingTag.type);
        await call("uci", "set", {
          config: "dhcp",
          section: name,
          values: vals,
        });
      } else {
        await call("uci", "set", {
          config: "dhcp",
          section: editingTag.section,
          values: vals,
        });
      }
      await uciCommit("dhcp");
      await fetchData();
      editingTag = null;
    },
    openBoot6 = (section?: string) => {
      const s = section ? uciDhcp[section] || {} : {};
      boot6Form = { url: s.url || "", arch: s.arch ?? "" };
      editingBoot6 = section || "__new__";
    },
    saveBoot6 = async () => {
      const vals: Record<string, any> = {};
      for (const [k, v] of Object.entries(boot6Form)) {
        if (v !== "" && v !== undefined) vals[k] = v;
      }
      if (editingBoot6 === "__new__") {
        const name = await uciAdd("dhcp", "boot6");
        await call("uci", "set", {
          config: "dhcp",
          section: name,
          values: vals,
        });
      } else if (editingBoot6) {
        await call("uci", "set", {
          config: "dhcp",
          section: editingBoot6,
          values: vals,
        });
      }
      await uciCommit("dhcp");
      await fetchData();
      editingBoot6 = null;
    };

  let trans = $derived.by(() => {
      locale;
      return (k: string) => _t(k);
    }),
    dnsmasqSec = $derived(
      (Object.entries(uciDhcp).find(
        ([, v]: [string, any]) => v[".type"] === "dnsmasq",
      ) || [null, {}]) as [string | null, any],
    ),
    odhcpdSec = $derived(
      (Object.entries(uciDhcp).find(
        ([, v]: [string, any]) => v[".type"] === "odhcpd",
      ) || [null, {}]) as [string | null, any],
    ),
    relaySections = $derived(getSections("relay")),
    bootSections = $derived(getSections("boot")),
    tagSections = $derived(getSections("tag")),
    matchSections = $derived(getSections("match")),
    vcSections = $derived(getSections("vendorclass")),
    ucSections = $derived(getSections("userclass")),
    boot6Sections = $derived(getSections("boot6"));

  $effect(() => onLocaleChange(() => (locale = getLocale())));

  let mainTabs: { id: TabId; label: string }[] = [
      { id: "leases", label: "Leases" },
      { id: "dnsmasq", label: "dnsmasq" },
      { id: "odhcpd", label: "odhcpd" },
    ],
    dnsmasqTabs: { id: DnsmasqTab; label: string }[] = [
      { id: "general", label: "General" },
      { id: "devices", label: "Devices & Ports" },
      { id: "logging", label: "Log" },
      { id: "files", label: "Files" },
      { id: "relay", label: "Relay" },
      { id: "pxe", label: "PXE/TFTP" },
      { id: "tags", label: "Tags" },
    ],
    odhcpdTabs: { id: OdhcpdTab; label: string }[] = [
      { id: "general", label: "General" },
      { id: "pxe6", label: "PXE over IPv6" },
    ],
    hasDhcpV6 = true;

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
</script>

<div class={cn("p-6", "animate-fade-in")}>
  <h1 class={cn("text-lg", "font-semibold", "text-white")}>{trans("DHCP")}</h1>
  <p class={cn("text-sm", "mt-0.5", "mb-4", "text-muted")}>
    {trans("DHCP server & lease configuration")}
  </p>

  <TabBar
    tabs={mainTabs}
    active={mainTab}
    onchange={(id: string) => {
      mainTab = id as TabId;
    }}
  />

  {#if loading}
    <p class={cn("text-xs", "text-muted", "italic", "mt-6", "text-center")}>
      {trans("Loading...")}
    </p>
  {:else if mainTab === "leases"}
    <LeasesPanel
      {trans}
      {leases4}
      {leases6}
      {hosts}
      {uciDhcp}
      {busy}
      {hasDhcpV6}
      onadd={() => (addingNew = true)}
      onedit={openEdit}
      ondelete={deleteSection}
    />
  {:else if mainTab === "dnsmasq"}
    <div class={cn("mt-4")}>
      <TabBar
        tabs={dnsmasqTabs}
        active={dnsmasqTab}
        onchange={(id: string) => {
          dnsmasqTab = id as DnsmasqTab;
        }}
      />
      <div class={cn("mt-4", "glass", "rounded-xl", "p-5", "space-y-5")}>
        {#if dnsmasqTab === "general" || dnsmasqTab === "devices" || dnsmasqTab === "logging" || dnsmasqTab === "files"}
          <DnsmasqGeneral {trans} {dnsmasqTab} bind:dnsmasqForm />
        {:else if dnsmasqTab === "relay"}
          <DnsmasqRelay
            {trans}
            {relaySections}
            {busy}
            onopen={openRelay}
            ondelete={deleteSection}
          />
        {:else if dnsmasqTab === "pxe"}
          <DnsmasqPxe
            {trans}
            bind:dnsmasqForm
            {bootSections}
            {busy}
            onopenboot={openBoot}
            ondelete={deleteSection}
          />
        {:else if dnsmasqTab === "tags"}
          <DnsmasqTags
            {trans}
            bind:tagsTab
            {tagSections}
            {matchSections}
            {vcSections}
            {ucSections}
            onopentag={openTag}
            ondelete={deleteSection}
          />
        {/if}
        {#if dnsmasqTab !== "relay" && dnsmasqTab !== "pxe" && dnsmasqTab !== "tags"}
          <div class={cn("flex", "justify-end", "pt-2")}>
            <button
              onclick={saveDnsmasq}
              disabled={busy.dnsmasq !== undefined}
              class={cn(
                "flex",
                "px-3",
                "py-1.5",
                "gap-1.5",
                "text-xs",
                "rounded-lg",
                "bg-accent",
                "font-medium",
                "text-black",
                "items-center",
                "transition-all",
                "cursor-pointer",
                "hover:opacity-90",
                "disabled:opacity-50",
              )}
            >
              <Save size={12} />{trans("Save")}
            </button>
          </div>
        {/if}
      </div>
    </div>
  {:else if mainTab === "odhcpd"}
    <div class={cn("mt-4")}>
      <TabBar
        tabs={odhcpdTabs}
        active={odhcpdTab}
        onchange={(id: string) => {
          odhcpdTab = id as OdhcpdTab;
        }}
      />
      <div class={cn("mt-4", "glass", "rounded-xl", "p-5", "space-y-5")}>
        {#if odhcpdTab === "general"}
          <OdhcpdGeneral {trans} bind:odhcpdForm />
          <div class={cn("flex", "justify-end", "pt-2")}>
            <button
              onclick={saveOdhcpd}
              disabled={busy.odhcpd !== undefined}
              class={cn(
                "flex",
                "px-3",
                "py-1.5",
                "gap-1.5",
                "text-xs",
                "rounded-lg",
                "bg-accent",
                "font-medium",
                "items-center",
                "text-black",
                "transition-all",
                "cursor-pointer",
                "hover:opacity-90",
                "disabled:opacity-50",
              )}
            >
              <Save size={12} />{trans("Save")}
            </button>
          </div>
        {:else if odhcpdTab === "pxe6"}
          <OdhcpdPxe6
            {trans}
            {boot6Sections}
            onopen={openBoot6}
            ondelete={deleteSection}
          />
        {/if}
      </div>
    </div>
  {/if}
</div>

<ModalNewHost bind:open={addingNew} {trans} {uciDhcp} oncreate={confirmAdd} />
<ModalEditHost bind:editing bind:form {trans} {busy} onsave={saveEdit} />
<ModalRelay bind:editingRelay bind:relayForm {trans} onsave={saveRelay} />
<ModalBoot bind:editingBoot bind:bootForm {trans} onsave={saveBoot} />
<ModalTag bind:editingTag bind:tagForm {trans} onsave={saveTag} />
<ModalBoot6 bind:editingBoot6 bind:boot6Form {trans} onsave={saveBoot6} />
