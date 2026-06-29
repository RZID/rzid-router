<script lang="ts">
  import { Shield } from "@lucide/svelte";
  import { cn } from "../../../helpers/classname";

  let {
    jail_mount = $bindable([]),
    jail_mount_input = $bindable(""),
    jail_mount_rw = $bindable([]),
    jail_mount_rw_input = $bindable(""),
    trans,
  }: {
    jail_mount: string[];
    jail_mount_input: string;
    jail_mount_rw: string[];
    jail_mount_rw_input: string;
    trans: (k: string) => string;
  } = $props();
</script>

<div class={cn("space-y-5")}>
  <div class={cn("flex", "items-center", "gap-2")}>
    <Shield size={14} class={cn("text-accent")} />
    <span
      class={cn(
        "text-[10px]",
        "uppercase",
        "text-muted",
        "font-semibold",
        "tracking-wider",
      )}>{trans("File System Access")}</span
    >
  </div>
  <div class={cn("h-px", "bg-border")}></div>
  <p class={cn("text-[10px]", "text-muted")}>
    {trans(
      "AdGuard Home operates in a strict sandbox (jail) which isolates the process from the rest of the filesystem. To grant additional access, specify mount points or files below.",
    )}
  </p>
  <div>
    <span
      class={cn(
        "text-[10px]",
        "uppercase",
        "text-muted",
        "font-semibold",
        "tracking-wider",
        "mb-2",
      )}>{trans("Read-only access")}</span
    >
    <div class={cn("space-y-1", "mb-1")}>
      {#each jail_mount as item, i}
        <div class={cn("flex", "items-center", "gap-1")}>
          <input
            readonly
            value={item}
            class={cn(
              "flex-1",
              "px-2.5",
              "py-1",
              "border",
              "text-xs",
              "rounded-md",
              "bg-surface-2",
              "outline-none",
              "text-fg",
              "border-border",
              "cursor-default",
            )}
          />
          <button
            type="button"
            onclick={() => {
              jail_mount = jail_mount.toSpliced(i, 1);
            }}
            class={cn(
              "px-1.5",
              "py-1",
              "text-[10px]",
              "rounded",
              "text-danger",
              "hover:bg-danger/10",
              "transition-colors",
              "cursor-pointer",
            )}>{trans("Remove")}</button
          >
        </div>
      {/each}
    </div>
    <div class={cn("flex", "items-center", "gap-1")}>
      <input
        bind:value={jail_mount_input}
        placeholder="/path/to/dir"
        class={cn(
          "flex-1",
          "px-2.5",
          "py-1",
          "border",
          "text-xs",
          "rounded-md",
          "bg-surface",
          "outline-none",
          "text-fg",
          "border-border",
          "focus:border-(--accent)",
        )}
        onkeydown={(e) => {
          if (e.key === "Enter" && jail_mount_input.trim()) {
            e.preventDefault();
            jail_mount = [...jail_mount, jail_mount_input.trim()];
            jail_mount_input = "";
          }
        }}
      />
      <button
        type="button"
        disabled={!jail_mount_input.trim()}
        onclick={() => {
          if (jail_mount_input.trim()) {
            jail_mount = [...jail_mount, jail_mount_input.trim()];
            jail_mount_input = "";
          }
        }}
        class={cn(
          "px-2",
          "py-1",
          "text-[10px]",
          "rounded-md",
          "bg-accent",
          "text-surface",
          "font-medium",
          "disabled:opacity-40",
          "cursor-pointer",
        )}>+</button
      >
    </div>
  </div>
  <div>
    <span
      class={cn(
        "text-[10px]",
        "uppercase",
        "text-muted",
        "font-semibold",
        "tracking-wider",
        "mb-2",
      )}>{trans("Read-write access")}</span
    >
    <div class={cn("space-y-1", "mb-1")}>
      {#each jail_mount_rw as item, i}
        <div class={cn("flex", "items-center", "gap-1")}>
          <input
            readonly
            value={item}
            class={cn(
              "flex-1",
              "px-2.5",
              "py-1",
              "border",
              "text-xs",
              "rounded-md",
              "bg-surface-2",
              "outline-none",
              "text-fg",
              "border-border",
              "cursor-default",
            )}
          />
          <button
            type="button"
            onclick={() => {
              jail_mount_rw = jail_mount_rw.toSpliced(i, 1);
            }}
            class={cn(
              "px-1.5",
              "py-1",
              "text-[10px]",
              "rounded",
              "text-danger",
              "hover:bg-danger/10",
              "transition-colors",
              "cursor-pointer",
            )}>{trans("Remove")}</button
          >
        </div>
      {/each}
    </div>
    <div class={cn("flex", "items-center", "gap-1")}>
      <input
        bind:value={jail_mount_rw_input}
        placeholder="/path/to/dir"
        class={cn(
          "flex-1",
          "px-2.5",
          "py-1",
          "border",
          "text-xs",
          "rounded-md",
          "bg-surface",
          "outline-none",
          "text-fg",
          "border-border",
          "focus:border-(--accent)",
        )}
        onkeydown={(e) => {
          if (e.key === "Enter" && jail_mount_rw_input.trim()) {
            e.preventDefault();
            jail_mount_rw = [...jail_mount_rw, jail_mount_rw_input.trim()];
            jail_mount_rw_input = "";
          }
        }}
      />
      <button
        type="button"
        disabled={!jail_mount_rw_input.trim()}
        onclick={() => {
          if (jail_mount_rw_input.trim()) {
            jail_mount_rw = [...jail_mount_rw, jail_mount_rw_input.trim()];
            jail_mount_rw_input = "";
          }
        }}
        class={cn(
          "px-2",
          "py-1",
          "text-[10px]",
          "rounded-md",
          "bg-accent",
          "text-surface",
          "font-medium",
          "disabled:opacity-40",
          "cursor-pointer",
        )}>+</button
      >
    </div>
  </div>
</div>
