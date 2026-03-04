"use client";

import { useEffect, useState } from "react";
import AppLogo from "@/components/app-logo";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error")) {
      alert("ເຂົ້າສູ່ລະບົບບໍ່ສຳເລັດ ກະລຸນາລອງໃໝ່");
    }
  }, []);

  const handleLineLogin = () => {
    setIsLoading(true);
    window.location.href = "/api/auth/line";
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,var(--brand-800)_0%,var(--brand-600)_52%,var(--brand-500)_100%)] px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl ring-1 ring-brand-200">
        {/* Logo / Header */}
        <div className="mb-8 text-center">
          <AppLogo variant="hero" className="mb-5" />
          <h1 className="text-2xl font-bold text-brand-900">
            ລະບົບບໍລິຫານພະນັກງານ
          </h1>
          <p className="mt-2 text-brand-500">ເຂົ້າສູ່ລະບົບດ້ວຍ LINE</p>
        </div>

        {/* LINE Login Button */}
        <button
          onClick={handleLineLogin}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-brand-500 px-6 py-4 text-lg font-semibold text-white transition-all hover:bg-brand-600 active:scale-[0.98] disabled:opacity-70"
        >
          {isLoading ? (
            <svg
              className="h-6 w-6 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="white"
            >
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
            </svg>
          )}
          {isLoading ? "ກຳລັງເຂົ້າສູ່ລະບົບ..." : "ເຂົ້າສູ່ລະບົບດ້ວຍ LINE"}
        </button>

        <p className="mt-6 text-center text-sm text-brand-400">
          ລະບົບຈະເຊື່ອມຕໍ່ກັບບັນຊີ LINE ຂອງທ່ານ
        </p>
      </div>
    </div>
  );
}
