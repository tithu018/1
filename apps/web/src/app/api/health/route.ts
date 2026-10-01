import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    service: "waypoint-web",
    status: "ok",
    time: new Date().toISOString()
  });
}
