/**
 * The URL fragment, lifted out of `location` before the page finished parsing.
 *
 * Set by the inline script at the top of `<body>` in `app/layout.tsx`, read
 * once by `components/calculator/calculator-form.tsx`. It exists because a
 * fragment sitting in `location.href` is readable by any script in the
 * document — including ones this repository did not put there — and this
 * application's fragment holds entered clinical values.
 *
 * Optional rather than always-present: it is only assigned when the incoming
 * URL actually had a fragment, and `clearAll` deletes it.
 */
declare global {
  interface Window {
    __TPCC_FRAGMENT__?: string;
  }
}

export {};
