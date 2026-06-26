const STORAGE_KEY = "rzid_theme";
const DEFAULT_THEME = "";

let current: string =
  typeof localStorage !== "undefined"
    ? localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME
    : DEFAULT_THEME;

let listeners: Array<() => void> = [];

const apply = (theme: string) => {
  if (typeof document !== "undefined") {
    if (theme) {
      document.documentElement.setAttribute("data-theme", theme);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }
};

const notify = () => {
  for (const fn of listeners) fn();
};

export const onThemeChange = (fn: () => void) => {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((f) => f !== fn);
  };
};

export const setTheme = (theme: string) => {
  current = theme;
  if (typeof localStorage !== "undefined")
    localStorage.setItem(STORAGE_KEY, theme);
  apply(theme);
  notify();
};

export const getTheme = () => {
  return current;
};

apply(current);
