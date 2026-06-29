export interface AclRule {
  name: string;
  action: string;
  int_addr: string;
  int_ports: string;
  ext_ports: string;
  comment: string;
}
