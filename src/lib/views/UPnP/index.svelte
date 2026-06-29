<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { ExternalLink, Save, ChevronDown } from "@lucide/svelte";
  import { cn } from "../../helpers/classname";
  import { t as _t, getLocale, onLocaleChange } from "../../i18n";
  import {
    uciGet,
    uciSet,
    uciCommit,
    uciAdd,
    call,
    execCommand,
  } from "../../api/ubus";
  import type { AclRule, ActivePortMap } from "./types";
  import type { UciConfig } from "../../types";
  import ActivePortMaps from "./ActivePortMaps.svelte";
  import ServiceSettings from "./ServiceSettings.svelte";
  import AclRulesTable from "./AclRulesTable.svelte";

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

  let activeRules: ActivePortMap[] = $state([]);
  let enabled = $state(true),
    enable_upnp = $state(true),
    enable_natpmp = $state(true);
  let ext_allow_private_ipv4 = $state(false),
    igdv1 = $state(true),
    download = $state(""),
    upload = $state("");
  let use_stun = $state(false),
    stun_host = $state(""),
    stun_port = $state("");
  let secure_mode = $state(true),
    notify_interval = $state(""),
    port = $state("");
  let presentation_url = $state(""),
    uuid = $state(""),
    model_number = $state(""),
    serial_number = $state("");
  let system_uptime = $state(true),
    log_output = $state(false),
    upnp_lease_file = $state("");
  let aclRules = $state<AclRule[]>([]),
    editingIdx = $state<number | null>(null),
    editForm = $state<AclRule | null>(null);
  let saving = $state(false),
    showSaveMenu = $state(false),
    saveFeedback = $state("");
  let settingsTab = $state<"setup" | "advanced">("setup");
  let pollTimer: ReturnType<typeof setInterval> | undefined;

  const pad = (n: number, len: number) => n.toString().padStart(len, "0");
  const formatExpires = (secs: number | undefined): string => {
    if (!secs || secs <= 0) return "";
    const h = Math.floor(secs / 3600),
      m = Math.floor((secs % 3600) / 60),
      s = Math.floor(secs % 60);
    return h > 0
      ? `${h}h ${pad(m, 2)}m ${pad(s, 2)}s`
      : m > 0
        ? `${m}m ${pad(m, 2)}s`
        : `${s}s`;
  };

  const loadUci = async () => {
    const uci: UciConfig | null = await uciGet("upnpd").catch(() => null);
    if (!uci?.values) return;
    const entries = Object.values(uci.values);
    const sec: Record<string, unknown> = entries.find(
      (s) => s[".type"] === "upnpd",
    ) ?? {};
    const s = (v: unknown) => (v != null ? String(v) : "");
    enabled = s(sec.enabled) !== "0";
    enable_upnp = s(sec.enable_upnp) !== "0";
    enable_natpmp = s(sec.enable_natpmp) !== "0";
    ext_allow_private_ipv4 = s(sec.ext_allow_private_ipv4) === "1";
    igdv1 = s(sec.igdv1) !== "0";
    download = s(sec.download);
    upload = s(sec.upload);
    use_stun = s(sec.use_stun) === "1";
    stun_host = s(sec.stun_host);
    stun_port = s(sec.stun_port);
    secure_mode = s(sec.secure_mode) !== "0";
    notify_interval = s(sec.notify_interval);
    port = s(sec.port);
    presentation_url = s(sec.presentation_url);
    uuid = s(sec.uuid);
    model_number = s(sec.model_number);
    serial_number = s(sec.serial_number);
    system_uptime = s(sec.system_uptime) !== "0";
    log_output = s(sec.log_output) === "1";
    upnp_lease_file = s(sec.upnp_lease_file);
    const secAcl = (v: unknown) => (v != null ? String(v) : "");
    aclRules = entries
      .filter((s) => s[".type"] === "rule")
      .map((r) => ({
        comment: secAcl(r.comment),
        int_addr: secAcl(r.int_addr),
        int_ports: secAcl(r.int_ports),
        ext_ports: secAcl(r.ext_ports),
        action: secAcl(r.action) || "allow",
      }));
  };

  const getStatus = async () => {
    const r = await call<{ rules?: ActivePortMap[] }>("luci.upnp", "get_status", {});
    if (r?.rules) activeRules = r.rules;
  };

  const deleteRule = async (num: number) => {
    await execCommand("miniupnpd", [
      "-d",
      String(num),
      "-P",
      "/var/run/miniupnpd.pid",
    ]);
    await getStatus();
  };

  const save = async () => {
    saving = true;
    saveFeedback = "";
    try {
      const uci: UciConfig | null = await uciGet("upnpd");
      const entries = uci?.values ? Object.values(uci.values) : [];
      const sec = entries.find(
        (s) => s[".type"] === "upnpd",
      );
      const name = (sec?.[".name"] as string | undefined) || (await uciAdd("upnpd", "upnpd")).slice(1, -1);
      await uciSet("upnpd", name, "enabled", enabled ? "1" : "0");
      await uciSet("upnpd", name, "enable_upnp", enable_upnp ? "1" : "0");
      await uciSet("upnpd", name, "enable_natpmp", enable_natpmp ? "1" : "0");
      await uciSet(
        "upnpd",
        name,
        "ext_allow_private_ipv4",
        ext_allow_private_ipv4 ? "1" : "0",
      );
      await uciSet("upnpd", name, "igdv1", igdv1 ? "1" : "0");
      await uciSet("upnpd", name, "download", download);
      await uciSet("upnpd", name, "upload", upload);
      await uciSet("upnpd", name, "use_stun", use_stun ? "1" : "0");
      await uciSet("upnpd", name, "stun_host", stun_host);
      await uciSet("upnpd", name, "stun_port", stun_port);
      await uciSet("upnpd", name, "secure_mode", secure_mode ? "1" : "0");
      await uciSet("upnpd", name, "notify_interval", notify_interval);
      await uciSet("upnpd", name, "port", port);
      await uciSet("upnpd", name, "presentation_url", presentation_url);
      await uciSet("upnpd", name, "uuid", uuid);
      await uciSet("upnpd", name, "model_number", model_number);
      await uciSet("upnpd", name, "serial_number", serial_number);
      await uciSet("upnpd", name, "system_uptime", system_uptime ? "1" : "0");
      await uciSet("upnpd", name, "log_output", log_output ? "1" : "0");
      await uciSet("upnpd", name, "upnp_lease_file", upnp_lease_file);
      for (const [i, rule] of aclRules.entries()) {
        const rname =
          Object.entries(uci?.values || {}).find(
            ([, v]) => v[".type"] === "rule" && v[".index"] === String(i),
          )?.[0] || (await uciAdd("upnpd", "rule")).slice(1, -1);
        await uciSet("upnpd", rname, "comment", rule.comment);
        await uciSet("upnpd", rname, "int_addr", rule.int_addr);
        await uciSet("upnpd", rname, "int_ports", rule.int_ports);
        await uciSet("upnpd", rname, "ext_ports", rule.ext_ports);
        await uciSet("upnpd", rname, "action", rule.action);
      }
      await uciCommit("upnpd");
      await execCommand("/etc/init.d/miniupnpd", ["restart"]);
      saveFeedback = trans("Saved");
    } catch {
      saveFeedback = trans("Save failed");
    }
    saving = false;
    setTimeout(() => {
      saveFeedback = "";
    }, 3000);
  };

  const resetUci = async () => {
    await loadUci();
    saveFeedback = trans("Reset");
    setTimeout(() => {
      saveFeedback = "";
    }, 2000);
  };
  const addAclRule = () => {
    aclRules = [
      ...aclRules,
      {
        comment: "",
        int_addr: "",
        int_ports: "",
        ext_ports: "",
        action: "allow",
      },
    ];
    editingIdx = aclRules.length - 1;
    editForm = { ...aclRules[aclRules.length - 1] };
  };
  const startEdit = (i: number) => {
    editingIdx = i;
    editForm = { ...aclRules[i] };
  };
  const cancelEdit = () => {
    editingIdx = null;
    editForm = null;
  };
  const saveEdit = () => {
    if (editingIdx !== null && editForm) {
      aclRules[editingIdx] = { ...editForm };
      editingIdx = null;
      editForm = null;
    }
  };
  const removeAclRule = (i: number) => {
    aclRules = aclRules.filter((_, j) => j !== i);
    if (editingIdx === i) {
      editingIdx = null;
      editForm = null;
    }
  };

  onMount(async () => {
    await loadUci();
    await getStatus();
    pollTimer = setInterval(getStatus, 5000);
  });
  onDestroy(() => {
    if (pollTimer) clearInterval(pollTimer);
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
        <ExternalLink size={16} class={cn("text-accent")} />
      </div>
      <div>
        <h1 class={cn("text-lg", "font-semibold", "text-white")}>
          {trans("UPnP IGD & PCP/NAT-PMP Service")}
        </h1>
        <p class={cn("text-sm", "mt-0.5", "text-muted")}>
          {trans(
            "The UPnP IGD & PCP/NAT-PMP protocols allow clients on the local network to configure port maps/forwards on the router autonomously.",
          )}
        </p>
      </div>
    </div>
    <div class={cn("flex", "items-center", "gap-2", "relative")}>
      {#if saveFeedback}
        <span
          class={cn(
            "text-xs",
            "font-mono",
            saveFeedback === "Saved"
              ? "text-accent"
              : saveFeedback === "Reset"
                ? "text-muted"
                : "text-danger",
          )}>{saveFeedback === "Reset" ? trans("Reset") : saveFeedback}</span
        >
      {/if}
      <div class={cn("relative")}>
        <button
          onclick={() => (showSaveMenu = !showSaveMenu)}
          onblur={() => setTimeout(() => (showSaveMenu = false), 200)}
          disabled={saving}
          class={cn(
            "inline-flex",
            "items-center",
            "gap-1.5",
            "px-3",
            "py-1.5",
            "text-xs",
            "rounded-lg",
            "font-medium",
            "transition-all",
            "duration-150",
            "cursor-pointer",
            "select-none",
            "border",
            saving
              ? "text-muted bg-surface-2 border-border"
              : "text-accent bg-accent/10 border-accent/20 hover:bg-accent/20",
            "disabled:opacity-30",
          )}
        >
          <Save size={14} />
          {saving ? trans("Saving...") : trans("Save & Apply")}
          <ChevronDown
            size={12}
            class={cn("transition-transform", showSaveMenu ? "rotate-180" : "")}
          />
        </button>
        {#if showSaveMenu}
          <div
            class={cn(
              "absolute",
              "right-0",
              "mt-1",
              "w-36",
              "rounded-lg",
              "border",
              "border-border",
              "bg-surface-2",
              "shadow-lg",
              "z-50",
              "overflow-hidden",
            )}
          >
            <button
              onclick={save}
              class={cn(
                "w-full",
                "px-3",
                "py-2",
                "text-xs",
                "text-left",
                "hover:bg-white/5",
                "cursor-pointer",
                "transition-colors",
                "text-fg",
              )}>{trans("Save")}</button
            >
            <button
              onclick={resetUci}
              class={cn(
                "w-full",
                "px-3",
                "py-2",
                "text-xs",
                "text-left",
                "hover:bg-white/5",
                "cursor-pointer",
                "transition-colors",
                "text-muted",
              )}>{trans("Reset")}</button
            >
          </div>
        {/if}
      </div>
    </div>
  </div>

  <ActivePortMaps
    {activeRules}
    onrefresh={getStatus}
    ondelete={deleteRule}
    {formatExpires}
    {trans}
  />
  <ServiceSettings
    {enabled}
    {enable_upnp}
    {enable_natpmp}
    {ext_allow_private_ipv4}
    {igdv1}
    bind:download
    bind:upload
    {use_stun}
    {stun_host}
    {stun_port}
    {secure_mode}
    {notify_interval}
    {port}
    {presentation_url}
    {uuid}
    {model_number}
    {serial_number}
    {system_uptime}
    {log_output}
    {upnp_lease_file}
    bind:settingsTab
    {trans}
  />
  <AclRulesTable
    {aclRules}
    {editingIdx}
    {editForm}
    onadd={addAclRule}
    onedit={startEdit}
    oncancel={cancelEdit}
    onsave={saveEdit}
    ondelete={removeAclRule}
    {trans}
  />
</div>
