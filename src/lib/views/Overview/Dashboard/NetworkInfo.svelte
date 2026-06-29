<script lang="ts">
  import { cn } from "../../../helpers/classname";

  let {
    wanIp,
    wanGw,
    wanProto,
    wanDevice,
    wanMac,
    wanDns,
    trans,
  }: {
    wanIp: string;
    wanGw: string;
    wanProto: string;
    wanDevice: string;
    wanMac: string;
    wanDns: string[];
    trans: (k: string) => string;
  } = $props();
</script>

<dl class={cn("grid", "grid-cols-2", "gap-y-3", "gap-x-8", "text-sm")}>
  <div>
    <dt
      class={cn(
        "mb-0.5",
        "text-xs",
        "uppercase",
        "text-muted",
        "tracking-wider",
      )}
    >
      {trans("Protocol")}
    </dt>
    <dd class={cn("font-semibold")}>{wanProto.toUpperCase()}</dd>
  </div>
  <div>
    <dt
      class={cn(
        "mb-0.5",
        "text-xs",
        "uppercase",
        "text-muted",
        "tracking-wider",
      )}
    >
      {trans("Address")}
    </dt>
    <dd class={cn("font-mono", "text-xs", "text-accent")}>{wanIp}</dd>
  </div>
  <div>
    <dt
      class={cn(
        "mb-0.5",
        "text-xs",
        "uppercase",
        "text-muted",
        "tracking-wider",
      )}
    >
      {trans("Gateway")}
    </dt>
    <dd class={cn("font-mono", "text-xs")}>{wanGw}</dd>
  </div>
  {#each wanDns as dns}
    <div>
      <dt
        class={cn(
          "mb-0.5",
          "text-xs",
          "uppercase",
          "text-muted",
          "tracking-wider",
        )}
      >
        {trans("DNS")}
      </dt>
      <dd class={cn("font-mono", "text-xs")}>{dns}</dd>
    </div>
  {/each}
  <div>
    <dt
      class={cn(
        "mb-0.5",
        "text-xs",
        "uppercase",
        "text-muted",
        "tracking-wider",
      )}
    >
      {trans("Device")}
    </dt>
    <dd class={cn("font-medium")}>{wanDevice}</dd>
  </div>
  <div>
    <dt
      class={cn(
        "mb-0.5",
        "text-xs",
        "uppercase",
        "text-muted",
        "tracking-wider",
      )}
    >
      {trans("MAC")}
    </dt>
    <dd class={cn("font-mono", "text-xs")}>{wanMac}</dd>
  </div>
</dl>
