import type { ReactNode } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import pool from "@/lib/db";
import AppLogo from "@/components/app-logo";
import LogoutButton from "./logout-button";

interface SessionData {
  lineUserId: string;
  lineDisplayName: string;
  linePictureUrl: string | null;
}

interface EmployeeProfile {
  title_lo: string | null;
  fullname_lo: string | null;
  title_en: string | null;
  fullname_en: string | null;
  position_name_lo: string | null;
  unit_name_lo: string | null;
  department_name_lo: string | null;
  division_name_lo: string | null;
  employee_code: string | null;
  employment_status: string | null;
  hire_date: string | Date | null;
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

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const empResult = await pool.query(
    `SELECT
       e.*,
       p.position_name_lo,
       u.unit_name_lo,
       d.department_name_lo,
       dv.division_name_lo
     FROM odg_employee e
     LEFT JOIN odg_position p ON p.position_code = e.position_code
     LEFT JOIN odg_unit u ON u.unit_code = e.unit_code
     LEFT JOIN odg_department d ON d.department_code = e.department_code
     LEFT JOIN odg_division dv ON dv.division_code = e.division_code
     WHERE e.line_id = $1`,
    [session.lineUserId]
  );

  const emp = (empResult.rows[0] || null) as EmployeeProfile | null;
  const displayName = emp?.fullname_lo || session.lineDisplayName || "User";
  const employmentStatus = formatEmploymentStatus(emp?.employment_status);
  const employmentTone = getStatusTone(emp?.employment_status);
  const workAge = emp?.hire_date ? calcWorkAge(emp.hire_date) : "-";

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,var(--brand-50)_0%,#ffffff_100%)] text-slate-900">
      <header className="sticky top-0 z-10 border-b border-brand-700 bg-brand-700 text-white backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <AppLogo className="shrink-0" />
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold sm:text-base">
                ຂໍ້ມູນພະນັກງານ
              </h1>
            </div>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-6">
        {emp ? (
          <>
            <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-brand-100">
              <div className="bg-[linear-gradient(135deg,var(--brand-800),var(--brand-500))] px-4 pb-7 pt-4 text-white sm:px-6 sm:pb-8">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-white/80">
                      ໂປຣໄຟລ໌ພະນັກງານ
                    </p>
                    <p className="mt-1 text-sm font-medium text-white">
                      ກວດເບິ່ງຂໍ້ມູນຫຼັກໄດ້ໃນຈຸດດຽວ
                    </p>
                  </div>
                  <StatusBadge label={employmentStatus} tone={employmentTone} />
                </div>

                <div className="mt-6 flex items-end gap-4">
                  <Avatar
                    src={session.linePictureUrl}
                    name={displayName}
                    className="h-20 w-20 text-2xl ring-4 ring-white/95 sm:h-24 sm:w-24 sm:text-3xl"
                  />
                  <div className="min-w-0 pb-1">
                    <p className="text-xs text-white/80">
                      LINE: {session.lineDisplayName || "-"}
                    </p>
                    <h2 className="mt-1 break-words text-2xl font-semibold leading-tight text-white sm:text-3xl">
                      {emp.title_lo ? `${emp.title_lo} ` : ""}
                      {emp.fullname_lo || "-"}
                    </h2>
                    {emp.fullname_en && (
                      <p className="mt-1 text-sm text-white/85">
                        {emp.title_en ? `${emp.title_en} ` : ""}
                        {emp.fullname_en}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-5">
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="ລະຫັດ" value={emp.employee_code || "-"} />
                  <StatCard label="ອາຍຸງານ" value={workAge} />
                </div>

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <ProfileField
                    label="ຕຳແໜ່ງ"
                    value={emp.position_name_lo || "-"}
                  />
                  <ProfileField label="ໜ່ວຍງານ" value={emp.unit_name_lo || "-"} />
                  <ProfileField
                    label="ພະແນກ"
                    value={emp.department_name_lo || "-"}
                  />
                  <ProfileField label="ຝ່າຍ" value={emp.division_name_lo || "-"} />
                </div>
              </div>
            </section>

            <section className="mt-4">
              <SectionCard
                title="ເມນູດ່ວນ"
                description="ເຂົ້າເຖິງງານທີ່ໃຊ້ບ່ອຍໄດ້ໄວ."
              >
                <QuickActionCard
                  href="/training-need"
                  icon={<BookIcon />}
                  title="ຄວາມຕ້ອງການຝຶກອົບຮົມ"
                  description="ສົ່ງຄຳຂໍຝຶກອົບຮົມ ແລະ ຕິດຕາມສະຖານະ."
                />
                <QuickActionCard
                  href="/org-chart"
                  icon={<OrgChartIcon />}
                  title="ໂຄງສ້າງອົງກອນ"
                  description="ເບິ່ງໂຄງສ້າງອົງກອນ ແລະ ຜັງບຸກຄະລາກອນ."
                />
                <QuickActionCard
                  href="/performance-evaluation"
                  icon={<ClipboardCheckIcon />}
                  title="ປະເມີນຜົນງານ OD 2026"
                  description="ປະເມີນຜົນ ການຈັດງານ OD 2026"
                />
                <QuickActionCard
                  href="/staff-evaluation"
                  icon={<UserCheckIcon />}
                  title="ປະເມີນຜົນງານ"
                  description="ປະເມີນຕົນເອງ ແລະ ປະເມີນລູກທີມ."
                />
                <QuickActionCard
                  href="/staff-eval-assign"
                  icon={<UserPlusIcon />}
                  title="ຕັ້ງຄ່າຜູ້ຖືກປະເມີນ"
                  description="ເພີ່ມຄົນເຂົ້າລາຍການປະເມີນເພີ່ມເຕີມ."
                />
              </SectionCard>
            </section>

          </>
        ) : (
          <section className="mx-auto max-w-lg rounded-3xl bg-white p-6 shadow-sm ring-1 ring-brand-100">
            <div className="flex flex-col items-center text-center">
              <Avatar
                src={session.linePictureUrl}
                name={session.lineDisplayName || "?"}
                className="h-20 w-20 text-2xl"
              />
              <p className="mt-4 text-sm text-brand-500">ບໍ່ພົບ profile</p>
              <h2 className="mt-1 text-2xl font-semibold">
                ບໍ່ພົບຂໍ້ມູນພະນັກງານ
              </h2>
              <p className="mt-3 text-sm leading-6 text-brand-700">
                ບັນຊີ LINE ຂອງທ່ານຍັງບໍ່ຖືກຈັບຄູ່ກັບຂໍ້ມູນພະນັກງານໃນລະບົບ.
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <InfoRow label="ຊື່ LINE" value={session.lineDisplayName || "-"} />
              <InfoRow label="LINE User ID" value={session.lineUserId} wrap />
            </div>

            <div className="mt-6 rounded-2xl bg-brand-50 p-4 text-sm leading-6 text-brand-900">
              ກະລຸນາສົ່ງ LINE User ID ໃຫ້ HR ຫຼື admin
              ເພື່ອກວດສອບການເຊື່ອມຂໍ້ມູນ ແລ້ວຈຶ່ງເຂົ້າລະບົບໃໝ່ອີກຄັ້ງ.
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function calcWorkAge(hireDate: string | Date): string {
  const hire = new Date(hireDate);
  if (Number.isNaN(hire.getTime())) return "-";

  const now = new Date();
  let years = now.getFullYear() - hire.getFullYear();
  let months = now.getMonth() - hire.getMonth();
  let days = now.getDate() - hire.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ປີ`);
  if (months > 0) parts.push(`${months} ເດືອນ`);
  if (days > 0 || parts.length === 0) parts.push(`${days} ມື້`);

  return parts.join(" ");
}

function formatEmploymentStatus(status: string | null | undefined): string {
  switch (status?.toUpperCase()) {
    case "ACTIVE":
      return "ກຳລັງໃຊ້ງານ";
    case "INACTIVE":
      return "ບໍ່ໄດ້ໃຊ້ງານ";
    default:
      return status ? status.replaceAll("_", " ") : "-";
  }
}

function getStatusTone(status: string | null | undefined) {
  switch (status?.toUpperCase()) {
    case "ACTIVE":
      return "success" as const;
    case "INACTIVE":
      return "neutral" as const;
    default:
      return "warning" as const;
  }
}

function Avatar({
  src,
  name,
  className,
}: {
  src: string | null;
  name: string;
  className: string;
}) {
  return src ? (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={name}
        className={`${className} rounded-3xl object-cover bg-white`}
      />
    </>
  ) : (
    <div
      className={`${className} flex items-center justify-center rounded-3xl bg-brand-100 font-semibold text-brand-700`}
    >
      {getInitial(name)}
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
  children: ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-brand-200/85 bg-[linear-gradient(180deg,#f4f6f9_0%,#eef2f6_100%)] p-4 shadow-[0_18px_40px_-34px_rgba(21,45,74,0.45)] sm:p-5">
      <h3 className="text-lg font-bold tracking-[-0.01em] text-brand-900">
        {title}
      </h3>
      <p className="mt-1 text-base leading-7 text-brand-400">{description}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">{children}</div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-brand-50 px-4 py-3 ring-1 ring-brand-100">
      <p className="text-xs text-brand-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-brand-900">
        {value}
      </p>
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-brand-100 bg-brand-50/40 px-4 py-3">
      <p className="text-xs text-brand-500">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-brand-900">
        {value}
      </p>
    </div>
  );
}

function InfoRow({
  label,
  value,
  wrap = false,
}: {
  label: string;
  value: string;
  wrap?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-brand-50 px-4 py-3 ring-1 ring-brand-100">
      <p className="text-xs text-brand-500">{label}</p>
      <p className={`mt-1 text-sm font-medium text-brand-900 ${wrap ? "break-all" : "break-words"}`}>
        {value}
      </p>
    </div>
  );
}

function QuickActionCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex h-full items-center gap-4 rounded-[1.55rem] border border-brand-200/90 bg-[linear-gradient(180deg,#f5f7fa_0%,#edf2f7_100%)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-[0_18px_28px_-24px_rgba(21,45,74,0.38)]"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.15rem] bg-[linear-gradient(180deg,#e8edf5_0%,#dde5f1_100%)] text-brand-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-bold leading-6 tracking-[-0.01em] text-brand-900">
          {title}
        </p>
        <p className="mt-1 text-base leading-7 text-brand-500 transition-colors duration-200 group-hover:text-brand-600">
          {description}
        </p>
      </div>
    </Link>
  );
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "success" | "warning" | "neutral";
}) {
  const toneClass =
    tone === "success"
      ? "bg-brand-50 text-brand-700"
      : tone === "warning"
        ? "bg-brand-100 text-brand-800"
        : "bg-white text-brand-700";

  return (
    <span
      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${toneClass}`}
    >
      {label}
    </span>
  );
}

function getInitial(value: string): string {
  return value.trim().charAt(0).toUpperCase() || "?";
}

function OrgChartIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-5 w-5">
      <rect x="7" y="2" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <rect x="1.5" y="13" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <rect x="12.5" y="13" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 6v3m0 0H4.5m5.5 0h5.5m-11 0v4m11-4v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ClipboardCheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-5 w-5">
      <path
        d="M7.5 2.5h5a1 1 0 0 1 1 1V4a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-.5a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 4H5a1.5 1.5 0 0 0-1.5 1.5v11A1.5 1.5 0 0 0 5 18h10a1.5 1.5 0 0 0 1.5-1.5v-11A1.5 1.5 0 0 0 15 4h-1.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 11.5 9 13l3.5-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UserCheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-5 w-5">
      <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M2.5 17c0-3.04 2.46-5.5 5.5-5.5s5.5 2.46 5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M13.5 10.5l1.5 1.5 3-3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UserPlusIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-5 w-5">
      <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M2.5 17c0-3.04 2.46-5.5 5.5-5.5s5.5 2.46 5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M16 8v4m-2-2h4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-5 w-5">
      <path
        d="M5.75 4.25h7.5A1.75 1.75 0 0 1 15 6v9.75H7.25A2.25 2.25 0 0 0 5 18V5a.75.75 0 0 1 .75-.75Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M5 15.75h8.75M8 7.5h4.5M8 10h4.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
