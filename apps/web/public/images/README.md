# Site imagery

**Do not hand-place files here.** Run the pipeline instead:

```bash
node scripts/prepare-images.mjs
```

It reads the originals from `~/Downloads`, downscales them through Chromium
(sharp has no Windows-ARM64 binary on the dev box) and writes web-sized JPEGs.
The originals are stock resolution — one was 6500x4338 / 36 MB, which is
indefensible for a tool used at the bedside on hospital wifi. After the pass the
whole set is well under 1 MB.

| File                         | Used on                           | Subject                                                                        |
| ---------------------------- | --------------------------------- | ------------------------------------------------------------------------------ |
| `og-waveform.jpg`            | social share card                 | glowing respiratory waveform on oxblood                                        |
| `brand-waveform.jpg`         | `/` and `/about` founder sections | layered crimson waveforms on dark                                              |
| `care-nurse-smiling.jpg`     | `/` mission split                 | nurse laughing with a child holding a teddy                                    |
| ~~`registry-dashboard.jpg`~~ | _removed 2026-08-07_              | pulled: showed the pilot unit's real dated admissions curve without permission |
| `care-thermometer.jpg`       | `/services`                       | clinician taking a child's temperature                                         |
| `library-screenshot.jpg`     | `/knowledge`                      | PedsCC Library browse view                                                     |
| `care-teddy-oxygen.jpg`      | `/about`                          | teddy bear in a hospital bed wearing an oxygen mask                            |
| `care-resting.jpg`           | `/` mission split                 | child asleep in a hospital bed with a teddy                                    |

## Deliberately NOT used

- **No founder portrait.** The founder chose not to publish one; the brand
  waveform carries that section instead.
- **No flat glowing horizontal line.** A flat line on a dark ground reads as a
  flatline, which ADR-design-direction explicitly rejects for a paediatric
  intensive care product. The waveform used instead rolls continuously.
- **No teal/blue illustrations.** Two supplied building illustrations were
  teal — the palette bans blue and teal outright.

## Before changing anything

- **Registry dashboard:** the institution branding must stay redacted. The
  figures it shows (admissions, bed occupancy above 100%, admission dates) are
  that unit's real numbers — confirm they are yours to publish, or replace them
  with illustrative values.
- **Licensing:** every photograph must be genuinely free-licensed or owned, and
  none may be captioned or positioned to imply it depicts TowardPCC's own unit,
  staff or patients (spec §7).
