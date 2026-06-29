<script lang="ts">
  import { cn } from "../../../helpers/classname";
  import { fmtBytes } from "../../../helpers/format";
  import type { SystemInfoData } from "./types";

  let {
    sysInfo,
    memTotal,
    memUsed,
    memPct,
    memBuffered,
    memCached,
    trans,
  }: {
    sysInfo: SystemInfoData;
    memTotal: number;
    memUsed: number;
    memPct: number;
    memBuffered: number;
    memCached: number;
    trans: (k: string) => string;
  } = $props();
</script>

<div class={cn("mb-4")}>
  <div class={cn("flex", "justify-between", "text-xs", "mb-1")}>
    <span class={cn("text-muted")}>{trans("RAM")}</span>
    <span class={cn("font-mono", "text-muted")}>
      {fmtBytes(memUsed)} / {fmtBytes(memTotal)}
    </span>
  </div>
  <div class={cn("h-2", "rounded-full", "overflow-hidden", "bg-surface-3")}>
    <div
      class={cn("h-full", "duration-700", "rounded-full", "transition-all")}
      style="width:{memPct}%;background:{memPct > 80
        ? 'var(--danger)'
        : memPct > 60
          ? 'var(--warn)'
          : 'var(--accent)'}"
    ></div>
  </div>
  <div
    class={cn("mt-2", "flex", "gap-4", "text-xs", "font-mono", "text-muted")}
  >
    <span>{trans("Free")} {fmtBytes(sysInfo.memory?.free || 0)}</span>
    <span>{trans("Buf")} {fmtBytes(memBuffered)}</span>
    <span>{trans("Cache")} {fmtBytes(memCached)}</span>
  </div>
</div>

{#if sysInfo.root || sysInfo.tmp}
  <div class={cn("space-y-3", "text-xs", "mt-4")}>
    {#each [{ k: trans("Disk space"), v: sysInfo.root }, { k: trans("Temp space"), v: sysInfo.tmp }] as { k, v }}
      {#if v}
        <div>
          <div class={cn("flex", "justify-between", "mb-1")}>
            <span class={cn("text-muted")}>{k}</span>
            <span class={cn("font-mono")}>
              {fmtBytes((v.total - v.free) * 1024)} / {fmtBytes(v.total * 1024)}
              ({v.total > 0
                ? Math.round(((v.total - v.free) / v.total) * 100)
                : 0}%)
            </span>
          </div>
          <div
            class={cn(
              "h-1.5",
              "rounded-full",
              "bg-surface-3",
              "overflow-hidden",
            )}
          >
            <div
              class={cn(
                "h-full",
                "duration-700",
                "rounded-full",
                "transition-all",
              )}
              style="width:{v.total > 0
                ? Math.round(((v.total - v.free) / v.total) * 100)
                : 0}%;background:var(--accent)"
            ></div>
          </div>
        </div>
      {/if}
    {/each}
  </div>
{/if}
