import { defineText } from "./i18n/text";
import type { ValueNotice } from "./types";

/**
 * The S/F ratio saturates above an SpO₂ of 97, so pSOFA and Phoenix both accept
 * such a value and then discard it — leaving the respiratory subscore at 0 with
 * the field FILLED, which the form's partial-entry cue cannot see.
 *
 * Shared rather than written twice. The two scores already implement the same
 * gate separately (`psofa.ts` `<= 97`, `phoenix.ts` `> 97 ? RATIO_ABSENT`), and
 * the standalone `sf-ratio` rejects the identical value outright at `max: 97` —
 * three treatments of one clinical fact. Wording that lives in one place is the
 * least that can be done about that here.
 */
export const saturatingSpo2Notice = (): ValueNotice => ({
  about: "spo2",
  text: defineText(
    "notice.spo2-saturating",
    "The SpO₂ entered is above 97%, where the SpO₂:FiO₂ ratio saturates, so it was not used and this subscore is 0. Enter a PaO₂ if one is available; otherwise read the total as a lower bound.",
  ),
});
