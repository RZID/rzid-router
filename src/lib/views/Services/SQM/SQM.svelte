<script lang="ts">
  import { onMount } from "svelte";
  import { cn } from "../../../helpers/classname";
  import { Network, AlertTriangle, Play, Square, RefreshCw, Plus, Trash2, Save } from "@lucide/svelte";
  import TabBar from "../../../components/TabBar/TabBar.svelte";
  import BasicTab from "./BasicTab.svelte";
  import QdiscTab from "./QdiscTab.svelte";
  import LinkLayerTab from "./LinkLayerTab.svelte";
  import {
    t,
    getQueues,
    getSelectedIdx,
    setSelectedIdx,
    getSaving,
    getSaveFeedback,
    getServiceInstalled,
    isLoading,
    getActionBusy,
    getViewTab,
    setViewTab,
    load,
    saveSelected,
    addQueue,
    removeSelected,
    handleServiceAction,
    handleToggleService,
  } from "./sqm-store.svelte";

  const tabPages = [
    { id: "basic", label: t("Basic Settings") },
    { id: "qdisc", label: t("Queue Discipline") },
    { id: "linklayer", label: t("Link Layer Adaptation") },
  ];

  let queues = $derived(getQueues());
  let selectedIdx = $derived(getSelectedIdx());
  let saving = $derived(getSaving());
  let saveFeedback = $derived(getSaveFeedback());
  let serviceInstalled = $derived(getServiceInstalled());
  let loading = $derived(isLoading());
  let actionBusy = $derived(getActionBusy());
  let viewTab = $derived(getViewTab());
  let serviceEnabled = $derived(queues.some((q) => q.enabled));

  onMount(load);
</script>

<div class={cn("p-6", "flex", "flex-col", "min-h-0", "animate-fade-in", "gap-4")}>
  <div class={cn("shrink-0", "space-y-2")}>
    <div class={cn("flex", "items-center", "gap-3")}>
      <div class={cn("w-9", "h-9", "rounded-xl", "bg-accent/10", "flex", "items-center", "justify-center", "ring-1", "ring-accent/20", "shrink-0")}>
        <Network size={16} class="text-accent" />
      </div>
      <div>
        <h1 class={cn("text-lg", "font-semibold", "text-white", "tracking-tight")}>{t("SQM QoS")}</h1>
        <p class={cn("text-xs", "text-muted")}>{t("Smart Queue Management — traffic shaping, fair queueing, AQM")}</p>
      </div>
    </div>
    <p class={cn("text-xs", "text-muted/70", "leading-relaxed")}>{t("With SQM you can enable traffic shaping, better mixing (Fair Queueing), active queue length management (AQM) and prioritisation on one network interface.")}</p>
  </div>

  {#if loading}
    <div class={cn("flex", "items-center", "justify-center", "py-12")}>
      <RefreshCw size={20} class="text-muted animate-spin" />
      <span class={cn("ml-2", "text-xs", "text-muted")}>{t("Loading...")}</span>
    </div>
  {:else if !serviceInstalled}
    <div class={cn("p-4", "rounded-lg", "bg-warn/10", "border", "border-warn/20", "space-y-3")}>
      <AlertTriangle size={16} class="text-warn" />
      <p class={cn("text-xs", "text-warn")}>{t("The SQM service is not installed or not available on this system.")}</p>
      <p class={cn("text-xs", "text-muted")}>{t("Install the sqm-scripts package to use SQM QoS.")}</p>
    </div>
  {:else if queues.length === 0}
    <div class={cn("flex", "flex-col", "items-center", "gap-3", "py-12")}>
      <p class={cn("text-xs", "text-muted")}>{t("No SQM queues configured yet")}</p>
      <button onclick={addQueue} class={cn("inline-flex", "items-center", "gap-1.5", "px-3", "py-1.5", "text-xs", "rounded-lg", "font-medium", "bg-accent/10", "text-accent", "border", "border-accent/20", "cursor-pointer", "hover:bg-accent/15", "transition-all")}>
        <Plus size={14} />
        {t("Add queue")}
      </button>
    </div>
  {:else if queues[selectedIdx]}
    {@const q = queues[selectedIdx]}
    <div class={cn("shrink-0", "space-y-3")}>
      <div class={cn("flex", "items-center", "gap-3")}>
        <span class={cn("text-xs", "font-semibold", "text-fg", "uppercase", "tracking-wider")}>{t("Queues")}</span>
        <div class={cn("flex", "items-center", "gap-1")}>
          {#each queues as queue, i}
          <button onclick={() => { setSelectedIdx(i); }}
            class={cn("px-2.5", "py-1", "text-xs", "rounded-md", "font-medium", "transition-all", "cursor-pointer",
              i === selectedIdx ? "bg-accent/15 text-accent border border-accent/30" : "bg-surface-2 text-muted border border-border hover:text-fg")}>
            {queue.interface || t("Unnamed")}
          </button>
        {/each}
      </div>

      <div class={cn("flex", "items-center", "gap-1")}>
        <button onclick={addQueue} class={cn("p-1.5", "rounded-md", "text-muted", "hover:text-accent", "hover:bg-accent/10", "cursor-pointer", "transition-all")} title={t("Add queue")}>
          <Plus size={14} />
        </button>
        {#if queues.length > 0}
          <button onclick={removeSelected} disabled={saving} class={cn("p-1.5", "rounded-md", "text-muted", "hover:text-danger", "hover:bg-danger/10", "cursor-pointer", "transition-all", "disabled:opacity-40")} title={t("Remove")}>
            <Trash2 size={14} />
          </button>
        {/if}
      </div>
    </div>
  </div>

    <div class={cn("shrink-0")}>
      <TabBar tabs={tabPages} active={viewTab} onchange={(id) => setViewTab(id as "basic" | "qdisc" | "linklayer")} />
    </div>

    <div class={cn("flex-1", "overflow-y-auto", "animate-slide-up")}>
      <div class={cn("glass", "p-5", "rounded-xl", "space-y-5")}>
        {#if viewTab === "basic"}
          <BasicTab {q} />
        {:else if viewTab === "qdisc"}
          <QdiscTab {q} />
        {:else if viewTab === "linklayer"}
          <LinkLayerTab {q} />
        {/if}
      </div>
    </div>

    <div class={cn("shrink-0", "flex", "items-center", "justify-between", "flex-wrap", "gap-2")}>
      <div class={cn("flex", "items-center", "gap-2")}>
        {#if saveFeedback}
          <span class={cn("text-xs", saveFeedback === t("Save failed") ? "text-danger" : "text-accent")}>{saveFeedback}</span>
        {/if}
        <button onclick={saveSelected} disabled={saving}
          class={cn("inline-flex", "items-center", "gap-1.5", "px-3", "py-1.5", "text-xs", "rounded-lg", "font-medium",
            "bg-accent/10", "text-accent", "border", "border-accent/20", "cursor-pointer",
            "hover:bg-accent/15", "transition-all", "disabled:opacity-40")}>
          <Save size={14} />
          {saving ? t("Saving...") : t("Save & Apply")}
        </button>
      </div>

      <div class={cn("flex", "items-center", "gap-2")}>
        <span class={cn("text-xs", "text-muted")}>{t("Service")}: {serviceEnabled ? t("Enabled") : t("Disabled")}</span>
        <button onclick={handleToggleService} disabled={actionBusy}
          class={cn("inline-flex", "items-center", "gap-1.5", "px-2.5", "py-1.5", "text-xs", "rounded-lg", "font-medium",
            "bg-surface-2", "text-muted", "border", "border-border", "cursor-pointer",
            "hover:text-fg", "transition-all", "disabled:opacity-40")}>
          {serviceEnabled ? t("Disable") : t("Enable")}
        </button>
        <button onclick={() => handleServiceAction("start")} disabled={actionBusy}
          class={cn("inline-flex", "items-center", "gap-1.5", "px-2.5", "py-1.5", "text-xs", "rounded-lg", "font-medium",
            "bg-accent/10", "text-accent", "border", "border-accent/20", "cursor-pointer",
            "hover:bg-accent/15", "transition-all", "disabled:opacity-40")}>
          <Play size={12} />
          {t("Start")}
        </button>
        <button onclick={() => handleServiceAction("stop")} disabled={actionBusy}
          class={cn("inline-flex", "items-center", "gap-1.5", "px-2.5", "py-1.5", "text-xs", "rounded-lg", "font-medium",
            "bg-danger/10", "text-danger", "border", "border-danger/20", "cursor-pointer",
            "hover:bg-danger/15", "transition-all", "disabled:opacity-40")}>
          <Square size={12} />
          {t("Stop")}
        </button>
        <button onclick={() => handleServiceAction("restart")} disabled={actionBusy}
          class={cn("inline-flex", "items-center", "gap-1.5", "px-2.5", "py-1.5", "text-xs", "rounded-lg", "font-medium",
            "bg-warn/10", "text-warn", "border", "border-warn/20", "cursor-pointer",
            "hover:bg-warn/15", "transition-all", "disabled:opacity-40")}>
          <RefreshCw size={12} />
          {t("Restart")}
        </button>
      </div>
    </div>
  {/if}
</div>
