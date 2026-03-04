import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import pool from "@/lib/db";
import AppLogo from "@/components/app-logo";
import OrgTree from "./org-tree";

interface SessionData {
  lineUserId: string;
  lineDisplayName: string;
  linePictureUrl: string | null;
  employee: unknown;
}

export interface OrgEmployee {
  employee_code: string;
  title_lo: string | null;
  fullname_lo: string;
  position_code: string;
  position_name_lo: string;
  department_code: string;
  unit_code: string | null;
}

export interface OrgUnit {
  unit_code: string;
  unit_name_lo: string;
  employees: OrgEmployee[];
}

export interface OrgDepartment {
  department_code: string;
  department_name_lo: string;
  units: OrgUnit[];
  employees: OrgEmployee[]; // employees without unit
  employeeCount: number;
}

export interface OrgDivision {
  division_code: string;
  division_name_lo: string;
  departments: OrgDepartment[];
  employeeCount: number;
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

export default async function OrgChartPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // ດຶງ division_code ຂອງພະນັກງານທີ່ login
  const meResult = await pool.query(
    `SELECT division_code FROM odg_employee WHERE line_id = $1`,
    [session.lineUserId]
  );
  const myDivisionCode = meResult.rows[0]?.division_code || null;

  // Fetch org data ສະເພາະຝ່າຍຂອງຕົນເອງ
  const [divResult, deptResult, unitResult, empResult] = await Promise.all([
    pool.query(
      `SELECT division_code, division_name_lo FROM odg_division WHERE is_active = true AND division_code = $1`,
      [myDivisionCode]
    ),
    pool.query(
      `SELECT department_code, department_name_lo, division_code FROM odg_department WHERE is_active = true AND division_code = $1 ORDER BY department_code`,
      [myDivisionCode]
    ),
    pool.query(
      `SELECT u.unit_code, u.unit_name_lo, u.department_code FROM odg_unit u
       INNER JOIN odg_department d ON d.department_code = u.department_code
       WHERE u.is_active = true AND d.division_code = $1 ORDER BY u.unit_code`,
      [myDivisionCode]
    ),
    pool.query(
      `SELECT e.employee_code, e.title_lo, e.fullname_lo, e.position_code,
              e.division_code, e.department_code, e.unit_code,
              p.position_name_lo
       FROM odg_employee e
       LEFT JOIN odg_position p ON p.position_code = e.position_code
       WHERE e.employment_status = 'ACTIVE' AND e.division_code = $1
       ORDER BY e.position_code, e.fullname_lo`,
      [myDivisionCode]
    ),
  ]);

  // Build tree structure
  const divisions: OrgDivision[] = divResult.rows.map((div) => {
    const departments: OrgDepartment[] = deptResult.rows
      .filter((d) => d.division_code === div.division_code)
      .map((dept) => {
        const units: OrgUnit[] = unitResult.rows
          .filter((u) => u.department_code === dept.department_code)
          .map((unit) => ({
            unit_code: unit.unit_code,
            unit_name_lo: unit.unit_name_lo,
            employees: empResult.rows.filter(
              (e) => e.unit_code === unit.unit_code
            ),
          }));

        // Employees directly under department (no unit)
        const deptEmployees = empResult.rows.filter(
          (e) =>
            e.department_code === dept.department_code &&
            (!e.unit_code ||
              !unitResult.rows.some((u) => u.unit_code === e.unit_code))
        );

        const employeeCount =
          deptEmployees.length +
          units.reduce((sum, u) => sum + u.employees.length, 0);

        return {
          department_code: dept.department_code,
          department_name_lo: dept.department_name_lo,
          units,
          employees: deptEmployees,
          employeeCount,
        };
      });

    const employeeCount = departments.reduce(
      (sum, d) => sum + d.employeeCount,
      0
    );

    return {
      division_code: div.division_code,
      division_name_lo: div.division_name_lo,
      departments,
      employeeCount,
    };
  });

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,var(--brand-50)_0%,#ffffff_100%)]">
      <nav className="bg-brand-700 text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <AppLogo className="shrink-0" />
            <h1 className="text-lg font-bold leading-tight text-white sm:text-xl">
              ໂຄງສ້າງອົງກອນ
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

      <main className="mx-auto max-w-7xl px-6 py-8">
        <OrgTree divisions={divisions} />
      </main>
    </div>
  );
}
