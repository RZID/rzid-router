<script lang="ts">
  let { title, sub = 'Coming soon' } = $props<{ title: string; sub?: string }>();
</script>

<div class="p-6 animate-fade-in">
  <h1 class="text-lg font-semibold text-white">{title}</h1>
  <p class="text-sm mt-0.5" style="color: var(--text-muted)">{sub}</p>
  <div class="glass mt-6 p-12 flex items-center justify-center animate-slide-up">
    <p class="text-sm" style="color: var(--text-muted)">Under construction</p>
  </div>
</div>
