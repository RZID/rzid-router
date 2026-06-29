<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { ddnsStopService, ddnsReloadService } from "../../../api/ubus";
  import { cn } from "../../../helpers/classname";
  import InfoTab from "./InfoTab.svelte";
  import GlobalSettingsTab from "./GlobalSettingsTab.svelte";
  import ServicesTable from "./ServicesTable.svelte";
  import AddServiceModal from "./AddServiceModal.svelte";
  import EditServiceModal from "./EditServiceModal.svelte";
  import {
    store,
    trans,
    load,
    pollStatus,
    handleToggleDdns,
    handleRestartDdns,
    handleRefreshServicesList,
    handleCheckService,
    checkServiceData,
    handleAddService,
    openEdit,
    handleSwitchService,
    handleSaveService,
    handleDeleteService,
    handleInstallService,
    handleReadLog,
    handleToggleService,
    handleReorder,
    handleSaveGlobal,
  } from "./ddns-store.svelte.ts";

  let tab = $state<"info" | "global">("info");
  let showAddModal = $state(false);
  let editSectionId = $state<string | null>(null);
  let editTab = $state<"basic" | "advanced" | "timer" | "logview">("basic");
  let pollInterv: ReturnType<typeof setInterval>;

  onMount(() => {
    load();
    pollInterv = setInterval(pollStatus, 5000);
  });
  onDestroy(() => clearInterval(pollInterv));
</script>

<div
  class={cn("p-6", "flex", "flex-col", "min-h-0", "animate-fade-in", "gap-5")}
>
  <div
    class={cn("shrink-0", "flex", "items-start", "justify-between", "gap-4")}
  >
    <div>
      <h1 class={cn("text-lg", "font-semibold", "text-white")}>
        {trans("Dynamic DNS")}
      </h1>
      <p class={cn("text-sm", "mt-0.5", "text-muted")}>
        {trans("DDNS service configuration")}
      </p>
    </div>
    {#if store.saveFeedback}
      <span
        class={cn(
          "shrink-0",
          "mt-1",
          "px-2",
          "py-0.5",
          "text-[10px]",
          "rounded",
          "font-medium",
          "font-mono",
          store.saveFeedback === "Saved"
            ? "bg-accent/10 text-accent"
            : "bg-danger/10 text-danger",
        )}
      >
        {store.saveFeedback}
      </span>
    {/if}
  </div>

  <div
    class={cn(
      "flex",
      "gap-1",
      "p-0.5",
      "w-fit",
      "shrink-0",
      "border",
      "rounded-lg",
      "bg-surface-2",
      "border-border",
    )}
  >
    {#each [{ id: "info" as const, label: trans("Information") }, { id: "global" as const, label: trans("Global Settings") }] as t}
      <button
        class={cn(
          "px-3",
          "py-1.5",
          "text-xs",
          "rounded-md",
          "font-medium",
          "transition-all",
          "cursor-pointer",
        )}
        style="background:{tab === t.id
          ? 'var(--accent)'
          : 'transparent'};color:{tab === t.id
          ? '#0d1117'
          : 'var(--text-muted)'}"
        onclick={() => (tab = t.id)}
      >
        {t.label}
      </button>
    {/each}
  </div>

  {#if tab === "info"}
    <InfoTab
      status={store.status}
      env={store.env}
      {trans}
      onToggleDdns={handleToggleDdns}
      onRestartDdns={handleRestartDdns}
      onRefreshServicesList={handleRefreshServicesList}
    />
  {:else if tab === "global"}
    <GlobalSettingsTab
      g={store.g}
      env={store.env}
      status={store.status}
      saving={store.saving}
      {trans}
      onSaveGlobal={handleSaveGlobal}
    />
  {/if}

  <ServicesTable
    serviceSections={store.serviceSections}
    servicesStatus={store.servicesStatus}
    uciConfig={store.uciConfig}
    status={store.status}
    {trans}
    onAdd={() => {
      showAddModal = true;
      store.addForm.name = "";
      store.addForm.use_ipv6 = "0";
      store.addForm.service_name = "-";
    }}
    onEdit={(id: string) => {
      editSectionId = id;
      editTab = "basic";
      openEdit(id);
    }}
    onDelete={(id: string) => handleDeleteService(id)}
    onToggle={(id: string, enabled: boolean) =>
      handleToggleService(id, enabled)}
    onStop={async (id: string) => {
      await ddnsStopService(id);
      await load();
    }}
    onReload={async (id: string) => {
      await ddnsReloadService(id);
      await load();
    }}
    onReorder={(dragId, targetId, sections, idx) =>
      handleReorder(dragId, targetId, sections, idx)}
  />
</div>

<AddServiceModal
  {showAddModal}
  addForm={store.addForm}
  env={store.env}
  providerServices={store.providerServices}
  addServiceSupported={store.addServiceSupported}
  saving={store.saving}
  {trans}
  onClose={() => (showAddModal = false)}
  onAdd={handleAddService}
  onCheckService={handleCheckService}
/>

<EditServiceModal
  {editSectionId}
  editForm={store.editForm}
  {editTab}
  env={store.env}
  providerServices={store.providerServices}
  originalServiceName={store.originalServiceName}
  originalUseIpv6={store.originalUseIpv6}
  serviceAvailable={store.serviceAvailable}
  serviceSupported={store.serviceSupported}
  serviceUpdateUrl={store.serviceUpdateUrl}
  editValidationErrors={store.editValidationErrors}
  saving={store.saving}
  logContent={store.logContent}
  {trans}
  onClose={() => {
    editSectionId = null;
    store.editValidationErrors.length = 0;
  }}
  onSave={() => editSectionId && handleSaveService(editSectionId)}
  onCheckService={checkServiceData}
  onInstallService={handleInstallService}
  onSwitchService={() => editSectionId && handleSwitchService(editSectionId)}
  onReadLog={() => editSectionId && handleReadLog(editSectionId)}
  onSetEditTab={(t: string) => (editTab = t as any)}
/>

<style>
  :global(.animate-slide-up) {
    animation: slideUp 0.3s ease-out;
  }
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  :global(.animate-fade-in) {
    animation: fadeIn 0.2s ease-out;
  }
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  :global(.animate-slide-left) {
    animation: slideLeft 0.2s ease-out;
  }
  @keyframes slideLeft {
    from {
      opacity: 0;
      transform: translateX(12px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  :global(.animate-slide-right) {
    animation: slideRight 0.2s ease-out;
  }
  @keyframes slideRight {
    from {
      opacity: 0;
      transform: translateX(-12px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
</style>
