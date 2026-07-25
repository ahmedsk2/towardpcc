import { handlers } from "@/auth";

// Auth.js runs the Credentials authorize (Prisma + WASM crypto) here — Node
// runtime, never edge.
export const runtime = "nodejs";
export const { GET, POST } = handlers;
