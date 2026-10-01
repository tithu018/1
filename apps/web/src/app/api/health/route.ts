import { prisma } from "@waypoint/database";
import { NextResponse } from "next/server";

export async function GET() {
  const time = new Date().toISOString();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ service: "waypoint-web", status: "ok", database: "connected", time });
  } catch {
    return NextResponse.json({ service: "waypoint-web", status: "degraded", database: "unavailable", time }, { status: 503 });
  }
}
