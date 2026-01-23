"use client";

import React, { useState } from "react";
import { useLaundry } from "@/contexts/LaundryContext";
import { useUi } from "@/contexts/UiContext";
import { WashingSpinner } from "@/components/Icons";

interface AddStudentModalProps {
  onClose: () => void;
}

export default function AddStudentModal({ onClose }: AddStudentModalProps) {
  const { addStudent } = useLaundry();
  const { t } = useUi();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [room, setRoom] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const alertWithCheck = (message: string) => {
    const trimmed = message.trim();
    const suffix = trimmed.endsWith("✅") ? "" : " ✅";
    alert(`${message}${suffix}`);
  };

  const validateRoom = (roomValue: string): { valid: boolean; error?: string } => {
    if (!roomValue.trim()) {
      return { valid: false, error: t("students.addRoomRequired") };
    }

    const trimmedRoom = roomValue.trim().toUpperCase();
    const roomRegex = /^[AB][0-9]{3}$/;
    if (!roomRegex.test(trimmedRoom)) {
      return { valid: false, error: t("students.addRoomFormat") };
    }

    const roomNumber = parseInt(trimmedRoom.slice(1), 10);
    if (roomNumber < 101 || roomNumber > 999) {
      return { valid: false, error: t("students.addRoomRange") };
    }

    return { valid: true };
  };

  const handleSubmit = async () => {
    if (!firstName.trim()) {
      alertWithCheck(t("students.addMissingFirstName"));
      return;
    }

    if (!lastName.trim()) {
      alertWithCheck(t("students.addMissingLastName"));
      return;
    }

    const roomValidation = validateRoom(room);
    if (!roomValidation.valid) {
      alertWithCheck(roomValidation.error || t("students.addRoomFormat"));
      return;
    }

    const validatedRoom = room.trim().toUpperCase();

    setIsSubmitting(true);
    const startedAt = Date.now();
    let shouldClose = false;
    try {
      await addStudent(
        firstName.trim(),
        lastName.trim(),
        validatedRoom,
        middleName.trim() || ""
      );

      const elapsedMs = Date.now() - startedAt;
      if (elapsedMs < 350) {
        await new Promise((resolve) => setTimeout(resolve, 350 - elapsedMs));
      }

      alertWithCheck(t("students.addSuccess"));
      shouldClose = true;
    } catch (error: any) {
      const message =
        typeof error?.message === "string" && error.message.trim().length > 0
          ? error.message
          : t("students.addErrorFallback");

      if (message.includes("duplicate key") || message.includes("unique_student_fullname")) {
        alertWithCheck(t("students.addDuplicate"));
      } else {
        alertWithCheck(t("students.addError", { message }));
      }
    } finally {
      setIsSubmitting(false);
      if (shouldClose) {
        onClose();
      }
    }
  };

  const handleRoomChange = (value: string) => {
    const filtered = value.toUpperCase().replace(/[^AB0-9]/g, "");
    setRoom(filtered);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:ring-1 dark:ring-white/20 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_28px_60px_rgba(0,0,0,0.65)] rounded-lg p-6 max-w-md w-full">
        <h3 className="text-xl font-bold text-gray-900 mb-4 dark:text-slate-100">
          {t("students.addTitle")}
        </h3>
        {isSubmitting && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 dark:bg-blue-900/20 dark:text-blue-200">
            <WashingSpinner className="w-5 h-5" />
            <span>{t("students.addSubmitting")}</span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2 text-gray-900 dark:text-slate-200">
              {t("students.field.room")} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={room}
              onChange={(event) => handleRoomChange(event.target.value)}
              placeholder={t("students.field.roomPlaceholder")}
              className="w-full border-2 border-gray-300 rounded-lg p-3 text-gray-900 uppercase bg-white placeholder:text-gray-500 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200 dark:border-slate-600 dark:bg-slate-950/40 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-white dark:focus:ring-white/30"
              maxLength={4}
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500 mt-1 dark:text-slate-400">
              {t("students.addRoomHint")}
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 text-gray-900 dark:text-slate-200">
              {t("students.field.lastName")} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg p-3 text-gray-900 bg-white placeholder:text-gray-500 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200 dark:border-slate-600 dark:bg-slate-950/40 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-white dark:focus:ring-white/30"
              placeholder={t("students.field.lastNamePlaceholder")}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 text-gray-900 dark:text-slate-200">
              {t("students.field.firstName")} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg p-3 text-gray-900 bg-white placeholder:text-gray-500 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200 dark:border-slate-600 dark:bg-slate-950/40 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-white dark:focus:ring-white/30"
              placeholder={t("students.field.firstNamePlaceholder")}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 text-gray-900 dark:text-slate-200">
              {t("students.field.middleName")}
            </label>
            <input
              type="text"
              value={middleName}
              onChange={(event) => setMiddleName(event.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg p-3 text-gray-900 bg-white placeholder:text-gray-500 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200 dark:border-slate-600 dark:bg-slate-950/40 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-white dark:focus:ring-white/30"
              placeholder={t("students.field.middleNamePlaceholder")}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-700 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 btn btn-primary btn-glow"
          >
            {isSubmitting ? (
              <>
                <WashingSpinner className="w-4 h-4" />
                <span>{t("students.addSubmitting")}</span>
              </>
            ) : (
              <>{t("students.addSubmit")}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
