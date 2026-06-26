<script lang="ts">
  let { rxRate = "0 B/s", txRate = "0 B/s" } = $props<{ rxRate?: string; txRate?: string }>();
</script>

<div class="glass p-5 animate-slide-up">
  <span class="text-xs font-medium tracking-wider uppercase" style="color: var(--text-muted)">BANDWIDTH — WAN</span>
  <div class="flex gap-6 mt-3">
    <div class="flex-1">
      <span class="text-xs" style="color: var(--text-muted)">Download</span>
      <p class="text-lg font-mono font-semibold" style="color: #00d4aa">{rxRate}</p>
    </div>
    <div class="flex-1">
      <span class="text-xs" style="color: var(--text-muted)">Upload</span>
      <p class="text-lg font-mono font-semibold" style="color: #58a6ff">{txRate}</p>
    </div>
  </div>
</div>
