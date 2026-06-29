export interface Props {
  label?: string;
  description?: string;
  options: { value: string; label: string }[];
  value?: string;
  placeholder?: string;
  class?: string;
  onchange?: () => void;
}
