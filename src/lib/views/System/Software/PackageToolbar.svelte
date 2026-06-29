<script lang="ts">
  import {
    Search,
    Globe,
    RefreshCw,
    Upload,
    Settings,
    HardDrive,
  } from "@lucide/svelte";
  import { cn } from "../../../helpers/classname";
  import { fmtBytes } from "../../../helpers/format";

  let {
    tab,
    tabCounts,
    filter,
    i18nFilter,
    operating,
    pkgMgr,
    trans,
    diskTotal = 0,
    diskUsed = 0,
    diskFree = 0,
    diskPct = 0,
    onupdate,
    onupdateall,
    onupload,
    onconfig,
    onfilterinput,
    onreset,
    onmanualinstall,
    oni18nchange,
  }: {
    tab: "available" | "installed" | "updates";
    tabCounts: { available: number; installed: number; updates: number };
    filter: string;
    i18nFilter: "lang" | "all" | "none";
    operating: boolean;
    pkgMgr: string;
    trans: (k: string) => string;
    diskTotal?: number;
    diskUsed?: number;
    diskFree?: number;
    diskPct?: number;
    onupdate?: () => void;
    onupdateall?: () => void;
    onupload?: () => void;
    onconfig?: () => void;
    onfilterinput?: (value: string) => void;
    onreset?: () => void;
    onmanualinstall?: () => void;
    oni18nchange?: (value: "lang" | "all" | "none") => void;
  } = $props();
</script>

<div class={cn("shrink-0", "glass", "p-4", "rounded-xl", "space-y-3")}>
  <!-- Row 1: Disk + Actions -->
  <div class={cn("flex", "flex-wrap", "items-center", "gap-4")}>
    <div class={cn("flex", "items-center", "gap-3", "flex-1", "min-w-48")}>
      <div
        class={cn(
          "w-8",
          "h-8",
          "rounded-lg",
          "bg-surface-3",
          "flex",
          "items-center",
          "justify-center",
          "shrink-0",
        )}
      >
        <HardDrive size={14} class="text-muted" />
      </div>
      <div class={cn("flex-1", "min-w-0")}>
        <div class={cn("flex", "items-center", "justify-between", "mb-1")}>
          <span
            class={cn(
              "text-[10px]",
              "font-medium",
              "text-muted",
              "uppercase",
              "tracking-wider",
            )}>{trans("Disk space")}</span
          >
          <span class={cn("text-[10px]", "font-mono", "text-muted")}
            >{fmtBytes(diskUsed)} / {fmtBytes(diskTotal)}</span
          >
        </div>
        <div
          class={cn(
            "h-2",
            "rounded-full",
            "bg-surface-3",
            "overflow-hidden",
            "ring-1",
            "ring-inset",
            "ring-white/5",
          )}
          title={`${fmtBytes(diskUsed)} used (${diskPct}%), ${fmtBytes(diskFree)} free`}
        >
          <div
            class={cn(
              "h-full",
              "rounded-full",
              "transition-all",
              "duration-1000",
              "ease-out",
              "relative",
              "overflow-hidden",
            )}
            style="width: {diskPct}%; background: {diskPct > 80
              ? 'var(--danger)'
              : diskPct > 60
                ? 'var(--warn)'
                : 'var(--accent)'}"
          >
            <div
              class={cn(
                "absolute",
                "inset-0",
                "bg-linear-to-r",
                "from-transparent",
                "via-white/15",
                "to-transparent",
                "animate-shimmer",
              )}
            ></div>
          </div>
        </div>
      </div>
    </div>

    <div class={cn("flex", "items-center", "gap-1.5")}>
      <button
        onclick={onupdate}
        disabled={operating}
        class={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium border transition-all duration-150 cursor-pointer active:scale-95",
          "text-accent bg-accent/8 border-accent/15 hover:bg-accent/15 hover:border-accent/25 disabled:opacity-40 disabled:cursor-not-allowed",
        )}
      >
        <RefreshCw size={12} />
        {trans("Update lists…")}
      </button>
      {#if tab === "updates" && tabCounts.updates > 0}
        <button
          onclick={onupdateall}
          disabled={operating}
          class={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium border transition-all duration-150 cursor-pointer active:scale-95",
            "text-accent bg-accent/8 border-accent/15 hover:bg-accent/15 hover:border-accent/25 disabled:opacity-40 disabled:cursor-not-allowed",
          )}
        >
          <RefreshCw size={12} />
          {trans("Upgrade All ({n})").replace("{n}", String(tabCounts.updates))}
        </button>
      {/if}
      <button
        onclick={onupload}
        disabled={operating}
        class={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium border transition-all duration-150 cursor-pointer active:scale-95",
          "text-accent bg-accent/8 border-accent/15 hover:bg-accent/15 hover:border-accent/25 disabled:opacity-40 disabled:cursor-not-allowed",
        )}
      >
        <Upload size={12} />
        {trans("Upload Package…")}
      </button>
      <button
        onclick={onconfig}
        disabled={operating}
        class={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium border border-border transition-all duration-150 cursor-pointer active:scale-95",
          "text-muted bg-surface-2 hover:bg-surface-3 hover:text-fg disabled:opacity-40 disabled:cursor-not-allowed",
        )}
      >
        <Settings size={12} />
        {trans("Configure {mgr}").replace("{mgr}", pkgMgr)}
      </button>
    </div>
  </div>

  <!-- Row 2: Filter + Install -->
  <div class={cn("flex", "flex-wrap", "items-end", "gap-3")}>
    <div class={cn("flex-1", "min-w-40")}>
      <!-- svelte-ignore a11y_label_has_associated_control -->
      <label
        class={cn(
          "block",
          "text-[10px]",
          "uppercase",
          "text-muted",
          "font-semibold",
          "tracking-wider",
          "mb-1.5",
        )}
      >
        {trans("Filter")}
      </label>
      <div class={cn("flex", "gap-1.5")}>
        <div class={cn("relative", "flex-1")}>
          <Search
            size={12}
            class={cn(
              "absolute",
              "left-2.5",
              "top-1/2",
              "-translate-y-1/2",
              "text-muted",
              "pointer-events-none",
            )}
          />
          <input
            type="text"
            value={filter}
            oninput={(e) =>
              onfilterinput?.((e.target as HTMLInputElement).value)}
            placeholder={trans("Type to filter…")}
            class={cn(
              "w-full pl-7 pr-2 py-1.5 border text-xs rounded-lg",
              "bg-surface outline-none transition-all duration-150",
              "border-border text-fg placeholder:text-muted/50",
              "focus:border-(--accent) focus:shadow-[0_0_0_1px_var(--accent)]",
            )}
          />
        </div>
        <button
          onclick={onreset}
          class={cn(
            "px-3 py-1.5 text-xs rounded-lg font-medium border border-border transition-all duration-150 cursor-pointer",
            "text-muted bg-surface-2 hover:bg-surface-3 hover:text-fg active:scale-95",
          )}
        >
          {trans("Clear")}
        </button>
      </div>
    </div>

    <div>
      <!-- svelte-ignore a11y_label_has_associated_control -->
      <label
        class={cn(
          "block",
          "text-[10px]",
          "uppercase",
          "text-muted",
          "font-semibold",
          "tracking-wider",
          "mb-1.5",
        )}
      >
        {trans("Download and install package")}
      </label>
      <div class={cn("flex", "gap-1.5")}>
        <input
          type="text"
          placeholder={trans("Package name or URL…")}
          onkeydown={(e: KeyboardEvent) => {
            if (e.key === "Enter") onmanualinstall?.();
          }}
          class={cn(
            "w-44 px-2.5 py-1.5 border text-xs rounded-lg",
            "bg-surface outline-none transition-all duration-150",
            "border-border text-fg placeholder:text-muted/50 font-mono",
            "focus:border-(--accent) focus:shadow-[0_0_0_1px_var(--accent)]",
          )}
        />
        <button
          onclick={onmanualinstall}
          disabled={operating}
          class={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium border transition-all duration-150 cursor-pointer active:scale-95",
            "text-accent bg-accent/8 border-accent/15 hover:bg-accent/15 hover:border-accent/25 disabled:opacity-40 disabled:cursor-not-allowed",
          )}
        >
          {trans("OK")}
        </button>
      </div>
    </div>
  </div>

  <!-- Row 3: i18n filter -->
  <div>
    <label
      class={cn(
        "text-[10px]",
        "uppercase",
        "text-muted",
        "font-semibold",
        "tracking-wider",
        "block",
        "mb-1.5",
      )}
    >
      <Globe size={10} class="inline mr-1" />
      {trans("Display LuCI translation packages")}
    </label>
    <div class={cn("flex", "flex-wrap", "items-center", "gap-3", "text-xs")}>
      {#each [{ value: "lang" as const, label: trans("filtered"), tooltip: "Display base translation packages and translation packages for already installed languages only" }, { value: "all" as const, label: trans("all"), tooltip: "Display all available translation packages" }, { value: "none" as const, label: trans("none"), tooltip: "Hide all translation packages" }] as opt}
        <label
          class={cn(
            "flex",
            "items-center",
            "gap-1.5",
            "cursor-pointer",
            "text-muted",
            "hover:text-fg",
          )}
          title={opt.tooltip}
        >
          <input
            type="radio"
            name="i18n_filter"
            value={opt.value}
            checked={i18nFilter === opt.value}
            onchange={() => oni18nchange?.(opt.value)}
            class={cn("accent-(--accent)")}
          />
          {opt.label}
        </label>
      {/each}
    </div>
  </div>
</div>
