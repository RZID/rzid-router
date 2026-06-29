<script lang="ts">
  import { Download } from "@lucide/svelte";
  import { cn } from "../../../helpers/classname";
  import Input from "../../../components/Input/Input.svelte";
  import Select from "../../../components/Select/Select.svelte";
  import Toggle from "../../../components/Toggle/Toggle.svelte";
  import FileUpload from "../../../components/FileUpload/FileUpload.svelte";
  import type { ServiceForm } from "./types";
  import type { DdnsEnv } from "../../../api/ubus";

  let {
    editForm,
    env,
    providerServices,
    originalServiceName,
    originalUseIpv6,
    serviceAvailable,
    serviceSupported,
    serviceUpdateUrl,
    editValidationErrors,
    saving,
    trans,
    onCheckService,
    onInstallService,
    onSwitchService,
  }: {
    editForm: ServiceForm;
    env: DdnsEnv | null;
    providerServices: Record<string, boolean>;
    originalServiceName: string;
    originalUseIpv6: string;
    serviceAvailable: boolean;
    serviceSupported: boolean;
    serviceUpdateUrl: string | null;
    editValidationErrors: string[];
    saving: boolean;
    trans: (k: string) => string;
    onCheckService: (svc: string, ipv6: string) => void;
    onInstallService: (svc: string) => void;
    onSwitchService: () => void;
  } = $props();
</script>

<div class={cn("space-y-4")}>
  {#if editValidationErrors.length > 0}
    <div
      class={cn(
        "p-3",
        "rounded-lg",
        "bg-danger/10",
        "border",
        "border-danger/20",
      )}
    >
      {#each editValidationErrors as err}
        <p class={cn("text-xs", "text-danger")}>{err}</p>
      {/each}
    </div>
  {/if}

  <Toggle
    bind:checked={editForm.enabled}
    label={trans("Enabled")}
    description={trans("If disabled, this service will not be started.")}
  />
  <Input
    label={trans("Lookup Hostname")}
    bind:value={editForm.lookup_host}
    placeholder="myhost.example.com"
  />
  <Select
    label={trans("IP address version")}
    options={[
      { value: "0", label: "IPv4-Address" },
      ...(env?.has_ipv6 ? [{ value: "1", label: "IPv6-Address" }] : []),
    ]}
    bind:value={editForm.use_ipv6}
    onchange={() => onCheckService(editForm.service_name, editForm.use_ipv6)}
  />
  <Select
    label={trans("DDNS Service provider")}
    options={[
      { value: "-", label: "📝 custom" },
      ...Object.keys(providerServices)
        .sort()
        .map((k) => ({ value: k, label: k })),
    ]}
    bind:value={editForm.service_name}
    onchange={() => onCheckService(editForm.service_name, editForm.use_ipv6)}
  />

  {#if !serviceAvailable && editForm.service_name !== "-"}
    <div
      class={cn(
        "p-3",
        "rounded-lg",
        "bg-warn/10",
        "border",
        "border-warn/20",
        "space-y-2",
      )}
    >
      <p class={cn("text-xs", "text-warn")}>{trans("Service not installed")}</p>
      <button
        onclick={() => onInstallService(editForm.service_name)}
        class={cn(
          "px-3",
          "py-1.5",
          "border",
          "text-xs",
          "rounded-md",
          "font-medium",
          "transition-all",
          "cursor-pointer",
          "text-accent",
          "bg-accent/10",
          "border-accent/20",
        )}
      >
        <Download size={12} />
        {trans("Install Service")}
      </button>
    </div>
  {/if}

  {#if !serviceSupported}
    <p class={cn("text-xs", "text-danger")}>
      {trans("Service doesn't support this IP type")}
    </p>
  {/if}

  {#if editForm.service_name !== originalServiceName || editForm.use_ipv6 !== originalUseIpv6}
    <div
      class={cn(
        "p-3",
        "rounded-lg",
        "bg-accent/10",
        "border",
        "border-accent/20",
      )}
    >
      <p class={cn("text-xs", "text-fg", "mb-2")}>
        {trans(
          "Service or IP version has changed. Switching will update the configuration.",
        )}
      </p>
      <button
        onclick={onSwitchService}
        disabled={saving}
        class={cn(
          "px-3",
          "py-1.5",
          "border",
          "text-xs",
          "rounded-md",
          "font-medium",
          "transition-all",
          "cursor-pointer",
          "text-accent",
          "bg-accent/20",
          "border-accent/30",
        )}
      >
        {saving ? trans("Switching...") : trans("Switch Service")}
      </button>
    </div>
  {/if}

  {#if serviceUpdateUrl}
    <div
      class={cn("p-3", "rounded-lg", "bg-surface-2", "border", "border-border")}
    >
      <span
        class={cn(
          "block",
          "text-[10px]",
          "uppercase",
          "text-muted",
          "font-semibold",
          "tracking-wider",
          "mb-1",
        )}
      >
        {trans("Update URL")}
      </span>
      <code class={cn("text-xs", "font-mono", "text-fg", "break-all")}
        >{serviceUpdateUrl}</code
      >
    </div>
  {/if}

  {#if editForm.service_name === "-"}
    <Input
      label={trans("Custom update-URL")}
      bind:value={editForm.update_url}
      placeholder="http://..."
    />
    <FileUpload
      label={trans("Custom update-script")}
      bind:value={editForm.update_script}
      rootDir="/usr/lib/ddns"
    />
  {/if}
  <Input
    label={trans("Domain")}
    bind:value={editForm.domain}
    placeholder="example.com"
  />
  <Input label={trans("Username")} bind:value={editForm.username} />
  <Input
    label={trans("Password")}
    type="password"
    bind:value={editForm.password}
  />
  <Input
    label={trans("Optional Encoded Parameter")}
    bind:value={editForm.param_enc}
  />
  <Input label={trans("Optional Parameter")} bind:value={editForm.param_opt} />
  {#if env?.has_ssl}
    <Toggle
      bind:checked={editForm.use_https}
      label={trans("Use HTTP Secure")}
    />
    {#if editForm.use_https}
      <Input
        label={trans("Path to CA-Certificate")}
        bind:value={editForm.cacert}
        placeholder="/etc/ssl/certs"
      />
    {/if}
  {/if}
</div>
