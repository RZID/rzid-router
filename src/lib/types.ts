export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type UciConfigValue = string | undefined;
export type UciSection = Record<string, UciConfigValue>;
export type UciConfig = { values?: Record<string, UciSection> };
