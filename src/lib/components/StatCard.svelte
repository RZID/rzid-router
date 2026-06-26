<script lang="ts">
  let {
    label,
    value,
    sub = "",
    color = "var(--accent)",
    icon = "",
    pulse = false,
  } = $props<{
    label: string;
    value: string;
    sub?: string;
    color?: string;
    icon?: string;
    pulse?: boolean;
  }>();
</script>

<div class="glass p-5 flex flex-col gap-3 animate-slide-up group">
  <div class="flex items-center justify-between">
    <span
      class="text-xs font-medium tracking-wider uppercase"
      style="color: var(--text-muted)">{label}</span
    >
    {#if icon}
      <span
        class="text-base opacity-60 group-hover:opacity-100 transition-opacity"
        >{icon}</span
      >
    {/if}
  </div>
  <div class="flex items-end gap-2">
    <span class="text-2xl font-semibold font-mono" style="color: {color}">
      {#if pulse}
        <span class="inline-flex items-center gap-2">
          <span
            class="w-2 h-2 rounded-full animate-pulse"
            style="background: {color}"
          ></span>
          {value}
        </span>
      {:else}
        {value}
      {/if}
    </span>
    {#if sub}
      <span class="text-xs pb-1" style="color: var(--text-muted)">{sub}</span>
    {/if}
  </div>
</div>
