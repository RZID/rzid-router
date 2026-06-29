<script lang="ts">
  import { cn } from "../../../helpers/classname";
  import { Plus, Pencil, Trash2 } from "@lucide/svelte";
  import TabBar from "../../../components/TabBar/TabBar.svelte";

  let {
    trans,
    tagsTab = $bindable("matchtags"),
    tagSections = [] as [string, import("../../../types").UciSection][],
    matchSections = [] as [string, import("../../../types").UciSection][],
    vcSections = [] as [string, import("../../../types").UciSection][],
    ucSections = [] as [string, import("../../../types").UciSection][],
    onopentag,
    ondelete,
  }: {
    trans: (k: string) => string;
    tagsTab: string;
    tagSections?: [string, import("../../../types").UciSection][];
    matchSections?: [string, import("../../../types").UciSection][];
    vcSections?: [string, import("../../../types").UciSection][];
    ucSections?: [string, import("../../../types").UciSection][];
    onopentag?: (type: string, section?: string) => void;
    ondelete?: (section: string) => void;
  } = $props();

  let th = "text-xs font-medium pb-2 px-3 text-left whitespace-nowrap";
  let td = "py-1.5 px-3 text-xs font-mono whitespace-nowrap";

  type TagsTabId = "matchtags" | "settags" | "vc" | "uc";

  let tagsTabs: { id: TagsTabId; label: string }[] = [
    { id: "matchtags", label: "Match Tags" },
    { id: "settags", label: "Set Tags" },
    { id: "vc", label: "VC" },
    { id: "uc", label: "UC" },
  ];
</script>

<TabBar
  tabs={tagsTabs}
  active={tagsTab}
  onchange={(id: string) => {
    tagsTab = id as TagsTabId;
  }}
/>

<div class={cn("mt-3")}>
  {#if tagsTab === "matchtags"}
    <p class={cn("text-xs", "text-muted", "mb-3")}>
      {trans("Tags filter which options apply to which hosts.")}
    </p>
    <div class={cn("flex", "justify-end", "mb-2")}>
      <button
        onclick={() => onopentag?.("tag")}
        class={cn(
          "flex",
          "px-2",
          "py-1",
          "gap-1",
          "text-xs",
          "rounded",
          "bg-accent",
          "text-black",
          "items-center",
          "cursor-pointer",
        )}
      >
        <Plus size={11} />{trans("Add tag")}
      </button>
    </div>
    {#if tagSections.length === 0}
      <p class={cn("py-2", "italic", "text-xs", "text-muted", "text-center")}>
        {trans("No tags defined")}
      </p>
    {:else}
      {#each tagSections as [name, sec]}
        <div
          class={cn(
            "flex",
            "py-1.5",
            "border-b",
            "items-center",
            "justify-between",
            "border-border",
          )}
        >
          <span class={cn("text-xs", "font-mono", "text-accent")}>{name}</span>
          <div class={cn("flex", "gap-1")}>
            <button
              onclick={() => onopentag?.("tag", name)}
              class={cn(
                "p-1",
                "rounded",
                "text-muted",
                "hover:text-fg",
                "cursor-pointer",
              )}
              title={trans("Edit")}
            >
              <Pencil size={10} />
            </button>
            <button
              onclick={() => ondelete?.(name)}
              class={cn(
                "p-1",
                "rounded",
                "text-muted",
                "cursor-pointer",
                "hover:text-danger",
              )}
              title={trans("Delete")}
            >
              <Trash2 size={10} />
            </button>
          </div>
        </div>
      {/each}
    {/if}
  {:else if tagsTab === "settags"}
    <p class={cn("text-xs", "text-muted", "mb-3")}>
      {trans("Match client options to set tags.")}
    </p>
    <div class={cn("flex", "justify-end", "mb-2")}>
      <button
        onclick={() => onopentag?.("match")}
        class={cn(
          "flex",
          "px-2",
          "py-1",
          "gap-1",
          "text-xs",
          "rounded",
          "bg-accent",
          "items-center",
          "text-black",
          "cursor-pointer",
        )}
      >
        <Plus size={11} />{trans("Add match")}
      </button>
    </div>
    {#if matchSections.length === 0}
      <p class={cn("py-2", "italic", "text-xs", "text-muted", "text-center")}>
        {trans("No matches defined")}
      </p>
    {:else}
      <div class={cn("glass", "rounded-xl", "overflow-hidden")}>
        <table class={cn("w-full", "text-xs")}>
          <thead>
            <tr
              class={cn(
                "text-left",
                "text-muted",
                "bg-surface",
                "border-b",
                "border-border",
              )}
            >
              <th class={th}>{trans("Match")}</th>
              <th class={th}>{trans("Set Tag")}</th>
              <th class={th}>{trans("Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {#each matchSections as [name, sec], i}
              <tr
                class={cn(
                  "border-b",
                  "border-border",
                  "hover:bg-white/4",
                  i % 2 === 0 && "bg-white/1.5",
                )}
              >
                <td class={td}>{sec.match || "—"}</td>
                <td class={td}>{sec.networkid || "—"}</td>
                <td class={td}>
                  <button
                    onclick={() => onopentag?.("match", name)}
                    class={cn(
                      "p-1",
                      "rounded",
                      "text-muted",
                      "hover:text-fg",
                      "cursor-pointer",
                    )}
                    title={trans("Edit")}
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    onclick={() => ondelete?.(name)}
                    class={cn(
                      "p-1",
                      "rounded",
                      "text-muted",
                      "cursor-pointer",
                      "hover:text-danger",
                    )}
                    title={trans("Delete")}
                  >
                    <Trash2 size={11} />
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {:else if tagsTab === "vc"}
    <p class={cn("text-xs", "text-muted", "mb-3")}>
      {trans("Match Vendor Class strings to set tags.")}
    </p>
    <div class={cn("flex", "justify-end", "mb-2")}>
      <button
        onclick={() => onopentag?.("vendorclass")}
        class={cn(
          "px-2",
          "py-1",
          "flex",
          "gap-1",
          "text-xs",
          "rounded",
          "bg-accent",
          "items-center",
          "text-black",
          "cursor-pointer",
        )}
      >
        <Plus size={11} />{trans("Add VC")}
      </button>
    </div>
    {#if vcSections.length === 0}
      <p class={cn("py-2", "italic", "text-xs", "text-muted", "text-center")}>
        {trans("No VC entries")}
      </p>
    {:else}
      <div class={cn("glass", "rounded-xl", "overflow-hidden")}>
        <table class={cn("w-full", "text-xs")}>
          <thead>
            <tr
              class={cn(
                "border-b",
                "text-left",
                "text-muted",
                "bg-surface",
                "border-border",
              )}
            >
              <th class={th}>{trans("Vendor Class")}</th>
              <th class={th}>{trans("Set Tag")}</th>
              <th class={th}>{trans("Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {#each vcSections as [name, sec], i}
              <tr
                class={cn(
                  "border-b",
                  "border-border",
                  "hover:bg-white/4",
                  i % 2 === 0 && "bg-white/1.5",
                )}
              >
                <td class={td}>{sec.vendorclass || "—"}</td>
                <td class={td}>{sec.networkid || "—"}</td>
                <td class={td}>
                  <button
                    onclick={() => onopentag?.("vendorclass", name)}
                    class={cn(
                      "p-1",
                      "rounded",
                      "text-muted",
                      "hover:text-fg",
                      "cursor-pointer",
                    )}
                    title={trans("Edit")}
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    onclick={() => ondelete?.(name)}
                    class={cn(
                      "p-1",
                      "rounded",
                      "text-muted",
                      "cursor-pointer",
                      "hover:text-danger",
                    )}
                    title={trans("Delete")}
                  >
                    <Trash2 size={11} />
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {:else if tagsTab === "uc"}
    <p class={cn("text-xs", "text-muted", "mb-3")}>
      {trans("Match User Class strings to set tags.")}
    </p>
    <div class={cn("flex", "justify-end", "mb-2")}>
      <button
        onclick={() => onopentag?.("userclass")}
        class={cn(
          "flex",
          "px-2",
          "py-1",
          "gap-1",
          "text-xs",
          "rounded",
          "bg-accent",
          "items-center",
          "text-black",
          "cursor-pointer",
        )}
      >
        <Plus size={11} />{trans("Add UC")}
      </button>
    </div>
    {#if ucSections.length === 0}
      <p class={cn("py-2", "italic", "text-xs", "text-muted", "text-center")}>
        {trans("No UC entries")}
      </p>
    {:else}
      <div class={cn("glass", "rounded-xl", "overflow-hidden")}>
        <table class={cn("w-full", "text-xs")}>
          <thead>
            <tr
              class={cn(
                "border-b",
                "text-left",
                "text-muted",
                "bg-surface",
                "border-border",
              )}
            >
              <th class={th}>{trans("User Class")}</th>
              <th class={th}>{trans("Set Tag")}</th>
              <th class={th}>{trans("Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {#each ucSections as [name, sec], i}
              <tr
                class={cn(
                  "border-b",
                  "border-border",
                  "hover:bg-white/4",
                  i % 2 === 0 && "bg-white/1.5",
                )}
              >
                <td class={td}>{sec.userclass || "—"}</td>
                <td class={td}>{sec.networkid || "—"}</td>
                <td class={td}>
                  <button
                    onclick={() => onopentag?.("userclass", name)}
                    class={cn(
                      "p-1",
                      "rounded",
                      "text-muted",
                      "hover:text-fg",
                      "cursor-pointer",
                    )}
                    title={trans("Edit")}
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    onclick={() => ondelete?.(name)}
                    class={cn(
                      "p-1",
                      "rounded",
                      "text-muted",
                      "cursor-pointer",
                      "hover:text-danger",
                    )}
                    title={trans("Delete")}
                  >
                    <Trash2 size={11} />
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {/if}
</div>
