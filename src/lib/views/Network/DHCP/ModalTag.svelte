<script lang="ts">
  import { cn } from "../../../helpers/classname";
  import { Save } from "@lucide/svelte";
  import Input from "../../../components/Input/Input.svelte";
  import Toggle from "../../../components/Toggle/Toggle.svelte";

  let {
    trans,
    editingTag = $bindable<{ section: string; type: string } | null>(null),
    tagForm = $bindable<Record<string, any>>({}),
    onsave,
  }: {
    trans: (k: string) => string;
    editingTag: { section: string; type: string } | null;
    tagForm: Record<string, any>;
    onsave?: () => void;
  } = $props();

  let close = () => {
    editingTag = null;
  };
</script>

{#if editingTag}
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
        {editingTag.type === "tag"
          ? trans("Edit tag")
          : editingTag.type === "match"
            ? trans("Edit Match")
            : editingTag.type === "vendorclass"
              ? trans("Edit VC")
              : trans("Edit UC")}
      </h2>
      <div class={cn("space-y-4")}>
        {#if editingTag.type === "tag"}
          <Input
            label={trans("Name")}
            bind:value={tagForm.name}
            placeholder={trans("tag name")}
          />
        {:else if editingTag.type === "match"}
          <Input
            label={trans("Match this client option(+value)")}
            bind:value={tagForm.match}
            placeholder="61,8c:80:90:01:02:03"
          />
          <Input
            label={trans("In order to Set this Tag")}
            bind:value={tagForm.networkid}
          />
        {:else if editingTag.type === "vendorclass"}
          <Input
            label={trans("Match this Vendor Class")}
            bind:value={tagForm.vendorclass}
          />
          <Input
            label={trans("In order to set this Tag")}
            bind:value={tagForm.networkid}
          />
        {:else if editingTag.type === "userclass"}
          <Input
            label={trans("Match this User Class")}
            bind:value={tagForm.userclass}
          />
          <Input
            label={trans("In order to set this Tag")}
            bind:value={tagForm.networkid}
          />
        {/if}
        {#if editingTag.type !== "tag"}
          <Input
            placeholder="3,192.168.10.1"
            label={trans("DHCP Options")}
            bind:value={tagForm.dhcp_option}
            description={trans("Options to be added for this tag.")}
          />
          <Toggle label={trans("Force")} bind:checked={tagForm.force} />
        {/if}
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
