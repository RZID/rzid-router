import clsx from "clsx";

export const cn = (
  ...classes: (string | undefined | null | false)[]
): string => {
  return clsx(classes);
};
