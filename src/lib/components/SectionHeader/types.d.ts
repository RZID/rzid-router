import type { Snippet } from "svelte";

export interface Props {
  title: string;
  open?: boolean;
  ontoggle?: () => void;
  badge?: string;
  children?: Snippet;
}
