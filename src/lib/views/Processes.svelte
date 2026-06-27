<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import {
    RotateCw,
    Search,
    XCircle,
    OctagonX,
    PowerOff,
    ArrowUp,
    ArrowDown,
    ArrowUpDown,
  } from "@lucide/svelte";
  import { getProcessList, killProcess, type Process } from "../api/ubus";
  import { cn } from "../helpers/classname";

  let processes = $state<Process[]>([]);
  let loading = $state(true);
  let error = $state("");
  let filterText = $state("");
  let sortKey = $state<keyof Process>("PID");
  let sortDir = $state<"asc" | "desc">("asc");
  let killing = $state<Record<string, string>>({});
  let interval: ReturnType<typeof setInterval>;

  const columns: { key: keyof Process; label: string }[] = [
    { key: "PID", label: "PID" },
    { key: "PPID", label: "PPID" },
    { key: "USER", label: "USER" },
    { key: "STAT", label: "STAT" },
    { key: "VSZ", label: "VSZ" },
    { key: "%CPU", label: "%CPU" },
    { key: "%MEM", label: "%MEM" },
    { key: "COMMAND", label: "COMMAND" },
  ];

  const signals = [
    { label: "HUP", sig: 1, icon: PowerOff, color: "var(--warn)" },
    { label: "TERM", sig: 15, icon: XCircle, color: "var(--info)" },
    { label: "KILL", sig: 9, icon: OctagonX, color: "var(--danger)" },
  ];

  const filtered = $derived.by(() => {
    if (!filterText) return processes;
    const q = filterText.toLowerCase();
    return processes.filter(
      (p) =>
        p.PID.includes(q) ||
        p.COMMAND.toLowerCase().includes(q) ||
        p.USER.toLowerCase().includes(q),
    );
  });

  const sorted = $derived.by(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let va: string | number = a[sortKey];
      let vb: string | number = b[sortKey];
      if (sortKey === "PID" || sortKey === "PPID") {
        va = parseInt(va);
        vb = parseInt(vb);
      } else if (sortKey === "%CPU" || sortKey === "%MEM") {
        va = parseFloat(va);
        vb = parseFloat(vb);
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  });

  const toggleSort = (key: keyof Process) => {
    if (sortKey === key) {
      sortDir = sortDir === "asc" ? "desc" : "asc";
    } else {
      sortKey = key;
      sortDir = "asc";
    }
  };

  const sortIcon = (key: keyof Process) => {
    if (sortKey !== key) return ArrowUpDown;
    return sortDir === "asc" ? ArrowUp : ArrowDown;
  };

  const handleKill = async (pid: string, sig: number, label: string) => {
    if (killing[pid]) return;
    killing = { ...killing, [pid]: label };
    const res = await killProcess(pid, sig);
    if (res === null) {
      killing = { ...killing, [pid]: "error" };
      setTimeout(() => {
        const next = { ...killing };
        delete next[pid];
        killing = next;
      }, 2000);
    } else {
      const next = { ...killing };
      delete next[pid];
      killing = next;
    }
  };

  const refresh = async () => {
    error = "";
    const list = await getProcessList();
    if (!list) {
      error = "Unable to retrieve process list";
      return;
    }
    processes = list;
  };

  const doRefresh = async () => {
    loading = true;
    await refresh();
    loading = false;
  };

  onMount(async () => {
    await doRefresh();
    interval = setInterval(refresh, 5000);
  });

  onDestroy(() => clearInterval(interval));

  const th = "text-xs font-medium pb-2 pr-3 text-left whitespace-nowrap";
  const td = "py-1.5 pr-3 text-xs whitespace-nowrap";
</script>

<div class={cn("p-6", "flex", "flex-col", "h-screen", "gap-4", "animate-fade-in")}>
  <div class={cn("flex", "items-start", "justify-between", "gap-4", "shrink-0")}>
    <div>
      <h1 class={cn("text-lg", "font-semibold", "text-white")}>Processes</h1>
      <p class={cn("text-sm", "mt-0.5", "text-muted")}>Running processes</p>
    </div>
    <div class={cn("flex", "items-center", "gap-2", "shrink-0")}>
      <div
        class={cn(
          "flex",
          "items-center",
          "gap-1.5",
          "px-2.5",
          "py-1.5",
          "border",
          "rounded-lg",
          "bg-surface",
          "border-border",
        )}
      >
        <Search size={14} class={cn("text-muted", "shrink-0")} />
        <input
          class={cn(
            "w-40",
            "text-xs",
            "text-fg",
            "bg-transparent",
            "outline-none",
            "placeholder:text-muted",
            "transition-all",
            "duration-150",
            "focus:border-(--accent)",
          )}
          bind:value={filterText}
          placeholder="Filter…"
        />
      </div>
      <button
        onclick={doRefresh}
        disabled={loading}
        class={cn(
          "px-2.5",
          "py-1.5",
          "border",
          "rounded-lg",
          "text-xs",
          "font-medium",
          "transition-all",
          "cursor-pointer",
          loading
            ? cn("text-muted", "bg-surface-3", "border-transparent")
            : cn(
                "text-accent",
                "bg-accent/10",
                "border-accent/20",
                "hover:bg-accent/15",
              ),
        )}
      >
        <RotateCw
          size={14}
          class={cn(loading && "animate-spin", "inline-block", "mr-1")}
        />
        Refresh
      </button>
    </div>
  </div>

  {#if error}
    <div
      class={cn(
        "px-3",
        "py-2",
        "border",
        "text-xs",
        "rounded-lg",
        "shrink-0",
        "text-danger",
        "bg-danger/10",
        "border-danger/20",
      )}
    >
      {error}
    </div>
  {/if}

  <div class={cn("glass", "p-5", "flex", "flex-col", "flex-1", "min-h-0", "animate-slide-up")}>
    <div class={cn("flex", "items-center", "justify-between", "mb-3", "shrink-0")}>
      <h3 class={cn("text-sm", "font-semibold", "text-white")}>Process List</h3>
      {#if loading}
        <span
          class={cn(
            "flex",
            "text-xs",
            "gap-1.5",
            "items-center",
            "text-accent",
          )}
        >
          <span
            class={cn(
              "w-1.5",
              "h-1.5",
              "bg-accent",
              "rounded-full",
              "animate-pulse",
            )}
          ></span>
          Refreshing…
        </span>
      {:else}
        <span class={cn("text-xs", "font-mono", "text-muted")}>
          {sorted.length}
          {sorted.length === 1 ? "process" : "processes"}
        </span>
      {/if}
    </div>

    {#if sorted.length > 0}
      <div class={cn("flex-1", "min-h-0", "overflow-y-auto")}>
        <table class={cn("w-full")}>
          <thead>
            <tr class={cn("text-muted", "sticky", "top-0", "z-10")} style="background:var(--surface-1)">
              {#each columns as col}
                {@const Icon = sortIcon(col.key)}
                <th
                  class={cn(
                    th,
                    "select-none",
                    "cursor-pointer",
                    "hover:text-fg",
                    "transition-colors",
                  )}
                  onclick={() => toggleSort(col.key)}
                >
                  <Icon size={10} class={cn("inline-block", "mr-1")} />
                  {col.label}
                </th>
              {/each}
              <th class={cn(th, "w-28")}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each sorted as p (p.PID)}
              <tr
                class={cn(
                  "border-t",
                  "border-border",
                  "transition-colors",
                  "hover:bg-white/2",
                )}
              >
                <td class={cn(td, "font-mono", "text-accent")}>{p.PID}</td>
                <td class={cn(td, "font-mono", "text-muted")}>{p.PPID}</td>
                <td class={cn(td, "text-muted")}>{p.USER}</td>
                <td class={cn(td, "font-mono")}>{p.STAT}</td>
                <td class={cn(td, "font-mono", "text-muted")}>{p.VSZ}</td>
                <td class={cn(td, "font-mono")}>{p["%CPU"]}</td>
                <td class={cn(td, "font-mono")}>{p["%MEM"]}</td>
                <td class={cn(td, "max-w-xs", "truncate")} title={p.COMMAND}>
                  {p.COMMAND}
                </td>
                <td class={cn(td)}>
                  <div class={cn("flex", "items-center", "gap-1")}>
                    {#each signals as sig}
                      {@const SigIcon = sig.icon}
                      <button
                        onclick={() => handleKill(p.PID, sig.sig, sig.label)}
                        disabled={Boolean(killing[p.PID])}
                        title={`${sig.label} (${p.PID})`}
                        class={cn(
                          "p-1.5",
                          "rounded-md",
                          "cursor-pointer",
                          "transition-all",
                          "border",
                          killing[p.PID] === sig.label
                            ? cn("opacity-50", "bg-white/5", "border-border")
                            : cn(
                                "hover:bg-white/5",
                                "border-transparent",
                                "hover:border-border",
                              ),
                        )}
                        style={killing[p.PID] || killing[p.PID] === "error"
                          ? undefined
                          : `color:${sig.color}`}
                      >
                        <SigIcon size={14} />
                      </button>
                    {/each}
                    {#if killing[p.PID] === "error"}
                      <span class={cn("text-[10px]", "text-danger")}>
                        Failed
                      </span>
                    {/if}
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else}
      <p class={cn("text-xs", "text-center", "py-4", "text-muted")}>
        {filterText
          ? "No processes match filter"
          : loading
            ? "Loading processes…"
            : "No processes found"}
      </p>
    {/if}
  </div>
</div>
