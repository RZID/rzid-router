<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { Globe, RefreshCw } from "@lucide/svelte";
  import { cn } from "../../helpers/classname";
  import type { UciSection, UciConfig } from "../../types";
  import { t as _t, getLocale, onLocaleChange } from "../../i18n";
  import { call, batchCall, uciCommit } from "../../api/ubus";
  import TabBar from "../../components/TabBar/TabBar.svelte";
  import InterfaceTable from "./Interfaces/InterfaceTable.svelte";
  import DeviceTable from "./Interfaces/DeviceTable.svelte";
  import GlobalSettings from "./Interfaces/GlobalSettings.svelte";
  import AddInterfaceModal from "./Interfaces/AddInterfaceModal.svelte";
  import EditInterfaceModal from "./Interfaces/EditInterfaceModal.svelte";
  import DeviceEditModal from "./Interfaces/DeviceEditModal.svelte";
  import type { DeviceStatus, Iface } from "./types";
  import {
    mainTabs,
    editTabs,
    protocols,
    deviceTypeOptions,
    raServiceOptions,
    dhcpv6ServiceOptions,
    ndpProxyOptions,
    dhcpv4Options,
    multipathOptions,
    raDefaultOptions,
    raPreferenceOptions,
    raFlagsOptions,
    raPioFlagsOptions,
    lifetimeOptions,
    leasetimeOptions,
  } from "./Interfaces/config";
  import {
    toArray,
    initEditForm,
    buildEditVals,
    buildDhcpVals,
    initDeviceEditForm,
  } from "./Interfaces/business";

  type UciDeviceSection = UciSection & { name: string };

  let locale = $state(getLocale());
  let trans = $derived.by(() => {
    locale;
    return (k: string) => _t(k);
  });
  $effect(() =>
    onLocaleChange(() => {
      locale = getLocale();
    }),
  );

  let mainTab = $state("interfaces");
  let interfaces = $state<Iface[]>([]);
  let devices = $state<Record<string, DeviceStatus>>({});
  let firewalls = $state<Record<string, UciSection>>({});
  let dhcpConfig = $state<Record<string, UciSection>>({});
  let uciNetwork = $state<Record<string, UciSection>>({});
  let deviceUciSections = $state<UciDeviceSection[]>([]);
  let loading = $state(true);
  let pollTimer: ReturnType<typeof setInterval> | undefined;

  let editingIface = $state<string | null>(null);
  let editTab = $state("general");
  let editForm = $state<Record<string, string | boolean | string[] | undefined>>({});
  let globalForm = $state<Record<string, string | boolean>>({});
  let globalSaving = $state(false);
  let editSaved = $state(false);
  let btnBusy = $state<Record<string, "restart" | "stop">>({});

  let dhcpSubTab = $state("general");
  let ifaceFilter = $state("");

  let addingNewIface = $state(false);
  let newIfaceName = $state("");
  let newIfaceNameError = $state("");
  let newIfaceProto = $state("static");
  let newIfaceDevice = $state("");

  let editingDevice = $state<string | null>(null);
  let deviceEditForm = $state<Record<string, string>>({});

  const getFirewallZones = () => {
    const zones: { value: string; label: string }[] = [];
    for (const [, s] of Object.entries(firewalls)) {
      const sec = s as UciSection;
      if (sec[".type"] === "zone" && sec[".name"]) {
        zones.push({ value: sec[".name"], label: sec.name || sec[".name"] });
      }
    }
    return zones;
  };

  const zoneOptions = $derived(getFirewallZones());

  const fetchData = async () => {
    type NetRes = { interface?: Iface[] };
    const results = await batchCall<Record<string, unknown>>([
      { object: "network.interface", method: "dump" },
      { object: "uci", method: "get", params: { config: "firewall" } },
      { object: "uci", method: "get", params: { config: "dhcp" } },
      { object: "uci", method: "get", params: { config: "network" } },
    ]);
    const net = results[0] as NetRes | null;
    const fw = results[1] as UciConfig | null;
    const dhcp = results[2] as UciConfig | null;
    const uci = results[3] as UciConfig | null;

    const ifaces: Iface[] = (net?.interface || []).filter(
      (i: Iface) => i.interface !== "loopback",
    );
    interfaces = ifaces;

    if (fw?.values) firewalls = fw.values;
    if (dhcp?.values) dhcpConfig = dhcp.values;
    if (uci?.values) {
      uciNetwork = uci.values;
      const globalsSec = Object.entries(uci.values).find(
        ([, v]: [string, UciSection]) => v[".type"] === "globals",
      );
      const g = globalsSec?.[1] || ({} as UciSection);
      globalForm = {
        ula_prefix: g.ula_prefix || "",
        dhcp_default_duid: g.dhcp_default_duid || "",
        mptcp: g.mptcp === "1",
        tcp_l3mdev: g.tcp_l3mdev === "1",
        udp_l3mdev: g.udp_l3mdev === "1",
        packet_steering: g.packet_steering || "1",
      };
    }

    const devNames = [
      ...new Set(
        ifaces.map((i) => i.l2_device?.name || i.device).filter(Boolean),
      ),
    ];
    if (devNames.length > 0) {
      const calls = devNames.map((n) => ({
        object: "network.device",
        method: "status",
        params: { name: n },
      }));
      const devResults = await batchCall<any>(calls);
      const devMap: Record<string, DeviceStatus> = {};
      for (let i = 0; i < devNames.length; i++) {
        if (devResults[i]) devMap[devNames[i]] = devResults[i] as DeviceStatus;
      }
      devices = devMap;

      const allDevStatus = await call<Record<string, DeviceStatus>>(
        "network.device",
        "status",
        {},
      ).catch(() => null);
      if (allDevStatus) {
        for (const [k, v] of Object.entries(allDevStatus))
          devMap[k] = v as DeviceStatus;
        devices = devMap;
      }
    }

    const uciDevSections = [];
    for (const [k, v] of Object.entries(uci?.values || {})) {
      const sec = v as any;
      if (sec[".type"] === "device") uciDevSections.push({ name: k, ...sec });
    }
    deviceUciSections = uciDevSections;
    loading = false;
  };

  const ifaceUp = async (name: string) => {
    btnBusy = { ...btnBusy, [name]: "restart" };
    await call("network.interface", "down", { interface: name }).catch(
      () => {},
    );
    await new Promise((r) => setTimeout(r, 1000));
    await call("network.interface", "up", { interface: name }).catch(() => {});
    await new Promise((r) => setTimeout(r, 2000));
    await fetchData();
    btnBusy = Object.fromEntries(
      Object.entries(btnBusy).filter(([k]) => k !== name),
    );
  };

  const ifaceDown = async (name: string) => {
    btnBusy = { ...btnBusy, [name]: "stop" };
    await call("network.interface", "down", { interface: name }).catch(
      () => {},
    );
    await new Promise((r) => setTimeout(r, 2000));
    await fetchData();
    btnBusy = Object.fromEntries(
      Object.entries(btnBusy).filter(([k]) => k !== name),
    );
  };

  const getDhcpSection = (iface: string) => {
    for (const s of Object.values(dhcpConfig)) {
      const sec = s as any;
      if (sec[".type"] === "dhcp" && sec.interface === iface) return sec;
    }
    return null;
  };

  const getFirewallZone = (iface: string) => {
    for (const s of Object.values(firewalls)) {
      const sec = s as any;
      if (sec[".type"] === "zone") {
        const nets = toArray(sec.network);
        if (nets.includes(iface)) return sec[".name"] || "";
      }
    }
    return "";
  };

  const openEdit = (name: string) => {
    const sec = uciNetwork[name] || {};
    const dhcpSec = getDhcpSection(name);
    editForm = initEditForm(sec, dhcpSec, getFirewallZone(name));
    editTab = "general";
    dhcpSubTab = "general";
    editSaved = false;
    editingIface = name;
  };

  const closeEdit = () => {
    editingIface = null;
    editForm = {};
  };

  const saveEdit = async () => {
    if (!editingIface) return;
    const vals = buildEditVals(editForm);
    await call("uci", "set", {
      config: "network",
      section: editingIface,
      values: vals,
    });
    await uciCommit("network");

    const oldZone = getFirewallZone(editingIface);
    if (editForm.zone !== oldZone) {
      if (oldZone && firewalls[oldZone]) {
        const oldNets = toArray((firewalls[oldZone] as any).network);
        const idx = oldNets.indexOf(editingIface);
        if (idx >= 0) {
          oldNets.splice(idx, 1);
          await call("uci", "set", {
            config: "firewall",
            section: oldZone,
            values: { network: oldNets.join(" ") },
          });
        }
      }
      if (editForm.zone && firewalls[editForm.zone]) {
        const newNets = toArray((firewalls[editForm.zone] as any).network);
        if (!newNets.includes(editingIface)) {
          newNets.push(editingIface);
          await call("uci", "set", {
            config: "firewall",
            section: editForm.zone,
            values: { network: newNets.join(" ") },
          });
        }
      }
      await uciCommit("firewall");
    }

    const dhcpSec = getDhcpSection(editingIface);
    if (dhcpSec) {
      const dhcpName = dhcpSec[".name"] || "";
      const dhcpVals = buildDhcpVals(editForm);
      await call("uci", "set", {
        config: "dhcp",
        section: dhcpName,
        values: dhcpVals,
      });
      await uciCommit("dhcp");
    }

    const [uci, fw, dhcp] = await batchCall<any>([
      { object: "uci", method: "get", params: { config: "network" } },
      { object: "uci", method: "get", params: { config: "firewall" } },
      { object: "uci", method: "get", params: { config: "dhcp" } },
    ]);
    if (uci?.values) uciNetwork = uci.values;
    if (fw?.values) firewalls = fw.values;
    if (dhcp?.values) dhcpConfig = dhcp.values;
    editSaved = true;
    setTimeout(() => {
      editSaved = false;
      closeEdit();
    }, 1500);
  };

  const addNewInterface = async () => {
    newIfaceNameError = "";
    if (!newIfaceName) {
      newIfaceNameError = trans("Name is required");
      return;
    }
    if (newIfaceName.length > 15) {
      newIfaceNameError = trans(
        "Interface name is too long (max 15 characters)",
      );
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(newIfaceName)) {
      newIfaceNameError = trans("Invalid characters in interface name");
      return;
    }
    const existing = Object.keys(uciNetwork).filter(
      (k) => uciNetwork[k]?.[".type"] === "interface",
    );
    if (existing.includes(newIfaceName)) {
      newIfaceNameError = trans("Interface name already exists");
      return;
    }
    await call("uci", "add", {
      config: "network",
      type: "interface",
      name: newIfaceName,
    });
    await call("uci", "set", {
      config: "network",
      section: newIfaceName,
      values: { proto: newIfaceProto, device: newIfaceDevice || undefined },
    });
    await uciCommit("network");
    addingNewIface = false;
    newIfaceName = "";
    newIfaceNameError = "";
    newIfaceProto = "static";
    newIfaceDevice = "";
    await fetchData();
    openEdit(newIfaceName);
  };

  const deleteInterface = async (name: string) => {
    btnBusy = { ...btnBusy, [name]: "stop" };
    await call("network.interface", "down", { interface: name }).catch(
      () => {},
    );
    await call("uci", "set", {
      config: "network",
      section: name,
      values: { "": "" },
    });
    await uciCommit("network");
    const dhcpSec = getDhcpSection(name);
    if (dhcpSec) {
      await call("uci", "set", {
        config: "dhcp",
        section: dhcpSec[".name"],
        values: { "": "" },
      });
      await uciCommit("dhcp");
    }
    await fetchData();
    btnBusy = Object.fromEntries(
      Object.entries(btnBusy).filter(([k]) => k !== name),
    );
  };

  const openDeviceEdit = (name: string) => {
    const sec = uciNetwork[name] || {};
    deviceEditForm = initDeviceEditForm(sec, name);
    editingDevice = name;
  };

  const closeDeviceEdit = () => {
    editingDevice = null;
    deviceEditForm = {};
  };

  const saveDevice = async () => {
    if (!editingDevice) return;
    const vals: Record<string, any> = {};
    for (const [k, v] of Object.entries(deviceEditForm)) {
      if (v !== "" && v !== undefined) vals[k] = v;
    }
    await call("uci", "set", {
      config: "network",
      section: editingDevice,
      values: vals,
    });
    await uciCommit("network");
    await fetchData();
    closeDeviceEdit();
  };

  const saveGlobal = async () => {
    globalSaving = true;
    const globalsSec = Object.entries(uciNetwork).find(
      ([, v]: [string, any]) => v[".type"] === "globals",
    );
    const secName = globalsSec ? globalsSec[0] : "globals";
    const vals: Record<string, any> = {
      ula_prefix: globalForm.ula_prefix || undefined,
      dhcp_default_duid: globalForm.dhcp_default_duid || undefined,
      mptcp: globalForm.mptcp ? "1" : "0",
      tcp_l3mdev: globalForm.tcp_l3mdev ? "1" : "0",
      udp_l3mdev: globalForm.udp_l3mdev ? "1" : "0",
      packet_steering: globalForm.packet_steering || "1",
    };
    Object.keys(vals).forEach((k) => {
      if (vals[k] === undefined) delete vals[k];
    });
    if (!globalsSec) {
      await call("uci", "add", {
        config: "network",
        type: "globals",
        name: secName,
        values: vals,
      });
    } else {
      await call("uci", "set", {
        config: "network",
        section: secName,
        values: vals,
      });
    }
    await uciCommit("network");
    await fetchData();
    globalSaving = false;
  };

  const setupDhcpForEditingIface = async () => {
    if (!editingIface) return;
    await call("uci", "add", {
      config: "dhcp",
      type: "dhcp",
      name: editingIface,
    });
    await call("uci", "set", {
      config: "dhcp",
      section: editingIface,
      values: { interface: editingIface },
    });
    if (editForm.proto === "static") {
      await call("uci", "set", {
        config: "dhcp",
        section: editingIface,
        values: {
          start: "100",
          limit: "150",
          leasetime: "12h",
          dhcpv4: "server",
        },
      });
    } else {
      await call("uci", "set", {
        config: "dhcp",
        section: editingIface,
        values: { ignore: "1" },
      });
    }
    await uciCommit("dhcp");
    const dhcp = await call("uci", "get", { config: "dhcp" });
    if (dhcp?.values) dhcpConfig = dhcp.values;
    editForm.dhcp_ignore = editForm.proto !== "static";
  };

  onMount(async () => {
    await fetchData();
    pollTimer = setInterval(fetchData, 10000);
  });

  onDestroy(() => {
    clearInterval(pollTimer);
  });
</script>

<div
  class={cn("p-6", "flex", "flex-col", "min-h-0", "animate-fade-in", "gap-5")}
>
  <div
    class={cn("shrink-0", "flex", "items-start", "justify-between", "gap-4")}
  >
    <div class={cn("flex", "items-center", "gap-3")}>
      <div
        class={cn(
          "w-9",
          "h-9",
          "rounded-xl",
          "bg-accent/10",
          "flex",
          "items-center",
          "justify-center",
          "ring-1",
          "ring-accent/20",
          "shrink-0",
        )}
      >
        <Globe size={16} class={cn("text-accent")} />
      </div>
      <div>
        <h1 class={cn("text-lg", "font-semibold", "text-white")}>
          {trans("Interfaces")}
        </h1>
        <p class={cn("text-sm", "mt-0.5", "text-muted")}>
          {trans("Network configuration.")}
        </p>
      </div>
    </div>
    <button
      onclick={fetchData}
      class={cn(
        "p-2",
        "rounded-lg",
        "hover:bg-white/5",
        "transition-colors",
        "text-muted",
        "hover:text-fg",
        "cursor-pointer",
      )}><RefreshCw size={14} /></button
    >
  </div>

  <TabBar
    tabs={mainTabs}
    active={mainTab}
    onchange={(id: string) => (mainTab = id)}
  />

  {#key mainTab}
    {#if mainTab === "interfaces"}
      <InterfaceTable
        {interfaces}
        {devices}
        {firewalls}
        {btnBusy}
        filter={ifaceFilter}
        {loading}
        onadd={() => {
          addingNewIface = true;
          newIfaceName = "";
          newIfaceNameError = "";
          newIfaceProto = "static";
          newIfaceDevice = "";
        }}
        onrestart={ifaceUp}
        onstop={ifaceDown}
        onedit={openEdit}
        ondelete={deleteInterface}
        onfilter={(v: string) => (ifaceFilter = v)}
        {trans}
      />
    {:else if mainTab === "devices"}
      <DeviceTable
        {devices}
        {deviceUciSections}
        {loading}
        onconfigure={(name: string) => openDeviceEdit(name)}
        {trans}
      />
    {:else if mainTab === "global"}
      <GlobalSettings
        form={globalForm}
        saving={globalSaving}
        onsave={saveGlobal}
        {trans}
      />
    {/if}
  {/key}
</div>

<AddInterfaceModal
  show={addingNewIface}
  nameError={newIfaceNameError}
  {protocols}
  onclose={() => {
    addingNewIface = false;
  }}
  oncreate={addNewInterface}
  bind:name={newIfaceName}
  bind:proto={newIfaceProto}
  bind:device={newIfaceDevice}
  {trans}
/>

{#if editingIface}
  {@const ifc = interfaces.find((i) => i.interface === editingIface) ?? null}
  {@const dev = ifc ? devices[ifc.l2_device?.name || ifc.device] || null : null}
  {@const dhcpSec = getDhcpSection(editingIface)}
  <EditInterfaceModal
    show={true}
    {ifc}
    {dev}
    {editingIface}
    {editTab}
    {editForm}
    {editSaved}
    {editTabs}
    {dhcpSubTab}
    {dhcpSec}
    {zoneOptions}
    {protocols}
    {multipathOptions}
    {leasetimeOptions}
    {dhcpv4Options}
    {raServiceOptions}
    {dhcpv6ServiceOptions}
    {ndpProxyOptions}
    {raDefaultOptions}
    {raPreferenceOptions}
    {raFlagsOptions}
    {raPioFlagsOptions}
    {lifetimeOptions}
    onclose={closeEdit}
    onsave={saveEdit}
    onsetupdhcp={setupDhcpForEditingIface}
    onedittabchange={(id: string) => (editTab = id)}
    ondhcpsubtabchange={(id: string) => (dhcpSubTab = id)}
    {trans}
  />
{/if}

<DeviceEditModal
  show={editingDevice !== null}
  name={editingDevice || ""}
  form={deviceEditForm}
  {deviceTypeOptions}
  onclose={closeDeviceEdit}
  onsave={saveDevice}
  {trans}
/>
