/**
 * Where a "home" link goes.
 *
 * `/` is the pre-launch holding page and has no way back into the site, so
 * while it is up the header logo, the breadcrumb root and the 404 page all
 * point at the parked home page instead. Without this, anyone testing the site
 * who clicks the logo lands on "Coming soon" with no navigation — a dead end in
 * the middle of every test session.
 *
 * ONE CONSTANT, so restoring the home page to `/` is a one-line change here
 * and nothing else has to be remembered.
 */
export const HOME_HREF = "/home";
