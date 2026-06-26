// nftables expression parsing — shared between Firewall view and potential future nft pages

export const isActionExpr = (e: any): boolean =>
  [
    "accept",
    "drop",
    "reject",
    "jump",
    "goto",
    "snat",
    "dnat",
    "masquerade",
    "redirect",
    "return",
    "continue",
    "log",
    "flow",
    "notrack",
    "mangle",
  ].some((k) => e && e[k] !== undefined);

// Translate expression value to human-readable string
export const exprVal = (v: any): string => {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return v;
  if (Array.isArray(v.set)) return `{ ${v.set.map(exprVal).join(", ")} }`;
  if (Array.isArray(v.range))
    return `${exprVal(v.range[0])}-${exprVal(v.range[1])}`;
  if (Array.isArray(v.concat)) return v.concat.map(exprVal).join(" + ");
  if (Array.isArray(v["|"]))
    return `${exprVal(v["|"][0])} | ${exprVal(v["|"][1])}`;
  if (Array.isArray(v["&"]))
    return `${exprVal(v["&"][0])} & ${exprVal(v["&"][1])}`;
  if (v.prefix) return `${v.prefix.addr}/${v.prefix.len}`;
  if (v.meta) {
    const mk = typeof v.meta === "object" ? v.meta.key : v.meta;
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
    return tl[mk] || `meta.${mk}`;
  }
  if (v.ct) {
    const ck = typeof v.ct === "object" ? v.ct.key : v.ct;
    const tl: Record<string, string> = {
      state: "Conntrack state",
      status: "Conntrack status",
      direction: "Conntrack direction",
      mark: "Conntrack mark",
      helper: "Conntrack helper",
    };
    return tl[ck] || `ct.${ck}`;
  }
  if (v.rt) {
    const rk = typeof v.rt === "object" ? v.rt.key : v.rt;
    return rk === "mtu" ? "Effective route MTU" : `rt.${rk}`;
  }
  if (v.tcp_option) return `TCP ${v.tcp_option.name} ${v.tcp_option.field}`;
  if (v.payload) {
    const p = v.payload;
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
  if (v.vmap) {
    const k = exprVal(v.vmap.key);
    const keys = (v.vmap.data?.set || v.vmap.data || []).map(([mk]: any) =>
      exprVal(mk),
    );
    return `Verdict map: ${k} is ${keys.join(" or ")}`;
  }
  return JSON.stringify(v);
};

// Translate full expression (match or action) to human-readable string
export const exprStr = (e: any): string => {
  if (!e) return "";
  if (typeof e === "string") return e;
  if (e.match) {
    const { left, right, op } = e.match;
    const l = exprVal(left),
      r = exprVal(right);
    if (op === "==") return `${l} is ${r}`;
    if (op === "!=") return `${l} not ${r}`;
    if (op === "in") return `${l} is one of ${r}`;
    return `${l} ${op} ${r}`;
  }
  if (e.counter) return ""; // handled separately
  if (e.payload) {
    const p = e.payload;
    return p.protocol && p.field
      ? `${p.protocol} ${p.field}`
      : `payload ${p.base} +${p.offset}`;
  }
  if (e.meta) return exprVal({ meta: e.meta });
  if (e.ct) return exprVal({ ct: e.ct });
  if (e.rt) return exprVal({ rt: e.rt });
  if (e.limit)
    return `limit ${e.limit.rate}/${e.limit.per || "s"}${e.limit.burst ? ` burst ${e.limit.burst}` : ""}`;
  if (Array.isArray(e.concat)) return e.concat.map(exprStr).join(" + ");
  if (e.prefix) return `${e.prefix.addr}/${e.prefix.len}`;
  if (Array.isArray(e.range))
    return `${exprVal(e.range[0])}-${exprVal(e.range[1])}`;
  if (Array.isArray(e.set)) return e.set.map(exprVal).join(", ");
  // actions
  if (e.accept !== undefined) return "Accept packet";
  if (e.drop !== undefined) return "Drop packet";
  if (e.jump) return `Continue in ${e.jump.target}`;
  if (e.goto) return `Goto chain ${e.goto.target}`;
  if (e.return !== undefined) return "Continue in calling chain";
  if (e.continue !== undefined) return "Continue in calling chain";
  if (e.reject)
    return typeof e.reject === "object"
      ? `Reject with ${e.reject.type || "icmp"}`
      : "Reject";
  if (e.snat)
    return `SNAT ${e.snat.addr || ""}${e.snat.port ? ":" + e.snat.port : ""}`;
  if (e.dnat)
    return `DNAT ${e.dnat.addr || ""}${e.dnat.port ? ":" + e.dnat.port : ""}`;
  if (e.masquerade !== undefined) return "Rewrite to egress device address";
  if (e.redirect)
    return `Redirect${e.redirect.port ? ` to :${e.redirect.port}` : ""}`;
  if (e.log) return e.log.prefix ? `Log "${e.log.prefix}"` : "Log";
  if (e.mangle)
    return `Set ${exprVal(e.mangle.key)} to ${exprVal(e.mangle.value)}`;
  if (e.notrack) return "Do not track";
  if (e.flow) return `Flow ${e.flow.op || ""} @${e.flow.flowtable || ""}`;
  if (e.vmap) return exprVal({ vmap: e.vmap });
  return Object.keys(e)[0] || String(e);
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
