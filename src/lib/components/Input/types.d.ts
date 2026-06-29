export interface Props {
  label?: string;
  value?: any;
  placeholder?: string;
  type?: string;
  readonly?: boolean;
  disabled?: boolean;
  mono?: boolean;
  class?: string;
  description?: string;
  oninput?: () => void;
  onchange?: () => void;
}
