import { call } from "./session";
import { execCommand } from "./exec";

export type DdnsState = { _enabled: boolean; _version?: string; _services_list?: string; _curr_dateformat?: string };
export type DdnsEnv = { has_ipv6: boolean; has_ssl: boolean; has_bindnet: boolean; has_proxy: boolean; has_bindhost: boolean; has_dnsserver: boolean; has_cacerts: boolean; has_wget: boolean; has_curl: boolean; has_forceip: boolean };
export type DdnsServiceStatus = { pid?: number; ip?: string; last_update?: string; next_update?: string; next_check?: string };

export const callDdnsGetState = async (): Promise<DdnsState | null> => call<DdnsState>("luci.ddns", "get_ddns_state");
export const callDdnsGetEnv = async (): Promise<DdnsEnv | null> => call<DdnsEnv>("luci.ddns", "get_env");
export const callDdnsGetServicesStatus = async (): Promise<Record<string, DdnsServiceStatus> | null> =>
  call<Record<string, DdnsServiceStatus>>("luci.ddns", "get_services_status");
export const callDdnsGetLog = async (serviceName: string): Promise<{ result: string } | null> =>
  call<{ result: string }>("luci.ddns", "get_services_log", { service_name: serviceName });
export const callSetInitAction = async (name: string, action: string): Promise<{ result: boolean } | null> =>
  call<{ result: boolean }>("luci", "setInitAction", { name, action });
export const ddnsServiceInstall = async (service: string) => execCommand("/usr/bin/ddns", ["service", "install", service]);
export const ddnsServiceUpdateList = async () => execCommand("/usr/bin/ddns", ["service", "update"]);
export const ddnsStopService = async (sectionId: string) => execCommand("/usr/lib/ddns/dynamic_dns_lucihelper.sh", ["-S", sectionId, "--", "stop"]);
export const ddnsReloadService = async (sectionId: string) => execCommand("/usr/bin/ddns", ["service", "restart", sectionId]);
export type DdnsProviderService = { name: string; installed: boolean };
