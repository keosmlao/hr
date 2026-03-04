"use client";

import { useState } from "react";

interface EvaluationRow {
  id: number;
  employee_code: string;
  q1: boolean;
  q2: boolean;
  q3: boolean;
  q4: boolean;
  q5: boolean;
  q6: boolean;
  comment: string | null;
  created_at: string;
}

interface SummaryStats {
  total: string;
  q1_good: string;
  q2_good: string;
  q3_good: string;
  q4_good: string;
  q5_good: string;
  q6_good: string;
}

const QUESTIONS = [
  { key: "q1", label: "ທ່ານຄິດວ່າການຈັດງານ OD 2026 ເປັນແນວໃດ?" },
  { key: "q2", label: "ການເດີນທາງເປັນແນວໃດ?" },
  { key: "q3", label: "ກິດຈະກຳສັນທະນາການເປັນແນວໃດ?" },
  { key: "q4", label: "ງານລ້ຽງ ແລະ ການແຈກຂອງລາງວັນເປັນແນວໃດ?" },
  { key: "q5", label: "ອາຫານ ແລະ ເຄື່ອງດື່ມ ເປັນແນວໃດ?" },
  { key: "q6", label: "ການບໍລິການຂອງຜູ້ດຳເນີນງານ ເປັນແນວໃດ?" },
] as const;

interface EvaluationFormProps {
  submitted: EvaluationRow | null;
  summary: SummaryStats | null;
}

export default function EvaluationForm({
  submitted: initialSubmitted,
  summary: initialSummary,
}: EvaluationFormProps) {
  const [submitted, setSubmitted] = useState(initialSubmitted);
  const [summary, setSummary] = useState(initialSummary);
  const [answers, setAnswers] = useState<Record<string, boolean | null>>({
    q1: null,
    q2: null,
    q3: null,
    q4: null,
    q5: null,
    q6: null,
  });
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allAnswered = QUESTIONS.every((q) => answers[q.key] !== null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allAnswered) {
      setError("ກະລຸນາຕອບທຸກຄຳຖາມ");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/od-evaluation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q1: answers.q1,
          q2: answers.q2,
          q3: answers.q3,
          q4: answers.q4,
          q5: answers.q5,
          q6: answers.q6,
          comment: comment || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "ບໍ່ສາມາດບັນທຶກໄດ້");
      }

      // Refresh data
      const refreshRes = await fetch("/api/od-evaluation");
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        setSubmitted(data.submitted);
        setSummary(data.summary);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "ເກີດຂໍ້ຜິດພາດ");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Already submitted — show results
  if (submitted) {
    const total = Number(summary?.total || 0);

    return (
      <div className="space-y-6">
        {/* Success banner */}
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-brand-100">
            <svg className="h-7 w-7 text-brand-700" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-brand-900">
            ທ່ານໄດ້ປະເມີນແລ້ວ
          </h3>
          <p className="mt-1 text-sm text-brand-500">
            ຂອບໃຈທີ່ຮ່ວມປະເມີນການຈັດງານ OD 2026
          </p>
        </div>

        {/* My answers */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-brand-100">
          <h3 className="mb-4 text-lg font-semibold text-brand-900">
            ຜົນການປະເມີນຂອງທ່ານ
          </h3>
          <div className="space-y-3">
            {QUESTIONS.map((q, i) => {
              const val = submitted[q.key as keyof EvaluationRow] as boolean;
              return (
                <div
                  key={q.key}
                  className="flex items-center justify-between rounded-xl border border-brand-100 px-4 py-3"
                >
                  <span className="text-sm text-brand-800">
                    {i + 1}. {q.label}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                      val
                        ? "bg-brand-50 text-brand-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {val ? "ດີ" : "ບໍ່ດີ"}
                  </span>
                </div>
              );
            })}
          </div>
          {submitted.comment && (
            <div className="mt-4 rounded-xl bg-brand-50 px-4 py-3">
              <p className="text-xs text-brand-500">ຄຳເຫັນເພີ່ມເຕີມ</p>
              <p className="mt-1 text-sm text-brand-800">{submitted.comment}</p>
            </div>
          )}
        </div>

        {/* Summary */}
        {total > 0 && (
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-brand-100">
            <h3 className="mb-1 text-lg font-semibold text-brand-900">
              ສະຫຼຸບຜົນປະເມີນລວມ
            </h3>
            <p className="mb-4 text-sm text-brand-500">
              ຈາກຜູ້ປະເມີນທັງໝົດ {total} ຄົນ
            </p>
            <div className="space-y-4">
              {QUESTIONS.map((q, i) => {
                const goodCount = Number(
                  summary?.[`${q.key}_good` as keyof SummaryStats] || 0
                );
                const pct = total > 0 ? Math.round((goodCount / total) * 100) : 0;

                return (
                  <div key={q.key}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm text-brand-800">
                        {i + 1}. {q.label}
                      </span>
                      <span className="text-sm font-semibold text-brand-700">
                        {pct}% ດີ
                      </span>
                    </div>
                    <div className="flex h-3 overflow-hidden rounded-full bg-brand-50">
                      <div
                        className="rounded-full bg-brand-400 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-xs text-brand-400">
                      <span>ດີ {goodCount} ຄົນ</span>
                      <span>ບໍ່ດີ {total - goodCount} ຄົນ</span>
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

  // Not submitted — show form
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-brand-100">
        <h3 className="mb-1 text-lg font-semibold text-brand-900">
          ແບບປະເມີນການຈັດງານ OD 2026
        </h3>
        <p className="mb-6 text-sm text-brand-400">
          ກະລຸນາປະເມີນແຕ່ລະຫົວຂໍ້ໂດຍເລືອກ ດີ ຫຼື ບໍ່ດີ
        </p>

        <div className="space-y-4">
          {QUESTIONS.map((q, i) => (
            <div
              key={q.key}
              className={`rounded-xl border px-4 py-4 transition-all ${
                answers[q.key] !== null
                  ? "border-brand-300 bg-brand-50/50"
                  : "border-brand-100"
              }`}
            >
              <p className="mb-3 text-sm font-medium text-brand-800">
                {i + 1}. {q.label}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setAnswers((prev) => ({ ...prev, [q.key]: true }))
                  }
                  className={`flex-1 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all ${
                    answers[q.key] === true
                      ? "border-brand-500 bg-brand-500 text-white"
                      : "border-brand-200 text-brand-700 hover:border-brand-300 hover:bg-brand-50"
                  }`}
                >
                  ດີ
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setAnswers((prev) => ({ ...prev, [q.key]: false }))
                  }
                  className={`flex-1 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all ${
                    answers[q.key] === false
                      ? "border-red-500 bg-red-500 text-white"
                      : "border-brand-200 text-brand-700 hover:border-red-300 hover:bg-red-50"
                  }`}
                >
                  ບໍ່ດີ
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

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
          placeholder="ແນະນຳ ຫຼື ຄຳເຫັນເພີ່ມເຕີມ..."
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
            ກະລຸນາຕອບທຸກ {QUESTIONS.length} ຄຳຖາມກ່ອນສົ່ງ
          </p>
        )}
      </div>
    </form>
  );
}
