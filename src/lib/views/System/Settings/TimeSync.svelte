<script lang="ts">
  import { cn } from "../../../helpers/classname";
  import Input from "../../../components/Input/Input.svelte";
  import Toggle from "../../../components/Toggle/Toggle.svelte";

  let {
    ntpdAvailable,
    ntpEnabled,
    ntpEnableServer,
    ntpInterface,
    ntpUseDhcp,
    ntpServers,
    trans,
  }: {
    ntpdAvailable: boolean;
    ntpEnabled: boolean;
    ntpEnableServer: boolean;
    ntpInterface: string;
    ntpUseDhcp: boolean;
    ntpServers: string[];
    trans: (k: string) => string;
  } = $props();
</script>

<div class={cn("space-y-4")}>
  {#if !ntpdAvailable}
    <div
      class={cn("glass", "p-5", "animate-slide-up", "text-xs", "text-muted")}
    >
      {trans("NTP daemon is not available on this system")}
    </div>
  {:else}
    <div class={cn("glass", "p-5", "animate-slide-up")}>
      <Toggle label={trans("Enable NTP client")} bind:checked={ntpEnabled} />
    </div>
    {#if ntpEnabled}
      <div class={cn("glass", "p-5", "animate-slide-up")}>
        <Toggle
          label={trans("Provide NTP server")}
          bind:checked={ntpEnableServer}
        />
        {#if ntpEnableServer}
          <Input
            label={trans("Bind NTP server to interface")}
            bind:value={ntpInterface}
            placeholder={trans("All interfaces")}
            class={cn("max-w-sm")}
          />
        {/if}
      </div>
      <div class={cn("glass", "p-5", "animate-slide-up")}>
        <Toggle
          label={trans("Use DHCP advertised servers")}
          bind:checked={ntpUseDhcp}
        />
      </div>
      <div class={cn("glass", "p-5", "animate-slide-up")}>
        <span
          class={cn(
            "block",
            "text-[10px]",
            "uppercase",
            "text-muted",
            "font-semibold",
            "tracking-wider",
            "mb-1.5",
          )}>{trans("NTP server candidates")}</span
        >
        <p class={cn("text-[10px]", "text-muted", "mb-3")}>
          {trans(
            "List of upstream NTP server candidates with which to synchronize",
          )}
        </p>
        <div class={cn("space-y-2")}>
          {#each ntpServers as _, i}
            <div class={cn("flex", "items-center", "gap-2")}>
              <Input
                bind:value={ntpServers[i]}
                placeholder="pool.ntp.org"
                class={cn("flex-1 max-w-sm")}
                mono
              />
              <button
                onclick={() => {
                  ntpServers = ntpServers.filter((_, j) => j !== i);
                }}
                class={cn(
                  "px-2",
                  "py-1",
                  "border",
                  "text-xs",
                  "rounded-md",
                  "font-medium",
                  "transition-all",
                  "cursor-pointer",
                  "hover:bg-danger/20",
                  "text-danger",
                  "bg-danger/10",
                  "border-danger/20",
                )}>{trans("Remove")}</button
              >
            </div>
          {/each}
        </div>
        <button
          onclick={() => {
            ntpServers = [...ntpServers, ""];
          }}
          class={cn(
            "mt-2",
            "px-2.5",
            "py-1.5",
            "border",
            "text-xs",
            "rounded-md",
            "font-medium",
            "transition-all",
            "cursor-pointer",
            "hover:bg-accent/15",
            "text-accent",
            "bg-accent/10",
            "border-accent/20",
          )}>{trans("Add server")}</button
        >
      </div>
    {/if}
  {/if}
</div>
