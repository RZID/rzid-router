// nftables expression parsing — shared between Firewall view and potential future nft pages

export const isActionExpr = (e: unknown): boolean => {
  const o = e as Record<string, unknown> | null | undefined;
  return [
    "accept", "drop", "reject", "jump", "goto",
    "snat", "dnat", "masquerade", "redirect", "return",
    "continue", "log", "flow", "notrack", "mangle",
  ].some((k) => o?.[k] !== undefined);
};

// Translate expression value to human-readable string
export const exprVal = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return v;
  const o = v as Record<string, unknown>;
  const setVal = o.set;
  if (Array.isArray(setVal)) return `{ ${setVal.map(exprVal).join(", ")} }`;
  const rangeVal = o.range;
  if (Array.isArray(rangeVal))
    return `${exprVal(rangeVal[0])}-${exprVal(rangeVal[1])}`;
  const concatVal = o.concat;
  if (Array.isArray(concatVal)) return concatVal.map(exprVal).join(" + ");
  const pipeVal = o["|"];
  if (Array.isArray(pipeVal))
    return `${exprVal(pipeVal[0])} | ${exprVal(pipeVal[1])}`;
  const ampVal = o["&"];
  if (Array.isArray(ampVal))
    return `${exprVal(ampVal[0])} & ${exprVal(ampVal[1])}`;
  const prefixVal = o.prefix;
  if (prefixVal) {
    const p = prefixVal as Record<string, unknown>;
    return `${p.addr}/${p.len}`;
  }
  const metaVal = o.meta;
  if (metaVal) {
    const mk = typeof metaVal === "object" ? (metaVal as Record<string, unknown>).key : metaVal;
    const tl: Record<string, string> = {
      iifname: "Ingress device name",
      oifname: "Egress device name",
      iif: "Ingress device id",
      oif: "Egress device id",
      l4proto: "IP protocol",
      nfproto: "Address family",
      mark: "Packet mark",
      length: "Packet length",
      protocol: "Ethernet protocol",
      priority: "Priority",
    };
    return tl[String(mk)] || `meta.${String(mk)}`;
  }
  const ctVal = o.ct;
  if (ctVal) {
    const ck = typeof ctVal === "object" ? (ctVal as Record<string, unknown>).key : ctVal;
    const tl: Record<string, string> = {
      state: "Conntrack state",
      status: "Conntrack status",
      direction: "Conntrack direction",
      mark: "Conntrack mark",
      helper: "Conntrack helper",
    };
    return tl[String(ck)] || `ct.${String(ck)}`;
  }
  const rtVal = o.rt;
  if (rtVal) {
    const rk = typeof rtVal === "object" ? (rtVal as Record<string, unknown>).key : rtVal;
    return rk === "mtu" ? "Effective route MTU" : `rt.${String(rk)}`;
  }
  const tcpOpt = o.tcp_option;
  if (tcpOpt) {
    const t = tcpOpt as Record<string, unknown>;
    return `TCP ${t.name} ${t.field}`;
  }
  const payloadVal = o.payload;
  if (payloadVal) {
    const p = payloadVal as Record<string, unknown>;
    const pl: Record<string, string> = {
      th_sport: "TCP source port",
      th_dport: "TCP destination port",
      th_flags: "TCP flags",
      ip_saddr: "Source IP",
      ip_daddr: "Destination IP",
      ip6_saddr: "Source IPv6",
      ip6_daddr: "Destination IPv6",
      ip_protocol: "IP protocol",
      ether_saddr: "Source MAC",
      ether_daddr: "Destination MAC",
      ip_dscp: "IP DSCP",
      ip6_dscp: "IPv6 DSCP",
    };
    if (p.protocol && p.field)
      return pl[`${p.protocol}_${p.field}`] || `${p.protocol}.${p.field}`;
    return `payload ${p.base} +${p.offset}-${p.len}`;
  }
  const vmapVal = o.vmap;
  if (vmapVal) {
    const vm = vmapVal as Record<string, unknown>;
    const k = exprVal(vm.key);
    const data = vm.data as Record<string, unknown> | undefined;
    const items = ((data?.set as unknown[]) || (vm.data as unknown[]) || []);
    const keys = items.map((mk: unknown) =>
      exprVal(Array.isArray(mk) ? (mk as unknown[])[0] : mk),
    );
    return `Verdict map: ${k} is ${keys.join(" or ")}`;
  }
  return JSON.stringify(v);
};

// Translate full expression (match or action) to human-readable string
export const exprStr = (e: unknown): string => {
  if (!e) return "";
  if (typeof e === "string") return e;
  const o = e as Record<string, unknown>;
  const matchVal = o.match;
  if (matchVal) {
    const m = matchVal as Record<string, unknown>;
    const left = m.left, right = m.right, op = m.op;
    const l = exprVal(left), r = exprVal(right);
    if (op === "==") return `${l} is ${r}`;
    if (op === "!=") return `${l} not ${r}`;
    if (op === "in") return `${l} is one of ${r}`;
    return `${l} ${String(op)} ${r}`;
  }
  if (o.counter) return "";
  const payloadVal = o.payload;
  if (payloadVal) {
    const p = payloadVal as Record<string, unknown>;
    return p.protocol && p.field
      ? `${p.protocol} ${p.field}`
      : `payload ${p.base} +${p.offset}`;
  }
  if (o.meta) return exprVal({ meta: o.meta });
  if (o.ct) return exprVal({ ct: o.ct });
  if (o.rt) return exprVal({ rt: o.rt });
  const limitVal = o.limit;
  if (limitVal) {
    const lm = limitVal as Record<string, unknown>;
    return `limit ${lm.rate}/${lm.per || "s"}${lm.burst ? ` burst ${lm.burst}` : ""}`;
  }
  const concatVal = o.concat;
  if (Array.isArray(concatVal)) return concatVal.map(exprStr).join(" + ");
  const prefixVal = o.prefix;
  if (prefixVal) {
    const pr = prefixVal as Record<string, unknown>;
    return `${pr.addr}/${pr.len}`;
  }
  const rangeVal = o.range;
  if (Array.isArray(rangeVal))
    return `${exprVal(rangeVal[0])}-${exprVal(rangeVal[1])}`;
  const setVal = o.set;
  if (Array.isArray(setVal)) return setVal.map(exprVal).join(", ");
  // actions
  if (o.accept !== undefined) return "Accept packet";
  if (o.drop !== undefined) return "Drop packet";
  const jumpVal = o.jump;
  if (jumpVal) {
    const j = jumpVal as Record<string, unknown>;
    return `Continue in ${j.target}`;
  }
  const gotoVal = o.goto;
  if (gotoVal) {
    const g = gotoVal as Record<string, unknown>;
    return `Goto chain ${g.target}`;
  }
  if (o.return !== undefined) return "Continue in calling chain";
  if (o.continue !== undefined) return "Continue in calling chain";
  const rejectVal = o.reject;
  if (rejectVal)
    return typeof rejectVal === "object"
      ? `Reject with ${(rejectVal as Record<string, unknown>).type || "icmp"}`
      : "Reject";
  const snatVal = o.snat;
  if (snatVal) {
    const s = snatVal as Record<string, unknown>;
    return `SNAT ${s.addr || ""}${s.port ? ":" + s.port : ""}`;
  }
  const dnatVal = o.dnat;
  if (dnatVal) {
    const d = dnatVal as Record<string, unknown>;
    return `DNAT ${d.addr || ""}${d.port ? ":" + d.port : ""}`;
  }
  if (o.masquerade !== undefined) return "Rewrite to egress device address";
  const redirectVal = o.redirect;
  if (redirectVal) {
    const rd = redirectVal as Record<string, unknown>;
    return `Redirect${rd.port ? ` to :${rd.port}` : ""}`;
  }
  const logVal = o.log;
  if (logVal) {
    const lg = logVal as Record<string, unknown>;
    return lg.prefix ? `Log "${lg.prefix}"` : "Log";
  }
  const mangleVal = o.mangle;
  if (mangleVal) {
    const mg = mangleVal as Record<string, unknown>;
    return `Set ${exprVal(mg.key)} to ${exprVal(mg.value)}`;
  }
  if (o.notrack) return "Do not track";
  const flowVal = o.flow;
  if (flowVal) {
    const f = flowVal as Record<string, unknown>;
    return `Flow ${f.op || ""} @${f.flowtable || ""}`;
  }
  if (o.vmap) return exprVal({ vmap: o.vmap });
  return Object.keys(o)[0] || String(e);
};

export const familyLabel: Record<string, string> = {
  ip: "IPv4",
  ip6: "IPv6",
  inet: "IPv4/IPv6",
  arp: "ARP",
  bridge: "Bridge",
  netdev: "Netdev",
};
export const hookLabel: Record<string, string> = {
  ingress: "Capture incoming packets at network interface",
  prerouting: "Capture incoming packets before any routing decision",
  input: "Capture incoming packets routed to the local system",
  forward: "Capture incoming packets addressed to other hosts",
  output: "Capture outgoing packets originating from the local system",
  postrouting: "Capture outgoing packets after any routing decision",
};
export const chainLabel: Record<string, string> = {
  filter: "Traffic filter chain",
  nat: "NAT action chain",
  route: "Route action chain",
};
export const policyLabel: Record<string, string> = {
  drop: "Drop unmatched packets",
  accept: "Continue processing unmatched packets",
};
