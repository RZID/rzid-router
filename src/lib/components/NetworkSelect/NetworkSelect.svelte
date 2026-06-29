<script lang="ts">
  // Deps
  import { onMount } from "svelte";
  import { ChevronDown } from "@lucide/svelte";

  // Helpers
  import { cn } from "../../helpers/classname";

  // APIs
  import { getNetworkInterfaces } from "../../api/ubus";
  import type { Props } from "./types";

  let {
    label = "",
    value = $bindable(""),
    placeholder = "",
    class: className = "",
    onchange,
  }: Props = $props();

  // States
  let networks = $state<string[]>([]),
    loading = $state(true),
    open = $state(false),
    focused = $state(false);

  // Hooks
  onMount(async () => {
    const dump = await getNetworkInterfaces();
    if (dump?.interface) {
      networks = (dump.interface as any[])
        .map((i: any) => i.interface)
        .filter(Boolean)
        .sort();
    }
    loading = false;
  });

  // Derives
  let selectedLabel = $derived(networks.find((n) => n === value) || "");

  // Methods
  const toggle = () => {
      if (!loading) open = !open;
    },
    close = () => {
      open = false;
    },
    select = (n: string) => {
      value = n;
      close();
      onchange?.();
    };
</script>

<svelte:window onclick={close} />

<div>
  {#if label}
    <span
      class={cn(
        "block",
        "mb-1.5",
        "uppercase",
        "text-muted",
        "text-[10px]",
        "font-semibold",
        "tracking-wider",
      )}
    >
      {label}
    </span>
  {/if}
  <button
    type="button"
    class={cn(
      "flex",
      "w-full",
      "px-2.5",
      "py-1.5",
      "border",
      "gap-1.5",
      "text-xs",
      "text-left",
      "rounded-md",
      "bg-surface",
      "outline-none",
      "duration-150",
      "items-center",
      "transition-all",
      focused
        ? cn("border-(--accent)", "shadow-[0_0_0_1px_var(--accent)]")
        : cn("border-border", "hover:border-white/30"),
      className,
    )}
    onclick={toggle}
    onfocus={() => (focused = true)}
    onblur={() => (focused = false)}
  >
    <span
      class={cn(
        "flex-1",
        "truncate",
        "font-mono",
        value ? "text-fg" : "text-muted",
      )}
    >
      {loading
        ? "Loading..."
        : selectedLabel || placeholder || "Select network"}
    </span>
    <ChevronDown
      size={16}
      class={cn(
        "shrink-0",
        "text-muted",
        "transition-transform",
        open && "rotate-180",
      )}
    />
  </button>
  {#if open}
    <div
      class={cn(
        "mt-1",
        "z-9999",
        "border",
        "absolute",
        "min-w-50",
        "shadow-lg",
        "rounded-lg",
        "bg-surface-2",
        "border-border",
        "overflow-hidden",
      )}
    >
      <div class={cn("overflow-y-auto", "max-h-60")}>
        {#each networks as net}
          <button
            type="button"
            onclick={() => select(net)}
            class={cn(
              "px-3",
              "w-full",
              "py-1.5",
              "text-xs",
              "text-left",
              "font-mono",
              "cursor-pointer",
              "transition-colors",
              net === value
                ? cn("bg-accent/15", "text-fg", "font-semibold")
                : cn("hover:bg-white/5", "text-fg"),
            )}
          >
            {net}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>
