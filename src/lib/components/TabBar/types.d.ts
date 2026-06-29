export interface Props {
  tabs: { id: string; label: string }[];
  active?: string;
  onchange?: (id: string) => void;
}
