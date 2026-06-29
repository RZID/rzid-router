<script lang="ts">
  import { cn } from "../../helpers/classname";
  import { t as _t, getLocale, onLocaleChange } from "../../i18n";

  let {
    flashFileSize,
    flashValid,
    flashForceable,
    flashTestCode,
    flashTestStderr,
    flashKeepSettings,
    flashAllowBackup,
    flashForce,
    flashSkipOrig,
    flashBackupPkgs,
    oncancel,
    onconfirm,
  }: {
    flashFileSize: number;
    flashValid: boolean;
    flashForceable: boolean;
    flashTestCode: number;
    flashTestStderr: string;
    flashKeepSettings: boolean;
    flashAllowBackup: boolean;
    flashForce: boolean;
    flashSkipOrig: boolean;
    flashBackupPkgs: boolean;
    oncancel: () => void;
    onconfirm: () => void;
  } = $props();

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
      "overflow-y-auto",
    )}
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => {
      if (e.key === "Escape") oncancel();
    }}
    role="dialog"
  >
    <h3 class={cn("text-sm", "font-semibold", "text-white", "mb-2")}>
      {trans("Flash image?")}
    </h3>
    <p class={cn("text-xs", "text-muted", "mb-3")}>
      {trans(
        "The flash image was uploaded. Click 'Continue' below to start the flash procedure.",
      )}
    </p>
    {#if flashFileSize > 0}<ul
        class={cn("text-xs", "text-muted", "space-y-1", "mb-3")}
      >
        <li>{trans("Size")}: {(flashFileSize / 1048576).toFixed(2)} MB</li>
      </ul>{/if}
    <label
      class={cn("flex", "items-center", "gap-2", "mb-2", "cursor-pointer")}
    >
      <input
        type="checkbox"
        bind:checked={flashKeepSettings}
        class={cn("accent-accent")}
        disabled={!flashAllowBackup}
      />
      <span class={cn("text-xs", "text-fg")}
        >{trans("Keep settings and retain the current configuration")}</span
      >
    </label>
    {#if flashKeepSettings && flashAllowBackup}
      <label
        class={cn(
          "flex",
          "items-center",
          "gap-2",
          "ml-5",
          "mb-1",
          "cursor-pointer",
        )}
      >
        <input
          type="checkbox"
          bind:checked={flashSkipOrig}
          class={cn("accent-accent")}
        />
        <span class={cn("text-xs", "text-muted")}
          >{trans(
            "Skip from backup files that are equal to those in /rom",
          )}</span
        >
      </label>
      <label
        class={cn(
          "flex",
          "items-center",
          "gap-2",
          "ml-5",
          "mb-2",
          "cursor-pointer",
        )}
      >
        <input
          type="checkbox"
          bind:checked={flashBackupPkgs}
          class={cn("accent-accent")}
        />
        <span class={cn("text-xs", "text-muted")}
          >{trans(
            "Include in backup a list of current installed packages",
          )}</span
        >
      </label>
    {/if}
    {#if flashTestCode !== 0}
      <div
        class={cn(
          "p-3",
          "rounded-lg",
          "bg-danger/10",
          "border",
          "border-danger/20",
          "mb-2",
        )}
      >
        <p class={cn("text-xs", "text-danger", "font-semibold", "mb-1")}>
          {trans("Image check failed:")}
        </p>
        <pre
          class={cn(
            "text-[10px]",
            "text-danger",
            "whitespace-pre-wrap",
            "font-mono",
          )}>{flashTestStderr}</pre>
      </div>
    {/if}
    {#if !flashValid}
      <div
        class={cn(
          "p-3",
          "rounded-lg",
          "bg-warn/10",
          "border",
          "border-warn/20",
          "mb-2",
        )}
      >
        <p class={cn("text-xs", "text-warn")}>
          {trans(
            "The uploaded image file does not contain a supported format.",
          )}
        </p>
      </div>
    {/if}
    {#if (!flashValid || flashTestCode !== 0) && flashForceable}
      <label
        class={cn(
          "flex",
          "items-center",
          "gap-2",
          "p-3",
          "rounded-lg",
          "bg-danger/10",
          "border",
          "border-danger/20",
          "mb-2",
          "cursor-pointer",
        )}
      >
        <input
          type="checkbox"
          bind:checked={flashForce}
          class={cn("accent-danger")}
        />
        <div>
          <span class={cn("text-xs", "text-danger", "font-semibold")}
            >{trans("Force upgrade")}</span
          >
          <p class={cn("text-[10px]", "text-danger", "mt-0.5")}>
            {trans(
              "Select 'Force upgrade' to flash the image even if the image format check fails.",
            )}
          </p>
        </div>
      </label>
    {/if}
    <div class={cn("flex", "items-center", "justify-end", "gap-2", "mt-2")}>
      <button
        onclick={oncancel}
        class={cn(
          "px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-surface-2 text-muted transition-all duration-150 cursor-pointer hover:text-fg",
        )}>{trans("Cancel")}</button
      >
      <button
        onclick={onconfirm}
        disabled={(!flashValid || flashTestCode !== 0) && !flashForce}
        class={cn(
          "px-3 py-1.5 rounded-lg text-xs font-medium border bg-accent/10 text-accent border-accent/20 transition-all duration-150 cursor-pointer hover:bg-accent/15 hover:border-accent/30 disabled:opacity-30 disabled:cursor-not-allowed",
        )}>{trans("Continue")}</button
      >
    </div>
  </div>
</div>
