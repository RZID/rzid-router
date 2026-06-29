import { call, getSession } from "./session";

export const execCommand = async (command: string, params: string[] = []) =>
  call<{ stdout: string; stderr?: string; code?: number }>("file", "exec", { command, params });

export type LogEntry = { time?: number; priority?: number; msg?: string };

export const readLogEntries = async (lines = 1000): Promise<LogEntry[] | null> => {
  const res = await call<{ log?: LogEntry[] }>("log", "read", { lines, stream: false, oneshot: true });
  if (res?.log) return res.log;

  for (const cmd of ["/sbin/logread", "/usr/sbin/logread"]) {
    const raw = await execCommand(cmd, ["-l", String(lines)]);
    if (raw?.stdout) return raw.stdout.trim().split("\n").filter(Boolean).map((msg) => ({ msg }));
  }

  const wrapper = await execCommand("/usr/libexec/syslog-wrapper", []);
  if (wrapper?.stdout) return wrapper.stdout.trim().split("\n").filter(Boolean).slice(-lines).map((msg) => ({ msg }));
  return null;
};

export const readDmesg = async () => execCommand("/bin/dmesg", ["-r"]);

export const readFile = async (path: string) => call<{ data: string }>("file", "read", { path });

export const writeFile = async (path: string, data: string, mode?: number) => {
  const params: Record<string, any> = { path, data };
  if (mode !== undefined) params.mode = mode;
  return call("file", "write", params);
};

export const listDir = async (path: string) =>
  call<{ entries: { name: string; type: string }[] }>("file", "list", { path });

export const removeFile = async (path: string) => call("file", "remove", { path });

export const statFile = async (path: string) => call("file", "stat", { path });

const CGI_EXEC = "/cgi-bin/cgi-exec";

export const cgiExec = async (command: string, params: string[] = []): Promise<string | null> => {
  try {
    let cmdstr = String(command).replace(/\\/g, "\\\\").replace(/(\s)/g, "\\$1");
    if (Array.isArray(params)) {
      for (const p of params) cmdstr += " " + String(p).replace(/\\/g, "\\\\").replace(/(\s)/g, "\\$1");
    }
    const body = "sessionid=" + encodeURIComponent(getSession()) + "&command=" + encodeURIComponent(cmdstr);
    const res = await fetch(CGI_EXEC, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok || res.status !== 200) return null;
    return res.text();
  } catch { return null; }
};
