<script lang="ts">
  import { cn } from "../../../helpers/classname";
  import Input from "../../../components/Input/Input.svelte";
  import Toggle from "../../../components/Toggle/Toggle.svelte";

  let {
    g,
    env,
    status,
    saving,
    trans,
    onSaveGlobal,
  }: {
    g: {
      upd_privateip: boolean;
      ddns_dateformat: string;
      ddns_rundir: string;
      ddns_logdir: string;
      ddns_loglines: string;
      use_curl: boolean;
      cacert: string;
      services_url: string;
    };
    env: any;
    status: any;
    saving: boolean;
    trans: (k: string) => string;
    onSaveGlobal: () => void;
  } = $props();
</script>

<div class={cn("space-y-4")}>
  <div class={cn("glass", "p-5", "rounded-xl", "space-y-5")}>
    <div>
      <span
        class={cn(
          "text-[10px]",
          "uppercase",
          "text-muted",
          "font-semibold",
          "tracking-wider",
        )}>{trans("General")}</span
      >
      <div class={cn("mt-3", "space-y-4")}>
        <Toggle
          bind:checked={g.upd_privateip}
          label={trans("Allow non-public IPs")}
          description={trans(
            "Allow private IPs 10/8, 172.16/12, 192.168/16 and IPv6 private ranges.",
          )}
        />
        <Input
          label={trans("Date format")}
          bind:value={g.ddns_dateformat}
          placeholder="%F %R"
          mono
        />
        <p class={cn("text-[10px]", "text-muted", "-mt-2")}>
          {trans("Current:")}
          <span class={cn("font-mono")}
            >{status?._curr_dateformat || "%F %R"}</span
          >
        </p>
      </div>
    </div>
    <div class={cn("h-px", "bg-border")}></div>
    <div>
      <span
        class={cn(
          "text-[10px]",
          "uppercase",
          "text-muted",
          "font-semibold",
          "tracking-wider",
        )}>{trans("Paths")}</span
      >
      <div class={cn("mt-3", "space-y-4")}>
        <Input
          label={trans("Status directory")}
          bind:value={g.ddns_rundir}
          placeholder="/var/run/ddns"
          mono
        />
        <Input
          label={trans("Log directory")}
          bind:value={g.ddns_logdir}
          placeholder="/var/log/ddns"
          mono
        />
        <Input
          label={trans("Log length")}
          bind:value={g.ddns_loglines}
          placeholder="250"
        />
      </div>
    </div>
    <div class={cn("h-px", "bg-border")}></div>
    <div>
      <span
        class={cn(
          "text-[10px]",
          "uppercase",
          "text-muted",
          "font-semibold",
          "tracking-wider",
        )}>{trans("Network")}</span
      >
      <div class={cn("mt-3", "space-y-4")}>
        {#if env?.has_wget && env?.has_curl}
          <Toggle
            bind:checked={g.use_curl}
            label={trans("Use cURL")}
            description={trans("Use cURL instead of Wget for communication.")}
          />
        {/if}
        <Input
          label={trans("CA cert bundle file")}
          bind:value={g.cacert}
          placeholder="IGNORE"
          mono
        />
      </div>
    </div>
    <div class={cn("h-px", "bg-border")}></div>
    <div>
      <span
        class={cn(
          "text-[10px]",
          "uppercase",
          "text-muted",
          "font-semibold",
          "tracking-wider",
        )}>{trans("Services")}</span
      >
      <div class={cn("mt-3", "space-y-4")}>
        <Input
          label={trans("Services URL Download")}
          bind:value={g.services_url}
          placeholder="https://..."
          mono
        />
      </div>
    </div>
  </div>
  <div class={cn("flex", "justify-end", "gap-2")}>
    <button
      onclick={onSaveGlobal}
      class={cn(
        "px-4",
        "py-1.5",
        "text-xs",
        "rounded-lg",
        "font-medium",
        "transition-all",
        "cursor-pointer",
        "border",
        "text-accent",
        "bg-accent/10",
        "border-accent/20",
        "hover:bg-accent/20",
      )}
    >
      {saving ? trans("Saving...") : trans("Save & Apply")}
    </button>
  </div>
</div>
