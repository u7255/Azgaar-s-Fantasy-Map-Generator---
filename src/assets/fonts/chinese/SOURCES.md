# Chinese map fonts

All four fonts are bundled as local WOFF2 files. The renderer never requests Google Fonts at runtime.
The source packages were downloaded from npm for selection, then the exact files below were committed
so the app build is reproducible without keeping the packages as runtime dependencies.

| Style ID | Committed file | Upstream package | Package version | License | WOFF2 SHA-256 |
| --- | --- | --- | --- | --- | --- |
| `song-ke` | `song-ke.woff2` | `@fontsource/noto-serif-sc` | `5.3.1` | OFL-1.1 | `0d5a3fd4981d7cc03ad357775de336b27d41394158d52c7bdda1ab2c68fa1845` |
| `title-song` | `title-song.woff2` | `@fontsource/zcool-xiaowei` | `5.3.0` | OFL-1.1 | `f943c7337ff42159a70a21555604b8ae0e40599ecb1455b5c7b219f22642cff2` |
| `wen-kai` | `wen-kai.woff2` | `@fontsource/lxgw-wenkai` | `5.3.0` | OFL-1.1 | `013fa90e3e7c3b30aeb0a5311ef92d9aee0d3def5817bc27c357198796d34306` |
| `xing-shu` | `xing-shu.woff2` | `@fontsource/ma-shan-zheng` | `5.3.1` | OFL-1.1 | `5b31c15b66b61a62ce0ee2d12da1c667ef589272cbfdad1e5bbc930ddf01dabb` |

Upstream package files:

| Style ID | Upstream file |
| --- | --- |
| `song-ke` | `noto-serif-sc-chinese-simplified-400-normal.woff2` |
| `title-song` | `zcool-xiaowei-chinese-simplified-400-normal.woff2` |
| `wen-kai` | `lxgw-wenkai-latin-500-normal.woff2` |
| `xing-shu` | `ma-shan-zheng-chinese-simplified-400-normal.woff2` |

The copyright and complete OFL-1.1 terms are shipped under `public/fonts/licenses/`.
The original package-byte hash is kept below. The test also compares a checkout-normalized
LF hash, because Git line-ending conversion must not change the license identity. LXGW WenKai's
upstream license file itself uses CRLF, so its two hashes intentionally differ.

| License file | Original package SHA-256 | Checkout-normalized LF SHA-256 |
| --- | --- | --- |
| `noto-serif-sc-OFL.txt` | `18aabf190848725e2576eefb5c29ba06aac1029d02132252a7f312eac2e50cf3` | `18aabf190848725e2576eefb5c29ba06aac1029d02132252a7f312eac2e50cf3` |
| `zcool-xiaowei-OFL.txt` | `44577d402f4a9b5086ffd021b2b35bd37f3c4ea4a9279fac90afe7e46f9a11b1` | `44577d402f4a9b5086ffd021b2b35bd37f3c4ea4a9279fac90afe7e46f9a11b1` |
| `lxgw-wenkai-OFL.txt` | `a4654e013454eb0ea7b4b35689d235de2452a13737805e2a172761ae110b6905` | `932999b6451e2c5b61f93c9d9a34d22742f81e41a192d2ad65acc300ba942298` |
| `ma-shan-zheng-OFL.txt` | `37784825d863bab31cdff1f4bfabae5b8d8e9913b91db2064a6b803b2edc92db` | `37784825d863bab31cdff1f4bfabae5b8d8e9913b91db2064a6b803b2edc92db` |

The Chinese face is limited to CJK Unicode ranges. Latin letters, digits and ordinary punctuation
continue to use the user's original style font before the Chinese fallback chain.
