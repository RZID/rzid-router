<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import {
    Network, Wifi, GitMerge, Layers, Cable, Link2,
    Play, Square, Pencil, RefreshCw, X, Save, Globe, Radio,
    ArrowRightLeft, Monitor, Plus, Trash2,
  } from "@lucide/svelte";
  import { cn } from "../helpers/classname";
  import { t as _t, getLocale, onLocaleChange } from "../i18n";
  import { call, batchCall, uciGet, uciCommit, uciSet, uciAdd } from "../api/ubus";
  import { fmtBytes, fmtPkts, fmtUptime } from "../helpers/format";
  import Input from "../components/Input/index.svelte";
  import Toggle from "../components/Toggle/index.svelte";
  import Select from "../components/Select/index.svelte";
  import TabBar from "../components/TabBar/index.svelte";

  let locale = $state(getLocale());
  let trans = $derived.by(() => { locale; return (k: string) => _t(k); });
  $effect(() => onLocaleChange(() => { locale = getLocale(); }));

  interface Iface {
    interface: string;
    proto: string;
    device: string;
    l2_device?: { name: string; macaddr: string };
    up: boolean;
    uptime: number;
    pending: boolean;
    "ipv4-address"?: { address: string; mask: number }[];
    "ipv6-address"?: { address: string; mask: number }[];
    route?: { nexthop: string; target: string }[];
    "dns-server"?: string[];
  }

  interface DeviceStatus {
    name: string;
    macaddr: string;
    carrier: boolean;
    type: string;
    "speed"?: number;
    "link-supported"?: string[];
    mtu: number;
    statistics: { rx_bytes: number; tx_bytes: number; rx_packets: number; tx_packets: number; rx_errors: number; tx_errors: number };
    ports?: string[];
    pse?: any;
  }

  let mainTab = $state("interfaces");
  let interfaces = $state<Iface[]>([]);
  let devices = $state<Record<string, DeviceStatus>>({});
  let firewalls = $state<Record<string, any>>({});
  let dhcpConfig = $state<Record<string, any>>({});
  let uciNetwork = $state<Record<string, any>>({});
  let deviceUciSections = $state<any[]>([]);
  let loading = $state(true);
  let pollTimer: ReturnType<typeof setInterval> | undefined;

  let editingIface = $state<string | null>(null);
  let editTab = $state("general");
  let editForm = $state<Record<string, any>>({});
  let globalForm = $state<Record<string, any>>({});
  let globalSaving = $state(false);
  let editSaved = $state(false);
  let btnBusy = $state<Record<string, "restart" | "stop">>({});

  let dhcpSubTab = $state("general");

  let addingNewIface = $state(false);
  let newIfaceName = $state("");
  let newIfaceNameError = $state("");
  let newIfaceProto = $state("static");
  let newIfaceDevice = $state("");

  let editingDevice = $state<string | null>(null);
  let deviceEditForm = $state<Record<string, any>>({});
  let deviceEditTab = $state("general");

  const mainTabs = [
    { id: "interfaces", label: "Interfaces" },
    { id: "devices", label: "Devices" },
    { id: "global", label: "Global" },
  ];

  const editTabs = [
    { id: "general", label: "General Settings" },
    { id: "advanced", label: "Advanced Settings" },
    { id: "physical", label: "Physical Settings" },
    { id: "brport", label: "Bridge port specific options" },
    { id: "bridgevlan", label: "Bridge VLAN filtering" },
    { id: "firewall", label: "Firewall Settings" },
    { id: "dhcp", label: "DHCP Server" },
  ];

  const dhcpSubTabs = [
    { id: "general", label: "General Setup" },
    { id: "ipv4", label: "IPv4 Settings" },
    { id: "ipv6", label: "IPv6 Settings" },
    { id: "dhcpv6", label: "DHCPv6 Settings" },
    { id: "ipv6-ra", label: "IPv6 RA Settings" },
  ];

  const deviceTypeIcon = (type: string, up: boolean) => {
    if (type === "bridge") return GitMerge;
    if (type === "vlan") return Layers;
    if (type === "wifi" || type === "wireless") return Wifi;
    if (type === "ppp" || type === "pppoe") return Cable;
    if (type === "bond") return Link2;
    if (type === "tunnel" || type === "gre" || type === "grev6" || type === "ipip" || type === "vti" || type === "vti6") return ArrowRightLeft;
    if (type === "ethernet") return Network;
    return Radio;
  };

  const deviceTypeStr = (name: string, st?: DeviceStatus | null): string => {
    if (st?.type) return st.type;
    if (name.startsWith("br-")) return "bridge";
    if (name.startsWith("eth")) return "ethernet";
    if (name.startsWith("wl") || name.startsWith("radio")) return "wifi";
    if (name.startsWith("ppp")) return "ppp";
    if (name.startsWith("bond")) return "bond";
    if (name.startsWith("gre") || name.startsWith("ipip") || name.startsWith("vti")) return "tunnel";
    if (name.includes(".")) return "vlan";
    return "ethernet";
  };

  const toArray = (v: any): string[] => {
    if (!v) return [];
    if (Array.isArray(v)) return v.filter(Boolean);
    return String(v).split(/\s+/).filter(Boolean);
  };

  const hasPeerDns = (proto: string) => {
    switch (proto) {
      case "dhcp": case "dhcpv6": case "qmi": case "ppp": case "pppoe":
      case "pppoa": case "pptp": case "openvpn": case "sstp": case "ncm":
        return true;
    }
    return false;
  };

  const hasSourcefilter = (proto: string) => {
    switch (proto) {
      case "3g": case "dhcpv6": case "directip": case "mbim":
      case "modemmanager": case "ncm": case "ppp": case "pppoa":
      case "pppoe": case "pptp": case "qmi":
        return true;
    }
    return false;
  };

  const fetchData = async () => {
    const [net, fw, dhcp, uci] = await batchCall<any>([
      { object: "network.interface", method: "dump" },
      { object: "uci", method: "get", params: { config: "firewall" } },
      { object: "uci", method: "get", params: { config: "dhcp" } },
      { object: "uci", method: "get", params: { config: "network" } },
    ]);

    const ifaces: Iface[] = (net?.interface || []).filter((i: Iface) => i.interface !== "loopback");
    interfaces = ifaces;

    if (fw?.values) firewalls = fw.values;
    if (dhcp?.values) dhcpConfig = dhcp.values;
    if (uci?.values) {
      uciNetwork = uci.values;

      // populate global form from globals section
      const globalsSec = Object.entries(uci.values).find(([, v]: [string, any]) => v[".type"] === "globals");
      const g = (globalsSec?.[1] || {}) as Record<string, any>;
      globalForm = {
        ula_prefix: g.ula_prefix || "",
        dhcp_default_duid: g.dhcp_default_duid || "",
        mptcp: g.mptcp === "1",
        tcp_l3mdev: g.tcp_l3mdev === "1",
        udp_l3mdev: g.udp_l3mdev === "1",
        packet_steering: g.packet_steering || "1",
      };
    }

    const devNames = [...new Set(ifaces.map((i) => i.l2_device?.name || i.device).filter(Boolean))];
    if (devNames.length > 0) {
      const calls = devNames.map((n) => ({
        object: "network.device",
        method: "status",
        params: { name: n },
      }));
      const devResults = await batchCall<any>(calls);
      const devMap: Record<string, DeviceStatus> = {};
      for (let i = 0; i < devNames.length; i++) {
        if (devResults[i]) devMap[devNames[i]] = devResults[i] as DeviceStatus;
      }
      devices = devMap;

      // also fetch all known devices from network.device status for device tab
      const allDevStatus = await call<Record<string, DeviceStatus>>("network.device", "status", {}).catch(() => null);
      if (allDevStatus) {
        for (const [k, v] of Object.entries(allDevStatus)) {
          devMap[k] = v as DeviceStatus;
        }
        devices = devMap;
      }
    }

    // device UCI sections
    const uciDevSections = [];
    for (const [k, v] of Object.entries(uci?.values || {})) {
      const sec = v as any;
      if (sec[".type"] === "device") uciDevSections.push({ name: k, ...sec });
    }
    deviceUciSections = uciDevSections;

    loading = false;
  };

  const ifaceUp = async (name: string) => {
    btnBusy = { ...btnBusy, [name]: "restart" };
    await call("network.interface", "down", { interface: name }).catch(() => {});
    await new Promise((r) => setTimeout(r, 1000));
    await call("network.interface", "up", { interface: name }).catch(() => {});
    await new Promise((r) => setTimeout(r, 2000));
    await fetchData();
    btnBusy = Object.fromEntries(Object.entries(btnBusy).filter(([k]) => k !== name));
  };

  const ifaceDown = async (name: string) => {
    btnBusy = { ...btnBusy, [name]: "stop" };
    await call("network.interface", "down", { interface: name }).catch(() => {});
    await new Promise((r) => setTimeout(r, 2000));
    await fetchData();
    btnBusy = Object.fromEntries(Object.entries(btnBusy).filter(([k]) => k !== name));
  };

  const getDhcpSection = (iface: string) => {
    for (const s of Object.values(dhcpConfig)) {
      const sec = s as any;
      if (sec[".type"] === "dhcp" && sec.interface === iface) return sec;
    }
    return null;
  };

  const getFirewallZone = (iface: string) => {
    for (const s of Object.values(firewalls)) {
      const sec = s as any;
      if (sec[".type"] === "zone") {
        const nets = toArray(sec.network);
        if (nets.includes(iface)) return sec[".name"] || "";
      }
    }
    return "";
  };

  const getFirewallZones = () => {
    const zones: { value: string; label: string }[] = [];
    for (const [, s] of Object.entries(firewalls)) {
      const sec = s as any;
      if (sec[".type"] === "zone" && sec[".name"]) {
        zones.push({ value: sec[".name"], label: sec.name || sec[".name"] });
      }
    }
    return zones;
  };

  const getIfIpAddrs = (ifc: Iface): string[] => {
    return (ifc["ipv4-address"] || []).map((a) => `${a.address}/${a.mask}`);
  };

  const getIfIp6Addrs = (ifc: Iface): string[] => {
    return (ifc["ipv6-address"] || []).map((a) => `${a.address}/${a.mask}`);
  };

  const getDev = (ifc: Iface): DeviceStatus | null => {
    return devices[ifc.l2_device?.name || ifc.device] || null;
  };

  const getZoneColor = (iface: string): string => {
    for (const [, s] of Object.entries(firewalls)) {
      const sec = s as any;
      if (sec[".type"] === "zone") {
        const nets = toArray(sec.network);
        if (nets.includes(iface)) return sec.name === "lan" ? "#16a34a" : sec.name === "wan" ? "#dc2626" : "#2563eb";
      }
    }
    return "#374151";
  };

  const getZoneName = (iface: string): string => {
    for (const [, s] of Object.entries(firewalls)) {
      const sec = s as any;
      if (sec[".type"] === "zone") {
        if (toArray(sec.network).includes(iface)) return sec.name || sec[".name"] || "";
      }
    }
    return "";
  };

  // ── Interface Edit Modal ──
  const openEdit = (name: string) => {
    const sec = uciNetwork[name] || {};
    const dhcpSec = getDhcpSection(name);
    const protoval = sec.proto || "none";

    editForm = {
      proto: protoval,
      device: sec.device || "",
      disabled: sec.disabled === "1",
      auto: sec.auto !== "0",
      defaultroute: sec.defaultroute !== "0",
      peerdns: sec.peerdns !== "0",
      dns: sec.dns || "",
      dns_metric: sec.dns_metric || "",
      metric: sec.metric || "",
      multipath: sec.multipath || "",
      delegate: sec.delegate !== "0",
      sourcefilter: sec.sourcefilter !== "0",
      ip4table: sec.ip4table || "",
      ip6table: sec.ip6table || "",
      ip6assign: sec.ip6assign || "",
      ip6hint: sec.ip6hint || "",
      ip6class: sec.ip6class || "",
      ip6ifaceid: sec.ip6ifaceid || "",
      ip6weight: sec.ip6weight || "",
      force_link: sec.force_link === "1" || false,
      zone: getFirewallZone(name),
      bridge: sec.type === "bridge",
      ports: sec.ports || "",
      ifname: sec.ifname || "",
      stp: sec.stp || "",
      forward_delay: sec.forward_delay || "",
      priority: sec.priority || "",
      ageing_time: sec.ageing_time || "",
      hello_time: sec.hello_time || "",
      max_age: sec.max_age || "",
      vlan_filtering: sec.vlan_filtering || "",
      vlan_default_pvid: sec.vlan_default_pvid || "1",
      vlan_stats_per_port: sec.vlan_stats_per_port || "",
      dhcp_ignore: dhcpSec?.ignore === "1" || false,
      dhcp_dynamicdhcp: dhcpSec?.dynamicdhcp !== "0",
      dhcp_leasetime: dhcpSec?.leasetime || "12h",
      dhcp_force: dhcpSec?.force === "1" || false,
      dhcp_option: dhcpSec?.dhcp_option || "",
      dhcp_option_force: dhcpSec?.dhcp_option_force || "",
      dhcp_dhcpv4: dhcpSec?.dhcpv4 || "",
      dhcp_ipv6_only_preferred: dhcpSec?.ipv6_only_preferred || "",
      dhcp_start: dhcpSec?.start || "100",
      dhcp_limit: dhcpSec?.limit || "150",
      dhcp_netmask: dhcpSec?.netmask || "",
      dhcp_master: dhcpSec?.master === "1" || false,
      dhcp_ra: dhcpSec?.ra || "",
      dhcp_dhcpv6: dhcpSec?.dhcpv6 || "",
      dhcp_dns: dhcpSec?.dns || "",
      dhcp_dns_service: dhcpSec?.dns_service !== "0",
      dhcp_dnr: dhcpSec?.dnr || "",
      dhcp_domain: dhcpSec?.domain || "",
      dhcp_ndp: dhcpSec?.ndp || "",
      dhcp_ndproxy_routing: dhcpSec?.ndproxy_routing !== "0",
      dhcp_ndproxy_slave: dhcpSec?.ndproxy_slave === "1" || false,
      dhcp_dhcpv6_pd: dhcpSec?.dhcpv6_pd === "1" || false,
      dhcp_dhcpv6_pd_min_len: dhcpSec?.dhcpv6_pd_min_len || "",
      dhcp_ntp: dhcpSec?.ntp || "",
      dhcp_ra_default: dhcpSec?.ra_default || "",
      dhcp_ra_slaac: dhcpSec?.ra_slaac !== "0",
      dhcp_ra_preference: dhcpSec?.ra_preference || "medium",
      dhcp_ra_flags: dhcpSec?.ra_flags || "",
      dhcp_ra_pio_flags: dhcpSec?.dhcpv6_pd_preferred === "1" ? ["pd"] : [],
      dhcp_ra_pref64: dhcpSec?.ra_pref64 || "",
      dhcp_ra_maxinterval: dhcpSec?.ra_maxinterval || "",
      dhcp_ra_mininterval: dhcpSec?.ra_mininterval || "",
      dhcp_ra_reachabletime: dhcpSec?.ra_reachabletime || "",
      dhcp_ra_retranstime: dhcpSec?.ra_retranstime || "",
      dhcp_ra_lifetime: dhcpSec?.ra_lifetime || "",
      dhcp_ra_mtu: dhcpSec?.ra_mtu || "",
      dhcp_ra_hoplimit: dhcpSec?.ra_hoplimit || "",
      dhcp_max_preferred_lifetime: dhcpSec?.max_preferred_lifetime || "",
      dhcp_max_valid_lifetime: dhcpSec?.max_valid_lifetime || "",
    };
    editTab = "general";
    dhcpSubTab = "general";
    editSaved = false;
    editingIface = name;
  };

  const closeEdit = () => {
    editingIface = null;
    editForm = {};
  };

  const saveEdit = async () => {
    if (!editingIface) return;
    const vals: Record<string, any> = {
      proto: editForm.proto || undefined,
      device: editForm.device || undefined,
      disabled: editForm.disabled ? "1" : "0",
      auto: editForm.auto ? "1" : "0",
      defaultroute: editForm.defaultroute ? "1" : "0",
      peerdns: editForm.peerdns ? "1" : "0",
      dns: editForm.dns || undefined,
      dns_metric: editForm.dns_metric || undefined,
      metric: editForm.metric || undefined,
      delegate: editForm.delegate ? "1" : "0",
      sourcefilter: editForm.sourcefilter ? "1" : "0",
      ip4table: editForm.ip4table || undefined,
      ip6table: editForm.ip6table || undefined,
      ip6assign: editForm.ip6assign || undefined,
      ip6hint: editForm.ip6hint || undefined,
      ip6class: editForm.ip6class || undefined,
      ip6ifaceid: editForm.ip6ifaceid || undefined,
      ip6weight: editForm.ip6weight || undefined,
      force_link: editForm.force_link ? "1" : "0",
      multipath: editForm.multipath || undefined,
    };
    if (editForm.bridge) {
      vals.type = "bridge";
      vals.ports = editForm.ports || undefined;
      vals.ifname = undefined;
      vals.stp = editForm.stp || undefined;
      vals.forward_delay = editForm.forward_delay || undefined;
      vals.priority = editForm.priority || undefined;
      vals.ageing_time = editForm.ageing_time || undefined;
      vals.hello_time = editForm.hello_time || undefined;
      vals.max_age = editForm.max_age || undefined;
      vals.vlan_filtering = editForm.vlan_filtering || undefined;
      vals.vlan_default_pvid = editForm.vlan_default_pvid || undefined;
      vals.vlan_stats_per_port = editForm.vlan_stats_per_port || undefined;
    } else {
      vals.ifname = editForm.ifname || undefined;
      vals.type = undefined;
      vals.ports = undefined;
      vals.stp = undefined;
      vals.forward_delay = undefined;
      vals.priority = undefined;
      vals.ageing_time = undefined;
      vals.hello_time = undefined;
      vals.max_age = undefined;
      vals.vlan_filtering = undefined;
      vals.vlan_default_pvid = undefined;
      vals.vlan_stats_per_port = undefined;
    }
    await call("uci", "set", { config: "network", section: editingIface, values: vals });
    await uciCommit("network");

    const oldZone = getFirewallZone(editingIface);
    if (editForm.zone !== oldZone) {
      if (oldZone && firewalls[oldZone]) {
        const oldNets = toArray((firewalls[oldZone] as any).network);
        const idx = oldNets.indexOf(editingIface);
        if (idx >= 0) {
          oldNets.splice(idx, 1);
          await call("uci", "set", { config: "firewall", section: oldZone, values: { network: oldNets.join(" ") } });
        }
      }
      if (editForm.zone && firewalls[editForm.zone]) {
        const newNets = toArray((firewalls[editForm.zone] as any).network);
        if (!newNets.includes(editingIface)) {
          newNets.push(editingIface);
          await call("uci", "set", { config: "firewall", section: editForm.zone, values: { network: newNets.join(" ") } });
        }
      }
      await uciCommit("firewall");
    }

    const dhcpSec = getDhcpSection(editingIface);
    if (dhcpSec) {
      const dhcpName = dhcpSec[".name"] || "";
      const dhcpVals: Record<string, any> = {
        ignore: editForm.dhcp_ignore ? "1" : "0",
        dynamicdhcp: editForm.dhcp_dynamicdhcp ? "1" : "0",
        leasetime: editForm.dhcp_leasetime || undefined,
        force: editForm.dhcp_force ? "1" : "0",
        dhcp_option: editForm.dhcp_option || undefined,
        dhcp_option_force: editForm.dhcp_option_force || undefined,
        dhcpv4: editForm.dhcp_dhcpv4 || undefined,
        ipv6_only_preferred: editForm.dhcp_ipv6_only_preferred || undefined,
        start: editForm.dhcp_start || undefined,
        limit: editForm.dhcp_limit || undefined,
        netmask: editForm.dhcp_netmask || undefined,
        master: editForm.dhcp_master ? "1" : "0",
        ra: editForm.dhcp_ra || undefined,
        dhcpv6: editForm.dhcp_dhcpv6 || undefined,
        dns: editForm.dhcp_dns || undefined,
        dns_service: editForm.dhcp_dns_service ? "1" : "0",
        dnr: editForm.dhcp_dnr || undefined,
        domain: editForm.dhcp_domain || undefined,
        ndp: editForm.dhcp_ndp || undefined,
        ndproxy_routing: editForm.dhcp_ndproxy_routing ? "1" : "0",
        ndproxy_slave: editForm.dhcp_ndproxy_slave ? "1" : "0",
        dhcpv6_pd: editForm.dhcp_dhcpv6_pd ? "1" : "0",
        dhcpv6_pd_min_len: editForm.dhcp_dhcpv6_pd_min_len || undefined,
        ntp: editForm.dhcp_ntp || undefined,
        ra_default: editForm.dhcp_ra_default || undefined,
        ra_slaac: editForm.dhcp_ra_slaac ? "1" : "0",
        ra_preference: editForm.dhcp_ra_preference || undefined,
        ra_flags: editForm.dhcp_ra_flags || undefined,
        dhcpv6_pd_preferred: editForm.dhcp_ra_pio_flags?.includes?.("pd") ? "1" : "0",
        ra_pref64: editForm.dhcp_ra_pref64 || undefined,
        ra_maxinterval: editForm.dhcp_ra_maxinterval || undefined,
        ra_mininterval: editForm.dhcp_ra_mininterval || undefined,
        ra_reachabletime: editForm.dhcp_ra_reachabletime || undefined,
        ra_retranstime: editForm.dhcp_ra_retranstime || undefined,
        ra_lifetime: editForm.dhcp_ra_lifetime || undefined,
        ra_mtu: editForm.dhcp_ra_mtu || undefined,
        ra_hoplimit: editForm.dhcp_ra_hoplimit || undefined,
        max_preferred_lifetime: editForm.dhcp_max_preferred_lifetime || undefined,
        max_valid_lifetime: editForm.dhcp_max_valid_lifetime || undefined,
      };
      Object.keys(dhcpVals).forEach((k) => { if (dhcpVals[k] === undefined) delete dhcpVals[k]; });
      await call("uci", "set", { config: "dhcp", section: dhcpName, values: dhcpVals });
      await uciCommit("dhcp");
    }

    const [uci, fw, dhcp] = await batchCall<any>([
      { object: "uci", method: "get", params: { config: "network" } },
      { object: "uci", method: "get", params: { config: "firewall" } },
      { object: "uci", method: "get", params: { config: "dhcp" } },
    ]);
    if (uci?.values) uciNetwork = uci.values;
    if (fw?.values) firewalls = fw.values;
    if (dhcp?.values) dhcpConfig = dhcp.values;
    editSaved = true;
    setTimeout(() => { editSaved = false; closeEdit(); }, 1500);
  };

  const addNewInterface = async () => {
    newIfaceNameError = "";
    if (!newIfaceName) { newIfaceNameError = trans("Name is required"); return; }
    if (newIfaceName.length > 15) { newIfaceNameError = trans("Interface name is too long (max 15 characters)"); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(newIfaceName)) { newIfaceNameError = trans("Invalid characters in interface name"); return; }
    const existing = Object.keys(uciNetwork).filter((k) => uciNetwork[k]?.[".type"] === "interface");
    if (existing.includes(newIfaceName)) { newIfaceNameError = trans("Interface name already exists"); return; }
    await call("uci", "add", { config: "network", type: "interface", name: newIfaceName });
    await call("uci", "set", {
      config: "network",
      section: newIfaceName,
      values: { proto: newIfaceProto, device: newIfaceDevice || undefined },
    });
    await uciCommit("network");
    addingNewIface = false;
    newIfaceName = "";
    newIfaceNameError = "";
    newIfaceProto = "static";
    newIfaceDevice = "";
    await fetchData();
    openEdit(newIfaceName);
  };

  const deleteInterface = async (name: string) => {
    btnBusy = { ...btnBusy, [name]: "stop" };
    await call("network.interface", "down", { interface: name }).catch(() => {});
    await call("uci", "set", { config: "network", section: name, values: { "": "" } });
    await uciCommit("network");
    // remove dhcp section
    const dhcpSec = getDhcpSection(name);
    if (dhcpSec) {
      await call("uci", "set", { config: "dhcp", section: dhcpSec[".name"], values: { "": "" } });
      await uciCommit("dhcp");
    }
    await fetchData();
    btnBusy = Object.fromEntries(Object.entries(btnBusy).filter(([k]) => k !== name));
  };

  // ── Device Edit ──
  const openDeviceEdit = (name: string) => {
    const sec = uciNetwork[name] || {};
    deviceEditForm = {
      name: sec.name || name,
      type: sec.type || "ethernet",
      mtu: sec.mtu || "",
      macaddr: sec.macaddr || "",
      ports: sec.ports || "",
      stp: sec.stp || "",
      forward_delay: sec.forward_delay || "",
      priority: sec.priority || "",
      ageing_time: sec.ageing_time || "",
      hello_time: sec.hello_time || "",
      max_age: sec.max_age || "",
      vlan_filtering: sec.vlan_filtering || "",
      vlan_default_pvid: sec.vlan_default_pvid || "1",
      vlan_stats_per_port: sec.vlan_stats_per_port || "",
      igmp_snooping: sec.igmp_snooping || "",
      ip6table: sec.ip6table || "",
      ip4table: sec.ip4table || "",
    };
    editingDevice = name;
  };

  const closeDeviceEdit = () => {
    editingDevice = null;
    deviceEditForm = {};
  };

  const saveDevice = async () => {
    if (!editingDevice) return;
    const vals: Record<string, any> = {};
    for (const [k, v] of Object.entries(deviceEditForm)) {
      if (v !== "" && v !== undefined) vals[k] = v;
    }
    await call("uci", "set", { config: "network", section: editingDevice, values: vals });
    await uciCommit("network");
    await fetchData();
    closeDeviceEdit();
  };

  const saveGlobal = async () => {
    globalSaving = true;
    const globalsSec = Object.entries(uciNetwork).find(([, v]: [string, any]) => v[".type"] === "globals");
    const secName = globalsSec ? globalsSec[0] : "globals";
    const vals: Record<string, any> = {
      ula_prefix: globalForm.ula_prefix || undefined,
      dhcp_default_duid: globalForm.dhcp_default_duid || undefined,
      mptcp: globalForm.mptcp ? "1" : "0",
      tcp_l3mdev: globalForm.tcp_l3mdev ? "1" : "0",
      udp_l3mdev: globalForm.udp_l3mdev ? "1" : "0",
      packet_steering: globalForm.packet_steering || "1",
    };
    Object.keys(vals).forEach((k) => { if (vals[k] === undefined) delete vals[k]; });
    if (!globalsSec) {
      await call("uci", "add", { config: "network", type: "globals", name: secName, values: vals });
    } else {
      await call("uci", "set", { config: "network", section: secName, values: vals });
    }
    await uciCommit("network");
    await fetchData();
    globalSaving = false;
  };

  const protocols = [
    { value: "none", label: "Unmanaged" },
    { value: "dhcp", label: "DHCP client" },
    { value: "static", label: "Static address" },
    { value: "pppoe", label: "PPPoE" },
    { value: "pptp", label: "PPtP" },
    { value: "l2tp", label: "L2TP" },
    { value: "ppp", label: "PPP" },
    { value: "6in4", label: "6in4 / HE.net" },
    { value: "6to4", label: "6to4" },
    { value: "dslite", label: "DS-Lite" },
    { value: "gre", label: "GRE" },
    { value: "grev6", label: "GREv6" },
    { value: "vti", label: "VTI" },
    { value: "vti6", label: "VTI6" },
    { value: "ipip", label: "IPIP" },
    { value: "ncm", label: "NCM" },
    { value: "qmi", label: "QMI" },
    { value: "mbim", label: "MBIM" },
    { value: "modemmanager", label: "ModemManager" },
    { value: "3g", label: "3G" },
    { value: "hnet", label: "Homenet" },
    { value: "relay", label: "Relay" },
    { value: "wwan", label: "WWAN" },
    { value: "wireguard", label: "WireGuard" },
  ];

  const deviceTypeOptions = [
    { value: "ethernet", label: "Ethernet" },
    { value: "bridge", label: "Bridge" },
    { value: "8021q", label: "VLAN (802.1q)" },
    { value: "8021ad", label: "VLAN (802.1ad)" },
    { value: "bonding", label: "Aggregation" },
    { value: "macvlan", label: "MAC VLAN" },
    { value: "veth", label: "Virtual Ethernet" },
    { value: "vrf", label: "VRF" },
    { value: "tunnel", label: "Tunnel" },
  ];

  const zoneOptions = $derived(getFirewallZones());
  const raServiceOptions = [
    { value: "", label: "disabled" },
    { value: "server", label: "server mode" },
    { value: "relay", label: "relay mode" },
    { value: "hybrid", label: "hybrid mode" },
  ];
  const dhcpv6ServiceOptions = [
    { value: "", label: "disabled" },
    { value: "server", label: "server mode" },
    { value: "relay", label: "relay mode" },
    { value: "hybrid", label: "hybrid mode" },
  ];
  const ndpProxyOptions = [
    { value: "", label: "disabled" },
    { value: "relay", label: "relay mode" },
    { value: "hybrid", label: "hybrid mode" },
  ];
  const dhcpv4Options = [
    { value: "", label: "disabled" },
    { value: "server", label: "enabled" },
  ];
  const multipathOptions = [
    { value: "", label: "Off" },
    { value: "on", label: "On" },
    { value: "master", label: "Master" },
    { value: "backup", label: "Backup" },
    { value: "handover", label: "Handover" },
  ];
  const raDefaultOptions = [
    { value: "", label: "automatic" },
    { value: "1", label: "on available prefix" },
    { value: "2", label: "forced" },
  ];
  const raPreferenceOptions = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
  ];
  const raFlagsOptions = [
    { value: "managed-config", label: "managed config (M)" },
    { value: "other-config", label: "other config (O)" },
    { value: "home-agent", label: "mobile home agent (H)" },
  ];
  const raPioFlagsOptions = [
    { value: "pd", label: "prefix delegation (PD) preferred (P)" },
  ];
  const lifetimeOptions = [
    { value: "5m", label: "5m (5 minutes)" },
    { value: "45m", label: "45m (45 minutes - default)" },
    { value: "3h", label: "3h (3 hours)" },
    { value: "12h", label: "12h (12 hours)" },
    { value: "7d", label: "7d (7 days)" },
  ];
  const leasetimeOptions = [
    { value: "2m", label: "2m" },
    { value: "10m", label: "10m" },
    { value: "30m", label: "30m" },
    { value: "1h", label: "1h" },
    { value: "2h", label: "2h" },
    { value: "6h", label: "6h" },
    { value: "12h", label: "12h" },
    { value: "1d", label: "1d" },
    { value: "7d", label: "7d" },
    { value: "infinite", label: "infinite" },
  ];

  onMount(async () => {
    await fetchData();
    pollTimer = setInterval(fetchData, 10000);
  });

  onDestroy(() => { clearInterval(pollTimer); });
</script>

<div class={cn("p-6", "flex", "flex-col", "min-h-0", "animate-fade-in", "gap-5")}>
  <div class={cn("shrink-0", "flex", "items-start", "justify-between", "gap-4")}>
    <div class={cn("flex", "items-center", "gap-3")}>
      <div class={cn("w-9", "h-9", "rounded-xl", "bg-accent/10", "flex", "items-center", "justify-center", "ring-1", "ring-accent/20", "shrink-0")}>
        <Globe size={16} class={cn("text-accent")} />
      </div>
      <div>
        <h1 class={cn("text-lg", "font-semibold", "text-white")}>{trans("Interfaces")}</h1>
        <p class={cn("text-sm", "mt-0.5", "text-muted")}>{trans("Network configuration.")}</p>
      </div>
    </div>
    <button onclick={fetchData} class={cn("p-2", "rounded-lg", "hover:bg-white/5", "transition-colors", "text-muted", "hover:text-fg", "cursor-pointer")}>
      <RefreshCw size={14} />
    </button>
  </div>

  <TabBar tabs={mainTabs} active={mainTab} onchange={(id: string) => (mainTab = id)} />

  {#key mainTab}
    <!-- ════════ INTERFACES ════════ -->
    {#if mainTab === "interfaces"}
      <div class={cn("flex", "items-center", "justify-between", "gap-2")}>
        <button
          onclick={() => { addingNewIface = true; newIfaceName = ""; newIfaceNameError = ""; newIfaceProto = "static"; newIfaceDevice = ""; }}
          class={cn("inline-flex", "items-center", "gap-1", "px-2.5", "py-1.5", "text-xs", "rounded-md", "font-medium", "text-surface", "bg-accent", "hover:bg-accent/90", "cursor-pointer", "transition-all")}
        >
          <Plus size={14} />
          {trans("Add new interface...")}
        </button>
        <input
          type="text"
          placeholder={trans("Filter...")}
          class={cn("w-48", "px-2.5", "py-1.5", "border", "text-xs", "text-fg", "rounded-md", "bg-surface", "border-border", "outline-none", "focus:border-(--accent)", "font-mono")}
          oninput={(e) => {}}
        />
      </div>

      <div class={cn("glass", "rounded-xl", "overflow-hidden")}>
        {#if loading}
          <div class={cn("p-8", "text-center")}><p class={cn("text-xs", "text-muted", "italic")}>{trans("Loading...")}</p></div>
        {:else if interfaces.length === 0}
          <div class={cn("p-8", "text-center")}><p class={cn("text-xs", "text-muted", "italic")}>{trans("No interfaces found.")}</p></div>
        {:else}
          <div class={cn("overflow-x-auto")}>
            <table class={cn("w-full", "text-xs")}>
              <thead>
                <tr class={cn("text-left", "text-muted", "border-b", "border-border")}>
                  <th class={cn("p-3", "font-medium", "w-10")}></th>
                  <th class={cn("p-3", "pr-2", "font-medium")}>{trans("Interface")}</th>
                  <th class={cn("p-3", "pr-2", "font-medium")}>{trans("Protocol")}</th>
                  <th class={cn("p-3", "pr-2", "font-medium")}>{trans("Device")}</th>
                  <th class={cn("p-3", "pr-2", "font-medium")}>{trans("IPv4")}</th>
                  <th class={cn("p-3", "pr-2", "font-medium")}>{trans("IPv6")}</th>
                  <th class={cn("p-3", "pr-2", "font-medium")}>{trans("RX")}</th>
                  <th class={cn("p-3", "pr-2", "font-medium")}>{trans("TX")}</th>
                  <th class={cn("p-3", "font-medium", "w-52")}>{trans("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {#each interfaces as ifc (ifc.interface)}
                  {@const dev = getDev(ifc)}
                  {@const dtype = deviceTypeStr(ifc.l2_device?.name || ifc.device, dev)}
                  {@const Icon = deviceTypeIcon(dtype, ifc.up)}
                  {@const isDown = !ifc.up}
                  {@const isPending = ifc.pending || false}
                  {@const zone = getZoneName(ifc.interface)}
                  <tr class={cn("border-b", "border-border", "hover:bg-white/[0.02]", "transition-colors")}>
                    <td class={cn("p-3", "pr-2", "align-top")}>
                      <div
                        class={cn("ifacebox", "w-16")}
                        style="border-left: 3px solid {getZoneColor(ifc.interface)}"
                      >
                        <div class={cn("flex", "items-center", "gap-1.5", "px-1.5", "py-1")}>
                          <Icon size={14} class={ifc.up ? "text-accent" : "text-muted"} />
                          <span class={cn("text-[10px]", "font-semibold", "truncate")}>{ifc.interface}</span>
                        </div>
                        <div class={cn("px-1.5", "pb-1")}>
                          <span class={cn("text-[9px]", "text-muted")}>{ifc.l2_device?.name || ifc.device || "?"}</span>
                        </div>
                      </div>
                    </td>
                    <td class={cn("p-3", "pr-2")}>
                      <div class={cn("space-y-0.5")}>
                        <div class={cn("flex", "items-center", "gap-1.5")}>
                          <span class={cn("text-[10px]", "text-muted")}>{ifc.proto || "?"}</span>
                        </div>
                        {#if ifc.uptime}
                          <span class={cn("block", "text-[10px]", "text-muted")}>{fmtUptime(ifc.uptime)}</span>
                        {/if}
                        {#if dev?.carrier !== undefined}
                          <span class={cn("text-[10px]", dev.carrier ? "text-accent" : "text-danger")}>
                            {dev.carrier ? trans("Carrier up") : trans("No carrier")}
                          </span>
                        {/if}
                        {#if dev?.macaddr}
                          <span class={cn("block", "text-[10px]", "font-mono", "text-muted")}>{dev.macaddr}</span>
                        {/if}
                        {#if zone}
                          <span class={cn("text-[10px]", "text-accent")}>{zone}</span>
                        {/if}
                      </div>
                    </td>
                    <td class={cn("p-3", "pr-2")}>
                      <span class={cn("text-muted")}>{ifc.proto || "—"}</span>
                    </td>
                    <td class={cn("p-3", "pr-2")}>
                      <span class={cn("font-mono")}>{ifc.l2_device?.name || ifc.device || "—"}</span>
                    </td>
                    <td class={cn("p-3", "pr-2")}>
                      {#if getIfIpAddrs(ifc).length}
                        {#each getIfIpAddrs(ifc) as addr}
                          <span class={cn("block", "font-mono", "text-[11px]", "text-accent")}>{addr}</span>
                        {/each}
                      {:else}
                        <span class={cn("text-muted")}>—</span>
                      {/if}
                    </td>
                    <td class={cn("p-3", "pr-2")}>
                      {#if getIfIp6Addrs(ifc).length}
                        {#each getIfIp6Addrs(ifc) as addr}
                          <span class={cn("block", "font-mono", "text-[11px]")}>{addr}</span>
                        {/each}
                      {:else}
                        <span class={cn("text-muted")}>—</span>
                      {/if}
                    </td>
                    <td class={cn("p-3", "pr-2")}>
                      {#if dev?.statistics}
                        <span class={cn("block", "font-mono", "text-[11px]")}>{fmtBytes(dev.statistics.rx_bytes)}</span>
                        <span class={cn("block", "text-[10px]", "text-muted")}>{fmtPkts(dev.statistics.rx_packets)} pkts</span>
                      {:else}
                        <span class={cn("text-muted")}>—</span>
                      {/if}
                    </td>
                    <td class={cn("p-3", "pr-2")}>
                      {#if dev?.statistics}
                        <span class={cn("block", "font-mono", "text-[11px]")}>{fmtBytes(dev.statistics.tx_bytes)}</span>
                        <span class={cn("block", "text-[10px]", "text-muted")}>{fmtPkts(dev.statistics.tx_packets)} pkts</span>
                      {:else}
                        <span class={cn("text-muted")}>—</span>
                      {/if}
                    </td>
                    <td class={cn("p-3")}>
                      <div class={cn("flex", "items-center", "gap-1")}>
                        <!-- Restart — LuCI: disabled only when pending or busy -->
                        <button
                          onclick={() => ifaceUp(ifc.interface)}
                          disabled={btnBusy[ifc.interface] !== undefined || isPending}
                          class={cn("px-1.5", "py-1", "text-[10px]", "rounded-md", "font-medium", "transition-all", "cursor-pointer", "disabled:opacity-30", !isPending ? "text-accent bg-accent/10 border border-accent/20 hover:bg-accent/20" : "text-muted bg-surface border border-border")}
                          title={trans("Reconnect this interface")}
                        >
                          {#if btnBusy[ifc.interface] === "restart"}<RefreshCw size={10} class={cn("animate-spin")} />{:else}<Play size={10} />{/if}
                        </button>
                        <!-- Stop — LuCI: disabled when down or pending or busy -->
                        <button
                          onclick={() => ifaceDown(ifc.interface)}
                          disabled={btnBusy[ifc.interface] !== undefined || isDown || isPending}
                          class={cn("px-1.5", "py-1", "text-[10px]", "rounded-md", "font-medium", "transition-all", "cursor-pointer", "disabled:opacity-30", !isDown && !isPending ? "text-danger bg-danger/5 border border-danger/15 hover:bg-danger/15" : "text-muted bg-surface border border-border")}
                          title={trans("Shutdown this interface")}
                        >
                          {#if btnBusy[ifc.interface] === "stop"}<RefreshCw size={10} class={cn("animate-spin")} />{:else}<Square size={10} />{/if}
                        </button>
                        <!-- Edit — LuCI: always enabled -->
                        <button
                          onclick={() => openEdit(ifc.interface)}
                          class={cn("px-1.5", "py-1", "text-[10px]", "rounded-md", "font-medium", "transition-all", "cursor-pointer", "text-muted", "hover:text-fg", "hover:bg-white/5")}
                          title={trans("Edit this interface")}
                        >
                          <Pencil size={10} />
                        </button>
                        <!-- Delete — LuCI: enabled unless busy -->
                        <button
                          onclick={() => deleteInterface(ifc.interface)}
                          disabled={btnBusy[ifc.interface] !== undefined}
                          class={cn("px-1.5", "py-1", "text-[10px]", "rounded-md", "font-medium", "transition-all", "cursor-pointer", "disabled:opacity-30", "text-muted", "hover:text-danger", "hover:bg-danger/5")}
                          title={trans("Delete this interface")}
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>

    <!-- ════════ DEVICES ════════ -->
    {:else if mainTab === "devices"}
      <div class={cn("glass", "rounded-xl", "overflow-hidden")}>
        {#if loading}
          <div class={cn("p-8", "text-center")}><p class={cn("text-xs", "text-muted", "italic")}>{trans("Loading...")}</p></div>
        {:else}
          <div class={cn("overflow-x-auto")}>
            <table class={cn("w-full", "text-xs")}>
              <thead>
                <tr class={cn("text-left", "text-muted", "border-b", "border-border")}>
                  <th class={cn("p-3", "pr-2", "font-medium")}>{trans("Device")}</th>
                  <th class={cn("p-3", "pr-2", "font-medium")}>{trans("Type")}</th>
                  <th class={cn("p-3", "pr-2", "font-medium")}>{trans("Link Speed")}</th>
                  <th class={cn("p-3", "pr-2", "font-medium")}>{trans("MAC Address")}</th>
                  <th class={cn("p-3", "pr-2", "font-medium")}>{trans("MTU")}</th>
                  <th class={cn("p-3", "font-medium")}>{trans("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {#each Object.entries(devices) as [name, dev]}
                  {@const dtype = deviceTypeStr(name, dev)}
                  {@const Icon = deviceTypeIcon(dtype, dev.carrier)}
                  {@const hasUci = deviceUciSections.find((s) => s.name === name)}
                  <tr class={cn("border-b", "border-border", "hover:bg-white/[0.02]", "transition-colors")}>
                    <td class={cn("p-3", "pr-2")}>
                      <div class={cn("flex", "items-center", "gap-2")}>
                        <Icon size={14} class={dev.carrier ? "text-accent" : "text-muted"} />
                        <span class={cn("font-semibold", "font-mono", "text-fg")}>{name}</span>
                      </div>
                    </td>
                    <td class={cn("p-3", "pr-2", "text-muted")}>
                      {dev.type || "—"}
                    </td>
                    <td class={cn("p-3", "pr-2")}>
                      {#if dev.speed && dev.carrier}
                        <span>{dev.speed >= 1000 ? `${dev.speed / 1000} Gbit/s` : `${dev.speed} Mbit/s`}</span>
                        {#if dev["link-supported"]?.length}
                          <span class={cn("block", "text-[10px]", "text-muted")}>
                            {trans("Supported:")} {dev["link-supported"].map((s: string) => s.match(/^(\d+)base/)?.[1]).filter(Boolean).join(", ")}
                          </span>
                        {/if}
                      {:else if dev.carrier}
                        <span class={cn("text-muted")}>—</span>
                      {:else}
                        <span class={cn("text-muted")}>-</span>
                      {/if}
                    </td>
                    <td class={cn("p-3", "pr-2")}>
                      <span class={cn("font-mono", "text-[11px]")}>{dev.macaddr || "-"}</span>
                    </td>
                    <td class={cn("p-3", "pr-2")}>
                      <span class={cn("font-mono")}>{dev.mtu || "-"}</span>
                    </td>
                    <td class={cn("p-3")}>
                      <button
                        onclick={() => openDeviceEdit(hasUci ? hasUci[".name"] : name)}
                        class={cn("px-2", "py-1", "text-[10px]", "rounded-md", "font-medium", "transition-all", "cursor-pointer", "text-muted", "hover:text-fg", "hover:bg-white/5")}
                      >
                        {trans("Configure")}
                      </button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>

    <!-- ════════ GLOBAL ════════ -->
    {:else if mainTab === "global"}
      <div class={cn("glass", "rounded-xl", "p-5")}>
        <div class={cn("space-y-5")}>
          <div class={cn("flex", "items-center", "justify-between")}>
            <h3 class={cn("text-xs", "font-semibold", "text-fg")}>{trans("Global network options")}</h3>
            <button onclick={saveGlobal} disabled={globalSaving}
              class={cn("inline-flex", "items-center", "gap-1", "px-2.5", "py-1.5", "text-xs", "rounded-md", "font-medium", "text-surface", "bg-accent", "hover:bg-accent/90", "cursor-pointer", "transition-all", "disabled:opacity-30")}>
              {#if globalSaving}
                <RefreshCw size={14} class={cn("animate-spin")} />
              {:else}
                <Save size={14} />
              {/if}
              {trans("Save")}
            </button>
          </div>
          <div class={cn("space-y-4")}>
            <Input label={trans("IPv6 ULA-Prefix")} bind:value={globalForm.ula_prefix} placeholder="fd00::/48" mono />
            <Input label={trans("Default DUID")} bind:value={globalForm.dhcp_default_duid} placeholder="" mono />
            <Toggle label={trans("Multi-Path TCP")} description={trans("For packets originating from this device, e.g. VPN.")} bind:checked={globalForm.mptcp} />
            <Toggle label={trans("TCP Layer 3 Master Device (tcp_l3mdev) accept")} description={trans("TCP services running on this device in the default VRF context shall work across all VRF domains.")} bind:checked={globalForm.tcp_l3mdev} />
            <Toggle label={trans("UDP Layer 3 Master Device (udp_l3mdev) accept")} bind:checked={globalForm.udp_l3mdev} />
            <Select label={trans("Packet Steering")} options={[
              { value: "0", label: "Disabled" },
              { value: "1", label: "Enabled" },
              { value: "2", label: "Enabled (all CPUs)" },
            ]} bind:value={globalForm.packet_steering} />
          </div>
        </div>
      </div>
    {/if}
  {/key}
</div>

<!-- ════════ ADD NEW INTERFACE MODAL ════════ -->
{#if addingNewIface}
  <div class={cn("fixed", "inset-0", "z-50", "flex", "items-start", "justify-center", "pt-24")} onclick={() => { addingNewIface = false; }} role="dialog" aria-modal="true">
    <div class={cn("absolute", "inset-0", "bg-black/60", "backdrop-blur-sm")} />
    <div onclick={(e: MouseEvent) => e.stopPropagation()} class={cn("relative", "w-full", "max-w-md", "glass", "rounded-xl", "p-5", "animate-fade-in", "shadow-2xl")}>
      <div class={cn("flex", "items-center", "justify-between", "mb-4")}>
        <h2 class={cn("text-base", "font-semibold", "text-white")}>{trans("Add new interface...")}</h2>
        <button onclick={() => { addingNewIface = false; }} class={cn("p-1.5", "rounded-md", "hover:bg-white/5", "transition-colors", "text-muted", "hover:text-fg", "cursor-pointer")}><X size={16} /></button>
      </div>
      <div class={cn("space-y-4")}>
        <div>
          <Input label={trans("Name")} bind:value={newIfaceName} placeholder={trans("New interface name...")} />
          {#if newIfaceNameError}
            <p class={cn("text-[10px]", "text-red-400", "mt-1")}>{newIfaceNameError}</p>
          {/if}
        </div>
        <Select label={trans("Protocol")} options={protocols} bind:value={newIfaceProto} />
        <Input label={trans("Device")} bind:value={newIfaceDevice} placeholder="br-lan" mono />
      </div>
      <div class={cn("flex", "items-center", "justify-end", "gap-2", "mt-6", "pt-4", "border-t", "border-border")}>
        <button onclick={() => { addingNewIface = false; }} class={cn("px-3", "py-1.5", "text-xs", "rounded-md", "font-medium", "text-muted", "hover:text-fg", "border", "border-border", "hover:bg-white/5", "cursor-pointer", "transition-all")}>{trans("Cancel")}</button>
        <button onclick={addNewInterface} disabled={!newIfaceName} class={cn("px-3", "py-1.5", "text-xs", "rounded-md", "font-medium", "text-surface", "bg-accent", "hover:bg-accent/90", "cursor-pointer", "transition-all", "disabled:opacity-30")}>{trans("Create interface")}</button>
      </div>
    </div>
  </div>
{/if}

<!-- ════════ INTERFACE EDIT MODAL ════════ -->
{#if editingIface}
  {@const ifc = interfaces.find((i) => i.interface === editingIface)}
  {@const dev = ifc ? getDev(ifc) : null}
  {@const dtype = ifc ? deviceTypeStr(ifc.l2_device?.name || ifc.device, dev) : "ethernet"}
  {@const Icon = ifc ? deviceTypeIcon(dtype, ifc?.up || false) : Network}
  <div class={cn("fixed", "inset-0", "z-50", "flex", "items-start", "justify-center", "pt-12")} onclick={closeEdit} role="dialog" aria-modal="true">
    <div class={cn("absolute", "inset-0", "bg-black/60", "backdrop-blur-sm")} />
    <div onclick={(e: MouseEvent) => e.stopPropagation()} class={cn("relative", "w-full", "max-w-3xl", "max-h-[85vh]", "overflow-y-auto", "glass", "rounded-xl", "p-5", "animate-fade-in", "shadow-2xl")}>
      <div class={cn("flex", "items-center", "justify-between", "mb-4")}>
        <div class={cn("flex", "items-center", "gap-3")}>
          <Icon size={18} class={ifc?.up ? "text-accent" : "text-muted"} />
          <div>
            <h2 class={cn("text-base", "font-semibold", "text-white")}>{trans("Interfaces")} » <span class={cn("font-mono", "text-accent")}>{editingIface}</span></h2>
            <p class={cn("text-[11px]", ifc?.up ? "text-accent" : "text-muted", "mt-0.5")}>{ifc?.up ? trans("Interface is up") : trans("Interface is down")}</p>
          </div>
        </div>
        <button onclick={closeEdit} class={cn("p-1.5", "rounded-md", "hover:bg-white/5", "transition-colors", "text-muted", "hover:text-fg", "cursor-pointer")}><X size={16} /></button>
      </div>

      <TabBar tabs={editTabs} active={editTab} onchange={(id: string) => (editTab = id)} />

      <div class={cn("mt-4", "space-y-4")}>
        {#key editTab}
          <!-- ═══ GENERAL ═══ -->
          {#if editTab === "general"}
            <div class={cn("space-y-4")}>
              <div class={cn("flex", "items-start", "gap-3", "p-3", "rounded-lg", "bg-surface", "border", "border-border")}>
                <Icon size={24} class={ifc?.up ? "text-accent" : "text-muted"} />
                <div class={cn("flex-1", "min-w-0")}>
                  <div class={cn("grid", "grid-cols-2", "gap-x-6", "gap-y-1", "text-[11px]")}>
                    <span class={cn("text-muted")}>{trans("Protocol")}:</span>
                    <span class={cn("font-medium", "text-fg")}>{ifc?.proto || "—"}</span>
                    <span class={cn("text-muted")}>{trans("Device")}:</span>
                    <span class={cn("font-mono", "text-fg")}>{dev?.name || ifc?.l2_device?.name || ifc?.device || "—"}</span>
                    <span class={cn("text-muted")}>{trans("Carrier")}:</span>
                    <span class={dev?.carrier ? "text-accent" : "text-danger"}>{dev?.carrier ? trans("Present") : trans("Absent")}</span>
                    <span class={cn("text-muted")}>{trans("Uptime")}:</span>
                    <span class={cn("text-fg")}>{ifc?.uptime ? fmtUptime(ifc.uptime) : "—"}</span>
                    <span class={cn("text-muted")}>{trans("MAC Address")}:</span>
                    <span class={cn("font-mono", "text-fg")}>{dev?.macaddr || "—"}</span>
                    <span class={cn("text-muted")}>{trans("RX")}:</span>
                    <span class={cn("text-fg")}>{dev?.statistics ? `${fmtBytes(dev.statistics.rx_bytes)} (${fmtPkts(dev.statistics.rx_packets)} pkts)` : "—"}</span>
                    <span class={cn("text-muted")}>{trans("TX")}:</span>
                    <span class={cn("text-fg")}>{dev?.statistics ? `${fmtBytes(dev.statistics.tx_bytes)} (${fmtPkts(dev.statistics.tx_packets)} pkts)` : "—"}</span>
                    {#if getIfIpAddrs(ifc!).length}
                      <span class={cn("text-muted")}>{trans("IPv4")}:</span>
                      <span class={cn("font-mono", "text-fg")}>{getIfIpAddrs(ifc!).join(", ")}</span>
                    {/if}
                    {#if getIfIp6Addrs(ifc!).length}
                      <span class={cn("text-muted")}>{trans("IPv6")}:</span>
                      <span class={cn("font-mono", "text-fg")}>{getIfIp6Addrs(ifc!).join(", ")}</span>
                    {/if}
                  </div>
                </div>
              </div>

              <div class={cn("h-px", "bg-border")}></div>

              <Select label={trans("Protocol")} options={protocols} bind:value={editForm.proto} placeholder={trans("Select protocol")} />
              <Input label={trans("Device")} bind:value={editForm.device} placeholder="Select device..." mono />
              <div class={cn("space-y-2")}>
                <Toggle label={trans("Disable this interface")} bind:checked={editForm.disabled} />
                <Toggle label={trans("Bring up on boot")} bind:checked={editForm.auto} />
              </div>
              {#if editForm.proto === "static"}
                <div class={cn("h-px", "bg-border")}></div>
                <p class={cn("text-xs", "font-semibold", "text-fg", "mb-2")}>{trans("Protocol specific options")}</p>
                <div class={cn("grid", "grid-cols-2", "gap-4")}>
                  <Input label={trans("IPv4 address")} bind:value={editForm.ipaddr} placeholder="192.168.1.1" mono />
                  <Input label={trans("IPv4 netmask")} bind:value={editForm.netmask} placeholder="255.255.255.0" mono />
                </div>
                <div class={cn("grid", "grid-cols-2", "gap-4")}>
                  <Input label={trans("IPv4 gateway")} bind:value={editForm.gateway} placeholder="192.168.1.254" mono />
                  <Input label={trans("Broadcast")} bind:value={editForm.broadcast} placeholder="192.168.1.255" mono />
                </div>
              {/if}
            </div>

          <!-- ═══ ADVANCED ═══ -->
          {:else if editTab === "advanced"}
            <div class={cn("space-y-4")}>
              <div class={cn("h-px", "bg-border")}></div>
              <Toggle label={trans("Use default gateway")} description={trans("If unchecked, no default route is configured")} bind:checked={editForm.defaultroute} />
              {#if hasPeerDns(editForm.proto)}
                <Toggle label={trans("Use DNS servers advertised by peer")} description={trans("If unchecked, the advertised DNS server addresses are ignored")} bind:checked={editForm.peerdns} />
              {/if}
              <Input label={trans("Use custom DNS servers")} bind:value={editForm.dns} placeholder="192.168.1.1 8.8.8.8" mono />
              {#if hasPeerDns(editForm.proto)}
                <p class={cn("text-[10px]", "text-muted", "-mt-3")}>{trans("Only used if peer DNS is not used.")}</p>
              {/if}
              <div class={cn("grid", "grid-cols-2", "gap-4")}>
                <Input label={trans("DNS weight")} bind:value={editForm.dns_metric} placeholder="0" type="number" />
                <Input label={trans("Gateway metric")} bind:value={editForm.metric} placeholder="0" type="number" />
              </div>
              <Select label={trans("Multi-Path TCP")} options={multipathOptions} bind:value={editForm.multipath} placeholder={trans("Off")} />
              <Toggle label={trans("Delegate IPv6 prefixes")} description={trans("Enable downstream delegation of IPv6 prefixes available on this interface")} bind:checked={editForm.delegate} />
              <Toggle label={trans("Use builtin IPv6-management")} bind:checked={editForm.delegate} />
              <Toggle label={trans("Force link")} description={trans("Set interface properties regardless of the link carrier")} bind:checked={editForm.force_link} />
              {#if hasSourcefilter(editForm.proto)}
                <Toggle label={trans("IPv6 source routing")} description={trans("Automatically handle multiple uplink interfaces using source-based policy routing")} bind:checked={editForm.sourcefilter} />
              {/if}
              <div class={cn("grid", "grid-cols-2", "gap-4")}>
                <Input label={trans("Override IPv4 routing table")} bind:value={editForm.ip4table} placeholder="main" />
                <Input label={trans("Override IPv6 routing table")} bind:value={editForm.ip6table} placeholder="main" />
              </div>
              <div class={cn("h-px", "bg-border")}></div>
              <p class={cn("text-xs", "font-semibold", "text-fg")}>{trans("IPv6 Prefix delegation settings")}</p>
              <div class={cn("grid", "grid-cols-2", "gap-4")}>
                <Input label={trans("IPv6 assignment length")} bind:value={editForm.ip6assign} placeholder="64" type="number" />
                <Input label={trans("IPv6 assignment hint")} bind:value={editForm.ip6hint} placeholder="0" />
              </div>
              <Input label={trans("IPv6 prefix filter")} bind:value={editForm.ip6class} placeholder="local" mono />
              <Input label={trans("IPv6 suffix")} bind:value={editForm.ip6ifaceid} placeholder="::1" mono />
              <Input label={trans("IPv6 preference")} bind:value={editForm.ip6weight} placeholder="0" type="number" />
            </div>

          <!-- ═══ PHYSICAL ═══ -->
          {:else if editTab === "physical"}
            <div class={cn("space-y-4")}>
              <div class={cn("h-px", "bg-border")}></div>
              <Toggle label={trans("Bridge interfaces")} description={trans("Creates a bridge over specified interfaces")} bind:checked={editForm.bridge} />
              {#if editForm.bridge}
                <Input label={trans("Bridge ports")} bind:value={editForm.ports} placeholder="eth0 eth1" mono />
                <p class={cn("text-[10px]", "text-muted", "italic", "-mt-3")}>{trans("Space-separated list of interfaces to bridge")}</p>
              {:else}
                <Input label={trans("Device")} bind:value={editForm.device} placeholder="eth0.2" mono />
              {/if}
            </div>

          <!-- ═══ BRIDGE PORT ═══ -->
          {:else if editTab === "brport"}
            <div class={cn("space-y-4")}>
              {#if editForm.bridge}
                <div class={cn("h-px", "bg-border")}></div>
                <p class={cn("text-[10px]", "text-muted", "italic")}>{trans("Bridge port specific options control STP and bridge port behavior.")}</p>
                <div class={cn("grid", "grid-cols-2", "gap-4")}>
                  <Input label={trans("STP")} bind:value={editForm.stp} placeholder="0" type="number" />
                  <Input label={trans("Forward delay")} bind:value={editForm.forward_delay} placeholder="4" type="number" />
                </div>
                <div class={cn("grid", "grid-cols-2", "gap-4")}>
                  <Input label={trans("Priority")} bind:value={editForm.priority} placeholder="0x80" />
                  <Input label={trans("Ageing time")} bind:value={editForm.ageing_time} placeholder="300" type="number" />
                </div>
                <div class={cn("grid", "grid-cols-2", "gap-4")}>
                  <Input label={trans("Hello time")} bind:value={editForm.hello_time} placeholder="2" type="number" />
                  <Input label={trans("Max age")} bind:value={editForm.max_age} placeholder="20" type="number" />
                </div>
              {:else}
                <p class={cn("text-xs", "text-muted", "italic")}>{trans("Bridge port options are only available for bridge interfaces.")}</p>
              {/if}
            </div>

          <!-- ═══ BRIDGE VLAN ═══ -->
          {:else if editTab === "bridgevlan"}
            <div class={cn("space-y-4")}>
              {#if editForm.bridge}
                <div class={cn("h-px", "bg-border")}></div>
                <p class={cn("text-[10px]", "text-muted", "italic")}>{trans("Bridge VLAN filtering options.")}</p>
                <Input label={trans("VLAN filtering")} bind:value={editForm.vlan_filtering} placeholder="0" type="number" />
                <div class={cn("grid", "grid-cols-2", "gap-4")}>
                  <Input label={trans("Default PVID")} bind:value={editForm.vlan_default_pvid} placeholder="1" type="number" />
                  <Input label={trans("VLAN stats per port")} bind:value={editForm.vlan_stats_per_port} placeholder="0" type="number" />
                </div>
              {:else}
                <p class={cn("text-xs", "text-muted", "italic")}>{trans("Bridge VLAN filtering options are only available for bridge interfaces.")}</p>
              {/if}
            </div>

          <!-- ═══ FIREWALL ═══ -->
          {:else if editTab === "firewall"}
            <div class={cn("space-y-4")}>
              <div class={cn("h-px", "bg-border")}></div>
              <Select label={trans("Create / Assign firewall-zone")} options={zoneOptions} bind:value={editForm.zone} placeholder={trans("unspecified")} />
              <p class={cn("text-[10px]", "text-muted", "italic")}>{trans("Choose the firewall zone you want to assign to this interface. Select unspecified to remove the interface from the associated zone.")}</p>
            </div>

          <!-- ═══ DHCP ═══ -->
          {:else if editTab === "dhcp"}
            {@const dhcpSec = getDhcpSection(editingIface!)}
            <div class={cn("space-y-4")}>
              {#if dhcpSec}
                <TabBar tabs={dhcpSubTabs} active={dhcpSubTab} onchange={(id: string) => (dhcpSubTab = id)} />
                <div class={cn("h-px", "bg-border")}></div>
                {#key dhcpSubTab}
                  {#if dhcpSubTab === "general"}
                    <div class={cn("space-y-4")}>
                      <Toggle label={trans("Ignore interface")} description={trans("Disable DHCP for this interface (dnsmasq only)")} bind:checked={editForm.dhcp_ignore} />
                      {#if editForm.proto === "static"}
                        <Toggle label={trans("Dynamic DHCP")} description={trans("Dynamically allocate DHCP addresses for clients. If disabled, only clients having static leases will be served.")} bind:checked={editForm.dhcp_dynamicdhcp} />
                        <Select label={trans("Lease time")} options={leasetimeOptions} bind:value={editForm.dhcp_leasetime} />
                        <Toggle label={trans("Force")} description={trans("Force DHCP on this network even if another server is detected (dnsmasq only)")} bind:checked={editForm.dhcp_force} />
                        <Input label={trans("DHCP-Options")} bind:value={editForm.dhcp_option} placeholder="6,192.168.2.1,192.168.2.2" mono />
                        <p class={cn("text-[10px]", "text-muted", "italic", "-mt-3")}>{trans("Define additional DHCP options (dnsmasq only). Example: 6,192.168.2.1,192.168.2.2")}</p>
                        <Input label={trans("Force DHCP-Options")} bind:value={editForm.dhcp_option_force} placeholder="" mono />
                        <p class={cn("text-[10px]", "text-muted", "italic", "-mt-3")}>{trans("As DHCP-Options; send unsolicited (dnsmasq only).")}</p>
                      {/if}
                    </div>
                  {:else if dhcpSubTab === "ipv4"}
                    <div class={cn("space-y-4")}>
                      <Select label={trans("DHCPv4 Service")} options={dhcpv4Options} bind:value={editForm.dhcp_dhcpv4} placeholder={trans("disabled")} />
                      <Input label={trans("IPv6-Only Preferred")} bind:value={editForm.dhcp_ipv6_only_preferred} placeholder="0" type="number" />
                      <p class={cn("text-[10px]", "text-muted", "italic", "-mt-3")}>{trans("Specifies how often (in seconds) clients should check whether IPv6-only mode is still preferred (odhcpd only).")}</p>
                      {#if editForm.proto === "static"}
                        <div class={cn("grid", "grid-cols-2", "gap-4")}>
                          <Input label={trans("Start")} bind:value={editForm.dhcp_start} placeholder="100" type="number" />
                          <Input label={trans("Limit")} bind:value={editForm.dhcp_limit} placeholder="150" type="number" />
                        </div>
                        <Input label={trans("IPv4-Netmask")} bind:value={editForm.dhcp_netmask} placeholder="" mono />
                        <p class={cn("text-[10px]", "text-muted", "italic", "-mt-3")}>{trans("Override the netmask sent to clients. Normally it is calculated from the subnet that is served (dnsmasq only).")}</p>
                      {/if}
                    </div>
                  {:else if dhcpSubTab === "ipv6"}
                    <div class={cn("space-y-4")}>
                      <Toggle label={trans("Designated master")} description={trans("Set this interface as master for RA and DHCPv6 relaying as well as NDP proxying.")} bind:checked={editForm.dhcp_master} />
                      <Select label={trans("RA-Service")} options={raServiceOptions} bind:value={editForm.dhcp_ra} placeholder={trans("disabled")} />
                      <Select label={trans("DHCPv6-Service")} options={dhcpv6ServiceOptions} bind:value={editForm.dhcp_dhcpv6} placeholder={trans("disabled")} />
                      <Input label={trans("Announce IPv4/6 DNS servers")} bind:value={editForm.dhcp_dns} placeholder="2001:db8::53 192.168.1.53" mono />
                      <p class={cn("text-[10px]", "text-muted", "italic", "-mt-3")}>{trans("If left unspecified, the device will announce itself as DNS server.")}</p>
                      <Toggle label={trans("Local IPv6 DNS server")} description={trans("Announce this device as IPv6 DNS server.")} bind:checked={editForm.dhcp_dns_service} />
                      <Input label={trans("Announce DNS domains")} bind:value={editForm.dhcp_domain} placeholder="example.com" mono />
                      <Input label={trans("Announce encrypted DNS servers (DNR)")} bind:value={editForm.dhcp_dnr} placeholder="100 dns.example.com 2001:db8::53" mono />
                      <p class={cn("text-[10px]", "text-muted", "italic", "-mt-3")}>{trans("Syntax: <numeric priority> <domain-name> [IP,...] [SVC parameter ...]")}</p>
                      <Select label={trans("NDP-Proxy")} options={ndpProxyOptions} bind:value={editForm.dhcp_ndp} placeholder={trans("disabled")} />
                      <Toggle label={trans("Learn routes")} description={trans("Set up routes for proxied IPv6 neighbours.")} bind:checked={editForm.dhcp_ndproxy_routing} />
                      <Toggle label={trans("NDP-Proxy slave")} description={trans("Set interface as NDP-Proxy external slave.")} bind:checked={editForm.dhcp_ndproxy_slave} />
                    </div>
                  {:else if dhcpSubTab === "dhcpv6"}
                    <div class={cn("space-y-4")}>
                      <Toggle label={trans("DHCPv6-PD")} description={trans("Toggle IPv6 PD via DHCPv6.")} bind:checked={editForm.dhcp_dhcpv6_pd} />
                      <Input label={trans("PD minimum length")} bind:value={editForm.dhcp_dhcpv6_pd_min_len} placeholder="62" type="number" />
                      <p class={cn("text-[10px]", "text-muted", "italic", "-mt-3")}>{trans("Minimum delegated prefix length assigned to a requesting downstream router.")}</p>
                      <Input label={trans("NTP Servers")} bind:value={editForm.dhcp_ntp} placeholder="2001:db8::1" mono />
                      <p class={cn("text-[10px]", "text-muted", "italic", "-mt-3")}>{trans("DHCPv6 option 56.")}</p>
                    </div>
                  {:else if dhcpSubTab === "ipv6-ra"}
                    <div class={cn("space-y-4")}>
                      <Select label={trans("Default router")} options={raDefaultOptions} bind:value={editForm.dhcp_ra_default} placeholder={trans("automatic")} />
                      <Toggle label={trans("Enable SLAAC")} description={trans("Set the autonomous address-configuration flag in RA prefix information options.")} bind:checked={editForm.dhcp_ra_slaac} />
                      <Select label={trans("Router Priority")} options={raPreferenceOptions} bind:value={editForm.dhcp_ra_preference} />
                      <div>
                        <span class={cn("block", "text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider", "mb-1.5")}>{trans("RA Flags")}</span>
                        <div class={cn("space-y-1")}>
                          {#each raFlagsOptions as opt}
                            <label class={cn("flex", "items-center", "gap-2", "cursor-pointer")}>
                              <input type="checkbox"
                                checked={Array.isArray(editForm.dhcp_ra_flags) ? editForm.dhcp_ra_flags.includes(opt.value) : String(editForm.dhcp_ra_flags || "").includes(opt.value)}
                                onchange={(e) => {
                                  const checked = (e.target as HTMLInputElement).checked;
                                  let flags = Array.isArray(editForm.dhcp_ra_flags) ? [...editForm.dhcp_ra_flags] : [];
                                  if (checked) { if (!flags.includes(opt.value)) flags.push(opt.value); }
                                  else { flags = flags.filter((f: string) => f !== opt.value); }
                                  editForm.dhcp_ra_flags = flags;
                                }}
                                class={cn("accent-(--accent)", "w-3.5", "h-3.5", "rounded", "cursor-pointer")} />
                              <span class={cn("text-xs", "text-fg")}>{opt.label}</span>
                            </label>
                          {/each}
                        </div>
                      </div>
                      <div>
                        <span class={cn("block", "text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider", "mb-1.5")}>{trans("RA PIO Flags")}</span>
                        <div class={cn("space-y-1")}>
                          {#each raPioFlagsOptions as opt}
                            <label class={cn("flex", "items-center", "gap-2", "cursor-pointer")}>
                              <input type="checkbox"
                                checked={Array.isArray(editForm.dhcp_ra_pio_flags) ? editForm.dhcp_ra_pio_flags.includes(opt.value) : false}
                                onchange={(e) => {
                                  const checked = (e.target as HTMLInputElement).checked;
                                  let flags = Array.isArray(editForm.dhcp_ra_pio_flags) ? [...editForm.dhcp_ra_pio_flags] : [];
                                  if (checked) { if (!flags.includes(opt.value)) flags.push(opt.value); }
                                  else { flags = flags.filter((f: string) => f !== opt.value); }
                                  editForm.dhcp_ra_pio_flags = flags;
                                }}
                                class={cn("accent-(--accent)", "w-3.5", "h-3.5", "rounded", "cursor-pointer")} />
                              <span class={cn("text-xs", "text-fg")}>{opt.label}</span>
                            </label>
                          {/each}
                        </div>
                      </div>
                      <Input label={trans("NAT64 prefix")} bind:value={editForm.dhcp_ra_pref64} placeholder="64:ff9b::/96" mono />
                      <div class={cn("grid", "grid-cols-2", "gap-4")}>
                        <Input label={trans("Max RA interval")} bind:value={editForm.dhcp_ra_maxinterval} placeholder="600" type="number" />
                        <Input label={trans("Min RA interval")} bind:value={editForm.dhcp_ra_mininterval} placeholder="200" type="number" />
                      </div>
                      <div class={cn("grid", "grid-cols-2", "gap-4")}>
                        <Input label={trans("RA Reachability Timer")} bind:value={editForm.dhcp_ra_reachabletime} placeholder="0" type="number" />
                        <Input label={trans("RA Retransmission Timer")} bind:value={editForm.dhcp_ra_retranstime} placeholder="0" type="number" />
                      </div>
                      <Input label={trans("RA Lifetime")} bind:value={editForm.dhcp_ra_lifetime} placeholder="2700" type="number" />
                      <div class={cn("grid", "grid-cols-2", "gap-4")}>
                        <Input label={trans("RA MTU")} bind:value={editForm.dhcp_ra_mtu} placeholder="1500" type="number" />
                        <Input label={trans("RA Hop Limit")} bind:value={editForm.dhcp_ra_hoplimit} placeholder="64" type="number" />
                      </div>
                      <Select label={trans("IPv6 Preferred Prefix Lifetime")} options={lifetimeOptions} bind:value={editForm.dhcp_max_preferred_lifetime} placeholder="45m" />
                      <Select label={trans("IPv6 Valid Prefix Lifetime")} options={lifetimeOptions} bind:value={editForm.dhcp_max_valid_lifetime} placeholder="90m" />
                    </div>
                  {/if}
                {/key}
              {:else}
                <p class={cn("text-xs", "text-muted", "italic")}>{trans("No DHCP Server configured for this interface.")}</p>
                <button
                  onclick={async () => {
                    if (!editingIface) return;
                    await call("uci", "add", { config: "dhcp", type: "dhcp", name: editingIface });
                    await call("uci", "set", { config: "dhcp", section: editingIface, values: { interface: editingIface } });
                    if (editForm.proto === "static") {
                      await call("uci", "set", { config: "dhcp", section: editingIface, values: { start: "100", limit: "150", leasetime: "12h", dhcpv4: "server" } });
                    } else {
                      await call("uci", "set", { config: "dhcp", section: editingIface, values: { ignore: "1" } });
                    }
                    await uciCommit("dhcp");
                    const dhcp = await call("uci", "get", { config: "dhcp" });
                    if (dhcp?.values) dhcpConfig = dhcp.values;
                    editForm.dhcp_ignore = editForm.proto !== "static";
                  }}
                  class={cn("px-3", "py-1.5", "text-xs", "rounded-md", "font-medium", "text-surface", "bg-accent", "hover:bg-accent/90", "cursor-pointer", "transition-all")}
                >
                  {trans("Set up DHCP Server")}
                </button>
              {/if}
            </div>
          {/if}
        {/key}
      </div>

      <div class={cn("flex", "items-center", "justify-end", "gap-2", "mt-6", "pt-4", "border-t", "border-border")}>
        {#if editSaved}
          <span class={cn("text-xs", "text-accent", "font-medium")}>{trans("Settings saved!")}</span>
        {/if}
        <button onclick={closeEdit} class={cn("px-3", "py-1.5", "text-xs", "rounded-md", "font-medium", "text-muted", "hover:text-fg", "border", "border-border", "hover:bg-white/5", "cursor-pointer", "transition-all")}>{trans("Cancel")}</button>
        <button onclick={saveEdit} class={cn("inline-flex", "items-center", "gap-1.5", "px-3", "py-1.5", "text-xs", "rounded-md", "font-medium", "text-surface", "bg-accent", "hover:bg-accent/90", "cursor-pointer", "transition-all")}>
          <Save size={14} /> {trans("Save")}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- ════════ DEVICE EDIT MODAL ════════ -->
{#if editingDevice}
  <div class={cn("fixed", "inset-0", "z-50", "flex", "items-start", "justify-center", "pt-24")} onclick={closeDeviceEdit} role="dialog" aria-modal="true">
    <div class={cn("absolute", "inset-0", "bg-black/60", "backdrop-blur-sm")} />
    <div onclick={(e: MouseEvent) => e.stopPropagation()} class={cn("relative", "w-full", "max-w-lg", "glass", "rounded-xl", "p-5", "animate-fade-in", "shadow-2xl")}>
      <div class={cn("flex", "items-center", "justify-between", "mb-4")}>
        <h2 class={cn("text-base", "font-semibold", "text-white")}>{trans("Configure Device")}: <span class={cn("font-mono", "text-accent")}>{editingDevice}</span></h2>
        <button onclick={closeDeviceEdit} class={cn("p-1.5", "rounded-md", "hover:bg-white/5", "transition-colors", "text-muted", "hover:text-fg", "cursor-pointer")}><X size={16} /></button>
      </div>
      <div class={cn("space-y-4")}>
        <Select label={trans("Type")} options={deviceTypeOptions} bind:value={deviceEditForm.type} />
        <Input label={trans("MTU")} bind:value={deviceEditForm.mtu} placeholder="" type="number" />
        <Input label={trans("MAC Address")} bind:value={deviceEditForm.macaddr} placeholder="" mono />
        {#if deviceEditForm.type === "bridge"}
          <Input label={trans("Ports")} bind:value={deviceEditForm.ports} placeholder="eth0 eth1" mono />
          <div class={cn("grid", "grid-cols-2", "gap-4")}>
            <Input label={trans("STP")} bind:value={deviceEditForm.stp} placeholder="0" type="number" />
            <Input label={trans("Forward delay")} bind:value={deviceEditForm.forward_delay} placeholder="4" type="number" />
          </div>
          <div class={cn("grid", "grid-cols-2", "gap-4")}>
            <Input label={trans("Priority")} bind:value={deviceEditForm.priority} placeholder="0x80" />
            <Input label={trans("Ageing time")} bind:value={deviceEditForm.ageing_time} placeholder="300" type="number" />
          </div>
          <div class={cn("grid", "grid-cols-2", "gap-4")}>
            <Input label={trans("Hello time")} bind:value={deviceEditForm.hello_time} placeholder="2" type="number" />
            <Input label={trans("Max age")} bind:value={deviceEditForm.max_age} placeholder="20" type="number" />
          </div>
          <Input label={trans("IGMP snooping")} bind:value={deviceEditForm.igmp_snooping} placeholder="0" type="number" />
          <Input label={trans("VLAN filtering")} bind:value={deviceEditForm.vlan_filtering} placeholder="0" type="number" />
          <div class={cn("grid", "grid-cols-2", "gap-4")}>
            <Input label={trans("Default PVID")} bind:value={deviceEditForm.vlan_default_pvid} placeholder="1" type="number" />
            <Input label={trans("VLAN stats per port")} bind:value={deviceEditForm.vlan_stats_per_port} placeholder="0" type="number" />
          </div>
        {/if}
        <div class={cn("grid", "grid-cols-2", "gap-4")}>
          <Input label={trans("Override IPv4 routing table")} bind:value={deviceEditForm.ip4table} placeholder="main" />
          <Input label={trans("Override IPv6 routing table")} bind:value={deviceEditForm.ip6table} placeholder="main" />
        </div>
      </div>
      <div class={cn("flex", "items-center", "justify-end", "gap-2", "mt-6", "pt-4", "border-t", "border-border")}>
        <button onclick={closeDeviceEdit} class={cn("px-3", "py-1.5", "text-xs", "rounded-md", "font-medium", "text-muted", "hover:text-fg", "border", "border-border", "hover:bg-white/5", "cursor-pointer", "transition-all")}>{trans("Cancel")}</button>
        <button onclick={saveDevice} class={cn("inline-flex", "items-center", "gap-1.5", "px-3", "py-1.5", "text-xs", "rounded-md", "font-medium", "text-surface", "bg-accent", "hover:bg-accent/90", "cursor-pointer", "transition-all")}>
          <Save size={14} /> {trans("Save")}
        </button>
      </div>
    </div>
  </div>
{/if}
