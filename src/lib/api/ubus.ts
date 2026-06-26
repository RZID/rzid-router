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
