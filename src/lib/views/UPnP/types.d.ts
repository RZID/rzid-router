export interface AclRule {
  name?: string;
  action: string;
  int_addr: string;
  int_ports: string;
  ext_ports: string;
  comment: string;
}

export interface ActivePortMap {
  host_hint?: string;
  intaddr?: string;
  intport?: string;
  extport?: string;
  proto?: string;
  expires?: number;
  descr?: string;
  num: number;
}
