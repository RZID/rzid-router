<script lang="ts">
  import { RefreshCw } from "@lucide/svelte";
  import { cn } from "../../../helpers/classname";

  import type { DdnsState, DdnsEnv } from "../../../api/ubus";

  let {
    status,
    env,
    trans,
    onToggleDdns,
    onRestartDdns,
    onRefreshServicesList,
  }: {
    status: DdnsState | null;
    env: DdnsEnv | null;
    trans: (k: string) => string;
    onToggleDdns: () => void;
    onRestartDdns: () => void;
    onRefreshServicesList: () => void;
  } = $props();

  const envHints = $derived.by(() => {
    if (!env) return [];
    const hints: { title: string; desc: string[] }[] = [];
    if (!env.has_ipv6) {
      hints.push({
        title: trans("IPv6 not supported"),
        desc: [trans("IPv6 is not supported by this system")],
      });
    }
    if (!env.has_ssl) {
      hints.push({
        title: trans("HTTPS not supported"),
        desc: [
          trans(
            "Install 'wget' or 'curl' or 'uclient-fetch' with 'libustream-*ssl' package.",
          ),
        ],
      });
    }
    if (!env.has_bindnet) {
      hints.push({
        title: trans("Binding to a specific network not supported"),
        desc: [
          trans("Install 'wget' or 'curl' package for multiple WAN support."),
        ],
      });
    }
    if (!env.has_proxy) {
      hints.push({
        title: trans("cURL without Proxy Support"),
        desc: [trans("Install 'wget' or 'uclient-fetch' package.")],
      });
    }
    if (!env.has_bindhost) {
      hints.push({
        title: trans("DNS requests via TCP not supported"),
        desc: [trans("Install 'bind-host' or 'knot-host' or 'drill' package.")],
      });
    }
    if (!env.has_dnsserver) {
      hints.push({
        title: trans("Using specific DNS Server not supported"),
        desc: [
          trans(
            "Install 'bind-host' or 'knot-host' or 'drill' or 'hostip' package.",
          ),
        ],
      });
    }
    if (env.has_ssl && !env.has_cacerts) {
      hints.push({
        title: trans("No certificates found"),
        desc: [trans("Install 'ca-certificates' package.")],
      });
    }
    return hints;
  });
</script>

<div class={cn("space-y-4")}>
  <div
    class={cn(
      "glass",
      "p-4",
      "rounded-xl",
      "flex",
      "items-center",
      "flex-wrap",
      "gap-x-6",
      "gap-y-3",
    )}
  >
    <div class={cn("flex", "items-center", "gap-3")}>
      <div
        class={cn(
          "w-8",
          "h-8",
          "rounded-lg",
          "flex",
          "items-center",
          "justify-center",
          "bg-accent/10",
        )}
      >
        <span class={cn("text-xs", "font-bold", "text-accent")}>{trans("DD")}</span>
      </div>
      <div>
        <p
          class={cn(
            "text-[10px]",
            "uppercase",
            "text-muted",
            "font-semibold",
            "tracking-wider",
          )}
        >
          {trans("Version")}
        </p>
        <p class={cn("text-xs", "font-mono", "text-fg", "mt-px")}>
          {status?._version || "—"}
        </p>
      </div>
    </div>
    <div class={cn("w-px", "h-8", "bg-border")}></div>
    <div class={cn("flex", "items-center", "gap-2.5")}>
      <span
        class={cn(
          "w-2",
          "h-2",
          "rounded-full",
          status?._enabled ? "bg-(--accent)" : "bg-(--text-muted)",
        )}
      ></span>
      <div>
        <p
          class={cn(
            "text-[10px]",
            "uppercase",
            "text-muted",
            "font-semibold",
            "tracking-wider",
          )}
        >
          {trans("State")}
        </p>
        <p
          class={cn("text-xs", "mt-px")}
          style="color:{status?._enabled
            ? 'var(--accent)'
            : 'var(--text-muted)'}"
        >
          {status?._enabled
            ? trans("Autostart enabled")
            : trans("Autostart disabled")}
        </p>
      </div>
    </div>
    <div class={cn("flex-1")}></div>
    <div class={cn("flex", "items-center", "gap-2")}>
      <button
        onclick={onToggleDdns}
        class={cn(
          "px-3",
          "py-1.5",
          "text-xs",
          "rounded-lg",
          "font-medium",
          "transition-all",
          "cursor-pointer",
          status?._enabled
            ? "bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20"
            : "bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20",
        )}
      >
        {status?._enabled ? trans("Stop DDNS") : trans("Start DDNS")}
      </button>
      <button
        onclick={onRestartDdns}
        class={cn(
          "px-3",
          "py-1.5",
          "text-xs",
          "rounded-lg",
          "font-medium",
          "transition-all",
          "cursor-pointer",
          "bg-surface-2 text-muted border border-border hover:bg-white/5 hover:text-fg",
        )}
      >
        {trans("Restart")}
      </button>
    </div>
  </div>

  <div
    class={cn(
      "glass",
      "p-4",
      "rounded-xl",
      "flex",
      "items-center",
      "justify-between",
    )}
  >
    <div class={cn("flex", "items-center", "gap-3")}>
      <RefreshCw size={14} class={cn("text-muted", "shrink-0")} />
      <div>
        <p
          class={cn(
            "text-[10px]",
            "uppercase",
            "text-muted",
            "font-semibold",
            "tracking-wider",
          )}
        >
          {trans("Services list last update")}
        </p>
        <p class={cn("text-xs", "text-fg", "mt-px")}>
          {status?._services_list || "—"}
        </p>
      </div>
    </div>
    <button
      onclick={onRefreshServicesList}
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
        "cursor-pointer",
        "bg-surface-2 text-muted border border-border hover:bg-white/5 hover:text-fg",
      )}
    >
      <RefreshCw size={14} />
      {trans("Update List")}
    </button>
  </div>

  {#each envHints as hint}
    <div
      class={cn("rounded-xl", "p-4", "flex", "items-start", "gap-3")}
      style="background:color-mix(in srgb, var(--warning) 8%, transparent);border:1px solid color-mix(in srgb, var(--warning) 20%, transparent)"
    >
      <div
        class={cn("w-1.5", "h-1.5", "rounded-full", "mt-1", "shrink-0")}
        style="background:var(--warning)"
      ></div>
      <div>
        <p class={cn("text-xs", "font-semibold")} style="color:var(--warning)">
          {hint.title}
        </p>
        {#each hint.desc as d}
          <p class={cn("text-[10px]", "text-muted", "mt-1", "leading-relaxed")}>
            {d}
          </p>
        {/each}
      </div>
    </div>
  {/each}
</div>
