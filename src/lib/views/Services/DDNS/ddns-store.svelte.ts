import { t as _t, getLocale, onLocaleChange } from "../../../i18n";
import {
  uciGet,
  uciSet,
  uciSetSection,
  uciCommit,
  uciAdd,
  callDdnsGetState,
  callDdnsGetEnv,
  callDdnsGetServicesStatus,
  callDdnsGetLog,
  callSetInitAction,
  ddnsServiceInstall,
  ddnsServiceUpdateList,
  ddnsStopService,
  ddnsReloadService,
  readFile,
  listDir,
  execCommand,
  type DdnsState,
  type DdnsEnv,
  type DdnsServiceStatus,
} from "../../../api/ubus";
import type { ServiceForm } from "./types";
import type { UciConfig, UciSection } from "../../../types";

export const store = $state({
  status: null as DdnsState | null,
  env: null as DdnsEnv | null,
  servicesStatus: {} as Record<string, DdnsServiceStatus>,
  uciConfig: null as UciConfig | null,
  providerServices: {} as Record<string, boolean>,
  providerServicesData: {} as Record<string, Record<string, unknown>>,
  saving: false,
  saveFeedback: "",
  logContent: "",
  serviceAvailable: true,
  serviceSupported: true,
  serviceUpdateUrl: null as string | null,
  editValidationErrors: [] as string[],
  g: {
    upd_privateip: false,
    ddns_dateformat: "%F %R",
    ddns_rundir: "/var/run/ddns",
    ddns_logdir: "/var/log/ddns",
    ddns_loglines: "250",
    use_curl: false,
    cacert: "",
    services_url: "",
  },
  addForm: { name: "", use_ipv6: "0", service_name: "-" },
  addServiceSupported: true,
  editForm: {
    enabled: true,
    lookup_host: "",
    use_ipv6: "0",
    service_name: "-",
    update_url: "",
    update_script: "",
    domain: "",
    username: "",
    password: "",
    param_enc: "",
    param_opt: "",
    use_https: false,
    cacert: "",
    ip_source: "network",
    ip_network: "wan",
    ip_url: "",
    ip_interface: "",
    ip_script: "",
    interface: "",
    bind_network: "",
    force_ipversion: false,
    dns_server: "",
    force_dnstcp: false,
    proxy: "",
    use_syslog: "2",
    use_logfile: true,
    check_interval: "10",
    check_unit: "minutes",
    force_interval: "72",
    force_unit: "hours",
    retry_max_count: "0",
    retry_interval: "60",
    retry_unit: "seconds",
  } as ServiceForm,
  originalServiceName: "",
  originalUseIpv6: "0",
  serviceSections: [] as string[],
});

export const nextUpdateLabels: Record<string, string> = {
  Verify: "Verify",
  "Run once": "Run once",
  Disabled: "Disabled",
  Stopped: "Stopped",
};

let locale = $state(getLocale());
export function trans(k: string) {
  locale;
  return _t(k);
}
$effect(() =>
  onLocaleChange(() => {
    locale = getLocale();
  }),
);

const loadProviderServices = async () => {
  const [def, cust, listData] = await Promise.all([
    listDir("/usr/share/ddns/default").catch(() => null),
    listDir("/usr/share/ddns/custom").catch(() => null),
    readFile("/usr/share/ddns/list").catch(() => null),
  ]);
  const svcs: Record<string, boolean> = {};
  const svcData: Record<string, Record<string, unknown>> = {};
  const loadJson = async (dir: string, entries: { name: string; type?: string }[]) => {
    for (const e of entries) {
      const name = e.name.replace(".json", "");
      svcs[name] = true;
      const raw = await readFile(`${dir}/${e.name}`).catch(() => null);
      if (raw?.data)
        try {
          svcData[name] = JSON.parse(raw.data);
        } catch {}
    }
  };
  if (def?.entries) await loadJson("/usr/share/ddns/default", def.entries);
  if (cust?.entries) await loadJson("/usr/share/ddns/custom", cust.entries);
  const listLines = listData?.data?.split("\n").filter(Boolean) || [];
  listLines.forEach((s: string) => {
    if (svcs[s] === undefined) svcs[s] = false;
  });
  store.providerServices = svcs;
  store.providerServicesData = svcData;
};

export const load = async () => {
  const [st, ev, ss, uci] = await Promise.all([
    callDdnsGetState(),
    callDdnsGetEnv(),
    callDdnsGetServicesStatus(),
    uciGet("ddns").catch(() => null),
  ]);
  if (st) store.status = st;
  if (ev) store.env = ev;
  if (ss) store.servicesStatus = ss;
  if (uci) {
    store.uciConfig = uci;
    const sections = Object.values(uci.values || {}) as UciSection[];
    store.serviceSections = sections
      .filter((s: UciSection) => s[".type"] === "service")
      .map((s: UciSection) => s[".name"] as string);
    const globalSec = sections.find((s: UciSection) => s[".type"] === "ddns");
    if (globalSec) {
      store.g.upd_privateip = globalSec.upd_privateip === "1";
      store.g.ddns_dateformat = globalSec.ddns_dateformat || "%F %R";
      store.g.ddns_rundir = globalSec.ddns_rundir || "/var/run/ddns";
      store.g.ddns_logdir = globalSec.ddns_logdir || "/var/log/ddns";
      store.g.ddns_loglines = globalSec.ddns_loglines || "250";
      store.g.use_curl = globalSec.use_curl === "1";
      store.g.cacert = globalSec.cacert || "";
      store.g.services_url = globalSec.services_url || "";
    }
  }
  await loadProviderServices();
};

export const pollStatus = async () => {
  const [st, ss] = await Promise.all([
    callDdnsGetState(),
    callDdnsGetServicesStatus(),
  ]);
  if (st) store.status = st;
  if (ss) store.servicesStatus = ss;
};

export const handleToggleDdns = async () => {
  const action = store.status?._enabled ? "disable" : "enable";
  await callSetInitAction("ddns", action);
  await callSetInitAction("ddns", action === "enable" ? "start" : "stop");
  await load();
};

export const handleRestartDdns = async () => {
  await callSetInitAction("ddns", "restart");
  await load();
};
export const handleRefreshServicesList = async () => {
  await ddnsServiceUpdateList();
  await load();
};

const getServiceData = async (service: string): Promise<Record<string, unknown> | null> => {
  const [cust, def] = await Promise.all([
    readFile(`/usr/share/ddns/custom/${service}.json`).catch(() => null),
    readFile(`/usr/share/ddns/default/${service}.json`).catch(() => null),
  ]);
  const raw = cust?.data || def?.data || null;
  return raw ? JSON.parse(raw) : null;
};

export const handleCheckService = async (svc: string, ipv6: string) => {
  if (svc === "-") {
    store.addServiceSupported = true;
    return;
  }
  const data = await getServiceData(svc);
  if (!data) {
    store.addServiceSupported = false;
    return;
  }
  store.addServiceSupported = !(ipv6 === "1" && !data.ipv6);
};

export const checkServiceData = async (service: string, ipv6: string) => {
  if (service === "-") {
    store.serviceAvailable = true;
    store.serviceSupported = true;
    store.serviceUpdateUrl = null;
    return;
  }
  const data = store.providerServicesData[service];
  if (!data) {
    store.serviceAvailable = false;
    store.serviceSupported = true;
    store.serviceUpdateUrl = null;
    return;
  }
  store.serviceAvailable = true;
  if (ipv6 === "1" && !data.ipv6) {
    store.serviceSupported = false;
    store.serviceUpdateUrl = null;
    return;
  }
  store.serviceSupported = true;
  store.serviceUpdateUrl =
    ipv6 === "1" ? data.ipv6?.url || null : data.ipv4?.url || null;
};

export const handleAddService = async () => {
  if (!store.addForm.name) return;
  store.saving = true;
  try {
    await uciAdd("ddns", "service", store.addForm.name);
    if (store.addForm.service_name !== "-")
      await uciSet("ddns", store.addForm.name, {
        service_name: store.addForm.service_name,
      });
    await uciSet("ddns", store.addForm.name, {
      use_ipv6: store.addForm.use_ipv6,
    });
    await uciCommit("ddns");
    store.addForm = { name: "", use_ipv6: "0", service_name: "-" };
    await load();
  } catch {
    store.saveFeedback = "Failed to add service";
  }
  store.saving = false;
};

export const openEdit = async (sectionId: string) => {
  store.editValidationErrors = [];
  const sections = Object.values(store.uciConfig?.values || {}) as UciSection[];
  const sec = sections.find((s: UciSection) => s[".name"] === sectionId) || ({} as UciSection);
  store.editForm = {
    enabled: sec.enabled === "1",
    lookup_host: sec.lookup_host || "",
    use_ipv6: sec.use_ipv6 || "0",
    service_name: sec.service_name || "-",
    update_url: sec.update_url || "",
    update_script: sec.update_script || "",
    domain: sec.domain || "",
    username: sec.username || "",
    password: sec.password || "",
    param_enc: sec.param_enc || "",
    param_opt: sec.param_opt || "",
    use_https: sec.use_https === "1",
    cacert: sec.cacert || "",
    ip_source: sec.ip_source || "network",
    ip_network: sec.ip_network || "wan",
    ip_url: sec.ip_url || "",
    ip_interface: sec.ip_interface || "",
    ip_script: sec.ip_script || "",
    interface: sec.interface || "",
    bind_network: sec.bind_network || "",
    force_ipversion: sec.force_ipversion === "1",
    dns_server: sec.dns_server || "",
    force_dnstcp: sec.force_dnstcp === "1",
    proxy: sec.proxy || "",
    use_syslog: sec.use_syslog || "2",
    use_logfile: sec.use_logfile !== "0",
    check_interval: sec.check_interval || "10",
    check_unit: sec.check_unit || "minutes",
    force_interval: sec.force_interval || "72",
    force_unit: sec.force_unit || "hours",
    retry_max_count: sec.retry_max_count || "0",
    retry_interval: sec.retry_interval || "60",
    retry_unit: sec.retry_unit || "seconds",
  };
  store.originalServiceName = store.editForm.service_name;
  store.originalUseIpv6 = store.editForm.use_ipv6;
  store.logContent = "";
  await checkServiceData(store.editForm.service_name, store.editForm.use_ipv6);
};

export const handleSwitchService = async (sectionId: string) => {
  if (!sectionId) return;
  store.saving = true;
  try {
    await uciSet("ddns", sectionId, {
      service_name: store.editForm.service_name,
      use_ipv6: store.editForm.use_ipv6,
    });
    await uciCommit("ddns");
    store.originalServiceName = store.editForm.service_name;
    store.originalUseIpv6 = store.editForm.use_ipv6;
    await checkServiceData(
      store.editForm.service_name,
      store.editForm.use_ipv6,
    );
    store.saveFeedback = trans("Service switched");
  } catch {
    store.saveFeedback = trans("Switch failed");
  }
  store.saving = false;
  setTimeout(() => {
    store.saveFeedback = "";
  }, 3000);
};

export const handleSaveService = async (sectionId: string | null) => {
  if (!sectionId) return;
  store.saving = true;
  store.saveFeedback = "";
  store.editValidationErrors = [];
  const errs: string[] = [];
  if (store.editForm.service_name === "-") {
    const hasUrl = !!store.editForm.update_url;
    const hasScript = !!store.editForm.update_script;
    if (!hasUrl && !hasScript)
      errs.push("Provide either an Update URL OR an Update Script");
    if (hasUrl && hasScript)
      errs.push("Provide either an Update URL OR an Update Script");
  }
  const ci = parseInt(store.editForm.check_interval) || 0;
  const cu = store.editForm.check_unit;
  const ciSec = ci * (cu === "seconds" ? 1 : cu === "minutes" ? 60 : 3600);
  if (ci > 0 && ciSec < 300)
    errs.push(
      "Check Interval: values below 5 minutes (300 seconds) are not supported",
    );
  const fi = parseInt(store.editForm.force_interval) || 0;
  const fu = store.editForm.force_unit;
  const fiSec =
    fi *
    (fu === "minutes" ? 60 : fu === "hours" ? 3600 : fu === "days" ? 86400 : 1);
  if (fi > 0 && fiSec < ciSec)
    errs.push(
      "Force Interval: values lower than Check Interval (except 0) are invalid",
    );
  if (!store.editForm.lookup_host || store.editForm.lookup_host.length < 3)
    errs.push("Lookup Hostname must be at least 3 characters");
  if (errs.length > 0) {
    store.editValidationErrors = errs;
    store.saving = false;
    return;
  }
  try {
    let interfaceVal = store.editForm.interface;
    if (store.editForm.ip_source === "network" && !interfaceVal)
      interfaceVal = store.editForm.ip_network || "wan";
    const vals: Record<string, string | undefined> = {
      enabled: store.editForm.enabled ? "1" : "0",
      lookup_host: store.editForm.lookup_host,
      use_ipv6: store.editForm.use_ipv6,
      domain: store.editForm.domain,
      username: store.editForm.username,
      param_enc: store.editForm.param_enc,
      param_opt: store.editForm.param_opt,
      ip_source: store.editForm.ip_source,
      use_syslog: store.editForm.use_syslog,
      use_logfile: store.editForm.use_logfile ? "1" : "0",
      check_interval: store.editForm.check_interval,
      check_unit: store.editForm.check_unit,
      force_interval: store.editForm.force_interval,
      force_unit: store.editForm.force_unit,
      retry_max_count: store.editForm.retry_max_count,
      retry_interval: store.editForm.retry_interval,
      retry_unit: store.editForm.retry_unit,
      interface: interfaceVal,
    };
    if (store.editForm.password) vals.password = store.editForm.password;
    if (store.editForm.update_url) vals.update_url = store.editForm.update_url;
    if (store.editForm.update_script)
      vals.update_script = store.editForm.update_script;
    if (store.editForm.ip_network) vals.ip_network = store.editForm.ip_network;
    if (store.editForm.ip_url) vals.ip_url = store.editForm.ip_url;
    if (store.editForm.ip_interface)
      vals.ip_interface = store.editForm.ip_interface;
    if (store.editForm.ip_script) vals.ip_script = store.editForm.ip_script;
    if (store.editForm.interface) vals.interface = store.editForm.interface;
    if (store.editForm.bind_network)
      vals.bind_network = store.editForm.bind_network;
    if (store.editForm.force_ipversion) vals.force_ipversion = "1";
    if (store.editForm.dns_server) vals.dns_server = store.editForm.dns_server;
    if (store.editForm.force_dnstcp) vals.force_dnstcp = "1";
    if (store.editForm.proxy) vals.proxy = store.editForm.proxy;
    if (store.editForm.use_https) vals.use_https = "1";
    if (store.editForm.cacert) vals.cacert = store.editForm.cacert;
    if (store.editForm.service_name !== "-") {
      vals.service_name = store.editForm.service_name;
    } else {
      vals.service_name = "";
      vals.update_url = store.editForm.update_url;
      vals.update_script = store.editForm.update_script;
    }
    await uciSetSection("ddns", sectionId, vals);
    await uciCommit("ddns");
    store.saveFeedback = trans("Saved");
    await load();
  } catch {
    store.saveFeedback = trans("Save failed");
  }
  store.saving = false;
  setTimeout(() => {
    store.saveFeedback = "";
  }, 3000);
};

export const handleDeleteService = async (sectionId: string) => {
  await execCommand("/sbin/uci", ["delete", `ddns.${sectionId}`]);
  await execCommand("/sbin/uci", ["commit", "ddns"]);
  await load();
};

export const handleInstallService = async (service: string) => {
  await ddnsServiceInstall(service);
  await loadProviderServices();
};

export const handleReadLog = async (sectionId: string) => {
  if (!sectionId) return;
  const res = await callDdnsGetLog(sectionId);
  if (res?.result) store.logContent = res.result;
};

export const handleToggleService = async (
  sectionId: string,
  enabled: boolean,
) => {
  await uciSet("ddns", sectionId, { enabled: enabled ? "0" : "1" });
  await uciCommit("ddns");
  await load();
};

export const handleReorder = async (
  dragSectionId: string,
  targetSectionId: string,
  currentSections: string[],
  idx: number,
) => {
  if (!dragSectionId || dragSectionId === targetSectionId) return;
  const fromIdx = currentSections.indexOf(dragSectionId);
  if (fromIdx === -1) return;
  const newOrder = [...currentSections];
  const [moved] = newOrder.splice(fromIdx, 1);
  newOrder.splice(idx, 0, moved);
  store.serviceSections = newOrder;
  for (let i = 0; i < newOrder.length; i++) {
    await execCommand("/sbin/uci", [
      "reorder",
      `ddns.${newOrder[i]}`,
      String(i + 1),
    ]);
  }
  await execCommand("/sbin/uci", ["commit", "ddns"]);
  await load();
};

export const handleSaveGlobal = async () => {
  store.saving = true;
  try {
    const globalSec = Object.values(store.uciConfig?.values || {}).find(
      (s: UciSection) => s[".type"] === "ddns",
    );
    if (!globalSec) return;
    await uciSetSection("ddns", globalSec[".name"]!, {
      upd_privateip: store.g.upd_privateip ? "1" : "0",
      ddns_dateformat: store.g.ddns_dateformat,
      ddns_rundir: store.g.ddns_rundir,
      ddns_logdir: store.g.ddns_logdir,
      ddns_loglines: store.g.ddns_loglines,
      use_curl: store.g.use_curl ? "1" : "0",
      cacert: store.g.cacert || "IGNORE",
      services_url: store.g.services_url,
    });
    await uciCommit("ddns");
    store.saveFeedback = trans("Saved");
  } catch {
    store.saveFeedback = trans("Save failed");
  }
  store.saving = false;
  setTimeout(() => {
    store.saveFeedback = "";
  }, 3000);
};
