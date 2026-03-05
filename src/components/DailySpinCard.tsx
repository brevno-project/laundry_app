"use client";

import React from "react";
import { supabase } from "@/lib/supabase";
import { TicketIcon, WashingSpinner } from "./Icons";
import { useUi } from "@/contexts/UiContext";

type DailySpinStatus = {
  has_spun: boolean;
  can_spin: boolean;
  won: boolean;
  coupon_id: string | null;
  spun_at: string | null;
  chance_bps: number;
  chance_percent: number;
  already_spun?: boolean;
  lottery_blocked?: boolean;
};

const SPIN_ANIMATION_MS = 2200;

const formatChance = (value: number) => {
  const fixed = value.toFixed(2);
  if (fixed.endsWith(".00")) return fixed.slice(0, -3);
  if (fixed.endsWith("0")) return fixed.slice(0, -1);
  return fixed;
};

export default function DailySpinCard() {
  const { t } = useUi();
  const [status, setStatus] = React.useState<DailySpinStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isSpinning, setIsSpinning] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const authedFetch = React.useCallback(
    async (url: string, options: RequestInit = {}) => {
      if (!supabase) {
        throw new Error(t("errors.supabaseNotConfigured"));
      }

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        throw new Error(t("errors.noActiveSession"));
      }

      return fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
          Authorization: `Bearer ${token}`,
        },
      });
    },
    [t]
  );

  const loadStatus = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authedFetch("/api/student/daily-spin", { method: "GET" });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || t("dailySpin.errorLoad"));
      }
      setStatus(result as DailySpinStatus);
      setNotice(null);
    } catch (err: any) {
      setError(err?.message || t("dailySpin.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [authedFetch, t]);

  React.useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const handleSpin = async () => {
    if (!status?.can_spin || submitting || isSpinning) return;

    setSubmitting(true);
    setIsSpinning(true);
    setError(null);
    setNotice(null);

    const spinStart = Date.now();
    try {
      const response = await authedFetch("/api/student/daily-spin", { method: "POST" });
      const result = await response.json();

      const elapsed = Date.now() - spinStart;
      if (elapsed < SPIN_ANIMATION_MS) {
        await new Promise((resolve) => setTimeout(resolve, SPIN_ANIMATION_MS - elapsed));
      }

      if (!response.ok) {
        setError(result.error || t("dailySpin.errorSpin"));
        if (typeof result?.has_spun === "boolean") {
          setStatus(result as DailySpinStatus);
        } else {
          await loadStatus();
        }
        return;
      }

      const nextStatus = result as DailySpinStatus;
      setStatus(nextStatus);
      setNotice(nextStatus.won ? t("dailySpin.youWon") : t("dailySpin.noWin"));
    } catch (err: any) {
      const elapsed = Date.now() - spinStart;
      if (elapsed < SPIN_ANIMATION_MS) {
        await new Promise((resolve) => setTimeout(resolve, SPIN_ANIMATION_MS - elapsed));
      }
      setError(err?.message || t("dailySpin.errorSpin"));
    } finally {
      setSubmitting(false);
      setIsSpinning(false);
    }
  };

  const chanceLabel = status ? `${formatChance(status.chance_percent)}%` : "0.5%";
  const disabled = loading || submitting || isSpinning || !status?.can_spin;

  return (
    <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-5 shadow-sm dark:border-sky-800/40 dark:from-slate-900 dark:via-slate-900 dark:to-cyan-950/20">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t("dailySpin.title")}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">{t("dailySpin.subtitle")}</p>
        </div>
        <div className="inline-flex items-center gap-1 rounded-full border border-sky-300 bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200">
          <TicketIcon className="h-4 w-4" />
          {t("dailySpin.chance", { chance: chanceLabel })}
        </div>
      </div>

      <div className="mb-4 flex items-center justify-center">
        <div className="relative h-40 w-40">
          <div className="absolute left-1/2 top-[-6px] z-20 h-0 w-0 -translate-x-1/2 border-l-[8px] border-r-[8px] border-b-[14px] border-l-transparent border-r-transparent border-b-rose-500" />
          <div
            className={`daily-spin-wheel absolute inset-0 rounded-full border-4 border-white shadow-lg dark:border-slate-700 ${
              isSpinning ? "daily-spin-wheel-spin" : ""
            }`}
          />
          <div className="absolute inset-[34%] z-10 flex items-center justify-center rounded-full bg-white text-xs font-bold text-slate-700 shadow dark:bg-slate-800 dark:text-slate-100">
            SPIN
          </div>
        </div>
      </div>

      {loading ? (
        <div className="mb-3 flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <WashingSpinner className="h-4 w-4" />
          {t("common.loading")}
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={handleSpin}
            disabled={disabled}
            className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-sky-500 dark:hover:bg-sky-400"
          >
            {isSpinning ? (
              <>
                <WashingSpinner className="h-4 w-4" />
                {t("dailySpin.spinning")}
              </>
            ) : (
              t("dailySpin.spin")
            )}
          </button>

          <div className="space-y-1 text-center text-sm">
            {!status?.has_spun && <p className="text-slate-600 dark:text-slate-300">{t("dailySpin.onePerDay")}</p>}
            {status?.has_spun && status.won && (
              <p className="font-semibold text-emerald-700 dark:text-emerald-300">{t("dailySpin.alreadySpunWon")}</p>
            )}
            {status?.has_spun && !status.won && (
              <p className="text-slate-600 dark:text-slate-300">{t("dailySpin.alreadySpunLose")}</p>
            )}
            {status?.has_spun && (
              <p className="text-xs text-slate-500 dark:text-slate-400">{t("dailySpin.tryTomorrow")}</p>
            )}
            {notice && <p className="font-semibold text-emerald-700 dark:text-emerald-300">{notice}</p>}
            {error && <p className="font-medium text-rose-600 dark:text-rose-300">{error}</p>}
          </div>
        </>
      )}

      <style jsx>{`
        .daily-spin-wheel {
          background: conic-gradient(
            from 0deg,
            #0ea5e9 0deg 45deg,
            #22d3ee 45deg 90deg,
            #3b82f6 90deg 135deg,
            #06b6d4 135deg 180deg,
            #0ea5e9 180deg 225deg,
            #22d3ee 225deg 270deg,
            #3b82f6 270deg 315deg,
            #06b6d4 315deg 360deg
          );
        }

        .daily-spin-wheel-spin {
          animation: dailySpinWheel ${SPIN_ANIMATION_MS}ms cubic-bezier(0.12, 0.74, 0.22, 1) forwards;
        }

        @keyframes dailySpinWheel {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(1980deg);
          }
        }
      `}</style>
    </div>
  );
}
