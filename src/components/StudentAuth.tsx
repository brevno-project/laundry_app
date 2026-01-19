"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useLaundry } from "@/contexts/LaundryContext";
import { Student } from "@/types";
import { DoorIcon, CheckIcon, CloseIcon, BackIcon, WashingSpinner } from "@/components/Icons";
import Avatar from "@/components/Avatar";

export default function StudentAuth() {
  const { students, registerStudent, loginStudent, loadStudents } = useLaundry();

  const [step, setStep] = useState<"select" | "auth">("select");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [banNotice, setBanNotice] = useState("");

  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const notice = localStorage.getItem("banNotice");
    if (notice) {
      setBanNotice(notice);
      localStorage.removeItem("banNotice");
    }
    // Refresh students list only once on mount
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      console.log('🔄 StudentAuth: loading fresh students list (once)...');
      loadStudents();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Логируем данные студентов при их изменении
  useEffect(() => {
    if (students.length > 0) {
      console.log('📋 StudentAuth: students loaded (first 3):', students.slice(0, 3).map(s => ({
        full_name: s.full_name,
        avatar_style: s.avatar_style,
        avatar_seed: s.avatar_seed
      })));
    }
  }, [students.length]); // Only log when count changes

  const banNoticeBanner = banNotice ? (
    <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-700">
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
    setShowPassword(false);
  };

  const handleAuth = async () => {
    if (!selectedStudent) return;

    if (!password) {
      setError("Введите пароль");
      return;
    }

    if (!selectedStudent.is_registered && password.length < 6) {
      setError("Пароль должен быть минимум 6 символов");
      return;
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
            ? "Неправильный пароль"
            : "Ошибка регистрации")
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
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg shadow-xl border-2 border-blue-200 relative">
        {banNoticeBanner}

        <h2 className="text-2xl font-bold mb-4 text-gray-900 text-center">
          Очередь на стирку
        </h2>
        <h3 className="text-lg font-bold mb-4 text-gray-900 text-center">
          Выберите себя из списка
        </h3>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск по имени или комнате..."
          className="w-full p-4 rounded-lg border-2 border-blue-400 bg-white text-gray-900 text-xl font-semibold mb-4 focus:border-blue-600 focus:ring-2 focus:ring-blue-300 placeholder:text-gray-600"
        />

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-8 text-gray-900 font-bold text-xl">
              Ничего не найдено
            </div>
          ) : (
            filteredStudents.map((student) => (
              <button
                key={student.id}
                onClick={() => handleStudentSelect(student)}
                className="w-full bg-white hover:bg-blue-100 border-3 border-gray-400 hover:border-blue-600 rounded-lg p-4 text-left transition-all shadow-md hover:shadow-xl"
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
                      <div className="font-black text-xl text-gray-900">
                        {student.full_name}
                      </div>
                      {student.room && (
                        <div className="text-base text-gray-700 font-bold flex items-center gap-1">
                          <DoorIcon className="w-4 h-4" /> Комната {student.room}
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
                        NEW
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

  // -------------------------------
  // STEP 2: AUTH PAGE
  // -------------------------------
  return (
    <div className="bg-white p-6 rounded-lg shadow-xl border-2 border-gray-200">
      {banNoticeBanner}
      <button
        onClick={() => {
          setStep("select");
          setPassword("");
          setError("");
        }}
        className="text-blue-600 hover:text-blue-800 font-bold mb-4 flex items-center gap-2"
      >
        <BackIcon className="w-5 h-5" /> Назад
      </button>

      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6 flex items-center gap-3">
        <Avatar
          name={selectedStudent?.full_name}
          style={selectedStudent?.avatar_style}
          seed={selectedStudent?.avatar_seed}
          className="w-14 h-14"
        />
        <div>
          <div className="font-black text-xl text-gray-900">
            {selectedStudent?.full_name}
          </div>
          {selectedStudent?.room && (
            <div className="text-sm text-gray-900 font-medium flex items-center gap-1">
              <DoorIcon className="w-4 h-4" /> Комната {selectedStudent.room}
            </div>
          )}
        </div>
      </div>

      <h2 className="text-2xl font-black mb-2 text-gray-900">
        {selectedStudent?.is_registered ? "Вход" : "Первый раз?"}
      </h2>

      <p className="text-gray-900 mb-6 font-medium">
        {selectedStudent?.is_registered
          ? "Введите ваш пароль"
          : "Придумайте пароль для регистрации"}
      </p>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-bold mb-2 text-gray-900"
          >
            Пароль
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
              className="w-full rounded-lg border-2 border-gray-400 bg-white text-gray-900 p-4 pr-20 text-lg font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              placeholder="Введите пароль"
              autoFocus
            />

            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-3 flex items-center text-sm font-semibold text-gray-700 hover:text-gray-900"
            >
              {showPassword ? "Скрыть" : "Показать"}
            </button>
          </div>

          {!selectedStudent?.is_registered && (
            <p className="text-xs text-gray-700 mt-1 font-medium">
              От 6 символов
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            <CloseIcon className="w-5 h-5 inline-block mr-1" />
            {error}
          </div>
        )}

        <button
          onClick={handleAuth}
          disabled={loading || !password}
          className="w-full bg-blue-600 text-white font-bold py-4 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-lg"
        >
          {loading ? (
            <>
              <WashingSpinner className="w-4 h-4" />
              <span>Загрузка...</span>
            </>
          ) : selectedStudent?.is_registered
          ? "Войти"
          : "Зарегистрироваться"
        }
        </button>
      </div>
    </div>
  );
}
