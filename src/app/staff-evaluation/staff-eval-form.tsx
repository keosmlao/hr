"use client";

import { useState, useEffect, useRef } from "react";

interface CriteriaRow {
  id: number;
  group_id: number;
  group_name: string;
  criteria_code: string;
  criteria_name: string;
  question_order: number;
  option_id: number;
  option_label: string;
  score: number;
}

interface EvalRow {
  id: number;
  evaluator_code: string;
  target_code: string;
  eval_type: string;
  year: string;
  month: number;
  scores: Record<string, { option_id: number; score: number }>;
  comment: string | null;
  created_at: string;
  target_name?: string;
}

interface Target {
  employee_code: string;
  fullname_lo: string;
  source: string;
}

interface AvailableMonth {
  year: string;
  month: number;
  label: string;
  selfDone: boolean;
}

interface StaffEvalFormProps {
  employeeCode: string;
  employeeName: string;
  isManager: boolean;
  criteria: CriteriaRow[];
  selfEval: EvalRow | null;
  managerEvals: EvalRow[];
  targets: Target[];
  evalMonth: number;
  evalYear: string;
  evalMonthLabel: string;
  availableMonths: AvailableMonth[];
}

type TabType = "self" | "team";

// Group criteria by criteria_code
function groupCriteria(criteria: CriteriaRow[]) {
  const groups: Record<
    number,
    {
      group_id: number;
      group_name: string;
      items: {
        criteria_code: string;
        criteria_name: string;
        question_order: number;
        options: { option_id: number; option_label: string; score: number }[];
      }[];
    }
  > = {};

  for (const c of criteria) {
    if (!groups[c.group_id]) {
      groups[c.group_id] = {
        group_id: c.group_id,
        group_name: c.group_name,
        items: [],
      };
    }
    const group = groups[c.group_id];
    let item = group.items.find((i) => i.criteria_code === c.criteria_code);
    if (!item) {
      item = {
        criteria_code: c.criteria_code,
        criteria_name: c.criteria_name,
        question_order: c.question_order,
        options: [],
      };
      group.items.push(item);
    }
    item.options.push({
      option_id: c.option_id,
      option_label: c.option_label,
      score: c.score,
    });
  }

  return Object.values(groups).sort((a, b) => a.group_id - b.group_id);
}

export default function StaffEvalForm({
  employeeCode,
  employeeName,
  isManager,
  criteria,
  selfEval: initialSelfEval,
  managerEvals: initialManagerEvals,
  targets,
  evalMonth,
  evalYear,
  evalMonthLabel,
  availableMonths,
}: StaffEvalFormProps) {
  const [tab, setTab] = useState<TabType>("self");
  const [selfEval, setSelfEval] = useState(initialSelfEval);
  const [managerEvals, setManagerEvals] = useState(initialManagerEvals);
  const [months, setMonths] = useState(availableMonths);

  // ເລືອກເດືອນຄ້າງທຳອິດ ຫຼື ເດືອນລ້າສຸດ
  const firstOverdue = months.find((m) => !m.selfDone);
  const initMonth = firstOverdue || months[months.length - 1];
  const [selectedMonth, setSelectedMonth] = useState(initMonth?.month ?? evalMonth);
  const [selectedYear, setSelectedYear] = useState(initMonth?.year ?? evalYear);
  const [isLoadingMonth, setIsLoadingMonth] = useState(false);
  const needsInitialLoad = useRef(
    !(initMonth?.month === evalMonth && initMonth?.year === evalYear)
  );

  const grouped = groupCriteria(criteria);

  const currentMonthObj = months.find(
    (m) => m.month === selectedMonth && m.year === selectedYear
  );
  const currentLabel = currentMonthObj?.label || evalMonthLabel;
  const overdueMonths = months.filter((m) => !m.selfDone);

  // ຫາ index ຂອງເດືອນຄ້າງທຳອິດ — ເດືອນຫຼັງຈາກນີ້ຈະຖືກລ໊ອກ
  const firstOverdueIdx = months.findIndex((m) => !m.selfDone);

  // ໂຫຼດຂໍ້ມູນເດືອນຄ້າງທຳອິດ (ຖ້າຕ່າງຈາກເດືອນທີ່ server ສົ່ງມາ)
  const loadMonthData = async (year: string, month: number) => {
    setIsLoadingMonth(true);
    try {
      const res = await fetch(
        `/api/staff-evaluation?year=${year}&month=${month}`
      );
      if (res.ok) {
        const data = await res.json();
        setSelfEval(data.selfEval);
        setManagerEvals(data.myEvals);
      }
    } catch {
      // keep current state
    } finally {
      setIsLoadingMonth(false);
    }
  };

  // ໂຫຼດຂໍ້ມູນເດືອນຄ້າງເມື່ອເຂົ້າໜ້າ
  useEffect(() => {
    if (needsInitialLoad.current) {
      needsInitialLoad.current = false;
      loadMonthData(selectedYear, selectedMonth);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMonthChange = async (m: AvailableMonth) => {
    if (m.month === selectedMonth && m.year === selectedYear) return;
    setSelectedMonth(m.month);
    setSelectedYear(m.year);
    await loadMonthData(m.year, m.month);
  };

  const handleSelfSuccess = (data: EvalRow) => {
    setSelfEval(data);
    const updatedMonths = months.map((m) =>
      m.month === selectedMonth && m.year === selectedYear
        ? { ...m, selfDone: true }
        : m
    );
    setMonths(updatedMonths);

    // ຍ້າຍໄປເດືອນຄ້າງຖັດໄປ ຫຼື ເດືອນລ້າສຸດ
    const nextOverdue = updatedMonths.find((m) => !m.selfDone);
    if (nextOverdue) {
      setTimeout(() => {
        handleMonthChange(nextOverdue);
      }, 1500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overdue alert */}
      {overdueMonths.length > 1 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-sm font-semibold text-amber-800">
            ຄ້າງປະເມີນ {overdueMonths.length} ເດືອນ
          </p>
          <p className="mt-1 text-xs text-amber-600">
            {overdueMonths.map((m) => m.label).join(", ")} — ກະລຸນາປະເມີນຕາມລຳດັບ
          </p>
        </div>
      )}

      {/* Month selector */}
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-100">
        <p className="mb-3 text-center text-xs text-brand-500">ເລືອກເດືອນປະເມີນ</p>
        <div className="flex flex-wrap justify-center gap-2">
          {months.map((m, idx) => {
            const isActive = m.month === selectedMonth && m.year === selectedYear;
            // ລ໊ອກເດືອນທີ່ຢູ່ຫຼັງເດືອນຄ້າງທຳອິດ (ຕ້ອງປະເມີນຕາມລຳດັບ)
            const isLocked =
              firstOverdueIdx !== -1 && idx > firstOverdueIdx && !m.selfDone;
            return (
              <button
                key={`${m.year}-${m.month}`}
                onClick={() => !isLocked && handleMonthChange(m)}
                disabled={isLoadingMonth || isLocked}
                className={`relative rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                  isLocked
                    ? "cursor-not-allowed bg-gray-100 text-gray-400 ring-1 ring-gray-200"
                    : isActive
                      ? "bg-brand-500 text-white"
                      : m.selfDone
                        ? "bg-brand-50 text-brand-700 ring-1 ring-brand-200 hover:bg-brand-100"
                        : "bg-amber-50 text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100"
                }`}
              >
                {m.label}
                {isLocked && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gray-400 text-[10px] text-white">
                    🔒
                  </span>
                )}
                {!isLocked && !m.selfDone && !isActive && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                    !
                  </span>
                )}
                {m.selfDone && !isActive && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-[10px] text-white">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-center text-lg font-bold text-brand-900">
          {currentLabel}
        </p>
        {firstOverdueIdx !== -1 && (
          <p className="mt-1 text-center text-xs text-amber-600">
            ຕ້ອງປະເມີນເດືອນ {months[firstOverdueIdx].label} ກ່ອນ ຈຶ່ງປະເມີນເດືອນຕໍ່ໄປໄດ້
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("self")}
          className={`rounded-xl px-5 py-3 text-sm font-semibold transition-all ${
            tab === "self"
              ? "bg-brand-500 text-white"
              : "bg-white text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50"
          }`}
        >
          ປະເມີນຕົນເອງ
        </button>
        {isManager && (
          <button
            onClick={() => setTab("team")}
            className={`rounded-xl px-5 py-3 text-sm font-semibold transition-all ${
              tab === "team"
                ? "bg-brand-500 text-white"
                : "bg-white text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50"
            }`}
          >
            ປະເມີນລູກທີມ
          </button>
        )}
      </div>

      {isLoadingMonth ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-brand-100">
          <p className="text-brand-500">ກຳລັງໂຫຼດ...</p>
        </div>
      ) : tab === "self" ? (
        selfEval ? (
          <EvalResult eval={selfEval} grouped={grouped} title="ຜົນປະເມີນຕົນເອງ" />
        ) : (
          <EvalFormSection
            grouped={grouped}
            targetCode={employeeCode}
            targetName={employeeName}
            label="ປະເມີນຕົນເອງ"
            evalYear={selectedYear}
            evalMonth={selectedMonth}
            onSuccess={handleSelfSuccess}
          />
        )
      ) : (
        <TeamEvalSection
          grouped={grouped}
          targets={targets}
          managerEvals={managerEvals}
          evalYear={selectedYear}
          evalMonth={selectedMonth}
          onEvalDone={(newEval) => setManagerEvals((prev) => [newEval, ...prev])}
        />
      )}
    </div>
  );
}

/* ===== Eval Form Section ===== */
function EvalFormSection({
  grouped,
  targetCode,
  targetName,
  label,
  evalYear,
  evalMonth,
  onSuccess,
}: {
  grouped: ReturnType<typeof groupCriteria>;
  targetCode: string;
  targetName: string;
  label: string;
  evalYear: string;
  evalMonth: number;
  onSuccess: (data: EvalRow) => void;
}) {
  const [selections, setSelections] = useState<
    Record<string, { option_id: number; score: number }>
  >({});
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalCriteria = grouped.reduce((sum, g) => sum + g.items.length, 0);
  const answeredCount = Object.keys(selections).length;
  const allAnswered = answeredCount === totalCriteria;

  const handleSelect = (
    criteriaCode: string,
    optionId: number,
    score: number
  ) => {
    setSelections((prev) => ({
      ...prev,
      [criteriaCode]: { option_id: optionId, score },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allAnswered) {
      setError("ກະລຸນາຕອບທຸກເກນປະເມີນ");
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/staff-evaluation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_code: targetCode,
          scores: selections,
          comment: comment || null,
          year: evalYear,
          month: evalMonth,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "ບໍ່ສາມາດບັນທຶກໄດ້");
      }
      const data = await res.json();
      onSuccess(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ເກີດຂໍ້ຜິດພາດ");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-brand-100">
        <h3 className="text-lg font-semibold text-brand-900">{label}</h3>
        <p className="mt-1 text-sm text-brand-500">
          ປະເມີນ: <span className="font-medium text-brand-800">{targetName}</span>
        </p>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-brand-50">
            <div
              className="h-full rounded-full bg-brand-400 transition-all"
              style={{
                width: `${totalCriteria > 0 ? (answeredCount / totalCriteria) * 100 : 0}%`,
              }}
            />
          </div>
          <span className="text-xs text-brand-500">
            {answeredCount}/{totalCriteria}
          </span>
        </div>
      </div>

      {grouped.map((group) => (
        <div
          key={group.group_id}
          className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-brand-100"
        >
          <h4 className="mb-1 text-base font-bold text-brand-900">
            {group.group_name}
          </h4>
          <p className="mb-5 text-sm text-brand-400">
            ເລືອກ 1 ລາຍການທີ່ເໝາະສົມທີ່ສຸດ
          </p>

          <div className="space-y-5">
            {group.items.map((item) => {
              const selected = selections[item.criteria_code];
              return (
                <div key={item.criteria_code}>
                  <p className="mb-2 text-sm font-semibold text-brand-800">
                    {item.question_order}. {item.criteria_name}
                  </p>
                  <div className="space-y-1.5">
                    {item.options.map((opt, optIdx) => {
                      const isSelected = selected?.option_id === opt.option_id;
                      const optionLetter = String.fromCharCode(0x0e81 + optIdx); // ກ, ຂ, ຄ...
                      return (
                        <button
                          key={opt.option_id}
                          type="button"
                          onClick={() =>
                            handleSelect(
                              item.criteria_code,
                              opt.option_id,
                              opt.score
                            )
                          }
                          className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm transition-all ${
                            isSelected
                              ? "border-brand-500 bg-brand-50 text-brand-900"
                              : "border-brand-100 text-brand-700 hover:border-brand-200 hover:bg-brand-50/50"
                          }`}
                        >
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                              isSelected
                                ? "bg-brand-500 text-white"
                                : "bg-brand-50 text-brand-500"
                            }`}
                          >
                            {optionLetter}
                          </span>
                          <span className="leading-snug">{opt.option_label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Comment */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-brand-100">
        <label className="mb-2 block text-sm font-medium text-brand-800">
          ຄຳເຫັນເພີ່ມເຕີມ (ຖ້າມີ)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-brand-200 bg-white px-4 py-3 text-brand-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          placeholder="ແນະນຳ ຫຼື ຄຳເຫັນ..."
        />
      </div>

      {/* Submit */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-brand-100">
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={isSubmitting || !allAnswered}
          className="w-full rounded-xl bg-brand-500 px-6 py-4 text-lg font-semibold text-white transition-all hover:bg-brand-600 active:scale-[0.98] disabled:opacity-70"
        >
          {isSubmitting ? "ກຳລັງບັນທຶກ..." : "ສົ່ງການປະເມີນ"}
        </button>
        {!allAnswered && (
          <p className="mt-2 text-center text-sm text-brand-400">
            ກະລຸນາຕອບທຸກ {totalCriteria} ເກນກ່ອນສົ່ງ
          </p>
        )}
      </div>
    </form>
  );
}

/* ===== Team Eval Section ===== */
function TeamEvalSection({
  grouped,
  targets,
  managerEvals,
  evalYear,
  evalMonth,
  onEvalDone,
}: {
  grouped: ReturnType<typeof groupCriteria>;
  targets: Target[];
  managerEvals: EvalRow[];
  evalYear: string;
  evalMonth: number;
  onEvalDone: (newEval: EvalRow) => void;
}) {
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null);

  const evaluatedCodes = new Set(managerEvals.map((e) => e.target_code));

  if (selectedTarget) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedTarget(null)}
          className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50"
        >
          &larr; ກັບລາຍຊື່
        </button>
        <EvalFormSection
          grouped={grouped}
          targetCode={selectedTarget.employee_code}
          targetName={selectedTarget.fullname_lo}
          label="ປະເມີນລູກທີມ"
          evalYear={evalYear}
          evalMonth={evalMonth}
          onSuccess={(data) => {
            onEvalDone(data);
            setSelectedTarget(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Target list */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-brand-100">
        <h3 className="mb-1 text-lg font-semibold text-brand-900">
          ເລືອກຄົນທີ່ຕ້ອງການປະເມີນ
        </h3>
        <p className="mb-4 text-sm text-brand-500">
          ລູກທີມ ແລະ ຄົນທີ່ assign ມາ ({targets.length} ຄົນ)
        </p>

        {targets.length === 0 ? (
          <p className="py-4 text-center text-sm text-brand-400">
            ບໍ່ມີລູກທີມ ຫຼື ບໍ່ໄດ້ assign ຄົນມາ
          </p>
        ) : (
          <div className="space-y-2">
            {targets.map((t) => {
              const done = evaluatedCodes.has(t.employee_code);
              return (
                <div
                  key={t.employee_code}
                  className="flex items-center justify-between gap-3 rounded-xl border border-brand-100 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-brand-900">
                      {t.fullname_lo || t.employee_code}
                    </p>
                    <p className="text-xs text-brand-400">
                      {t.source === "team" ? "ລູກທີມ" : "ຂ້າມພະແນກ"} &middot;{" "}
                      {t.employee_code}
                    </p>
                  </div>
                  {done ? (
                    <span className="shrink-0 rounded-xl bg-brand-50 px-4 py-2 text-xs font-semibold text-brand-700 ring-1 ring-brand-200">
                      ປະເມີນແລ້ວ
                    </span>
                  ) : (
                    <button
                      onClick={() => setSelectedTarget(t)}
                      className="shrink-0 rounded-xl bg-brand-500 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-brand-600 active:scale-[0.98]"
                    >
                      ປະເມີນ
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* History */}
      {managerEvals.length > 0 && (
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-brand-100">
          <h3 className="mb-4 text-lg font-semibold text-brand-900">
            ປະເມີນແລ້ວ ({managerEvals.length})
          </h3>
          <div className="space-y-2">
            {managerEvals.map((ev) => {
              const scores = ev.scores || {};
              const values = Object.values(scores).map((s) => s.score);
              const avg =
                values.length > 0
                  ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(
                      1
                    )
                  : "-";
              return (
                <div
                  key={ev.id}
                  className="rounded-xl border border-brand-100 px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-brand-900">
                        {ev.target_name || ev.target_code}
                      </p>
                      <p className="text-xs text-brand-400">
                        {ev.eval_type === "manager" ? "ລູກທີມ" : "ຂ້າມພະແນກ"}{" "}
                        &middot;{" "}
                        {new Date(ev.created_at).toLocaleDateString("lo-LA")}
                      </p>
                    </div>
                    <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700">
                      {avg}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== Eval Result (read-only) ===== */
function EvalResult({
  eval: ev,
  grouped,
  title,
}: {
  eval: EvalRow;
  grouped: ReturnType<typeof groupCriteria>;
  title: string;
}) {
  const scores = ev.scores || {};
  const allScores = Object.values(scores).map((s) => s.score);
  const avg =
    allScores.length > 0
      ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(2)
      : "-";

  return (
    <div className="space-y-6">
      {/* Success banner */}
      <div className="rounded-2xl border border-brand-200 bg-brand-50 p-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-brand-100">
          <svg
            className="h-7 w-7 text-brand-700"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-brand-900">{title}</h3>
        <p className="mt-1 text-3xl font-bold text-brand-700">{avg}</p>
        <p className="text-sm text-brand-500">ຄະແນນສະເລ່ຍ</p>
      </div>

      {/* Detail by group */}
      {grouped.map((group) => (
        <div
          key={group.group_id}
          className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-brand-100"
        >
          <h4 className="mb-4 text-base font-bold text-brand-900">
            {group.group_name}
          </h4>
          <div className="space-y-3">
            {group.items.map((item) => {
              const sel = scores[item.criteria_code];
              const selectedOpt = sel
                ? item.options.find((o) => o.option_id === sel.option_id)
                : null;
              return (
                <div
                  key={item.criteria_code}
                  className="rounded-xl border border-brand-100 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-brand-800">
                      {item.question_order}. {item.criteria_name}
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                        (sel?.score || 0) >= 4
                          ? "bg-brand-50 text-brand-700"
                          : (sel?.score || 0) >= 3
                            ? "bg-yellow-50 text-yellow-700"
                            : "bg-red-50 text-red-700"
                      }`}
                    >
                      {sel?.score || "-"}
                    </span>
                  </div>
                  {selectedOpt && (
                    <p className="mt-1 text-xs text-brand-500">
                      {selectedOpt.option_label}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {ev.comment && (
        <div className="rounded-2xl bg-brand-50 px-5 py-4 ring-1 ring-brand-100">
          <p className="text-xs text-brand-500">ຄຳເຫັນ</p>
          <p className="mt-1 text-sm text-brand-800">{ev.comment}</p>
        </div>
      )}
    </div>
  );
}
