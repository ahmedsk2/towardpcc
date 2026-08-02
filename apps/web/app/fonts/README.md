# Vendored typefaces

Four woff2 files, loaded by `next/font/local` in `../layout.tsx`. These are the
same latin subsets the site already served — they were previously pulled in at
build time from the `@fontsource*` packages, which have been removed.

| File                                    | Family                       | Upstream                                        |
| --------------------------------------- | ---------------------------- | ----------------------------------------------- |
| `inter-latin-wght-normal.woff2`         | Inter (variable, 100–900)    | https://github.com/rsms/inter                   |
| `space-grotesk-latin-wght-normal.woff2` | Space Grotesk (var, 300–700) | https://github.com/floriankarsten/space-grotesk |
| `ibm-plex-mono-latin-400-normal.woff2`  | IBM Plex Mono 400            | https://github.com/IBM/plex                     |
| `ibm-plex-mono-latin-500-normal.woff2`  | IBM Plex Mono 500            | https://github.com/IBM/plex                     |

All three families are licensed under the **SIL Open Font License 1.1**, which
permits redistribution of the font files, including bundled in a product. The
type choices and their rationale are in `docs/decisions/ADR-design-direction.md`.

## Why they are committed rather than installed

`next/font/local` generates a companion `@font-face` for the system fallback
with `size-adjust` / `ascent-override` / `descent-override` derived from the
real font's metrics, so the fallback occupies the same space and swapping the
webfont in does not reflow the page. `@fontsource` ships no such fallback; that
swap was measured shifting the PRISM calculator by CLS 0.201–0.405 against a
0.1 budget. `next/font/local` needs the files on disk, and vendoring them keeps
the build free of any network fetch — unlike `next/font/google`.

Latin only, deliberately: nothing on the site renders Cyrillic or Greek, and
the other subsets `@fontsource` shipped were never requested by a browser.
