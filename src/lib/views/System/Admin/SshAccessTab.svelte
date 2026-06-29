<script lang="ts">
  import { Shield, Plus, Save, Trash2 } from "@lucide/svelte";
  import { cn } from "../../../helpers/classname";
  import Input from "../../../components/Input/Input.svelte";
  import Toggle from "../../../components/Toggle/Toggle.svelte";
  import { uciGet, uciSetSection, uciCommit, uciAdd, execCommand } from "../../../api/ubus";
  import type { DropbearInstance } from "./types";

  let { trans }: { trans: (k: string) => string } = $props();

  let saving = $state(false);
  let dbInstances = $state<DropbearInstance[]>([]);

  const loadDropbearConfig = async () => {
    const cfg = await uciGet("dropbear");
    if (!cfg?.values) return;
    const sections = Object.values(cfg.values) as any[];
    dbInstances = sections.filter((s: any) => s[".type"] === "dropbear").map((s: any) => ({
      name: s[".name"], enable: s.enable !== "0", port: s.Port || "22", iface: s.Interface || "",
      passwordAuth: s.PasswordAuth !== "off", rootPasswordAuth: s.RootPasswordAuth !== "off", gatewayPorts: s.GatewayPorts === "on",
    }));
  };

  const saveDropbearInstances = async () => {
    saving = true;
    for (const inst of dbInstances) {
      await uciSetSection("dropbear", inst.name, { enable: inst.enable ? "1" : "0", Port: inst.port, Interface: inst.iface, PasswordAuth: inst.passwordAuth ? "on" : "off", RootPasswordAuth: inst.rootPasswordAuth ? "on" : "off", GatewayPorts: inst.gatewayPorts ? "on" : "off" });
    }
    await uciCommit("dropbear");
    saving = false;
  };

  const addDropbearInstance = async () => {
    saving = true;
    const res = await uciAdd("dropbear", "dropbear");
    if (res && typeof res === "object" && "section" in res) {
      dbInstances = [...dbInstances, { name: res.section as string, enable: true, port: "22", iface: "", passwordAuth: true, rootPasswordAuth: true, gatewayPorts: false }];
    }
    saving = false;
  };

  const removeDropbearInstance = async (name: string) => {
    saving = true;
    await execCommand("/sbin/uci", ["delete", `dropbear.${name}`]);
    await execCommand("/sbin/uci", ["commit", "dropbear"]);
    dbInstances = dbInstances.filter((i) => i.name !== name);
    saving = false;
  };

  $effect(() => { loadDropbearConfig(); });

  const sectionLabel = "inline-flex items-center gap-1.5 text-[10px] uppercase text-muted font-semibold tracking-wider mb-1.5";
  const btnBase = "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium transition-all duration-150 cursor-pointer select-none";
  const btnPrimary = (d: boolean) => cn(btnBase, d ? "border text-muted bg-surface-3 border-transparent cursor-not-allowed" : "border text-accent bg-accent/10 border-accent/20");
</script>

<div class={cn("space-y-4", "max-w-lg")}>
  {#each dbInstances as inst, i}
    <div class={cn("glass", "p-5", "animate-slide-up")}>
      <div class={cn("flex", "items-center", "justify-between", "mb-4")}>
        <div class={cn("flex", "items-center", "gap-2")}>
          <Shield size={14} class={cn("text-accent")} />
          <span class={sectionLabel}>{trans("Dropbear Instance")} #{i + 1}<code class={cn("ml-1", "text-[9px]", "text-muted")}>{inst.name}</code></span>
        </div>
        {#if dbInstances.length > 1}
          <button onclick={() => removeDropbearInstance(inst.name)} disabled={saving} class={cn("p-1.5 rounded-md transition-all duration-150", "text-muted hover:text-danger hover:bg-danger/10")} title={trans("Remove instance")}><Trash2 size={13} /></button>
        {/if}
      </div>
      <div class={cn("space-y-4")}>
        <div class={cn("space-y-3")}>
          <Toggle label={trans("Enable Instance")} bind:checked={dbInstances[i].enable} />
          <Input label={trans("Port")} type="number" bind:value={dbInstances[i].port} placeholder="22" class={cn("max-w-28")} />
          <Input label={trans("Interface")} bind:value={dbInstances[i].iface} placeholder={trans("lan (leave empty for all)")} />
        </div>
        <div class={cn("border-t", "border-border", "pt-3", "space-y-3")}>
          <Toggle label={trans("Password Authentication")} bind:checked={dbInstances[i].passwordAuth} />
          <Toggle label={trans("Root Password Authentication")} bind:checked={dbInstances[i].rootPasswordAuth} />
          <Toggle label={trans("Gateway Ports")} bind:checked={dbInstances[i].gatewayPorts} />
        </div>
      </div>
    </div>
  {/each}
  <div class={cn("flex", "items-center", "gap-2")}>
    <button onclick={addDropbearInstance} disabled={saving} class={cn("inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg font-medium transition-all duration-150 cursor-pointer", "border border-dashed border-accent/20 text-accent bg-accent/5")}><Plus size={12} />{trans("Add instance")}</button>
    <button onclick={saveDropbearInstances} disabled={saving} class={btnPrimary(saving)}>
      {#if saving}<Save size={12} class={cn("animate-pulse")} />{:else}<Save size={12} />{/if}
      {saving ? trans("Saving…") : trans("Save & Apply")}
    </button>
  </div>
</div>
