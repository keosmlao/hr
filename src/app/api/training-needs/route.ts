import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool from "@/lib/db";

interface SessionData {
  lineUserId: string;
  lineDisplayName: string;
  linePictureUrl: string | null;
  employee: {
    employeeId: number;
    employeeCode: string;
    fullnameLo: string;
    fullnameEn: string;
    titleLo: string;
    titleEn: string;
    nickname: string;
    positionCode: string;
    divisionCode: string;
    departmentCode: string;
    unitCode: string;
    hireDate: string;
    employmentStatus: string;
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
    const result = await pool.query(
      `SELECT * FROM odg_training_survey
       WHERE employee_code = $1
       ORDER BY created_at DESC`,
      [session.employee.employeeCode]
    );
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error("Failed to fetch training needs:", err);
    return NextResponse.json(
      { error: "Failed to fetch training needs" },
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

    const { skill_priorities, fiscal_year } = body;
    if (!skill_priorities || !fiscal_year) {
      return NextResponse.json(
        { error: "ກະລຸນາປ້ອນຂໍ້ມູນທີ່ຈຳເປັນ" },
        { status: 400 }
      );
    }

    // Check if already submitted
    const existing = await pool.query(
      `SELECT 1 FROM odg_training_survey WHERE employee_code = $1 LIMIT 1`,
      [session.employee.employeeCode]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: "ທ່ານໄດ້ສົ່ງແບບສຳຫຼວດແລ້ວ ບໍ່ສາມາດສົ່ງຊ້ຳໄດ້" },
        { status: 409 }
      );
    }

    const allowedSupervisorYears = ["<1", "1-3", ">3"];
    const supervisorYears = allowedSupervisorYears.includes(body.supervisor_years)
      ? body.supervisor_years
      : null;

    const result = await pool.query(
      `INSERT INTO odg_training_survey
         (employee_code, department_name, team_count, supervisor_years,
          skill_priorities, team_problems, suggested_course, fiscal_year)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        session.employee.employeeCode,
        body.department_name || null,
        body.team_count || null,
        supervisorYears,
        JSON.stringify(skill_priorities),
        body.team_problems || null,
        body.suggested_course || null,
        body.fiscal_year,
      ]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    console.error("Failed to create training need:", err);
    return NextResponse.json(
      { error: "ບໍ່ສາມາດບັນທຶກຂໍ້ມູນໄດ້" },
      { status: 500 }
    );
  }
}
