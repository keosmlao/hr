"use client";

import type {
  OrgDivision,
  OrgDepartment,
  OrgUnit,
} from "./page";

export default function OrgTree({
  divisions,
}: {
  divisions: OrgDivision[];
}) {
  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex min-w-max flex-col items-center space-y-10 px-2">
        {divisions.map((div) => (
          <DivisionChart key={div.division_code} division={div} />
        ))}
      </div>
    </div>
  );
}

function DivisionChart({ division }: { division: OrgDivision }) {
  return (
    <div className="flex flex-col items-center">
      {/* Division Box */}
      <ChartBox
        title={division.division_name_lo}
        subtitle={`${division.employeeCount} ຄົນ`}
        level="division"
      />

      {/* Departments */}
      {division.departments.length > 0 && (
        <>
          <VerticalLine />
          <div className="relative flex justify-center gap-6">
            {/* Horizontal connector line */}
            {division.departments.length > 1 && (
              <div className="absolute top-0 left-1/2 h-px -translate-x-1/2 bg-brand-300" style={{ width: `calc(100% - 80px)` }} />
            )}
            {division.departments.map((dept) => (
              <DepartmentChart key={dept.department_code} department={dept} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function DepartmentChart({ department }: { department: OrgDepartment }) {
  return (
    <div className="flex flex-col items-center">
      {/* Department Box */}
      <ChartBox
        title={department.department_name_lo}
        subtitle={`${department.employeeCount} ຄົນ`}
        level="department"
      />

      {/* ພະນັກງານ (ສະແດງຕາມ position: ຜູ້ຈັດການ → ຫົວໜ້າ → ພະນັກງານ) */}
      {department.employees.length > 0 && (
        <>
          <VerticalLine />
          <div className="flex flex-col items-center gap-1">
            {department.employees.map((emp) => (
              <ChartBox
                key={emp.employee_code}
                title={`${emp.title_lo ? emp.title_lo + " " : ""}${emp.fullname_lo}`}
                subtitle={emp.position_name_lo}
                level={getEmployeeLevel(emp.position_code)}
              />
            ))}
          </div>
        </>
      )}

      {/* Units */}
      {department.units.length > 0 && (
        <>
          <VerticalLine />
          <div className="relative flex justify-center gap-6">
            {department.units.length > 1 && (
              <div className="absolute top-0 left-1/2 h-px -translate-x-1/2 bg-brand-300" style={{ width: `calc(100% - 80px)` }} />
            )}
            {department.units.map((unit) => (
              <UnitChart key={unit.unit_code} unit={unit} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function getEmployeeLevel(positionCode: string) {
  if (positionCode === "11") return "manager";
  if (positionCode === "12") return "head";
  return "employee";
}

function UnitChart({ unit }: { unit: OrgUnit }) {
  return (
    <div className="flex flex-col items-center">
      <ChartBox
        title={unit.unit_name_lo}
        subtitle={`${unit.employees.length} ຄົນ`}
        level="unit"
      />
      {unit.employees.length > 0 && (
        <>
          <VerticalLine />
          <div className="flex flex-col items-center gap-1">
            {unit.employees.map((emp) => (
              <ChartBox
                key={emp.employee_code}
                title={`${emp.title_lo ? emp.title_lo + " " : ""}${emp.fullname_lo}`}
                subtitle={emp.position_name_lo}
                level={getEmployeeLevel(emp.position_code)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const levelStyles: Record<string, string> = {
  division: "bg-brand-700 text-white border-brand-800",
  manager: "bg-brand-100 text-brand-900 border-brand-300",
  department: "bg-brand-600 text-white border-brand-700",
  head: "bg-brand-50 text-brand-800 border-brand-200",
  unit: "bg-brand-500 text-white border-brand-600",
  employee: "bg-white text-gray-800 border-gray-200",
};

const levelWidths: Record<string, number> = {
  division: 220,
  department: 220,
  unit: 200,
  manager: 250,
  head: 250,
  employee: 250,
};

function ChartBox({
  title,
  subtitle,
  level,
}: {
  title: string;
  subtitle: string;
  level: string;
}) {
  return (
    <div
      className={`rounded-lg border px-5 py-3 text-center shadow-sm ${levelStyles[level] || levelStyles.employee}`}
      style={{ minWidth: levelWidths[level] || levelWidths.employee }}
    >
      <div className="whitespace-nowrap text-sm font-semibold leading-tight">
        {title}
      </div>
      <div className="mt-1 whitespace-nowrap text-xs opacity-80">
        {subtitle}
      </div>
    </div>
  );
}

function VerticalLine() {
  return <div className="h-6 w-px bg-brand-300" />;
}
