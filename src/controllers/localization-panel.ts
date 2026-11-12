import { Controllers } from "@/controllers";
import { NovelGazetteer } from "@/controllers/novel-gazetteer";
import { LOCALIZED_NAME_DISPLAY_MODES, type LocalizedNameDisplayMode } from "@/model/localization/localized-names";
import { CHINESE_MAP_FONTS, isChineseMapFontId } from "@/model/localization/map-fonts";
import {
  filterNameReviewRows,
  type NameReviewRow,
  type NameReviewStats,
  nameReview
} from "@/model/localization/name-review";
import { Options } from "@/model/options/options-model";
import { drawLabels } from "@/renderers/labels/labels-renderer";
import { is3dView } from "@/renderers/view-mode";
import { Dialog } from "@/ui/dialog/dialog";
import { t } from "@/utils/i18n";
import { ensureEl, findEl } from "@/utils/node-utils";
import { escapeHtml } from "@/utils/string-utils";

const PANEL_ID = "localizationPanel";
const STYLE_ID = "localizationPanelStyles";
const STATUS_ID = "localizationPanelStatus";
const PAGE_SIZE = 50;

const FILTERS = ["all", "stale", "conflict", "missing"] as const;
type ReviewFilter = (typeof FILTERS)[number];

const FONT_LABELS: Record<string, string> = {
  "song-ke": t("Song Seal"),
  "title-song": t("Display Song"),
  "wen-kai": t("Literary Kai"),
  "xing-shu": t("Running Script")
};

function displayModeLabel(mode: LocalizedNameDisplayMode): string {
  if (mode === "source") return t("Original");
  if (mode === "bilingual") return t("Bilingual");
  return t("Chinese");
}

function statusLabel(row: NameReviewRow): string {
  if (row.isConflict) return t("Conflict");
  if (row.isStale) return t("Stale");
  if (row.candidate?.status === "confirmed") return t("Confirmed");
  if (row.candidate?.status === "preview") return t("Preview");
  return t("No suggestion");
}

function renderStats(stats: NameReviewStats): string {
  const entries: Array<[string, number, string]> = [
    [t("Total"), stats.total, "total"],
    [t("Confirmed"), stats.confirmed, "confirmed"],
    [t("Preview"), stats.preview, "preview"],
    [t("Stale"), stats.stale, "stale"],
    [t("Conflict"), stats.conflict, "conflict"],
    [t("No suggestion"), stats.missing, "missing"]
  ];
  return entries
    .map(
      ([label, value, kind]) =>
        `<div class="localization-stat localization-stat-${kind}"><strong>${value}</strong><span>${escapeHtml(label)}</span></div>`
    )
    .join("");
}

function renderRow(row: NameReviewRow): string {
  const suggestion = row.candidateText || "—";
  const status = statusLabel(row);
  const source = row.originalText || "—";
  const current = row.currentText || "—";
  const canAccept = Boolean(row.candidate && row.candidate.status === "preview");
  const canClear = row.hasLocalizedName;
  const conflict = row.isConflict
    ? `<span class="localization-row-note">${escapeHtml(t("Shared with {{sources}}", { sources: row.conflictSources.join(", ") }))}</span>`
    : "";

  return /* html */ `
    <div class="localization-row ${row.isStale ? "is-stale" : ""} ${row.isConflict ? "is-conflict" : ""}" data-key="${escapeHtml(row.key)}">
      <div class="localization-cell localization-kind" data-label="${t("Kind")}">
        <span class="localization-kind-name">${escapeHtml(row.kind)}</span>
        <span class="localization-key">${escapeHtml(row.key)}</span>
      </div>
      <div class="localization-cell" data-label="${t("Status")}">
        <span class="localization-badge localization-badge-${row.isConflict ? "conflict" : row.isStale ? "stale" : row.candidate?.status || "empty"}">${escapeHtml(status)}</span>
        ${conflict}
      </div>
      <div class="localization-cell" data-label="${t("Current display")}">
        <span class="localization-value">${escapeHtml(current)}</span>
      </div>
      <div class="localization-cell" data-label="${t("Original")}">
        <span class="localization-source">${escapeHtml(source)}</span>
      </div>
      <div class="localization-cell" data-label="${t("Suggestion")}">
        <span class="localization-value">${escapeHtml(suggestion)}</span>
      </div>
      <div class="localization-cell localization-actions" data-label="${t("Actions")}">
        <button type="button" class="icon-check-empty sideButton" data-action="accept" data-key="${escapeHtml(row.key)}" data-tip="${t("Accept")}" aria-label="${t("Accept")}" ${canAccept ? "" : "disabled"}></button>
        <button type="button" class="icon-pencil sideButton" data-action="edit" data-key="${escapeHtml(row.key)}" data-tip="${t("Edit")}" aria-label="${t("Edit")}"></button>
        <button type="button" class="icon-cw sideButton" data-action="regenerate" data-key="${escapeHtml(row.key)}" data-tip="${t("Regenerate")}" aria-label="${t("Regenerate")}" ${row.canRegenerate ? "" : "disabled"}></button>
        <button type="button" class="icon-trash-empty sideButton" data-action="clear" data-key="${escapeHtml(row.key)}" data-tip="${t("Clear")}" aria-label="${t("Clear")}" ${canClear ? "" : "disabled"}></button>
      </div>
    </div>
  `;
}

function renderTable(rows: NameReviewRow[]): string {
  if (!rows.length) {
    return `<div class="localization-empty">${t("No names match this filter.")}</div>`;
  }
  return /* html */ `
    <div class="localization-table-head" aria-hidden="true">
      <span>${t("Kind")}</span>
      <span>${t("Status")}</span>
      <span>${t("Current display")}</span>
      <span>${t("Original")}</span>
      <span>${t("Suggestion")}</span>
      <span>${t("Actions")}</span>
    </div>
    <div class="localization-table-body">${rows.map(renderRow).join("")}</div>
  `;
}

function getSelectedMode(): LocalizedNameDisplayMode {
  const value = options.map.localization.displayMode;
  return LOCALIZED_NAME_DISPLAY_MODES.includes(value as LocalizedNameDisplayMode)
    ? (value as LocalizedNameDisplayMode)
    : "zh";
}

function refreshMap(): void {
  if (typeof pack !== "undefined" && pack.cells?.i?.length && findEl("viewbox")) {
    drawLabels();
  }
  if (is3dView()) void Controllers.View3d.redraw();
}

function renderPanel(filter: ReviewFilter, page: number, message = ""): { page: number; totalPages: number } {
  const root = ensureEl(PANEL_ID);
  const rows = nameReview.rows();
  const stats = nameReview.stats(rows);
  const visibleRows = filterNameReviewRows(rows, filter);
  const totalPages = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const pageRows = visibleRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const mode = getSelectedMode();
  const mapFont = options.map.localization.mapFont;

  root.innerHTML = /* html */ `
    <div class="localization-toolbar">
      <label class="localization-control">
        <span>${t("Display mode")}</span>
        <select id="localizationDisplayMode">
          ${LOCALIZED_NAME_DISPLAY_MODES.map(
            value =>
              `<option value="${value}" ${value === mode ? "selected" : ""}>${escapeHtml(displayModeLabel(value))}</option>`
          ).join("")}
        </select>
      </label>
      <label class="localization-control">
        <span>${t("Map font")}</span>
        <select id="localizationMapFont">
          ${CHINESE_MAP_FONTS.map(
            font =>
              `<option value="${font.id}" ${font.id === mapFont ? "selected" : ""}>${escapeHtml(FONT_LABELS[font.id] || font.label)}</option>`
          ).join("")}
        </select>
      </label>
      <label class="localization-control">
        <span>${t("Filter")}</span>
        <select id="localizationFilter">
          <option value="all" ${filter === "all" ? "selected" : ""}>${t("All")}</option>
          <option value="stale" ${filter === "stale" ? "selected" : ""}>${t("Stale")}</option>
          <option value="conflict" ${filter === "conflict" ? "selected" : ""}>${t("Conflict")}</option>
          <option value="missing" ${filter === "missing" ? "selected" : ""}>${t("No suggestion")}</option>
        </select>
      </label>
    </div>
    <div class="localization-stats">${renderStats(stats)}</div>
    <div class="localization-actions">
      <button type="button" id="localizationGenerateMissing">${t("Generate missing")}</button>
      <button type="button" id="localizationApplyPreviews">${t("Apply previews")}</button>
      <button type="button" id="localizationUndo" ${nameReview.canUndo() ? "" : "disabled"}>${t("Undo last batch")}</button>
      <button type="button" id="localizationGazetteer" data-tip="${t("Export a gazetteer for a novel, game or world bible")}">${t("Novel Gazetteer")}</button>
    </div>
    <div id="${STATUS_ID}" role="status" aria-live="polite">${escapeHtml(message)}</div>
    ${renderTable(pageRows)}
    <div class="localization-pagination">
      <button type="button" data-page="${currentPage - 1}" ${currentPage <= 1 ? "disabled" : ""}>${t("Previous")}</button>
      <span>${t("Page {{page}} of {{total}}", { page: currentPage, total: totalPages })}</span>
      <button type="button" data-page="${currentPage + 1}" ${currentPage >= totalPages ? "disabled" : ""}>${t("Next")}</button>
    </div>
  `;
  return { page: currentPage, totalPages };
}

function bindStyle(): void {
  if (findEl(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = /* css */ `
    #localizationPanel {
      --localization-line: color-mix(in srgb, var(--dark-solid) 18%, transparent);
      box-sizing: border-box;
      width: 100%;
      min-width: 0;
      color: #30343b;
      user-select: text;
      font: 0.95em/1.35 var(--sans-serif);
    }
    #localizationPanel button,
    #localizationPanel select {
      font-family: var(--sans-serif);
    }
    #localizationPanel .localization-toolbar {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.7em;
      align-items: end;
    }
    #localizationPanel .localization-control {
      display: grid;
      gap: 0.2em;
      min-width: 0;
    }
    #localizationPanel .localization-control > span {
      color: #5d596c;
      font-size: 0.78em;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0;
    }
    #localizationPanel select {
      min-width: 0;
      width: 100%;
      padding: 0.28em 0.3em;
      background: #fff;
    }
    #localizationPanel .localization-stats {
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 0.35em;
      margin: 0.9em 0 0.7em;
    }
    #localizationPanel .localization-stat {
      display: grid;
      gap: 0.1em;
      min-width: 0;
      padding: 0.4em 0.5em;
      border: 1px solid var(--localization-line);
      background: color-mix(in srgb, var(--bg-light) 82%, white);
    }
    #localizationPanel .localization-stat strong {
      font-size: 1.2em;
    }
    #localizationPanel .localization-stat span {
      overflow: hidden;
      color: #625d6d;
      font-size: 0.72em;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    #localizationPanel .localization-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4em;
      margin-bottom: 0.55em;
    }
    #localizationPanel .localization-actions button {
      padding: 0.35em 0.65em;
      border: 1px solid #b9b4c3;
      background: #f7f6f9;
      color: #3e3948;
      cursor: pointer;
    }
    #localizationPanel .localization-actions button:hover:not(:disabled) {
      background: #ebe8f1;
    }
    #localizationPanel .localization-actions button:disabled,
    #localizationPanel .localization-actions button[disabled] {
      cursor: default;
      opacity: 0.45;
    }
    #localizationPanel #${STATUS_ID} {
      min-height: 1.35em;
      margin-bottom: 0.45em;
      color: #625d6d;
      font-size: 0.78em;
    }
    #localizationPanel .localization-table-head,
    #localizationPanel .localization-row {
      display: grid;
      grid-template-columns: minmax(7em, 1.1fr) minmax(6.5em, 0.85fr) minmax(8em, 1.3fr) minmax(8em, 1.3fr) minmax(8em, 1.3fr) minmax(7.5em, auto);
      gap: 0.5em;
      align-items: center;
      min-width: 0;
    }
    #localizationPanel .localization-table-head {
      padding: 0.3em 0.5em;
      border-bottom: 1px solid var(--localization-line);
      color: #625d6d;
      font-size: 0.72em;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0;
    }
    #localizationPanel .localization-table-body {
      max-height: min(28em, 52vh);
      overflow: auto;
    }
    #localizationPanel .localization-row {
      padding: 0.45em 0.5em;
      border-bottom: 1px solid var(--localization-line);
    }
    #localizationPanel .localization-row.is-stale {
      background: color-mix(in srgb, #d49b36 8%, transparent);
    }
    #localizationPanel .localization-row.is-conflict {
      background: color-mix(in srgb, #bf4b54 8%, transparent);
    }
    #localizationPanel .localization-cell {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.2em;
      min-width: 0;
    }
    #localizationPanel .localization-kind {
      display: grid;
      gap: 0.1em;
    }
    #localizationPanel .localization-kind-name,
    #localizationPanel .localization-value,
    #localizationPanel .localization-source {
      overflow-wrap: anywhere;
    }
    #localizationPanel .localization-kind-name {
      font-weight: 700;
    }
    #localizationPanel .localization-key {
      color: #777184;
      font: 0.72em var(--monospace);
    }
    #localizationPanel .localization-source {
      color: #5c5668;
      font-size: 0.88em;
    }
    #localizationPanel .localization-badge {
      display: inline-block;
      padding: 0.12em 0.35em;
      border: 1px solid var(--localization-line);
      color: #625d6d;
      font-size: 0.72em;
      font-weight: 700;
    }
    #localizationPanel .localization-badge-confirmed { color: #2b6e4e; border-color: #7eb59a; }
    #localizationPanel .localization-badge-preview { color: #735a22; border-color: #d5b96d; }
    #localizationPanel .localization-badge-stale { color: #8a5a16; border-color: #d49b36; }
    #localizationPanel .localization-badge-conflict { color: #8e2f39; border-color: #bf4b54; }
    #localizationPanel .localization-row-note {
      flex-basis: 100%;
      color: #8e2f39;
      font-size: 0.7em;
    }
    #localizationPanel .localization-actions {
      justify-content: flex-end;
      gap: 0.15em;
    }
    #localizationPanel .localization-actions button {
      padding: 0.2em 0.35em;
    }
    #localizationPanel .localization-empty {
      padding: 1.2em 0;
      color: #777184;
      text-align: center;
    }
    #localizationPanel .localization-pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.6em;
      padding: 0.55em 0 0.2em;
      color: #625d6d;
      font-size: 0.78em;
    }
    #localizationPanel .localization-pagination button {
      padding: 0.2em 0.5em;
      border: 1px solid #b9b4c3;
      background: #f7f6f9;
    }
    @media (max-width: 720px) {
      #localizationPanel .localization-toolbar {
        grid-template-columns: 1fr;
      }
      #localizationPanel .localization-stats {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      #localizationPanel .localization-table-head {
        display: none;
      }
      #localizationPanel .localization-row {
        grid-template-columns: 1fr;
        gap: 0.35em;
        padding: 0.6em 0;
      }
      #localizationPanel .localization-cell::before {
        content: attr(data-label) ": ";
        flex: 0 0 7.8em;
        color: #777184;
        font-size: 0.72em;
        font-weight: 700;
        text-transform: uppercase;
      }
      #localizationPanel .localization-kind {
        display: flex;
        align-items: baseline;
      }
      #localizationPanel .localization-kind::before {
        content: attr(data-label) ": ";
      }
      #localizationPanel .localization-actions {
        justify-content: flex-start;
      }
    }
    @media (max-width: 480px) {
      #localizationPanel .localization-stats {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      #localizationPanel .localization-cell::before {
        flex-basis: 6.5em;
      }
    }
  `;
  document.head.append(style);
}

class LocalizationPanelController {
  private filter: ReviewFilter = "all";
  private page = 1;
  private root?: HTMLElement;
  private abortController?: AbortController;

  open(): void {
    bindStyle();
    if (!this.root?.isConnected) {
      let root = findEl<HTMLElement>(PANEL_ID);
      if (!root) {
        root = document.createElement("div");
        root.id = PANEL_ID;
        ensureEl("dialogs").append(root);
      }
      this.root = root;
      this.bindEvents();
    }
    this.page = 1;
    this.render();
    Dialog.open(PANEL_ID, {
      title: t("Deep Localization"),
      width: "min(76em, calc(100vw - 2em))",
      height: Math.max(240, Math.min(700, window.innerHeight - 40)),
      resizable: true,
      closeOnEscape: true,
      onClose: () => {
        this.abortController?.abort();
        this.abortController = undefined;
        this.root = undefined;
      }
    });
  }

  close(): void {
    Dialog.close(PANEL_ID);
  }

  private bindEvents(): void {
    const root = this.root;
    if (!root) return;
    this.abortController?.abort();
    this.abortController = new AbortController();
    const listenerOptions = { signal: this.abortController.signal };

    root.addEventListener(
      "change",
      event => {
        const target = event.target as HTMLSelectElement;
        if (target.id === "localizationDisplayMode") {
          const mode = target.value as LocalizedNameDisplayMode;
          if (!LOCALIZED_NAME_DISPLAY_MODES.includes(mode)) return;
          options.map.localization.displayMode = mode;
          Options.save();
          refreshMap();
          this.render(t("Display mode updated"));
        } else if (target.id === "localizationMapFont" && isChineseMapFontId(target.value)) {
          options.map.localization.mapFont = target.value;
          Options.save();
          refreshMap();
          this.render(t("Map font updated"));
        } else if (target.id === "localizationFilter" && FILTERS.includes(target.value as ReviewFilter)) {
          this.filter = target.value as ReviewFilter;
          this.page = 1;
          this.render();
        }
      },
      listenerOptions
    );

    root.addEventListener(
      "click",
      event => {
        const action = (event.target as Element).closest<HTMLElement>("[data-action]");
        if (action) {
          this.runRowAction(action.dataset.action || "", action.dataset.key || "");
          return;
        }
        const pageButton = (event.target as Element).closest<HTMLElement>("[data-page]");
        if (pageButton && !(pageButton as HTMLButtonElement).disabled) {
          this.page = Number(pageButton.dataset.page);
          this.render();
          return;
        }
        const id = (event.target as HTMLElement).id;
        if (id === "localizationGenerateMissing") this.generateMissing();
        else if (id === "localizationApplyPreviews") this.applyPreviews();
        else if (id === "localizationUndo") this.undoLastBatch();
        else if (id === "localizationGazetteer") NovelGazetteer.open();
      },
      listenerOptions
    );
  }

  private render(message = ""): void {
    if (!this.root?.isConnected) return;
    this.page = renderPanel(this.filter, this.page, message).page;
  }

  private runRowAction(action: string, key: string): void {
    const row = nameReview.rows().find(candidate => candidate.key === key);
    if (!row) return;
    if (action === "accept") {
      const changed = nameReview.accept(row);
      if (changed) refreshMap();
      this.render(changed ? t("Name accepted") : t("This name is not ready to accept"));
    } else if (action === "edit") {
      Dialog.prompt(
        t("Enter a reviewed Chinese name"),
        { default: row.candidateText || row.currentText, required: true },
        value => {
          if (nameReview.edit(row, value)) {
            refreshMap();
            this.render(t("Name edited"));
          }
        }
      );
    } else if (action === "regenerate") {
      const changed = nameReview.regenerate(row);
      if (changed) refreshMap();
      this.render(changed ? t("New preview generated") : t("This name cannot be regenerated"));
    } else if (action === "clear") {
      const changed = nameReview.clear(row);
      if (changed) refreshMap();
      this.render(changed ? t("Chinese name cleared") : t("Nothing to clear"));
    }
  }

  private generateMissing(): void {
    const result = nameReview.generateMissing();
    if (result.changed) refreshMap();
    this.render(
      result.changed ? t("Generated {{count}} previews", { count: result.changed }) : t("No missing names to generate")
    );
  }

  private applyPreviews(): void {
    const result = nameReview.applyPreviews();
    if (result.changed) refreshMap();
    this.render(
      result.changed ? t("Applied {{count}} previews", { count: result.changed }) : t("No eligible previews to apply")
    );
  }

  private undoLastBatch(): void {
    const changed = nameReview.undo();
    if (changed) refreshMap();
    this.render(changed ? t("Last batch undone") : t("No batch to undo"));
  }
}

window.addEventListener("map:generated", () => nameReview.discardPendingBatch());

export const LocalizationPanel = new LocalizationPanelController();
