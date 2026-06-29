export interface ParsedKey {
  type: string;
  bits?: number;
  curve?: string;
  comment: string;
  fprint: string;
  src: string;
  options: Record<string, string> | null;
}

export interface DropbearInstance {
  name: string;
  enable: boolean;
  port: string;
  iface: string;
  passwordAuth: boolean;
  rootPasswordAuth: boolean;
  gatewayPorts: boolean;
}
