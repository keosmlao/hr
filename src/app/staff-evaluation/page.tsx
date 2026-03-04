import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import pool from "@/lib/db";
import AppLogo from "@/components/app-logo";
import StaffEvalForm from "./staff-eval-form";

const MONTH_NAMES = [
  "", "ມັງກອນ", "ກຸມພາ", "ມີນາ", "ເມສາ", "ພຶດສະພາ", "ມິຖຸນາ",
  "ກໍລະກົດ", "ສິງຫາ", "ກັນຍາ", "ຕຸລາ", "ພະຈິກ", "ທັນວາ",
];

interface SessionData {
  lineUserId: string;
  lineDisplayName: string;
  linePictureUrl: string | null;
  employee: {
    employeeCode: string;
    fullnameLo: string;
    positionCode: string;
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

/** ຄຳນວນເດືອນກ່ອນໜ້າ */
function getPreviousMonth(): { year: string; month: number } {
  const now = new Date();
  let m = now.getMonth(); // 0-indexed
  const y = now.getFullYear();
  if (m === 0) {
    return { year: String(y - 1), month: 12 };
  }
  return { year: String(y), month: m };
}

export default async function StaffEvaluationPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const empResult = await pool.query(
    `SELECT employee_code, fullname_lo, position_code, unit_code, department_code
     FROM odg_employee WHERE line_id = $1`,
    [session.lineUserId]
  );
  const emp = empResult.rows[0] || null;

  if (!emp) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,var(--brand-50)_0%,#ffffff_100%)]">
        <Nav />
        <main className="mx-auto max-w-3xl px-6 py-8">
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-brand-100">
            <p className="text-brand-500">ບໍ່ພົບຂໍ້ມູນພະນັກງານ</p>
          </div>
        </main>
      </div>
    );
  }

  const prev = getPreviousMonth();
  const year = prev.year;
  const month = prev.month;
  const isManager = ["11", "12"].includes(emp.position_code);

  // Criteria
  const criteriaResult = await pool.query(
    `SELECT * FROM odg_staff_eval_criteria ORDER BY question_order, option_id`
  );

  // Self evals for ALL available months (to detect overdue)
  const selfAllResult = await pool.query(
    `SELECT year, month FROM odg_staff_evaluation
     WHERE evaluator_code = $1 AND target_code = $1 AND year = $2`,
    [emp.employee_code, year]
  );
  const selfEvalDoneMonths = new Set(
    selfAllResult.rows.map((r: { month: number }) => r.month)
  );

  // Self eval for this month
  const selfResult = await pool.query(
    `SELECT * FROM odg_staff_evaluation
     WHERE evaluator_code = $1 AND target_code = $1 AND year = $2 AND month = $3 LIMIT 1`,
    [emp.employee_code, year, month]
  );

  // Manager evals for this month
  const evalsResult = await pool.query(
    `SELECT se.*, e.fullname_lo as target_name
     FROM odg_staff_evaluation se
     LEFT JOIN odg_employee e ON e.employee_code = se.target_code
     WHERE se.evaluator_code = $1 AND se.target_code != $1 AND se.year = $2 AND se.month = $3
     ORDER BY se.created_at DESC`,
    [emp.employee_code, year, month]
  );

  // Targets
  let targets: { employee_code: string; fullname_lo: string; source: string }[] = [];
  if (isManager) {
    // ລູກທີມ = ຄົນໃນພະແນກ/ໜ່ວຍງານ ທີ່ຕຳແໜ່ງຕ່ຳກ່ວາ
    const posCode = emp.position_code;
    let posFilter = "AND position_code NOT IN ('11','12')";
    if (posCode === "11") {
      posFilter = "AND position_code != '11'";
    }
    const team = await pool.query(
      `SELECT employee_code, fullname_lo FROM odg_employee
       WHERE (department_code = $1 OR unit_code = $3)
       AND employee_code != $2 AND employment_status = 'ACTIVE'
       ${posFilter}
       ORDER BY fullname_lo`,
      [emp.department_code, emp.employee_code, emp.unit_code]
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
      [emp.employee_code, year]
    );
    targets = [
      ...targets,
      ...assigned.rows.map((r: { employee_code: string; fullname_lo: string }) => ({
        ...r,
        source: "assigned",
      })),
    ];
  }

  // ເດືອນທີ່ປະເມີນໄດ້ ພາຍໃນປີ (ເດືອນກ່ອນໜ້າ)
  const currentYear = new Date().getFullYear();
  const currentMonth0 = new Date().getMonth(); // 0-indexed
  const availableMonths: { year: string; month: number; label: string; selfDone: boolean }[] = [];
  for (let m = 1; m <= currentMonth0; m++) {
    availableMonths.push({
      year: String(currentYear),
      month: m,
      label: `${MONTH_NAMES[m]} ${currentYear}`,
      selfDone: selfEvalDoneMonths.has(m),
    });
  }
  if (currentMonth0 === 0) {
    availableMonths.push({
      year: String(currentYear - 1),
      month: 12,
      label: `${MONTH_NAMES[12]} ${currentYear - 1}`,
      selfDone: selfEvalDoneMonths.has(12),
    });
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,var(--brand-50)_0%,#ffffff_100%)]">
      <Nav />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <StaffEvalForm
          employeeCode={emp.employee_code}
          employeeName={emp.fullname_lo}
          isManager={isManager}
          criteria={criteriaResult.rows}
          selfEval={selfResult.rows[0] || null}
          managerEvals={evalsResult.rows}
          targets={targets}
          evalMonth={month}
          evalYear={year}
          evalMonthLabel={MONTH_NAMES[month]}
          availableMonths={availableMonths}
        />
      </main>
    </div>
  );
}

function Nav() {
  return (
    <nav className="bg-brand-700 text-white shadow-sm">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <AppLogo className="shrink-0" />
          <h1 className="text-lg font-bold leading-tight text-white sm:text-xl">
            ປະເມີນຜົນງານພະນັກງານ
          </h1>
        </div>
        <a
          href="/home"
          className="self-stretch rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-white/20 sm:self-auto"
        >
          ກັບໜ້າຫຼັກ
        </a>
      </div>
    </nav>
  );
}
