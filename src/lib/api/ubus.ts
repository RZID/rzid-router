const BASE = import.meta.env.DEV ? "http://10.10.0.1" : "";
const UBUS_URL = BASE + "/ubus";

let sessionId = "00000000000000000000000000000000";

export const login = async (password: string): Promise<boolean> => {
  const res = await fetch(UBUS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "call",
      params: [sessionId, "session", "login", { username: "root", password }],
    }),
  });
  const data = await res.json();
  if (data.result?.[0] === 0) {
    sessionId = data.result[1].ubus_rpc_session;
    localStorage.setItem("owrt_session", sessionId);
    return true;
  }
  return false;
};

export const restoreSession = () => {
  const saved = localStorage.getItem("owrt_session");
  if (saved) sessionId = saved;
};

export const logout = () => {
  sessionId = "00000000000000000000000000000000";
  localStorage.removeItem("owrt_session");
};

export const call = async <T = any>(
  object: string,
  method: string,
  params: Record<string, any> = {},
): Promise<T | null> => {
  try {
    const res = await fetch(UBUS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "call",
        params: [sessionId, object, method, params],
      }),
    });
    const data = await res.json();
    if (data.error?.code === -32002) { logout(); location.href = "/"; return null; }
    if (data.result?.[0] === 0) return data.result[1];
    return null;
  } catch {
    return null;
  }
};

type BatchItem = {
  object: string;
  method: string;
  params?: Record<string, any>;
};
type BatchResult<T> = T | null;

export const batchCall = async <T = any>(
  calls: BatchItem[],
): Promise<BatchResult<T>[]> => {
  try {
    const res = await fetch(UBUS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        calls.map((c, i) => ({
          jsonrpc: "2.0",
          id: i + 1,
          method: "call",
          params: [sessionId, c.object, c.method, c.params || {}],
        })),
      ),
    });
    const results = await res.json();
    if (!Array.isArray(results)) return calls.map(() => null);
    if (results.some((r: any) => r.error?.code === -32002)) { logout(); location.href = "/"; return calls.map(() => null); }
    return results.map((r: any) => (r.result?.[0] === 0 ? r.result[1] : null));
  } catch {
    return calls.map(() => null);
  }
};

export const getSystemInfo = async () => {
  return call("system", "info", {});
};

export const getNetworkInterfaces = async () => {
  return call("network.interface", "dump", {});
};

export const getDHCPLeases = async () => {
  return call("dhcp", "ipv4leases", {});
};

export const uciGet = async (config: string) => {
  return call("uci", "get", { config });
};

export const uciSet = async (
  config: string,
  section: string,
  values: Record<string, any>,
) => {
  await call("uci", "set", { config, section, values });
  return call("uci", "commit", { config });
};

export const uciSetSection = async (
  config: string,
  section: string,
  values: Record<string, any>,
) => {
  return call("uci", "set", { config, section, values });
};

export const uciCommit = async (config: string) => {
  return call("uci", "commit", { config });
};

export const uciAdd = async (config: string, type: string, name?: string) => {
  const p: Record<string, any> = { config, type };
  if (name) p.name = name;
  return call("uci", "add", p);
};

export const rcList = async (name: string) => {
  return call<Record<string, any>>("rc", "list", { name });
};

export const rcInit = async (name: string, action: string) => {
  return call("rc", "init", { name, action });
};

export const getTimezones = async () => {
  const res = await call<Record<string, { tzstring: string }>>(
    "luci", "getTimezones", {},
  );
  if (res && typeof res === "object" && Object.keys(res).length > 0) return res;

  const old = await call<{ result?: Record<string, { tzstring: string }> }>(
    "luci", "timezone", {},
  );
  if (old?.result) return old.result;

  return null;
};

export const getUnixtime = async () => {
  const res = await call<{ result: number }>("luci", "getUnixtime", {});
  return res?.result ?? null;
};

export const getSystemFeatures = async () => {
  return call<Record<string, any>>("luci", "getFeatures", {});
};

export const serviceRestart = async (name: string) => {
  return call("file", "exec", {
    command: `/etc/init.d/${name}`,
    params: ["restart"],
  });
};

export const execCommand = async (command: string, params: string[] = []) => {
  return call<{ stdout: string; stderr?: string; code?: number }>(
    "file",
    "exec",
    {
      command,
      params,
    },
  );
};

export type LogEntry = { time?: number; priority?: number; msg?: string };

export const readLogEntries = async (
  lines = 1000,
): Promise<LogEntry[] | null> => {
  const res = await call<{ log?: LogEntry[] }>("log", "read", {
    lines,
    stream: false,
    oneshot: true,
  });
  if (res?.log) return res.log;

  for (const cmd of ["/sbin/logread", "/usr/sbin/logread"]) {
    const raw = await execCommand(cmd, ["-l", String(lines)]);
    if (raw?.stdout) {
      return raw.stdout
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => ({ msg: line }));
    }
  }

  const wrapper = await execCommand("/usr/libexec/syslog-wrapper", []);
  if (wrapper?.stdout) {
    return wrapper.stdout
      .trim()
      .split("\n")
      .filter(Boolean)
      .slice(-lines)
      .map((line) => ({ msg: line }));
  }

  return null;
};

export const readDmesg = async () => {
  return execCommand("/bin/dmesg", ["-r"]);
};

export const getBandwidth = async () => {
  const res = await call<{ stdout: string }>("file", "exec", {
    command: "cat",
    params: ["/proc/net/dev"],
  });
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

export const getRealtimeStats = async (
  mode: "interface" | "load" | "conntrack" | "wireless",
  device?: string,
): Promise<number[][] | null> => {
  const params: Record<string, string> = { mode };
  if (device) params.device = device;
  const res = await call<{ result: number[][] }>("luci", "getRealtimeStats", params);
  return res?.result ?? null;
};

export const getConntrackList = async (): Promise<any[] | null> => {
  const res = await call<{ result: any[] }>("luci", "getConntrackList", {});
  return res?.result ?? null;
};

export type ConntrackMetrics = { udp: number; tcp: number; other: number };

export const fetchConntrackMetrics = async (): Promise<ConntrackMetrics | null> => {
  // 1. luci.getRealtimeStats (requires luci-bwc daemon — returns per-protocol breakdown)
  const stats = await getRealtimeStats("conntrack");
  if (stats?.length) {
    const latest = stats[stats.length - 1];
    if (latest.length >= 4) return { udp: latest[1], tcp: latest[2], other: latest[3] };
  }
  // 2. luci.getConntrackList and count entries by protocol
  const list = await getConntrackList();
  if (list) {
    const udp = list.filter((c: any) => c.layer4 === "udp").length;
    const tcp = list.filter((c: any) => c.layer4 === "tcp").length;
    return { udp, tcp, other: list.length - udp - tcp };
  }
  // 3. file.exec — try proc files, sysctl, and conntrack utility
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

export const getAdGuardStats = async () => {
  try {
    const res = await fetch("http://10.10.0.1:3000/control/stats", {
      headers: { Authorization: "Basic " + btoa("admin:") },
    });
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
};

export type Process = {
  PID: string;
  PPID: string;
  USER: string;
  STAT: string;
  VSZ: string;
  "%MEM": string;
  "%CPU": string;
  COMMAND: string;
};

const parseTopOutput = (stdout: string): Process[] => {
  const lines = stdout.trim().split("\n");
  const list: Process[] = [];
  let inTable = false;
  for (const line of lines) {
    if (/^  PID /.test(line)) { inTable = true; continue; }
    if (!inTable) continue;
    if (/^\s*$/.test(line)) continue;
    const m = line.match(
      /^\s*(\d+)\s+(\d+)\s+(.+?)\s+([RSDZTWI][<NW ]?[<N ]?)\s+(\S+)\s+(\S+%?)\s+(\S+%?)\s+(.+)$/,
    );
    if (m && m[8] !== "/bin/busybox top -bn1" && m[8] !== "busybox top -bn1") {
      list.push({
        PID: m[1],
        PPID: m[2],
        USER: m[3].trim(),
        STAT: m[4],
        VSZ: m[5],
        "%MEM": m[6],
        "%CPU": m[7],
        COMMAND: m[8],
      });
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
  if (top2?.stdout) return parseTopOutput(top2.stdout);

  return null;
};

export const killProcess = async (pid: string, signal: number) => {
  return execCommand("/bin/kill", [`-${signal}`, pid]);
};

export const setPassword = async (
  username = "root",
  password: string,
  oldpassword = "",
  rpcd = false,
) => {
  return call<{ result: number | boolean }>("luci", "setPassword", {
    username, password, oldpassword, rpcd,
  });
};

export const readFile = async (path: string) => {
  return call<{ data: string }>("file", "read", { path });
};

export const writeFile = async (path: string, data: string, mode?: number) => {
  const params: Record<string, any> = { path, data };
  if (mode !== undefined) params.mode = mode;
  return call("file", "write", params);
};

export const listDir = async (path: string) => {
  return call<{ entries: { name: string; type: string }[] }>("file", "list", { path });
};

export const removeFile = async (path: string) => {
  return call("file", "remove", { path });
};

export const statFile = async (path: string) => {
  return call("file", "stat", { path });
};

const CGI_EXEC = "/cgi-bin/cgi-exec";

function getSession(): string {
  return localStorage.getItem("owrt_session") || "00000000000000000000000000000000";
}

/**
 * Execute a command via `/cgi-bin/cgi-exec`, bypassing UBUS message size limits.
 * Used for large command outputs (e.g. package lists, nftables rulesets).
 * Matching LuCI's `fs.exec_direct()`.
 */
export const cgiExec = async (
  command: string,
  params: string[] = [],
): Promise<string | null> => {
  try {
    let cmdstr = String(command).replace(/\\/g, "\\\\").replace(/(\s)/g, "\\$1");
    if (Array.isArray(params)) {
      for (const p of params) {
        cmdstr += " " + String(p).replace(/\\/g, "\\\\").replace(/(\s)/g, "\\$1");
      }
    }
    const body =
      "sessionid=" +
      encodeURIComponent(getSession()) +
      "&command=" +
      encodeURIComponent(cmdstr);

    const res = await fetch(CGI_EXEC, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!res.ok || res.status !== 200) return null;
    return res.text();
  } catch {
    return null;
  }
};
