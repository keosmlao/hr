import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import pool from "@/lib/db";
import AppLogo from "@/components/app-logo";

const SKILLS: Record<string, string> = {
  "1": "ພາວະຜູ້ນຳ",
  "2": "ບົດບາດໜ້າທີ່ຂອງຫົວໜ້າງານ",
  "3": "ສິລະປະການບັງຄັບບັນຊາ",
  "4": "ທັກສະການວາງແຜນ ແລະ ບໍລິຫານງານ",
  "5": "ການບໍລິຫານທີມງານ ແລະ ບໍລິຫານຜົນງານ",
  "6": "ການສື່ສານ / ປະສານງານ / ມອບໝາຍ / ຕິດຕາມງານ",
  "7": "HR for Non HR (ການບໍລິຫານຄົນ)",
  "8": "ຈັນຍາບັນໃນການເຮັດວຽກ",
  "9": "ການແກ້ໄຂບັນຫາ ແລະ ການຕັດສິນໃຈ",
  "10": "ຫົວໃຈການບໍລິການ (Service Mind)",
  "11": "ການບໍລິຫານ KPI",
  "12": "ການຈັດການຄວາມຂັດແຍ່ງ",
  "13": "ການບໍລິຫານການປ່ຽນແປງ",
  "14": "ການສອນງານ ແລະ ພັດທະນາລູກທີມ",
  "15": "ການໃຊ້ເຄື່ອງມື AI (ChatGPT, Gemini)",
  "16": "Soft Skill",
};

interface SessionData {
  lineUserId: string;
  lineDisplayName: string;
  linePictureUrl: string | null;
  employee: unknown;
}

interface SkillRank {
  id: string;
  label: string;
  voteCount: number;
  avgPriority: number;
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

export default async function TrainingNeedHomePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Check employee
  const empResult = await pool.query(
    `SELECT employee_code, position_code, division_code FROM odg_employee WHERE line_id = $1`,
    [session.lineUserId]
  );
  const emp = empResult.rows[0] || null;

  // ກວດວ່າເປັນຜູ້ຈັດການ ຫຼື ຫົວໜ້າ ບໍ
  const isSurveyor =
    emp && ["11", "12"].includes(emp.position_code);

  // Check if this employee already submitted
  let hasSubmitted = false;
  if (emp) {
    const subResult = await pool.query(
      `SELECT 1 FROM odg_training_survey WHERE employee_code = $1 LIMIT 1`,
      [emp.employee_code]
    );
    hasSubmitted = subResult.rows.length > 0;
  }

  // ດຶງຂໍ້ມູນສະຫຼຸບສະເພາະຜູ້ຈັດການ ໄອທີ+ບຸກຄະລາກອນ ເທົ່ານັ້ນ
  let totalTarget = 0;
  let totalSubmitted = 0;
  let totalRemaining = 0;
  let ranked: SkillRank[] = [];
  const teamProblems: string[] = [];
  const suggestedCourses: string[] = [];

  if (isSurveyor) {
    const targetResult = await pool.query(
      `SELECT COUNT(*) as total FROM odg_employee
       WHERE position_code IN ('11', '12')`
    );
    totalTarget = Number(targetResult.rows[0]?.total || 0);

    const submittedResult = await pool.query(
      `SELECT COUNT(*) as total FROM odg_training_survey ts
       INNER JOIN odg_employee e ON e.employee_code = ts.employee_code
       WHERE e.position_code IN ('11', '12')`
    );
    totalSubmitted = Number(submittedResult.rows[0]?.total || 0);
    totalRemaining = totalTarget - totalSubmitted;

    // Aggregate all survey responses
    const allSurveys = await pool.query(
      `SELECT skill_priorities, team_problems, suggested_course FROM odg_training_survey`
    );

    const skillStats: Record<string, { totalPriority: number; count: number }> = {};
    for (const row of allSurveys.rows) {
      const priorities = row.skill_priorities || {};
      for (const [key, value] of Object.entries(priorities)) {
        if (key.includes("_topic")) continue;
        const numVal = Number(value);
        if (Number.isNaN(numVal)) continue;
        if (!skillStats[key]) {
          skillStats[key] = { totalPriority: 0, count: 0 };
        }
        skillStats[key].totalPriority += numVal;
        skillStats[key].count += 1;
      }
    }

    // ເກັບ text answers
    for (const row of allSurveys.rows) {
      if (row.team_problems?.trim()) teamProblems.push(row.team_problems.trim());
      if (row.suggested_course?.trim()) suggestedCourses.push(row.suggested_course.trim());
    }

    ranked = Object.entries(skillStats)
      .map(([id, stats]) => ({
        id,
        label: SKILLS[id] || `Skill ${id}`,
        voteCount: stats.count,
        avgPriority: stats.totalPriority / stats.count,
      }))
      .sort((a, b) => {
        if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
        return a.avgPriority - b.avgPriority;
      });
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,var(--brand-50)_0%,#ffffff_100%)]">
      <nav className="bg-brand-700 text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <AppLogo className="shrink-0" />
            <h1 className="text-lg font-bold leading-tight text-white sm:text-xl">
              ຄວາມຕ້ອງການຝຶກອົບຮົມ
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

      <main className="mx-auto max-w-3xl px-6 py-8">
        {/* Survey Button — ສະເພາະຜູ້ຈັດການ ແລະ ຫົວໜ້າ */}
        {isSurveyor ? (
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-brand-100">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-brand-900">
                  ແບບສຳຫຼວດຄວາມຕ້ອງການ
                </h3>
                <p className="mt-1 text-sm text-brand-500">
                  {hasSubmitted
                    ? "ທ່ານໄດ້ສົ່ງແບບສຳຫຼວດແລ້ວ."
                    : "ກະລຸນາຕອບແບບສຳຫຼວດເພື່ອລະບຸທັກສະທີ່ຕ້ອງການພັດທະນາ."}
                </p>
              </div>
              {hasSubmitted ? (
                <span className="shrink-0 rounded-xl bg-brand-50 px-6 py-3 text-sm font-semibold text-brand-700 ring-1 ring-brand-200">
                  ສົ່ງແລ້ວ
                </span>
              ) : (
                <Link
                  href="/training-need/survey"
                  className="shrink-0 rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-brand-600 active:scale-[0.98]"
                >
                  ເລີ່ມສຳຫຼວດ
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-brand-100">
            <p className="text-brand-500">
              ແບບສຳຫຼວດນີ້ສະເພາະຜູ້ຈັດການ ແລະ ຫົວໜ້າພະແນກເທົ່ານັ້ນ.
            </p>
          </div>
        )}

        {/* ສະແດງຜົນສະຫຼຸບສະເພາະຜູ້ຈັດການ ໄອທີ+ບຸກຄະລາກອນ */}
        {isSurveyor && (
          <>
            {/* Stats */}
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-100">
                <p className="text-xs text-brand-500">ຜູ້ຕ້ອງຕອບ (ຫົວໜ້າ+ຜູ້ຈັດການ)</p>
                <p className="mt-1 text-2xl font-bold text-brand-900">
                  {totalTarget}
                </p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-100">
                <p className="text-xs text-brand-500">ຕອບແລ້ວ</p>
                <p className="mt-1 text-2xl font-bold text-brand-700">
                  {totalSubmitted}
                </p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-100">
                <p className="text-xs text-brand-500">ຍັງບໍ່ທັນຕອບ</p>
                <p className="mt-1 text-2xl font-bold text-red-600">
                  {totalRemaining}
                </p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-100">
                <p className="text-xs text-brand-500">ທັກສະທີ່ຖືກເລືອກ</p>
                <p className="mt-1 text-2xl font-bold text-brand-900">
                  {ranked.length}
                </p>
              </div>
            </div>

            {/* Ranked Training List */}
            {ranked.length > 0 && (
              <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-brand-100">
                <h3 className="mb-4 text-lg font-semibold text-brand-900">
                  ລາຍການຝຶກອົບຮົມ ລຽງຕາມຄວາມສຳຄັນ
                </h3>
                <div className="space-y-3">
                  {ranked.map((skill, index) => {
                    const maxVotes = ranked[0]?.voteCount || 1;
                    const barWidth = Math.round((skill.voteCount / maxVotes) * 100);

                    return (
                      <div
                        key={skill.id}
                        className="rounded-xl border border-brand-100 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                                index < 3
                                  ? "bg-brand-500 text-white"
                                  : "bg-brand-50 text-brand-700"
                              }`}
                            >
                              {index + 1}
                            </span>
                            <div>
                              <p className="font-medium text-brand-900">
                                {skill.label}
                              </p>
                              <p className="mt-1 text-xs text-brand-500">
                                {skill.voteCount} ຄົນເລືອກ &middot; ຄ່າສະເລ່ຍລຳດັບ{" "}
                                {skill.avgPriority.toFixed(1)}
                              </p>
                            </div>
                          </div>
                          <span className="shrink-0 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                            {skill.voteCount}
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-brand-50">
                          <div
                            className="h-full rounded-full bg-brand-400 transition-all"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {ranked.length === 0 && (
              <div className="mt-6 rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-brand-100">
                <p className="text-brand-500">
                  ຍັງບໍ່ມີຂໍ້ມູນ. ກະລຸນາຕອບແບບສຳຫຼວດກ່ອນ.
                </p>
              </div>
            )}

            {/* ຄຳຕອບຂໍ້ 3: ບັນຫາຫຼັກໃນການບໍລິຫານທີມ */}
            {teamProblems.length > 0 && (
              <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-brand-100">
                <h3 className="mb-4 text-lg font-semibold text-brand-900">
                  ບັນຫາຫຼັກທີ່ພົບໃນການບໍລິຫານທີມ
                </h3>
                <div className="space-y-2">
                  {teamProblems.map((text, i) => (
                    <div key={i} className="rounded-lg border border-brand-100 px-4 py-3 text-sm text-brand-800">
                      {text}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ຄຳຕອບຂໍ້ 4: ຫຼັກສູດທີ່ແນະນຳ */}
            {suggestedCourses.length > 0 && (
              <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-brand-100">
                <h3 className="mb-4 text-lg font-semibold text-brand-900">
                  ຫຼັກສູດທີ່ສຳຄັນທີ່ສຸດສຳລັບທ່ານ
                </h3>
                <div className="space-y-2">
                  {suggestedCourses.map((text, i) => (
                    <div key={i} className="rounded-lg border border-brand-100 px-4 py-3 text-sm text-brand-800">
                      {text}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
