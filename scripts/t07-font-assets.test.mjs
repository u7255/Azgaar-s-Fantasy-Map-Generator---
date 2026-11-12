import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("..", import.meta.url));
const digest = path =>
  createHash("sha256")
    .update(readFileSync(`${root}/${path}`))
    .digest("hex");

// Old CRLF checkouts are equivalent text. Normalize them to the LF upstream bytes
// before comparing license hashes, while fonts below remain byte-for-byte checks.
const licenseDigest = path =>
  createHash("sha256")
    .update(readFileSync(`${root}/${path}`, "utf8").replace(/\r\n?/g, "\n"), "utf8")
    .digest("hex");

const fonts = [
  ["src/assets/fonts/chinese/song-ke.woff2", "0d5a3fd4981d7cc03ad357775de336b27d41394158d52c7bdda1ab2c68fa1845"],
  ["src/assets/fonts/chinese/title-song.woff2", "f943c7337ff42159a70a21555604b8ae0e40599ecb1455b5c7b219f22642cff2"],
  ["src/assets/fonts/chinese/wen-kai.woff2", "013fa90e3e7c3b30aeb0a5311ef92d9aee0d3def5817bc27c357198796d34306"],
  ["src/assets/fonts/chinese/xing-shu.woff2", "5b31c15b66b61a62ce0ee2d12da1c667ef589272cbfdad1e5bbc930ddf01dabb"]
];

const licenses = [
  ["public/fonts/licenses/noto-serif-sc-OFL.txt", "18aabf190848725e2576eefb5c29ba06aac1029d02132252a7f312eac2e50cf3"],
  ["public/fonts/licenses/zcool-xiaowei-OFL.txt", "44577d402f4a9b5086ffd021b2b35bd37f3c4ea4a9279fac90afe7e46f9a11b1"],
  ["public/fonts/licenses/lxgw-wenkai-OFL.txt", "932999b6451e2c5b61f93c9d9a34d22742f81e41a192d2ad65acc300ba942298"],
  ["public/fonts/licenses/ma-shan-zheng-OFL.txt", "37784825d863bab31cdff1f4bfabae5b8d8e9913b91db2064a6b803b2edc92db"]
];

test("T07 fonts are local WOFF2 files with recorded hashes", () => {
  for (const [path, expected] of fonts) {
    const bytes = readFileSync(`${root}/${path}`);
    assert.equal(bytes.subarray(0, 4).toString("ascii"), "wOF2", path);
    assert.ok(statSync(`${root}/${path}`).size > 1_000_000, path);
    assert.equal(digest(path), expected, path);
  }
});

test("T07 OFL license files are shipped with the expected content", () => {
  for (const [path, expected] of licenses) {
    const text = readFileSync(`${root}/${path}`, "utf8");
    assert.match(text, /SIL OPEN FONT LICENSE Version 1\.1/);
    assert.equal(licenseDigest(path), expected, path);
  }
});
