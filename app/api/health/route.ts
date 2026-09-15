import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";

export async function GET() {
  try {
    const dbTest = await queryOne<{ now: string }>("SELECT NOW() as now");
    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: dbTest ? "connected" : "disconnected",
      environment: process.env.NODE_ENV || "development",
      framework: "Next.js 15+ App Router",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "unhealthy",
        error: err.message,
      },
      { status: 500 }
    );
  }
}
