import { NextResponse } from "next/server";
import { gatewayRequest } from "@/lib/gateway/request";
import { gatewayWS } from "@/lib/gateway/ws-client";

export async function GET() {
  try {
    let result: { sessions?: unknown[] } | undefined;

    if (gatewayWS.status === "connected") {
      try {
        result = await gatewayWS.sendRPC<{ sessions?: unknown[] }>(
          "sessions.list",
          { limit: 20 },
          5_000,
        );
      } catch (err) {
        console.warn("[api/gateway/sessions] WS RPC failed, falling back to one-shot:", String(err));
      }
    }

    if (!result) {
      result = await gatewayRequest<{ sessions?: unknown[] }>({
        method: "sessions.list",
        params: { limit: 20 },
        timeoutMs: 5_000,
      });
    }

    const sessions = result?.sessions ?? [];
    return NextResponse.json({ sessions });
  } catch (error) {
    // Gateway unreachable or method not available — return empty
    console.warn("[api/gateway/sessions]", String(error));
    return NextResponse.json({ sessions: [] });
  }
}
