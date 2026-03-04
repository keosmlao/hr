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

/** ຄຳນວນເດືອນກ່ອນໜ້າ (ເດືອນທີ່ຕ້ອງປະເມີນ) */
function getPreviousMonth(): { year: string; month: number } {
  const now = new Date();
  let m = now.getMonth(); // 0-indexed: Jan=0
  let y = now.getFullYear();
  if (m === 0) {
    // ມັງກອນ → ປະເມີນເດືອນ 12 ຂອງປີກ່ອນ
    return { year: String(y - 1), month: 12 };
  }
  return { year: String(y), month: m }; // m is already prev month (0-indexed)
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.employee) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const empCode = session.employee.employeeCode;
  const prev = getPreviousMonth();
  const year = request.nextUrl.searchParams.get("year") || prev.year;
  const month = Number(request.nextUrl.searchParams.get("month")) || prev.month;

  try {
    // Get criteria
    const criteria = await pool.query(
      `SELECT * FROM odg_staff_eval_criteria ORDER BY question_order, option_id`
    );

    // Get my self-evaluation for this month
    const selfEval = await pool.query(
      `SELECT * FROM odg_staff_evaluation
       WHERE evaluator_code = $1 AND target_code = $1 AND year = $2 AND month = $3 LIMIT 1`,
      [empCode, year, month]
    );

    // Get evaluations I've done for others this month
    const myEvals = await pool.query(
      `SELECT se.*, e.fullname_lo as target_name
       FROM odg_staff_evaluation se
       LEFT JOIN odg_employee e ON e.employee_code = se.target_code
       WHERE se.evaluator_code = $1 AND se.target_code != $1 AND se.year = $2 AND se.month = $3
       ORDER BY se.created_at DESC`,
      [empCode, year, month]
    );

    // Check if manager/head
    const isManager = ["11", "12"].includes(session.employee.positionCode);

    let targets: { employee_code: string; fullname_lo: string; source: string }[] = [];

    if (isManager) {
      // ລູກທີມ = ຄົນໃນພະແນກ/ໜ່ວຍງານ ທີ່ຕຳແໜ່ງຕ່ຳກ່ວາ
      // position_code 11=ຜູ້ຈັດການ, 12=ຫົວໜ້າ, ອື່ນໆ=ພະນັກງານ
      const posCode = session.employee.positionCode;
      let posFilter = "AND position_code NOT IN ('11','12')"; // default: only regular employees
      if (posCode === "11") {
        posFilter = "AND position_code != '11'"; // manager sees heads + employees
      }
      const team = await pool.query(
        `SELECT employee_code, fullname_lo FROM odg_employee
         WHERE (department_code = $1 OR unit_code = $3)
         AND employee_code != $2 AND employment_status = 'ACTIVE'
         ${posFilter}
         ORDER BY fullname_lo`,
        [session.employee.departmentCode, empCode, session.employee.unitCode]
      );
      targets = team.rows.map((r: { employee_code: string; fullname_lo: string }) => ({
        ...r,
        source: "team",
      }));

      const assigned = await pool.query(
        `SELECT a.target_code as employee_code, e.fullname_lo
         FROM odg_staff_eval_assignment a
         LEFT JOIN odg_employee e ON e.employee_code = a.target_code
         WHERE a.evaluator_code = $1 AND a.year = $2
         ORDER BY e.fullname_lo`,
        [empCode, year]
      );
      targets = [
        ...targets,
        ...assigned.rows.map((r: { employee_code: string; fullname_lo: string }) => ({
          ...r,
          source: "assigned",
        })),
      ];
    }

    // ເດືອນທີ່ປະເມີນໄດ້ (ເດືອນກ່ອນໜ້າ ພາຍໃນປີ)
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth(); // 0-indexed
    const availableMonths: { year: string; month: number }[] = [];
    for (let m = 1; m <= currentMonth; m++) {
      availableMonths.push({ year: String(currentYear), month: m });
    }
    // ຖ້າເດືອນ ມ.ກ. → ເພີ່ມເດືອນ 12 ປີກ່ອນ
    if (currentMonth === 0) {
      availableMonths.push({ year: String(currentYear - 1), month: 12 });
    }

    return NextResponse.json({
      criteria: criteria.rows,
      selfEval: selfEval.rows[0] || null,
      myEvals: myEvals.rows,
      targets,
      isManager,
      currentMonth: month,
      currentYear: year,
      availableMonths,
    });
  } catch (err) {
    console.error("Failed to fetch staff evaluation:", err);
    return NextResponse.json(
      { error: "Failed to fetch data" },
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
    const { target_code, scores, comment } = body;
    const empCode = session.employee.employeeCode;

    // ໃຊ້ເດືອນຈາກ client (ສຳລັບປະເມີນເດືອນຄ້າງ) ຫຼື ເດືອນກ່ອນໜ້າ
    const prev = getPreviousMonth();
    const year = body.year || prev.year;
    const month = body.month || prev.month;

    // ກວດວ່າເດືອນທີ່ສົ່ງມາຢູ່ໃນຊ່ວງປະເມີນໄດ້
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth0 = now.getMonth(); // 0-indexed
    const requestedYear = Number(year);
    const requestedMonth = Number(month);
    let isValidMonth = false;
    if (requestedYear === curYear && requestedMonth >= 1 && requestedMonth <= curMonth0) {
      isValidMonth = true;
    } else if (curMonth0 === 0 && requestedYear === curYear - 1 && requestedMonth === 12) {
      isValidMonth = true;
    }
    if (!isValidMonth) {
      return NextResponse.json(
        { error: "ບໍ່ສາມາດປະເມີນເດືອນນີ້ໄດ້" },
        { status: 400 }
      );
    }

    if (!target_code || !scores || typeof scores !== "object") {
      return NextResponse.json(
        { error: "ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບ" },
        { status: 400 }
      );
    }

    // Determine eval type
    let evalType = "self";
    if (target_code !== empCode) {
      const isManager = ["11", "12"].includes(session.employee.positionCode);
      if (!isManager) {
        return NextResponse.json(
          { error: "ທ່ານບໍ່ມີສິດປະເມີນຜູ້ອື່ນ" },
          { status: 403 }
        );
      }

      const teamCheck = await pool.query(
        `SELECT 1 FROM odg_employee WHERE employee_code = $1
         AND (department_code = $2 OR unit_code = $3)`,
        [target_code, session.employee.departmentCode, session.employee.unitCode]
      );
      if (teamCheck.rows.length > 0) {
        evalType = "manager";
      } else {
        const assignCheck = await pool.query(
          `SELECT 1 FROM odg_staff_eval_assignment
           WHERE evaluator_code = $1 AND target_code = $2 AND year = $3`,
          [empCode, target_code, year]
        );
        if (assignCheck.rows.length > 0) {
          evalType = "cross";
        } else {
          return NextResponse.json(
            { error: "ທ່ານບໍ່ໄດ້ຮັບ assign ໃຫ້ປະເມີນຄົນນີ້" },
            { status: 403 }
          );
        }
      }
    }

    // Check duplicate for this month
    const existing = await pool.query(
      `SELECT 1 FROM odg_staff_evaluation
       WHERE evaluator_code = $1 AND target_code = $2 AND year = $3 AND month = $4 LIMIT 1`,
      [empCode, target_code, year, month]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: "ທ່ານໄດ້ປະເມີນຄົນນີ້ເດືອນນີ້ແລ້ວ ບໍ່ສາມາດສົ່ງຊ້ຳໄດ້" },
        { status: 409 }
      );
    }

    const result = await pool.query(
      `INSERT INTO odg_staff_evaluation
         (evaluator_code, target_code, eval_type, year, month, scores, comment)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [empCode, target_code, evalType, year, month, JSON.stringify(scores), comment || null]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    console.error("Failed to save staff evaluation:", err);
    return NextResponse.json(
      { error: "ບໍ່ສາມາດບັນທຶກຂໍ້ມູນໄດ້" },
      { status: 500 }
    );
  }
}
