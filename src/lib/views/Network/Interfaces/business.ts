import { call, batchCall, uciCommit } from "../../../api/ubus";
import type { DeviceStatus } from "../types.d";

export const toArray = (v: any): string[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  return String(v).split(/\s+/).filter(Boolean);
};

export const initEditForm = (
  sec: Record<string, any>,
  dhcpSec: any,
  zone: string,
) => ({
  proto: sec.proto || "none",
  device: sec.device || "",
  disabled: sec.disabled === "1",
  auto: sec.auto !== "0",
  defaultroute: sec.defaultroute !== "0",
  peerdns: sec.peerdns !== "0",
  dns: sec.dns || "",
  dns_metric: sec.dns_metric || "",
  metric: sec.metric || "",
  multipath: sec.multipath || "",
  delegate: sec.delegate !== "0",
  sourcefilter: sec.sourcefilter !== "0",
  ip4table: sec.ip4table || "",
  ip6table: sec.ip6table || "",
  ip6assign: sec.ip6assign || "",
  ip6hint: sec.ip6hint || "",
  ip6class: sec.ip6class || "",
  ip6ifaceid: sec.ip6ifaceid || "",
  ip6weight: sec.ip6weight || "",
  force_link: sec.force_link === "1" || false,
  zone,
  bridge: sec.type === "bridge",
  ports: sec.ports || "",
  ifname: sec.ifname || "",
  stp: sec.stp || "",
  forward_delay: sec.forward_delay || "",
  priority: sec.priority || "",
  ageing_time: sec.ageing_time || "",
  hello_time: sec.hello_time || "",
  max_age: sec.max_age || "",
  vlan_filtering: sec.vlan_filtering || "",
  vlan_default_pvid: sec.vlan_default_pvid || "1",
  vlan_stats_per_port: sec.vlan_stats_per_port || "",
  dhcp_ignore: dhcpSec?.ignore === "1" || false,
  dhcp_dynamicdhcp: dhcpSec?.dynamicdhcp !== "0",
  dhcp_leasetime: dhcpSec?.leasetime || "12h",
  dhcp_force: dhcpSec?.force === "1" || false,
  dhcp_option: dhcpSec?.dhcp_option || "",
  dhcp_option_force: dhcpSec?.dhcp_option_force || "",
  dhcp_dhcpv4: dhcpSec?.dhcpv4 || "",
  dhcp_ipv6_only_preferred: dhcpSec?.ipv6_only_preferred || "",
  dhcp_start: dhcpSec?.start || "100",
  dhcp_limit: dhcpSec?.limit || "150",
  dhcp_netmask: dhcpSec?.netmask || "",
  dhcp_master: dhcpSec?.master === "1" || false,
  dhcp_ra: dhcpSec?.ra || "",
  dhcp_dhcpv6: dhcpSec?.dhcpv6 || "",
  dhcp_dns: dhcpSec?.dns || "",
  dhcp_dns_service: dhcpSec?.dns_service !== "0",
  dhcp_dnr: dhcpSec?.dnr || "",
  dhcp_domain: dhcpSec?.domain || "",
  dhcp_ndp: dhcpSec?.ndp || "",
  dhcp_ndproxy_routing: dhcpSec?.ndproxy_routing !== "0",
  dhcp_ndproxy_slave: dhcpSec?.ndproxy_slave === "1" || false,
  dhcp_dhcpv6_pd: dhcpSec?.dhcpv6_pd === "1" || false,
  dhcp_dhcpv6_pd_min_len: dhcpSec?.dhcpv6_pd_min_len || "",
  dhcp_ntp: dhcpSec?.ntp || "",
  dhcp_ra_default: dhcpSec?.ra_default || "",
  dhcp_ra_slaac: dhcpSec?.ra_slaac !== "0",
  dhcp_ra_preference: dhcpSec?.ra_preference || "medium",
  dhcp_ra_flags: dhcpSec?.ra_flags || "",
  dhcp_ra_pio_flags: dhcpSec?.dhcpv6_pd_preferred === "1" ? ["pd"] : [],
  dhcp_ra_pref64: dhcpSec?.ra_pref64 || "",
  dhcp_ra_maxinterval: dhcpSec?.ra_maxinterval || "",
  dhcp_ra_mininterval: dhcpSec?.ra_mininterval || "",
  dhcp_ra_reachabletime: dhcpSec?.ra_reachabletime || "",
  dhcp_ra_retranstime: dhcpSec?.ra_retranstime || "",
  dhcp_ra_lifetime: dhcpSec?.ra_lifetime || "",
  dhcp_ra_mtu: dhcpSec?.ra_mtu || "",
  dhcp_ra_hoplimit: dhcpSec?.ra_hoplimit || "",
  dhcp_max_preferred_lifetime: dhcpSec?.max_preferred_lifetime || "",
  dhcp_max_valid_lifetime: dhcpSec?.max_valid_lifetime || "",
});

export const buildEditVals = (editForm: Record<string, any>) => {
  const vals: Record<string, any> = {
    proto: editForm.proto || undefined,
    device: editForm.device || undefined,
    disabled: editForm.disabled ? "1" : "0",
    auto: editForm.auto ? "1" : "0",
    defaultroute: editForm.defaultroute ? "1" : "0",
    peerdns: editForm.peerdns ? "1" : "0",
    dns: editForm.dns || undefined,
    dns_metric: editForm.dns_metric || undefined,
    metric: editForm.metric || undefined,
    delegate: editForm.delegate ? "1" : "0",
    sourcefilter: editForm.sourcefilter ? "1" : "0",
    ip4table: editForm.ip4table || undefined,
    ip6table: editForm.ip6table || undefined,
    ip6assign: editForm.ip6assign || undefined,
    ip6hint: editForm.ip6hint || undefined,
    ip6class: editForm.ip6class || undefined,
    ip6ifaceid: editForm.ip6ifaceid || undefined,
    ip6weight: editForm.ip6weight || undefined,
    force_link: editForm.force_link ? "1" : "0",
    multipath: editForm.multipath || undefined,
  };
  if (editForm.bridge) {
    vals.type = "bridge";
    vals.ports = editForm.ports || undefined;
    vals.ifname = undefined;
    vals.stp = editForm.stp || undefined;
    vals.forward_delay = editForm.forward_delay || undefined;
    vals.priority = editForm.priority || undefined;
    vals.ageing_time = editForm.ageing_time || undefined;
    vals.hello_time = editForm.hello_time || undefined;
    vals.max_age = editForm.max_age || undefined;
    vals.vlan_filtering = editForm.vlan_filtering || undefined;
    vals.vlan_default_pvid = editForm.vlan_default_pvid || undefined;
    vals.vlan_stats_per_port = editForm.vlan_stats_per_port || undefined;
  } else {
    vals.ifname = editForm.ifname || undefined;
    vals.type = undefined;
    vals.ports = undefined;
    vals.stp = undefined;
    vals.forward_delay = undefined;
    vals.priority = undefined;
    vals.ageing_time = undefined;
    vals.hello_time = undefined;
    vals.max_age = undefined;
    vals.vlan_filtering = undefined;
    vals.vlan_default_pvid = undefined;
    vals.vlan_stats_per_port = undefined;
  }
  return vals;
};

export const buildDhcpVals = (editForm: Record<string, any>) => {
  const vals: Record<string, any> = {
    ignore: editForm.dhcp_ignore ? "1" : "0",
    dynamicdhcp: editForm.dhcp_dynamicdhcp ? "1" : "0",
    leasetime: editForm.dhcp_leasetime || undefined,
    force: editForm.dhcp_force ? "1" : "0",
    dhcp_option: editForm.dhcp_option || undefined,
    dhcp_option_force: editForm.dhcp_option_force || undefined,
    dhcpv4: editForm.dhcp_dhcpv4 || undefined,
    ipv6_only_preferred: editForm.dhcp_ipv6_only_preferred || undefined,
    start: editForm.dhcp_start || undefined,
    limit: editForm.dhcp_limit || undefined,
    netmask: editForm.dhcp_netmask || undefined,
    master: editForm.dhcp_master ? "1" : "0",
    ra: editForm.dhcp_ra || undefined,
    dhcpv6: editForm.dhcp_dhcpv6 || undefined,
    dns: editForm.dhcp_dns || undefined,
    dns_service: editForm.dhcp_dns_service ? "1" : "0",
    dnr: editForm.dhcp_dnr || undefined,
    domain: editForm.dhcp_domain || undefined,
    ndp: editForm.dhcp_ndp || undefined,
    ndproxy_routing: editForm.dhcp_ndproxy_routing ? "1" : "0",
    ndproxy_slave: editForm.dhcp_ndproxy_slave ? "1" : "0",
    dhcpv6_pd: editForm.dhcp_dhcpv6_pd ? "1" : "0",
    dhcpv6_pd_min_len: editForm.dhcp_dhcpv6_pd_min_len || undefined,
    ntp: editForm.dhcp_ntp || undefined,
    ra_default: editForm.dhcp_ra_default || undefined,
    ra_slaac: editForm.dhcp_ra_slaac ? "1" : "0",
    ra_preference: editForm.dhcp_ra_preference || undefined,
    ra_flags: editForm.dhcp_ra_flags || undefined,
    dhcpv6_pd_preferred: editForm.dhcp_ra_pio_flags?.includes?.("pd")
      ? "1"
      : "0",
    ra_pref64: editForm.dhcp_ra_pref64 || undefined,
    ra_maxinterval: editForm.dhcp_ra_maxinterval || undefined,
    ra_mininterval: editForm.dhcp_ra_mininterval || undefined,
    ra_reachabletime: editForm.dhcp_ra_reachabletime || undefined,
    ra_retranstime: editForm.dhcp_ra_retranstime || undefined,
    ra_lifetime: editForm.dhcp_ra_lifetime || undefined,
    ra_mtu: editForm.dhcp_ra_mtu || undefined,
    ra_hoplimit: editForm.dhcp_ra_hoplimit || undefined,
    max_preferred_lifetime: editForm.dhcp_max_preferred_lifetime || undefined,
    max_valid_lifetime: editForm.dhcp_max_valid_lifetime || undefined,
  };
  Object.keys(vals).forEach((k) => {
    if (vals[k] === undefined) delete vals[k];
  });
  return vals;
};

export const initDeviceEditForm = (sec: Record<string, any>, name: string) => ({
  name: sec.name || name,
  type: sec.type || "ethernet",
  mtu: sec.mtu || "",
  macaddr: sec.macaddr || "",
  ports: sec.ports || "",
  stp: sec.stp || "",
  forward_delay: sec.forward_delay || "",
  priority: sec.priority || "",
  ageing_time: sec.ageing_time || "",
  hello_time: sec.hello_time || "",
  max_age: sec.max_age || "",
  vlan_filtering: sec.vlan_filtering || "",
  vlan_default_pvid: sec.vlan_default_pvid || "1",
  vlan_stats_per_port: sec.vlan_stats_per_port || "",
  igmp_snooping: sec.igmp_snooping || "",
  ip6table: sec.ip6table || "",
  ip4table: sec.ip4table || "",
});
