<script lang="ts">
  import { onMount } from "svelte";
  import {
    batchCall,
    uciGet,
    uciSet,
    uciAdd,
    uciCommit,
    execCommand,
    call,
  } from "../../api/ubus";
  import { cn } from "../../helpers/classname";
  import { t as _t, getLocale, onLocaleChange } from "../../i18n";
  import TabBar from "../../components/TabBar/TabBar.svelte";
  import RouteTable from "./Routes/RouteTable.svelte";
  import EditModal from "./Routes/EditModal.svelte";

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

  type TabId = "ipv4-routes" | "ipv6-routes" | "ipv4-rules" | "ipv6-rules";
  const mainTabs: { id: TabId; label: string }[] = [
    { id: "ipv4-routes", label: "Static IPv4 Routes" },
    { id: "ipv6-routes", label: "Static IPv6 Routes" },
    { id: "ipv4-rules", label: "IPv4 Rules" },
    { id: "ipv6-rules", label: "IPv6 Rules" },
  ];
  let mainTab = $state<TabId>("ipv4-routes");
  let uciNetwork = $state<Record<string, any>>({});
  let rtTables = $state<[number, string][]>([]);
  let interfaces = $state<string[]>([]);
  let loading = $state(true);
  let editing: { section: string; type: string } | null = $state(null);
  let editSubTab = $state("general");
  let form = $state<Record<string, any>>({});
  let busy = $state<Record<string, string>>({});

  const getSections = (type: string) =>
    Object.entries(uciNetwork).filter(
      ([, v]: [string, any]) => v[".type"] === type,
    );
  const getType = () => {
    if (mainTab === "ipv4-routes") return "route";
    if (mainTab === "ipv6-routes") return "route6";
    if (mainTab === "ipv4-rules") return "rule";
    return "rule6";
  };
  const isV6 = () => mainTab === "ipv6-routes" || mainTab === "ipv6-rules";
  const isRule = () => mainTab === "ipv4-rules" || mainTab === "ipv6-rules";

  const fetchData = async () => {
    loading = true;
    const [uciRes, rtRes, devRes] = await batchCall<any>([
      { object: "uci", method: "get", params: { config: "network" } },
      {
        object: "file",
        method: "exec",
        params: { command: "cat", params: ["/etc/iproute2/rt_tables"] },
      },
      { object: "network.interface", method: "dump" },
    ]);
    uciNetwork = uciRes?.values || {};
    rtTables = (rtRes?.stdout || "")
      .split("\n")
      .map((l: string) => {
        const m = l.trim().match(/^(\d+)\s+(\S+)$/);
        return m ? ([parseInt(m[1]), m[2]] as [number, string]) : null;
      })
      .filter((e: any) => e && e[0] > 0);
    interfaces = (devRes?.interface || []).map((i: any) => i.interface);
    loading = false;
  };

  const tableName = (t: string | number) => {
    const num = typeof t === "number" ? t : parseInt(t);
    if (isNaN(num)) return t;
    const alias = rtTables.find(([n]) => n === num);
    return alias ? `${alias[1]} (${num})` : String(num);
  };

  // svelte-ignore state_referenced_locally
  const routeProtocols = [
    { value: "unicast", label: trans("unicast") },
    { value: "local", label: trans("local") },
    { value: "broadcast", label: trans("broadcast") },
    { value: "multicast", label: trans("multicast") },
    { value: "anycast", label: trans("anycast") },
    { value: "blackhole", label: trans("blackhole") },
    { value: "unreachable", label: trans("unreachable") },
    { value: "prohibit", label: trans("prohibit") },
  ];
  // svelte-ignore state_referenced_locally
  const ruleActions = [
    { value: "unicast", label: trans("unicast") },
    { value: "blackhole", label: trans("blackhole") },
    { value: "prohibit", label: trans("prohibit") },
    { value: "throw", label: trans("throw") },
    { value: "unreachable", label: trans("unreachable") },
  ];
  const protocols = Array.from({ length: 256 }, (_, i) => ({
    i,
    d: `proto_${i}`,
  }));

  const openEdit = (section: string) => {
    const sec = uciNetwork[section] || {};
    editing = { section, type: sec[".type"] || getType() };
    editSubTab = "general";
    form = {
      interface: sec.interface || "",
      type: sec.type || "",
      target: sec.target || "",
      gateway: sec.gateway || "",
      metric: sec.metric ?? "",
      mtu: sec.mtu ?? "",
      table: sec.table ?? "",
      src: sec.src || "",
      onlink: sec.onlink || "",
      disabled: sec.disabled || "",
      priority: sec.priority ?? "",
      action: sec.action || "",
      in: sec.in || "",
      out: sec.out || "",
      dest: sec.dest || "",
      lookup: sec.lookup ?? "",
      ipproto: sec.ipproto ?? "",
      goto: sec.goto ?? "",
      fwmark: sec.fwmark || "",
      sport: sec.sport || "",
      dport: sec.dport || "",
      tos: sec.tos ?? "",
      uid: sec.uid || "",
      supp_prefix: sec.supp_prefix ?? "",
      invert: sec.invert || "",
    };
  };
  const closeEdit = () => {
    editing = null;
    form = {};
  };
  const saveEdit = async () => {
    if (!editing) return;
    busy = { ...busy, [editing.section]: "saving" };
    await uciSet("network", editing.section, "interface", form.interface || "");
    await uciSet("network", editing.section, "target", form.target || "");
    await uciSet("network", editing.section, "gateway", form.gateway || "");
    if (form.metric !== "")
      await uciSet("network", editing.section, "metric", form.metric);
    if (form.mtu !== "")
      await uciSet("network", editing.section, "mtu", form.mtu);
    if (form.table !== "")
      await uciSet("network", editing.section, "table", form.table);
    await uciSet("network", editing.section, "src", form.src || "");
    await uciSet("network", editing.section, "type", form.type || "");
    await uciSet("network", editing.section, "onlink", form.onlink || "");
    await uciSet("network", editing.section, "disabled", form.disabled || "");
    await uciSet("network", editing.section, "priority", form.priority || "");
    await uciSet("network", editing.section, "action", form.action || "");
    await uciSet("network", editing.section, "in", form.in || "");
    await uciSet("network", editing.section, "out", form.out || "");
    await uciSet("network", editing.section, "dest", form.dest || "");
    if (form.lookup !== "")
      await uciSet("network", editing.section, "lookup", form.lookup);
    if (form.ipproto !== "")
      await uciSet("network", editing.section, "ipproto", form.ipproto);
    if (form.goto !== "")
      await uciSet("network", editing.section, "goto", form.goto);
    await uciSet("network", editing.section, "fwmark", form.fwmark || "");
    await uciSet("network", editing.section, "sport", form.sport || "");
    await uciSet("network", editing.section, "dport", form.dport || "");
    if (form.tos !== "")
      await uciSet("network", editing.section, "tos", form.tos);
    await uciSet("network", editing.section, "uid", form.uid || "");
    if (form.supp_prefix !== "")
      await uciSet("network", editing.section, "supp_prefix", form.supp_prefix);
    await uciSet("network", editing.section, "invert", form.invert || "");
    await uciCommit("network");
    await fetchData();
    busy = { ...busy, [editing.section]: "" };
    editing = null;
    form = {};
  };
  const deleteSection = async (name: string) => {
    busy = { ...busy, [name]: "deleting" };
    for (const k of Object.keys(uciNetwork[name] || {}))
      if (!k.startsWith(".")) await uciSet("network", name, k, "");
    await uciCommit("network");
    await fetchData();
    busy = { ...busy, [name]: "" };
  };
  const addSection = async () => {
    const name = (await uciAdd("network", getType())).slice(1, -1);
    await fetchData();
    openEdit(name);
  };

  onMount(() => fetchData());
</script>

<div class={cn("p-6", "animate-fade-in")}>
  <h1 class={cn("text-lg", "font-semibold", "text-white")}>
    {trans("Routing")}
  </h1>
  <p class={cn("text-sm", "mt-0.5", "mb-4", "text-muted")}>
    {trans("Static routes & rules")}
  </p>

  <TabBar
    tabs={mainTabs}
    active={mainTab}
    onchange={(id: string) => {
      mainTab = id as TabId;
    }}
  />

  {#if loading}
    <p class={cn("text-xs", "text-muted", "italic", "mt-6", "text-center")}>
      {trans("Loading...")}
    </p>
  {:else}
    <div class={cn("mt-4", "space-y-4")}>
      <RouteTable
        sections={getSections(getType())}
        isRule={isRule()}
        {tableName}
        {busy}
        onadd={addSection}
        onedit={openEdit}
        ondelete={deleteSection}
        {trans}
      />
    </div>
  {/if}
</div>

{#if editing}
  <EditModal
    {editing}
    {form}
    bind:editSubTab
    {interfaces}
    {rtTables}
    {routeProtocols}
    {ruleActions}
    {protocols}
    {busy}
    onclose={closeEdit}
    onsave={saveEdit}
    onsubtabchange={(id: string) => (editSubTab = id)}
    {trans}
  />
{/if}
