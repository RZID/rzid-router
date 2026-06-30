import { t as _t } from "../../../i18n";
import {
  uciGet,
  uciSetSection,
  uciCommit,
  uciAdd,
  uciDelete,
  rcInit,
} from "../../../api/ubus";
import type { UciConfig } from "../../../types";

export interface QueueSection {
  id: string;
  interface: string;
  enabled: boolean;
  download: string;
  upload: string;
  qdisc: string;
  script: string;
  qdisc_advanced: boolean;
  use_mq: boolean;
  squash_dscp: string;
  squash_ingress: string;
  ingress_ecn: string;
  egress_ecn: string;
  qdisc_really_really_advanced: boolean;
  ilimit: string;
  elimit: string;
  itarget: string;
  etarget: string;
  iqdisc_opts: string;
  eqdisc_opts: string;
  linklayer: string;
  overhead: string;
  linklayer_advanced: boolean;
  tcMTU: string;
  tcTSIZE: string;
  tcMPU: string;
  linklayer_adaptation_mechanism: string;
  debug_logging: boolean;
  verbosity: string;
}

export const t = (k: string) => _t(k);

let queues = $state<QueueSection[]>([]);
let queueTabs = $state<("basic" | "qdisc" | "linklayer")[]>([]);
let saving = $state(false);
let saveFeedback = $state("");
let serviceInstalled = $state(true);
let loading = $state(true);

export const getQueues = () => queues;
export const getQueueTabs = () => queueTabs;
export const getSaving = () => saving;
export const getSaveFeedback = () => saveFeedback;
export const getServiceInstalled = () => serviceInstalled;
export const isLoading = () => loading;

const defaults: QueueSection = {
  id: "", interface: "", enabled: false,
  download: "", upload: "",
  qdisc: "cake", script: "piece_of_cake.qos",
  qdisc_advanced: false, use_mq: false,
  squash_dscp: "1", squash_ingress: "1",
  ingress_ecn: "ECN", egress_ecn: "NOECN",
  qdisc_really_really_advanced: false,
  ilimit: "", elimit: "",
  itarget: "", etarget: "",
  iqdisc_opts: "", eqdisc_opts: "",
  linklayer: "none", overhead: "0",
  linklayer_advanced: false,
  tcMTU: "2047", tcTSIZE: "128", tcMPU: "0",
  linklayer_adaptation_mechanism: "default",
  debug_logging: false, verbosity: "5",
};

const parseSection = (s: Record<string, unknown>, id: string): QueueSection => ({
  id,
  interface: String(s.interface || ""),
  enabled: s.enabled === "1",
  download: String(s.download || ""),
  upload: String(s.upload || ""),
  qdisc: String(s.qdisc || defaults.qdisc),
  script: String(s.script || defaults.script),
  qdisc_advanced: s.qdisc_advanced === "1",
  use_mq: s.use_mq === "1",
  squash_dscp: String(s.squash_dscp || defaults.squash_dscp),
  squash_ingress: String(s.squash_ingress || defaults.squash_ingress),
  ingress_ecn: String(s.ingress_ecn || defaults.ingress_ecn),
  egress_ecn: String(s.egress_ecn || defaults.egress_ecn),
  qdisc_really_really_advanced: s.qdisc_really_really_advanced === "1",
  ilimit: String(s.ilimit || ""),
  elimit: String(s.elimit || ""),
  itarget: String(s.itarget || ""),
  etarget: String(s.etarget || ""),
  iqdisc_opts: String(s.iqdisc_opts || ""),
  eqdisc_opts: String(s.eqdisc_opts || ""),
  linklayer: String(s.linklayer || defaults.linklayer),
  overhead: String(s.overhead ?? defaults.overhead),
  linklayer_advanced: s.linklayer_advanced === "1",
  tcMTU: String(s.tcMTU ?? defaults.tcMTU),
  tcTSIZE: String(s.tcTSIZE ?? defaults.tcTSIZE),
  tcMPU: String(s.tcmpu ?? defaults.tcMPU),
  linklayer_adaptation_mechanism: String(s.linklayer_adaptation_mechanism || defaults.linklayer_adaptation_mechanism),
  debug_logging: s.debug_logging === "1",
  verbosity: String(s.verbosity || defaults.verbosity),
});

export const load = async () => {
  loading = true;
  try {
    const uci = await uciGet("sqm").catch(() => null) as UciConfig | null;
    if (!uci?.values || Object.keys(uci.values).length === 0) {
      serviceInstalled = false;
      queues = [];
      queueTabs = [];
      loading = false;
      return;
    }
    serviceInstalled = true;
    const entries = Object.entries(uci.values).filter(
      ([, s]) => (s as Record<string, unknown>)[".type"] === "queue",
    );
    queues = entries.map(([id, s]) => parseSection(s as Record<string, unknown>, id));
    queueTabs = queues.map(() => "basic" as const);
  } catch {
    serviceInstalled = false;
    queues = [];
    queueTabs = [];
  }
  loading = false;
};

const collectValues = (q: QueueSection): Record<string, string | undefined> => ({
  interface: q.interface || undefined,
  enabled: q.enabled ? "1" : "0",
  download: q.download || undefined,
  upload: q.upload || undefined,
  qdisc: q.qdisc || undefined,
  script: q.script || undefined,
  qdisc_advanced: q.qdisc_advanced ? "1" : undefined,
  use_mq: q.use_mq ? "1" : undefined,
  squash_dscp: q.squash_dscp !== "1" ? q.squash_dscp : undefined,
  squash_ingress: q.squash_ingress !== "1" ? q.squash_ingress : undefined,
  ingress_ecn: q.ingress_ecn !== "ECN" ? q.ingress_ecn : undefined,
  egress_ecn: q.egress_ecn !== "NOECN" ? q.egress_ecn : undefined,
  qdisc_really_really_advanced: q.qdisc_really_really_advanced ? "1" : undefined,
  ilimit: q.ilimit || undefined,
  elimit: q.elimit || undefined,
  itarget: q.itarget || undefined,
  etarget: q.etarget || undefined,
  iqdisc_opts: q.iqdisc_opts || undefined,
  eqdisc_opts: q.eqdisc_opts || undefined,
  linklayer: q.linklayer !== "none" ? q.linklayer : undefined,
  overhead: q.overhead !== "0" ? q.overhead : undefined,
  linklayer_advanced: q.linklayer_advanced ? "1" : undefined,
  tcMTU: q.tcMTU !== "2047" ? q.tcMTU : undefined,
  tcTSIZE: q.tcTSIZE !== "128" ? q.tcTSIZE : undefined,
  tcMPU: q.tcMPU !== "0" ? q.tcMPU : undefined,
  linklayer_adaptation_mechanism: q.linklayer_adaptation_mechanism !== "default" ? q.linklayer_adaptation_mechanism : undefined,
  debug_logging: q.debug_logging ? "1" : undefined,
  verbosity: q.verbosity !== "5" ? q.verbosity : undefined,
});

export const saveAll = async () => {
  saving = true;
  saveFeedback = "";
  try {
    for (const q of queues) {
      const vals = collectValues(q);
      await uciSetSection("sqm", q.id, vals as Record<string, string>);
    }
    await uciCommit("sqm");
    if (queues.some((q) => q.enabled)) {
      await rcInit("sqm", "enable");
    }
    saveFeedback = t("Saved");
  } catch {
    saveFeedback = t("Save failed");
  }
  saving = false;
  setTimeout(() => { saveFeedback = ""; }, 3000);
};

export const addQueue = async () => {
  try {
    const result = await uciAdd("sqm", "queue");
    const id = result as unknown as string;
    await uciSetSection("sqm", id, { interface: "" } as Record<string, string>);
    await uciCommit("sqm");
    const q: QueueSection = { ...defaults, id };
    queues = [...queues, q];
    queueTabs = [...queueTabs, "basic"];
  } catch {
    // ignore
  }
};

export const removeQueue = async (idx: number) => {
  const q = queues[idx];
  if (!q) return;
  saving = true;
  try {
    await uciDelete("sqm", q.id);
    queues = queues.filter((_, i) => i !== idx);
    queueTabs = queueTabs.filter((_, i) => i !== idx);
  } catch {
    // ignore
  }
  saving = false;
};
