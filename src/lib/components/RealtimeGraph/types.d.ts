export interface Series {
  label: string;
  color: string;
  data: number[];
}

export interface Props {
  series: Series[];
  formatValue: (v: number) => string;
  height?: number;
  maxPoints?: number;
  noData?: boolean;
  noDataMsg?: string;
}
