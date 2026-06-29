const BASE = import.meta.env.DEV ? "http://10.10.0.1" : "";
const UBUS_URL = BASE + "/ubus";

let sessionId = "00000000000000000000000000000000";

export const login = async (password: string): Promise<boolean> => {
  const res = await fetch(UBUS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0", id: 1, method: "call",
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
        jsonrpc: "2.0", id: 1, method: "call",
        params: [sessionId, object, method, params],
      }),
    });
    const data = await res.json();
    if (data.error?.code === -32002) { logout(); location.href = "/"; return null; }
    if (data.result?.[0] === 0) return data.result[1];
    return null;
  } catch { return null; }
};

export const getSession = (): string => {
  return localStorage.getItem("owrt_session") || "00000000000000000000000000000000";
};

type BatchItem = { object: string; method: string; params?: Record<string, any> };
type BatchResult<T> = T | null;

export const batchCall = async <T = any>(
  calls: BatchItem[],
): Promise<BatchResult<T>[]> => {
  try {
    const res = await fetch(UBUS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(calls.map((c, i) => ({
        jsonrpc: "2.0", id: i + 1, method: "call",
        params: [sessionId, c.object, c.method, c.params || {}],
      }))),
    });
    const results = await res.json();
    if (!Array.isArray(results)) return calls.map(() => null);
    if (results.some((r: any) => r.error?.code === -32002)) { logout(); location.href = "/"; return calls.map(() => null); }
    return results.map((r: any) => (r.result?.[0] === 0 ? r.result[1] : null));
  } catch { return calls.map(() => null); }
};
