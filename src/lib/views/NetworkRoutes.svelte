<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { batchCall, uciGet, uciSet, uciAdd, uciCommit, execCommand, call } from "../api/ubus";
  import { cn } from "../helpers/classname";
  import { t as _t, getLocale, onLocaleChange } from "../i18n";
  import TabBar from "../components/TabBar/index.svelte";
  import { Plus, Pencil, Trash2, Save, X } from "@lucide/svelte";

  let locale = $state(getLocale());
  let trans = $derived.by(() => { locale; return (k: string) => _t(k); });
  $effect(() => onLocaleChange(() => { locale = getLocale(); }));

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
    Object.entries(uciNetwork).filter(([, v]: [string, any]) => v[".type"] === type);

  const uciSection = (name: string) => uciNetwork[name] || {};

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
      { object: "file", method: "exec", params: { command: "cat", params: ["/etc/iproute2/rt_tables"] } },
      { object: "network.interface", method: "dump" },
    ]);
    uciNetwork = uciRes || {};
    rtTables = (rtRes?.stdout || "")
      .split("\n")
      .map((l: string) => {
        const m = l.trim().match(/^(\d+)\s+(\S+)$/);
        return m ? [parseInt(m[1]), m[2]] as [number, string] : null;
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

  const openEdit = (section: string) => {
    const sec = uciNetwork[section] || {};
    editing = { section, type: sec[".type"] || getType() };
    editSubTab = "general";
    form = {
      interface: sec.interface || "",
      type: sec.type || "",
      target: sec.target || "",
      netmask: sec.netmask || "",
      gateway: sec.gateway || "",
      metric: sec.metric ?? "",
      mtu: sec.mtu ?? "",
      table: sec.table ?? "",
      source: sec.source ?? "",
      onlink: sec.onlink ?? "",
      disabled: sec.disabled ?? "",
      priority: sec.priority ?? "",
      action: sec.action ?? "",
      in: sec.in ?? "",
      src: sec.src ?? "",
      ipproto: sec.ipproto ?? "",
      out: sec.out ?? "",
      dest: sec.dest ?? "",
      lookup: sec.lookup ?? "",
      goto: sec.goto ?? "",
      mark: sec.mark ?? "",
      sport: sec.sport ?? "",
      dport: sec.dport ?? "",
      tos: sec.tos ?? "",
      uidrange: sec.uidrange ?? "",
      suppress_prefixlength: sec.suppress_prefixlength ?? "",
      invert: sec.invert ?? "",
    };
  };

  const closeEdit = () => { editing = null; form = {}; };

  const saveEdit = async () => {
    if (!editing) return;
    const path = editing.section;
    const vals: Record<string, any> = {};
    const keys = Object.keys(form);
    for (const k of keys) {
      const v = form[k];
      if (v !== "" && v !== undefined) vals[k] = v;
    }
    vals[".type"] = editing.type;
    busy = { ...busy, [path]: "save" };
    await call("uci", "set", { config: "network", section: path, values: vals });
    await uciCommit("network");
    await fetchData();
    busy = Object.fromEntries(Object.entries(busy).filter(([k]) => k !== path));
    closeEdit();
  };

  const deleteSection = async (section: string) => {
    busy = { ...busy, [section]: "delete" };
    await call("uci", "set", { config: "network", section, values: { "": "" } });
    await uciCommit("network");
    await fetchData();
    busy = Object.fromEntries(Object.entries(busy).filter(([k]) => k !== section));
  };

  const addSection = async () => {
    const type = getType();
    const name = await uciAdd("network", type);
    await fetchData();
    openEdit(name);
  };

  const routeProtocols = [
    { value: "", label: "unicast" },
    { value: "local", label: "local" },
    { value: "broadcast", label: "broadcast" },
    { value: "multicast", label: "multicast" },
    { value: "unreachable", label: "unreachable" },
    { value: "prohibit", label: "prohibit" },
    { value: "blackhole", label: "blackhole" },
    { value: "anycast", label: "anycast" },
    { value: "throw", label: "throw" },
  ];

  const ruleActions = [
    { value: "", label: "unicast" },
    { value: "unreachable", label: "unreachable" },
    { value: "prohibit", label: "prohibit" },
    { value: "blackhole", label: "blackhole" },
    { value: "throw", label: "throw" },
  ];

  const protocols = [
    { i: 0, d: "hopopt" }, { i: 1, d: "icmp" }, { i: 2, d: "igmp" }, { i: 3, d: "ggp" },
    { i: 4, d: "ipv4" }, { i: 5, d: "st" }, { i: 6, d: "tcp" }, { i: 7, d: "cbt" },
    { i: 8, d: "egp" }, { i: 9, d: "igp" }, { i: 10, d: "bbn-rcc" }, { i: 11, d: "nvp" },
    { i: 12, d: "pup" }, { i: 13, d: "argus" }, { i: 14, d: "emcon" }, { i: 15, d: "xnet" },
    { i: 16, d: "chaos" }, { i: 17, d: "udp" }, { i: 18, d: "mux" }, { i: 19, d: "dcn" },
    { i: 20, d: "hmp" }, { i: 21, d: "prm" }, { i: 22, d: "xns-idp" }, { i: 23, d: "trunk-1" },
    { i: 24, d: "trunk-2" }, { i: 25, d: "leaf-1" }, { i: 26, d: "leaf-2" },
    { i: 27, d: "rdp" }, { i: 28, d: "irtp" }, { i: 29, d: "iso-tp4" },
    { i: 30, d: "netblt" }, { i: 31, d: "mfe-nss" }, { i: 32, d: "dccp" },
    { i: 33, d: "3pc" }, { i: 34, d: "idpr" }, { i: 35, d: "xtp" },
    { i: 36, d: "ddp" }, { i: 37, d: "idpr-cmtp" }, { i: 38, d: "tp++" },
    { i: 39, d: "il" }, { i: 40, d: "ipv6" }, { i: 41, d: "sdrp" },
    { i: 42, d: "ipv6-route" }, { i: 43, d: "ipv6-frag" }, { i: 44, d: "idrp" },
    { i: 45, d: "rsvp" }, { i: 46, d: "gre" }, { i: 47, d: "dsr" },
    { i: 48, d: "bna" }, { i: 49, d: "esp" }, { i: 50, d: "ah" },
    { i: 51, d: "i-nlsp" }, { i: 52, d: "swipe" }, { i: 53, d: "narp" },
    { i: 54, d: "mobile" }, { i: 55, d: "tlsp" }, { i: 56, d: "skip" },
    { i: 57, d: "ipv6-icmp" }, { i: 58, d: "ipv6-nonxt" }, { i: 59, d: "ipv6-opts" },
    { i: 60, d: "cftp" }, { i: 61, d: "any" }, { i: 62, d: "sat-expak" },
    { i: 63, d: "kryptolan" }, { i: 64, d: "rvd" }, { i: 65, d: "ippc" },
    { i: 66, d: "any-dist" }, { i: 67, d: "tis" }, { i: 68, d: "sarc-cm" },
    { i: 69, d: "pnet" }, { i: 70, d: "pnet2" }, { i: 71, d: "g-net" },
    { i: 72, d: "l2tp" }, { i: 73, d: "at-emp" }, { i: 74, d: "at-imp" },
    { i: 75, d: "at-smp" }, { i: 76, d: "sa-tag" }, { i: 77, d: "pcep" },
    { i: 78, d: "sctp" }, { i: 79, d: "fc" }, { i: 80, d: "rsvp-e2e-ignore" },
    { i: 81, d: "mobility-header" }, { i: 82, d: "udplite" }, { i: 83, d: "mpls-in-ip" },
    { i: 84, d: "manet" }, { i: 85, d: "hip" }, { i: 86, d: "shim6" },
    { i: 87, d: "wesp" }, { i: 88, d: "rohc" }, { i: 89, d: "ethernet" },
    { i: 90, d: "experiment-1" }, { i: 91, d: "experiment-2" },
    { i: 92, d: "mpls-unicast" }, { i: 93, d: "mpls-multicast" },
    { i: 94, d: "mpls" }, { i: 95, d: "aoe" }, { i: 96, d: "mcp" },
    { i: 97, d: "sfc" }, { i: 98, d: "tlsp-1" }, { i: 99, d: "tlsp-2" },
    { i: 100, d: "tlsp-3" }, { i: 101, d: "tlsp-4" }, { i: 102, d: "tlsp-5" },
    { i: 103, d: "tlsp-6" }, { i: 104, d: "tlsp-7" }, { i: 105, d: "tlsp-8" },
    { i: 106, d: "tlsp-9" }, { i: 107, d: "tlsp-10" }, { i: 108, d: "tlsp-11" },
    { i: 109, d: "tlsp-12" }, { i: 110, d: "tlsp-13" }, { i: 111, d: "tlsp-14" },
    { i: 112, d: "tlsp-15" }, { i: 113, d: "tlsp-16" }, { i: 114, d: "tlsp-17" },
    { i: 115, d: "tlsp-18" }, { i: 116, d: "tlsp-19" }, { i: 117, d: "tlsp-20" },
    { i: 255, d: "reserved" },
  ];

  onMount(() => { fetchData(); });
  onDestroy(() => {});

  const th = "text-xs font-medium pb-2 pr-3 text-left whitespace-nowrap";
  const td = "py-1.5 pr-3 text-xs font-mono whitespace-nowrap";
</script>

<div class={cn("p-6", "animate-fade-in")}>
  <h1 class={cn("text-lg", "font-semibold", "text-white")}>{trans("Routing")}</h1>
  <p class={cn("text-sm", "mt-0.5", "mb-4", "text-muted")}>{trans("Static routes & rules")}</p>

  <TabBar tabs={mainTabs} active={mainTab} onchange={(id: string) => { mainTab = id as TabId; }} />

  {#if loading}
    <p class={cn("text-xs", "text-muted", "italic", "mt-6", "text-center")}>{trans("Loading...")}</p>
  {:else}
    <div class={cn("mt-4", "space-y-4")}>
      <div class={cn("flex", "justify-end")}>
        <button
          onclick={addSection}
          class={cn("flex", "items-center", "gap-1.5", "px-3", "py-1.5", "text-xs", "font-medium", "rounded-lg", "bg-accent", "text-black", "hover:opacity-90", "transition-all", "cursor-pointer")}
        >
          <Plus size={12} />
          {trans("Add")}
        </button>
      </div>

      {#if getSections(getType()).length === 0}
        <p class={cn("text-xs", "text-muted", "italic", "text-center", "py-8")}>{trans("No entries available")}</p>
      {:else}
        <div class={cn("glass", "rounded-xl", "overflow-hidden")}>
          <table class={cn("w-full", "text-xs")}>
            <thead>
              <tr class={cn("text-left", "text-muted", "border-b", "border-border")}>
                {#if isRule()}
                  <th class={th}>{trans("Priority")}</th>
                  <th class={th}>{trans("Action")}</th>
                  <th class={th}>{trans("In")}</th>
                  <th class={th}>{trans("Source")}</th>
                  <th class={th}>{trans("Proto")}</th>
                  <th class={th}>{trans("Out")}</th>
                  <th class={th}>{trans("Destination")}</th>
                  <th class={th}>{trans("Table")}</th>
                {:else}
                  <th class={th}>{trans("Interface")}</th>
                  <th class={th}>{trans("Target")}</th>
                  <th class={th}>{trans("Gateway")}</th>
                  <th class={th}>{trans("Metric")}</th>
                  <th class={th}>{trans("Table")}</th>
                  <th class={th}>{trans("Type")}</th>
                {/if}
                <th class={th}>{trans("Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {#each getSections(getType()) as [name, sec]}
                <tr class={cn("border-b", "border-border", "hover:bg-white/[0.02]")}>
                  {#if isRule()}
                    <td class={td}>{sec.priority || trans("auto")}</td>
                    <td class={td}>{sec.action || "unicast"}</td>
                    <td class={td}>{sec.in || "—"}</td>
                    <td class={td}>{sec.src || trans("(any)")}</td>
                    <td class={td}>{sec.ipproto ?? "—"}</td>
                    <td class={td}>{sec.out || "—"}</td>
                    <td class={td}>{sec.dest || trans("(any)")}</td>
                    <td class={cn(td, "text-muted")}>{sec.lookup ? tableName(sec.lookup) : "—"}</td>
                  {:else}
                    <td class={td}>{sec.interface || "—"}</td>
                    <td class={cn(td, "text-accent")}>{sec.target || "—"}</td>
                    <td class={td}>{sec.gateway || "—"}</td>
                    <td class={td}>{sec.metric ?? "—"}</td>
                    <td class={cn(td, "text-muted")}>{sec.table ? tableName(sec.table) : "—"}</td>
                    <td class={td}>{sec.type || "unicast"}</td>
                  {/if}
                  <td class={td}>
                    <div class={cn("flex", "items-center", "gap-1")}>
                      <button
                        onclick={() => openEdit(name)}
                        class={cn("p-1", "rounded", "text-muted", "hover:text-fg", "hover:bg-white/5", "transition-colors", "cursor-pointer")}
                        title={trans("Edit")}
                      ><Pencil size={11} /></button>
                      <button
                        onclick={() => deleteSection(name)}
                        disabled={busy[name] !== undefined}
                        class={cn("p-1", "rounded", "text-muted", "hover:text-danger", "hover:bg-danger/5", "transition-colors", "disabled:opacity-30", "cursor-pointer")}
                        title={trans("Delete")}
                      ><Trash2 size={11} /></button>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  {/if}
</div>

<!-- ════════ EDIT MODAL ════════ -->
{#if editing}
  {@const isRoute = editing.type === "route" || editing.type === "route6"}
  {@const v6 = editing.type === "route6" || editing.type === "rule6"}
  {@const subTabs = [
    { id: "general", label: trans("General Settings") },
    { id: "advanced", label: trans("Advanced Settings") },
  ]}
  <div
    class={cn("fixed", "inset-0", "z-50", "flex", "items-start", "justify-center", "pt-12")}
    onclick={closeEdit}
    role="dialog"
    aria-modal="true"
  >
    <div class={cn("absolute", "inset-0", "bg-black/60", "backdrop-blur-sm")} />
    <div
      onclick={(e: MouseEvent) => e.stopPropagation()}
      class={cn("relative", "w-full", "max-w-2xl", "max-h-[85vh]", "overflow-y-auto", "glass", "rounded-xl", "p-5", "animate-fade-in", "shadow-2xl")}
    >
      <div class={cn("flex", "items-center", "justify-between", "mb-4")}>
        <h2 class={cn("text-sm", "font-semibold", "text-white")}>
          {trans(isRoute ? "Edit Route" : "Edit Rule")}: <span class={cn("font-mono", "text-accent")}>{editing.section}</span>
        </h2>
        <button
          onclick={closeEdit}
          class={cn("p-1", "rounded", "text-muted", "hover:text-fg", "hover:bg-white/5", "cursor-pointer")}
        ><X size={14} /></button>
      </div>

      <TabBar tabs={subTabs} active={editSubTab} onchange={(id: string) => { editSubTab = id; }} />

      <div class={cn("mt-4", "space-y-3")}>
        {#if editSubTab === "general"}
          {#if isRoute}
            <div class={cn("flex", "flex-col", "gap-1")}>
              <label class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>{trans("Interface")}</label>
              <select
                bind:value={form.interface}
                class={cn("w-full", "px-2.5", "py-1.5", "text-xs", "rounded-lg", "bg-surface-2", "border", "border-border", "text-fg", "outline-none", "focus:border-accent")}
              >
                <option value="">{trans("— select —")}</option>
                {#each interfaces as iface}
                  <option value={iface}>{iface}</option>
                {/each}
              </select>
            </div>

            <div class={cn("flex", "flex-col", "gap-1")}>
              <label class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>{trans("Route type")}</label>
              <select
                bind:value={form.type}
                class={cn("w-full", "px-2.5", "py-1.5", "text-xs", "rounded-lg", "bg-surface-2", "border", "border-border", "text-fg", "outline-none", "focus:border-accent")}
              >
                {#each routeProtocols as p}
                  <option value={p.value}>{p.label}</option>
                {/each}
              </select>
            </div>

            <div class={cn("flex", "flex-col", "gap-1")}>
              <label class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>
                {trans("Target")} <span class={cn("text-danger")}>*</span>
              </label>
              <input
                type="text"
                bind:value={form.target}
                placeholder={v6 ? "::/0" : "0.0.0.0/0"}
                class={cn("w-full", "px-2.5", "py-1.5", "text-xs", "rounded-lg", "bg-surface-2", "border", "border-border", "text-fg", "font-mono", "outline-none", "focus:border-accent")}
              />
            </div>

            <div class={cn("flex", "flex-col", "gap-1")}>
              <label class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>{trans("Gateway")}</label>
              <input
                type="text"
                bind:value={form.gateway}
                placeholder={v6 ? "fe80::1" : "192.168.0.1"}
                class={cn("w-full", "px-2.5", "py-1.5", "text-xs", "rounded-lg", "bg-surface-2", "border", "border-border", "text-fg", "font-mono", "outline-none", "focus:border-accent")}
              />
            </div>
          {:else}
            <div class={cn("flex", "flex-col", "gap-1")}>
              <label class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>{trans("Priority")}</label>
              <input
                type="number"
                bind:value={form.priority}
                placeholder="30000"
                class={cn("w-full", "px-2.5", "py-1.5", "text-xs", "rounded-lg", "bg-surface-2", "border", "border-border", "text-fg", "font-mono", "outline-none", "focus:border-accent")}
              />
            </div>

            <div class={cn("flex", "flex-col", "gap-1")}>
              <label class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>{trans("Rule type")}</label>
              <select
                bind:value={form.action}
                class={cn("w-full", "px-2.5", "py-1.5", "text-xs", "rounded-lg", "bg-surface-2", "border", "border-border", "text-fg", "outline-none", "focus:border-accent")}
              >
                {#each ruleActions as a}
                  <option value={a.value}>{a.label}</option>
                {/each}
              </select>
            </div>

            <div class={cn("flex", "flex-col", "gap-1")}>
              <label class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>{trans("Incoming interface")}</label>
              <select
                bind:value={form.in}
                class={cn("w-full", "px-2.5", "py-1.5", "text-xs", "rounded-lg", "bg-surface-2", "border", "border-border", "text-fg", "outline-none", "focus:border-accent")}
              >
                <option value="">{trans("— select —")}</option>
                {#each interfaces as iface}
                  <option value={iface}>{iface}</option>
                {/each}
              </select>
            </div>

            <div class={cn("flex", "flex-col", "gap-1")}>
              <label class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>{trans("Source")}</label>
              <input
                type="text"
                bind:value={form.src}
                placeholder={v6 ? "::/0" : "0.0.0.0/0"}
                class={cn("w-full", "px-2.5", "py-1.5", "text-xs", "rounded-lg", "bg-surface-2", "border", "border-border", "text-fg", "font-mono", "outline-none", "focus:border-accent")}
              />
            </div>

            <div class={cn("flex", "flex-col", "gap-1")}>
              <label class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>{trans("IP Protocol")}</label>
              <select
                bind:value={form.ipproto}
                class={cn("w-full", "px-2.5", "py-1.5", "text-xs", "rounded-lg", "bg-surface-2", "border", "border-border", "text-fg", "outline-none", "focus:border-accent")}
              >
                <option value="">{trans("— select —")}</option>
                {#each protocols as p}
                  <option value={p.i}>{p.d} ({p.i})</option>
                {/each}
              </select>
            </div>

            <div class={cn("flex", "flex-col", "gap-1")}>
              <label class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>{trans("Outgoing interface")}</label>
              <select
                bind:value={form.out}
                class={cn("w-full", "px-2.5", "py-1.5", "text-xs", "rounded-lg", "bg-surface-2", "border", "border-border", "text-fg", "outline-none", "focus:border-accent")}
              >
                <option value="">{trans("— select —")}</option>
                {#each interfaces as iface}
                  <option value={iface}>{iface}</option>
                {/each}
              </select>
            </div>

            <div class={cn("flex", "flex-col", "gap-1")}>
              <label class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>{trans("Destination")}</label>
              <input
                type="text"
                bind:value={form.dest}
                placeholder={v6 ? "::/0" : "0.0.0.0/0"}
                class={cn("w-full", "px-2.5", "py-1.5", "text-xs", "rounded-lg", "bg-surface-2", "border", "border-border", "text-fg", "font-mono", "outline-none", "focus:border-accent")}
              />
            </div>
          {/if}
        {:else}
          {#if isRoute}
            <div class={cn("flex", "flex-col", "gap-1")}>
              <label class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>{trans("Metric")}</label>
              <input
                type="number"
                bind:value={form.metric}
                placeholder={trans("auto")}
                class={cn("w-full", "px-2.5", "py-1.5", "text-xs", "rounded-lg", "bg-surface-2", "border", "border-border", "text-fg", "font-mono", "outline-none", "focus:border-accent")}
              />
            </div>

            <div class={cn("flex", "flex-col", "gap-1")}>
              <label class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>{trans("MTU")}</label>
              <input
                type="number"
                bind:value={form.mtu}
                placeholder="1500"
                class={cn("w-full", "px-2.5", "py-1.5", "text-xs", "rounded-lg", "bg-surface-2", "border", "border-border", "text-fg", "font-mono", "outline-none", "focus:border-accent")}
              />
            </div>

            <div class={cn("flex", "flex-col", "gap-1")}>
              <label class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>{trans("Table")}</label>
              <input
                type="text"
                bind:value={form.table}
                placeholder={trans("auto")}
                list="rt-tables"
                class={cn("w-full", "px-2.5", "py-1.5", "text-xs", "rounded-lg", "bg-surface-2", "border", "border-border", "text-fg", "font-mono", "outline-none", "focus:border-accent")}
              />
              <datalist id="rt-tables">
                {#each rtTables as [num, name]}
                  <option value={name}>{name} ({num})</option>
                {/each}
              </datalist>
            </div>

            <div class={cn("flex", "flex-col", "gap-1")}>
              <label class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>{trans("Source")}</label>
              <input
                type="text"
                bind:value={form.source}
                placeholder={v6 ? "::1" : "10.0.0.1"}
                class={cn("w-full", "px-2.5", "py-1.5", "text-xs", "rounded-lg", "bg-surface-2", "border", "border-border", "text-fg", "font-mono", "outline-none", "focus:border-accent")}
              />
            </div>

            <label class={cn("flex", "items-center", "gap-2", "cursor-pointer", "select-none")}>
              <input
                type="checkbox"
                checked={form.onlink === "1"}
                onchange={(e) => { form.onlink = (e.target as HTMLInputElement).checked ? "1" : ""; }}
                class={cn("accent-accent")}
              />
              <div>
                <span class={cn("text-xs", "font-medium", "text-fg")}>{trans("On-link")}</span>
                <p class={cn("text-[10px]", "text-muted")}>{trans("Gateway is on-link even if it does not match any interface prefix")}</p>
              </div>
            </label>

            <label class={cn("flex", "items-center", "gap-2", "cursor-pointer", "select-none")}>
              <input
                type="checkbox"
                checked={form.disabled === "1"}
                onchange={(e) => { form.disabled = (e.target as HTMLInputElement).checked ? "1" : ""; }}
                class={cn("accent-accent")}
              />
              <span class={cn("text-xs", "font-medium", "text-fg")}>{trans("Disable")}</span>
            </label>
          {:else}
            <div class={cn("flex", "flex-col", "gap-1")}>
              <label class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>{trans("Table")}</label>
              <input
                type="text"
                bind:value={form.lookup}
                placeholder={trans("main")}
                list="rt-tables"
                class={cn("w-full", "px-2.5", "py-1.5", "text-xs", "rounded-lg", "bg-surface-2", "border", "border-border", "text-fg", "font-mono", "outline-none", "focus:border-accent")}
              />
              <datalist id="rt-tables">
                {#each rtTables as [num, name]}
                  <option value={name}>{name} ({num})</option>
                {/each}
              </datalist>
            </div>

            <div class={cn("flex", "flex-col", "gap-1")}>
              <label class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>{trans("Jump to rule")}</label>
              <input
                type="number"
                bind:value={form.goto}
                placeholder="80000"
                class={cn("w-full", "px-2.5", "py-1.5", "text-xs", "rounded-lg", "bg-surface-2", "border", "border-border", "text-fg", "font-mono", "outline-none", "focus:border-accent")}
              />
            </div>

            <div class={cn("flex", "flex-col", "gap-1")}>
              <label class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>{trans("Firewall mark")}</label>
              <input
                type="text"
                bind:value={form.mark}
                placeholder="0x1/0xf"
                class={cn("w-full", "px-2.5", "py-1.5", "text-xs", "rounded-lg", "bg-surface-2", "border", "border-border", "text-fg", "font-mono", "outline-none", "focus:border-accent")}
              />
            </div>

            <div class={cn("flex", "flex-col", "gap-1")}>
              <label class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>{trans("Source port")}</label>
              <input
                type="text"
                bind:value={form.sport}
                placeholder="0-65535"
                class={cn("w-full", "px-2.5", "py-1.5", "text-xs", "rounded-lg", "bg-surface-2", "border", "border-border", "text-fg", "font-mono", "outline-none", "focus:border-accent")}
              />
            </div>

            <div class={cn("flex", "flex-col", "gap-1")}>
              <label class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>{trans("Destination port")}</label>
              <input
                type="text"
                bind:value={form.dport}
                placeholder="0-65535"
                class={cn("w-full", "px-2.5", "py-1.5", "text-xs", "rounded-lg", "bg-surface-2", "border", "border-border", "text-fg", "font-mono", "outline-none", "focus:border-accent")}
              />
            </div>

            <div class={cn("flex", "flex-col", "gap-1")}>
              <label class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>{trans("Type of service")}</label>
              <input
                type="number"
                bind:value={form.tos}
                placeholder="10"
                class={cn("w-full", "px-2.5", "py-1.5", "text-xs", "rounded-lg", "bg-surface-2", "border", "border-border", "text-fg", "font-mono", "outline-none", "focus:border-accent")}
              />
            </div>

            <div class={cn("flex", "flex-col", "gap-1")}>
              <label class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>{trans("User identifier")}</label>
              <input
                type="text"
                bind:value={form.uidrange}
                placeholder="1000-1005"
                class={cn("w-full", "px-2.5", "py-1.5", "text-xs", "rounded-lg", "bg-surface-2", "border", "border-border", "text-fg", "font-mono", "outline-none", "focus:border-accent")}
              />
            </div>

            <div class={cn("flex", "flex-col", "gap-1")}>
              <label class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>{trans("Prefix suppressor")}</label>
              <input
                type="number"
                bind:value={form.suppress_prefixlength}
                placeholder={v6 ? "64" : "24"}
                class={cn("w-full", "px-2.5", "py-1.5", "text-xs", "rounded-lg", "bg-surface-2", "border", "border-border", "text-fg", "font-mono", "outline-none", "focus:border-accent")}
              />
            </div>

            <label class={cn("flex", "items-center", "gap-2", "cursor-pointer", "select-none")}>
              <input
                type="checkbox"
                checked={form.invert === "1"}
                onchange={(e) => { form.invert = (e.target as HTMLInputElement).checked ? "1" : ""; }}
                class={cn("accent-accent")}
              />
              <div>
                <span class={cn("text-xs", "font-medium", "text-fg")}>{trans("Invert match")}</span>
                <p class={cn("text-[10px]", "text-muted")}>{trans("If set, the meaning of the match options is inverted")}</p>
              </div>
            </label>

            <label class={cn("flex", "items-center", "gap-2", "cursor-pointer", "select-none")}>
              <input
                type="checkbox"
                checked={form.disabled === "1"}
                onchange={(e) => { form.disabled = (e.target as HTMLInputElement).checked ? "1" : ""; }}
                class={cn("accent-accent")}
              />
              <span class={cn("text-xs", "font-medium", "text-fg")}>{trans("Disable")}</span>
            </label>
          {/if}
        {/if}
      </div>

      <div class={cn("flex", "justify-end", "gap-2", "mt-6")}>
        <button
          onclick={closeEdit}
          class={cn("px-3", "py-1.5", "text-xs", "font-medium", "rounded-lg", "bg-surface-2", "border", "border-border", "text-muted", "hover:text-fg", "transition-all", "cursor-pointer")}
        >{trans("Cancel")}</button>
        <button
          onclick={saveEdit}
          disabled={busy[editing.section] !== undefined}
          class={cn("flex", "items-center", "gap-1.5", "px-3", "py-1.5", "text-xs", "font-medium", "rounded-lg", "bg-accent", "text-black", "hover:opacity-90", "transition-all", "disabled:opacity-50", "cursor-pointer")}
        >
          {#if busy[editing.section] === "save"}<span class={cn("animate-spin")}>⋯</span>{:else}<Save size={12} />{/if}
          {trans("Save")}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  :global(input[type="checkbox"]) {
    accent-color: var(--accent);
  }
</style>
