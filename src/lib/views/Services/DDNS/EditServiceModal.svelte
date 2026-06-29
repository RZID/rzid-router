<script lang="ts">
  import { slide } from "svelte/transition";
  import { X, FileText } from "@lucide/svelte";
  import { cn } from "../../../helpers/classname";
  import EditBasicTab from "./EditBasicTab.svelte";
  import EditAdvancedTab from "./EditAdvancedTab.svelte";
  import EditTimerTab from "./EditTimerTab.svelte";
  import EditLogViewTab from "./EditLogViewTab.svelte";

  let {
    editSectionId,
    editForm,
    editTab,
    env,
    providerServices,
    originalServiceName,
    originalUseIpv6,
    serviceAvailable,
    serviceSupported,
    serviceUpdateUrl,
    editValidationErrors,
    saving,
    logContent,
    trans,
    onClose,
    onSave,
    onCheckService,
    onInstallService,
    onSwitchService,
    onReadLog,
    onSetEditTab,
  }: {
    editSectionId: string | null;
    editForm: any;
    editTab: string;
    env: any;
    providerServices: Record<string, boolean>;
    originalServiceName: string;
    originalUseIpv6: string;
    serviceAvailable: boolean;
    serviceSupported: boolean;
    serviceUpdateUrl: string | null;
    editValidationErrors: string[];
    saving: boolean;
    logContent: string;
    trans: (k: string) => string;
    onClose: () => void;
    onSave: () => void;
    onCheckService: (svc: string, ipv6: string) => void;
    onInstallService: (svc: string) => void;
    onSwitchService: () => void;
    onReadLog: () => void;
    onSetEditTab: (tab: string) => void;
  } = $props();
</script>

{#if editSectionId}
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
        "max-w-2xl",
        "w-full",
        "mx-4",
        "max-h-[85vh]",
        "overflow-y-auto",
        "space-y-5",
        "shadow-2xl",
      )}
      onclick={(e) => e.stopPropagation()}
      transition:slide|local={{ duration: 150 }}
    >
      <div class={cn("flex", "items-center", "justify-between", "shrink-0")}>
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
            <FileText size={14} class={cn("text-accent")} />
          </div>
          <h3 class={cn("text-sm", "font-semibold", "text-white")}>
            {trans("DDNS Service")} <span class={cn("text-muted")}>»</span>
            <span class={cn("font-mono")}>{editSectionId}</span>
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

      <div
        class={cn(
          "flex",
          "gap-1",
          "p-0.5",
          "w-fit",
          "border",
          "rounded-lg",
          "bg-surface-2",
          "border-border",
          "shrink-0",
        )}
      >
        {#each [{ id: "basic", label: trans("Basic Settings") }, { id: "advanced", label: trans("Advanced Settings") }, { id: "timer", label: trans("Timer Settings") }, { id: "logview", label: trans("Log File Viewer") }] as t}
          <button
            class={cn(
              "px-2.5",
              "py-1",
              "text-[10px]",
              "rounded-md",
              "font-medium",
              "transition-all",
              "cursor-pointer",
            )}
            style="background:{editTab === t.id
              ? 'var(--accent)'
              : 'transparent'};color:{editTab === t.id
              ? '#0d1117'
              : 'var(--text-muted)'}"
            onclick={() => onSetEditTab(t.id)}
          >
            {t.label}
          </button>
        {/each}
      </div>

      {#key editTab}
        {#if editTab === "basic"}
          <EditBasicTab
            {editForm}
            {env}
            {providerServices}
            {originalServiceName}
            {originalUseIpv6}
            {serviceAvailable}
            {serviceSupported}
            {serviceUpdateUrl}
            {editValidationErrors}
            {saving}
            {trans}
            {onCheckService}
            {onInstallService}
            {onSwitchService}
          />
        {:else if editTab === "advanced"}
          <EditAdvancedTab {editForm} {env} {trans} />
        {:else if editTab === "timer"}
          <EditTimerTab {editForm} {trans} />
        {:else if editTab === "logview"}
          <EditLogViewTab {logContent} {trans} {onReadLog} />
        {/if}
      {/key}

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
          onclick={onSave}
          disabled={saving}
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
          {saving ? trans("Saving...") : trans("Save")}
        </button>
      </div>
    </div>
  </div>
{/if}
