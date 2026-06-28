import { Layers, LayoutDashboard, Network, Settings } from "@lucide/svelte";

export const nav: {
  label: string;
  icon: typeof LayoutDashboard;
  children: { id: string; label: string }[];
}[] = [
  {
    label: "Status",
    icon: LayoutDashboard,
    children: [
      { id: "dashboard", label: "Overview" },
      { id: "routes", label: "Routing" },
      { id: "firewall-status", label: "Firewall" },
      { id: "syslog", label: "System Log" },
      { id: "processes", label: "Processes" },
      { id: "realtime", label: "Realtime Graphs" },
    ],
  },
  {
    label: "System",
    icon: Settings,
    children: [
      { id: "system", label: "System" },
      { id: "admin", label: "Administration" },
      { id: "software", label: "Software" },
      { id: "startup", label: "Startup" },
      { id: "crontab", label: "Scheduled Tasks" },
      { id: "flash", label: "Backup / Flash" },
    ],
  },
  {
    label: "Network",
    icon: Network,
    children: [
      { id: "network", label: "Interfaces" },
      { id: "network-routes", label: "Routing" },
      { id: "dhcp", label: "DHCP" },
      { id: "dns", label: "DNS" },
      { id: "diagnostics", label: "Diagnostics" },
    ],
  },
  {
    label: "Services",
    icon: Layers,
    children: [
      { id: "services", label: "Services" },
      { id: "ddns", label: "Dynamic DNS" },
      { id: "adguard", label: "AdGuard Home" },
      { id: "banip", label: "banIP" },
      { id: "ttyd", label: "Terminal" },
      { id: "upnp", label: "UPnP" },
    ],
  },
];
