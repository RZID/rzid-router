import { call } from "./session";
import { execCommand } from "./exec";
import type { JsonValue } from "../types";

export const getSystemInfo = async () => call("system", "info", {});
export const getNetworkInterfaces = async () => call("network.interface", "dump", {});
export const getDHCPLeases = async () => call("dhcp", "ipv4leases", {});
export const rcList = async (name: string) => call<Record<string, JsonValue>>("rc", "list", { name });
export const rcInit = async (name: string, action: string) => call("rc", "init", { name, action });

export const getTimezones = async () => {
  const res = await call<Record<string, { tzstring: string }>>("luci", "getTimezones", {});
  if (res && typeof res === "object" && Object.keys(res).length > 0) return res;
  const old = await call<{ result?: Record<string, { tzstring: string }> }>("luci", "timezone", {});
  return old?.result ?? null;
};

export const getUnixtime = async () => {
  const res = await call<{ result: number }>("luci", "getUnixtime", {});
  return res?.result ?? null;
};

export const getSystemFeatures = async () => call<Record<string, JsonValue>>("luci", "getFeatures", {});
export const serviceRestart = async (name: string) => call("file", "exec", { command: `/etc/init.d/${name}`, params: ["restart"] });

export const getBandwidth = async () => {
  const res = await call<{ stdout: string }>("file", "exec", { command: "cat", params: ["/proc/net/dev"] });
  if (!res?.stdout) return null;
  const lines = res.stdout.split("\n").slice(2);
  const stats: Record<string, { rx: number; tx: number }> = {};
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 10) continue;
    const iface = parts[0].replace(":", "");
    stats[iface] = { rx: parseInt(parts[1]), tx: parseInt(parts[9]) };
  }
  return stats;
};

export const getRealtimeStats = async (mode: "interface" | "load" | "conntrack" | "wireless", device?: string): Promise<number[][] | null> => {
  const params: Record<string, string> = { mode };
  if (device) params.device = device;
  const res = await call<{ result: number[][] }>("luci", "getRealtimeStats", params);
  return res?.result ?? null;
};

export type ConntrackEntry = { layer4: string };

export const getConntrackList = async (): Promise<ConntrackEntry[] | null> => {
  const res = await call<{ result: ConntrackEntry[] }>("luci", "getConntrackList", {});
  return res?.result ?? null;
};

export type ConntrackMetrics = { udp: number; tcp: number; other: number };

export const fetchConntrackMetrics = async (): Promise<ConntrackMetrics | null> => {
  const stats = await getRealtimeStats("conntrack");
  if (stats?.length) {
    const latest = stats[stats.length - 1];
    if (latest.length >= 4) return { udp: latest[1], tcp: latest[2], other: latest[3] };
  }
  const list = await getConntrackList();
  if (list) {
    const udp = list.filter((c: ConntrackEntry) => c.layer4 === "udp").length;
    const tcp = list.filter((c: ConntrackEntry) => c.layer4 === "tcp").length;
    return { udp, tcp, other: list.length - udp - tcp };
  }
  for (const cmd of [
    ["/bin/cat", "/proc/sys/net/netfilter/nf_conntrack_count"],
    ["/bin/cat", "/proc/sys/net/ipv4/netfilter/ip_conntrack_count"],
    ["/sbin/sysctl", "-n", "net.netfilter.nf_conntrack_count"],
    ["/usr/sbin/conntrack", "-C"],
  ] as [string, ...string[]][]) {
    const res = await execCommand(cmd[0], cmd.slice(1));
    if (res?.stdout) {
      const s = res.stdout.trim().split(/\s+/)[0];
      const n = parseInt(s);
      if (!isNaN(n)) return { udp: 0, tcp: n, other: 0 };
    }
  }
  return null;
};

export const getConntrackCount = async (): Promise<number | null> => {
  const m = await fetchConntrackMetrics();
  return m ? m.tcp + m.udp + m.other : null;
};

export type Process = { PID: string; PPID: string; USER: string; STAT: string; VSZ: string; "%MEM": string; "%CPU": string; COMMAND: string };

const parseTopOutput = (stdout: string): Process[] => {
  const lines = stdout.trim().split("\n");
  const list: Process[] = [];
  let inTable = false;
  for (const line of lines) {
    if (/^  PID /.test(line)) { inTable = true; continue; }
    if (!inTable) continue;
    if (/^\s*$/.test(line)) continue;
    const m = line.match(/^\s*(\d+)\s+(\d+)\s+(.+?)\s+([RSDZTWI][<NW ]?[<N ]?)\s+(\S+)\s+(\S+%?)\s+(\S+%?)\s+(.+)$/);
    if (m && m[8] !== "/bin/busybox top -bn1" && m[8] !== "busybox top -bn1") {
      list.push({ PID: m[1], PPID: m[2], USER: m[3].trim(), STAT: m[4], VSZ: m[5], "%MEM": m[6], "%CPU": m[7], COMMAND: m[8] });
    }
  }
  return list;
};

export const getProcessList = async (): Promise<Process[] | null> => {
  const ubus = await call<{ result: Process[] }>("luci", "getProcessList", {});
  if (ubus?.result) return ubus.result;
  const top = await execCommand("/bin/busybox", ["top", "-bn1"]);
  if (top?.stdout) return parseTopOutput(top.stdout);
  const top2 = await execCommand("top", ["-bn1"]);
  return top2?.stdout ? parseTopOutput(top2.stdout) : null;
};

export const killProcess = async (pid: string, signal: number) => execCommand("/bin/kill", [`-${signal}`, pid]);

export const setPassword = async (username = "root", password: string, oldpassword = "", rpcd = false) =>
  call<{ result: number | boolean }>("luci", "setPassword", { username, password, oldpassword, rpcd });

export const getAdGuardStats = async (host = "http://10.10.0.1:3000", username = "admin", password = "") => {
  try {
    const res = await fetch(`${host}/control/stats`, { headers: { Authorization: "Basic " + btoa(`${username}:${password}`) } });
    return res.ok ? res.json() : null;
  } catch { return null; }
};
