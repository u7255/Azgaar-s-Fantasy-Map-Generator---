import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test, type ElectronApplication } from "@playwright/test";
import { _electron as electron } from "playwright";

async function launch(userData: string): Promise<ElectronApplication> {
  return electron.launch({
    args: ["."],
    env: { ...process.env, FMG_USER_DATA_DIR: userData }
  });
}

async function stop(app: ElectronApplication): Promise<void> {
  await app.evaluate(({ app }) => app.exit(0)).catch(() => undefined);
  await app.close().catch(() => undefined);
}

async function pressNativeKey(
  app: ElectronApplication,
  keyCode: string,
  modifiers: Array<"alt" | "control" | "shift"> = []
): Promise<void> {
  await app.evaluate(
    ({ BrowserWindow }, { keyCode, modifiers }) => {
      const window = BrowserWindow.getAllWindows()[0]!;
      window.webContents.sendInputEvent({ type: "keyDown", keyCode, modifiers });
      window.webContents.sendInputEvent({ type: "keyUp", keyCode, modifiers });
    },
    { keyCode, modifiers }
  );
}

test("opens a fresh install in a visible, resizable window", async () => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), "fmg-window-fresh-"));
  const app = await launch(userData);
  try {
    await app.firstWindow();
    const state = await app.evaluate(({ BrowserWindow, Menu, screen }) => {
      const window = BrowserWindow.getAllWindows()[0]!;
      return {
        bounds: window.getBounds(),
        workArea: screen.getPrimaryDisplay().workArea,
        fullscreen: window.isFullScreen(),
        maximized: window.isMaximized(),
        menuVisible: window.isMenuBarVisible(),
        menuLabels: Menu.getApplicationMenu()?.items.map(item => item.label),
        windowMenuLabels: Menu.getApplicationMenu()
          ?.items.find(item => item.label === "窗口")
          ?.submenu?.items.map(item => item.label)
      };
    });

    expect(state.fullscreen).toBe(false);
    expect(state.maximized).toBe(false);
    expect(state.menuVisible).toBe(true);
    expect(state.menuLabels).toEqual(expect.arrayContaining(["文件", "编辑", "视图", "窗口", "帮助"]));
    expect(state.windowMenuLabels).toEqual(
      expect.arrayContaining(["最小化", "最大化 / 还原", "切换全屏", "关闭"])
    );
    expect(state.bounds.width).toBeLessThanOrEqual(state.workArea.width);
    expect(state.bounds.height).toBeLessThanOrEqual(state.workArea.height);

    await pressNativeKey(app, "F11");
    await expect.poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.isFullScreen())).toBe(
      true
    );
    await pressNativeKey(app, "F11");
    await expect.poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.isFullScreen())).toBe(
      false
    );

    await pressNativeKey(app, "Enter", ["alt"]);
    await expect.poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.isFullScreen())).toBe(
      true
    );
    await pressNativeKey(app, "Enter", ["alt"]);
    await expect.poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.isFullScreen())).toBe(
      false
    );
  } finally {
    await stop(app);
  }
});

test("migrates a legacy fullscreen state to a maximized window", async () => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), "fmg-window-migrate-"));
  fs.writeFileSync(
    path.join(userData, "window-state.json"),
    JSON.stringify({ width: 1000, height: 700, x: 40, y: 30, maximized: false, fullscreen: true })
  );

  const app = await launch(userData);
  try {
    await app.firstWindow();
    const state = await app.evaluate(({ BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows()[0]!;
      return { fullscreen: window.isFullScreen(), maximized: window.isMaximized() };
    });

    expect(state.fullscreen).toBe(false);
    expect(state.maximized).toBe(true);
  } finally {
    await stop(app);
  }
});

test("saves and restores normal window bounds", async () => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), "fmg-window-restore-"));
  const first = await launch(userData);
  try {
    await first.firstWindow();
    await first.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0]!.setBounds({ x: 80, y: 60, width: 1000, height: 700 });
    });
    await new Promise(resolve => setTimeout(resolve, 500));
  } finally {
    await stop(first);
  }

  const second = await launch(userData);
  try {
    await second.firstWindow();
    const bounds = await second.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.getBounds());
    expect(bounds.x).toBe(80);
    expect(bounds.y).toBe(60);
    expect(Math.abs(bounds.width - 1000)).toBeLessThanOrEqual(4);
    expect(Math.abs(bounds.height - 700)).toBeLessThanOrEqual(4);
  } finally {
    await stop(second);
  }
});

test("saves and restores fullscreen mode", async () => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), "fmg-window-fullscreen-"));
  const first = await launch(userData);
  try {
    await first.firstWindow();
    await first.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.setFullScreen(true));
    await expect.poll(() => first.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.isFullScreen())).toBe(
      true
    );
    await expect
      .poll(() => JSON.parse(fs.readFileSync(path.join(userData, "window-state.json"), "utf8")).mode)
      .toBe("fullscreen");
  } finally {
    await stop(first);
  }

  const second = await launch(userData);
  try {
    await second.firstWindow();
    await expect
      .poll(() => second.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.isFullScreen()))
      .toBe(true);
  } finally {
    await stop(second);
  }
});
