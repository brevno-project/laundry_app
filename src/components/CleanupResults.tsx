"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLaundry } from "@/contexts/LaundryContext";
import { useUi } from "@/contexts/UiContext";
import { supabase } from "@/lib/supabase";
import type {
  Apartment,
  CleanupResult,
  CleanupSchedule,
  Coupon,
  CouponTransfer,
  Student,
} from "@/types";
import {
  CalendarIcon,
  CheckIcon,
  MoneyIcon,
  PeopleIcon,
  TicketIcon,
  WashingSpinner,
} from "@/components/Icons";

const SCORE_CAPTIONS_RU = [
  { key: "thanks-team", label: "Спасибо всем за старание — вы большие молодцы!" },
  { key: "keep-going", label: "Так держать! На следующей неделе ждём ещё лучше." },
  { key: "clean-and-cozy", label: "Было чисто и приятно — благодарим всех." },
  { key: "great-teamwork", label: "Отличная работа команды, продолжайте в том же духе." },
  { key: "super-result", label: "Супер-результат, спасибо за порядок." },
  { key: "everyone-contributed", label: "Каждая квартира внесла вклад — это заметно." },
  { key: "top-clean", label: "Сегодня чистота на высоте, гордимся вами." },
  { key: "excellent", label: "Уборка прошла на отлично, спасибо!" },
  { key: "thanks-participation", label: "Всем спасибо за участие и аккуратность." },
  { key: "clean-is-ours", label: "Чистота — наше всё. Хороший результат!" },
  { key: "together-strong", label: "Дружно поработали — молодцы!" },
  { key: "responsibility", label: "Спасибо за ответственность и дисциплину." },
  { key: "keep-bar", label: "Продолжайте держать планку." },
  { key: "order-pleases", label: "Порядок радует глаз — благодарим!" },
  { key: "week-results", label: "Отличные итоги недели, так держать!" },
  { key: "line-01", label: "Спасибо! Чисто, аккуратно и приятно." },
  { key: "line-02", label: "Отличная работа — видно, что старались." },
  { key: "line-03", label: "Хороший результат — продолжайте в том же духе." },
  { key: "line-04", label: "Порядок на уровне — спасибо всем." },
  { key: "line-05", label: "Супер! Уют и чистота заметны сразу." },
  { key: "line-06", label: "Так держать — дисциплина и аккуратность радуют." },
  { key: "line-07", label: "Отлично справились — благодарим за старание." },
  { key: "line-08", label: "Хорошая командная работа — спасибо!" },
  { key: "line-09", label: "Тут прям приятно находиться — молодцы." },
  { key: "line-10", label: "Спасибо за порядок — это реально важно." },
  { key: "line-11", label: "Аккуратно и чисто — отличный уровень." },
  { key: "line-12", label: "Уборка на совесть — благодарим." },
  { key: "line-13", label: "Стабильно хорошо — продолжайте так же." },
  { key: "line-14", label: "Чистота держится — видно вашу ответственность." },
  { key: "line-15", label: "Класс! Спасибо за вклад каждого." },
  { key: "line-16", label: "Круто получилось — порядок радует." },
  { key: "line-17", label: "Спасибо! С таким подходом будет ещё лучше." },
  { key: "line-18", label: "Уровень чистоты отличный — молодцы." },
  { key: "line-19", label: "Спасибо за организацию и аккуратность." },
  { key: "line-20", label: "Отлично — поддерживаем этот стандарт." },
  { key: "line-21", label: "Хороший результат — спасибо всем участникам." },
  { key: "line-22", label: "Всё аккуратно — благодарим за внимание к деталям." },
  { key: "line-23", label: "Порядок и чистота — супер сочетание." },
  { key: "line-24", label: "Спасибо — чисто, свежо, приятно." },
  { key: "line-25", label: "Молодцы! Видно, что сделали качественно." },
  { key: "line-26", label: "Отлично — продолжаем держать планку." },
  { key: "line-27", label: "Спасибо за аккуратность — это заметно." },
  { key: "line-28", label: "Очень достойно — спасибо за общий вклад." },
  { key: "line-29", label: "Уборка прошла отлично — благодарим." },
  { key: "line-30", label: "Супер! Так приятно видеть порядок." },
  { key: "line-31", label: "Спасибо всем — чистота держится." },
  { key: "line-32", label: "Хорошо сработали — отличный результат." },
  { key: "line-33", label: "Аккуратность — топ. Спасибо!" },
  { key: "line-34", label: "Отлично — приятно и чисто." },
  { key: "line-35", label: "Спасибо! Уют начинается с порядка." },
  { key: "line-36", label: "Хороший уровень — давайте так и дальше." },
  { key: "line-37", label: "Супер-работа — спасибо за дисциплину." },
  { key: "line-38", label: "Молодцы — результат отличный." },
  { key: "line-39", label: "Чисто и аккуратно — спасибо." },
  { key: "line-40", label: "Спасибо всем — так держать!" },
];

const SCORE_CAPTIONS_EN = [
  { key: "thanks-team", label: "Thanks everyone for the effort — you did great!" },
  { key: "keep-going", label: "Keep it up! Let’s do even better next week." },
  { key: "clean-and-cozy", label: "It was clean and pleasant — thank you all." },
  { key: "great-teamwork", label: "Great teamwork — keep it up." },
  { key: "super-result", label: "Super result — thanks for keeping it tidy." },
  { key: "everyone-contributed", label: "Every apartment contributed — it shows." },
  { key: "top-clean", label: "Cleanliness is top-notch today — proud of you." },
  { key: "excellent", label: "Excellent cleanup — thank you!" },
  { key: "thanks-participation", label: "Thanks everyone for participating and being careful." },
  { key: "clean-is-ours", label: "Cleanliness is our thing — great result!" },
  { key: "together-strong", label: "Worked together well — great job!" },
  { key: "responsibility", label: "Thanks for responsibility and discipline." },
  { key: "keep-bar", label: "Keep the bar high." },
  { key: "order-pleases", label: "Order is pleasing — thank you!" },
  { key: "week-results", label: "Great weekly results — keep it up!" },
  { key: "line-01", label: "Thank you! Clean, neat, and pleasant." },
  { key: "line-02", label: "Great job — it shows you put effort in." },
  { key: "line-03", label: "Nice result — keep the same pace." },
  { key: "line-04", label: "Everything looks tidy — thank you all." },
  { key: "line-05", label: "Awesome! Cleanliness and comfort are noticeable." },
  { key: "line-06", label: "Keep it up — discipline really helps." },
  { key: "line-07", label: "Well done — thanks for the effort." },
  { key: "line-08", label: "Strong teamwork — thank you!" },
  { key: "line-09", label: "It feels nice here — great work." },
  { key: "line-10", label: "Thanks for keeping things in order." },
  { key: "line-11", label: "Neat and clean — excellent level." },
  { key: "line-12", label: "Solid cleanup — thank you." },
  { key: "line-13", label: "Consistently good — keep going." },
  { key: "line-14", label: "Cleanliness is maintained — great responsibility." },
  { key: "line-15", label: "Nice! Thanks for everyone’s contribution." },
  { key: "line-16", label: "Great outcome — order looks good." },
  { key: "line-17", label: "Thank you! With this approach it will get even better." },
  { key: "line-18", label: "Excellent level of cleanliness — great job." },
  { key: "line-19", label: "Thanks for organization and carefulness." },
  { key: "line-20", label: "Great — let’s keep this standard." },
  { key: "line-21", label: "Good result — thanks to everyone involved." },
  { key: "line-22", label: "Everything is neat — thanks for attention to details." },
  { key: "line-23", label: "Order and cleanliness — perfect combo." },
  { key: "line-24", label: "Thank you — clean, fresh, and pleasant." },
  { key: "line-25", label: "Great job! You can see it was done carefully." },
  { key: "line-26", label: "Awesome — keep the bar high." },
  { key: "line-27", label: "Thanks for neatness — it’s noticeable." },
  { key: "line-28", label: "Very solid — thank you for the shared effort." },
  { key: "line-29", label: "Cleanup went great — thank you." },
  { key: "line-30", label: "Awesome! It’s nice to see things in order." },
  { key: "line-31", label: "Thank you all — cleanliness is maintained." },
  { key: "line-32", label: "Well done — excellent result." },
  { key: "line-33", label: "Neatness is top — thank you!" },
  { key: "line-34", label: "Great — clean and comfortable." },
  { key: "line-35", label: "Thank you! Comfort starts with order." },
  { key: "line-36", label: "Good level — let’s keep it going." },
  { key: "line-37", label: "Great work — thanks for discipline." },
  { key: "line-38", label: "Nice job — great result." },
  { key: "line-39", label: "Clean and neat — thank you." },
  { key: "line-40", label: "Thanks everyone — keep it up!" },
];

const SCORE_CAPTIONS_KY = [
  { key: "thanks-team", label: "Баарыңарга аракет үчүн рахмат — чоң молодецсиңер!" },
  { key: "keep-going", label: "Ушундай уланткыла! Кийинки жумада дагы жакшыраак болсун." },
  { key: "clean-and-cozy", label: "Таза жана жагымдуу болду — баарыңа рахмат." },
  { key: "great-teamwork", label: "Команда болуп жакшы иштедиңер — ошол темпте уланталы." },
  { key: "super-result", label: "Супер жыйынтык, тартип үчүн рахмат." },
  { key: "everyone-contributed", label: "Ар бир квартира салым кошту — байкалат." },
  { key: "top-clean", label: "Бүгүн тазалык эң жогорку деңгээлде, сыймыктанабыз." },
  { key: "excellent", label: "Тазалоо эң сонун өттү, рахмат!" },
  { key: "thanks-participation", label: "Катышканыңар жана тактыгыңар үчүн рахмат." },
  { key: "clean-is-ours", label: "Тазалык — биздин баалуулук. Жакшы жыйынтык!" },
  { key: "together-strong", label: "Бирге иштеп — молодец!" },
  { key: "responsibility", label: "Жоопкерчилик жана тартип үчүн рахмат." },
  { key: "keep-bar", label: "Планканы түшүрбөй уланталы." },
  { key: "order-pleases", label: "Тартип көзгө жагат — рахмат!" },
  { key: "week-results", label: "Жуманын жыйынтыгы мыкты, ушундай уланткыла!" },
  { key: "line-01", label: "Рахмат! Таза, тыкан жана жагымдуу." },
  { key: "line-02", label: "Мыкты иш — аракет байкалып турат." },
  { key: "line-03", label: "Жакшы жыйынтык — ошол темпте уланталы." },
  { key: "line-04", label: "Баары тыкан — баарыңа рахмат." },
  { key: "line-05", label: "Супер! Тазалык дароо көрүнүп турат." },
  { key: "line-06", label: "Уланта бергиле — тартип жардам берет." },
  { key: "line-07", label: "Жакшы аткарылды — аракет үчүн рахмат." },
  { key: "line-08", label: "Команда болуп жакшы иштедиңер — рахмат!" },
  { key: "line-09", label: "Бул жерде болуу жагымдуу — молодец." },
  { key: "line-10", label: "Тартипти сактаганыңар үчүн рахмат." },
  { key: "line-11", label: "Тыкан жана таза — жакшы деңгээл." },
  { key: "line-12", label: "Жоопкерчиликтүү тазалоо — рахмат." },
  { key: "line-13", label: "Туруктуу жакшы — ушинтип уланталы." },
  { key: "line-14", label: "Тазалык кармалып турат — жакшы." },
  { key: "line-15", label: "Класс! Ар кимдин салымы бар — рахмат." },
  { key: "line-16", label: "Жыйынтык жакшы — тартип көрүнүп турат." },
  { key: "line-17", label: "Рахмат! Ушундай болсо андан да жакшы болот." },
  { key: "line-18", label: "Тазалыктын деңгээли мыкты — молодец." },
  { key: "line-19", label: "Уюштуруучулук жана тыкандык үчүн рахмат." },
  { key: "line-20", label: "Мыкты — ушул стандартты кармайлы." },
  { key: "line-21", label: "Жакшы жыйынтык — баарына рахмат." },
  { key: "line-22", label: "Баары тыкан — майда нерселерге көңүл бурганыңар үчүн рахмат." },
  { key: "line-23", label: "Тартип жана тазалык — мыкты айкалыш." },
  { key: "line-24", label: "Рахмат — таза, жаңы жана жагымдуу." },
  { key: "line-25", label: "Молодец! Сапаттуу жасалганы көрүнөт." },
  { key: "line-26", label: "Супер — планканы түшүрбөй уланталы." },
  { key: "line-27", label: "Тыкандык үчүн рахмат — байкалат." },
  { key: "line-28", label: "Абдан жакшы — жалпы эмгек үчүн рахмат." },
  { key: "line-29", label: "Тазалоо жакшы өттү — рахмат." },
  { key: "line-30", label: "Супер! Тартипти көрүү жагымдуу." },
  { key: "line-31", label: "Баарыңа рахмат — тазалык кармалып турат." },
  { key: "line-32", label: "Жакшы иш — жыйынтык сонун." },
  { key: "line-33", label: "Тыкандык эң жакшы — рахмат!" },
  { key: "line-34", label: "Мыкты — таза жана жайлуу." },
  { key: "line-35", label: "Рахмат! Жайлуулук тартиптен башталат." },
  { key: "line-36", label: "Жакшы деңгээл — ушинтип уланталы." },
  { key: "line-37", label: "Супер иш — тартип үчүн рахмат." },
  { key: "line-38", label: "Молодец — жыйынтык мыкты." },
  { key: "line-39", label: "Таза жана тыкан — рахмат." },
  { key: "line-40", label: "Баарыңа рахмат — ушундай уланткыла!" },
];

const SCORE_CAPTIONS_KO = [
  { key: "thanks-team", label: "모두 수고했어요 — 정말 잘했어요!" },
  { key: "keep-going", label: "계속 이렇게 해요! 다음 주엔 더 잘해봅시다." },
  { key: "clean-and-cozy", label: "깨끗하고 기분 좋았습니다 — 감사합니다." },
  { key: "great-teamwork", label: "팀워크가 훌륭했어요 — 계속 유지해요." },
  { key: "super-result", label: "훌륭한 결과입니다 — 정리해줘서 고마워요." },
  { key: "everyone-contributed", label: "모든 아파트가 기여한 게 보여요." },
  { key: "top-clean", label: "오늘은 정말 깨끗해요 — 자랑스럽습니다." },
  { key: "excellent", label: "청소가 아주 잘 됐어요 — 감사합니다!" },
  { key: "thanks-participation", label: "참여해주고 깔끔하게 해줘서 감사합니다." },
  { key: "clean-is-ours", label: "청결은 우리의 자랑입니다. 좋은 결과예요!" },
  { key: "together-strong", label: "함께 잘했어요 — 최고!" },
  { key: "responsibility", label: "책임감과 규율을 지켜줘서 감사합니다." },
  { key: "keep-bar", label: "높은 기준을 유지해요." },
  { key: "order-pleases", label: "정돈된 모습이 보기 좋아요 — 감사합니다!" },
  { key: "week-results", label: "이번 주 결과가 훌륭해요 — 계속 이렇게 해요!" },
  { key: "line-01", label: "감사합니다! 깔끔하고 쾌적해요." },
  { key: "line-02", label: "좋은 작업이에요 — 노력한 게 보여요." },
  { key: "line-03", label: "좋은 결과입니다 — 그대로 유지해요." },
  { key: "line-04", label: "정리가 잘 되어 있어요 — 감사합니다." },
  { key: "line-05", label: "최고예요! 청결함이 바로 느껴져요." },
  { key: "line-06", label: "계속 이렇게 해요 — 규칙이 도움이 돼요." },
  { key: "line-07", label: "수고했어요 — 노력에 감사합니다." },
  { key: "line-08", label: "팀워크가 좋아요 — 감사합니다!" },
  { key: "line-09", label: "여기가 정말 쾌적해요 — 잘했어요." },
  { key: "line-10", label: "정돈을 유지해줘서 감사합니다." },
  { key: "line-11", label: "깔끔하고 깨끗해요 — 훌륭합니다." },
  { key: "line-12", label: "성실한 청소 — 감사합니다." },
  { key: "line-13", label: "꾸준히 좋아요 — 계속 유지해요." },
  { key: "line-14", label: "청결이 잘 유지되고 있어요 — 좋아요." },
  { key: "line-15", label: "좋아요! 모두의 기여에 감사합니다." },
  { key: "line-16", label: "결과가 좋아요 — 정돈이 잘 보입니다." },
  { key: "line-17", label: "감사합니다! 이런 분위기면 더 좋아질 거예요." },
  { key: "line-18", label: "청결 수준이 훌륭해요 — 최고!" },
  { key: "line-19", label: "정리와 꼼꼼함에 감사합니다." },
  { key: "line-20", label: "좋아요 — 이 기준을 유지해요." },
  { key: "line-21", label: "좋은 결과예요 — 모두 감사합니다." },
  { key: "line-22", label: "세세한 부분까지 신경 써줘서 감사합니다." },
  { key: "line-23", label: "정돈과 청결 — 완벽한 조합이에요." },
  { key: "line-24", label: "감사합니다 — 깨끗하고 상쾌해요." },
  { key: "line-25", label: "잘했어요! 꼼꼼하게 한 게 보여요." },
  { key: "line-26", label: "좋아요 — 높은 기준을 계속 유지해요." },
  { key: "line-27", label: "깔끔함이 눈에 띄어요 — 감사합니다." },
  { key: "line-28", label: "아주 탄탄해요 — 함께한 노력에 감사합니다." },
  { key: "line-29", label: "청소가 잘 됐어요 — 감사합니다." },
  { key: "line-30", label: "최고! 정돈된 모습이 보기 좋아요." },
  { key: "line-31", label: "모두 감사합니다 — 청결이 유지돼요." },
  { key: "line-32", label: "수고했어요 — 결과가 훌륭해요." },
  { key: "line-33", label: "깔끔함 최고예요 — 감사합니다!" },
  { key: "line-34", label: "좋아요 — 깨끗하고 편안해요." },
  { key: "line-35", label: "감사합니다! 편안함은 정돈에서 시작돼요." },
  { key: "line-36", label: "좋은 수준이에요 — 계속 이어가요." },
  { key: "line-37", label: "훌륭한 작업 — 규율에 감사합니다." },
  { key: "line-38", label: "최고예요 — 결과가 좋아요." },
  { key: "line-39", label: "깨끗하고 정돈돼 있어요 — 감사합니다." },
  { key: "line-40", label: "모두 감사합니다 — 계속 이렇게 해요!" },
];

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getNextWednesdayISO = () => {
  const now = new Date();
  const currentDay = now.getDay();
  const targetDay = 3;
  let diff = targetDay - currentDay;
  if (diff < 0) diff += 7;
  const next = new Date(now);
  next.setDate(now.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return formatLocalDate(next);
};

const formatWeekLabel = (dateStr?: string, locale: string = "ru-RU") => {
  if (!dateStr) return "-";
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString(locale, { day: "numeric", month: "long" });
};

const formatScheduleLabel = (dateStr?: string, locale: string = "ru-RU") => {
  if (!dateStr) return "-";
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
};

const formatDateTime = (dateStr?: string | null, locale: string = "ru-RU") => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString(locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const PERMANENT_COUPON_YEARS = 5;

const isPermanentCoupon = (coupon: Coupon) => {
  const expiresAt = new Date(coupon.expires_at).getTime();
  if (Number.isNaN(expiresAt)) return false;
  const issuedAt = coupon.issued_at ? new Date(coupon.issued_at).getTime() : null;
  const baseTime = issuedAt && !Number.isNaN(issuedAt) ? issuedAt : Date.now();
  const thresholdMs = PERMANENT_COUPON_YEARS * 365 * 24 * 60 * 60 * 1000;
  return expiresAt - baseTime >= thresholdMs;
};

const formatCouponExpiry = (
  coupon: Coupon,
  locale: string,
  t: (key: string, vars?: Record<string, string | number>) => string
) => (isPermanentCoupon(coupon) ? t("coupon.permanent") : t("coupon.until", { date: formatDateTime(coupon.expires_at, locale) }));

const formatCouponOptionLabel = (
  coupon: Coupon,
  locale: string,
  t: (key: string, vars?: Record<string, string | number>) => string
) =>
  isPermanentCoupon(coupon)
    ? t("coupon.optionPermanent")
    : t("coupon.optionUntil", { date: formatDateTime(coupon.expires_at, locale) });

const formatTime = (timeStr?: string | null) => {
  if (!timeStr) return "";
  return timeStr.slice(0, 5);
};

const formatPoints = (value: number) => {
  const abs = Math.abs(value);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return `${value} балл`;
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${value} балла`;
  }
  return `${value} баллов`;
};

const hasCyrillic = (value: string) => /[А-Яа-яЁё]/.test(value);

const mapPublishError = (
  t: (key: string, vars?: Record<string, string | number>) => string,
  message?: string
) => {
  if (!message) return t("cleanup.errors.publish.default");
  if (hasCyrillic(message)) return message;
  switch (message) {
    case "Invalid token":
    case "Missing or invalid Authorization header":
      return t("errors.sessionExpired");
    case "Missing required fields":
      return t("errors.fillRequired");
    case "Invalid block":
      return t("cleanup.errors.invalidBlock");
    case "Admin apartment not set":
      return t("cleanup.errors.adminApartmentMissing");
    case "Not allowed to publish for this block":
      return t("cleanup.errors.publish.notAllowed");
    case "Apartment not found":
      return t("cleanup.errors.apartmentNotFound");
    case "Apartment block mismatch":
      return t("cleanup.errors.apartmentBlockMismatch");
    case "Insert failed":
      return t("cleanup.errors.publish.insertFailed");
    default:
      return t("cleanup.errors.publish.default");
  }
};

const mapScheduleError = (
  t: (key: string, vars?: Record<string, string | number>) => string,
  message?: string
) => {
  if (!message) return t("cleanup.errors.schedule.default");
  if (hasCyrillic(message)) return message;
  switch (message) {
    case "Invalid token":
    case "Missing or invalid Authorization header":
      return t("errors.sessionExpired");
    case "Missing required fields":
      return t("cleanup.schedule.missingDate");
    case "Invalid block":
      return t("cleanup.errors.invalidBlock");
    case "Not allowed to schedule for this block":
      return t("cleanup.errors.schedule.notAllowed");
    case "Insert failed":
      return t("cleanup.errors.schedule.insertFailed");
    default:
      return t("cleanup.errors.schedule.default");
  }
};

const mapReminderError = (
  t: (key: string, vars?: Record<string, string | number>) => string,
  message?: string
) => {
  if (!message) return t("cleanup.errors.reminders.default");
  if (hasCyrillic(message)) return message;
  switch (message) {
    case "Invalid token":
    case "Missing or invalid Authorization header":
      return t("errors.sessionExpired");
    case "Missing block":
      return t("cleanup.errors.blockMissing");
    case "Invalid block":
      return t("cleanup.errors.invalidBlock");
    case "Admin apartment not set":
      return t("cleanup.errors.adminApartmentMissing");
    case "Not allowed to send reminders for this block":
      return t("cleanup.errors.reminders.notAllowed");
    case "Schedule not found":
      return t("cleanup.errors.schedule.notFound");
    case "Internal server error":
      return t("errors.internalServer");
    default:
      return t("cleanup.errors.reminders.default");
  }
};

const mapResultsError = (
  t: (key: string, vars?: Record<string, string | number>) => string,
  message?: string
) => {
  if (!message) return t("cleanup.errors.results.default");
  if (hasCyrillic(message)) return message;
  switch (message) {
    case "Invalid token":
    case "Missing or invalid Authorization header":
      return t("errors.sessionExpired");
    case "Missing block":
      return t("cleanup.errors.blockMissing");
    case "Invalid block":
      return t("cleanup.errors.invalidBlock");
    case "Admin apartment not set":
      return t("cleanup.errors.adminApartmentMissing");
    case "Not allowed to clear results for this block":
      return t("cleanup.errors.results.notAllowed");
    default:
      return t("cleanup.errors.results.default");
  }
};

const mapTransferError = (
  t: (key: string, vars?: Record<string, string | number>) => string,
  message?: string
) => {
  if (!message) return t("cleanup.errors.transfer.default");
  if (hasCyrillic(message)) return message;
  switch (message) {
    case "Coupon not found":
      return t("cleanup.errors.transfer.couponNotFound");
    case "Coupon expired":
      return t("cleanup.errors.transfer.couponExpired");
    case "Not allowed":
      return t("cleanup.errors.transfer.notAllowed");
    case "Coupon is reserved or used":
      return t("cleanup.errors.transfer.couponReservedOrUsed");
    case "Different apartment":
      return t("cleanup.errors.transfer.differentApartment");
    default:
      return t("cleanup.errors.transfer.default");
  }
};

const mapGrantError = (
  t: (key: string, vars?: Record<string, string | number>) => string,
  message?: string
) => {
  if (!message) return t("cleanup.errors.grant.default");
  if (hasCyrillic(message)) return message;
  switch (message) {
    case "Only super admin can grant coupons":
      return t("cleanup.errors.grant.onlySuperAdmin");
    case "Missing student_id or invalid count":
      return t("cleanup.grant.missingStudentOrCount");
    case "Invalid expires_at":
      return t("cleanup.errors.grant.invalidExpiry");
    case "expires_at must be in the future":
      return t("cleanup.errors.grant.expiryMustBeFuture");
    case "Internal server error":
      return t("errors.internalServer");
    default:
      return t("cleanup.errors.grant.default");
  }
};

type CleanupResultsProps = {
  embedded?: boolean;
};

type Block = "A" | "B";

type ScheduleDraft = {
  date: string;
  time: string;
};

type ReminderRecipient = {
  id: string;
  name: string;
  room?: string | null;
};

const formatTtlLabel = (
  seconds: number,
  t: (key: string, vars?: Record<string, string | number>) => string
) => {
  if (seconds % 60 === 0) {
    const minutes = seconds / 60;
    return t("cleanup.ttl.minutes", { count: minutes });
  }
  return t("cleanup.ttl.seconds", { count: seconds });
};

const formatRecipientLabel = (recipient: ReminderRecipient) =>
  recipient.room ? `${recipient.name} (${recipient.room})` : recipient.name;

export default function CleanupResults({ embedded = false }: CleanupResultsProps) {
  const { user, isAdmin, isSuperAdmin, isCleanupAdmin, students } = useLaundry();
  const { t, language } = useUi();
  const locale = language === "ru" ? "ru-RU" : language === "en" ? "en-US" : language === "ko" ? "ko-KR" : "ky-KG";
  const canManageCleanup = isAdmin || isSuperAdmin || isCleanupAdmin;
  const scoreCaptions = useMemo(() => {
    if (language === "en") return SCORE_CAPTIONS_EN;
    if (language === "ky") return SCORE_CAPTIONS_KY;
    if (language === "ko") return SCORE_CAPTIONS_KO;
    return SCORE_CAPTIONS_RU;
  }, [language]);
  const [results, setResults] = useState<CleanupResult[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [schedules, setSchedules] = useState<CleanupSchedule[]>([]);
  const [announcers, setAnnouncers] = useState<Record<string, string>>({});
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showAllCoupons, setShowAllCoupons] = useState(false);
  const [showCouponList, setShowCouponList] = useState(false);
  const [clearMyNotice, setClearMyNotice] = useState<string | null>(null);
  const [clearMyLoading, setClearMyLoading] = useState(false);
  const [clearStudentNotice, setClearStudentNotice] = useState<string | null>(null);
  const [clearStudentLoading, setClearStudentLoading] = useState(false);
  const [transfers, setTransfers] = useState<CouponTransfer[]>([]);
  const [transferNames, setTransferNames] = useState<Record<string, string>>({});
  const [recipients, setRecipients] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [adminBlock, setAdminBlock] = useState<Block | null>(null);
  const [weekStart, setWeekStart] = useState(getNextWednesdayISO());
  const [selectedBlock, setSelectedBlock] = useState<Block>("A");
  const [selectedApartment, setSelectedApartment] = useState<string>("");
  const [announcementText, setAnnouncementText] = useState("");
  const [announcementMode, setAnnouncementMode] = useState("manual");
  const [publishNotice, setPublishNotice] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [transferCouponId, setTransferCouponId] = useState("");
  const [transferRecipientId, setTransferRecipientId] = useState("");
  const [transferNotice, setTransferNotice] = useState<string | null>(null);
  const [transferHistoryNotice, setTransferHistoryNotice] = useState<string | null>(null);
  const [transferClearing, setTransferClearing] = useState(false);
  const [grantStudentId, setGrantStudentId] = useState("");
  const [grantCount, setGrantCount] = useState(1);
  const [grantNote, setGrantNote] = useState("");
  const [grantExpiryMode, setGrantExpiryMode] = useState<"default" | "custom" | "permanent">("default");
  const [grantExpiresAt, setGrantExpiresAt] = useState("");
  const [grantNotice, setGrantNotice] = useState<string | null>(null);
  const [grantStudents, setGrantStudents] = useState<Student[]>([]);
  const [couponTtlSeconds, setCouponTtlSeconds] = useState<number | null>(null);
  const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({});
  const [scoreCaptionKey, setScoreCaptionKey] = useState(
    SCORE_CAPTIONS_RU[0]?.key || ""
  );
  const [scheduleDrafts, setScheduleDrafts] = useState<Record<Block, ScheduleDraft>>(() => ({
    A: { date: getNextWednesdayISO(), time: "19:00" },
    B: { date: getNextWednesdayISO(), time: "19:00" },
  }));
  const [scheduleNotice, setScheduleNotice] = useState<Record<Block, string | null>>({
    A: null,
    B: null,
  });
  const [scheduleSaving, setScheduleSaving] = useState<Record<Block, boolean>>({
    A: false,
    B: false,
  });
  const [resultsClearing, setResultsClearing] = useState<Record<Block, boolean>>({
    A: false,
    B: false,
  });
  const [resultsNotice, setResultsNotice] = useState<Record<Block, string | null>>({
    A: null,
    B: null,
  });
  const [reminderNotice, setReminderNotice] = useState<Record<Block, string | null>>({
    A: null,
    B: null,
  });
  const [reminderSending, setReminderSending] = useState<Record<Block, boolean>>({
    A: false,
    B: false,
  });
  const [reminderRecipients, setReminderRecipients] = useState<
    Record<Block, ReminderRecipient[]>
  >({
    A: [],
    B: [],
  });
  const [reminderFailures, setReminderFailures] = useState<
    Record<Block, ReminderRecipient[]>
  >({
    A: [],
    B: [],
  });

  const getAuthToken = async (forceRefresh = false) => {
    if (!supabase) return null;
    const { data: sessionData } = await supabase.auth.getSession();
    let session = sessionData.session;
    const expiresAt = session?.expires_at ? session.expires_at * 1000 : 0;
    if (!session?.access_token) return null;
    const shouldRefresh =
      forceRefresh || !expiresAt || expiresAt - Date.now() < 60 * 1000;
    if (shouldRefresh) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      if (refreshed.session?.access_token) {
        session = refreshed.session;
      }
    }
    return session?.access_token ?? null;
  };

  const authedFetch = async (url: string, options: RequestInit = {}) => {
    const token = await getAuthToken();
    if (!token) {
      throw new Error(t("errors.tokenFetchFailed"));
    }

    const buildOptions = (authToken: string): RequestInit => {
      const headers = new Headers(options.headers ?? {});
      headers.set("Authorization", `Bearer ${authToken}`);
      return { ...options, headers };
    };

    let response = await fetch(url, buildOptions(token));

    if (response.status === 401) {
      const refreshedToken = await getAuthToken(true);
      if (refreshedToken && refreshedToken !== token) {
        response = await fetch(url, buildOptions(refreshedToken));
      }
    }

    return response;
  };

  const apartmentMap = useMemo(() => {
    const map: Record<string, Apartment> = {};
    apartments.forEach((apt) => {
      map[apt.id] = apt;
    });
    return map;
  }, [apartments]);

  const resultsByBlock = useMemo(() => {
    return {
      A: results.filter((item) => item.block === "A"),
      B: results.filter((item) => item.block === "B"),
    };
  }, [results]);

  const schedulesByBlock = useMemo(() => {
    return schedules.reduce<Record<Block, CleanupSchedule>>((acc, schedule) => {
      acc[schedule.block] = schedule;
      return acc;
    }, {} as Record<Block, CleanupSchedule>);
  }, [schedules]);

  const apartmentsForBlock = useMemo(() => {
    return apartments.filter((apt) => !apt.block || apt.block === selectedBlock);
  }, [apartments, selectedBlock]);

  useEffect(() => {
    if (!scoreCaptions.some((caption) => caption.key === scoreCaptionKey)) {
      setScoreCaptionKey(scoreCaptions[0]?.key || "");
    }
  }, [scoreCaptions, scoreCaptionKey]);

  const selectedScoreCaption =
    scoreCaptions.find((caption) => caption.key === scoreCaptionKey)?.label || "";

  const loadApartments = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("apartments")
      .select("id, code, block")
      .order("code", { ascending: true });

    const apartmentsList = (data as Apartment[]) || [];

    let studentRows: Array<{ apartment_id: string | null; room: string | null }> = [];
    let loadedFromApi = false;

    if (canManageCleanup) {
      try {
        const response = await authedFetch("/api/students/list");
        if (response.ok) {
          const result = await response.json();
          studentRows = (result.students || []).map((student: any) => ({
            apartment_id: student.apartment_id ?? null,
            room: student.room ?? null,
          }));
          loadedFromApi = true;
        }
      } catch (error) {
        console.error("Failed to load students list for apartments", error);
      }
    }

    if (!loadedFromApi) {
      if (students && students.length > 0) {
        studentRows = students.map((student) => ({
          apartment_id: student.apartment_id ?? null,
          room: student.room ?? null,
        }));
      } else {
        const { data } = await supabase
          .from("students")
          .select("apartment_id, room");
        studentRows = (data as Array<{ apartment_id: string | null; room: string | null }>) || [];
      }
    }

    const activeApartmentIds = new Set<string>();
    const activeRoomCodes = new Set<string>();

    (studentRows || []).forEach((student: any) => {
      if (student.apartment_id) {
        activeApartmentIds.add(student.apartment_id);
      }
      if (typeof student.room === "string" && student.room.trim()) {
        activeRoomCodes.add(student.room.trim().toUpperCase());
      }
    });

    const filtered = apartmentsList.filter((apt) => {
      const aptCode = apt.code?.toUpperCase() || "";
      return activeApartmentIds.has(apt.id) || (aptCode && activeRoomCodes.has(aptCode));
    });

    setApartments(filtered);
  };

  const loadResults = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("cleanup_results")
      .select(
        "id, week_start, block, announcement_text, announcement_mode, template_key, announced_by, published_at, winning_apartment_id, created_at"
      )
      .order("week_start", { ascending: false })
      .order("created_at", { ascending: false });

    const rows = (data as CleanupResult[]) || [];
    setResults(rows);

    const announcerIds = Array.from(
      new Set(rows.map((row) => row.announced_by).filter(Boolean))
    ) as string[];

    if (announcerIds.length > 0) {
      const { data: announcerRows } = await supabase
        .from("students")
        .select("id, full_name")
        .in("id", announcerIds);

      const announcerMap: Record<string, string> = {};
      (announcerRows || []).forEach((student: any) => {
        announcerMap[student.id] = student.full_name;
      });
      setAnnouncers(announcerMap);
    }
  };

  const loadSchedules = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("cleanup_schedules")
      .select("block, check_date, check_time, set_by, updated_at, reminder_sent_at");

    setSchedules((data as CleanupSchedule[]) || []);
  };

  const loadAdminBlock = async () => {
    if (!supabase || !user?.student_id || !canManageCleanup) return;

    const { data: adminStudent } = await supabase
      .from("students")
      .select("apartment_id, room")
      .eq("id", user.student_id)
      .maybeSingle();

    let block: "A" | "B" | null = null;

    if (adminStudent?.apartment_id) {
      const { data: adminApartment } = await supabase
        .from("apartments")
        .select("block")
        .eq("id", adminStudent.apartment_id)
        .maybeSingle();

      if (adminApartment?.block === "A" || adminApartment?.block === "B") {
        block = adminApartment.block;
      }
    }

    if (!block && adminStudent?.room) {
      const roomBlock = adminStudent.room.trim().charAt(0).toUpperCase();
      if (roomBlock === "A" || roomBlock === "B") {
        block = roomBlock;
      }
    }
    setAdminBlock(block);
    if (block) setSelectedBlock(block);
  };

  const loadCouponTtl = async () => {
    if (!supabase || !canManageCleanup) return;
    const { data } = await supabase
      .from("app_settings")
      .select("value_int")
      .eq("key", "cleanup_coupon_ttl_seconds")
      .maybeSingle();
    if (typeof data?.value_int === "number") {
      setCouponTtlSeconds(data.value_int);
    }
  };

  const loadCoupons = async () => {
    if (!supabase || !user?.student_id) return;
    const { data } = await supabase
      .from("coupons")
      .select(
        "id, owner_student_id, source_type, source_id, issued_by, issued_at, valid_from, expires_at, reserved_queue_id, reserved_at, used_in_queue_id, used_at, note"
      )
      .eq("owner_student_id", user.student_id)
      .order("issued_at", { ascending: false });

    setCoupons((data as Coupon[]) || []);
  };

  const loadTransfers = async () => {
    if (!supabase) return;
    let query = supabase
      .from("coupon_transfers")
      .select("id, coupon_id, from_student_id, to_student_id, performed_by, created_at, note");

    if (isAdmin || isSuperAdmin) {
      query = query.order("created_at", { ascending: false });
    } else if (user?.student_id) {
      query = query
        .or(`from_student_id.eq.${user.student_id},to_student_id.eq.${user.student_id}`)
        .order("created_at", { ascending: false });
    } else {
      setTransfers([]);
      return;
    }

    const { data } = await query;

    const rows = (data as CouponTransfer[]) || [];
    setTransfers(rows);

    const studentIds = Array.from(
      new Set(rows.flatMap((row) => [row.from_student_id, row.to_student_id]))
    );
    if (studentIds.length > 0) {
      const { data: studentRows } = await supabase
        .from("students")
        .select("id, full_name")
        .in("id", studentIds);

      const nameMap: Record<string, string> = {};
      (studentRows || []).forEach((student: any) => {
        nameMap[student.id] = student.full_name;
      });
      setTransferNames(nameMap);
    }
  };

  const loadRecipients = async () => {
    if (!supabase || !user?.student_id) return;
    const { data: currentStudent } = await supabase
      .from("students")
      .select("apartment_id, room")
      .eq("id", user.student_id)
      .maybeSingle();

    if (!currentStudent) {
      setRecipients([]);
      return;
    }

    const residentsMap = new Map<string, Student>();

    if (currentStudent.apartment_id) {
      const { data: rowsByApartment } = await supabase
        .from("students")
        .select("id, full_name, room, apartment_id")
        .eq("apartment_id", currentStudent.apartment_id)
        .neq("id", user.student_id);

      (rowsByApartment as Student[] || []).forEach((student) => {
        residentsMap.set(student.id, student);
      });
    }

    if (currentStudent.room) {
      const { data: rowsByRoom } = await supabase
        .from("students")
        .select("id, full_name, room, apartment_id")
        .eq("room", currentStudent.room)
        .neq("id", user.student_id);

      (rowsByRoom as Student[] || []).forEach((student) => {
        if (!residentsMap.has(student.id)) {
          residentsMap.set(student.id, student);
        }
      });
    }

    setRecipients(Array.from(residentsMap.values()));
  };

  const loadGrantStudents = async () => {
    if (!supabase || !isSuperAdmin) return;
    const { data } = await supabase
      .from("students")
      .select("id, full_name, room")
      .order("room", { ascending: true });
    setGrantStudents((data as Student[]) || []);
  };

  useEffect(() => {
    let isActive = true;
    const loadInitial = async () => {
      setIsLoading(true);
      try {
        await Promise.all([loadApartments(), loadResults(), loadSchedules()]);
      } finally {
        if (isActive) {
          setIsLoading(false);
          setHasLoadedOnce(true);
        }
      }
    };
    loadInitial();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!canManageCleanup || !supabase) return;
    if (!students || students.length === 0) return;
    loadApartments();
  }, [students?.length, canManageCleanup]);

  useEffect(() => {
    loadAdminBlock();
    loadCouponTtl();
  }, [user?.student_id, isAdmin, isSuperAdmin, isCleanupAdmin]);

  useEffect(() => {
    if (!user?.student_id) return;
    loadCoupons();
    loadRecipients();
  }, [user?.student_id]);

  useEffect(() => {
    loadTransfers();
  }, [user?.student_id, isAdmin, isSuperAdmin]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    loadGrantStudents();
  }, [isSuperAdmin]);

  useEffect(() => {
    if (apartments.length === 0) return;
    setScoreInputs((prev) => {
      const next = { ...prev };
      apartments.forEach((apt) => {
        if (!(apt.id in next)) {
          next[apt.id] = "";
        }
      });
      return next;
    });
  }, [apartments]);

  useEffect(() => {
    if (schedules.length === 0) return;
    const todayIso = new Date().toISOString().slice(0, 10);
    setScheduleDrafts((prev) => {
      const next = { ...prev };
      const autoAdvanceNotices: Record<string, string> = {};
      schedules.forEach((schedule) => {
        const savedDate = schedule.check_date || "";
        const shouldAutoAdvance = !!savedDate && savedDate < todayIso;
        const currentDraftDate = prev[schedule.block]?.date;

        if (shouldAutoAdvance && (!currentDraftDate || currentDraftDate === savedDate)) {
          autoAdvanceNotices[schedule.block] = t("cleanup.schedule.autoAdvanced");
        }

        next[schedule.block] = {
          date:
            shouldAutoAdvance && (!currentDraftDate || currentDraftDate === savedDate)
              ? getNextWednesdayISO()
              : schedule.check_date || prev[schedule.block]?.date || getNextWednesdayISO(),
          time: schedule.check_time
            ? formatTime(schedule.check_time)
            : prev[schedule.block]?.time || "19:00",
        };
      });

      if (Object.keys(autoAdvanceNotices).length > 0) {
        setScheduleNotice((prevNotice) => ({
          ...prevNotice,
          ...autoAdvanceNotices,
        }));
      }

      return next;
    });
  }, [schedules, t]);

  const refreshResults = async () => {
    await loadResults();
  };

  const refreshCoupons = async () => {
    await loadCoupons();
    await loadTransfers();
  };

  const handleScheduleSave = async (block: Block) => {
    if (!supabase) return;
    const draft = scheduleDrafts[block];
    if (!draft?.date) {
      setScheduleNotice((prev) => ({ ...prev, [block]: t("cleanup.schedule.missingDate") }));
      return;
    }

    try {
      setScheduleSaving((prev) => ({ ...prev, [block]: true }));
      setScheduleNotice((prev) => ({ ...prev, [block]: null }));
      const response = await authedFetch("/api/admin/cleanup/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          block,
          check_date: draft.date,
          check_time: draft.time || null,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        setScheduleNotice((prev) => ({
          ...prev,
          [block]: mapScheduleError(t, result.error),
        }));
        return;
      }

      setScheduleNotice((prev) => ({ ...prev, [block]: t("cleanup.schedule.saved") }));
      setReminderNotice((prev) => ({ ...prev, [block]: null }));
      setReminderRecipients((prev) => ({ ...prev, [block]: [] }));
      setReminderFailures((prev) => ({ ...prev, [block]: [] }));
      await loadSchedules();
    } catch (error: any) {
      setScheduleNotice((prev) => ({
        ...prev,
        [block]: mapScheduleError(t, error?.message),
      }));
    } finally {
      setScheduleSaving((prev) => ({ ...prev, [block]: false }));
    }
  };

  const handleSendReminder = async (block: Block) => {
    if (!supabase) return;
    const draft = scheduleDrafts[block];
    if (!draft?.date) {
      setReminderNotice((prev) => ({ ...prev, [block]: t("cleanup.schedule.missingDate") }));
      return;
    }

    try {
      setReminderSending((prev) => ({ ...prev, [block]: true }));
      setReminderNotice((prev) => ({ ...prev, [block]: null }));
      setReminderRecipients((prev) => ({ ...prev, [block]: [] }));
      setReminderFailures((prev) => ({ ...prev, [block]: [] }));
      const scheduleResponse = await authedFetch("/api/admin/cleanup/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          block,
          check_date: draft.date,
          check_time: draft.time || null,
        }),
      });

      const scheduleResult = await scheduleResponse.json();
      if (!scheduleResponse.ok) {
        setReminderNotice((prev) => ({
          ...prev,
          [block]: mapScheduleError(t, scheduleResult.error),
        }));
        return;
      }

      const response = await authedFetch("/api/admin/cleanup/reminders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ block }),
      });

      const result = await response.json();
      if (!response.ok) {
        setReminderNotice((prev) => ({
          ...prev,
          [block]: mapReminderError(t, result.error),
        }));
        return;
      }

      const sentList = Array.isArray(result?.sent_to) ? result.sent_to : [];
      const failedList = Array.isArray(result?.failed_to) ? result.failed_to : [];
      setReminderRecipients((prev) => ({ ...prev, [block]: sentList }));
      setReminderFailures((prev) => ({ ...prev, [block]: failedList }));

      if (sentList.length > 0) {
        setReminderNotice((prev) => ({
          ...prev,
          [block]: t("cleanup.reminders.sentCount", { count: sentList.length }),
        }));
      } else if (failedList.length > 0) {
        setReminderNotice((prev) => ({
          ...prev,
          [block]: t("cleanup.reminders.sendFailed"),
        }));
      } else {
        setReminderNotice((prev) => ({
          ...prev,
          [block]: t("cleanup.reminders.noRecipientsWithTelegram"),
        }));
      }

      await loadSchedules();
    } catch (error: any) {
      setReminderNotice((prev) => ({
        ...prev,
        [block]: mapReminderError(t, error?.message),
      }));
    } finally {
      setReminderSending((prev) => ({ ...prev, [block]: false }));
    }
  };

  const handleClearResults = async (block: Block) => {
    if (!supabase) return;
    if (!window.confirm(t("cleanup.results.clearConfirm", { block }))) return;

    try {
      setResultsClearing((prev) => ({ ...prev, [block]: true }));
      setResultsNotice((prev) => ({ ...prev, [block]: null }));
      const response = await authedFetch("/api/admin/cleanup/results/clear", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ block }),
      });

      const result = await response.json();
      if (!response.ok) {
        setResultsNotice((prev) => ({
          ...prev,
          [block]: mapResultsError(t, result.error),
        }));
        return;
      }

      setResultsNotice((prev) => ({
        ...prev,
        [block]: t("cleanup.results.deletedCount", { count: result.deleted || 0 }),
      }));
      await loadResults();
    } catch (error: any) {
      setResultsNotice((prev) => ({
        ...prev,
        [block]: mapResultsError(t, error?.message),
      }));
    } finally {
      setResultsClearing((prev) => ({ ...prev, [block]: false }));
    }
  };

  const handlePublish = async () => {
    if (!supabase || !announcementText || !selectedApartment || !weekStart) {
      setPublishNotice(t("errors.fillRequired"));
      return;
    }

    if (!canManageCleanup) return;

    try {
      setIsPublishing(true);
      setPublishNotice(null);
      const response = await authedFetch("/api/admin/cleanup/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          week_start: weekStart,
          block: selectedBlock,
          apartment_id: selectedApartment,
          announcement_text: announcementText,
          announcement_mode: announcementMode,
          template_key: null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(mapPublishError(t, result.error));
      }

      setPublishNotice(t("cleanup.publish.success"));
      await refreshResults();
      await refreshCoupons();
    } catch (error: any) {
      setPublishNotice(mapPublishError(t, error?.message));
    } finally {
      setIsPublishing(false);
    }
  };

  const handleRandomScoreCaption = () => {
    const random = scoreCaptions[Math.floor(Math.random() * scoreCaptions.length)];
    setScoreCaptionKey(random.key);
  };

  const handleBuildScoreAnnouncement = () => {
    if (!selectedApartment) {
      setPublishNotice(t("cleanup.publish.selectWinner"));
      return;
    }

    const scoreLines = apartmentsForBlock
      .map((apt) => {
        const rawValue = scoreInputs[apt.id];
        if (rawValue === undefined || rawValue === "") return null;
        const parsed = Number(rawValue);
        if (Number.isNaN(parsed)) return null;
        const pointsLabel =
          language === "ru"
            ? formatPoints(parsed)
            : t("cleanup.points", { count: parsed });
        return `${apt.code} — ${pointsLabel}`;
      })
      .filter(Boolean) as string[];

    if (scoreLines.length === 0) {
      setPublishNotice(t("cleanup.publish.enterPoints"));
      return;
    }

    const winnerCode = apartmentMap[selectedApartment]?.code || "—";
    const lines = [
      t("cleanup.announcement.summaryTitle"),
      "",
      ...scoreLines,
      "",
      t("cleanup.announcement.winnerLine", { winner: winnerCode }),
    ];

    if (selectedScoreCaption) {
      lines.push(selectedScoreCaption);
    }

    setAnnouncementText(lines.join("\n"));
    setAnnouncementMode("scores");
    setPublishNotice(null);
  };

  const renderScheduleEditor = (block: Block) => {
    const draft = scheduleDrafts[block];
    const current = schedulesByBlock[block];
    const currentLabel = current
      ? `${formatScheduleLabel(current.check_date, locale)}${current.check_time ? `, ${formatTime(current.check_time)}` : ""}`
      : t("cleanup.schedule.notAssigned");
    const statusClass = current
      ? "border border-amber-200 bg-amber-50 text-amber-800"
      : "border border-slate-200 bg-slate-100 text-slate-600";
    const lastSentLabel = current?.reminder_sent_at
      ? formatDateTime(current.reminder_sent_at, locale)
      : t("cleanup.reminders.notSent");

    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-gray-900">{t("cleanup.block", { block })}</h4>
          <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${statusClass}`}>
            {t("cleanup.schedule.status", { current: currentLabel, lastSent: lastSentLabel })}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">{t("cleanup.schedule.date")}</label>
            <input
              type="date"
              value={draft?.date || ""}
              onChange={(e) =>
                setScheduleDrafts((prev) => ({
                  ...prev,
                  [block]: { ...prev[block], date: e.target.value },
                }))
              }
              className="w-full rounded-lg border-2 border-slate-200 bg-white p-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">{t("cleanup.schedule.time")}</label>
            <input
              type="time"
              value={draft?.time || ""}
              onChange={(e) =>
                setScheduleDrafts((prev) => ({
                  ...prev,
                  [block]: { ...prev[block], time: e.target.value },
                }))
              }
              className="w-full rounded-lg border-2 border-slate-200 bg-white p-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100"
            />
          </div>
          <div className="flex flex-col gap-2 md:col-span-2 md:flex-row md:items-end">
            <button
              type="button"
              onClick={() => handleScheduleSave(block)}
              disabled={!!scheduleSaving[block]}
              className="w-full btn btn-primary btn-glow md:w-auto"
            >
              {scheduleSaving[block] ? t("common.saving") : t("common.save")}
            </button>
            <button
              type="button"
              onClick={() => handleSendReminder(block)}
              disabled={!!reminderSending[block]}
              className="w-full btn btn-secondary md:w-auto"
            >
              {reminderSending[block] ? t("cleanup.reminders.sending") : t("cleanup.reminders.send")}
            </button>
          </div>
        </div>
        {scheduleNotice[block] && (
          <p className="text-xs text-blue-600">{scheduleNotice[block]}</p>
        )}
        {reminderNotice[block] && (
          <p className="text-xs text-emerald-600">{reminderNotice[block]}</p>
        )}
        {reminderRecipients[block].length > 0 && (
          <p className="text-xs text-emerald-700">
            {t("cleanup.reminders.recipients", { recipients: reminderRecipients[block].map(formatRecipientLabel).join(", ") })}
          </p>
        )}
        {reminderFailures[block].length > 0 && (
          <p className="text-xs text-rose-600">
            {t("cleanup.reminders.notDelivered", {
              recipients: reminderFailures[block].map(formatRecipientLabel).join(", "),
            })}
          </p>
        )}
      </div>
    );
  };

  const handleTransfer = async () => {
    if (!supabase || !transferCouponId || !transferRecipientId) {
      setTransferNotice(t("cleanup.transfer.missingSelection"));
      return;
    }

    try {
      setTransferNotice(null);
      const { error } = await supabase.rpc("transfer_coupon", {
        p_coupon_id: transferCouponId,
        p_to_student_id: transferRecipientId,
      });

      if (error) {
        throw new Error(mapTransferError(t, error.message));
      }

      setTransferCouponId("");
      setTransferRecipientId("");
      setTransferNotice(t("cleanup.transfer.success"));
      await refreshCoupons();
    } catch (error: any) {
      setTransferNotice(mapTransferError(t, error?.message));
    }
  };

  const handleClearTransfers = async () => {
    if (!supabase) return;
    if (!window.confirm(t("cleanup.transfers.clearConfirm"))) return;

    try {
      setTransferClearing(true);
      setTransferHistoryNotice(null);
      const response = await authedFetch("/api/admin/coupons/transfers/clear", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();
      if (!response.ok) {
        setTransferHistoryNotice(result.error || t("cleanup.transfers.clearError"));
        return;
      }

      setTransfers([]);
      setTransferNames({});
      setTransferHistoryNotice(t("cleanup.transfers.cleared"));
    } catch (error: any) {
      setTransferHistoryNotice(error?.message || t("cleanup.transfers.clearError"));
    } finally {
      setTransferClearing(false);
    }
  };

  const handleClearMyCoupons = async () => {
    if (!supabase || !isSuperAdmin) return;
    if (!window.confirm(t("cleanup.coupons.clearConfirm"))) return;

    try {
      setClearMyLoading(true);
      setClearMyNotice(null);

      const response = await authedFetch("/api/admin/coupons/clear-own", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();
      if (!response.ok) {
        setClearMyNotice(result.error || t("cleanup.coupons.clearError"));
        return;
      }

      setClearMyNotice(
        t("cleanup.coupons.clearSuccess", { count: result.cleared ?? 0 })
      );
      await refreshCoupons();
    } catch (error: any) {
      setClearMyNotice(error?.message || t("cleanup.coupons.clearError"));
    } finally {
      setClearMyLoading(false);
    }
  };

  const handleClearStudentCoupons = async () => {
    if (!supabase || !isSuperAdmin) return;
    if (!grantStudentId) {
      setClearStudentNotice(t("cleanup.grant.selectStudent"));
      return;
    }
    if (!window.confirm(t("cleanup.coupons.clearStudentConfirm"))) return;

    try {
      setClearStudentLoading(true);
      setClearStudentNotice(null);

      const response = await authedFetch("/api/admin/coupons/clear-student", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ student_id: grantStudentId }),
      });

      const result = await response.json();
      if (!response.ok) {
        setClearStudentNotice(
          result.error || t("cleanup.coupons.clearStudentError")
        );
        return;
      }

      setClearStudentNotice(
        t("cleanup.coupons.clearStudentSuccess", { count: result.cleared ?? 0 })
      );

      if (user?.student_id === grantStudentId) {
        await refreshCoupons();
      }
    } catch (error: any) {
      setClearStudentNotice(
        error?.message || t("cleanup.coupons.clearStudentError")
      );
    } finally {
      setClearStudentLoading(false);
    }
  };

  const handleGrant = async () => {
    if (!supabase || !grantStudentId) {
      setGrantNotice(t("cleanup.grant.selectStudent"));
      return;
    }
    if (grantExpiryMode === "custom" && !grantExpiresAt) {
      setGrantNotice(t("cleanup.grant.enterExpiry"));
      return;
    }

    try {
      const expiresAtPayload =
        grantExpiryMode === "custom" ? new Date(grantExpiresAt).toISOString() : null;

      const response = await authedFetch("/api/admin/coupons/grant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_id: grantStudentId,
          count: grantCount,
          note: grantNote,
          expiry_mode: grantExpiryMode,
          expires_at: expiresAtPayload,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(mapGrantError(t, result.error));
      }

      setGrantNotice(t("cleanup.grant.success"));
      setGrantCount(1);
      setGrantNote("");
      setGrantExpiryMode("default");
      setGrantExpiresAt("");
      await refreshCoupons();
    } catch (error: any) {
      setGrantNotice(mapGrantError(t, error?.message));
    }
  };

  const renderResultCard = (item: CleanupResult) => {
    const apartment = apartmentMap[item.winning_apartment_id];
    const announcer = item.announced_by ? announcers[item.announced_by] : null;

    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-slate-100">
              {t("cleanup.resultCard.checkFrom", {
                date: formatWeekLabel(item.week_start, locale),
              })}
            </h4>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              {t("cleanup.resultCard.publishedAt", {
                date: formatDateTime(item.published_at, locale),
              })}
            </p>
          </div>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-slate-900/40 dark:text-blue-200">
            {apartment?.code || t("cleanup.resultCard.apartmentFallback")}
          </span>
        </div>
        <p className="text-sm text-gray-700 whitespace-pre-line dark:text-slate-200">{item.announcement_text}</p>
        {announcer && (
          <p className="mt-3 text-xs text-gray-500 dark:text-slate-400">
            {t("cleanup.resultCard.announcedBy", { name: announcer })}
          </p>
        )}
      </div>
    );
  };

  const renderBlockSection = (block: Block) => {
    const blockResults = resultsByBlock[block];
    const latest = blockResults[0];
    const schedule = schedulesByBlock[block];
    const scheduleText = schedule
      ? `${formatScheduleLabel(schedule.check_date, locale)}${schedule.check_time ? `, ${formatTime(schedule.check_time)}` : ""}`
      : t("cleanup.schedule.notAssignedFull");
    const scheduleClass = schedule
      ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-slate-900/40 dark:text-amber-200"
      : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300";
    const scheduleIconClass = schedule ? "text-amber-600 dark:text-amber-300" : "text-gray-400 dark:text-slate-400";

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-slate-900 text-white flex items-center justify-center">
              <PeopleIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {t("cleanup.block", { block })}
              </h3>
              <p className="text-xs text-gray-500">{t("cleanup.blockSubtitle")}</p>
              <div className={`mt-2 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-base font-semibold ${scheduleClass}`}>
                <CalendarIcon className={`h-4 w-4 ${scheduleIconClass}`} />
                <span>{t("cleanup.check.label", { date: scheduleText })}</span>
              </div>
            </div>
          </div>
          {isSuperAdmin && (
            <div className="flex flex-col items-end gap-2">
              <button
                type="button"
                onClick={() => handleClearResults(block)}
                disabled={!!resultsClearing[block]}
                className="btn btn-danger px-3 py-2 text-xs"
              >
                {resultsClearing[block] ? t("cleanup.results.clearing") : t("cleanup.results.clear")}
              </button>
              {resultsNotice[block] && (
                <span className="text-xs text-slate-600">{resultsNotice[block]}</span>
              )}
            </div>
          )}
        </div>

        {latest ? (
          renderResultCard(latest)
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
            {t("cleanup.empty")}
          </div>
        )}

        {blockResults.length > 1 && (
          <details className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <summary className="cursor-pointer text-sm font-semibold text-gray-700 dark:text-slate-200">
              {t("cleanup.archiveResults", { count: blockResults.length - 1 })}
            </summary>
            <div className="mt-3 space-y-3">
              {blockResults.slice(1).map(renderResultCard)}
            </div>
          </details>
        )}
      </div>
    );
  };

  const transferableCoupons = coupons.filter((coupon) => {
    const isExpired = new Date(coupon.expires_at).getTime() <= Date.now();
    const isUsed = !!coupon.used_at || !!coupon.used_in_queue_id;
    return !isUsed && !coupon.reserved_queue_id && !isExpired;
  });

  const couponStats = coupons.reduce(
    (acc, coupon) => {
      const isExpired = new Date(coupon.expires_at).getTime() <= Date.now();
      const isUsed = !!coupon.used_at || !!coupon.used_in_queue_id;
      if (isUsed) {
        acc.used += 1;
      } else if (isExpired) {
        acc.expired += 1;
      } else if (coupon.reserved_queue_id) {
        acc.reserved += 1;
      } else {
        acc.active += 1;
      }
      return acc;
    },
    { active: 0, reserved: 0, used: 0, expired: 0 }
  );

  const visibleCoupons = showAllCoupons
    ? coupons
    : coupons.filter((coupon) => {
        const isExpired = new Date(coupon.expires_at).getTime() <= Date.now();
        const isUsed = !!coupon.used_at || !!coupon.used_in_queue_id;
        return !isExpired && !isUsed;
      });

  const scheduleBlocks = (isSuperAdmin
    ? ["A", "B"]
    : adminBlock
      ? [adminBlock]
      : []) as Block[];

  const showTransfers = !!user && (isAdmin || isSuperAdmin || transfers.length > 0);
  const showLoading = !hasLoadedOnce || (isLoading && results.length === 0 && schedules.length === 0 && apartments.length === 0);

  return (
    <div className={embedded ? "w-full" : "min-h-screen bg-slate-50 dark:bg-slate-950"}>
      {!embedded && (
        <header className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 shadow-lg">
          <div className="mx-auto max-w-5xl flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">{t("cleanup.title")}</h1>
              <p className="text-sm text-blue-100">{t("cleanup.subtitle")}</p>
            </div>
            <Link href="/" className="text-sm text-blue-100 underline">
              {t("cleanup.toHome")}
            </Link>
          </div>
        </header>
      )}

      {showLoading ? (
        <div className="mx-auto max-w-5xl space-y-4 p-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse dark:border-slate-700 dark:bg-slate-800">
            <div className="h-5 w-40 rounded bg-gray-200 dark:bg-slate-700" />
            <div className="mt-3 h-4 w-64 rounded bg-gray-200 dark:bg-slate-700" />
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="h-20 rounded bg-slate-100 dark:bg-slate-700" />
              <div className="h-20 rounded bg-slate-100 dark:bg-slate-700" />
            </div>
          </div>
          <p className="text-sm text-gray-500">{t("common.loading")}</p>
        </div>
      ) : (
        <div className="mx-auto max-w-5xl space-y-6 p-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {renderBlockSection("A")}
            {renderBlockSection("B")}
          </div>

          {canManageCleanup && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-bold text-gray-900">{t("cleanup.publish.title")}</h3>
            </div>

            {couponTtlSeconds !== null && (
              <p className="text-xs text-gray-500">
                {t("cleanup.ttl.label", { ttl: formatTtlLabel(couponTtlSeconds, t) })}
              </p>
            )}

            {!isSuperAdmin && !adminBlock && (
              <p className="text-sm text-red-600">
                {t("cleanup.publish.blockRequired")}
              </p>
            )}

            {scheduleBlocks.length > 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 space-y-3 dark:border-slate-700 dark:bg-slate-900/40">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-blue-600" />
                  <h4 className="text-sm font-semibold text-gray-900">{t("cleanup.schedule.sectionTitle")}</h4>
                </div>
                <div className="space-y-3">
                  {scheduleBlocks.map((block) => (
                    <div key={block}>{renderScheduleEditor(block)}</div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t("cleanup.publish.weekStart")}</label>
                <input
                  type="date"
                  value={weekStart}
                  onChange={(e) => setWeekStart(e.target.value)}
                  className="w-full rounded-lg border-2 border-slate-200 bg-white p-2 text-gray-900 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t("cleanup.publish.block")}</label>
                <select
                  value={selectedBlock}
                  onChange={(e) => setSelectedBlock(e.target.value as Block)}
                  disabled={!isSuperAdmin && !!adminBlock}
                  className="w-full rounded-lg border-2 border-slate-200 bg-white p-2 text-gray-900 disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100 dark:disabled:bg-slate-800"
                >
                  <option value="A">{t("cleanup.blockOption", { block: "A" })}</option>
                  <option value="B">{t("cleanup.blockOption", { block: "B" })}</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t("cleanup.publish.winnerApartment")}</label>
                <select
                  value={selectedApartment}
                  onChange={(e) => setSelectedApartment(e.target.value)}
                  className="w-full rounded-lg border-2 border-slate-200 bg-white p-2 text-gray-900 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100"
                >
                  <option value="">{t("cleanup.selectApartment")}</option>
                  {apartments
                    .filter((apt) => !apt.block || apt.block === selectedBlock)
                    .map((apt) => (
                      <option key={apt.id} value={apt.id}>
                        {apt.code}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-slate-200 p-4 space-y-3 dark:border-slate-700 dark:bg-slate-900/40">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-gray-700">{t("cleanup.pointsByApartment")}</h4>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {apartmentsForBlock.map((apt) => (
                  <div key={apt.id} className="flex items-center gap-2">
                    <span className="w-16 text-sm font-semibold text-gray-700">{apt.code}</span>
                    <input
                      type="number"
                      min={0}
                      value={scoreInputs[apt.id] ?? ""}
                      onChange={(e) =>
                        setScoreInputs((prev) => ({
                          ...prev,
                          [apt.id]: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border-2 border-slate-200 bg-white p-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100"
                      placeholder={t("cleanup.pointsPlaceholder")}
                    />
                    <span className="text-xs text-gray-400">{t("cleanup.pointsSuffix")}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={scoreCaptionKey}
                  onChange={(e) => setScoreCaptionKey(e.target.value)}
                  className="w-full rounded-lg border-2 border-slate-200 bg-white p-2 text-sm text-gray-900 md:w-auto dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100"
                >
                  {scoreCaptions.map((caption) => (
                    <option key={caption.key} value={caption.key}>
                      {caption.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleRandomScoreCaption}
                  className="btn btn-secondary px-3 py-2 text-xs"
                >
                  {t("cleanup.caption.random")}
                </button>
                <button
                  type="button"
                  onClick={handleBuildScoreAnnouncement}
                  className="btn btn-primary px-3 py-2 text-xs"
                >
                  {t("cleanup.buildMessage")}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                {t("cleanup.winnerHint")}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t("cleanup.message")}</label>
              <textarea
                value={announcementText}
                onChange={(e) => {
                  setAnnouncementText(e.target.value);
                  setAnnouncementMode("manual");
                }}
                rows={4}
                className="w-full rounded-lg border-2 border-slate-200 bg-white p-3 text-gray-900 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100"
                placeholder={t("cleanup.messagePlaceholder")}
              />
            </div>

            {publishNotice && (
              <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {publishNotice}
              </div>
            )}

            <button
              type="button"
              onClick={handlePublish}
              disabled={isPublishing || (!isSuperAdmin && !adminBlock)}
              className="w-full btn btn-primary btn-glow"
            >
              {isPublishing ? t("cleanup.publish.publishing") : t("cleanup.publish.publish")}
            </button>
          </div>
        )}

        {user && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center gap-2">
                <TicketIcon className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-bold text-gray-900">{t("cleanup.coupons.title")}</h3>
              </div>

              {coupons.length === 0 ? (
                <p className="text-sm text-gray-500">{t("cleanup.coupons.empty")}</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700">
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
                      {t("cleanup.coupons.stats.active", { count: couponStats.active })}
                    </span>
                    <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">
                      {t("cleanup.coupons.stats.reserved", { count: couponStats.reserved })}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                      {t("cleanup.coupons.stats.used", { count: couponStats.used })}
                    </span>
                    <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">
                      {t("cleanup.coupons.stats.expired", { count: couponStats.expired })}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAllCoupons((prev) => !prev)}
                      className="btn btn-ghost px-3 py-1 text-xs"
                    >
                      {showAllCoupons
                        ? t("cleanup.coupons.hideInactive")
                        : t("cleanup.coupons.showAll")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCouponList((prev) => !prev)}
                      className="btn btn-ghost px-3 py-1 text-xs"
                    >
                      {showCouponList
                        ? t("cleanup.coupons.collapseList")
                        : t("cleanup.coupons.showList", { count: visibleCoupons.length })}
                    </button>
                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={handleClearMyCoupons}
                        disabled={clearMyLoading}
                        className="btn btn-danger px-3 py-1 text-xs inline-flex items-center gap-2"
                      >
                        {clearMyLoading ? (
                          <>
                            <WashingSpinner className="w-4 h-4" />
                            <span>{t("common.loading")}</span>
                          </>
                        ) : (
                          t("cleanup.coupons.clearMine")
                        )}
                      </button>
                    )}
                  </div>
                  {clearMyNotice && (
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {clearMyNotice}
                    </p>
                  )}

                  {showCouponList && (
                    visibleCoupons.length === 0 ? (
                      <p className="text-sm text-gray-500">{t("cleanup.coupons.noneToShow")}</p>
                    ) : (
                      <div className="space-y-2">
                        {visibleCoupons.map((coupon) => {
                          const isExpired = new Date(coupon.expires_at).getTime() <= Date.now();
                          const isUsed = !!coupon.used_at || !!coupon.used_in_queue_id;
                          const status = isUsed
                            ? t("cleanup.coupons.status.used")
                            : coupon.reserved_queue_id
                              ? t("cleanup.coupons.status.reserved")
                              : isExpired
                                ? t("cleanup.coupons.status.expired")
                                : t("cleanup.coupons.status.active");

                          return (
                            <div
                              key={coupon.id}
                              className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-gray-700 dark:border-slate-700 dark:bg-slate-900/40"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold">{status}</span>
                                <span className="text-xs text-gray-500">
                                  {formatCouponExpiry(coupon, locale, t)}
                                </span>
                              </div>
                              {coupon.note && (
                                <p className="text-xs text-gray-500 mt-1">{coupon.note}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center gap-2">
                <MoneyIcon className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-bold text-gray-900">{t("cleanup.transfer.title")}</h3>
              </div>

              {recipients.length === 0 ? (
                <p className="text-sm text-gray-500">{t("cleanup.transfer.noRecipients")}</p>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">{t("cleanup.transfer.coupon")}</label>
                    <select
                      value={transferCouponId}
                      onChange={(e) => setTransferCouponId(e.target.value)}
                      className="w-full rounded-lg border-2 border-slate-200 bg-white p-2 text-gray-900 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100"
                    >
                      <option value="">{t("cleanup.transfer.selectCoupon")}</option>
                      {transferableCoupons.map((coupon) => (
                        <option key={coupon.id} value={coupon.id}>
                          {formatCouponOptionLabel(coupon, locale, t)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">{t("cleanup.transfer.to")}</label>
                    <select
                      value={transferRecipientId}
                      onChange={(e) => setTransferRecipientId(e.target.value)}
                      className="w-full rounded-lg border-2 border-slate-200 bg-white p-2 text-gray-900 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100"
                    >
                      <option value="">{t("cleanup.transfer.selectStudent")}</option>
                      {recipients.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.full_name} {student.room ? `(${student.room})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {transferNotice && (
                    <p className="text-sm text-blue-600">{transferNotice}</p>
                  )}

                  <button
                    type="button"
                    onClick={handleTransfer}
                    className="w-full btn btn-primary"
                  >
                    {t("cleanup.transfer.send")}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {showTransfers && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckIcon className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-gray-900">{t("cleanup.transfers.title")}</h3>
              </div>
              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={handleClearTransfers}
                  disabled={transferClearing}
                  className="btn btn-danger px-3 py-1 text-xs"
                >
                  {transferClearing
                    ? t("cleanup.transfers.clearing")
                    : t("cleanup.transfers.clear")}
                </button>
              )}
            </div>
            {transferHistoryNotice && (
              <p className="text-xs text-slate-600">{transferHistoryNotice}</p>
            )}
            {transfers.length === 0 ? (
              <p className="text-sm text-gray-500">{t("cleanup.transfers.empty")}</p>
            ) : (
              <div className="space-y-2 text-sm text-gray-700">
                {transfers.map((transfer) => (
                  <div key={transfer.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900/40">
                    <span>
                      {transferNames[transfer.from_student_id] || t("cleanup.transfers.someone")}
                      {" -> "}
                      {transferNames[transfer.to_student_id] || t("cleanup.transfers.someone")}
                    </span>
                    <span className="text-xs text-gray-500">{formatDateTime(transfer.created_at, locale)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {isSuperAdmin && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center gap-2">
              <TicketIcon className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-bold text-gray-900">{t("cleanup.grant.title")}</h3>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t("cleanup.grant.student")}</label>
                <select
                  value={grantStudentId}
                  onChange={(e) => setGrantStudentId(e.target.value)}
                  className="w-full rounded-lg border-2 border-slate-200 bg-white p-2 text-gray-900 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100"
                >
                  <option value="">{t("cleanup.grant.selectStudentOption")}</option>
                  {grantStudents.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.full_name} {student.room ? `(${student.room})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t("cleanup.grant.count")}</label>
                <input
                  type="number"
                  min={1}
                  value={grantCount}
                  onChange={(e) => setGrantCount(Number(e.target.value))}
                  className="w-full rounded-lg border-2 border-slate-200 bg-white p-2 text-gray-900 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t("cleanup.grant.expiry")}</label>
                <select
                  value={grantExpiryMode}
                  onChange={(e) => {
                    const mode = e.target.value as "default" | "custom" | "permanent";
                    setGrantExpiryMode(mode);
                    if (mode !== "custom") {
                      setGrantExpiresAt("");
                    }
                  }}
                  className="w-full rounded-lg border-2 border-slate-200 bg-white p-2 text-gray-900 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100"
                >
                  <option value="default">{t("cleanup.grant.expiryDefault")}</option>
                  <option value="custom">{t("cleanup.grant.expiryCustom")}</option>
                  <option value="permanent">{t("cleanup.grant.expiryPermanent")}</option>
                </select>
              </div>
              {grantExpiryMode === "custom" && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t("cleanup.grant.validUntil")}</label>
                  <input
                    type="datetime-local"
                    value={grantExpiresAt}
                    onChange={(e) => setGrantExpiresAt(e.target.value)}
                    className="w-full rounded-lg border-2 border-slate-200 bg-white p-2 text-gray-900 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100"
                  />
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t("cleanup.grant.note")}</label>
              <input
                type="text"
                value={grantNote}
                onChange={(e) => setGrantNote(e.target.value)}
                className="w-full rounded-lg border-2 border-slate-200 bg-white p-2 text-gray-900 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100"
                placeholder={t("cleanup.grant.notePlaceholder")}
              />
            </div>
            {grantNotice && (
              <p className="text-sm text-blue-600">{grantNotice}</p>
            )}
            <button
              type="button"
              onClick={handleGrant}
              className="w-full btn btn-primary"
            >
              {t("cleanup.grant.submit")}
            </button>
            <button
              type="button"
              onClick={handleClearStudentCoupons}
              disabled={clearStudentLoading || !grantStudentId}
              className="w-full btn btn-danger inline-flex items-center justify-center gap-2"
            >
              {clearStudentLoading ? (
                <>
                  <WashingSpinner className="w-4 h-4" />
                  <span>{t("common.loading")}</span>
                </>
              ) : (
                t("cleanup.coupons.clearStudent")
              )}
            </button>
            {clearStudentNotice && (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {clearStudentNotice}
              </p>
            )}
          </div>
        )}
      </div>
      )}
    </div>
  );
}





