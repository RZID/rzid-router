import { call } from "./session";

export const uciGet = async (config: string) => call("uci", "get", { config });

export const uciSet = async (config: string, section: string, values: Record<string, any>) => {
  await call("uci", "set", { config, section, values });
  return call("uci", "commit", { config });
};

export const uciSetSection = async (config: string, section: string, values: Record<string, any>) =>
  call("uci", "set", { config, section, values });

export const uciCommit = async (config: string) => call("uci", "commit", { config });

export const uciAdd = async (config: string, type: string, name?: string) => {
  const p: Record<string, any> = { config, type };
  if (name) p.name = name;
  return call("uci", "add", p);
};
