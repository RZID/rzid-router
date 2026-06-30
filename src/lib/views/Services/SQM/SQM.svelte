<script lang="ts">
  import { onMount } from "svelte";
  import { cn } from "../../../helpers/classname";
  import { Plus, Save, RefreshCw } from "@lucide/svelte";
  import TabBar from "../../../components/TabBar/TabBar.svelte";
  import BasicTab from "./BasicTab.svelte";
  import QdiscTab from "./QdiscTab.svelte";
  import LinkLayerTab from "./LinkLayerTab.svelte";
  import {
    t,
    getQueues,
    getQueueTabs,
    getSaving,
    getSaveFeedback,
    getServiceInstalled,
    isLoading,
    load,
    saveAll,
    addQueue,
    removeQueue,
  } from "./sqm-store.svelte";

  const tabPages = [
    { id: "basic", label: t("Basic Settings") },
    { id: "qdisc", label: t("Queue Discipline") },
    { id: "linklayer", label: t("Link Layer Adaptation") },
  ];

  let queues = $derived(getQueues());
  let queueTabs = $derived(getQueueTabs());
  let saving = $derived(getSaving());
  let saveFeedback = $derived(getSaveFeedback());
  let serviceInstalled = $derived(getServiceInstalled());
  let loading = $derived(isLoading());

  onMount(load);

  function setQueueTab(i: number, id: string) {
    queueTabs[i] = id as "basic" | "qdisc" | "linklayer";
  }
</script>

<div class={cn("p-6", "flex", "flex-col", "animate-fade-in", "gap-4")}>
  <h1 class={cn("text-lg", "font-semibold", "text-white", "tracking-tight")}>{t("Smart Queue Management")}</h1>
  <p class={cn("text-sm", "text-muted/70")}>{t("With SQM you can enable traffic shaping, better mixing (Fair Queueing), active queue length management (AQM) and prioritisation on one network interface.")}</p>

  {#if loading}
    <div class={cn("flex", "items-center", "gap-2", "py-4")}>
      <RefreshCw size={16} class="text-muted animate-spin" />
      <span class={cn("text-sm", "text-muted")}>{t("Loading...")}</span>
    </div>
  {:else if !serviceInstalled}
    <div class={cn("p-4", "rounded-lg", "bg-warn/10", "border", "border-warn/20")}>
      <p class={cn("text-sm", "text-warn")}>{t("The SQM service seems to be disabled. Please use the button below to activate this service.")}</p>
    </div>
  {:else if queues.length === 0}
    <div class={cn("flex", "flex-col", "items-center", "gap-3", "py-8")}>
      <p class={cn("text-sm", "text-muted")}>{t("No SQM queues configured yet")}</p>
      <button onclick={addQueue} class={cn("px-3", "py-1.5", "text-sm", "rounded-lg", "font-medium", "bg-accent/10", "text-accent", "border", "border-accent/20", "cursor-pointer", "hover:bg-accent/15", "transition-all")}>
        {t("Add")}
      </button>
    </div>
  {:else}
    <span class={cn("font-semibold", "text-fg")}>{t("Queues")}</span>
    {#each queues as q, i}
      <div class={cn("space-y-3")}>
        <div class={cn("flex", "items-center", "justify-between")}>
          <span></span>
          <button onclick={() => removeQueue(i)} disabled={saving}
            class={cn("text-sm", "text-danger", "cursor-pointer", "hover:underline", "disabled:opacity-40")}>
            {t("Delete")}
          </button>
        </div>
        <TabBar tabs={tabPages} active={queueTabs[i] ?? "basic"} onchange={(id) => setQueueTab(i, id)} />
        {#if (queueTabs[i] ?? "basic") === "basic"}
          <BasicTab {q} />
        {:else if (queueTabs[i] ?? "basic") === "qdisc"}
          <QdiscTab {q} />
        {:else if (queueTabs[i] ?? "basic") === "linklayer"}
          <LinkLayerTab {q} />
        {/if}
      </div>
    {/each}

    <div class={cn("flex", "items-center", "gap-2")}>
      <button onclick={addQueue}
        class={cn("px-3", "py-1.5", "text-sm", "rounded-lg", "font-medium", "bg-accent/10", "text-accent", "border", "border-accent/20", "cursor-pointer", "hover:bg-accent/15", "transition-all")}>
        {t("Add")}
      </button>
      <div class={cn("flex-1")}></div>
      {#if saveFeedback}
        <span class={cn("text-sm", saveFeedback === t("Save failed") ? "text-danger" : "text-accent")}>{saveFeedback}</span>
      {/if}
      <button onclick={saveAll} disabled={saving}
        class={cn("px-3", "py-1.5", "text-sm", "rounded-lg", "font-medium", "bg-accent/10", "text-accent", "border", "border-accent/20", "cursor-pointer", "hover:bg-accent/15", "transition-all", "disabled:opacity-40")}>
        <Save size={14} class="inline" />
        {saving ? t("Saving...") : t("Save & Apply")}
      </button>
    </div>
  {/if}
</div>
