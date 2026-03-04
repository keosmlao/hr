import { Fragment } from "react";

interface SelfPivotRow {
  criteria_code: string;
  criteria_name: string;
  group_name: string;
  question_order: number;
  scores: Record<number, number | null>;
}

interface TeamPivotRow {
  employee_code: string;
  fullname_lo: string;
  position_name_lo: string | null;
  scores: Record<number, number | null>;
}

interface SummaryTableProps {
  selfPivot: SelfPivotRow[];
  teamPivot: TeamPivotRow[];
  isManager: boolean;
  monthAbbr: string[];
  year: string;
}

function average(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === "number");
  if (numeric.length === 0) return null;

  const total = numeric.reduce((sum, value) => sum + value, 0);
  return Math.round((total / numeric.length) * 100) / 100;
}

function formatScore(value: number | null): string {
  if (value === null) return "-";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits: 2,
  }).format(value);
}

function buildMonths(monthAbbr: string[]): number[] {
  return monthAbbr.map((_, index) => index).filter((month) => month > 0);
}

function groupSelfRows(rows: SelfPivotRow[]) {
  const groups = new Map<string, SelfPivotRow[]>();

  for (const row of [...rows].sort((a, b) => a.question_order - b.question_order)) {
    const existing = groups.get(row.group_name);
    if (existing) {
      existing.push(row);
      continue;
    }
    groups.set(row.group_name, [row]);
  }

  return Array.from(groups, ([groupName, items]) => ({ groupName, items }));
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/60 px-6 py-8 text-center">
      <p className="text-sm font-medium text-brand-700">{label}</p>
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-brand-100">
      <div className="border-b border-brand-100 bg-[linear-gradient(180deg,#ffffff_0%,var(--brand-50)_100%)] px-5 py-4 sm:px-6">
        <h2 className="text-lg font-semibold text-brand-900">{title}</h2>
        <p className="mt-1 text-sm text-brand-500">{description}</p>
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </section>
  );
}

function SelfSummaryTable({
  rows,
  monthAbbr,
}: {
  rows: SelfPivotRow[];
  monthAbbr: string[];
}) {
  const months = buildMonths(monthAbbr);
  const groupedRows = groupSelfRows(rows);
  const monthlyAverages = months.map((month) =>
    average(rows.map((row) => row.scores[month]))
  );
  const yearlyAverage = average(monthlyAverages);

  if (rows.length === 0) {
    return <EmptyState label="ຍັງບໍ່ມີຂໍ້ມູນປະເມີນຕົນເອງ" />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[1100px] text-sm">
        <thead>
          <tr className="border-b border-brand-100 bg-brand-50 text-left text-brand-700">
            <th className="sticky left-0 z-10 bg-brand-50 px-4 py-3 font-semibold">
              ຫົວຂໍ້ປະເມີນ
            </th>
            {months.map((month) => (
              <th key={month} className="px-3 py-3 text-center font-semibold">
                {monthAbbr[month]}
              </th>
            ))}
            <th className="px-3 py-3 text-center font-semibold">ສະເລ່ຍ</th>
          </tr>
        </thead>
        <tbody>
          {groupedRows.map((group) => (
            <Fragment key={group.groupName}>
              <tr className="border-b border-brand-100 bg-brand-50/70">
                <th
                  colSpan={months.length + 2}
                  className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-[0.12em] text-brand-700"
                >
                  {group.groupName}
                </th>
              </tr>
              {group.items.map((row) => {
                const rowAverage = average(months.map((month) => row.scores[month]));

                return (
                  <tr key={row.criteria_code} className="border-b border-brand-100 last:border-b-0">
                    <th className="sticky left-0 bg-white px-4 py-3 text-left font-medium text-brand-900">
                      {row.criteria_name}
                    </th>
                    {months.map((month) => (
                      <td key={month} className="px-3 py-3 text-center text-brand-700">
                        {formatScore(row.scores[month] ?? null)}
                      </td>
                    ))}
                    <td className="px-3 py-3 text-center font-semibold text-brand-900">
                      {formatScore(rowAverage)}
                    </td>
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-brand-200 bg-brand-50 font-semibold text-brand-900">
            <th className="sticky left-0 bg-brand-50 px-4 py-3 text-left">ຄ່າສະເລ່ຍລວມ</th>
            {monthlyAverages.map((value, index) => (
              <td key={months[index]} className="px-3 py-3 text-center">
                {formatScore(value)}
              </td>
            ))}
            <td className="px-3 py-3 text-center">{formatScore(yearlyAverage)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function TeamSummaryTable({
  rows,
  monthAbbr,
}: {
  rows: TeamPivotRow[];
  monthAbbr: string[];
}) {
  const months = buildMonths(monthAbbr);
  const sortedRows = [...rows].sort((a, b) => a.fullname_lo.localeCompare(b.fullname_lo));
  const monthlyAverages = months.map((month) =>
    average(sortedRows.map((row) => row.scores[month]))
  );
  const yearlyAverage = average(monthlyAverages);

  if (sortedRows.length === 0) {
    return <EmptyState label="ຍັງບໍ່ມີຂໍ້ມູນປະເມີນລູກທີມ" />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[1100px] text-sm">
        <thead>
          <tr className="border-b border-brand-100 bg-brand-50 text-left text-brand-700">
            <th className="sticky left-0 z-10 bg-brand-50 px-4 py-3 font-semibold">
              ພະນັກງານ
            </th>
            {months.map((month) => (
              <th key={month} className="px-3 py-3 text-center font-semibold">
                {monthAbbr[month]}
              </th>
            ))}
            <th className="px-3 py-3 text-center font-semibold">ສະເລ່ຍ</th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => {
            const rowAverage = average(months.map((month) => row.scores[month]));

            return (
              <tr key={row.employee_code} className="border-b border-brand-100 last:border-b-0">
                <th className="sticky left-0 bg-white px-4 py-3 text-left">
                  <div className="font-medium text-brand-900">{row.fullname_lo}</div>
                  {row.position_name_lo && (
                    <div className="text-xs font-normal text-brand-500">
                      {row.position_name_lo}
                    </div>
                  )}
                </th>
                {months.map((month) => (
                  <td key={month} className="px-3 py-3 text-center text-brand-700">
                    {formatScore(row.scores[month] ?? null)}
                  </td>
                ))}
                <td className="px-3 py-3 text-center font-semibold text-brand-900">
                  {formatScore(rowAverage)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-brand-200 bg-brand-50 font-semibold text-brand-900">
            <th className="sticky left-0 bg-brand-50 px-4 py-3 text-left">ຄ່າສະເລ່ຍທີມ</th>
            {monthlyAverages.map((value, index) => (
              <td key={months[index]} className="px-3 py-3 text-center">
                {formatScore(value)}
              </td>
            ))}
            <td className="px-3 py-3 text-center">{formatScore(yearlyAverage)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default function SummaryTable({
  selfPivot,
  teamPivot,
  isManager,
  monthAbbr,
  year,
}: SummaryTableProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-[linear-gradient(135deg,var(--brand-700)_0%,var(--brand-500)_100%)] px-5 py-6 text-white shadow-sm sm:px-6">
        <p className="text-sm font-medium text-white/80">ສະຫຼຸບຂໍ້ມູນປະຈຳປີ {year}</p>
        <h2 className="mt-2 text-2xl font-semibold">ຜົນການປະເມີນພະນັກງານ</h2>
        <p className="mt-2 max-w-3xl text-sm text-white/80">
          ສະແດງຄະແນນລາຍເດືອນຂອງການປະເມີນຕົນເອງ ແລະ ຜົນປະເມີນລູກທີມສຳລັບຜູ້ຄຸ້ມຄອງ
        </p>
      </section>

      <SectionCard
        title="ຕາຕະລາງປະເມີນຕົນເອງ"
        description="ຄະແນນລາຍເກນສຳລັບແຕ່ລະເດືອນ ພ້ອມຄ່າສະເລ່ຍຕະຫຼອດປີ"
      >
        <SelfSummaryTable rows={selfPivot} monthAbbr={monthAbbr} />
      </SectionCard>

      {isManager && (
        <SectionCard
          title="ຕາຕະລາງປະເມີນລູກທີມ"
          description="ຄະແນນສະເລ່ຍລາຍເດືອນຂອງພະນັກງານແຕ່ລະຄົນ"
        >
          <TeamSummaryTable rows={teamPivot} monthAbbr={monthAbbr} />
        </SectionCard>
      )}
    </div>
  );
}
