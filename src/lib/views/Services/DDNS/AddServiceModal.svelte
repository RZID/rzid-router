<script lang="ts">
  import { slide } from "svelte/transition";
  import { X, Plus } from "@lucide/svelte";
  import { cn } from "../../../helpers/classname";
  import Input from "../../../components/Input/Input.svelte";
  import Select from "../../../components/Select/Select.svelte";

  let {
    showAddModal,
    addForm,
    env,
    providerServices,
    addServiceSupported,
    saving,
    trans,
    onClose,
    onAdd,
    onCheckService,
  }: {
    showAddModal: boolean;
    addForm: { name: string; use_ipv6: string; service_name: string };
    env: any;
    providerServices: Record<string, boolean>;
    addServiceSupported: boolean;
    saving: boolean;
    trans: (k: string) => string;
    onClose: () => void;
    onAdd: () => void;
    onCheckService: (svc: string, ipv6: string) => void;
  } = $props();
</script>

{#if showAddModal}
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
      "bg-black/60",
      "backdrop-blur-sm",
    )}
    onclick={onClose}
  >
    <div
      class={cn(
        "glass",
        "p-6",
        "rounded-xl",
        "max-w-md",
        "w-full",
        "mx-4",
        "space-y-5",
        "shadow-2xl",
      )}
      onclick={(e) => e.stopPropagation()}
      transition:slide|local={{ duration: 150 }}
    >
      <div class={cn("flex", "items-center", "justify-between")}>
        <div class={cn("flex", "items-center", "gap-2.5")}>
          <div
            class={cn(
              "w-7",
              "h-7",
              "rounded-lg",
              "bg-accent/10",
              "flex",
              "items-center",
              "justify-center",
            )}
          >
            <Plus size={14} class={cn("text-accent")} />
          </div>
          <h3 class={cn("text-sm", "font-semibold", "text-white")}>
            {trans("Add new service")}
          </h3>
        </div>
        <button
          onclick={onClose}
          class={cn(
            "p-1",
            "rounded-lg",
            "cursor-pointer",
            "hover:bg-white/10",
            "text-muted",
            "transition-colors",
          )}
        >
          <X size={14} />
        </button>
      </div>

      <div class={cn("space-y-4")}>
        <Input
          label={trans("Name")}
          bind:value={addForm.name}
          placeholder={trans("New DDNS Service")}
        />
        <Select
          label={trans("IP address version")}
          options={[
            { value: "0", label: "IPv4-Address" },
            ...(env?.has_ipv6 ? [{ value: "1", label: "IPv6-Address" }] : []),
          ]}
          bind:value={addForm.use_ipv6}
          onchange={() =>
            onCheckService(addForm.service_name, addForm.use_ipv6)}
        />
        <Select
          label={trans("DDNS Service provider")}
          options={[
            { value: "-", label: "📝 custom" },
            ...Object.keys(providerServices)
              .sort()
              .map((k) => ({ value: k, label: k })),
          ]}
          bind:value={addForm.service_name}
          onchange={() =>
            onCheckService(addForm.service_name, addForm.use_ipv6)}
        />
        {#if !addServiceSupported}
          <div
            class={cn(
              "px-3",
              "py-2",
              "rounded-lg",
              "bg-danger/10",
              "border",
              "border-danger/20",
            )}
          >
            <p class={cn("text-xs", "text-danger")}>
              {trans("Service doesn't support this IP type")}
            </p>
          </div>
        {/if}
      </div>

      <div class={cn("flex", "justify-end", "gap-2", "pt-1")}>
        <button
          onclick={onClose}
          class={cn(
            "px-3",
            "py-1.5",
            "text-xs",
            "rounded-lg",
            "cursor-pointer",
            "text-muted",
            "border",
            "border-border",
            "hover:bg-white/5",
            "transition-all",
          )}
        >
          {trans("Cancel")}
        </button>
        <button
          onclick={onAdd}
          disabled={saving || !addForm.name}
          class={cn(
            "px-3",
            "py-1.5",
            "text-xs",
            "rounded-lg",
            "font-medium",
            "cursor-pointer",
            "transition-all",
            "border",
            "text-accent",
            "bg-accent/10",
            "border-accent/20",
            "hover:bg-accent/20",
            "disabled:opacity-30",
          )}
        >
          {saving ? trans("Saving...") : trans("Create service")}
        </button>
      </div>
    </div>
  </div>
{/if}
