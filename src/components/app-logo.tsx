interface AppLogoProps {
  className?: string;
  variant?: "nav" | "hero";
}

function BrandMark({ large = false }: { large?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={[
        "relative isolate overflow-hidden rounded-[1.35rem]",
        "bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.34),transparent_38%),linear-gradient(145deg,var(--brand-700),var(--brand-500)_72%,#5d92d3)]",
        "shadow-[0_18px_35px_-18px_rgba(21,45,74,0.7)]",
        large ? "h-22 w-22" : "h-12 w-12",
      ].join(" ")}
    >
      <div className="absolute inset-[3px] rounded-[1.1rem] border border-white/18" />
      <div className="absolute -right-3 top-1 h-8 w-8 rounded-full bg-white/12 blur-xl" />
      <div className="absolute left-0 top-0 h-full w-full bg-[linear-gradient(135deg,transparent_0%,transparent_55%,rgba(255,255,255,0.08)_100%)]" />
      <div className="relative flex h-full flex-col justify-between p-3 text-white">
        <span
          className={[
            "font-semibold uppercase leading-none tracking-[0.24em]",
            large ? "text-[1.05rem]" : "text-[0.68rem]",
          ].join(" ")}
        >
          ODG
        </span>
        <span
          className={[
            "self-end rounded-full border border-white/18 bg-white/12 px-2 py-1 font-mono uppercase leading-none tracking-[0.22em]",
            large ? "text-[0.52rem]" : "text-[0.42rem]",
          ].join(" ")}
        >
          GROUP
        </span>
      </div>
    </div>
  );
}

export default function AppLogo({
  className = "",
  variant = "nav",
}: AppLogoProps) {
  if (variant === "hero") {
    return (
      <div
        className={`flex flex-col items-center text-center ${className}`.trim()}
        aria-label="ODG Group HRM"
      >
        <BrandMark large />
        <div className="mt-4">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.36em] text-brand-500">
            ODG Group
          </p>
          <p className="mt-2 text-3xl font-bold tracking-[0.16em] text-brand-900">
            HRM
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-3 ${className}`.trim()}
      aria-label="ODG Group HRM"
    >
      <BrandMark />
      <div className="min-w-0 leading-tight">
        <p className="text-[0.58rem] font-semibold uppercase tracking-[0.28em] text-white/65">
          ODG Group
        </p>
        <p className="text-sm font-semibold tracking-[0.18em] text-white">
          HRM
        </p>
      </div>
    </div>
  );
}
