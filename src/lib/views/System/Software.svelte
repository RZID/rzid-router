<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { Package, AlertTriangle } from "@lucide/svelte";
  import { cn } from "../../helpers/classname";
  import PackageModal from "./Software/PackageModal.svelte";
  import PackageToolbar from "./Software/PackageToolbar.svelte";
  import PackageTable from "./Software/PackageTable.svelte";
  import {
    t,
    getLoading,
    getOperating,
    getIsApk,
    getPkgMgr,
    getTab,
    getTabCounts,
    getFilter,
    getI18nFilter,
    getDiskTotal,
    getDiskUsed,
    getDiskFree,
    getDiskPct,
    getPagedRows,
    getCurrentRows,
    getPageOffset,
    getSortField,
    getSortDir,
    getModalOpen,
    getModalTitleHtml,
    getModalBody,
    getModalActions,
    switchTab,
    goPrevPage,
    goNextPage,
    toggleSort,
    showDetail,
    handleRemoveModal,
    handleUpdateLists,
    handleUpdateAll,
    handleUpload,
    handleConfig,
    handleFilterChange,
    handleReset,
    handleManualInstall,
    handleI18nChange,
    applyDisplay,
    closeModal,
    doMount,
    doDestroy,
  } from "./Software/software-store.svelte";

  const trans = t;

  onMount(doMount);
  onDestroy(doDestroy);
</script>

<div
  class={cn(
    "p-6",
    "flex",
    "flex-col",
    "h-dvh",
    "gap-4",
    "animate-fade-in",
    "overflow-hidden",
  )}
>
  <div class={cn("shrink-0", "space-y-2")}>
    <div class={cn("flex", "items-center", "gap-3")}>
      <div
        class={cn(
          "w-9",
          "h-9",
          "rounded-xl",
          "bg-accent/10",
          "flex",
          "items-center",
          "justify-center",
          "ring-1",
          "ring-accent/20",
          "shrink-0",
        )}
      >
        <Package size={16} class="text-accent" />
      </div>
      <div>
        <h1
          class={cn("text-lg", "font-semibold", "text-white", "tracking-tight")}
        >
          {trans("Software")}
        </h1>
        <p class={cn("text-xs", "text-muted")}>
        {trans(
          "Install additional software and upgrade existing packages with {pkg}.",
        ).replace("{pkg}", getPkgMgr())}
        </p>
      </div>
    </div>

    <div
      class={cn(
        "flex",
        "items-start",
        "gap-2",
        "p-3",
        "rounded-lg",
        "bg-warn/5",
        "border",
        "border-warn/10",
      )}
    >
      <AlertTriangle size={14} class="text-warn shrink-0 mt-0.5" />
      <p class={cn("text-[11px]", "text-warn/80")}>
        {trans(
          "Package operations can break your system. Proceed with caution.",
        )}
      </p>
    </div>
  </div>

  <PackageToolbar
    tab={getTab()}
    tabCounts={getTabCounts()}
    filter={getFilter()}
    i18nFilter={getI18nFilter()}
    operating={getOperating()}
    pkgMgr={getPkgMgr()}
    {trans}
    diskTotal={getDiskTotal()}
    diskUsed={getDiskUsed()}
    diskFree={getDiskFree()}
    diskPct={getDiskPct()}
    onupdate={handleUpdateLists}
    onupdateall={handleUpdateAll}
    onupload={handleUpload}
    onconfig={handleConfig}
    onfilterinput={handleFilterChange}
    onreset={handleReset}
    onmanualinstall={handleManualInstall}
    oni18nchange={handleI18nChange}
  />

  <div
    class={cn(
      "shrink-0",
      "flex",
      "gap-1",
      "w-fit",
      "p-0.5",
      "border",
      "rounded-lg",
      "bg-surface-2",
      "border-border",
      "animate-slide-up",
    )}
  >
      {#each [{ id: "available" as const, label: trans("Available") }, { id: "installed" as const, label: trans("Installed") }, { id: "updates" as const, label: trans("Updates") }] as tb}
      <button
        class={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md font-medium transition-all duration-150 cursor-pointer",
          getTab() === tb.id
            ? "bg-accent text-surface shadow-sm shadow-accent/20"
            : "bg-transparent text-muted hover:text-fg",
        )}
        onclick={() => switchTab(tb.id)}
      >
        {tb.label}
        <span
          class={cn(
            "ml-0.5 text-[10px] px-1.5 py-0.5 rounded font-medium",
            getTab() === tb.id
              ? "bg-white/15 text-surface"
              : "bg-surface-3 text-muted",
          )}
        >
          {tb.id === "updates"
            ? getTabCounts().updates
            : getTabCounts()[tb.id].toLocaleString()}
        </span>
      </button>
    {/each}
  </div>

  <PackageTable
    loading={getLoading()}
    pagedRows={getPagedRows()}
    currentRows={getCurrentRows()}
    pageOffset={getPageOffset()}
    sortField={getSortField()}
    sortDir={getSortDir()}
    operating={getOperating()}
    {trans}
    isApk={getIsApk()}
    filter={getFilter()}
    ongoprev={goPrevPage}
    ongonext={goNextPage}
    onsort={toggleSort}
    onshowdetail={showDetail}
    onremovemodal={handleRemoveModal}
    onreset={handleReset}
  />

  <PackageModal
    open={getModalOpen()}
    titleHtml={getModalTitleHtml()}
    body={typeof getModalBody() === "string" ? getModalBody() : ""}
    actions={getModalActions()}
    onclose={closeModal}
  />
</div>

<style>
  :global(.scrollbar-thin)::-webkit-scrollbar {
    width: 4px;
  }
  :global(.scrollbar-thin)::-webkit-scrollbar-track {
    background: transparent;
  }
  :global(.scrollbar-thin)::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.08);
    border-radius: 4px;
  }
  :global(.scrollbar-thin)::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.12);
  }
</style>
