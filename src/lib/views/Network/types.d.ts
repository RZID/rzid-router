export interface Iface {
  interface: string;
  proto: string;
  device: string;
  l2_device?: { name: string; macaddr: string };
  up: boolean;
  uptime: number;
  pending: boolean;
  "ipv4-address"?: { address: string; mask: number }[];
  "ipv6-address"?: { address: string; mask: number }[];
  route?: { nexthop: string; target: string }[];
  "dns-server"?: string[];
}

export interface DeviceStatus {
  name: string;
  macaddr: string;
  carrier: boolean;
  type: string;
  speed?: number;
  "link-supported"?: string[];
  mtu: number;
  statistics: {
    rx_bytes: number;
    tx_bytes: number;
    rx_packets: number;
    tx_packets: number;
    rx_errors: number;
    tx_errors: number;
  };
  ports?: string[];
  pse?: any;
}
