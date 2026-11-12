import type { LabelGroup, LabelType } from "@/model/annotations/labels-generator";
import type { LabelData } from "@/renderers/labels/labels";
import { Layers } from "@/renderers/layers";
import { Scene, ViewportLayers, type ViewportRenderContext } from "@/renderers/viewport/viewport-renderer";
import { log } from "@/utils/logger";
import { findEl } from "@/utils/node-utils";
import { getLabelsData } from "./label-data";
import { renderLabelGroups } from "./label-groups";
import { createLabelElements } from "./label-markup";

const scene = new Scene<LabelData>();
const layer = ViewportLayers.register({ id: "labels", render: reconcileLabels });
const labelsByGroup = new Map<string, LabelData[]>();
const LABEL_PRIORITY: Record<LabelType, number> = {
  state: 0,
  province: 1,
  river: 2,
  route: 3,
  added: 4,
  burg: 5
};

export function drawLabels(): void {
  if (!Layers.isOn("labels")) return void removeLabels();

  log.time("drawLabels");
  renderLabelGroups();
  findEl("textPaths")?.replaceChildren();
  scene.replace(getLabelsData());
  indexLabelsByGroup();
  layer.render();
  log.timeEnd("drawLabels");
}

export function removeLabels(): void {
  scene.invalidate();
  labelsByGroup.clear();
  const labels = findElement(document, "labels");
  if (labels) labels.replaceChildren();
  const textPaths = findElement(document, "textPaths");
  if (textPaths) textPaths.replaceChildren();
}

// Re-materialize a single edited label, leaving the rest of the layer untouched
export function redrawLabel(label: LabelData): void {
  if (!scene.valid || !Layers.isOn("labels")) return;

  const previous = scene.get(label.id);
  if (previous) unindexLabel(previous);
  removeMaterialized(label.id, document);

  const stored = { ...label };
  scene.set(stored);
  indexLabel(stored);
  materializeLabel(stored, ViewportLayers.getContext());
  resolveLabelCollisions(document);
}

export function getSceneLabel(type: LabelType, id: number): LabelData | undefined {
  return scene.get(`${type}Label${id}`);
}

export function getVisibleLabels(): LabelData[] {
  if (!scene.valid || !Layers.isOn("labels")) return [];
  const bounds = ViewportLayers.getVisibleBounds();
  const visibleGroups = new Set(
    options.map.labels.groups.filter(group => isGroupVisible({ group, bounds })).map(({ name }) => name)
  );
  return [...scene.values()].filter(label => visibleGroups.has(label.group) && isLabelVisible(bounds, label));
}

function materializeLabel(label: LabelData, context: ViewportRenderContext): void {
  const groupOptions = options.map.labels.groups.find(({ name }) => name === label.group);
  if (!groupOptions || !isGroupVisible({ group: groupOptions, bounds: context.bounds })) return;
  if (!isLabelVisible(context.bounds, label)) return;

  const group = findElement(context.root, "labels")?.querySelector(
    `:scope > [data-group="${CSS.escape(label.group)}"]`
  );
  const textPaths = findElement(context.root, "textPaths");
  if (!group || !textPaths) return;

  materialize(label, group, textPaths);
}

function materialize(label: LabelData, group: Element, textPaths: Element): void {
  const { text, path } = createLabelElements(label, group.ownerDocument);
  if (path) textPaths.appendChild(path);
  group.appendChild(text);
}

function reconcileLabels(context: ViewportRenderContext): void {
  if (!scene.valid || !Layers.isOn("labels")) return;
  const labels = findElement(context.root, "labels");
  const textPaths = findElement(context.root, "textPaths");
  if (!labels || !textPaths) return;

  for (const group of options.map.labels.groups) reconcileGroup(labels, textPaths, group.name, context);
  resolveLabelCollisions(context.root);
}

function reconcileGroup(labels: Element, textPaths: Element, groupName: string, context: ViewportRenderContext): void {
  const group = labels.querySelector<SVGGElement>(`:scope > [data-group="${CSS.escape(groupName)}"]`);
  const groupOptions = options.map.labels.groups.find(group => group.name === groupName);
  if (!group || !groupOptions) return;

  const isVisible = isGroupVisible({ group: groupOptions, bounds: context.bounds });
  const visibleLabels = isVisible
    ? (labelsByGroup.get(groupName) || []).filter(label => isLabelVisible(context.bounds, label))
    : [];
  const visibleIds = new Set(visibleLabels.map(label => label.id));

  for (const child of Array.from(group.children)) {
    if (visibleIds.has(child.id)) continue;
    removeMaterialized(child.id, context.root);
  }

  for (const label of visibleLabels) {
    const isMaterialized = group.querySelector<SVGTextElement>(`#${label.id}`);
    if (!isMaterialized) materialize(label, group, textPaths);
  }
}

function isGroupVisible({ group, bounds }: { group: LabelGroup; bounds: ViewportRenderContext["bounds"] }): boolean {
  if (group.active === false) return false;
  if (!options.app.labels.showAll) {
    if (group.zoom.min !== null && bounds.scale < group.zoom.min) return false;
    if (group.zoom.max !== null && bounds.scale > group.zoom.max) return false;
  }
  const dependency = group.layerDependency;
  return !dependency || !Layers.has(dependency) || Layers.isOn(dependency);
}

function isLabelVisible(bounds: ViewportRenderContext["bounds"], label: LabelData): boolean {
  if (label.hidden) return false;
  const x = label.anchor[0] + (label.dx || 0);
  const y = label.anchor[1] + (label.dy || 0);
  return x >= bounds.x0 && x <= bounds.x1 && y >= bounds.y0 && y <= bounds.y1;
}

function removeMaterialized(id: string, root: ParentNode): void {
  findElement(root, id)?.remove();
  findElement(root, `textPath_${id}`)?.remove();
}

function findElement(root: ParentNode, id: string): Element | null {
  if (root instanceof Element && root.id === id) return root;
  return root.querySelector(`#${CSS.escape(id)}`);
}

interface LabelBox {
  id: string;
  type: LabelType;
  text: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Keep the first label in priority order and hide only labels that would overlap it. */
export function chooseNonOverlappingLabels<T extends LabelBox>(labels: T[], gap = 1): T[] {
  const ranked = [...labels].sort((left, right) => {
    return (
      LABEL_PRIORITY[left.type] - LABEL_PRIORITY[right.type] ||
      Number(hasCJK(right.text)) - Number(hasCJK(left.text)) ||
      right.text.length - left.text.length ||
      left.y1 - right.y1 ||
      left.x1 - right.x1 ||
      left.id.localeCompare(right.id)
    );
  });
  const accepted: T[] = [];

  for (const label of ranked) {
    const overlaps = accepted.some(
      other =>
        Math.min(label.x2, other.x2) - Math.max(label.x1, other.x1) > gap &&
        Math.min(label.y2, other.y2) - Math.max(label.y1, other.y1) > gap
    );
    if (!overlaps) accepted.push(label);
  }

  return accepted;
}

function hasCJK(text: string): boolean {
  return /[\u2e80-\u9fff\uac00-\ud7af\uf900-\ufaff\uff01-\uff60]/u.test(text);
}

function resolveLabelCollisions(root: ParentNode): void {
  const labels = root.querySelector("#labels");
  if (!labels) return;

  const elements = Array.from(labels.querySelectorAll<SVGTextElement>('text[data-label-managed="true"]'));
  for (const element of elements) element.style.display = "";

  const boxes: Array<LabelBox & { element: SVGTextElement }> = [];
  for (const element of elements) {
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) continue;
    boxes.push({
      id: element.id,
      type: element.dataset.labelType as LabelType,
      text: element.textContent || "",
      x1: rect.left,
      y1: rect.top,
      x2: rect.right,
      y2: rect.bottom,
      element
    });
  }

  const accepted = new Set(chooseNonOverlappingLabels(boxes).map(label => label.id));
  for (const label of boxes) {
    if (!accepted.has(label.id)) label.element.style.display = "none";
  }
}

function indexLabelsByGroup(): void {
  labelsByGroup.clear();
  for (const label of scene.values()) indexLabel(label);
}

function indexLabel(label: LabelData): void {
  const groupLabels = labelsByGroup.get(label.group) || [];
  groupLabels.push(label);
  labelsByGroup.set(label.group, groupLabels);
}

function unindexLabel(label: LabelData): void {
  const groupLabels = labelsByGroup.get(label.group);
  if (!groupLabels) return;
  const index = groupLabels.findIndex(({ id }) => id === label.id);
  if (index !== -1) groupLabels.splice(index, 1);
}
