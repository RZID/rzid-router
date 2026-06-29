<script lang="ts">
  import { Shield } from "@lucide/svelte";
  import { cn } from "../../../helpers/classname";
  import Input from "../../../components/Input/Input.svelte";

  let {
    gc = $bindable(""),
    maxprocs = $bindable(""),
    memlimit = $bindable(""),
    advanced_settings,
    trans,
  }: {
    gc: string;
    maxprocs: string;
    memlimit: string;
    advanced_settings: boolean;
    trans: (k: string) => string;
  } = $props();
</script>

<div class={cn("space-y-5")}>
  <div class={cn("flex", "items-center", "gap-2")}>
    <Shield size={14} class={cn("text-accent")} />
    <span
      class={cn(
        "text-[10px]",
        "uppercase",
        "text-muted",
        "font-semibold",
        "tracking-wider",
      )}>{trans("Advanced Settings")}</span
    >
  </div>
  <div class={cn("h-px", "bg-border")}></div>
  <p class={cn("text-[10px]", "text-muted")}>
    {trans(
      "Go environment variables that tune garbage collector and memory management.",
    )}
    {trans("Modify at your own risk.")}
  </p>
  {#if advanced_settings}
    <Input label="GOGC" bind:value={gc} placeholder="0" />
    <p class={cn("text-[10px]", "text-muted", "-mt-3")}>
      {trans(
        "Tunes the garbage collector's aggressiveness by setting the percentage of heap growth allowed before the next collection cycle triggers.",
      )}<br />{trans("If empty, defaults to")}
      {trans("unset and 100")}.<br />
      <a
        href="https://go.dev/doc/gc-guide#GOGC"
        target="_blank"
        class={cn("text-accent", "hover:underline")}
        >https://go.dev/doc/gc-guide#GOGC</a
      >
    </p>
    <Input label="GOMAXPROCS" bind:value={maxprocs} placeholder="0" />
    <p class={cn("text-[10px]", "text-muted", "-mt-3")}>
      {trans(
        "The maximum number of operating system threads that can execute user-level Go code simultaneously.",
      )}<br />{trans("If empty, defaults to")}
      {trans("unset and matching the number of CPUs")}.
    </p>
    <Input label="GOMEMLIMIT" bind:value={memlimit} placeholder="0" />
    <p class={cn("text-[10px]", "text-muted", "-mt-3")}>
      {trans(
        "A soft memory cap for the Go runtime, allowing the garbage collector to run more frequently as usage approaches the limit to prevent Out-of-Memory (OOM) kills.",
      )}<br />{trans("If empty, defaults to")}
      {trans("unset")}.
    </p>
  {:else}
    <div
      class={cn(
        "py-8",
        "flex",
        "flex-col",
        "items-center",
        "justify-center",
        "gap-2",
      )}
    >
      <span class={cn("text-xs", "text-muted")}
        >{trans(
          "Enable 'Advanced Settings' in the General tab to configure Go runtime parameters.",
        )}</span
      >
    </div>
  {/if}
</div>
