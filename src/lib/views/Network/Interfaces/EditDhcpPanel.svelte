<script lang="ts">
  import { cn } from "../../../helpers/classname";
  import Input from "../../../components/Input/Input.svelte";
  import Toggle from "../../../components/Toggle/Toggle.svelte";
  import Select from "../../../components/Select/Select.svelte";
  import TabBar from "../../../components/TabBar/TabBar.svelte";

  let {
    form,
    proto,
    dhcpSec,
    dhcpSubTab,
    leasetimeOptions,
    dhcpv4Options,
    raServiceOptions,
    dhcpv6ServiceOptions,
    ndpProxyOptions,
    raDefaultOptions,
    raPreferenceOptions,
    raFlagsOptions,
    raPioFlagsOptions,
    lifetimeOptions,
    onsubtabchange,
    onsetupdhcp,
    trans,
  }: {
    form: Record<string, any>;
    proto: string;
    dhcpSec: any;
    dhcpSubTab: string;
    leasetimeOptions: { value: string; label: string }[];
    dhcpv4Options: { value: string; label: string }[];
    raServiceOptions: { value: string; label: string }[];
    dhcpv6ServiceOptions: { value: string; label: string }[];
    ndpProxyOptions: { value: string; label: string }[];
    raDefaultOptions: { value: string; label: string }[];
    raPreferenceOptions: { value: string; label: string }[];
    raFlagsOptions: { value: string; label: string }[];
    raPioFlagsOptions: { value: string; label: string }[];
    lifetimeOptions: { value: string; label: string }[];
    onsubtabchange: (id: string) => void;
    onsetupdhcp: () => void;
    trans: (k: string) => string;
  } = $props();

  // svelte-ignore state_referenced_locally
  const dhcpSubTabs = [
    { id: "general", label: trans("General Setup") },
    { id: "ipv4", label: trans("IPv4 Settings") },
    { id: "ipv6", label: trans("IPv6 Settings") },
    { id: "dhcpv6", label: trans("DHCPv6 Settings") },
    { id: "ipv6-ra", label: trans("IPv6 RA Settings") },
  ];
</script>

{#if dhcpSec}
  <TabBar tabs={dhcpSubTabs} active={dhcpSubTab} onchange={onsubtabchange} />
  <div class={cn("h-px", "bg-border")}></div>
  {#key dhcpSubTab}
    {#if dhcpSubTab === "general"}
      <div class={cn("space-y-4")}>
        <Toggle
          label={trans("Ignore interface")}
          description={trans("Disable DHCP for this interface (dnsmasq only)")}
          bind:checked={form.dhcp_ignore}
        />
        {#if proto === "static"}
          <Toggle
            label={trans("Dynamic DHCP")}
            description={trans(
              "Dynamically allocate DHCP addresses for clients. If disabled, only clients having static leases will be served.",
            )}
            bind:checked={form.dhcp_dynamicdhcp}
          />
          <Select
            label={trans("Lease time")}
            options={leasetimeOptions}
            bind:value={form.dhcp_leasetime}
          />
          <Toggle
            label={trans("Force")}
            description={trans(
              "Force DHCP on this network even if another server is detected (dnsmasq only)",
            )}
            bind:checked={form.dhcp_force}
          />
          <Input
            label={trans("DHCP-Options")}
            bind:value={form.dhcp_option}
            placeholder="6,192.168.2.1,192.168.2.2"
            mono
          />
          <p class={cn("text-[10px]", "text-muted", "italic", "-mt-3")}>
            {trans(
              "Define additional DHCP options (dnsmasq only). Example: 6,192.168.2.1,192.168.2.2",
            )}
          </p>
          <Input
            label={trans("Force DHCP-Options")}
            bind:value={form.dhcp_option_force}
            placeholder=""
            mono
          />
          <p class={cn("text-[10px]", "text-muted", "italic", "-mt-3")}>
            {trans("As DHCP-Options; send unsolicited (dnsmasq only).")}
          </p>
        {/if}
      </div>
    {:else if dhcpSubTab === "ipv4"}
      <div class={cn("space-y-4")}>
        <Select
          label={trans("DHCPv4 Service")}
          options={dhcpv4Options}
          bind:value={form.dhcp_dhcpv4}
          placeholder={trans("disabled")}
        />
        <Input
          label={trans("IPv6-Only Preferred")}
          bind:value={form.dhcp_ipv6_only_preferred}
          placeholder="0"
          type="number"
        />
        <p class={cn("text-[10px]", "text-muted", "italic", "-mt-3")}>
          {trans(
            "Specifies how often (in seconds) clients should check whether IPv6-only mode is still preferred (odhcpd only).",
          )}
        </p>
        {#if proto === "static"}
          <div class={cn("grid", "grid-cols-2", "gap-4")}>
            <Input
              label={trans("Start")}
              bind:value={form.dhcp_start}
              placeholder="100"
              type="number"
            />
            <Input
              label={trans("Limit")}
              bind:value={form.dhcp_limit}
              placeholder="150"
              type="number"
            />
          </div>
          <Input
            label={trans("IPv4-Netmask")}
            bind:value={form.dhcp_netmask}
            placeholder=""
            mono
          />
          <p class={cn("text-[10px]", "text-muted", "italic", "-mt-3")}>
            {trans(
              "Override the netmask sent to clients. Normally it is calculated from the subnet that is served (dnsmasq only).",
            )}
          </p>
        {/if}
      </div>
    {:else if dhcpSubTab === "ipv6"}
      <div class={cn("space-y-4")}>
        <Toggle
          label={trans("Designated master")}
          description={trans(
            "Set this interface as master for RA and DHCPv6 relaying as well as NDP proxying.",
          )}
          bind:checked={form.dhcp_master}
        />
        <Select
          label={trans("RA-Service")}
          options={raServiceOptions}
          bind:value={form.dhcp_ra}
          placeholder={trans("disabled")}
        />
        <Select
          label={trans("DHCPv6-Service")}
          options={dhcpv6ServiceOptions}
          bind:value={form.dhcp_dhcpv6}
          placeholder={trans("disabled")}
        />
        <Input
          label={trans("Announce IPv4/6 DNS servers")}
          bind:value={form.dhcp_dns}
          placeholder="2001:db8::53 192.168.1.53"
          mono
        />
        <p class={cn("text-[10px]", "text-muted", "italic", "-mt-3")}>
          {trans(
            "If left unspecified, the device will announce itself as DNS server.",
          )}
        </p>
        <Toggle
          label={trans("Local IPv6 DNS server")}
          description={trans("Announce this device as IPv6 DNS server.")}
          bind:checked={form.dhcp_dns_service}
        />
        <Input
          label={trans("Announce DNS domains")}
          bind:value={form.dhcp_domain}
          placeholder="example.com"
          mono
        />
        <Input
          label={trans("Announce encrypted DNS servers (DNR)")}
          bind:value={form.dhcp_dnr}
          placeholder="100 dns.example.com 2001:db8::53"
          mono
        />
        <p class={cn("text-[10px]", "text-muted", "italic", "-mt-3")}>
          {trans(
            "Syntax: <numeric priority> <domain-name> [IP,...] [SVC parameter ...]",
          )}
        </p>
        <Select
          label={trans("NDP-Proxy")}
          options={ndpProxyOptions}
          bind:value={form.dhcp_ndp}
          placeholder={trans("disabled")}
        />
        <Toggle
          label={trans("Learn routes")}
          description={trans("Set up routes for proxied IPv6 neighbours.")}
          bind:checked={form.dhcp_ndproxy_routing}
        />
        <Toggle
          label={trans("NDP-Proxy slave")}
          description={trans("Set interface as NDP-Proxy external slave.")}
          bind:checked={form.dhcp_ndproxy_slave}
        />
      </div>
    {:else if dhcpSubTab === "dhcpv6"}
      <div class={cn("space-y-4")}>
        <Toggle
          label={trans("DHCPv6-PD")}
          description={trans("Toggle IPv6 PD via DHCPv6.")}
          bind:checked={form.dhcp_dhcpv6_pd}
        />
        <Input
          label={trans("PD minimum length")}
          bind:value={form.dhcp_dhcpv6_pd_min_len}
          placeholder="62"
          type="number"
        />
        <p class={cn("text-[10px]", "text-muted", "italic", "-mt-3")}>
          {trans(
            "Minimum delegated prefix length assigned to a requesting downstream router.",
          )}
        </p>
        <Input
          label={trans("NTP Servers")}
          bind:value={form.dhcp_ntp}
          placeholder="2001:db8::1"
          mono
        />
        <p class={cn("text-[10px]", "text-muted", "italic", "-mt-3")}>
          {trans("DHCPv6 option 56.")}
        </p>
      </div>
    {:else if dhcpSubTab === "ipv6-ra"}
      <div class={cn("space-y-4")}>
        <Select
          label={trans("Default router")}
          options={raDefaultOptions}
          bind:value={form.dhcp_ra_default}
          placeholder={trans("automatic")}
        />
        <Toggle
          label={trans("Enable SLAAC")}
          description={trans(
            "Set the autonomous address-configuration flag in RA prefix information options.",
          )}
          bind:checked={form.dhcp_ra_slaac}
        />
        <Select
          label={trans("Router Priority")}
          options={raPreferenceOptions}
          bind:value={form.dhcp_ra_preference}
        />
        <div>
          <span
            class={cn(
              "block",
              "text-[10px]",
              "uppercase",
              "text-muted",
              "font-semibold",
              "tracking-wider",
              "mb-1.5",
            )}>{trans("RA Flags")}</span
          >
          <div class={cn("space-y-1")}>
            {#each raFlagsOptions as opt}
              <label
                class={cn("flex", "items-center", "gap-2", "cursor-pointer")}
              >
                <input
                  type="checkbox"
                  checked={Array.isArray(form.dhcp_ra_flags)
                    ? form.dhcp_ra_flags.includes(opt.value)
                    : String(form.dhcp_ra_flags || "").includes(opt.value)}
                  onchange={(e) => {
                    const checked = (e.target as HTMLInputElement).checked;
                    let flags = Array.isArray(form.dhcp_ra_flags)
                      ? [...form.dhcp_ra_flags]
                      : [];
                    if (checked) {
                      if (!flags.includes(opt.value)) flags.push(opt.value);
                    } else {
                      flags = flags.filter((f: string) => f !== opt.value);
                    }
                    form.dhcp_ra_flags = flags;
                  }}
                  class={cn(
                    "accent-(--accent)",
                    "w-3.5",
                    "h-3.5",
                    "rounded",
                    "cursor-pointer",
                  )}
                />
                <span class={cn("text-xs", "text-fg")}>{opt.label}</span>
              </label>
            {/each}
          </div>
        </div>
        <div>
          <span
            class={cn(
              "block",
              "text-[10px]",
              "uppercase",
              "text-muted",
              "font-semibold",
              "tracking-wider",
              "mb-1.5",
            )}>{trans("RA PIO Flags")}</span
          >
          <div class={cn("space-y-1")}>
            {#each raPioFlagsOptions as opt}
              <label
                class={cn("flex", "items-center", "gap-2", "cursor-pointer")}
              >
                <input
                  type="checkbox"
                  checked={Array.isArray(form.dhcp_ra_pio_flags)
                    ? form.dhcp_ra_pio_flags.includes(opt.value)
                    : false}
                  onchange={(e) => {
                    const checked = (e.target as HTMLInputElement).checked;
                    let flags = Array.isArray(form.dhcp_ra_pio_flags)
                      ? [...form.dhcp_ra_pio_flags]
                      : [];
                    if (checked) {
                      if (!flags.includes(opt.value)) flags.push(opt.value);
                    } else {
                      flags = flags.filter((f: string) => f !== opt.value);
                    }
                    form.dhcp_ra_pio_flags = flags;
                  }}
                  class={cn(
                    "accent-(--accent)",
                    "w-3.5",
                    "h-3.5",
                    "rounded",
                    "cursor-pointer",
                  )}
                />
                <span class={cn("text-xs", "text-fg")}>{opt.label}</span>
              </label>
            {/each}
          </div>
        </div>
        <Input
          label={trans("NAT64 prefix")}
          bind:value={form.dhcp_ra_pref64}
          placeholder="64:ff9b::/96"
          mono
        />
        <div class={cn("grid", "grid-cols-2", "gap-4")}>
          <Input
            label={trans("Max RA interval")}
            bind:value={form.dhcp_ra_maxinterval}
            placeholder="600"
            type="number"
          />
          <Input
            label={trans("Min RA interval")}
            bind:value={form.dhcp_ra_mininterval}
            placeholder="200"
            type="number"
          />
        </div>
        <div class={cn("grid", "grid-cols-2", "gap-4")}>
          <Input
            label={trans("RA Reachability Timer")}
            bind:value={form.dhcp_ra_reachabletime}
            placeholder="0"
            type="number"
          />
          <Input
            label={trans("RA Retransmission Timer")}
            bind:value={form.dhcp_ra_retranstime}
            placeholder="0"
            type="number"
          />
        </div>
        <Input
          label={trans("RA Lifetime")}
          bind:value={form.dhcp_ra_lifetime}
          placeholder="2700"
          type="number"
        />
        <div class={cn("grid", "grid-cols-2", "gap-4")}>
          <Input
            label={trans("RA MTU")}
            bind:value={form.dhcp_ra_mtu}
            placeholder="1500"
            type="number"
          />
          <Input
            label={trans("RA Hop Limit")}
            bind:value={form.dhcp_ra_hoplimit}
            placeholder="64"
            type="number"
          />
        </div>
        <Select
          label={trans("IPv6 Preferred Prefix Lifetime")}
          options={lifetimeOptions}
          bind:value={form.dhcp_max_preferred_lifetime}
          placeholder="45m"
        />
        <Select
          label={trans("IPv6 Valid Prefix Lifetime")}
          options={lifetimeOptions}
          bind:value={form.dhcp_max_valid_lifetime}
          placeholder="90m"
        />
      </div>
    {/if}
  {/key}
{:else}
  <div class={cn("space-y-4")}>
    <p class={cn("text-xs", "text-muted", "italic")}>
      {trans("No DHCP Server configured for this interface.")}
    </p>
    <button
      onclick={onsetupdhcp}
      class={cn(
        "px-3",
        "py-1.5",
        "text-xs",
        "rounded-md",
        "font-medium",
        "text-surface",
        "bg-accent",
        "hover:bg-accent/90",
        "cursor-pointer",
        "transition-all",
      )}
    >
      {trans("Set up DHCP Server")}
    </button>
  </div>
{/if}
