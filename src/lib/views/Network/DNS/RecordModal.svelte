<script lang="ts">
  import { X, Save } from "@lucide/svelte";
  import { cn } from "../../../helpers/classname";
  import Input from "../../../components/Input/Input.svelte";
  import Select from "../../../components/Select/Select.svelte";

  let {
    editing,
    edForm,
    hostIpMap,
    labelCls,
    onclose,
    onsave,
    trans,
  }: {
    editing: { id: string; type: string } | null;
    edForm: Record<string, any>;
    hostIpMap: Record<string, string>;
    labelCls: string;
    onclose: () => void;
    onsave: () => void;
    trans: (k: string) => string;
  } = $props();
</script>

<!-- svelte-ignore a11y_interactive_supports_focus -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  class={cn(
    "z-50",
    "flex",
    "fixed",
    "pt-12",
    "inset-0",
    "items-start",
    "justify-center",
  )}
  onclick={onclose}
  role="dialog"
  aria-modal="true"
>
  <div
    class={cn("absolute", "inset-0", "bg-black/60", "backdrop-blur-sm")}
  ></div>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    onclick={(e: MouseEvent) => e.stopPropagation()}
    class={cn(
      "p-5",
      "glass",
      "w-full",
      "relative",
      "max-w-md",
      "rounded-xl",
      "shadow-2xl",
      "max-h-[85vh]",
      "overflow-y-auto",
      "animate-fade-in",
    )}
  >
    <div class={cn("flex", "items-center", "justify-between", "mb-4")}>
      <h2 class={cn("text-sm", "font-semibold", "text-white")}>
        {editing?.id === "__new__" ? trans("Add") : trans("Edit")}
        {editing?.type}
      </h2>
      <button
        onclick={onclose}
        class={cn(
          "p-1",
          "rounded",
          "text-muted",
          "hover:text-fg",
          "cursor-pointer",
        )}><X size={14} /></button
      >
    </div>
    <div class={cn("space-y-4")}>
      {#if editing?.type === "domain"}
        <Input
          bind:value={edForm.name}
          label={trans("Hostname")}
          placeholder="myhost.local"
        />
        <Select
          bind:value={edForm.ip}
          label={trans("IP address")}
          options={[
            { value: "", label: "" },
            ...Object.entries(hostIpMap).map(([addr, name]) => ({
              value: addr,
              label: `${addr} (${name})`,
            })),
          ]}
          placeholder={trans("Select...")}
        />
      {:else if editing?.type === "srvhost"}
        <Input
          label="SRV"
          bind:value={edForm.srv}
          placeholder="_sip._tcp.example.com."
          description={trans("Syntax: _service._proto.example.com.")}
        />
        <Input
          label={trans("Target")}
          bind:value={edForm.target}
          placeholder="sip.example.com."
          description={trans("CNAME or fqdn")}
        />
        <Input
          type="number"
          placeholder="5060"
          label={trans("Port")}
          bind:value={edForm.port}
        />
        <Input
          type="number"
          placeholder="10"
          label={trans("Priority")}
          bind:value={edForm.class}
          description={trans("Ordinal: lower comes first.")}
        />
        <Input
          type="number"
          placeholder="50"
          label={trans("Weight")}
          bind:value={edForm.weight}
        />
      {:else if editing?.type === "mxhost"}
        <Input
          label={trans("Domain")}
          bind:value={edForm.domain}
          placeholder="example.com."
        />
        <Input
          label={trans("Relay")}
          bind:value={edForm.relay}
          placeholder="relay.example.com."
        />
        <Input
          type="number"
          placeholder="0"
          bind:value={edForm.pref}
          label={trans("Priority")}
          description={trans("Ordinal: lower comes first.")}
        />
      {:else if editing?.type === "cname"}
        <Input
          label={trans("Domain")}
          bind:value={edForm.cname}
          placeholder="www.example.com."
        />
        <Input
          label={trans("Target")}
          bind:value={edForm.target}
          placeholder="example.com."
        />
      {:else if editing?.type === "dnsrr"}
        <Input
          bind:value={edForm.rrname}
          placeholder="svcb.example.com."
          label={trans("Resource Record Name")}
        />
        <Input
          type="number"
          placeholder="64"
          bind:value={edForm.rrnumber}
          label={trans("Resource Record Number")}
        />
        {#if edForm.rrnumber === "65"}
          <p class={cn("text-xs", "text-muted", "italic", "mb-2")}>
            {trans(
              "Type 65 SVCB records are configured via the fields below. Hex is auto-generated on save.",
            )}
          </p>
          <Input
            type="number"
            placeholder="1"
            label={trans("Svc Priority")}
            bind:value={edForm._svc_priority}
          />
          <Input
            label={trans("Svc Target")}
            placeholder="svc.example.com."
            bind:value={edForm._svc_target}
          />
          <div>
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class={labelCls}>{trans("Svc Parameters")}</label>
            <textarea
              rows={4}
              bind:value={edForm._svc_params}
              placeholder="alpn=h2,h3&#10;ipv4hint=192.0.2.1,192.0.2.2&#10;ipv6hint=2001:db8::1,2001:db8::2&#10;port=8000"
              class={cn(
                "border",
                "w-full",
                "px-2.5",
                "py-1.5",
                "text-xs",
                "text-fg",
                "resize-y",
                "min-h-15",
                "font-mono",
                "rounded-md",
                "bg-surface",
                "outline-none",
                "transition-all",
                "border-border",
                "focus:border-(--accent)",
              )}
            ></textarea>
          </div>
        {:else}
          <div>
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class={labelCls}>{trans("Raw Data")}</label>
            <textarea
              rows={4}
              bind:value={edForm._hexdata}
              placeholder="free-form string"
              class={cn(
                "w-full",
                "px-2.5",
                "py-1.5",
                "border",
                "text-xs",
                "text-fg",
                "min-h-15",
                "resize-y",
                "font-mono",
                "rounded-md",
                "bg-surface",
                "outline-none",
                "transition-all",
                "border-border",
                "focus:border-(--accent)",
              )}
            ></textarea>
          </div>
        {/if}
      {/if}
    </div>
    <div class={cn("flex", "justify-end", "gap-2", "mt-5")}>
      <button
        onclick={onclose}
        class={cn(
          "px-3",
          "py-1.5",
          "border",
          "text-xs",
          "rounded-lg",
          "text-muted",
          "hover:text-fg",
          "cursor-pointer",
          "bg-surface-2",
          "border-border",
        )}>{trans("Cancel")}</button
      >
      <button
        onclick={onsave}
        class={cn(
          "flex",
          "px-3",
          "py-1.5",
          "gap-1.5",
          "text-xs",
          "bg-accent",
          "rounded-lg",
          "items-center",
          "text-black",
          "cursor-pointer",
          "hover:opacity-90",
        )}><Save size={12} />{trans("Save")}</button
      >
    </div>
  </div>
</div>
