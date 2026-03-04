import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const result = await pool.query(
      "SELECT * FROM odg_employee ORDER BY emp_id LIMIT 100"
    );
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error("Database query error:", err);
    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 }
    );
  }
}
