import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import pool from "@/lib/db";
import AppLogo from "@/components/app-logo";
import TrainingNeedForm from "./training-need-form";

interface SessionData {
  lineUserId: string;
  lineDisplayName: string;
  linePictureUrl: string | null;
  employee: unknown;
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

export default async function SurveyPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const empResult = await pool.query(
    `SELECT
       e.employee_code,
       e.fullname_lo,
       e.title_lo,
       e.department_code,
       e.position_code,
       d.department_name_lo
     FROM odg_employee e
     LEFT JOIN odg_department d ON d.department_code = e.department_code
     WHERE e.line_id = $1`,
    [session.lineUserId]
  );
  const emp = empResult.rows[0] || null;

  // ສະເພາະຜູ້ຈັດການ (11) ແລະ ຫົວໜ້າ (12) ເທົ່ານັ້ນ
  if (!emp || !["11", "12"].includes(emp.position_code)) {
    redirect("/training-need");
  }

  // Redirect if already submitted
  const existing = await pool.query(
    `SELECT 1 FROM odg_training_survey WHERE employee_code = $1 LIMIT 1`,
    [emp.employee_code]
  );
  if (existing.rows.length > 0) {
    redirect("/training-need");
  }

  let teamCount = 0;
  if (emp?.department_code && emp?.position_code) {
    const countResult = await pool.query(
      `SELECT COUNT(*) as cnt FROM odg_employee
       WHERE department_code = $1 AND position_code > $2`,
      [emp.department_code, emp.position_code]
    );
    teamCount = Number(countResult.rows[0]?.cnt || 0);
  }

  let trainingNeeds = [];
  if (emp) {
    const tnResult = await pool.query(
      `SELECT * FROM odg_training_survey
       WHERE employee_code = $1
       ORDER BY created_at DESC`,
      [emp.employee_code]
    );
    trainingNeeds = tnResult.rows;
  }

  const displayName = emp
    ? `${emp.title_lo ? emp.title_lo + " " : ""}${emp.fullname_lo || ""}`
    : session.lineDisplayName || "";

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,var(--brand-50)_0%,#ffffff_100%)]">
      <nav className="bg-brand-700 text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <AppLogo className="shrink-0" />
            <h1 className="text-lg font-bold leading-tight text-white sm:text-xl">
              ແບບສຳຫຼວດຄວາມຕ້ອງການຝຶກອົບຮົມ
            </h1>
          </div>
          <a
            href="/training-need"
            className="self-stretch rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-white/20 sm:self-auto"
          >
            ກັບຄືນ
          </a>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 py-8">
        {emp ? (
          <TrainingNeedForm
            initialData={trainingNeeds}
            employeeName={displayName}
            departmentName={emp.department_name_lo || "-"}
            teamCount={teamCount}
          />
        ) : (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-brand-100">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-brand-50">
              <span className="text-3xl">⚠️</span>
            </div>
            <h3 className="text-lg font-semibold text-brand-900">
              ບໍ່ພົບຂໍ້ມູນພະນັກງານ
            </h3>
            <p className="mt-2 text-brand-500">
              ບັນຊີ LINE ຂອງທ່ານຍັງບໍ່ໄດ້ເຊື່ອມກັບຂໍ້ມູນພະນັກງານໃນລະບົບ
            </p>
            <a
              href="/home"
              className="mt-4 inline-block rounded-lg bg-brand-500 px-6 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              ກັບໜ້າຫຼັກ
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
