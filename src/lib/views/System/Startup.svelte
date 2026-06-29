<script lang="ts">
  import { onMount } from "svelte";
  import {
    Play,
    Square,
    RotateCw,
    ToggleLeft,
    ToggleRight,
    Search,
    Power,
  } from "@lucide/svelte";
  import { cn } from "../../helpers/classname";
  import { t as _t, getLocale, onLocaleChange } from "../../i18n";
  import { listDir, execCommand, rcInit } from "../../api/ubus";

  let locale = $state(getLocale());
  let trans = $derived.by(() => {
    locale;
    return (k: string) => _t(k);
  });
  $effect(() =>
    onLocaleChange(() => {
      locale = getLocale();
    }),
  );

  let scripts = $state<{ name: string; enabled: boolean; priority: string }[]>(
    [],
  );
  let loading = $state(true);
  let filter = $state("");
  let actionFeedback = $state<Record<string, string>>({});

  const loadScripts = async () => {
    loading = true;
    try {
      const [all, rc] = await Promise.all([
        listDir("/etc/init.d"),
        listDir("/etc/rc.d"),
      ]);

      const rcEntries = rc?.entries || [];
      const enabledMap: Record<string, string> = {};
      for (const e of rcEntries) {
        if (e.type === "symlink" || e.type === "file") {
          const m = e.name.match(/^(S|K)(\d+)(.+)$/);
          if (m) enabledMap[m[3]] = m[2];
        }
      }

      scripts = (all?.entries || [])
        .filter(
          (e) =>
            e.type === "file" && e.name !== "README" && !e.name.startsWith("."),
        )
        .map((e) => ({
          name: e.name,
          enabled: e.name in enabledMap,
          priority: enabledMap[e.name] || "",
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch (err) {
      console.error("Failed to load init scripts", err);
    }
    loading = false;
  };

  const filtered = $derived(
    filter
      ? scripts.filter((s) =>
          s.name.toLowerCase().includes(filter.toLowerCase()),
        )
      : scripts,
  );

  const doAction = async (name: string, action: string, e: Event) => {
    e.stopPropagation();
    actionFeedback = { ...actionFeedback, [name]: action };

    let ok = false;
    if (action === "enable" || action === "disable") {
      const res = await execCommand(`/etc/init.d/${name}`, [action]);
      ok = res?.code === 0;
      if (ok) await loadScripts();
    } else {
      const res = await rcInit(name, action);
      ok = res !== null;
    }

    actionFeedback = { ...actionFeedback, [name]: ok ? "done" : "failed" };
    setTimeout(() => {
      actionFeedback = { ...actionFeedback, [name]: "" };
    }, 2000);
  };

  onMount(() => {
    loadScripts();
  });
</script>

<div class={cn("p-6", "flex", "flex-col", "h-dvh", "gap-4", "animate-fade-in")}>
  <div class={cn("shrink-0", "flex", "items-center", "gap-3")}>
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
      <Power size={16} class={cn("text-accent")} />
    </div>
    <div>
      <h1
        class={cn("text-lg", "font-semibold", "text-white", "tracking-tight")}
      >
        {trans("Startup")}
      </h1>
      <p class={cn("text-xs", "text-muted")}>
        {trans("Manage init scripts and services on startup")}
      </p>
    </div>
  </div>

  <div class={cn("shrink-0", "glass", "p-4", "rounded-xl")}>
    <div class={cn("relative", "max-w-xs")}>
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
        bind:value={filter}
        placeholder={trans("Filter…")}
        class={cn(
          "w-full pl-7 pr-2 py-1.5 border text-xs rounded-lg",
          "bg-surface outline-none transition-all duration-150",
          "border-border text-fg placeholder:text-muted/50",
          "focus:border-(--accent) focus:shadow-[0_0_0_1px_var(--accent)]",
        )}
      />
    </div>
  </div>

  {#if loading}
    <div class={cn("flex-1", "flex", "items-center", "justify-center")}>
      <div class={cn("flex", "flex-col", "items-center", "gap-3")}>
        <div
          class={cn(
            "w-8",
            "h-8",
            "rounded-lg",
            "bg-surface-3",
            "animate-pulse",
          )}
        ></div>
        <span class={cn("text-xs", "text-muted", "animate-pulse")}
          >{trans("Loading…")}</span
        >
      </div>
    </div>
  {:else if filtered.length === 0}
    <div class={cn("flex-1", "flex", "items-center", "justify-center")}>
      <p class={cn("text-sm", "text-muted")}>
        {trans("No init scripts found")}
      </p>
    </div>
  {:else}
    <div class={cn("flex-1", "min-h-0", "rounded-xl", "overflow-hidden")}>
      <div class={cn("glass", "rounded-xl", "h-full", "overflow-y-auto")}>
        <table class={cn("w-full", "text-xs")}>
          <thead class={cn("sticky", "top-0", "z-10")}>
            <tr
              class={cn(
                "border-b",
                "border-border",
                "bg-surface-2/95",
                "backdrop-blur-sm",
              )}
            >
              <th
                class={cn(
                  "text-left",
                  "p-3",
                  "text-[10px]",
                  "uppercase",
                  "text-muted",
                  "font-semibold",
                  "tracking-wider",
                )}>{trans("Init Script")}</th
              >
              <th
                class={cn(
                  "text-center",
                  "p-3",
                  "text-[10px]",
                  "uppercase",
                  "text-muted",
                  "font-semibold",
                  "tracking-wider",
                  "hidden",
                  "sm:table-cell",
                )}>{trans("Status")}</th
              >
              <th
                class={cn(
                  "text-center",
                  "p-3",
                  "text-[10px]",
                  "uppercase",
                  "text-muted",
                  "font-semibold",
                  "tracking-wider",
                  "hidden",
                  "md:table-cell",
                )}>{trans("Priority")}</th
              >
              <th
                class={cn(
                  "text-right",
                  "p-3",
                  "text-[10px]",
                  "uppercase",
                  "text-muted",
                  "font-semibold",
                  "tracking-wider",
                )}>{trans("Actions")}</th
              >
            </tr>
          </thead>
          <tbody>
            {#each filtered as s, i}
              <tr
                class={cn(
                  "border-b border-border/50 transition-all duration-150",
                  i % 2 === 0 ? "bg-surface-1/20" : "bg-transparent",
                )}
              >
                <td class={cn("p-3", "font-medium", "text-white")}>
                  {s.name}
                </td>
                <td class={cn("p-3", "text-center", "hidden", "sm:table-cell")}>
                  {#if s.enabled}
                    <span
                      class={cn(
                        "inline-flex",
                        "items-center",
                        "gap-1",
                        "px-2",
                        "py-0.5",
                        "text-[10px]",
                        "font-medium",
                        "rounded",
                        "bg-accent/8",
                        "text-accent",
                      )}
                    >
                      {trans("Enabled")}
                    </span>
                  {:else}
                    <span
                      class={cn(
                        "inline-flex",
                        "items-center",
                        "gap-1",
                        "px-2",
                        "py-0.5",
                        "text-[10px]",
                        "font-medium",
                        "rounded",
                        "bg-surface-3",
                        "text-muted",
                      )}
                    >
                      {trans("Disabled")}
                    </span>
                  {/if}
                </td>
                <td
                  class={cn(
                    "p-3",
                    "text-center",
                    "font-mono",
                    "text-muted",
                    "hidden",
                    "md:table-cell",
                  )}
                >
                  {s.priority || "-"}
                </td>
                <td class={cn("p-3", "text-right")}>
                  <div class={cn("inline-flex", "items-center", "gap-1")}>
                    {#each [{ action: "start", icon: Play, label: trans("Start"), color: "accent" as const }, { action: "stop", icon: Square, label: trans("Stop"), color: "danger" as const }, { action: "restart", icon: RotateCw, label: trans("Restart"), color: "accent" as const }] as btn}
                      <button
                        onclick={(e) => doAction(s.name, btn.action, e)}
                        disabled={actionFeedback[s.name] !== undefined &&
                          actionFeedback[s.name] !== "" &&
                          actionFeedback[s.name] !== "done" &&
                          actionFeedback[s.name] !== "failed"}
                        title={btn.label}
                        class={cn(
                          "p-1.5 rounded-md border transition-all duration-150 cursor-pointer active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed",
                          btn.color === "accent"
                            ? "text-accent bg-accent/8 border-accent/15 hover:bg-accent/15 hover:border-accent/25"
                            : "text-danger bg-danger/8 border-danger/15 hover:bg-danger/15 hover:border-danger/25",
                          actionFeedback[s.name] === btn.action &&
                            "animate-pulse",
                        )}
                      >
                        <btn.icon size={12} />
                      </button>
                    {/each}
                    {#if s.enabled}
                      <button
                        onclick={(e) => doAction(s.name, "disable", e)}
                        title={trans("Disable")}
                        class={cn(
                          "p-1.5 rounded-md border transition-all duration-150 cursor-pointer active:scale-95",
                          "text-warn bg-warn/8 border-warn/15 hover:bg-warn/15 hover:border-warn/25",
                        )}
                      >
                        <ToggleRight size={12} />
                      </button>
                    {:else}
                      <button
                        onclick={(e) => doAction(s.name, "enable", e)}
                        title={trans("Enable")}
                        class={cn(
                          "p-1.5 rounded-md border transition-all duration-150 cursor-pointer active:scale-95",
                          "text-muted bg-surface-2 border-border hover:bg-surface-3 hover:text-fg",
                        )}
                      >
                        <ToggleLeft size={12} />
                      </button>
                    {/if}
                  </div>
                  {#if actionFeedback[s.name] === "done"}
                    <span class={cn("text-[10px]", "text-accent", "ml-1")}
                      >✓</span
                    >
                  {:else if actionFeedback[s.name] === "failed"}
                    <span class={cn("text-[10px]", "text-danger", "ml-1")}
                      >✗</span
                    >
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>
