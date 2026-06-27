<script lang="ts">
  import { onMount } from "svelte";
  import { ChevronDown } from "@lucide/svelte";
  import { cn } from "../../helpers/classname";
  import { getNetworkInterfaces } from "../../api/ubus";

  let {
    label = "",
    value = $bindable(""),
    placeholder = "",
    class: className = "",
    onchange,
  }: {
    label?: string;
    value?: string;
    placeholder?: string;
    class?: string;
    onchange?: () => void;
  } = $props();

  let networks = $state<string[]>([]);
  let loading = $state(true);
  let open = $state(false);
  let focused = $state(false);

  onMount(async () => {
    const dump = await getNetworkInterfaces();
    if (dump?.interface) {
      networks = (dump.interface as any[]).map((i: any) => i.interface).filter(Boolean).sort();
    }
    loading = false;
  });

  let selectedLabel = $derived(networks.find((n) => n === value) || "");

  function toggle() { if (!loading) open = !open; }
  function close() { open = false; }
  function select(n: string) { value = n; close(); onchange?.(); }
</script>

<svelte:window onclick={close} />

<div>
  {#if label}
    <span class={cn("block", "text-[10px]", "uppercase", "text-muted", "font-semibold", "tracking-wider", "mb-1.5")}>{label}</span>
  {/if}
  <button
    type="button"
    class={cn(
      "w-full", "px-2.5", "py-1.5", "border", "text-xs", "text-left", "rounded-md", "bg-surface", "outline-none",
      "transition-all", "duration-150", "flex", "items-center", "gap-1.5",
      focused ? cn("border-(--accent)", "shadow-[0_0_0_1px_var(--accent)]") : cn("border-border", "hover:border-white/30"),
      className,
    )}
    onclick={toggle}
    onfocus={() => (focused = true)}
    onblur={() => (focused = false)}
  >
    <span class={cn("flex-1", "truncate", "font-mono", value ? "text-fg" : "text-muted")}>
      {loading ? "Loading..." : (selectedLabel || placeholder || "Select network")}
    </span>
    <ChevronDown size={16} class={cn("shrink-0", "text-muted", "transition-transform", open && "rotate-180")} />
  </button>
  {#if open}
    <div class={cn("z-[9999]", "border", "rounded-lg", "bg-surface-2", "border-border", "shadow-lg", "overflow-hidden", "mt-1", "absolute")} style="min-width:200px">
      <div class={cn("overflow-y-auto", "max-h-60")}>
        {#each networks as net}
          <button
            type="button"
            onclick={() => select(net)}
            class={cn("w-full", "px-3", "py-1.5", "text-xs", "text-left", "font-mono", "transition-colors", "cursor-pointer",
              net === value ? "bg-accent/15 text-fg font-semibold" : "hover:bg-white/5 text-fg")}
          >{net}</button>
        {/each}
      </div>
    </div>
  {/if}
</div>
