import { ENGINE_VERSION } from "@towardpcc/scoring-engine";

export const dynamic = "force-dynamic";

export function GET(): Response {
  return Response.json({
    status: "ok",
    service: "towardpcc-web",
    engine: ENGINE_VERSION,
  });
}
