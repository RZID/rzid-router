<script lang="ts">
  import type { Component } from "svelte";
  import { cn } from "../helpers/classname";

  let {
    label, value, sub = "", color = "var(--accent)", icon, pulse = false,
  }: {
    label: string; value: string; sub?: string; color?: string;
    icon?: Component; pulse?: boolean;
  } = $props();
</script>

<div class={cn("p-5", "flex", "glass", "gap-3", "group", "flex-col", "animate-slide-up")}>
  <div class={cn("flex", "items-center", "justify-between")}>
    <span class={cn("text-xs", "font-medium", "tracking-wider", "uppercase")} style="color: var(--text-muted)">{label}</span>
    {#if icon}
      <span class={cn("opacity-60", "transition-opacity", "group-hover:opacity-100")}>
        {#if icon}
          {@const Icon = icon}
          <Icon size={16} style="color:var(--text-muted)" />
        {/if}
      </span>
    {/if}
  </div>
  <div class={cn("flex", "items-end", "gap-2")}>
    <span style="color:{color}" class={cn("text-2xl", "font-semibold", "font-mono")}>
      {#if pulse}
        <span class={cn("inline-flex", "items-center", "gap-2")}>
          <span class={cn("w-2", "h-2", "rounded-full", "animate-pulse")} style="background:{color}"></span>
          {value}
        </span>
      {:else}{value}{/if}
    </span>
    {#if sub}<span class={cn("text-xs", "pb-1")} style="color: var(--text-muted)">{sub}</span>{/if}
  </div>
</div>
