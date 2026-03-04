import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import pool from "@/lib/db";
import AppLogo from "@/components/app-logo";
import SummaryTable from "./summary-table";

const MONTH_ABBR = [
  "", "ມ.ກ.", "ກ.ພ.", "ມີ.ນ.", "ເມ.ສ.", "ພ.ພ.", "ມິ.ຖ.",
  "ກ.ລ.", "ສ.ຫ.", "ກ.ຍ.", "ຕ.ລ.", "ພ.ຈ.", "ທ.ວ.",
];

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

interface SelfEvalRow {
  month: number;
  scores: Record<string, { option_id: number; score: number }>;
}

interface TeamEvalRow {
  target_code: string;
  target_name: string;
  position_name_lo: string | null;
  month: number;
  scores: Record<string, { option_id: number; score: number }>;
}

interface CriteriaInfo {
  criteria_code: string;
  criteria_name: string;
  question_order: number;
  group_name: string;
}

export default async function StaffEvalSummaryPage() {
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
        <main className="mx-auto max-w-5xl px-6 py-8">
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-brand-100">
            <p className="text-brand-500">ບໍ່ພົບຂໍ້ມູນພະນັກງານ</p>
          </div>
        </main>
      </div>
    );
  }

  const year = String(new Date().getFullYear());
  const isManager = ["11", "12"].includes(emp.position_code);

  // Criteria names (distinct)
  const criteriaResult = await pool.query(
    `SELECT DISTINCT criteria_code, criteria_name, question_order, group_name
     FROM odg_staff_eval_criteria
     ORDER BY question_order`
  );
  const criteriaList: CriteriaInfo[] = criteriaResult.rows;

  // Self evaluations for all months
  const selfResult = await pool.query(
    `SELECT month, scores FROM odg_staff_evaluation
     WHERE evaluator_code = $1 AND target_code = $1 AND year = $2
     ORDER BY month`,
    [emp.employee_code, year]
  );
  const selfEvals: SelfEvalRow[] = selfResult.rows;

  // Build self pivot: criteria × months
  const selfPivot = criteriaList.map((c) => {
    const monthScores: Record<number, number | null> = {};
    for (let m = 1; m <= 12; m++) {
      const evalForMonth = selfEvals.find((e) => e.month === m);
      if (evalForMonth && evalForMonth.scores[c.criteria_code]) {
        monthScores[m] = evalForMonth.scores[c.criteria_code].score;
      } else {
        monthScores[m] = null;
      }
    }
    return {
      criteria_code: c.criteria_code,
      criteria_name: c.criteria_name,
      group_name: c.group_name,
      question_order: c.question_order,
      scores: monthScores,
    };
  });

  // Team pivot (managers only)
  let teamPivot: {
    employee_code: string;
    fullname_lo: string;
    position_name_lo: string | null;
    scores: Record<number, number | null>;
  }[] = [];

  if (isManager) {
    const teamResult = await pool.query(
      `SELECT se.target_code, e.fullname_lo, p.position_name_lo, se.month, se.scores
       FROM odg_staff_evaluation se
       LEFT JOIN odg_employee e ON e.employee_code = se.target_code
       LEFT JOIN odg_position p ON p.position_code = e.position_code
       WHERE se.evaluator_code = $1 AND se.target_code != $1 AND se.year = $2
       ORDER BY e.fullname_lo, se.month`,
      [emp.employee_code, year]
    );
    const teamEvals: TeamEvalRow[] = teamResult.rows.map((r: TeamEvalRow) => ({
      target_code: r.target_code,
      target_name: r.target_name,
      position_name_lo: r.position_name_lo,
      month: r.month,
      scores: r.scores,
    }));

    // Group by target
    const byTarget: Record<string, { fullname_lo: string; position_name_lo: string | null; evals: TeamEvalRow[] }> = {};
    for (const row of teamResult.rows as TeamEvalRow[]) {
      if (!byTarget[row.target_code]) {
        byTarget[row.target_code] = {
          fullname_lo: (row as unknown as { fullname_lo: string }).fullname_lo,
          position_name_lo: row.position_name_lo,
          evals: [],
        };
      }
      byTarget[row.target_code].evals.push(row);
    }

    teamPivot = Object.entries(byTarget).map(([code, data]) => {
      const monthScores: Record<number, number | null> = {};
      for (let m = 1; m <= 12; m++) {
        const evalForMonth = data.evals.find((e) => e.month === m);
        if (evalForMonth && evalForMonth.scores) {
          const values = Object.values(evalForMonth.scores).map((s) => s.score);
          monthScores[m] = values.length > 0
            ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100
            : null;
        } else {
          monthScores[m] = null;
        }
      }
      return {
        employee_code: code,
        fullname_lo: data.fullname_lo,
        position_name_lo: data.position_name_lo,
        scores: monthScores,
      };
    });
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,var(--brand-50)_0%,#ffffff_100%)]">
      <Nav />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <SummaryTable
          selfPivot={selfPivot}
          teamPivot={teamPivot}
          isManager={isManager}
          monthAbbr={MONTH_ABBR}
          year={year}
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
            ສະຫຼຸບການປະເມີນ
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
