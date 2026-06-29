export const orderOf = (c: string): number => {
  if (c === "~") return -1;
  if (c === "" || (c >= "0" && c <= "9")) return 0;
  if ((c >= "a" && c <= "z") || (c >= "A" && c <= "Z")) return c.charCodeAt(0);
  return c.charCodeAt(0) + 256;
};

export const compareVersion = (
  val: string | undefined,
  ref: string | undefined,
): number => {
  val = val || "";
  ref = ref || "";
  if (val === ref) return 0;

  const isdigit: Record<string, boolean> = {};
  for (let d = 0; d <= 9; d++) isdigit[String(d)] = true;

  let vi = 0,
    ri = 0;
  while (vi < val.length || ri < ref.length) {
    let firstDiff = 0;
    while (
      (vi < val.length && !isdigit[val[vi]]) ||
      (ri < ref.length && !isdigit[ref[ri]])
    ) {
      const vc = orderOf(val[vi]),
        rc = orderOf(ref[ri]);
      if (vc !== rc) return vc - rc;
      vi++;
      ri++;
    }
    while (val[vi] === "0") vi++;
    while (ref[ri] === "0") ri++;
    while (isdigit[val[vi]] && isdigit[ref[ri]]) {
      firstDiff = firstDiff || val.charCodeAt(vi) - ref.charCodeAt(ri);
      vi++;
      ri++;
    }
    if (isdigit[val[vi]]) return 1;
    if (isdigit[ref[ri]]) return -1;
    if (firstDiff) return firstDiff;
  }
  return 0;
};

export const versionSatisfied = (
  ver: string,
  ref: string,
  vop: string,
): boolean => {
  const r = compareVersion(ver, ref);
  switch (vop) {
    case "<":
    case "<=":
      return r <= 0;
    case ">":
    case ">=":
      return r >= 0;
    case "<<":
      return r < 0;
    case ">>":
      return r > 0;
    case "=":
      return r === 0;
  }
  return false;
};
