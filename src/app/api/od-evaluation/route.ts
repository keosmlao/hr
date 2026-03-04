import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool from "@/lib/db";

interface SessionData {
  lineUserId: string;
  lineDisplayName: string;
  linePictureUrl: string | null;
  employee: {
    employeeCode: string;
  } | null;
}

async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session) return null;
  try {
    return JSON.parse(Buffer.from(session.value, "base64").toString());
  } catch {
    return null;
  }
}

export async function GET() {
  const session = await getSession();
  if (!session?.employee) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const mine = await pool.query(
      `SELECT * FROM odg_od_evaluation WHERE employee_code = $1 LIMIT 1`,
      [session.employee.employeeCode]
    );

    // ກວດສິດ: ສະເພາະຜູ້ຈັດການ ໄອທີ (801) ແລະ ບຸກຄະລາກອນ (701)
    const empResult = await pool.query(
      `SELECT position_code, department_code FROM odg_employee WHERE employee_code = $1`,
      [session.employee.employeeCode]
    );
    const emp = empResult.rows[0];
    const canViewSummary =
      emp?.position_code === "11" &&
      ["701", "801"].includes(emp?.department_code);

    let summaryData = null;
    if (canViewSummary) {
      const summary = await pool.query(
        `SELECT
           COUNT(*) as total,
           COUNT(*) FILTER (WHERE q1) as q1_good,
           COUNT(*) FILTER (WHERE q2) as q2_good,
           COUNT(*) FILTER (WHERE q3) as q3_good,
           COUNT(*) FILTER (WHERE q4) as q4_good,
           COUNT(*) FILTER (WHERE q5) as q5_good,
           COUNT(*) FILTER (WHERE q6) as q6_good
         FROM odg_od_evaluation`
      );
      summaryData = summary.rows[0] || null;
    }

    return NextResponse.json({
      submitted: mine.rows[0] || null,
      summary: summaryData,
    });
  } catch (err) {
    console.error("Failed to fetch OD evaluation:", err);
    return NextResponse.json(
      { error: "Failed to fetch evaluation" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.employee) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { q1, q2, q3, q4, q5, q6, comment } = body;

    if (
      typeof q1 !== "boolean" ||
      typeof q2 !== "boolean" ||
      typeof q3 !== "boolean" ||
      typeof q4 !== "boolean" ||
      typeof q5 !== "boolean" ||
      typeof q6 !== "boolean"
    ) {
      return NextResponse.json(
        { error: "ກະລຸນາຕອບທຸກຄຳຖາມ" },
        { status: 400 }
      );
    }

    const existing = await pool.query(
      `SELECT 1 FROM odg_od_evaluation WHERE employee_code = $1 LIMIT 1`,
      [session.employee.employeeCode]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: "ທ່ານໄດ້ປະເມີນແລ້ວ ບໍ່ສາມາດສົ່ງຊ້ຳໄດ້" },
        { status: 409 }
      );
    }

    const result = await pool.query(
      `INSERT INTO odg_od_evaluation
         (employee_code, q1, q2, q3, q4, q5, q6, comment)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        session.employee.employeeCode,
        q1,
        q2,
        q3,
        q4,
        q5,
        q6,
        comment || null,
      ]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    console.error("Failed to save OD evaluation:", err);
    return NextResponse.json(
      { error: "ບໍ່ສາມາດບັນທຶກຂໍ້ມູນໄດ້" },
      { status: 500 }
    );
  }
}
