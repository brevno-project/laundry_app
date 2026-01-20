"use client";

import { useState, useEffect } from "react";
import { useLaundry } from "@/contexts/LaundryContext";
import { useUi } from "@/contexts/UiContext";
import { supabase } from "@/lib/supabase";
import { QueueStatus } from "@/types";
import { KeyIcon, WashingIcon, CheckIcon, InfoIcon } from "@/components/Icons";

const getStoredFlag = (key: string) => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(key) === "true";
};

const setStoredFlag = (key: string) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, "true");
};

const buildNotifyKey = (type: "start" | "finish", id: string) => `laundryNotify:${type}:${id}`;

export default function StudentActions() {
  const { user, queue } = useLaundry();
  const { t } = useUi();
  const [washingTime, setWashingTime] = useState("0:00");
  const [startSent, setStartSent] = useState(false);
  const [finishSent, setFinishSent] = useState(false);
  const [sending, setSending] = useState<null | "start" | "finish">(null);

  const alertWithCheck = (message: string) => {
    const trimmed = message.trim();
    const suffix = trimmed.endsWith("✅") ? "" : " ✅";
    alert(`${message}${suffix}`);
  };

  const myQueueItem = queue.find(
    (item) =>
      item.student_id === user?.student_id &&
      [QueueStatus.KEY_ISSUED, QueueStatus.WASHING].includes(item.status as QueueStatus)
  );

  useEffect(() => {
    if (!myQueueItem?.id) return;
    setStartSent(getStoredFlag(buildNotifyKey("start", myQueueItem.id)));
    setFinishSent(getStoredFlag(buildNotifyKey("finish", myQueueItem.id)));
  }, [myQueueItem?.id]);

  useEffect(() => {
    if (myQueueItem?.status === QueueStatus.WASHING && myQueueItem.washing_started_at) {
      const interval = setInterval(() => {
        const startTime = new Date(myQueueItem.washing_started_at!);
        const now = new Date();
        const elapsedMs = now.getTime() - startTime.getTime();
        const elapsedMinutes = Math.floor(elapsedMs / 60000);
        const elapsedSeconds = Math.floor((elapsedMs / 1000) % 60);

        setWashingTime(`${elapsedMinutes}:${elapsedSeconds.toString().padStart(2, "0")}`);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [myQueueItem]);

  if (!user || !myQueueItem) return null;

  const handleStartWashing = async () => {
    if (startSent || sending) return;
    setSending("start");

    try {
      if (!supabase) {
        alertWithCheck(t("errors.supabaseNotConfigured"));
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        alertWithCheck(t("errors.noActiveSession"));
        return;
      }

      const response = await fetch("/api/telegram/notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          type: "washing_started_by_student",
          full_name: myQueueItem.full_name,
          room: myQueueItem.room,
          student_id: myQueueItem.student_id,
          queue_item_id: myQueueItem.id,
        }),
      });

      if (response.ok) {
        const key = buildNotifyKey("start", myQueueItem.id);
        setStartSent(true);
        setStoredFlag(key);
      } else {
        alertWithCheck(t("errors.notifyFailed"));
      }
    } catch (error) {
      alertWithCheck(t("errors.generic", { message: (error as Error).message }));
    } finally {
      setSending(null);
    }
  };

  const handleFinishWashing = async () => {
    if (finishSent || sending) return;
    setSending("finish");

    try {
      if (!supabase) {
        alertWithCheck(t("errors.supabaseNotConfigured"));
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        alertWithCheck(t("errors.noActiveSession"));
        return;
      }

      const response = await fetch("/api/telegram/notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          type: "washing_finished_by_student",
          full_name: myQueueItem.full_name,
          room: myQueueItem.room,
          student_id: myQueueItem.student_id,
          queue_item_id: myQueueItem.id,
        }),
      });

      if (response.ok) {
        await fetch("/api/telegram/notify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            type: "washing_finished",
            full_name: myQueueItem.full_name,
            room: myQueueItem.room,
            student_id: myQueueItem.student_id,
            queue_item_id: myQueueItem.id,
          }),
        });

        const key = buildNotifyKey("finish", myQueueItem.id);
        setFinishSent(true);
        setStoredFlag(key);
      } else {
        alertWithCheck(t("errors.notifyFailed"));
      }
    } catch (error) {
      alertWithCheck(t("errors.generic", { message: (error as Error).message }));
    } finally {
      setSending(null);
    }
  };

  return (
    <div id="student-action-button" className="mb-6 w-full animate-slideDown">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl shadow-xl p-6 border-2 border-blue-400 dark:from-slate-800 dark:to-slate-900 dark:border-slate-700">
        {myQueueItem.status === QueueStatus.KEY_ISSUED && (
          <>
            {startSent ? (
              <div className="w-full rounded-xl bg-emerald-500/20 border border-emerald-200 px-4 py-3 text-emerald-50 text-center dark:border-emerald-500/40 dark:text-emerald-100">
                <div className="flex items-center justify-center gap-2 font-semibold">
                  <CheckIcon className="w-5 h-5" />
                  {t("studentActions.noticeSent")}
                </div>
              </div>
            ) : (
              <>
                <div className="text-center mb-4">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <KeyIcon className="w-7 h-7 text-white flex-shrink-0" />
                    <h3 className="text-2xl font-bold text-white dark:text-slate-100">{t("studentActions.startTitle")}</h3>
                  </div>
                  <p className="text-blue-100 dark:text-slate-300">{t("studentActions.startHint")}</p>
                  <div className="flex items-center justify-center gap-1 text-blue-200 text-sm mt-2 dark:text-slate-400">
                    <InfoIcon className="w-4 h-4 flex-shrink-0" />
                    <span>{t("studentActions.startInfo")}</span>
                  </div>
                </div>

                <button
                  onClick={handleStartWashing}
                  disabled={sending === "start"}
                  className="w-full bg-white text-blue-700 font-bold py-4 px-6 rounded-xl text-xl hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl disabled:opacity-70 btn-attn dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-100"
                >
                  {t("studentActions.startButton")}
                </button>
              </>
            )}
          </>
        )}

        {myQueueItem.status === QueueStatus.WASHING && (
          <>
            {finishSent ? (
              <div className="w-full rounded-xl bg-emerald-500/20 border border-emerald-200 px-4 py-3 text-emerald-50 text-center dark:border-emerald-500/40 dark:text-emerald-100">
                <div className="flex items-center justify-center gap-2 font-semibold">
                  <CheckIcon className="w-5 h-5" />
                  {t("studentActions.noticeSent")}
                </div>
              </div>
            ) : (
              <>
                <div className="text-center mb-4">
                  <h3 className="text-2xl font-bold text-white mb-2 dark:text-slate-100">{t("studentActions.washingTitle")}</h3>
                  <div className="bg-white/20 rounded-xl py-3 px-6 mb-3 dark:bg-slate-950/30">
                    <div className="text-blue-100 text-sm mb-1 dark:text-slate-300">{t("studentActions.elapsedLabel")}</div>
                    <div className="text-4xl font-black text-white dark:text-slate-100">{washingTime}</div>
                  </div>
                  <p className="text-blue-100 text-sm dark:text-slate-300">{t("studentActions.finishHint")}</p>
                  <div className="flex items-center justify-center gap-1 text-blue-200 text-sm mt-2 dark:text-slate-400">
                    <InfoIcon className="w-4 h-4 flex-shrink-0" />
                    <span>{t("studentActions.startInfo")}</span>
                  </div>
                </div>

                <button
                  onClick={handleFinishWashing}
                  disabled={sending === "finish"}
                  className="w-full bg-red-600 text-white font-bold py-4 px-6 rounded-xl text-xl hover:bg-red-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-70 btn-attn dark:bg-rose-500/30 dark:text-rose-100 dark:hover:bg-rose-500/40"
                >
                  <div className="flex items-center justify-center gap-2">
                    <WashingIcon className="w-5 h-5" />
                    {t("studentActions.finishButton")}
                  </div>
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

