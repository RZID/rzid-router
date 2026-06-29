import { call } from "./session";
import { execCommand, readFile } from "./exec";

export type BanipRuntime = {
  status?: string; element_count?: number; active_feeds?: string[];
  wan_devices?: string[]; wan_interfaces?: string[]; vlan_allow?: string[];
  vlan_block?: string[]; active_uplink?: string[]; nft_info?: string;
  run_info?: string; run_flags?: string; last_run?: string;
  system_info?: string; frontend_ver?: string; backend_ver?: string;
};

export const banipGetRuntime = async (): Promise<BanipRuntime | null> => {
  try {
    const res = await call<{ data: string }>("file", "read", { path: "/var/run/banIP/banIP.runtime.json" });
    if (res?.data) return JSON.parse(res.data);
  } catch { /* no runtime yet */ }
  return null;
};

export const banipGetActual = async (): Promise<string> => {
  const res = await execCommand("/etc/init.d/banip", ["actual"]).catch(() => null);
  return res?.stdout?.trim() || "";
};

export const banipInitAction = async (action: "stop" | "start" | "restart" | "reload") =>
  execCommand("/etc/init.d/banip", [action]);

export const banipGetFeeds = async () => {
  const [custom, def, countries] = await Promise.all([
    readFile("/etc/banip/banip.custom.feeds").catch(() => null),
    readFile("/etc/banip/banip.feeds").catch(() => null),
    readFile("/etc/banip/banip.countries").catch(() => null),
  ]);
  return { custom: custom?.data || "", default: def?.data || "", countries: countries?.data || "" };
};
