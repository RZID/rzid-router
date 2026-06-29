export interface Props {
  label?: string;
  description?: string;
  checked: boolean;
  class?: string;
  onchange?: (v: boolean) => void;
}
