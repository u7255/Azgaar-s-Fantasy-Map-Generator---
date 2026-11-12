import { createHash } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { _electron as electron, chromium } from "playwright";
import {
  injectLocalizedNames,
  localizedNamesEqual,
  readLocalizedNames,
  summarizeMap,
  TARGET_STATE_INDEX
} from "./t03-localization-spike-lib.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const family = "Noto Sans SC T03";
const localizedText = "阿尔多里亚";

function option(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function gitOutput(args) {
  return execFileSync("git", ["-c", `safe.directory=${repoRoot}`, ...args], {
    cwd: repoRoot,
    encoding: "utf8"
  }).trim();
}

function write(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
}

async function waitForServer(url, timeout = 120_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Vite is still starting.
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function waitForMap(page) {
  await page.waitForFunction(
    () =>
      typeof window.FMG !== "undefined" &&
      window.FMG.pack?.states?.length > 1 &&
      Boolean(document.getElementById("map")),
    null,
    { timeout: 120_000 }
  );
}

async function saveViaApp(page, filename) {
  return page.evaluate(async name => {
    const root = await navigator.storage.getDirectory();
    let handle;
    Object.defineProperty(window, "showSaveFilePicker", {
      configurable: true,
      value: async () => {
        handle = await root.getFileHandle(name, { create: true });
        return handle;
      }
    });

    await window.FMG.Services.Save.toMachine();
    if (!handle) throw new Error("Save did not request a file handle");
    for (let attempt = 0; attempt < 30; attempt++) {
      const file = await handle.getFile();
      if (file.size > 0) return await file.text();
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const error = document.getElementById("errorBox")?.textContent?.trim();
    const dialog = Array.from(document.querySelectorAll(".dialog"))
      .filter(element => getComputedStyle(element).display !== "none")
      .map(element => element.textContent?.trim())
      .find(Boolean);
    throw new Error(`Save produced an empty file${error ? `: ${error}` : dialog ? `: ${dialog}` : ""}`);
  }, filename);
}

async function saveViaAppStable(page, filename) {
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt++) {
    await page.waitForTimeout(750);
    try {
      return await saveViaApp(page, `${filename.replace(/\.map$/, "")}-attempt-${attempt}.map`);
    } catch (error) {
      lastError = error;
      if (!String(error).includes("empty file")) throw error;
    }
  }
  throw lastError;
}

async function loadMapViaInput(page, mapText) {
  await page.locator("#mapToLoad").setInputFiles({
    name: "T03-roundtrip.map",
    mimeType: "application/octet-stream",
    buffer: Buffer.from(mapText, "utf8")
  });
  await page.waitForFunction(
    ({ index, text }) => window.FMG.pack?.states?.[index]?.localizedNames?.zh?.text === text,
    { index: TARGET_STATE_INDEX, text: localizedText },
    { timeout: 120_000 }
  );
  await page.waitForTimeout(750);
}

async function loadInputMap(page, mapText) {
  const expected = JSON.parse(mapText.split("\r\n")[14])[TARGET_STATE_INDEX]?.name;
  assert(expected, "Input map has no target state name");
  await page.locator("#mapToLoad").setInputFiles({
    name: "T03-input.map",
    mimeType: "application/octet-stream",
    buffer: Buffer.from(mapText, "utf8")
  });
  await page.waitForFunction(
    ({ name, index }) => window.FMG.pack?.states?.[index]?.name === name,
    { name: expected, index: TARGET_STATE_INDEX },
    { timeout: 120_000 }
  );
  await page.waitForTimeout(1_500);
}

async function startBrowser(browserPath) {
  return chromium.launch({
    executablePath: browserPath,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-gpu",
      "--enable-unsafe-swiftshader",
      "--disable-features=Vulkan,Dawn,SkiaGraphite"
    ]
  });
}

async function verifyFont(page, woff2Path) {
  const woff2 = fs.readFileSync(woff2Path);
  const dataUrl = `data:font/woff2;base64,${woff2.toString("base64")}`;
  const proof = await page.evaluate(
    async ({ family, dataUrl, text }) => {
      const src = `url("${dataUrl}")`;
      const face = new FontFace(family, src, { display: "block" });
      await face.load();
      document.fonts.add(face);
      if (!window.FMG.fonts.some(font => font.family === family && font.src === src)) {
        window.FMG.fonts.push({ family, src });
      }
      await document.fonts.load(`64px "${family}"`, text);

      const groupStyle = Object.values(window.FMG.styles.labels.groups).find(group => group?.attrs);
      if (!groupStyle) throw new Error("No label style group is available");
      groupStyle.attrs["font-family"] = family;

      window.FMG.Layers.show("labels");
      const labels = document.getElementById("labels");
      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      group.dataset.group = "t03-font-proof";
      group.id = "t03FontProofGroup";
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.id = "t03LocalizedLabel";
      label.setAttribute("data-label-type", "burg");
      label.setAttribute("x", String(window.FMG.options.map.graph.width / 2));
      label.setAttribute("y", String(window.FMG.options.map.graph.height / 2));
      label.setAttribute("font-family", family);
      label.setAttribute("font-size", "72");
      label.setAttribute("font-weight", "700");
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("fill", "#c2185b");
      label.textContent = text;
      group.append(label);
      labels.append(group);

      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const box = label.getBBox();
      const padding = 28;
      const region = {
        x0: box.x - padding,
        y0: box.y - padding,
        x1: box.x + box.width + padding,
        y1: box.y + box.height + padding,
        width: 512,
        height: 256
      };

      async function render(fontFamily, visible) {
        label.style.display = visible ? "" : "none";
        if (fontFamily) label.setAttribute("font-family", fontFamily);
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

        const url = await window.FMG.Services.ExportMap.getMapURL("png", {
          region,
          noScaleBar: true,
          noVignette: true
        });
        const image = new Image();
        image.src = url;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = region.width;
        canvas.height = region.height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Cannot create PNG verification canvas");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);

        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", pixels));
        return {
          pixels,
          dataUrl: canvas.toDataURL("image/png"),
          hash: Array.from(digest, byte => byte.toString(16).padStart(2, "0")).join("")
        };
      }

      function changedPixels(left, right) {
        let changed = 0;
        for (let index = 0; index < left.length; index += 4) {
          if (
            Math.abs(left[index] - right[index]) > 3 ||
            Math.abs(left[index + 1] - right[index + 1]) > 3 ||
            Math.abs(left[index + 2] - right[index + 2]) > 3 ||
            Math.abs(left[index + 3] - right[index + 3]) > 3
          ) {
            changed++;
          }
        }
        return changed;
      }

      const target = await render(family, true);
      const hidden = await render(family, false);
      const fallback = await render("serif", true);

      label.style.display = "";
      label.setAttribute("font-family", family);
      const svgUrl = await window.FMG.Services.ExportMap.getMapURL("svg", { fullMap: true });
      const svgText = await (await fetch(svgUrl)).text();
      URL.revokeObjectURL(svgUrl);

      return {
        fontStatus: face.status,
        fontCheck: document.fonts.check(`64px "${family}"`, text),
        box: { x: box.x, y: box.y, width: box.width, height: box.height },
        png: {
          hash: target.hash,
          hiddenHash: hidden.hash,
          fallbackHash: fallback.hash,
          textPixels: changedPixels(target.pixels, hidden.pixels),
          fontShapeDiffPixels: changedPixels(target.pixels, fallback.pixels),
          dataUrl: target.dataUrl
        },
        svg: {
          hasFontFace: svgText.includes(`font-family: "${family}"`),
          hasWoff2DataUri: svgText.includes("data:font/woff2;base64,"),
          hasLocalizedText: svgText.includes(text),
          text: svgText
        }
      };
    },
    { family, dataUrl, text: localizedText }
  );

  assert(proof.fontStatus === "loaded", "WOFF2 FontFace did not load");
  assert(proof.fontCheck, "document.fonts.check failed for the local WOFF2");
  assert(proof.png.textPixels > 30, `PNG label visibility proof is weak: ${proof.png.textPixels} changed pixels`);
  assert(
    proof.png.fontShapeDiffPixels > 30,
    `PNG font-shape proof is weak: ${proof.png.fontShapeDiffPixels} changed pixels`
  );
  assert(proof.svg.hasFontFace, "SVG export has no matching @font-face rule");
  assert(proof.svg.hasWoff2DataUri, "SVG export did not embed the WOFF2 as a data URI");
  assert(proof.svg.hasLocalizedText, "SVG export has no localized test label");

  const pngBuffer = Buffer.from(proof.png.dataUrl.split(",")[1], "base64");
  return {
    ...proof,
    png: { ...proof.png, dataUrl: undefined, bytes: pngBuffer.length },
    svg: { ...proof.svg, text: undefined, bytes: Buffer.byteLength(proof.svg.text, "utf8"), textContent: proof.svg.text },
    pngBuffer
  };
}

async function main() {
  const browserPath = option("browser");
  const officialAppPath = option("official-app");
  const woff2Path = option("woff2");
  const inputMapPath = option("input-map");
  const outputDir = path.resolve(option("output") ?? ".cache/t03-localization-m0");
  const port = Number(option("port") ?? 51731);

  for (const [label, value] of [
    ["browser", browserPath],
    ["official-app", officialAppPath],
    ["woff2", woff2Path]
  ]) {
    assert(value && fs.existsSync(value), `Missing --${label} file: ${value}`);
  }
  fs.mkdirSync(outputDir, { recursive: true });

  let vite;
  let browser;
  let official;
  try {
    vite = spawn(
      process.execPath,
      ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
      { cwd: repoRoot, stdio: ["ignore", "inherit", "inherit"] }
    );

    const baseUrl = `http://127.0.0.1:${port}`;
    await waitForServer(baseUrl);

    browser = await startBrowser(browserPath);
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await context.addInitScript(() => localStorage.setItem("version", "99.99.99"));
    await context.route("**/*", route => {
      const url = route.request().url();
      if (url.startsWith(baseUrl) || url.startsWith("data:") || url.startsWith("blob:")) return route.continue();
      return route.abort();
    });

    const page = await context.newPage();
    await page.goto(`${baseUrl}/?seed=t03-localization-m0&width=1024&height=768`);
    await waitForMap(page);

    if (inputMapPath) {
      assert(fs.existsSync(inputMapPath), `Missing --input-map file: ${inputMapPath}`);
      await loadInputMap(page, fs.readFileSync(inputMapPath, "utf8"));
    }
    const baseline = await saveViaAppStable(page, "T03-baseline.map");
    write(path.join(outputDir, "00-baseline.map"), baseline);
    const baselineSummary = summarizeMap(baseline);

    const injected = injectLocalizedNames(baseline, localizedText);
    assert(localizedNamesEqual(readLocalizedNames(injected.mapText), injected.localized), "Injection was not readable");
    write(path.join(outputDir, "01-injected.map"), injected.mapText);

    await loadMapViaInput(page, injected.mapText);
    const projectReloaded = await saveViaAppStable(page, "T03-project-reloaded.map");
    write(path.join(outputDir, "02-project-reloaded.map"), projectReloaded);
    assert(
      localizedNamesEqual(readLocalizedNames(projectReloaded), injected.localized),
      "Project reload/save lost localizedNames.zh"
    );
    assert(
      JSON.stringify(summarizeMap(projectReloaded)) === JSON.stringify(baselineSummary),
      "Project reload/save changed source fields or representative generated data"
    );

    const officialInput = path.join(outputDir, "03-official-input.map");
    write(officialInput, injected.mapText);
    official = await electron.launch({
      executablePath: officialAppPath,
      args: [`--user-data-dir=${fs.mkdtempSync(path.join(outputDir, "official-user-data-"))}`],
      env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: "true" },
      timeout: 30_000
    });
    const officialPage = await official.firstWindow({ timeout: 30_000 });
    await officialPage.waitForLoadState("domcontentloaded");
    await waitForMap(officialPage);
    const officialVersion = await official.evaluate(({ app }) => app.getVersion());
    assert(officialVersion === "1.157.0", `Official app version is ${officialVersion}, expected 1.157.0`);

    await loadMapViaInput(officialPage, injected.mapText);
    const officialSaved = await saveViaAppStable(officialPage, "T03-official-saved.map");
    write(path.join(outputDir, "04-official-saved.map"), officialSaved);
    assert(
      localizedNamesEqual(readLocalizedNames(officialSaved), injected.localized),
      "Official app load/save lost localizedNames.zh"
    );
    assert(
      JSON.stringify(summarizeMap(officialSaved)) === JSON.stringify(baselineSummary),
      "Official app load/save changed source fields or representative generated data"
    );
    await official.evaluate(({ app }) => app.exit(0));
    await official.close().catch(() => undefined);
    official = undefined;

    await loadMapViaInput(page, officialSaved);
    const final = await saveViaAppStable(page, "T03-project-final.map");
    write(path.join(outputDir, "05-project-final.map"), final);
    assert(
      localizedNamesEqual(readLocalizedNames(final), injected.localized),
      "Project reload of the official save lost localizedNames.zh"
    );
    const finalSummary = summarizeMap(final);
    assert(
      JSON.stringify(finalSummary) === JSON.stringify(baselineSummary),
      "Final round-trip changed source fields or representative generated data"
    );

    const fontProof = await verifyFont(page, woff2Path);
    write(path.join(outputDir, "t03-font-proof.svg"), fontProof.svg.textContent);
    write(path.join(outputDir, "t03-font-proof.png"), fontProof.pngBuffer);

    const report = {
      date: new Date().toISOString(),
      branch: gitOutput(["branch", "--show-current"]),
      head: gitOutput(["rev-parse", "HEAD"]),
      official: {
        version: officialVersion
      },
      map: {
        stateIndex: TARGET_STATE_INDEX,
        localized: injected.localized,
        baseline: baselineSummary,
        projectReloaded: summarizeMap(projectReloaded),
        officialSaved: summarizeMap(officialSaved),
        final: finalSummary,
        recordCountStable: new Set([
          baselineSummary.recordCount,
          summarizeMap(projectReloaded).recordCount,
          summarizeMap(officialSaved).recordCount,
          finalSummary.recordCount
        ]).size === 1
      },
      font: {
        family,
        woff2: {
          file: path.basename(woff2Path),
          bytes: fs.statSync(woff2Path).size,
          sha256: sha256(fs.readFileSync(woff2Path))
        },
        fontStatus: fontProof.fontStatus,
        fontCheck: fontProof.fontCheck,
        box: fontProof.box,
        png: fontProof.png,
        svg: {
          hasFontFace: fontProof.svg.hasFontFace,
          hasWoff2DataUri: fontProof.svg.hasWoff2DataUri,
          hasLocalizedText: fontProof.svg.hasLocalizedText,
          bytes: fontProof.svg.bytes
        }
      }
    };
    write(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report, null, 2));
  } finally {
    if (official) {
      await official.evaluate(({ app }) => app.exit(0)).catch(() => undefined);
      await official.close().catch(() => undefined);
    }
    await browser?.close().catch(() => undefined);
    vite?.kill();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
