import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import pool from "@/lib/db";
import AppLogo from "@/components/app-logo";
import EvaluationForm from "./evaluation-form";

interface SessionData {
  lineUserId: string;
  lineDisplayName: string;
  linePictureUrl: string | null;
  employee: {
    employeeCode: string;
    fullnameLo: string;
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

export default async function PerformanceEvaluationPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const empResult = await pool.query(
    `SELECT employee_code, position_code, department_code FROM odg_employee WHERE line_id = $1`,
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

  // Check if already submitted
  const existing = await pool.query(
    `SELECT * FROM odg_od_evaluation WHERE employee_code = $1 LIMIT 1`,
    [emp.employee_code]
  );
  const submitted = existing.rows[0] || null;

  // ສະເພາະຜູ້ຈັດການ ໄອທີ (801) ແລະ ບຸກຄະລາກອນ (701) ຈຶ່ງເຫັນສະຫຼຸບ
  const canViewSummary =
    emp.position_code === "11" &&
    ["701", "801"].includes(emp.department_code);

  let stats = null;
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
    stats = summary.rows[0] || null;
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,var(--brand-50)_0%,#ffffff_100%)]">
      <Nav />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <EvaluationForm
          submitted={submitted}
          summary={stats}
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
            ປະເມີນຜົນງານ OD 2026
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
