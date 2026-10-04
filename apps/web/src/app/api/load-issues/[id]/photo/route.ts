import { prisma } from "@waypoint/database";
import { getSession } from "@/lib/auth";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new Response("Sign in required", { status: 401 });
  const { id } = await context.params;
  const issue = await prisma.loadIssue.findUnique({ where: { id }, include: { order: { include: { outlet: true } }, trip: true } });
  if (!issue?.photoData || !issue.photoMimeType) return new Response("Evidence not found", { status: 404 });
  const allowed = session.role === "store_manager"
    ? issue.order.outletId === session.outletId
    : session.role === "driver"
      ? issue.trip.driverId === session.accountId
      : ["loader", "dispatcher"].includes(session.role) && issue.order.outlet.depotId === session.depotId;
  if (!allowed) return new Response("Forbidden", { status: 403 });
  return new Response(new Uint8Array(issue.photoData), { headers: { "Content-Type": issue.photoMimeType, "Content-Disposition": `inline; filename="${(issue.photoName ?? "loading-evidence").replaceAll('"', '')}"`, "Cache-Control": "private, no-store" } });
}
