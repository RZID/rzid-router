export const parsePath = (
  path: string,
): { view: string; sub?: string; redirect?: string } => {
  const map: Record<string, { view: string; sub?: string; redirect?: string }> =
    {
      "/": { view: "dashboard" },
      "/status/overview": { view: "dashboard" },
      "/status/routing": { view: "routes" },
      "/status/firewall": { view: "firewall-status" },
      "/status/syslog": { view: "syslog" },
      "/status/processes": { view: "processes" },
      "/status/realtime": {
        view: "realtime",
        sub: "bandwidth",
        redirect: "/status/realtime/bandwidth",
      },
      "/status/realtime/bandwidth": { view: "realtime", sub: "bandwidth" },
      "/status/realtime/load": { view: "realtime", sub: "load" },
      "/status/realtime/connections": { view: "realtime", sub: "connections" },
      "/network": { view: "network" },
      "/network/interfaces": { view: "network" },
      "/network/routing": { view: "network-routes" },
      "/network/dhcp": { view: "dhcp" },
      "/network/dns": { view: "dns" },
      "/network/diagnostics": { view: "diagnostics" },
      "/services": { view: "services" },
      "/services/ddns": { view: "ddns" },
      "/services/adguard": { view: "adguard" },
      "/services/banip": { view: "banip" },
      "/services/upnp": { view: "upnp" },
      "/system": { view: "system" },
      "/system/system": { view: "system" },
      "/system/admin": { view: "admin" },
      "/system/software": { view: "software" },
      "/system/startup": { view: "startup" },
      "/system/crontab": { view: "crontab" },
      "/system/flash": { view: "flash" },
    };
  return map[path] || { view: "dashboard" };
};

export const buildPath = (view: string, sub?: string): string => {
  const map: Record<string, string> = {
    dashboard: "/status/overview",
    routes: "/status/routing",
    "firewall-status": "/status/firewall",
    syslog: "/status/syslog",
    processes: "/status/processes",
    realtime: sub ? `/status/realtime/${sub}` : "/status/realtime/bandwidth",
    services: "/services",
    network: "/network",
    "network-routes": "/network/routing",
    dhcp: "/network/dhcp",
    dns: "/network/dns",
    diagnostics: "/network/diagnostics",
    ddns: "/services/ddns",
    adguard: "/services/adguard",
    banip: "/services/banip",
    upnp: "/services/upnp",
    system: "/system",
    admin: "/system/admin",
    software: "/system/software",
    startup: "/system/startup",
    crontab: "/system/crontab",
    flash: "/system/flash",
  };
  return map[view] || "/";
};
