import type { UciConfig } from "../../../types";
import type { DdnsServiceStatus } from "../../../api/ubus";

export interface SystemInfoData {
  uptime?: number;
  localtime?: number;
  load?: [number, number, number];
  memory?: {
    total: number;
    free: number;
    buffered?: number;
    cached?: number;
  };
  root?: { total: number; free: number };
  tmp?: { total: number; free: number };
}

export interface BoardInfo {
  hostname?: string;
  model?: string;
  system?: string;
  kernel?: string;
  release?: { target?: string; version?: string };
}

export interface NetworkInterface {
  interface: string;
  proto?: string;
  device?: string;
  l3_device?: string;
  l2_device?: { name?: string; macaddr?: string };
  "ipv4-address"?: { address: string; mask?: number }[];
  route?: { target?: string; nexthop?: string }[];
  "dns-server"?: string[];
}

export interface NetworkInterfaceDump {
  interface: NetworkInterface[];
}

export interface NetworkDeviceStats {
  rx_bytes: number;
  tx_bytes: number;
  rx_packets: number;
  tx_packets: number;
  rx_errors: number;
  tx_errors: number;
  rx_dropped: number;
  tx_dropped: number;
}

export interface NetworkDevice {
  mac?: string;
  stats?: NetworkDeviceStats;
  ipaddrs?: { address: string; netmask: string }[];
}

export type NetworkDevices = Record<string, NetworkDevice>;

export interface DhcpLease {
  hostname?: string;
  ipaddr?: string;
  macaddr: string;
  leasetime?: number;
  expires?: number;
}

export interface Dhcp6Lease {
  hostname?: string;
  ip6addr?: string;
  ip6addrs?: string[];
  duid: string;
  leasetime?: number;
  expires?: number;
}

export interface DhcpLeasesData {
  dhcp_leases?: DhcpLease[];
  dhcp6_leases?: Dhcp6Lease[];
}

export interface UpnpRule {
  descr?: string;
  client?: string;
  client_addr?: string;
  client_port?: string | number;
  ext_port?: string | number;
  protocol?: string;
  expires?: string | number;
}

export interface UpnpStatusData {
  rules?: UpnpRule[];
}

export interface DdnsStatusRow extends DdnsServiceStatus {
  _name: string;
  _lookup_host: string;
  _network: string;
}

export type DdnsServicesStatus = Record<string, DdnsServiceStatus>;

export type DashboardBatchResult = [
  SystemInfoData | null,
  BoardInfo | null,
  NetworkInterfaceDump | null,
  NetworkDevices | null,
  DhcpLeasesData | null,
  DdnsServicesStatus | null,
  UpnpStatusData | null,
  UciConfig | null,
];
