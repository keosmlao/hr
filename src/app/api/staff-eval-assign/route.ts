import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool from "@/lib/db";

interface SessionData {
  lineUserId: string;
  employee: {
    employeeCode: string;
    positionCode: string;
    departmentCode: string;
    unitCode: string;
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

/** GET — ລາຍຊື່ assignment ທີ່ມີ + ລາຍຊື່ຄົນທີ່ເລືອກໄດ້ */
export async function GET() {
  const session = await getSession();
  if (!session?.employee) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const emp = session.employee;
  const isManager = ["11", "12"].includes(emp.positionCode);
  if (!isManager) {
    return NextResponse.json({ error: "ສະເພາະຫົວໜ້າ/ຜູ້ຈັດການ" }, { status: 403 });
  }

  const year = String(new Date().getFullYear());

  try {
    // ລາຍຊື່ທີ່ assign ແລ້ວ
    const assigned = await pool.query(
      `SELECT a.id, a.target_code, e.fullname_lo, e.position_code,
              p.position_name_lo, e.department_code, d.department_name_lo
       FROM odg_staff_eval_assignment a
       LEFT JOIN odg_employee e ON e.employee_code = a.target_code
       LEFT JOIN odg_position p ON p.position_code = e.position_code
       LEFT JOIN odg_department d ON d.department_code = e.department_code
       WHERE a.evaluator_code = $1 AND a.year = $2
       ORDER BY e.fullname_lo`,
      [emp.employeeCode, year]
    );

    // ຄົນທີ່ເລືອກໄດ້: ຕຳແໜ່ງຕ່ຳກ່ວາ, ຕ່າງພະແນກ/ໜ່ວຍງານ, ຍັງບໍ່ assign
    let posFilter = "AND e.position_code NOT IN ('11','12')";
    if (emp.positionCode === "11") {
      posFilter = "AND e.position_code != '11'";
    }

    const candidates = await pool.query(
      `SELECT e.employee_code, e.fullname_lo, e.position_code,
              p.position_name_lo, e.department_code, d.department_name_lo
       FROM odg_employee e
       LEFT JOIN odg_position p ON p.position_code = e.position_code
       LEFT JOIN odg_department d ON d.department_code = e.department_code
       WHERE e.employee_code != $1
       AND e.employment_status = 'ACTIVE'
       ${posFilter}
       AND e.employee_code NOT IN (
         SELECT target_code FROM odg_staff_eval_assignment
         WHERE evaluator_code = $1 AND year = $2
       )
       ORDER BY e.position_code, d.department_name_lo, e.fullname_lo`,
      [emp.employeeCode, year]
    );

    return NextResponse.json({
      assigned: assigned.rows,
      candidates: candidates.rows,
    });
  } catch (err) {
    console.error("Failed to fetch assignments:", err);
    return NextResponse.json({ error: "ເກີດຂໍ້ຜິດພາດ" }, { status: 500 });
  }
}

/** POST — ເພີ່ມ assignment */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.employee) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const emp = session.employee;
  const isManager = ["11", "12"].includes(emp.positionCode);
  if (!isManager) {
    return NextResponse.json({ error: "ສະເພາະຫົວໜ້າ/ຜູ້ຈັດການ" }, { status: 403 });
  }

  try {
    const { target_code } = await request.json();
    if (!target_code) {
      return NextResponse.json({ error: "ກະລຸນາເລືອກຜູ້ຖືກປະເມີນ" }, { status: 400 });
    }

    const year = String(new Date().getFullYear());

    const result = await pool.query(
      `INSERT INTO odg_staff_eval_assignment (evaluator_code, target_code, year)
       VALUES ($1, $2, $3)
       ON CONFLICT (evaluator_code, target_code, year) DO NOTHING
       RETURNING *`,
      [emp.employeeCode, target_code, year]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "ມີໃນລາຍການແລ້ວ" }, { status: 409 });
    }

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    console.error("Failed to add assignment:", err);
    return NextResponse.json({ error: "ເກີດຂໍ້ຜິດພາດ" }, { status: 500 });
  }
}

/** DELETE — ລົບ assignment */
export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session?.employee) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const emp = session.employee;
  const isManager = ["11", "12"].includes(emp.positionCode);
  if (!isManager) {
    return NextResponse.json({ error: "ສະເພາະຫົວໜ້າ/ຜູ້ຈັດການ" }, { status: 403 });
  }

  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "ບໍ່ພົບ ID" }, { status: 400 });
    }

    await pool.query(
      `DELETE FROM odg_staff_eval_assignment WHERE id = $1 AND evaluator_code = $2`,
      [id, emp.employeeCode]
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to delete assignment:", err);
    return NextResponse.json({ error: "ເກີດຂໍ້ຜິດພາດ" }, { status: 500 });
  }
}
