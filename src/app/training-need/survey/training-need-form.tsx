"use client";

import { useState } from "react";

interface Skill {
  id: string;
  label: string;
  hasInput?: boolean;
}

const SKILLS: Skill[] = [
  { id: "1", label: "ພາວະຜູ້ນຳ (ภาวะของผู้นำ)" },
  { id: "2", label: "ບົດບາດໜ້າທີ່ຂອງຫົວໜ້າງານ" },
  { id: "3", label: "ສິລະປະການບັງຄັບບັນຊາ" },
  { id: "4", label: "ທັກສະການວາງແຜນ ແລະ ບໍລິຫານງານ" },
  { id: "5", label: "ການບໍລິຫານທີມງານ ແລະ ບໍລິຫານຜົນງານ" },
  { id: "6", label: "ການສື່ສານ / ປະສານງານ / ມອບໝາຍ / ຕິດຕາມງານ" },
  { id: "7", label: "HR for Non HR (ການບໍລິຫານຄົນ)" },
  { id: "8", label: "ຈັນຍາບັນໃນການເຮັດວຽກ" },
  { id: "9", label: "ການແກ້ໄຂບັນຫາ ແລະ ການຕັດສິນໃຈ" },
  { id: "10", label: "ຫົວໃຈການບໍລິການ (Service Mind)" },
  { id: "11", label: "ການບໍລິຫານ KPI" },
  { id: "12", label: "ການຈັດການຄວາມຂັດແຍ່ງ" },
  { id: "13", label: "ການບໍລິຫານການປ່ຽນແປງ" },
  { id: "14", label: "ການສອນງານ ແລະ ພັດທະນາລູກທີມ" },
  { id: "15", label: "ການໃຊ້ເຄື່ອງມື AI (ChatGPT, Gemini)" },
  { id: "16", label: "Soft Skill", hasInput: true },
];

interface TrainingNeedRow {
  id: number;
  employee_code: string;
  department_name: string | null;
  team_count: number | null;
  supervisor_years: string | null;
  skill_priorities: Record<string, number> | null;
  team_problems: string | null;
  suggested_course: string | null;
  fiscal_year: string;
  status: string;
  created_at: string;
}

interface TrainingNeedFormProps {
  initialData: TrainingNeedRow[];
  employeeName: string;
  departmentName: string;
  teamCount: number;
}

const statusLabels: Record<string, string> = {
  PENDING: "ລໍຖ້າ",
  APPROVED: "ອະນຸມັດ",
  REJECTED: "ປະຕິເສດ",
  COMPLETED: "ສຳເລັດ",
};

const statusColors: Record<string, string> = {
  PENDING: "bg-brand-50 text-brand-700",
  APPROVED: "bg-brand-50 text-brand-700",
  REJECTED: "bg-red-100 text-red-700",
  COMPLETED: "bg-brand-100 text-brand-800",
};

export default function TrainingNeedForm({
  initialData,
  employeeName,
  departmentName,
  teamCount,
}: TrainingNeedFormProps) {
  const [items, setItems] = useState<TrainingNeedRow[]>(initialData);
  const [supervisorYears, setSupervisorYears] = useState("");
  const [skillPriorities, setSkillPriorities] = useState<Record<string, string>>({});
  const [softSkillTopic, setSoftSkillTopic] = useState("");
  const [teamProblems, setTeamProblems] = useState("");
  const [suggestedCourse, setSuggestedCourse] = useState("");
  const [fiscalYear, setFiscalYear] = useState("2026");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSkillPriorityChange = (skillId: string, value: string) => {
    const updated = { ...skillPriorities };
    if (value === "") {
      delete updated[skillId];
    } else {
      updated[skillId] = value;
    }
    setSkillPriorities(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    // Validate at least one skill has priority
    const priorities: Record<string, number> = {};
    for (const [key, val] of Object.entries(skillPriorities)) {
      if (val !== "") {
        priorities[key] = Number(val);
      }
    }

    if (Object.keys(priorities).length === 0) {
      setError("ກະລຸນາໃສ່ລຳດັບຄວາມສຳຄັນຢ່າງໜ້ອຍ 1 ທັກສະ");
      setIsSubmitting(false);
      return;
    }

    // If soft skill topic is provided, include it
    const skillData: Record<string, number | string> = { ...priorities };
    if (softSkillTopic) {
      skillData["16_topic"] = softSkillTopic;
    }

    try {
      const res = await fetch("/api/training-needs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          department_name: departmentName,
          team_count: teamCount,
          supervisor_years: supervisorYears || null,
          skill_priorities: skillData,
          team_problems: teamProblems || null,
          suggested_course: suggestedCourse || null,
          fiscal_year: fiscalYear,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "ບໍ່ສາມາດບັນທຶກໄດ້");
      }

      setSuccess(true);
      setSupervisorYears("");
      setSkillPriorities({});
      setSoftSkillTopic("");
      setTeamProblems("");
      setSuggestedCourse("");

      // Refresh list
      const listRes = await fetch("/api/training-needs");
      if (listRes.ok) {
        setItems(await listRes.json());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "ເກີດຂໍ້ຜິດພາດ");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-brand-200 bg-white px-4 py-3 text-brand-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";

  return (
    <div className="space-y-6">
      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Part 1: General Info */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-brand-100">
          <h3 className="mb-1 text-lg font-semibold text-brand-900">
            ສ່ວນທີ 1 : ຂໍ້ມູນທົ່ວໄປ
          </h3>
          <p className="mb-6 text-sm text-brand-400">ຂໍ້ມູນພື້ນຖານຂອງຜູ້ຕອບແບບສຳຫຼວດ</p>

          <div className="space-y-4">
            {/* Name (auto-filled, read-only) */}
            <div>
              <label className="mb-1 block text-sm font-medium text-brand-800">
                1. ຊື່-ນາມສະກຸນ
              </label>
              <input
                type="text"
                value={employeeName}
                readOnly
                className={`${inputClass} bg-brand-50`}
              />
            </div>

            {/* Department (auto-filled, read-only) */}
            <div>
              <label className="mb-1 block text-sm font-medium text-brand-800">
                2. ພະແນກ
              </label>
              <input
                type="text"
                value={departmentName}
                readOnly
                className={`${inputClass} bg-brand-50`}
              />
            </div>

            {/* Team count (auto from DB) */}
            <div>
              <label className="mb-1 block text-sm font-medium text-brand-800">
                3. ຈຳນວນລູກທີມທີ່ເບິ່ງແຍງ (ຄົນ)
              </label>
              <input
                type="number"
                value={teamCount}
                readOnly
                className={`${inputClass} bg-brand-50`}
              />
            </div>

            {/* Supervisor years */}
            <div>
              <label className="mb-2 block text-sm font-medium text-brand-800">
                4. ອາຍຸງານໃນຕຳແໜ່ງຫົວໜ້າ
              </label>
              <div className="flex flex-wrap gap-3">
                {[
                  { value: "<1", label: "ຕໍ່າກວ່າ 1 ປີ" },
                  { value: "1-3", label: "1–3 ປີ" },
                  { value: ">3", label: "ຫຼາຍກວ່າ 3 ປີ" },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`cursor-pointer rounded-xl border px-4 py-3 text-sm transition-all ${
                      supervisorYears === opt.value
                        ? "border-brand-300 bg-brand-50 text-brand-700"
                        : "border-brand-200 text-brand-700 hover:bg-brand-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="supervisor_years"
                      value={opt.value}
                      checked={supervisorYears === opt.value}
                      onChange={(e) => setSupervisorYears(e.target.value)}
                      className="sr-only"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Part 2: Development Needs */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-brand-100">
          <h3 className="mb-1 text-lg font-semibold text-brand-900">
            ສ່ວນທີ 2 : ຄວາມຕ້ອງການພັດທະນາ
          </h3>
          <p className="mb-6 text-sm text-brand-400">
            ໃສ່ລຳດັບຄວາມສຳຄັນ (1 = ສຳຄັນທີ່ສຸດ) ສຳລັບທັກສະທີ່ຕ້ອງການພັດທະນາ
          </p>

          {/* Skill priorities */}
          <div>
            <label className="mb-3 block text-sm font-medium text-brand-800">
              1. ທັກສະທີ່ທ່ານຕ້ອງການພັດທະນາຮີບດ່ວນ
              <span className="ml-1 text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {SKILLS.map((skill) => (
                <div
                  key={skill.id}
                  className={`rounded-xl border px-4 py-3 transition-all ${
                    skillPriorities[skill.id]
                      ? "border-brand-300 bg-brand-50"
                      : "border-brand-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={16}
                      value={skillPriorities[skill.id] || ""}
                      onChange={(e) =>
                        handleSkillPriorityChange(skill.id, e.target.value)
                      }
                      className="w-16 shrink-0 rounded-lg border border-brand-200 px-2 py-2 text-center text-sm text-brand-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                      placeholder="-"
                    />
                    <span className="text-sm text-brand-800">{skill.label}</span>
                  </div>
                  {skill.hasInput && (
                    <div className="mt-2 ml-[76px]">
                      <input
                        type="text"
                        value={softSkillTopic}
                        onChange={(e) => setSoftSkillTopic(e.target.value)}
                        className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm text-brand-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                        placeholder="ລະບຸຫົວຂໍ້ Soft Skill..."
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Team problems */}
          <div className="mt-6">
            <label className="mb-1 block text-sm font-medium text-brand-800">
              2. ບັນຫາຫຼັກທີ່ພົບໃນການບໍລິຫານທີມຂອງທ່ານຄືຫຍັງ?
            </label>
            <textarea
              value={teamProblems}
              onChange={(e) => setTeamProblems(e.target.value)}
              rows={4}
              className={inputClass}
              placeholder="ອະທິບາຍບັນຫາທີ່ພົບ..."
            />
          </div>

          {/* Suggested course */}
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-brand-800">
              3. ຖ້າບໍລິສັດຈັດອົບຮົມ 1 ຫຼັກສູດທີ່ສຳຄັນທີ່ສຸດສຳລັບທ່ານ ຄວນເປັນເລື່ອງໃດ?
            </label>
            <textarea
              value={suggestedCourse}
              onChange={(e) => setSuggestedCourse(e.target.value)}
              rows={3}
              className={inputClass}
              placeholder="ລະບຸຫຼັກສູດທີ່ຕ້ອງການ..."
            />
          </div>
        </div>

        {/* Fiscal Year + Submit */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-brand-100">
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-brand-800">
              ສົກປີ <span className="text-red-500">*</span>
            </label>
            <select
              value={fiscalYear}
              onChange={(e) => setFiscalYear(e.target.value)}
              className={inputClass}
            >
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
          </div>

          {success && (
            <div className="mb-4 rounded-xl border border-brand-200 bg-brand-50 p-4 text-brand-700">
              ບັນທຶກສຳເລັດແລ້ວ
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-brand-500 px-6 py-4 text-lg font-semibold text-white transition-all hover:bg-brand-600 active:scale-[0.98] disabled:opacity-70"
          >
            {isSubmitting ? "ກຳລັງບັນທຶກ..." : "ສົ່ງແບບສຳຫຼວດ"}
          </button>
        </div>
      </form>

      {/* History List */}
      {items.length > 0 && (
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-brand-100">
          <h3 className="mb-4 text-lg font-semibold text-brand-900">
            ລາຍການທີ່ສົ່ງແລ້ວ ({items.length})
          </h3>
          <div className="space-y-3">
            {items.map((item) => {
              const priorities = item.skill_priorities || {};
              const selectedSkills = SKILLS.filter(
                (s) => priorities[s.id] != null
              ).sort(
                (a, b) => (priorities[a.id] as number) - (priorities[b.id] as number)
              );

              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-brand-100 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-brand-500">
                        ສົກປີ {item.fiscal_year} &middot;{" "}
                        {new Date(item.created_at).toLocaleDateString("lo-LA")}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${statusColors[item.status] || "bg-brand-50 text-brand-700"}`}
                    >
                      {statusLabels[item.status] || item.status}
                    </span>
                  </div>
                  {selectedSkills.length > 0 && (
                    <div className="mt-3">
                      <p className="mb-2 text-xs font-medium text-brand-500">
                        ທັກສະທີ່ເລືອກ:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedSkills.map((s) => (
                          <span
                            key={s.id}
                            className="rounded-full bg-brand-50 px-3 py-1 text-xs text-brand-700"
                          >
                            #{priorities[s.id]} {s.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {item.suggested_course && (
                    <p className="mt-2 text-sm text-brand-700">
                      <span className="font-medium">ຫຼັກສູດແນະນຳ:</span>{" "}
                      {item.suggested_course}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
