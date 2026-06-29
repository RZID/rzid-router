<script lang="ts">
  import { cn } from "../../../helpers/classname";
  import { X } from "@lucide/svelte";

  let {
    trans,
    open = $bindable(false),
    uciDhcp = {} as import("../../../types").UciSection,
    oncreate,
  }: {
    trans: (k: string) => string;
    open: boolean;
    uciDhcp?: import("../../../types").UciSection;
    oncreate?: (name: string) => void;
  } = $props();

  let newName = $state("");
  let newNameError = $state("");

  let reset = () => {
    newName = "";
    newNameError = "";
  };
  let handleCancel = () => {
    open = false;
    reset();
  };
  let handleConfirm = () => {
    if (!newName.trim()) {
      newNameError = trans("Name is required");
      return;
    }
    if (uciDhcp[newName.trim()]) {
      newNameError = trans("Name already exists");
      return;
    }
    oncreate?.(newName.trim());
    open = false;
    reset();
  };
</script>

{#if open}
  <!-- svelte-ignore a11y_interactive_supports_focus -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class={cn(
      "z-50",
      "flex",
      "fixed",
      "pt-24",
      "inset-0",
      "items-start",
      "justify-center",
    )}
    onclick={handleCancel}
    role="dialog"
    aria-modal="true"
  >
    <div
      class={cn("absolute", "inset-0", "bg-black/60", "backdrop-blur-sm")}
    ></div>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      onclick={(e: MouseEvent) => e.stopPropagation()}
      class={cn(
        "p-5",
        "glass",
        "w-full",
        "relative",
        "max-w-sm",
        "rounded-xl",
        "shadow-2xl",
        "animate-fade-in",
      )}
    >
      <div class={cn("flex", "items-center", "justify-between", "mb-4")}>
        <h2 class={cn("text-sm", "font-semibold", "text-white")}>
          {trans("Add static lease")}
        </h2>
        <button
          onclick={handleCancel}
          class={cn(
            "p-1",
            "rounded",
            "text-muted",
            "hover:text-fg",
            "cursor-pointer",
          )}
        >
          <X size={14} />
        </button>
      </div>
      <div class={cn("flex", "flex-col", "gap-1", "mb-3")}>
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label
          class={cn(
            "uppercase",
            "text-muted",
            "text-[10px]",
            "font-semibold",
            "tracking-wider",
          )}
        >
          {trans("Name")}
        </label>
        <input
          type="text"
          bind:value={newName}
          placeholder="myhost"
          class={cn(
            "w-full",
            "px-2.5",
            "py-1.5",
            "border",
            "text-xs",
            "text-fg",
            "font-mono",
            "rounded-lg",
            "outline-none",
            "bg-surface-2",
            "focus:border-accent",
            newNameError ? "border-danger" : "border-border",
          )}
        />
        {#if newNameError}
          <p class={cn("text-[10px]", "text-danger")}>{newNameError}</p>
        {/if}
      </div>
      <div class={cn("flex", "justify-end", "gap-2")}>
        <button
          onclick={handleCancel}
          class={cn(
            "px-3",
            "py-1.5",
            "text-xs",
            "border",
            "rounded-lg",
            "text-muted",
            "bg-surface-2",
            "border-border",
            "cursor-pointer",
          )}
        >
          {trans("Cancel")}
        </button>
        <button
          onclick={handleConfirm}
          class={cn(
            "px-3",
            "py-1.5",
            "text-xs",
            "rounded-lg",
            "bg-accent",
            "text-black",
            "cursor-pointer",
          )}
        >
          {trans("Add")}
        </button>
      </div>
    </div>
  </div>
{/if}
