<script lang="ts">
  import { cn } from "../../../helpers/classname";
  import { Save } from "@lucide/svelte";
  import Input from "../../../components/Input/Input.svelte";

  let {
    trans,
    editingRelay = $bindable<string | null>(null),
    relayForm = $bindable<Record<string, string>>({}),
    onsave,
  }: {
    trans: (k: string) => string;
    editingRelay: string | null;
    relayForm: Record<string, string>;
    onsave?: () => void;
  } = $props();

  let close = () => {
    editingRelay = null;
  };
</script>

{#if editingRelay}
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
    onclick={close}
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
        "max-w-md",
        "shadow-2xl",
        "rounded-xl",
        "animate-fade-in",
      )}
    >
      <h2 class={cn("text-sm", "font-semibold", "text-white", "mb-4")}>
        {trans("Edit relay entry")}
      </h2>
      <div class={cn("space-y-4")}>
        <Input
          placeholder="192.168.1.1"
          label={trans("Relay from")}
          bind:value={relayForm.local_addr}
        />
        <Input
          placeholder="192.168.10.1#535"
          label={trans("Relay to address")}
          bind:value={relayForm.server_addr}
        />
        <Input
          placeholder="lan"
          bind:value={relayForm.interface}
          label={trans("Only accept replies via")}
        />
      </div>
      <div class={cn("flex", "justify-end", "gap-2", "mt-4")}>
        <button
          onclick={close}
          class={cn(
            "px-3",
            "py-1.5",
            "border",
            "text-xs",
            "rounded-lg",
            "text-muted",
            "bg-surface-2",
            "cursor-pointer",
            "border-border",
          )}
        >
          {trans("Cancel")}
        </button>
        <button
          onclick={onsave}
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
          <Save size={12} />{trans("Save")}
        </button>
      </div>
    </div>
  </div>
{/if}
