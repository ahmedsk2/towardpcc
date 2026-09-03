import { defineText } from "./i18n/text";
import type { ValueNotice } from "./types";

/**
 * The S/F ratio saturates above an SpO₂ of 97, so a value entered there is
 * accepted and then discarded, leaving the subscore lower than the child is
 * with the field FILLED — which the form's partial-entry cue cannot see,
 * because it watches for blanks.
 *
 * Shared rather than written twice: pSOFA and Phoenix implement the same gate
 * separately, and the standalone `sf-ratio` rejects the identical value
 * outright at `max: 97`.
 *
 * THE REMEDY IS CONDITIONAL, AND THAT MATTERS. The first version of this text
 * always said "enter a PaO₂ if one is available", which is wrong advice on
 * Phoenix when a PaO₂ is already entered — there the S/F term is a SEPARATE
 * contributor that was lost, not a fallback that was superseded. The sentence
 * a reader acts on must be true of the values in front of them.
 */
export const saturatingSpo2Notice = (hasPao2: boolean): ValueNotice => ({
  about: "spo2",
  text: defineText(
    hasPao2 ? "notice.spo2-saturating.with-pao2" : "notice.spo2-saturating",
    hasPao2
      ? "The SpO₂ entered is above 97%, where the SpO₂:FiO₂ ratio saturates, so it was not used. The PaO₂ still counts, but this subscore carries no contribution from the saturation and may read lower than the child is."
      : "The SpO₂ entered is above 97%, where the SpO₂:FiO₂ ratio saturates, so it was not used and this subscore is 0. Enter a PaO₂ if one is available; otherwise read the total as a lower bound.",
  ),
});
