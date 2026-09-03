-- Drop CalculatorMeta: written by nothing and read by nothing.
--
-- The table was created for admin-side presentation overrides — a publish
-- toggle and the two independent-validator slots (PRD §6.4). Nothing public
-- ever read it: the catalogue, the calculator page, /validation and the home
-- counters all take status and validators from the scoring-engine registry.
-- The admin screen that wrote it became read-only in #164 (2026-09-03), and the
-- table was empty in production when checked the same day, so this loses no
-- data. Validator names live in the score definition, with the review date,
-- and change through a pull request.
--
-- Dropping the table drops its own foreign key to "AdminUser" and its unique
-- index on "slug" with it; AdminUser is unchanged. The app role's grant on the
-- table came from production's one-time ALTER DEFAULT PRIVILEGES (see the
-- audit_nullable_actor migration), never from a migration file, and it lives
-- on the table object, so it goes with the table and leaves nothing dangling.
-- Nothing else in the schema references this table (no inbound foreign key,
-- no policy, no trigger), so no CASCADE is needed.

DROP TABLE "CalculatorMeta";
