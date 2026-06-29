<script lang="ts">
  import { cn } from "../../helpers/classname";
  import Input from "../../components/Input/Input.svelte";
  import Toggle from "../../components/Toggle/Toggle.svelte";

  let {
    enabled,
    enable_upnp,
    enable_natpmp,
    ext_allow_private_ipv4,
    igdv1,
    download = $bindable(""),
    upload = $bindable(""),
    use_stun,
    stun_host,
    stun_port,
    secure_mode,
    notify_interval,
    port,
    presentation_url,
    uuid,
    model_number,
    serial_number,
    system_uptime,
    log_output,
    upnp_lease_file,
    settingsTab = $bindable("setup"),
    trans,
  }: {
    enabled: boolean;
    enable_upnp: boolean;
    enable_natpmp: boolean;
    ext_allow_private_ipv4: boolean;
    igdv1: boolean;
    download?: string;
    upload?: string;
    use_stun: boolean;
    stun_host: string;
    stun_port: string;
    secure_mode: boolean;
    notify_interval: string;
    port: string;
    presentation_url: string;
    uuid: string;
    model_number: string;
    serial_number: string;
    system_uptime: boolean;
    log_output: boolean;
    upnp_lease_file: string;
    settingsTab?: "setup" | "advanced";
    trans: (k: string) => string;
  } = $props();
</script>

<div class={cn("glass", "rounded-xl", "p-5")}>
  <div class={cn("flex", "items-center", "gap-2", "mb-4")}>
    <span
      class={cn(
        "text-[10px]",
        "uppercase",
        "text-muted",
        "font-semibold",
        "tracking-wider",
      )}>{trans("Service Settings")}</span
    >
  </div>

  <div
    class={cn(
      "flex",
      "gap-1",
      "p-0.5",
      "mb-4",
      "w-fit",
      "border",
      "rounded-lg",
      "bg-surface-2",
      "border-border",
    )}
  >
    <button
      class={cn(
        "px-3",
        "py-1",
        "text-xs",
        "rounded-md",
        "font-medium",
        "transition-all",
        "cursor-pointer",
        settingsTab === "setup"
          ? "bg-accent text-surface"
          : "bg-transparent text-muted",
      )}
      onclick={() => (settingsTab = "setup")}>{trans("Service Setup")}</button
    >
    <button
      class={cn(
        "px-3",
        "py-1",
        "text-xs",
        "rounded-md",
        "font-medium",
        "transition-all",
        "cursor-pointer",
        settingsTab === "advanced"
          ? "bg-accent text-surface"
          : "bg-transparent text-muted",
      )}
      onclick={() => (settingsTab = "advanced")}
      >{trans("Advanced Settings")}</button
    >
  </div>

  {#key settingsTab}
    {#if settingsTab === "setup"}
      <div class={cn("space-y-5")}>
        <div class={cn("h-px", "bg-border")}></div>
        <Toggle
          label={trans("Start service")}
          description={trans("Start autonomous port mapping service")}
          bind:checked={enabled}
        />
        <Toggle
          label={trans("Enable UPnP IGD protocol")}
          bind:checked={enable_upnp}
        />
        <Toggle
          label={trans("Enable PCP/NAT-PMP protocols")}
          bind:checked={enable_natpmp}
        />
        <Toggle
          label={trans("Allow private IPv4")}
          description={trans(
            "Enable forwarding for private/reserved IPv4 address",
          )}
          bind:checked={ext_allow_private_ipv4}
        />
        {#if enable_upnp}
          <Toggle
            label={trans("UPnP IGDv1 compatibility mode")}
            description={trans(
              "Advertise as IGDv1 (IPv4 only) device instead of IGDv2",
            )}
            bind:checked={igdv1}
          />
          <div class={cn("h-px", "bg-border")}></div>
          <div class={cn("grid", "grid-cols-2", "gap-4")}>
            <div>
              <Input
                label={trans("Download speed")}
                bind:value={download}
                placeholder="25000"
                type="number"
              />
              <p class={cn("text-[10px]", "text-muted", "italic", "mt-1")}>
                {trans("Report maximum download speed in kByte/s")}
              </p>
            </div>
            <div>
              <Input
                label={trans("Upload speed")}
                bind:value={upload}
                placeholder="25000"
                type="number"
              />
              <p class={cn("text-[10px]", "text-muted", "italic", "mt-1")}>
                {trans("Report maximum upload speed in kByte/s")}
              </p>
            </div>
          </div>
        {/if}
      </div>
    {:else}
      <div class={cn("space-y-5")}>
        <div class={cn("h-px", "bg-border")}></div>
        <Toggle
          label={trans("Use STUN")}
          description={trans(
            "To detect the public IPv4 address for unrestricted full-cone/one-to-one NATs",
          )}
          bind:checked={use_stun}
        />
        {#if use_stun}
          <div class={cn("grid", "grid-cols-2", "gap-4", "ml-6")}>
            <Input
              label={trans("STUN host")}
              bind:value={stun_host}
              placeholder="stun.example.com"
            />
            <Input
              label={trans("STUN port")}
              bind:value={stun_port}
              placeholder="3478"
              type="number"
            />
          </div>
        {/if}
        {#if enable_upnp}
          <Toggle
            label={trans("Enable secure mode")}
            description={trans(
              "Allow adding port maps for requesting IP addresses only",
            )}
            bind:checked={secure_mode}
          />
          <Input
            label={trans("Notify interval")}
            bind:value={notify_interval}
            placeholder="900"
            type="number"
          />
          <p class={cn("text-[10px]", "text-muted", "italic", "-mt-4")}>
            {trans(
              "A 900s interval will result in SSDP notifications with the minimum max-age of 1800s",
            )}
          </p>
          <Input
            label={trans("SOAP/HTTP port")}
            bind:value={port}
            placeholder="5000"
            type="number"
          />
          <Input
            label={trans("Presentation URL")}
            bind:value={presentation_url}
            placeholder="http://192.168.1.1/"
          />
          <div class={cn("grid", "grid-cols-2", "gap-4")}>
            <Input
              label={trans("Device UUID")}
              bind:value={uuid}
              placeholder="uuid"
            />
            <Input
              label={trans("Model number")}
              bind:value={model_number}
              placeholder={trans("Announced model number")}
            />
          </div>
          <div class={cn("grid", "grid-cols-2", "gap-4")}>
            <Input
              label={trans("Serial number")}
              bind:value={serial_number}
              placeholder={trans("Announced serial number")}
            />
          </div>
          <Toggle
            label={trans("Report system instead of service uptime")}
            bind:checked={system_uptime}
          />
        {/if}
        <Toggle
          label={trans("Enable additional logging")}
          description={trans(
            "Puts extra debugging information into the system log",
          )}
          bind:checked={log_output}
        />
        <Input
          label={trans("Service lease file")}
          bind:value={upnp_lease_file}
          placeholder="/var/run/miniupnpd.leases"
        />
      </div>
    {/if}
  {/key}
</div>
