<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { ExternalLink, Pencil, Trash2, Plus, Save, RefreshCw, ChevronDown } from "@lucide/svelte";
  import { cn } from "../helpers/classname";
  import { t as _t, getLocale, onLocaleChange } from "../i18n";
  import { uciGet, uciSet, uciCommit, uciAdd, call, execCommand } from "../api/ubus";
  import Input from "../components/Input/index.svelte";
  import Toggle from "../components/Toggle/index.svelte";

  let locale = $state(getLocale());
  let trans = $derived.by(() => { locale; return (k: string) => _t(k); });
  $effect(() => onLocaleChange(() => { locale = getLocale(); }));

  // ── Runtime status (from luci.upnp.get_status) ──
  let activeRules: any[] = $state([]);

  // ── UCI state: Service Setup ──
  let enabled = $state(true);
  let enable_upnp = $state(true);
  let enable_natpmp = $state(true);
  let ext_allow_private_ipv4 = $state(false);
  let igdv1 = $state(true);
  let download = $state("");
  let upload = $state("");

  // ── UCI state: Advanced Settings ──
  let use_stun = $state(false);
  let stun_host = $state("");
  let stun_port = $state("");
  let secure_mode = $state(true);
  let notify_interval = $state("");
  let port = $state("");
  let presentation_url = $state("");
  let uuid = $state("");
  let model_number = $state("");
  let serial_number = $state("");
  let system_uptime = $state(true);
  let log_output = $state(false);
  let upnp_lease_file = $state("");

  // ── ACL rules ──
  interface AclRule {
    name: string;
    action: string;
    int_addr: string;
    int_ports: string;
    ext_ports: string;
    comment: string;
  }

  let aclRules = $state<AclRule[]>([]);
  let editingIdx = $state<number | null>(null);
  let editForm = $state<AclRule | null>(null);

  let saving = $state(false);
  let showSaveMenu = $state(false);
  let saveFeedback = $state("");
  let settingsTab = $state<"setup" | "advanced">("setup");
  let pollTimer: ReturnType<typeof setInterval> | undefined;

  const pad = (n: number, len: number) => n.toString().padStart(len, "0");

  const formatExpires = (secs: number | undefined): string => {
    if (!secs || secs <= 0) return "";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    return h > 0 ? `${h}h ${pad(m, 2)}m ${pad(s, 2)}s`
      : m > 0 ? `${m}m ${pad(s, 2)}s`
      : `${s}s`;
  };

  const loadUci = async () => {
    const uci = await uciGet("upnpd").catch(() => null);
    if (!uci?.values) return;
    const sec = (Object.values(uci.values) as any[]).find((s: any) => s[".type"] === "upnpd") || {};
    enabled = sec.enabled !== "0";
    enable_upnp = sec.enable_upnp !== "0";
    enable_natpmp = sec.enable_natpmp !== "0";
    ext_allow_private_ipv4 = sec.ext_allow_private_ipv4 === "1";
    igdv1 = sec.igdv1 !== "0";
    download = sec.download || "";
    upload = sec.upload || "";

    use_stun = sec.use_stun === "1";
    stun_host = sec.stun_host || "";
    stun_port = sec.stun_port || "";
    secure_mode = sec.secure_mode !== "0";
    notify_interval = sec.notify_interval || "";
    port = sec.port || "";
    presentation_url = sec.presentation_url || "";
    uuid = sec.uuid || "";
    model_number = sec.model_number || "";
    serial_number = sec.serial_number || "";
    system_uptime = sec.system_uptime !== "0";
    log_output = sec.log_output === "1";
    upnp_lease_file = sec.upnp_lease_file || "";

    aclRules = (Object.values(uci.values) as any[])
      .filter((s: any) => s[".type"] === "perm_rule" || s[".type"] === "perm" || s[".type"] === "rule")
      .map((s: any) => ({
        name: s[".name"] || "",
        action: s.action || "deny",
        int_addr: s.int_addr || "",
        int_ports: s.int_ports || s.int_port || "",
        ext_ports: s.ext_ports || s.ext_port || "",
        comment: s.comment || "",
      }));
  };

  const getStatus = async () => {
    const upnp = await call("luci.upnp", "get_status").catch(() => null);
    if (upnp) activeRules = (upnp as any).rules || [];
  };

  const deleteRule = async (num: number) => {
    await call("luci.upnp", "delete_rule", { token: num }).catch(() => {});
    await getStatus();
  };

  const save = async () => {
    saving = true;
    saveFeedback = "";
    showSaveMenu = false;
    try {
      await uciSet("upnpd", "config", {
        enabled: enabled ? "1" : "0",
        enable_upnp: enable_upnp ? "1" : "0",
        enable_natpmp: enable_natpmp ? "1" : "0",
        ext_allow_private_ipv4: ext_allow_private_ipv4 ? "1" : "0",
        igdv1: igdv1 ? "1" : "0",
        download: download || undefined,
        upload: upload || undefined,
        use_stun: use_stun ? "1" : "0",
        stun_host: stun_host || undefined,
        stun_port: stun_port || undefined,
        secure_mode: secure_mode ? "1" : "0",
        notify_interval: notify_interval || undefined,
        port: port || undefined,
        presentation_url: presentation_url || undefined,
        uuid: uuid || undefined,
        model_number: model_number || undefined,
        serial_number: serial_number || undefined,
        system_uptime: system_uptime ? "1" : "0",
        log_output: log_output ? "1" : "0",
        upnp_lease_file: upnp_lease_file || undefined,
      });

      // Clean up junk sections from old code (type "rule"/"perm" instead of "perm_rule")
      const uci = await uciGet("upnpd").catch(() => null);
      if (uci?.values) {
        for (const name of Object.keys(uci.values)) {
          const s = (uci.values as Record<string, any>)[name];
          if (s[".type"] === "rule" || s[".type"] === "perm") {
            await call("uci", "delete", { config: "upnpd", section: name }).catch(() => {});
          }
        }
      }

      for (const rule of aclRules) {
        await call("uci", "set", {
          config: "upnpd",
          section: rule.name,
          values: {
            action: rule.action,
            int_addr: rule.int_addr || undefined,
            int_ports: rule.int_ports || undefined,
            ext_ports: rule.ext_ports || undefined,
            comment: rule.comment || undefined,
          },
        });
      }

      await uciCommit("upnpd");
      await execCommand("/etc/init.d/miniupnpd", ["reload"]).catch(() => {});
      saveFeedback = "Saved";
    } catch { saveFeedback = "Save failed"; }
    saving = false;
    setTimeout(() => { saveFeedback = ""; }, 3000);
  };

  const resetUci = async () => {
    showSaveMenu = false;
    await loadUci();
    saveFeedback = "Reset";
    setTimeout(() => { saveFeedback = ""; }, 2000);
  };

  const addAclRule = async () => {
    const name = await uciAdd("upnpd", "perm_rule").catch(() => null);
    if (!name) return;
    const rule: AclRule = { name, action: "deny", int_addr: "", int_ports: "", ext_ports: "", comment: "" };
    aclRules = [...aclRules, rule];
    editingIdx = aclRules.length - 1;
    editForm = { ...rule };
  };

  const startEdit = (idx: number) => {
    editingIdx = idx;
    editForm = { ...aclRules[idx] };
  };

  const cancelEdit = () => {
    editingIdx = null;
    editForm = null;
  };

  const saveEdit = () => {
    if (editingIdx === null || !editForm) return;
    aclRules[editingIdx] = { ...editForm };
    editingIdx = null;
    editForm = null;
  };

  const removeAclRule = async (idx: number) => {
    const rule = aclRules[idx];
    if (!rule) return;
    await call("uci", "delete", { config: "upnpd", section: rule.name }).catch(() => {});
    aclRules = aclRules.toSpliced(idx, 1);
  };

  const cleanupJunkSections = async () => {
    const uci = await uciGet("upnpd").catch(() => null);
    if (!uci?.values) return;
    const junk = Object.keys(uci.values).filter(
      (name) => {
        const s = (uci.values as Record<string, any>)[name];
        return s[".type"] === "rule" || s[".type"] === "perm";
      },
    );
    if (junk.length === 0) return;
    for (const name of junk) {
      await call("uci", "delete", { config: "upnpd", section: name }).catch(() => {});
    }
    await uciCommit("upnpd");
  };

  onMount(async () => {
    await Promise.all([loadUci(), getStatus()]);
    cleanupJunkSections();
    pollTimer = setInterval(getStatus, 5000);
  });

  onDestroy(() => { clearInterval(pollTimer); });
</script>

<div class={cn("p-6", "flex", "flex-col", "min-h-0", "animate-fade-in", "gap-5")}>
  <!-- Header -->
  <div class={cn("shrink-0", "flex", "items-start", "justify-between", "gap-4")}>
    <div class={cn("flex", "items-center", "gap-3")}>
      <div class={cn("w-9", "h-9", "rounded-xl", "bg-accent/10", "flex", "items-center", "justify-center", "ring-1", "ring-accent/20", "shrink-0")}>
        <ExternalLink size={16} class={cn("text-accent")} />
      </div>
      <div>
        <h1 class={cn("text-lg", "font-semibold", "text-white")}>{trans("UPnP IGD & PCP/NAT-PMP Service")}</h1>
        <p class={cn("text-sm", "mt-0.5", "text-muted")}>
          {trans("The UPnP IGD & PCP/NAT-PMP protocols allow clients on the local network to configure port maps/forwards on the router autonomously.")}
        </p>
      </div>
    </div>
    <div class={cn("flex", "items-center", "gap-2", "relative")}>
      {#if saveFeedback}
        <span class={cn("text-xs", "font-mono", saveFeedback === "Saved" ? "text-accent" : saveFeedback === "Reset" ? "text-muted" : "text-danger")}>
          {saveFeedback === "Reset" ? trans("Reset") : saveFeedback}
        </span>
      {/if}
      <div class={cn("relative")}>
        <button
          onclick={() => (showSaveMenu = !showSaveMenu)}
          onblur={() => setTimeout(() => (showSaveMenu = false), 200)}
          disabled={saving}
          class={cn("inline-flex", "items-center", "gap-1.5", "px-3", "py-1.5", "text-xs", "rounded-lg", "font-medium", "transition-all", "duration-150", "cursor-pointer", "select-none", "border", saving ? "text-muted bg-surface-2 border-border" : "text-accent bg-accent/10 border-accent/20 hover:bg-accent/20", "disabled:opacity-30")}
        >
          <Save size={14} />
          {saving ? trans("Saving...") : trans("Save & Apply")}
          <ChevronDown size={12} class={cn("transition-transform", showSaveMenu ? "rotate-180" : "")} />
        </button>
        {#if showSaveMenu}
          <div class={cn("absolute", "right-0", "mt-1", "w-36", "rounded-lg", "border", "border-border", "bg-surface-2", "shadow-lg", "z-50", "overflow-hidden")}>
            <button
              onclick={save}
              class={cn("w-full", "px-3", "py-2", "text-xs", "text-left", "hover:bg-white/5", "cursor-pointer", "transition-colors", "text-fg")}
            >
              {trans("Save")}
            </button>
            <button
              onclick={resetUci}
              class={cn("w-full", "px-3", "py-2", "text-xs", "text-left", "hover:bg-white/5", "cursor-pointer", "transition-colors", "text-muted")}
            >
              {trans("Reset")}
            </button>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Active Service Port Maps -->
  <div class={cn("glass", "rounded-xl", "overflow-hidden")}>
    <div class={cn("p-5", "pb-0")}>
      <div class={cn("flex", "items-center", "gap-2", "mb-3")}>
        <span class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>{trans("Active Service Port Maps")}</span>
        <button onclick={getStatus} class={cn("p-1", "rounded-md", "hover:bg-white/5", "transition-colors", "text-muted", "hover:text-fg", "cursor-pointer")}>
          <RefreshCw size={12} />
        </button>
      </div>
    </div>
    {#if activeRules.length === 0}
      <div class={cn("px-5", "pb-5")}>
        <div class={cn("border", "border-border", "rounded-lg", "p-6", "text-center")}>
          <p class={cn("text-xs", "text-muted", "italic")}>{trans("There are no active port maps.")}</p>
        </div>
      </div>
    {:else}
      <div class={cn("px-5", "pb-5", "overflow-x-auto")}>
        <table class={cn("w-full", "text-xs")}>
          <thead>
            <tr class={cn("text-left", "text-muted")}>
              <th class={cn("pb-2", "pr-3", "font-medium")}>{trans("Client Name")}</th>
              <th class={cn("pb-2", "pr-3", "font-medium")}>{trans("Client Address")}</th>
              <th class={cn("pb-2", "pr-3", "font-medium")}>{trans("Client Port")}</th>
              <th class={cn("pb-2", "pr-3", "font-medium")}>{trans("External Port")}</th>
              <th class={cn("pb-2", "pr-3", "font-medium")}>{trans("Protocol")}</th>
              <th class={cn("pb-2", "pr-3", "font-medium", "text-right")}>{trans("Expires")}</th>
              <th class={cn("pb-2", "pr-3", "font-medium")}>{trans("Description")}</th>
              <th class={cn("pb-2", "font-medium", "w-16")}></th>
            </tr>
          </thead>
          <tbody>
            {#each activeRules as r}
              <tr class={cn("border-t", "border-border")}>
                <td class={cn("py-2", "pr-3", "font-medium")}>{r.host_hint || trans("Unknown")}</td>
                <td class={cn("py-2", "pr-3", "font-mono", "text-muted")}>{r.intaddr || "—"}</td>
                <td class={cn("py-2", "pr-3", "font-mono")}>{r.intport || "—"}</td>
                <td class={cn("py-2", "pr-3", "font-mono", "text-accent")}>{r.extport || "—"}</td>
                <td class={cn("py-2", "pr-3")}>{r.proto || "—"}</td>
                <td class={cn("py-2", "pr-3", "font-mono", "text-muted", "text-right", "whitespace-nowrap")}>{formatExpires(r.expires)}</td>
                <td class={cn("py-2", "pr-3", "text-muted")}>{r.descr || "—"}</td>
                <td class={cn("py-2")}>
                  <button
                    onclick={() => deleteRule(r.num)}
                    class={cn("btn", "cbi-button-remove", "inline-flex", "items-center", "gap-1", "px-2", "py-1", "text-[10px]", "rounded-md", "font-medium", "text-danger", "bg-danger/5", "border", "border-danger/15", "hover:bg-danger/15", "cursor-pointer", "transition-all")}
                  >
                    <Trash2 size={10} />
                    {trans("Delete")}
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>

  <!-- Service Settings -->
  <div class={cn("glass", "rounded-xl", "p-5")}>
    <div class={cn("flex", "items-center", "gap-2", "mb-4")}>
      <span class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>{trans("Service Settings")}</span>
    </div>

    <div class={cn("flex", "gap-1", "p-0.5", "mb-4", "w-fit", "border", "rounded-lg", "bg-surface-2", "border-border")}>
      <button
        class={cn("px-3", "py-1", "text-xs", "rounded-md", "font-medium", "transition-all", "cursor-pointer", settingsTab === "setup" ? "bg-accent text-surface" : "bg-transparent text-muted")}
        onclick={() => (settingsTab = "setup")}
      >{trans("Service Setup")}</button>
      <button
        class={cn("px-3", "py-1", "text-xs", "rounded-md", "font-medium", "transition-all", "cursor-pointer", settingsTab === "advanced" ? "bg-accent text-surface" : "bg-transparent text-muted")}
        onclick={() => (settingsTab = "advanced")}
      >{trans("Advanced Settings")}</button>
    </div>

    {#key settingsTab}
      {#if settingsTab === "setup"}
        <div class={cn("space-y-5")}>
          <div class={cn("h-px", "bg-border")} />
          <Toggle label={trans("Start service")} description={trans("Start autonomous port mapping service")} bind:checked={enabled} />
          <Toggle label={trans("Enable UPnP IGD protocol")} bind:checked={enable_upnp} />
          <Toggle label={trans("Enable PCP/NAT-PMP protocols")} bind:checked={enable_natpmp} />
          <Toggle label={trans("Allow private IPv4")} description={trans("Enable forwarding for private/reserved IPv4 address")} bind:checked={ext_allow_private_ipv4} />
          {#if enable_upnp}
            <Toggle label={trans("UPnP IGDv1 compatibility mode")} description={trans("Advertise as IGDv1 (IPv4 only) device instead of IGDv2")} bind:checked={igdv1} />
            <div class={cn("h-px", "bg-border")} />
            <div class={cn("grid", "grid-cols-2", "gap-4")}>
              <div>
                <Input label={trans("Download speed")} bind:value={download} placeholder="25000" type="number" />
                <p class={cn("text-[10px]", "text-muted", "italic", "mt-1")}>{trans("Report maximum download speed in kByte/s")}</p>
              </div>
              <div>
                <Input label={trans("Upload speed")} bind:value={upload} placeholder="25000" type="number" />
                <p class={cn("text-[10px]", "text-muted", "italic", "mt-1")}>{trans("Report maximum upload speed in kByte/s")}</p>
              </div>
            </div>
          {/if}
        </div>
      {:else}
        <div class={cn("space-y-5")}>
          <div class={cn("h-px", "bg-border")} />
          <Toggle label={trans("Use STUN")} description={trans("To detect the public IPv4 address for unrestricted full-cone/one-to-one NATs")} bind:checked={use_stun} />
          {#if use_stun}
            <div class={cn("grid", "grid-cols-2", "gap-4", "ml-6")}>
              <Input label={trans("STUN host")} bind:value={stun_host} placeholder="stun.example.com" />
              <Input label={trans("STUN port")} bind:value={stun_port} placeholder="3478" type="number" />
            </div>
          {/if}
          {#if enable_upnp}
            <Toggle label={trans("Enable secure mode")} description={trans("Allow adding port maps for requesting IP addresses only")} bind:checked={secure_mode} />
            <Input label={trans("Notify interval")} bind:value={notify_interval} placeholder="900" type="number" />
            <p class={cn("text-[10px]", "text-muted", "italic", "-mt-4")}>{trans("A 900s interval will result in SSDP notifications with the minimum max-age of 1800s")}</p>
            <Input label={trans("SOAP/HTTP port")} bind:value={port} placeholder="5000" type="number" />
            <Input label={trans("Presentation URL")} bind:value={presentation_url} placeholder="http://192.168.1.1/" />
            <div class={cn("grid", "grid-cols-2", "gap-4")}>
              <Input label={trans("Device UUID")} bind:value={uuid} placeholder="uuid" />
              <Input label={trans("Model number")} bind:value={model_number} placeholder={trans("Announced model number")} />
            </div>
            <div class={cn("grid", "grid-cols-2", "gap-4")}>
              <Input label={trans("Serial number")} bind:value={serial_number} placeholder={trans("Announced serial number")} />
            </div>
            <Toggle label={trans("Report system instead of service uptime")} bind:checked={system_uptime} />
          {/if}
          <Toggle label={trans("Enable additional logging")} description={trans("Puts extra debugging information into the system log")} bind:checked={log_output} />
          <Input label={trans("Service lease file")} bind:value={upnp_lease_file} placeholder="/var/run/miniupnpd.leases" />
        </div>
      {/if}
    {/key}
  </div>

  <!-- Service Access Control List -->
  <div class={cn("glass", "rounded-xl", "p-5")}>
    <div class={cn("flex", "items-center", "justify-between", "mb-3")}>
      <span class={cn("text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider")}>
        {trans("Service Access Control List")}
        <span class={cn("ml-2", "font-mono", "text-muted", "not-italic", "font-normal")}>
          {trans("ACL specify which client addresses and ports can be mapped, IPv6 always allowed.")}
        </span>
      </span>
      <button
        onclick={addAclRule}
        class={cn("inline-flex", "items-center", "gap-1", "px-2", "py-1", "text-[10px]", "rounded-md", "font-medium", "border", "text-accent", "bg-accent/10", "border-accent/20", "hover:bg-accent/20", "cursor-pointer", "transition-all")}
      >
        <Plus size={12} />
        {trans("Add")}
      </button>
    </div>
    <div class={cn("h-px", "bg-border")} />
    {#if aclRules.length === 0}
      <p class={cn("text-xs", "text-muted", "italic", "py-6", "text-center")}>{trans("No ACL rules defined")}</p>
    {:else}
      <div class={cn("overflow-x-auto", "pt-3")}>
        <table class={cn("w-full", "text-xs")}>
          <thead>
            <tr class={cn("text-left", "text-muted")}>
              <th class={cn("pb-2", "pr-3", "font-medium")}>{trans("Comment")}</th>
              <th class={cn("pb-2", "pr-3", "font-medium")}>{trans("Client Address")}</th>
              <th class={cn("pb-2", "pr-3", "font-medium")}>{trans("Client Port")}</th>
              <th class={cn("pb-2", "pr-3", "font-medium")}>{trans("External Port")}</th>
              <th class={cn("pb-2", "pr-3", "font-medium")}>{trans("Action")}</th>
              <th class={cn("pb-2", "font-medium")}></th>
            </tr>
          </thead>
          <tbody>
            {#each aclRules as rule, i}
              {#if editingIdx === i && editForm}
                <tr class={cn("border-t", "border-border", "bg-accent/5")}>
                  <td class={cn("py-1.5", "pr-2")}>
                    <input bind:value={editForm.comment} placeholder="Description"
                      class={cn("w-full", "px-2", "py-1", "text-[11px]", "rounded-md", "bg-surface", "border", "border-border", "text-fg", "outline-none", "focus:border-(--accent)")} />
                  </td>
                  <td class={cn("py-1.5", "pr-2")}>
                    <input bind:value={editForm.int_addr} placeholder="0.0.0.0/0"
                      class={cn("w-full", "px-2", "py-1", "text-[11px]", "rounded-md", "bg-surface", "border", "border-border", "text-fg", "font-mono", "outline-none", "focus:border-(--accent)")} />
                  </td>
                  <td class={cn("py-1.5", "pr-2")}>
                    <input bind:value={editForm.int_ports} placeholder="1-65535"
                      class={cn("w-full", "px-2", "py-1", "text-[11px]", "rounded-md", "bg-surface", "border", "border-border", "text-fg", "font-mono", "outline-none", "focus:border-(--accent)")} />
                  </td>
                  <td class={cn("py-1.5", "pr-2")}>
                    <input bind:value={editForm.ext_ports} placeholder="1-65535"
                      class={cn("w-full", "px-2", "py-1", "text-[11px]", "rounded-md", "bg-surface", "border", "border-border", "text-fg", "font-mono", "outline-none", "focus:border-(--accent)")} />
                  </td>
                  <td class={cn("py-1.5", "pr-2")}>
                    <select bind:value={editForm.action}
                      class={cn("w-full", "px-2", "py-1", "text-[11px]", "rounded-md", "bg-surface", "border", "border-border", "text-fg", "outline-none", "cursor-pointer")}>
                      <option value="allow">{trans("allow")}</option>
                      <option value="deny">{trans("deny")}</option>
                    </select>
                  </td>
                  <td class={cn("py-1.5")}>
                    <div class={cn("flex", "items-center", "gap-1")}>
                      <button onclick={saveEdit}
                        class={cn("px-2", "py-1", "text-[10px]", "rounded-md", "font-medium", "bg-accent", "text-surface", "cursor-pointer", "transition-all")}>
                        {trans("Save")}
                      </button>
                      <button onclick={cancelEdit}
                        class={cn("px-2", "py-1", "text-[10px]", "rounded-md", "font-medium", "text-muted", "hover:text-fg", "cursor-pointer", "transition-all")}>
                        {trans("Cancel")}
                      </button>
                    </div>
                  </td>
                </tr>
              {:else}
                <tr class={cn("border-t", "border-border")}>
                  <td class={cn("py-2", "pr-3", "font-medium")}>{rule.comment || "—"}</td>
                  <td class={cn("py-2", "pr-3", "font-mono", "text-muted")}>{rule.int_addr || "—"}</td>
                  <td class={cn("py-2", "pr-3", "font-mono")}>{rule.int_ports || "—"}</td>
                  <td class={cn("py-2", "pr-3", "font-mono", "text-accent")}>{rule.ext_ports || "—"}</td>
                  <td class={cn("py-2", "pr-3")}>
                    <span class={cn("text-[10px]", "font-medium", rule.action === "allow" ? "text-accent" : "text-danger")}>
                      {rule.action === "allow" ? trans("allow") : trans("deny")}
                    </span>
                  </td>
                  <td class={cn("py-2")}>
                    <div class={cn("flex", "items-center", "gap-1")}>
                      <button onclick={() => startEdit(i)}
                        class={cn("p-1", "rounded", "text-muted", "hover:text-accent", "hover:bg-accent/10", "transition-colors", "cursor-pointer")}>
                        <Pencil size={12} />
                      </button>
                      <button onclick={() => removeAclRule(i)}
                        class={cn("p-1", "rounded", "text-muted", "hover:text-danger", "hover:bg-danger/10", "transition-colors", "cursor-pointer")}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              {/if}
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>
