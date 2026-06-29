<script lang="ts">
  import { cn } from "../../../helpers/classname";
  import { Save } from "@lucide/svelte";
  import Input from "../../../components/Input/Input.svelte";
  import Toggle from "../../../components/Toggle/Toggle.svelte";

  let {
    trans,
    editingBoot = $bindable<string | null>(null),
    bootForm = $bindable<Record<string, any>>({}),
    onsave,
  }: {
    trans: (k: string) => string;
    editingBoot: string | null;
    bootForm: Record<string, any>;
    onsave?: () => void;
  } = $props();

  let close = () => {
    editingBoot = null;
  };
</script>

{#if editingBoot}
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
        "rounded-xl",
        "shadow-2xl",
        "animate-fade-in",
      )}
    >
      <h2 class={cn("text-sm", "font-semibold", "text-white", "mb-4")}>
        {trans("Edit PXE/TFTP/BOOTP Host")}
      </h2>
      <div class={cn("space-y-4")}>
        <Input
          placeholder="pxelinux.0"
          label={trans("Filename")}
          bind:value={bootForm.filename}
        />
        <Input
          placeholder="myNAS"
          label={trans("Server name")}
          bind:value={bootForm.servername}
        />
        <Input
          placeholder="192.168.1.2"
          label={trans("Server address")}
          bind:value={bootForm.serveraddress}
        />
        <Input
          label={trans("DHCP Options")}
          bind:value={bootForm.dhcp_option}
          placeholder="option:root-path,192.168.1.2:/data"
          description={trans("Additional options to send.")}
        />
        <Input
          label={trans("Match this Tag")}
          bind:value={bootForm.networkid}
        />
        <Toggle label={trans("Force")} bind:checked={bootForm.force} />
        <Input label={trans("Instance")} bind:value={bootForm.instance} />
      </div>
      <div class={cn("flex", "justify-end", "gap-2", "mt-4")}>
        <button
          onclick={close}
          class={cn(
            "px-3",
            "py-1.5",
            "border",
            "text-xs",
            "text-muted",
            "rounded-lg",
            "bg-surface-2",
            "border-border",
            "cursor-pointer",
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
