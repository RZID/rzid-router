// Shared formatting utilities — import from here instead of duplicating across views

export const fmtUptime = (s: number): string => {
  const d = Math.floor(s / 86400),
    h = Math.floor((s % 86400) / 3600),
    m = Math.floor((s % 3600) / 60);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m 0s`;
};

export const fmtBytes = (b: number): string => {
  if (!b) return "0 B";
  if (b >= 1e9) return `${(b / 1e9).toFixed(1)} GiB`;
  if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MiB`;
  if (b >= 1024) return `${(b / 1024).toFixed(1)} KiB`;
  return `${b} B`;
};

export const fmtPkts = (n: number): string => {
  if (!n) return "0";
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return `${n}`;
};

export const fmtRate = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B/s`;
  if (bytes < 1e6) return `${(bytes / 1024).toFixed(1)} KB/s`;
  return `${(bytes / 1e6).toFixed(2)} MB/s`;
};

export const cidr = (mask: string): string => {
  if (!mask) return "";
  let bits = 0;
  for (const p of mask.split(".").map(Number))
    for (let i = 7; i >= 0; i--) {
      if (p & (1 << i)) bits++;
      else break;
    }
  return `/${bits}`;
};
