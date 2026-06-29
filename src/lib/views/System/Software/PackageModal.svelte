<script lang="ts">
  import { XCircle } from "@lucide/svelte";
  import { cn } from "../../../helpers/classname";

  interface Action {
    label: string;
    action: () => void;
    danger?: boolean;
    accent?: boolean;
  }

  let {
    open = false,
    titleHtml = "",
    body = "",
    actions = [] as Action[],
    onclose = () => {},
  }: {
    open?: boolean;
    titleHtml?: string;
    body?: string;
    actions?: Action[];
    onclose?: () => void;
  } = $props();
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class={cn(
      "fixed",
      "inset-0",
      "z-50",
      "flex",
      "items-center",
      "justify-center",
      "p-4",
    )}
    style="background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);"
    onclick={(e: MouseEvent) => {
      if (e.target === e.currentTarget) onclose();
    }}
  >
    <div
      class={cn(
        "glass",
        "p-5",
        "rounded-xl",
        "max-w-lg",
        "w-full",
        "animate-slide-up",
        "max-h-[85vh]",
        "overflow-y-auto",
        "shadow-2xl",
      )}
      onclick={(e: MouseEvent) => e.stopPropagation()}
    >
      <div class={cn("flex", "items-center", "justify-between", "mb-4")}>
        <h3
          class={cn(
            "text-sm",
            "font-semibold",
            "text-white",
            "truncate",
            "flex",
            "items-center",
            "gap-2",
          )}
        >
          {@html titleHtml}
        </h3>
        <button
          onclick={onclose}
          class={cn(
            "p-1.5",
            "rounded-lg",
            "text-muted",
            "hover:text-white",
            "hover:bg-surface-3",
            "transition-all",
            "duration-150",
            "cursor-pointer",
            "shrink-0",
          )}
        >
          <XCircle size={14} />
        </button>
      </div>
      <div>{@html body}</div>
      {#if actions.length > 0}
        <div
          class={cn(
            "flex",
            "items-center",
            "justify-end",
            "gap-2",
            "mt-4",
            "pt-3",
            "border-t",
            "border-border",
          )}
        >
          {#each actions as a}
            <button
              onclick={a.action}
              class={cn(
                "px-3 py-1.5 text-xs rounded-lg font-medium border transition-all duration-150 cursor-pointer active:scale-95",
                a.danger
                  ? "text-danger bg-danger/8 border-danger/15 hover:bg-danger/15 hover:border-danger/25"
                  : a.accent
                    ? "text-accent bg-accent/8 border-accent/15 hover:bg-accent/15 hover:border-accent/25"
                    : "text-muted bg-surface-2 border-border hover:bg-surface-3 hover:text-fg",
              )}
            >
              {a.label}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}
