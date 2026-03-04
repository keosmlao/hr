import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import pool from "@/lib/db";
import AppLogo from "@/components/app-logo";
import AssignForm from "./assign-form";

interface SessionData {
  lineUserId: string;
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

export default async function StaffEvalAssignPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const empResult = await pool.query(
    `SELECT employee_code, position_code, department_code, unit_code
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

  const isManager = ["11", "12"].includes(emp.position_code);

  if (!isManager) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,var(--brand-50)_0%,#ffffff_100%)]">
        <Nav />
        <main className="mx-auto max-w-3xl px-6 py-8">
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-brand-100">
            <p className="text-brand-500">ສະເພາະຫົວໜ້າ ແລະ ຜູ້ຈັດການ ເທົ່ານັ້ນ</p>
            <a href="/home" className="mt-4 inline-block text-sm text-brand-700 underline">
              ກັບໜ້າຫຼັກ
            </a>
          </div>
        </main>
      </div>
    );
  }

  const year = String(new Date().getFullYear());

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
    [emp.employee_code, year]
  );

  // ຄົນທີ່ເລືອກໄດ້
  let posFilter = "AND e.position_code NOT IN ('11','12')";
  if (emp.position_code === "11") {
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
    [emp.employee_code, year]
  );

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,var(--brand-50)_0%,#ffffff_100%)]">
      <Nav />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <AssignForm
          assigned={assigned.rows}
          candidates={candidates.rows}
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
            ຕັ້ງຄ່າຜູ້ຖືກປະເມີນເພີ່ມເຕີມ
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
