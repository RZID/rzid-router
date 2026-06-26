import type { LogEntry } from "./api/ubus";

export type SelectOption = { value: string; label: string };

export const LOG_FACILITIES: SelectOption[] = [
  { value: "any", label: "Any" },
  { value: "kern", label: "Kernel" },
  { value: "user", label: "User" },
  { value: "mail", label: "Mail" },
  { value: "daemon", label: "Daemon" },
  { value: "auth", label: "Auth" },
  { value: "syslog", label: "Syslog" },
  { value: "lpr", label: "LPR" },
  { value: "news", label: "News" },
  { value: "uucp", label: "UUCP" },
  { value: "cron", label: "Cron" },
  { value: "authpriv", label: "Auth Priv" },
  { value: "ftp", label: "FTP" },
  { value: "ntp", label: "NTP" },
  { value: "security", label: "Log audit" },
  { value: "console", label: "Log alert" },
  { value: "local0", label: "Local 0" },
  { value: "local1", label: "Local 1" },
  { value: "local2", label: "Local 2" },
  { value: "local3", label: "Local 3" },
  { value: "local4", label: "Local 4" },
  { value: "local5", label: "Local 5" },
  { value: "local6", label: "Local 6" },
  { value: "local7", label: "Local 7" },
];

export const LOG_SEVERITIES: SelectOption[] = [
  { value: "any", label: "Any" },
  { value: "emerg", label: "Emergency" },
  { value: "alert", label: "Alert" },
  { value: "crit", label: "Critical" },
  { value: "err", label: "Error" },
  { value: "warn", label: "Warning" },
  { value: "notice", label: "Notice" },
  { value: "info", label: "Info" },
  { value: "debug", label: "Debug" },
];

export const DMESG_SEVERITIES: SelectOption[] = [
  { value: "", label: "Default" },
  { value: "1", label: "Alert" },
  { value: "2", label: "Critical" },
  { value: "3", label: "Error" },
  { value: "4", label: "Warning" },
  { value: "5", label: "Notice" },
  { value: "6", label: "Info" },
  { value: "7", label: "Debug" },
];

const FACILITY_NAMES = [
  "kern", "user", "mail", "daemon", "auth", "syslog", "lpr", "news",
  "uucp", "cron", "authpriv", "ftp", "ntp", "security", "console", "cron",
  "local0", "local1", "local2", "local3", "local4", "local5", "local6", "local7",
];

const SEVERITY_NAMES = [
  "emerg", "alert", "crit", "err", "warn", "notice", "info", "debug",
];

export type SystemLogFilters = {
  facility: string;
  invertFacility: boolean;
  severity: string;
  invertSeverity: boolean;
  text: string;
  invertText: boolean;
  maxRows: number;
};

export type DmesgFilters = {
  fromTime: string;
  toTime: string;
  invertTimeRange: boolean;
  minSeverity: string;
  invertSeverity: boolean;
  reverseSort: boolean;
  text: string;
  invertText: boolean;
};

export type SystemClockPrefs = {
  timeZone?: string;
  timeStyle: "long" | "full";
  hourCycle?: "h23" | "h12";
};

const defaultDateFormatter = () =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "long" });

export const formatSystemLogLines = (
  entries: LogEntry[],
  prefs?: SystemClockPrefs,
): string[] => {
  const dateFmt = prefs
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: prefs.timeStyle,
        hourCycle: prefs.hourCycle,
        timeZone: prefs.timeZone,
      })
    : defaultDateFormatter();

  return entries.map((entry) => {
    if (entry.msg && entry.time == null && entry.priority == null) return entry.msg;

    const rawTime = entry.time;
    const time =
      rawTime != null
        ? new Date(rawTime < 1e12 ? rawTime * 1000 : rawTime)
        : null;
    const datestr = time ? dateFmt.format(time) : "?";
    const priority = entry.priority ?? 0;
    const facility = FACILITY_NAMES[Math.floor(priority / 8)] ?? "unknown";
    const severity = SEVERITY_NAMES[priority % 8] ?? "unknown";
    return `[${datestr}] ${facility}.${severity}: ${entry.msg ?? ""}`;
  });
};

export const filterSystemLogLines = (lines: string[], filters: SystemLogFilters) => {
  let out = lines;

  out = out.filter((line) => {
    const sevMatch = filters.severity === "any" || line.includes(`.${filters.severity}`);
    const facMatch = filters.facility === "any" || line.includes(`${filters.facility}.`);
    return filters.invertSeverity !== sevMatch && filters.invertFacility !== facMatch;
  });

  if (filters.text) {
    out = out.filter((line) => {
      const match = line.includes(filters.text);
      return filters.invertText ? !match : match;
    });
  }

  return out.slice(-filters.maxRows);
};

export type DmesgLine = { severity: number; time: number | null; text: string };

export const parseDmesg = (raw: string): DmesgLine[] => {
  const lines: DmesgLine[] = [];
  let lastSeverity: number | null = null;
  let lastTime: number | null = null;

  for (const line of raw.trim().split("\n")) {
    if (!line) continue;
    const priorityMatch = line.match(/^<(\w+)>/);
    if (!priorityMatch) continue;

    const tag = priorityMatch[1];
    const isCont = tag === "c";
    const cleanLine = line.replace(/^<\w+>/, "");
    const timeMatch = cleanLine.match(/^\[\s*(\d+(?:\.\d+)?)\]/);
    const time = timeMatch ? parseFloat(timeMatch[1]) : null;
    if (time != null) lastTime = time;
    if (!isCont) lastSeverity = parseInt(tag, 10);

    lines.push({
      severity: isCont ? (lastSeverity ?? 0) : parseInt(tag, 10),
      time: time != null ? time : lastTime,
      text: cleanLine,
    });
  }

  return lines;
};

export const filterDmesgLines = (entries: DmesgLine[], filters: DmesgFilters) => {
  let out = entries;
  const hasStart = filters.fromTime !== "";
  const hasEnd = filters.toTime !== "";

  if (hasStart || hasEnd) {
    const from = hasStart ? parseFloat(filters.fromTime) : null;
    const to = hasEnd ? parseFloat(filters.toTime) : null;
    out = out.filter(({ time }) => {
      if (time == null) return false;
      let inRange = true;
      if (from != null && to != null) inRange = time >= from && time <= to;
      else if (from != null) inRange = time >= from;
      else if (to != null) inRange = time <= to;
      return filters.invertTimeRange ? !inRange : inRange;
    });
  }

  const minSev = filters.minSeverity === "" ? 0 : parseInt(filters.minSeverity, 10);
  out = out.filter((entry) =>
    filters.invertSeverity ? entry.severity < minSev : entry.severity >= minSev,
  );

  if (filters.text) {
    out = out.filter(({ text }) => {
      const match = text.includes(filters.text);
      return filters.invertText ? !match : match;
    });
  }

  if (filters.reverseSort) out = [...out].reverse();
  return out;
};

export const parseSystemClockPrefs = (uci: any): SystemClockPrefs => {
  let system: Record<string, string> = {};
  const values = uci?.values;

  if (values?.system) {
    if (Array.isArray(values.system)) {
      system =
        values.system.find((s: any) => s[".type"] === "system") ?? values.system[0] ?? {};
    } else if (values.system["@system[0]"]) {
      system = values.system["@system[0]"];
    } else {
      system = values.system;
    }
  }

  const zonename = system.zonename?.replaceAll?.(" ", "_");
  const timeStyle = system.clock_timestyle === "1" ? "full" : "long";
  const hourCycle =
    system.clock_hourcycle === "h23" || system.clock_hourcycle === "h12"
      ? system.clock_hourcycle
      : undefined;

  return { timeZone: zonename, timeStyle, hourCycle };
};
