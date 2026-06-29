<script lang="ts">
  import { Network as NetworkIcon, ChevronDown } from "@lucide/svelte";
  import { cn } from "../../../helpers/classname";
  import Input from "../../../components/Input/Input.svelte";

  let {
    value,
    placeholder,
    hasV6,
    running,
    onrun,
  }: {
    value: string;
    placeholder: string;
    hasV6: boolean;
    running: boolean;
    onrun: (v6: boolean) => void;
  } = $props();

  let showMenu = $state(false);
</script>

<div class={cn("flex", "items-center", "gap-3", "mb-3")}>
  <div class={cn("flex-1")}>
    <Input bind:value {placeholder} />
  </div>
  <div class={cn("flex", "items-center", "gap-1")}>
    <button
      onclick={() => onrun(false)}
      disabled={running}
      class={cn(
        "flex",
        "items-center",
        "gap-1.5",
        "px-4",
        "py-2",
        "text-sm",
        "font-medium",
        "transition-all",
        "duration-150",
        "bg-accent",
        "text-white",
        "hover:brightness-110",
        "active:brightness-90",
        "disabled:opacity-50",
        "disabled:cursor-not-allowed",
        !hasV6 ? "rounded-lg" : "rounded-r-none",
        running ? "rounded-lg" : "",
      )}
    >
      <NetworkIcon size={14} />
      {running ? "Running..." : "Traceroute"}
    </button>
    {#if hasV6}
      <div class={cn("relative")}>
        <button
          onclick={() => {
            showMenu = !showMenu;
          }}
          disabled={running}
          class={cn(
            "flex",
            "items-center",
            "px-2",
            "py-2",
            "rounded-r-lg",
            "text-sm",
            "font-medium",
            "transition-all",
            "duration-150",
            "bg-accent",
            "text-white",
            "hover:brightness-110",
            "active:brightness-90",
            "border-l",
            "border-white/20",
            "disabled:opacity-50",
            "disabled:cursor-not-allowed",
          )}
        >
          <ChevronDown size={14} />
        </button>
        {#if showMenu}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class={cn(
              "absolute",
              "right-0",
              "top-full",
              "mt-1",
              "z-50",
              "bg-surface",
              "border",
              "border-border",
              "rounded-lg",
              "shadow-xl",
              "py-1",
              "min-w-42.5",
            )}
            onclick={() => {
              showMenu = false;
            }}
            onmouseleave={() => {
              showMenu = false;
            }}
          >
            <button
              onclick={() => onrun(false)}
              class={cn(
                "w-full",
                "text-left",
                "px-4",
                "py-2",
                "text-sm",
                "text-text",
                "hover:bg-border",
                "transition-colors",
              )}
            >
              IPv4 Traceroute
            </button>
            <button
              onclick={() => onrun(true)}
              class={cn(
                "w-full",
                "text-left",
                "px-4",
                "py-2",
                "text-sm",
                "text-text",
                "hover:bg-border",
                "transition-colors",
              )}
            >
              IPv6 Traceroute
            </button>
          </div>
        {/if}
      </div>
    {/if}
  </div>
  <NetworkIcon size={16} class={cn("text-text-muted", "shrink-0")} />
</div>
