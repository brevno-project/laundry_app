"use client";

import React, { useState } from "react";
import { useLaundry } from "@/contexts/LaundryContext";
import { useUi } from "@/contexts/UiContext";
import { supabase } from "@/lib/supabase";
import { WashingSpinner } from "@/components/Icons";

export default function PasswordChanger() {
  const { user } = useLaundry();
  const { t } = useUi();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChangePassword = async () => {
    if (!user) return;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(t("password.errorRequired"));
      return;
    }

    if (newPassword.length < 6) {
      setError(t("password.errorMin"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t("password.errorMismatch"));
      return;
    }

    if (currentPassword === newPassword) {
      setError(t("password.errorSame"));
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (!supabase) throw new Error(t("errors.supabaseNotConfigured"));

      const { data: studentData, error: emailErr } = await supabase
        .from("students")
        .select("auth_email")
        .eq("id", user.student_id)
        .single();

      if (emailErr) throw emailErr;

      const authEmail = studentData?.auth_email;
      if (!authEmail) throw new Error(t("password.errorAuthMissing"));

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: currentPassword,
      });

      if (signInError) {
        throw new Error(t("password.errorCurrentInvalid"));
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw new Error(t("password.errorUpdate"));
      }

      setSuccess(t("password.success"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message || t("password.errorUpdate"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-sky-50/70 backdrop-blur-sm dark:bg-slate-800 p-4 rounded-lg shadow-sm">
      <h3 className="font-bold text-lg text-gray-800 mb-3">{t("password.title")}</h3>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded-lg mb-3">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-3 py-2 rounded-lg mb-3">
          {success}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-bold mb-1 text-gray-900">{t("password.current")}</label>
          <div className="flex items-stretch gap-2">
            <input
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                setError("");
                setSuccess("");
              }}
              className="flex-1 min-w-0 rounded-lg border-2 border-gray-400 bg-white/60 text-gray-900 p-3 text-sm font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              placeholder={t("password.placeholderCurrent")}
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="shrink-0 px-3 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:text-gray-900 hover:border-gray-400"
            >
              {showCurrent ? t("auth.hide") : t("auth.show")}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold mb-1 text-gray-900">{t("password.new")}</label>
          <div className="flex items-stretch gap-2">
            <input
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setError("");
                setSuccess("");
              }}
              className="flex-1 min-w-0 rounded-lg border-2 border-gray-400 bg-white/60 text-gray-900 p-3 text-sm font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              placeholder={t("password.placeholderNew")}
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="shrink-0 px-3 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:text-gray-900 hover:border-gray-400"
            >
              {showNew ? t("auth.hide") : t("auth.show")}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">{t("password.minHint")}</p>
        </div>

        <div>
          <label className="block text-sm font-bold mb-1 text-gray-900">{t("password.confirm")}</label>
          <div className="flex items-stretch gap-2">
            <input
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError("");
                setSuccess("");
              }}
              className="flex-1 min-w-0 rounded-lg border-2 border-gray-400 bg-white/60 text-gray-900 p-3 text-sm font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              placeholder={t("password.placeholderConfirm")}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="shrink-0 px-3 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:text-gray-900 hover:border-gray-400"
            >
              {showConfirm ? t("auth.hide") : t("auth.show")}
            </button>
          </div>
        </div>

        <button
          onClick={handleChangePassword}
          disabled={loading || !currentPassword || !newPassword || !confirmPassword}
          className="w-full btn btn-primary btn-lg btn-glow"
        >
          {loading ? (
            <>
              <WashingSpinner className="w-4 h-4" />
              <span>{t("password.updating")}</span>
            </>
          ) : (
            <>{t("password.update")}</>
          )}
        </button>
      </div>
    </div>
  );
}
