import { call } from "./session";
import type { JsonValue } from "../types";

export const uciGet = async (config: string) => call("uci", "get", { config });

export const uciSet = async (config: string, section: string, key: string | Record<string, string | undefined>, value?: string) => {
  const values = typeof key === "string" && value !== undefined ? { [key]: value } : key as Record<string, string | undefined>;
  await call("uci", "set", { config, section, values });
  return call("uci", "commit", { config });
};

export const uciSetSection = async (config: string, section: string, values: Record<string, JsonValue>) =>
  call("uci", "set", { config, section, values });

export const uciCommit = async (config: string) => call("uci", "commit", { config });

export const uciAdd = async (config: string, type: string, name?: string) => {
  const p: Record<string, string> = { config, type };
  if (name) p.name = name;
  return call("uci", "add", p);
};
