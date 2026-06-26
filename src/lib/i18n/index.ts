import { en } from "./locales/en";
import { id } from "./locales/id";
import { jaksel } from "./locales/jaksel";
import { bogorian } from "./locales/bogorian";

export type Locale = "en" | "id" | "jaksel" | "bogorian";

const STORAGE_KEY = "rzid_lang";

let current: Locale =
  typeof localStorage !== "undefined"
    ? (localStorage.getItem(STORAGE_KEY) as Locale) || "en"
    : "en";

let listeners: Array<() => void> = [];

const notify = () => {
  for (const fn of listeners) fn();
};

export const subscribe = (fn: () => void) => {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((f) => f !== fn);
  };
};

export const onLocaleChange = (fn: () => void) => {
  fn(); // run once to get initial state
  return subscribe(fn);
};

export const setLocale = (locale: Locale) => {
  current = locale;
  if (typeof localStorage !== "undefined")
    localStorage.setItem(STORAGE_KEY, locale);
  notify();
};

export const getLocale = () => {
  return current;
};

const locales: Record<Locale, Record<string, string>> = {
  en,
  id,
  jaksel,
  bogorian,
};

export const t = (key: string): string => {
  return locales[current]?.[key] || locales["en"]?.[key] || key;
};
