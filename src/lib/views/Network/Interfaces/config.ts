export const mainTabs = [
  { id: "interfaces", label: "Interfaces" },
  { id: "devices", label: "Devices" },
  { id: "global", label: "Global" },
];

export const editTabs = [
  { id: "general", label: "General Settings" },
  { id: "advanced", label: "Advanced Settings" },
  { id: "physical", label: "Physical Settings" },
  { id: "brport", label: "Bridge port specific options" },
  { id: "bridgevlan", label: "Bridge VLAN filtering" },
  { id: "firewall", label: "Firewall Settings" },
  { id: "dhcp", label: "DHCP Server" },
];

export const protocols = [
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

export const deviceTypeOptions = [
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

export const raServiceOptions = [
  { value: "", label: "disabled" },
  { value: "server", label: "server mode" },
  { value: "relay", label: "relay mode" },
  { value: "hybrid", label: "hybrid mode" },
];

export const dhcpv6ServiceOptions = [
  { value: "", label: "disabled" },
  { value: "server", label: "server mode" },
  { value: "relay", label: "relay mode" },
  { value: "hybrid", label: "hybrid mode" },
];

export const ndpProxyOptions = [
  { value: "", label: "disabled" },
  { value: "relay", label: "relay mode" },
  { value: "hybrid", label: "hybrid mode" },
];

export const dhcpv4Options = [
  { value: "", label: "disabled" },
  { value: "server", label: "enabled" },
];

export const multipathOptions = [
  { value: "", label: "Off" },
  { value: "on", label: "On" },
  { value: "master", label: "Master" },
  { value: "backup", label: "Backup" },
  { value: "handover", label: "Handover" },
];

export const raDefaultOptions = [
  { value: "", label: "automatic" },
  { value: "1", label: "on available prefix" },
  { value: "2", label: "forced" },
];

export const raPreferenceOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export const raFlagsOptions = [
  { value: "managed-config", label: "managed config (M)" },
  { value: "other-config", label: "other config (O)" },
  { value: "home-agent", label: "mobile home agent (H)" },
];

export const raPioFlagsOptions = [
  { value: "pd", label: "prefix delegation (PD) preferred (P)" },
];

export const lifetimeOptions = [
  { value: "5m", label: "5m (5 minutes)" },
  { value: "45m", label: "45m (45 minutes - default)" },
  { value: "3h", label: "3h (3 hours)" },
  { value: "12h", label: "12h (12 hours)" },
  { value: "7d", label: "7d (7 days)" },
];

export const leasetimeOptions = [
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
