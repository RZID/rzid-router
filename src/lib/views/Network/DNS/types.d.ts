export type RecTab = "hosts" | "srvhosts" | "mxhosts" | "cnamehosts" | "dnsrr";

export interface Props {
  dnsForm: Record<string, any>;
  labelCls?: string;
  updateList: (key: string, index: number, value: string) => void;
  rmList: (key: string, index: number) => void;
  addList: (key: string) => void;
  newItems: Record<string, any>;
}
