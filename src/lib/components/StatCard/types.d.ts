import type { Component } from "svelte";

export interface Props {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  Icon?: Component;
  pulse?: boolean;
}
