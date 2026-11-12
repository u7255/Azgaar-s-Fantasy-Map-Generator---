import {
  buildNovelGazetteer,
  NOVEL_GAZETTEER_MODES,
  type NovelGazetteerMode
} from "@/model/localization/novel-gazetteer";
import {
  exportNovelGazetteer,
  NOVEL_GAZETTEER_FORMATS,
  type NovelGazetteerFormat
} from "@/services/io/novel-gazetteer";
import { Dialog } from "@/ui/dialog/dialog";
import { t } from "@/utils/i18n";
import { ensureEl, findEl } from "@/utils/node-utils";
import { escapeHtml } from "@/utils/string-utils";

const DIALOG_ID = "novelGazetteerDialog";
const STYLE_ID = "novelGazetteerStyles";

function modeLabel(mode: NovelGazetteerMode): string {
  if (mode === "source") return t("Original");
  if (mode === "bilingual") return t("Bilingual");
  return t("Chinese");
}

function formatLabel(format: NovelGazetteerFormat): string {
  if (format === "csv") return "CSV";
  if (format === "json") return "JSON";
  return "Markdown";
}

function bindStyle(): void {
  if (findEl(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = /* css */ `
    #${DIALOG_ID} {
      --novel-line: color-mix(in srgb, var(--dark-solid) 18%, transparent);
      box-sizing: border-box;
      width: 100%;
      min-width: 0;
      color: #30343b;
      font: 0.95em/1.35 var(--sans-serif);
    }
    #${DIALOG_ID} button,
    #${DIALOG_ID} select,
    #${DIALOG_ID} input {
      font-family: var(--sans-serif);
    }
    #${DIALOG_ID} .novel-toolbar {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.7em;
      align-items: end;
    }
    #${DIALOG_ID} .novel-control {
      display: grid;
      gap: 0.2em;
      min-width: 0;
    }
    #${DIALOG_ID} .novel-control > span {
      color: #5d596c;
      font-size: 0.78em;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0;
    }
    #${DIALOG_ID} select {
      min-width: 0;
      width: 100%;
      padding: 0.28em 0.3em;
      background: #fff;
    }
    #${DIALOG_ID} .novel-preview-toggle {
      display: flex;
      align-items: center;
      gap: 0.45em;
      margin-top: 0.8em;
      color: #4b4654;
    }
    #${DIALOG_ID} .novel-preview-toggle input {
      margin: 0;
    }
    #${DIALOG_ID} .novel-summary {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 0.3em 0.65em;
      min-width: 0;
      margin: 0.9em 0 0.7em;
      padding: 0.5em 0.6em;
      border: 1px solid var(--novel-line);
      background: color-mix(in srgb, var(--bg-light) 82%, white);
    }
    #${DIALOG_ID} .novel-summary strong {
      font-size: 1.2em;
    }
    #${DIALOG_ID} .novel-summary span {
      color: #625d6d;
      font-size: 0.82em;
    }
    #${DIALOG_ID} .novel-actions {
      display: flex;
      align-items: center;
      gap: 0.5em;
      flex-wrap: wrap;
    }
    #${DIALOG_ID} .novel-actions button {
      padding: 0.35em 0.7em;
      border: 1px solid #b9b4c3;
      background: #f7f6f9;
      color: #3e3948;
      cursor: pointer;
    }
    #${DIALOG_ID} .novel-actions button:hover:not(:disabled) {
      background: #ebe8f1;
    }
    #${DIALOG_ID} .novel-actions button:disabled {
      cursor: default;
      opacity: 0.45;
    }
    #${DIALOG_ID} .novel-status {
      min-height: 1.35em;
      margin-top: 0.55em;
      color: #625d6d;
      font-size: 0.8em;
      overflow-wrap: anywhere;
    }
    @media (max-width: 520px) {
      #${DIALOG_ID} .novel-toolbar {
        grid-template-columns: 1fr;
      }
    }
  `;
  document.head.append(style);
}

class NovelGazetteerController {
  private format: NovelGazetteerFormat = "markdown";
  private mode: NovelGazetteerMode = "zh";
  private includePreview = false;

  open(): void {
    bindStyle();
    let root = findEl<HTMLElement>(DIALOG_ID);
    if (!root) {
      root = document.createElement("div");
      root.id = DIALOG_ID;
      ensureEl("dialogs").append(root);
      this.bindEvents(root);
    }
    this.render(root);
    Dialog.open(DIALOG_ID, {
      title: t("Novel Gazetteer"),
      width: "min(42em, calc(100vw - 2em))",
      height: "auto",
      closeOnEscape: true
    });
  }

  private bindEvents(root: HTMLElement): void {
    root.addEventListener("change", event => {
      const target = event.target as HTMLInputElement | HTMLSelectElement;
      if (
        target.id === "novelGazetteerFormat" &&
        NOVEL_GAZETTEER_FORMATS.includes(target.value as NovelGazetteerFormat)
      ) {
        this.format = target.value as NovelGazetteerFormat;
      } else if (
        target.id === "novelGazetteerMode" &&
        NOVEL_GAZETTEER_MODES.includes(target.value as NovelGazetteerMode)
      ) {
        this.mode = target.value as NovelGazetteerMode;
      } else if (target.id === "novelGazetteerIncludePreview") {
        this.includePreview = (target as HTMLInputElement).checked;
      } else {
        return;
      }
      this.render(root);
    });

    root.addEventListener("click", event => {
      if ((event.target as HTMLElement).id !== "novelGazetteerExport") return;
      this.export(root);
    });
  }

  private render(root: HTMLElement, status = ""): void {
    const document = buildNovelGazetteer({ mode: this.mode, includePreview: this.includePreview });
    const count = document.entries.length;
    const previewStatus = this.includePreview ? t("Unconfirmed previews included") : t("Unconfirmed previews excluded");

    root.innerHTML = /* html */ `
      <div class="novel-toolbar">
        <label class="novel-control">
          <span>${t("Format")}</span>
          <select id="novelGazetteerFormat">
            ${NOVEL_GAZETTEER_FORMATS.map(
              format =>
                `<option value="${format}" ${format === this.format ? "selected" : ""}>${formatLabel(format)}</option>`
            ).join("")}
          </select>
        </label>
        <label class="novel-control">
          <span>${t("Export mode")}</span>
          <select id="novelGazetteerMode">
            ${NOVEL_GAZETTEER_MODES.map(
              mode => `<option value="${mode}" ${mode === this.mode ? "selected" : ""}>${modeLabel(mode)}</option>`
            ).join("")}
          </select>
        </label>
      </div>
      <label class="novel-preview-toggle">
        <input class="native" id="novelGazetteerIncludePreview" type="checkbox" ${this.includePreview ? "checked" : ""} />
        <span>${t("Include unconfirmed previews")}</span>
      </label>
      <div class="novel-summary">
        <strong>${count}</strong>
        <span>${t("Entries")}</span>
        <span>${previewStatus}</span>
      </div>
      <div class="novel-actions">
        <button id="novelGazetteerExport" type="button" ${count ? "" : "disabled"}>${t("Export novel gazetteer")}</button>
      </div>
      <div class="novel-status" role="status" aria-live="polite">${escapeHtml(status || (count ? "" : t("No entities to export")))}</div>
    `;
  }

  private export(root: HTMLElement): void {
    const document = buildNovelGazetteer({ mode: this.mode, includePreview: this.includePreview });
    if (!document.entries.length) {
      this.render(root, t("No entities to export"));
      return;
    }
    const fileName = exportNovelGazetteer(document, this.format);
    this.render(root, t("Exported {{file}}", { file: fileName }));
  }
}

export const NovelGazetteer = new NovelGazetteerController();
