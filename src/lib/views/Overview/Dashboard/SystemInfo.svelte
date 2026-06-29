<script lang="ts">
  import { cn } from "../../../helpers/classname";

  let {
    board,
    load1,
    load5,
    load15,
    trans,
  }: {
    board: any;
    load1: string;
    load5: string;
    load15: string;
    trans: (k: string) => string;
  } = $props();
</script>

<dl class={cn("grid", "grid-cols-2", "gap-y-3", "gap-x-8", "text-sm")}>
  <div>
    <dt
      class={cn(
        "mb-0.5",
        "text-xs",
        "uppercase",
        "text-muted",
        "tracking-wider",
      )}
    >
      {trans("Hostname")}
    </dt>
    <dd class={cn("font-semibold")}>{board.hostname}</dd>
  </div>
  <div>
    <dt
      class={cn(
        "mb-0.5",
        "text-xs",
        "uppercase",
        "text-muted",
        "tracking-wider",
      )}
    >
      {trans("Model")}
    </dt>
    <dd class={cn("font-medium", "text-xs")}>{board.model}</dd>
  </div>
  <div>
    <dt
      class={cn(
        "mb-0.5",
        "text-xs",
        "uppercase",
        "text-muted",
        "tracking-wider",
      )}
    >
      {trans("Architecture")}
    </dt>
    <dd class={cn("font-medium", "text-xs")}>{board.system}</dd>
  </div>
  {#if board.release?.target}
    <div>
      <dt
        class={cn(
          "mb-0.5",
          "text-xs",
          "uppercase",
          "text-muted",
          "tracking-wider",
        )}
      >
        {trans("Target")}
      </dt>
      <dd class={cn("font-medium", "text-xs")}>{board.release.target}</dd>
    </div>
  {/if}
  <div>
    <dt
      class={cn(
        "mb-0.5",
        "text-xs",
        "uppercase",
        "text-muted",
        "tracking-wider",
      )}
    >
      {trans("Firmware")}
    </dt>
    <dd class={cn("font-semibold", "text-accent")}>{board.release?.version}</dd>
  </div>
  <div>
    <dt
      class={cn(
        "mb-0.5",
        "text-xs",
        "uppercase",
        "text-muted",
        "tracking-wider",
      )}
    >
      {trans("Kernel")}
    </dt>
    <dd class={cn("font-medium")}>{board.kernel}</dd>
  </div>
  <div>
    <dt
      class={cn(
        "mb-0.5",
        "text-xs",
        "uppercase",
        "text-muted",
        "tracking-wider",
      )}
    >
      {trans("Load Average")}
    </dt>
    <dd
      class={cn("font-mono", "text-xs")}
      style="color:{parseFloat(load1) > 1 ? 'var(--warn)' : 'var(--text)'}"
    >
      {load1}
      {load5}
      {load15}
    </dd>
  </div>
</dl>
