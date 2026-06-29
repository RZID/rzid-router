<script lang="ts">
  import { ChevronRight, ArrowUpDown } from "@lucide/svelte";
  import { slide } from "svelte/transition";
  import { cn } from "../../helpers/classname";

  let {
    table,
    chains,
    rules,
    items,
    fam,
    chainLabel,
    hookLabel,
    policyLabel,
    trans,
    ets,
    evs,
    fm,
    getCounter,
    isAction,
    hidden,
    ontoggle,
  }: {
    table: any;
    chains: any[];
    rules: any[];
    items: any[];
    fam: Record<string, string>;
    chainLabel: Record<string, string>;
    hookLabel: Record<string, string>;
    policyLabel: Record<string, string>;
    trans: (k: string) => string;
    ets: (e: any) => string;
    evs: (v: any) => string;
    fm: { pps: (n: number) => string; bytes: (b: number) => string };
    getCounter: (c: any) => any;
    isAction: (e: any) => boolean;
    hidden: Record<string, boolean>;
    ontoggle: (k: string) => void;
  } = $props();

  // svelte-ignore state_referenced_locally
  const tf = table.table.family;
  // svelte-ignore state_referenced_locally
  const tn = table.table.name;
  const key = tf + tn;
  const chainRules = (f: string, t: string, c: string) =>
    rules.filter(
      (r: any) =>
        r.rule.family === f && r.rule.table === t && r.rule.chain === c,
    );
</script>

<div class={cn("glass", "animate-slide-up")}>
  <button
    class={cn(
      "p-5",
      "flex",
      "gap-2",
      "w-full",
      "text-left",
      "rounded-xl",
      "items-center",
      "cursor-pointer",
      "transition-colors",
      "hover:bg-white/5",
    )}
    onclick={() => ontoggle(key)}
  >
    <span class={cn("text-sm", "font-semibold", "text-white")}>
      {fam[tf] || tf}
      {trans("table")} "{tn}"
    </span>
    <span class={cn("flex-1")}></span>
    <span
      class={cn("text-xs", "font-mono", "transition-transform")}
      style="color:var(--text-muted);transform:rotate({hidden[key]
        ? 0
        : 90}deg)"
    >
      <ChevronRight size={14} class={cn("text-muted")} />
    </span>
  </button>
  {#if !hidden[key]}
    <div
      transition:slide|local={{ duration: 200 }}
      class={cn("border-t", "border-border")}
    >
      {#each chains.filter((c: any) => c.chain.family === tf && c.chain.table === tn) as ch}
        {@const c = ch.chain}
        <div class={cn("px-5", "py-4", "border-b border-border")}>
          <h4 class={cn("text-sm", "font-semibold", "mb-1", "text-accent")}>
            {chainLabel[c.type] || trans("Rule container chain")} "{c.name}"
          </h4>
          {#if c.hook}
            <div class={cn("text-xs", "mb-1", "text-muted")}>
              {trans("Hook:")}
              {c.hook} ({hookLabel[c.hook] || ""}){c.prio !== undefined
                ? `, ${trans("Priority:")} ${c.prio}`
                : ""}
            </div>
          {/if}
          {#if c.policy}
            <div
              class={cn("text-xs", "mb-3")}
              style="color:{c.policy === 'drop'
                ? 'var(--danger)'
                : 'var(--accent)'}"
            >
              {trans("Policy:")}
              {c.policy} ({policyLabel[c.policy] || ""})
            </div>
          {/if}
          {#if chainRules(tf, tn, c.name).length}
            <table class={cn("w-full")}>
              <thead>
                <tr class={cn("text-muted")}>
                  <th
                    class={cn("pb-2", "text-xs", "text-left", "font-medium")}
                    style="width:55%">{trans("Rule matches")}</th
                  >
                  <th
                    class={cn("pb-2", "text-xs", "text-left", "font-medium")}
                    style="width:45%">{trans("Rule actions")}</th
                  >
                </tr>
              </thead>
              <tbody>
                {#each chainRules(tf, tn, c.name) as r}
                  <tr class={cn("border-t border-border")}>
                    <td class={cn("py-2", "pr-3", "text-xs", "align-top")}>
                      {#if r.rule.comment}
                        <span
                          class={cn(
                            "mr-1",
                            "px-1.5",
                            "py-0.5",
                            "rounded",
                            "text-xs",
                            "text-accent",
                            "bg-accent/10",
                          )}
                          title={`${trans("Rule comment:")} ${r.rule.comment}`}
                          >#</span
                        >
                      {/if}
                      {#each r.rule.expr || [] as e}
                        {#if !isAction(e) && !e.counter}
                          <span
                            class={cn(
                              "mr-1",
                              "mb-1",
                              "px-1.5",
                              "py-0.5",
                              "border",
                              "rounded",
                              "text-xs",
                              "font-mono",
                              "inline-block",
                              "bg-surface-2",
                              "border-border",
                              "whitespace-pre-wrap",
                            )}
                          >
                            {ets(e) || trans("(any)")}
                          </span>
                        {/if}
                      {/each}
                      {#each r.rule.expr || [] as e}
                        {#if e.counter && !isAction(e)}
                          {@const ct = getCounter(e.counter)}
                          {#if ct}
                            <span
                              class={cn(
                                "mr-1",
                                "mb-1",
                                "px-1.5",
                                "py-0.5",
                                "border",
                                "rounded",
                                "text-xs",
                                "font-mono",
                                "inline-block",
                                "bg-surface-2",
                                "border-border",
                              )}
                              title={`${trans("Traffic matched by rule:")} ${fm.pps(ct.counter.packets)} ${trans("Packets")}, ${fm.bytes(ct.counter.bytes)} ${trans("Bytes")}`}
                              >{fm.bytes(ct.counter.bytes)}</span
                            >
                          {/if}
                        {/if}
                      {/each}
                      {#if !(r.rule.expr || []).filter((e: any) => !isAction(e)).length}
                        <span class={cn("text-xs", "text-muted")}
                          >{trans("Any packet")}</span
                        >
                      {/if}
                    </td>
                    <td class={cn("py-2", "pr-3", "text-xs", "align-top")}>
                      {#each r.rule.expr || [] as e}
                        {#if e.vmap}
                          {#each e.vmap.data?.set || e.vmap.data || [] as [mk, ma]}
                            <div class={cn("mb-1")}>
                              <span
                                class={cn(
                                  "mr-1",
                                  "px-1.5",
                                  "py-0.5",
                                  "border",
                                  "rounded",
                                  "text-xs",
                                  "font-mono",
                                  "inline-block",
                                  "bg-surface-2",
                                  "border-border",
                                )}>{evs(mk)}:</span
                              >
                              <span
                                class={cn(
                                  "mr-1",
                                  "px-1.5",
                                  "py-0.5",
                                  "rounded",
                                  "text-xs",
                                  "font-mono",
                                  "inline-block",
                                )}
                                style="background:{ma.drop !== undefined ||
                                ma.reject !== undefined
                                  ? 'rgba(255,77,79,0.1)'
                                  : ma.accept !== undefined
                                    ? 'rgba(0,212,170,0.1)'
                                    : 'rgba(88,166,255,0.1)'};color:{ma.drop !==
                                  undefined || ma.reject !== undefined
                                  ? 'var(--danger)'
                                  : ma.accept !== undefined
                                    ? 'var(--accent)'
                                    : 'var(--info)'}">{ets(ma)}</span
                              >
                            </div>
                          {/each}
                        {:else if isAction(e)}
                          <span
                            class={cn(
                              "mr-1",
                              "mb-1",
                              "px-1.5",
                              "py-0.5",
                              "rounded",
                              "text-xs",
                              "font-mono",
                              "inline-block",
                            )}
                            style="background:{e.drop !== undefined ||
                            e.reject !== undefined
                              ? 'rgba(255,77,79,0.1)'
                              : e.accept !== undefined
                                ? 'rgba(0,212,170,0.1)'
                                : 'rgba(88,166,255,0.1)'};color:{e.drop !==
                              undefined || e.reject !== undefined
                              ? 'var(--danger)'
                              : e.accept !== undefined
                                ? 'var(--accent)'
                                : 'var(--info)'}">{ets(e)}</span
                          >
                        {/if}
                      {/each}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          {:else}
            <p class={cn("text-xs", "py-3", "text-muted")}>
              {trans("No rules in this chain")}
            </p>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
