import "server-only";
import pino from "pino";

/**
 * Structured JSON logging to stdout (PRD §9: structured logs, no PII). Log
 * operational facts — ids, types, outcomes — never submitter content. `redact`
 * is a defence-in-depth net so a stray PII field is scrubbed even if one slips
 * into a log call. No transports (worker-thread pretty-printers break under
 * Next bundling); the container's log driver handles shipping.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
  base: { service: "towardpcc-web" },
  redact: {
    paths: ["*.email", "*.password", "*.name", "*.message", "payload", "*.token"],
    censor: "[redacted]",
  },
});
