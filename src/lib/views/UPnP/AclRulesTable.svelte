<script lang="ts">
  import { Plus, Pencil, Trash2 } from "@lucide/svelte";
  import { cn } from "../../helpers/classname";
  import type { AclRule } from "./types";

  let {
    aclRules,
    editingIdx,
    editForm,
    onadd,
    onedit,
    oncancel,
    onsave,
    ondelete,
    trans,
  }: {
    aclRules: AclRule[];
    editingIdx: number | null;
    editForm: AclRule | null;
    onadd: () => void;
    onedit: (i: number) => void;
    oncancel: () => void;
    onsave: () => void;
    ondelete: (i: number) => void;
    trans: (k: string) => string;
  } = $props();
</script>

<div class={cn("glass", "rounded-xl", "p-5")}>
  <div class={cn("flex", "items-center", "justify-between", "mb-3")}>
    <span
      class={cn(
        "text-[10px]",
        "uppercase",
        "text-muted",
        "font-semibold",
        "tracking-wider",
      )}
    >
      {trans("Service Access Control List")}
      <span
        class={cn(
          "ml-2",
          "font-mono",
          "text-muted",
          "not-italic",
          "font-normal",
        )}
        >{trans(
          "ACL specify which client addresses and ports can be mapped, IPv6 always allowed.",
        )}</span
      >
    </span>
    <button
      onclick={onadd}
      class={cn(
        "inline-flex",
        "items-center",
        "gap-1",
        "px-2",
        "py-1",
        "text-[10px]",
        "rounded-md",
        "font-medium",
        "border",
        "text-accent",
        "bg-accent/10",
        "border-accent/20",
        "hover:bg-accent/20",
        "cursor-pointer",
        "transition-all",
      )}
    >
      <Plus size={12} />
      {trans("Add")}
    </button>
  </div>
  <div class={cn("h-px", "bg-border")}></div>
  {#if aclRules.length === 0}
    <p class={cn("text-xs", "text-muted", "italic", "py-6", "text-center")}>
      {trans("No ACL rules defined")}
    </p>
  {:else}
    <div class={cn("overflow-x-auto", "pt-3")}>
      <table class={cn("w-full", "text-xs")}>
        <thead>
          <tr class={cn("text-left", "text-muted")}>
            <th class={cn("pb-2", "pr-3", "font-medium")}>{trans("Comment")}</th
            >
            <th class={cn("pb-2", "pr-3", "font-medium")}
              >{trans("Client Address")}</th
            >
            <th class={cn("pb-2", "pr-3", "font-medium")}
              >{trans("Client Port")}</th
            >
            <th class={cn("pb-2", "pr-3", "font-medium")}
              >{trans("External Port")}</th
            >
            <th class={cn("pb-2", "pr-3", "font-medium")}>{trans("Action")}</th>
            <th class={cn("pb-2", "font-medium")}></th>
          </tr>
        </thead>
        <tbody>
          {#each aclRules as rule, i}
            {#if editingIdx === i && editForm}
              <tr class={cn("border-t", "border-border", "bg-accent/5")}>
                <td class={cn("py-1.5", "pr-2")}>
                  <input
                    bind:value={editForm.comment}
                    placeholder={trans("Description")}
                    class={cn(
                      "w-full",
                      "px-2",
                      "py-1",
                      "text-[11px]",
                      "rounded-md",
                      "bg-surface",
                      "border",
                      "border-border",
                      "text-fg",
                      "outline-none",
                      "focus:border-(--accent)",
                    )}
                  />
                </td>
                <td class={cn("py-1.5", "pr-2")}>
                  <input
                    bind:value={editForm.int_addr}
                    placeholder="0.0.0.0/0"
                    class={cn(
                      "w-full",
                      "px-2",
                      "py-1",
                      "text-[11px]",
                      "rounded-md",
                      "bg-surface",
                      "border",
                      "border-border",
                      "text-fg",
                      "font-mono",
                      "outline-none",
                      "focus:border-(--accent)",
                    )}
                  />
                </td>
                <td class={cn("py-1.5", "pr-2")}>
                  <input
                    bind:value={editForm.int_ports}
                    placeholder="1-65535"
                    class={cn(
                      "w-full",
                      "px-2",
                      "py-1",
                      "text-[11px]",
                      "rounded-md",
                      "bg-surface",
                      "border",
                      "border-border",
                      "text-fg",
                      "font-mono",
                      "outline-none",
                      "focus:border-(--accent)",
                    )}
                  />
                </td>
                <td class={cn("py-1.5", "pr-2")}>
                  <input
                    bind:value={editForm.ext_ports}
                    placeholder="1-65535"
                    class={cn(
                      "w-full",
                      "px-2",
                      "py-1",
                      "text-[11px]",
                      "rounded-md",
                      "bg-surface",
                      "border",
                      "border-border",
                      "text-fg",
                      "font-mono",
                      "outline-none",
                      "focus:border-(--accent)",
                    )}
                  />
                </td>
                <td class={cn("py-1.5", "pr-2")}>
                  <select
                    bind:value={editForm.action}
                    class={cn(
                      "w-full",
                      "px-2",
                      "py-1",
                      "text-[11px]",
                      "rounded-md",
                      "bg-surface",
                      "border",
                      "border-border",
                      "text-fg",
                      "outline-none",
                      "cursor-pointer",
                    )}
                  >
                    <option value="allow">{trans("allow")}</option>
                    <option value="deny">{trans("deny")}</option>
                  </select>
                </td>
                <td class={cn("py-1.5")}>
                  <div class={cn("flex", "items-center", "gap-1")}>
                    <button
                      onclick={onsave}
                      class={cn(
                        "px-2",
                        "py-1",
                        "text-[10px]",
                        "rounded-md",
                        "font-medium",
                        "bg-accent",
                        "text-surface",
                        "cursor-pointer",
                        "transition-all",
                      )}>{trans("Save")}</button
                    >
                    <button
                      onclick={oncancel}
                      class={cn(
                        "px-2",
                        "py-1",
                        "text-[10px]",
                        "rounded-md",
                        "font-medium",
                        "text-muted",
                        "hover:text-fg",
                        "cursor-pointer",
                        "transition-all",
                      )}>{trans("Cancel")}</button
                    >
                  </div>
                </td>
              </tr>
            {:else}
              <tr class={cn("border-t", "border-border")}>
                <td class={cn("py-2", "pr-3", "font-medium")}
                  >{rule.comment || "—"}</td
                >
                <td class={cn("py-2", "pr-3", "font-mono", "text-muted")}
                  >{rule.int_addr || "—"}</td
                >
                <td class={cn("py-2", "pr-3", "font-mono")}
                  >{rule.int_ports || "—"}</td
                >
                <td class={cn("py-2", "pr-3", "font-mono", "text-accent")}
                  >{rule.ext_ports || "—"}</td
                >
                <td class={cn("py-2", "pr-3")}>
                  <span
                    class={cn(
                      "text-[10px]",
                      "font-medium",
                      rule.action === "allow" ? "text-accent" : "text-danger",
                    )}
                    >{rule.action === "allow"
                      ? trans("allow")
                      : trans("deny")}</span
                  >
                </td>
                <td class={cn("py-2")}>
                  <div class={cn("flex", "items-center", "gap-1")}>
                    <button
                      onclick={() => onedit(i)}
                      class={cn(
                        "p-1",
                        "rounded",
                        "text-muted",
                        "hover:text-accent",
                        "hover:bg-accent/10",
                        "transition-colors",
                        "cursor-pointer",
                      )}><Pencil size={12} /></button
                    >
                    <button
                      onclick={() => ondelete(i)}
                      class={cn(
                        "p-1",
                        "rounded",
                        "text-muted",
                        "hover:text-danger",
                        "hover:bg-danger/10",
                        "transition-colors",
                        "cursor-pointer",
                      )}><Trash2 size={12} /></button
                    >
                  </div>
                </td>
              </tr>
            {/if}
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
