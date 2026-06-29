<script lang="ts">
  import { cn } from "../../helpers/classname";
  import { execCommand } from "../../api/ubus";
  import { getSession } from "../../api/ubus";
  import { t as _t, getLocale, onLocaleChange } from "../../i18n";

  let {
    restoreFileList,
    oncancel,
  }: { restoreFileList: string; oncancel: () => void } = $props();

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

  let restoreErr = $state("");

  const confirmRestore = async (ev: Event) => {
    const btn = ev.currentTarget as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = trans("Rebooting…");
    const res = await execCommand("/sbin/sysupgrade", [
      "--restore-backup",
      "/tmp/backup.tar.gz",
    ]);
    if (res?.code !== 0) {
      btn.disabled = false;
      btn.textContent = trans("Continue");
      restoreErr = trans("Restore command failed");
      return;
    }
    await execCommand("/sbin/reboot");
    document.body.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0d1117;color:#8b949e;font-family:sans-serif;flex-direction:column;gap:16px"><div class="spinning" style="width:32px;height:32px;border:2px solid #00d4aa;border-top-color:transparent;border-radius:50%;animation:spin .8s linear infinite"></div><p style="font-size:14px">${trans("The system is rebooting now.")}</p><style>@keyframes spin{to{transform:rotate(360deg)}}</style></div>`;
  };
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
  class={cn(
    "fixed",
    "inset-0",
    "z-50",
    "flex",
    "items-center",
    "justify-center",
    "bg-black/60",
  )}
  onclick={oncancel}
  role="presentation"
>
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_interactive_supports_focus -->
  <div
    class={cn(
      "glass",
      "rounded-xl",
      "p-5",
      "max-w-lg",
      "w-full",
      "mx-4",
      "max-h-[80vh]",
      "flex",
      "flex-col",
    )}
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => {
      if (e.key === "Escape") oncancel();
    }}
    role="dialog"
  >
    <h3 class={cn("text-sm", "font-semibold", "text-white", "mb-2")}>
      {trans("Apply backup?")}
    </h3>
    <p class={cn("text-xs", "text-muted", "mb-3")}>
      {trans(
        'The uploaded backup archive appears to be valid and contains the files listed below. Press "Continue" to restore the backup and reboot, or "Cancel" to abort the operation.',
      )}
    </p>
    <pre
      class={cn(
        "flex-1",
        "min-h-0",
        "overflow-y-auto",
        "p-3",
        "rounded-lg",
        "bg-surface",
        "text-[10px]",
        "font-mono",
        "text-muted",
        "mb-3",
        "border",
        "border-border",
      )}>{restoreFileList}</pre>
    {#if restoreErr}<p class={cn("text-xs", "text-danger", "mb-3")}>
        ✗ {restoreErr}
      </p>{/if}
    <div class={cn("flex", "items-center", "justify-end", "gap-2")}>
      <button
        onclick={oncancel}
        class={cn(
          "px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-surface-2 text-muted transition-all duration-150 cursor-pointer hover:text-fg",
        )}>{trans("Cancel")}</button
      >
      <button
        onclick={confirmRestore}
        class={cn(
          "px-3 py-1.5 rounded-lg text-xs font-medium border bg-accent/10 text-accent border-accent/20 transition-all duration-150 cursor-pointer hover:bg-accent/15 hover:border-accent/30",
        )}>{trans("Continue")}</button
      >
    </div>
  </div>
</div>
