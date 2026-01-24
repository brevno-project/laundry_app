"use client";

import { useEffect, useState, useRef } from "react";
import { useLaundry } from "@/contexts/LaundryContext";
import { useUi } from "@/contexts/UiContext";
import { Student } from "@/types";
import { DoorIcon, CheckIcon, CloseIcon, BackIcon, WashingSpinner } from "@/components/Icons";
import Avatar from "@/components/Avatar";
import { supabase } from "@/lib/supabase";

export default function StudentAuth() {
  const { students, registerStudent, loginStudent, loadStudents } = useLaundry();
  const { t } = useUi();

  const [step, setStep] = useState<"select" | "auth">("select");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [banNotice, setBanNotice] = useState("");
  const banNoticeRef = useRef<HTMLDivElement | null>(null);

  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedReason = localStorage.getItem("banReason");
    const notice = localStorage.getItem("banNotice");
    if (storedReason) {
      setBanNotice(t("ban.notice", { reason: storedReason }));
      localStorage.removeItem("banReason");
      localStorage.removeItem("banNotice");
    } else if (notice) {
      setBanNotice(notice);
      localStorage.removeItem("banNotice");
    }
    // Refresh students list only once on mount
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadStudents();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel("students-auth-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        () => {
          loadStudents();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [loadStudents]);

  // Логируем данные студентов при их изменении
  useEffect(() => {
    if (students.length > 0) {
    }
  }, [students.length]); // Only log when count changes

  useEffect(() => {
    if (!selectedStudent) return;
    const updatedStudent = students.find((s) => s.id === selectedStudent.id);
    if (updatedStudent) {
      setSelectedStudent(updatedStudent);
    }
  }, [students, selectedStudent?.id]);

  useEffect(() => {
    if (!banNotice) return;
    banNoticeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [banNotice]);

  const banNoticeBanner = banNotice ? (
    <div
      ref={banNoticeRef}
      className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200"
    >
      <CloseIcon className="mr-2 inline-block h-5 w-5" />
      {banNotice}
    </div>
  ) : null;

  const filteredStudents = students.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.full_name.toLowerCase().includes(q) ||
      (s.room && s.room.toLowerCase().includes(q))
    );
  });

  const handleStudentSelect = (student: Student) => {
    setSelectedStudent(student);
    setStep("auth");
    setError("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setBanNotice("");
  };

  const handleAuth = async () => {
    if (!selectedStudent) return;

    if (selectedStudent.is_banned) {
      const reason = selectedStudent.ban_reason || t("ban.reasonUnknown");
      setBanNotice(t("ban.notice", { reason }));
      return;
    }

    if (!password) {
      setError(t("auth.passwordRequired"));
      return;
    }

    if (!selectedStudent.is_registered && password.length < 6) {
      setError(t("auth.passwordMin"));
      return;
    }

    if (!selectedStudent.is_registered) {
      if (!confirmPassword) {
        setError(t("auth.confirmPasswordRequired"));
        return;
      }
      if (password !== confirmPassword) {
        setError(t("auth.passwordsDontMatch"));
        return;
      }
    }

    setLoading(true);
    try {
      if (selectedStudent.is_registered) {
        // Студент уже зарегистрирован - логиним
        await loginStudent(selectedStudent.id, password);
      } else {
        // Студент не зарегистрирован - сразу регистрируем
        await registerStudent(selectedStudent.id, password);
      }
    } catch (err: any) {
      setError(
        err.message ||
          (selectedStudent.is_registered
            ? t("auth.invalidPassword")
            : t("auth.registrationError"))
      );
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------
  // STEP 1: SELECT YOURSELF
  // -------------------------------
  if (step === "select") {
    return (
      <div className="bg-white p-6 rounded-lg shadow-xl border-2 border-gray-200 relative dark:bg-slate-900 dark:border-slate-700">
        {banNoticeBanner}

        <h2 className="text-2xl font-bold mb-4 text-gray-900 text-center dark:text-slate-100">
          {t("auth.title")}
        </h2>
        <h3 className="text-lg font-bold mb-4 text-gray-900 text-center dark:text-slate-200">
          {t("auth.subtitle")}
        </h3>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("auth.searchPlaceholder")}
          className="w-full p-4 rounded-lg border-2 border-gray-300 bg-white text-gray-900 text-xl font-semibold mb-4 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-300 placeholder:text-gray-600 dark:border-slate-600 dark:bg-slate-950/40 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-blue-600 dark:focus:ring-blue-500/30"
        />

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-8 text-gray-900 font-bold text-xl dark:text-slate-200">
              {t("auth.notFound")}
            </div>
          ) : (
            filteredStudents.map((student) => (
              <button
                key={student.id}
                onClick={() => handleStudentSelect(student)}
                className="w-full bg-white hover:bg-slate-50 border-3 border-gray-400 hover:border-slate-500 rounded-lg p-4 text-left transition-all shadow-md hover:shadow-xl dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-700 dark:hover:border-blue-600"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar
                      name={student.full_name}
                      style={student.avatar_style}
                      seed={student.avatar_seed}
                      className="w-12 h-12"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-xl text-gray-900 dark:text-slate-100">
                        {student.full_name}
                      </div>
                      {student.room && (
                        <div className="text-base text-gray-700 font-bold flex items-center gap-1 dark:text-slate-300">
                          <DoorIcon className="w-4 h-4" /> {t("header.room")} {student.room}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    {student.is_registered ? (
                      <div className="bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-md">
                        <CheckIcon className="w-5 h-5" />
                      </div>
                      ) : (
                        <div className="bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">
                          {t("auth.new")}
                        </div>
                      )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }
  // STEP 2: AUTH PAGE
  // -------------------------------
  return (
    <div className="bg-white p-6 rounded-lg shadow-xl border-2 border-gray-200 dark:bg-slate-900 dark:border-slate-700">
      {banNoticeBanner}
      <button
        onClick={() => {
          setStep("select");
          setPassword("");
          setConfirmPassword("");
          setError("");
          setBanNotice("");
        }}
        className="text-blue-600 hover:text-blue-700 font-bold mb-4 flex items-center gap-2 dark:text-blue-500 dark:hover:text-blue-400"
      >
        <BackIcon className="w-5 h-5 text-blue-600 dark:text-blue-500" /> {t("auth.back")}
      </button>

      <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-4 mb-6 flex items-center gap-3 dark:bg-slate-950/60 dark:border-slate-700">
        <Avatar
          name={selectedStudent?.full_name}
          style={selectedStudent?.avatar_style}
          seed={selectedStudent?.avatar_seed}
          className="w-14 h-14"
        />
        <div>
          <div className="font-black text-xl text-gray-900 dark:text-slate-100">
            {selectedStudent?.full_name}
          </div>
          {selectedStudent?.room && (
            <div className="text-sm text-gray-900 font-medium flex items-center gap-1 dark:text-slate-300">
              <DoorIcon className="w-4 h-4" /> {t("header.room")} {selectedStudent.room}
            </div>
          )}
        </div>
      </div>

      <h2 className="text-2xl font-black mb-2 text-gray-900 dark:text-slate-100">
        {selectedStudent?.is_registered ? t("auth.enter") : t("auth.firstTime")}
      </h2>

      <p className="text-gray-900 mb-6 font-medium dark:text-slate-300">
        {selectedStudent?.is_registered
          ? t("auth.enterPassword")
          : t("auth.createPassword")}
      </p>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-bold mb-2 text-gray-900 dark:text-slate-200"
          >
            {t("auth.password")}
          </label>

          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleAuth()}
              className="w-full rounded-lg border-2 border-gray-400 bg-white text-gray-900 p-4 pr-20 text-lg font-bold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-600 dark:focus:ring-blue-500/30"
              placeholder={t("auth.password")}
              autoFocus
            />

            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-3 flex items-center text-sm font-semibold text-gray-700 hover:text-gray-900 dark:text-slate-300 dark:hover:text-slate-200"
            >
              {showPassword ? t("auth.hide") : t("auth.show")}
            </button>
          </div>

          {!selectedStudent?.is_registered && (
            <p className="text-xs text-gray-700 mt-1 font-medium dark:text-slate-400">
              {t("auth.minChars")}
            </p>
          )}
        </div>

        {!selectedStudent?.is_registered && (
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-bold mb-2 text-gray-900 dark:text-slate-200"
            >
              {t("auth.confirmPassword")}
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleAuth()}
                className="w-full rounded-lg border-2 border-gray-400 bg-white text-gray-900 p-4 pr-20 text-lg font-bold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-600 dark:focus:ring-blue-500/30"
                placeholder={t("auth.confirmPassword")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-3 flex items-center text-sm font-semibold text-gray-700 hover:text-gray-900 dark:text-slate-300 dark:hover:text-slate-200"
              >
                {showPassword ? t("auth.hide") : t("auth.show")}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg dark:bg-rose-950/40 dark:border-rose-900/40 dark:text-rose-200">
            <CloseIcon className="w-5 h-5 inline-block mr-1" />
            {error}
          </div>
        )}

        <button
          onClick={handleAuth}
          disabled={
            loading ||
            !password ||
            (!selectedStudent?.is_registered && (!confirmPassword || password !== confirmPassword))
          }
          className="w-full btn btn-primary btn-lg btn-glow text-lg"
        >
          {loading ? (
            <>
              <WashingSpinner className="w-4 h-4" />
              <span>{t("common.loading")}</span>
            </>
          ) : selectedStudent?.is_registered
          ? t("auth.login")
          : t("auth.register")
        }
        </button>
      </div>
    </div>
  );
}

