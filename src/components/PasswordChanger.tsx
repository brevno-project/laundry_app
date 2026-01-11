"use client";

import React, { useState } from "react";
import { useLaundry } from "@/contexts/LaundryContext";
import { supabase } from "@/lib/supabase";

export default function PasswordChanger() {
  const { user } = useLaundry();
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
      setError("Заполните все поля");
      return;
    }

    if (newPassword.length < 6) {
      setError("Пароль должен быть не короче 6 символов");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    if (currentPassword === newPassword) {
      setError("Новый пароль должен отличаться от текущего");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (!supabase) throw new Error("Supabase не настроен");

      const { data: studentData, error: emailErr } = await supabase
        .from("students")
        .select("auth_email")
        .eq("id", user.student_id)
        .single();

      if (emailErr) throw emailErr;

      const authEmail = studentData?.auth_email;
      if (!authEmail) throw new Error("auth_email отсутствует");

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: currentPassword,
      });

      if (signInError) {
        throw new Error("Неверный текущий пароль");
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw new Error("Ошибка смены пароля");
      }

      setSuccess("Пароль успешно изменен");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message || "Ошибка смены пароля");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h3 className="font-bold text-lg text-gray-800 mb-3">Изменение пароля</h3>

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
          <label className="block text-sm font-bold mb-1 text-gray-900">Текущий пароль</label>
          <div className="flex items-stretch gap-2">
            <input
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                setError("");
                setSuccess("");
              }}
              className="flex-1 min-w-0 rounded-lg border-2 border-gray-400 bg-white text-gray-900 p-3 text-sm font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              placeholder="Введите текущий пароль"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="shrink-0 px-3 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:text-gray-900 hover:border-gray-400"
            >
              {showCurrent ? "Скрыть" : "Показать"}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold mb-1 text-gray-900">Новый пароль</label>
          <div className="flex items-stretch gap-2">
            <input
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setError("");
                setSuccess("");
              }}
              className="flex-1 min-w-0 rounded-lg border-2 border-gray-400 bg-white text-gray-900 p-3 text-sm font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              placeholder="Введите новый пароль"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="shrink-0 px-3 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:text-gray-900 hover:border-gray-400"
            >
              {showNew ? "Скрыть" : "Показать"}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">Минимум 6 символов</p>
        </div>

        <div>
          <label className="block text-sm font-bold mb-1 text-gray-900">Подтвердите новый пароль</label>
          <div className="flex items-stretch gap-2">
            <input
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError("");
                setSuccess("");
              }}
              className="flex-1 min-w-0 rounded-lg border-2 border-gray-400 bg-white text-gray-900 p-3 text-sm font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              placeholder="Повторите пароль"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="shrink-0 px-3 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:text-gray-900 hover:border-gray-400"
            >
              {showConfirm ? "Скрыть" : "Показать"}
            </button>
          </div>
        </div>

        <button
          onClick={handleChangePassword}
          disabled={loading || !currentPassword || !newPassword || !confirmPassword}
          className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
            loading || !currentPassword || !newPassword || !confirmPassword
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {loading ? "Изменение..." : "Изменить пароль"}
        </button>
      </div>
    </div>
  );
}
