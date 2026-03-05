"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  { key: "neutral-01", label: "В этот раз по квартирам разброс: где-то очень чисто, где-то не дотянули." },
  { key: "neutral-02", label: "Спасибо тем, кто убрался на совесть - это сразу видно." },
  { key: "neutral-03", label: "Есть квартиры, где порядок держат стабильно, и это радует." },
  { key: "neutral-04", label: "Часть квартир убирается регулярно, часть пока пропускает." },
  { key: "neutral-05", label: "У кого-то результат заметно лучше, у кого-то есть что подтянуть." },
  { key: "neutral-06", label: "По баллам видно, кто подошел к уборке ответственно." },
  { key: "neutral-07", label: "Где убираются каждую неделю, там и результат выше." },
  { key: "neutral-08", label: "Есть хорошие примеры, на которые можно равняться." },
  { key: "neutral-09", label: "В некоторых квартирах порядок отличный, в некоторых пока слабее." },
  { key: "neutral-10", label: "Кто-то прибрался тщательно, кто-то сделал минимум." },
  { key: "neutral-11", label: "Спасибо тем, кто не откладывает уборку и делает все вовремя." },
  { key: "neutral-12", label: "Есть квартиры, где реально постарались - это заметно сразу." },
  { key: "neutral-13", label: "Часть участников держит темп, часть пока выпадает." },
  { key: "neutral-14", label: "У одних чисто и аккуратно, у других еще есть недочеты." },
  { key: "neutral-15", label: "По итогам видно: не все включаются в уборку одинаково." },
  { key: "neutral-16", label: "Там, где убирались регулярно, баллы закономерно выше." },
  { key: "neutral-17", label: "Кто-то держит высокий уровень чистоты, кто-то пока отстает." },
  { key: "neutral-18", label: "Есть квартиры, где порядок поддерживают постоянно." },
  { key: "neutral-19", label: "У некоторых все сделано аккуратно, у некоторых - на скорую руку." },
  { key: "neutral-20", label: "Разница между квартирами есть, но ее можно выровнять." },
  { key: "neutral-21", label: "Тем, кто старается каждую неделю, отдельное спасибо." },
  { key: "neutral-22", label: "Тем, кто пропускает уборку, стоит подключиться активнее." },
  { key: "neutral-23", label: "В целом видно, что часть команд работает стабильно, часть - нет." },
  { key: "neutral-24", label: "Кто убирается системно, тот стабильно выше по баллам." },
  { key: "neutral-25", label: "Есть квартиры, где порядок держат без напоминаний - так и нужно." },
  { key: "neutral-26", label: "Если сегодня результат ниже, это можно исправить уже на следующей неделе." },
  { key: "neutral-27", label: "Кто-то делает уборку качественно, кто-то пока формально." },
  { key: "neutral-28", label: "По проверке видно: где вложились, там и чистота на уровне." },
  { key: "neutral-29", label: "Лидеры по чистоте молодцы, остальным стоит добавить внимания к деталям." },
  { key: "neutral-30", label: "Итог недели простой: кто убирается, у того видно результат." },
  { key: "neutral-31", label: "Пыль пыталась закрепиться, но в некоторых квартирах ей не дали шанса." },
  { key: "neutral-32", label: "Где-то пол блестит так, что можно проверить прическу." },
  { key: "neutral-33", label: "В части квартир порядок как на параде, в части - как после квеста." },
  { key: "neutral-34", label: "Некоторые команды устроили генеральную, а некоторые - демо-версию." },
  { key: "neutral-35", label: "Есть комнаты, где чисто настолько, что даже микроволновка довольна." },
  { key: "neutral-36", label: "Где-то уборка на 10 из 10, а где-то веник явно был в отпуске." },
  { key: "neutral-37", label: "Похоже, у части квартир включен режим \"турбо-чистота\"." },
  { key: "neutral-38", label: "В некоторых местах пыли объявили строгий бан без права возврата." },
  { key: "neutral-39", label: "Есть квартиры, где носки на полу больше не качают права." },
  { key: "neutral-40", label: "Итог: у одних чистота как в рекламе, у других - отличный шанс на реванш." },
];
const SCORE_CAPTIONS_EN = [
  { key: "neutral-01", label: "This week the apartments are mixed: some are very clean, some need work." },
  { key: "neutral-02", label: "Thanks to everyone who cleaned properly - it really shows." },
  { key: "neutral-03", label: "Some apartments keep things tidy every week, and that is great." },
  { key: "neutral-04", label: "Some teams clean regularly, others still skip." },
  { key: "neutral-05", label: "Some results improved a lot, some still need attention." },
  { key: "neutral-06", label: "The points clearly show who cleaned with care." },
  { key: "neutral-07", label: "Where cleaning is done every week, the scores are higher." },
  { key: "neutral-08", label: "There are good examples this week that others can follow." },
  { key: "neutral-09", label: "Some apartments are in great shape, some are still behind." },
  { key: "neutral-10", label: "Some cleaned thoroughly, some only did the minimum." },
  { key: "neutral-11", label: "Thanks to those who do not postpone cleanup and finish it on time." },
  { key: "neutral-12", label: "You can immediately see where people truly put in effort." },
  { key: "neutral-13", label: "Some teams keep the pace, others are falling out." },
  { key: "neutral-14", label: "Some apartments are neat and organized, others still have issues." },
  { key: "neutral-15", label: "The results show that participation is still uneven." },
  { key: "neutral-16", label: "Regular cleanup leads to consistently better scores." },
  { key: "neutral-17", label: "Some keep a high standard of cleanliness, some are still catching up." },
  { key: "neutral-18", label: "There are apartments that maintain order steadily every week." },
  { key: "neutral-19", label: "In some places everything is tidy, in others it looks rushed." },
  { key: "neutral-20", label: "There is a visible gap between apartments, but it can be closed." },
  { key: "neutral-21", label: "Special thanks to those who put in steady effort every week." },
  { key: "neutral-22", label: "If you skipped cleanup this week, please rejoin next week." },
  { key: "neutral-23", label: "Overall, part of the teams are consistent, part are not yet." },
  { key: "neutral-24", label: "Those who clean systematically are consistently higher in points." },
  { key: "neutral-25", label: "Some apartments keep order without reminders - that is the right approach." },
  { key: "neutral-26", label: "If the score is lower today, it can be fixed next week." },
  { key: "neutral-27", label: "Some teams clean with quality, some are still formal about it." },
  { key: "neutral-28", label: "Inspection results are clear: effort translates into cleanliness." },
  { key: "neutral-29", label: "Great job to the top apartments; others should focus more on details." },
  { key: "neutral-30", label: "Simple weekly takeaway: if you clean, the result is visible." },
  { key: "neutral-31", label: "Dust tried to settle in, but some apartments did not give it a chance." },
  { key: "neutral-32", label: "Some floors shine enough to check your hairstyle." },
  { key: "neutral-33", label: "Some apartments look parade-ready, others look post-quest." },
  { key: "neutral-34", label: "Some teams did a full deep clean, others ran a demo version." },
  { key: "neutral-35", label: "In some rooms it is so clean even the microwave looks proud." },
  { key: "neutral-36", label: "In some places it was a 10 out of 10 cleanup; elsewhere the broom took a day off." },
  { key: "neutral-37", label: "Looks like some apartments switched to turbo-clean mode." },
  { key: "neutral-38", label: "In a few places, dust got permanently banned." },
  { key: "neutral-39", label: "Some apartments finally convinced the socks to leave the floor." },
  { key: "neutral-40", label: "Bottom line: some homes look ad-ready, others have a great comeback opportunity." },
];

const SCORE_CAPTIONS_KY = [
  { key: "neutral-01", label: "Бул жумада квартиралардын абалы ар башка: айрым жерде абдан таза, айрым жерде жетишпеди." },
  { key: "neutral-02", label: "Тазалоону жоопкерчилик менен кылгандарга рахмат - бул дароо көрүнөт." },
  { key: "neutral-03", label: "Кээ бир квартиралар тартипти жума сайын туруктуу кармайт." },
  { key: "neutral-04", label: "Айрымдар дайыма тазалайт, айрымдар дагы эле өткөрүп жиберет." },
  { key: "neutral-05", label: "Бирөөлөрдүн жыйынтыгы жакшыраак, башкаларга дагы аракет керек." },
  { key: "neutral-06", label: "Упайлар ким кылдат тазалаганын так көрсөтүп турат." },
  { key: "neutral-07", label: "Жума сайын тазаланган жерде упай дайыма жогору." },
  { key: "neutral-08", label: "Бул жумада башкаларга үлгү боло турган жакшы мисалдар бар." },
  { key: "neutral-09", label: "Айрым квартираларда абал жакшы, айрымдарда азырынча алсыз." },
  { key: "neutral-10", label: "Кимдир бирөө жакшылап тазалады, кимдир бирөө минималдуу гана кылды." },
  { key: "neutral-11", label: "Тазалоону кийинкиге калтырбай, убагында бүтүргөндөргө рахмат." },
  { key: "neutral-12", label: "Кайсы жерде чындап аракет кылышканын дароо байкаса болот." },
  { key: "neutral-13", label: "Кээ бир командалар темпти кармап жатат, кээ бирлери артта калып жатат." },
  { key: "neutral-14", label: "Айрым квартираларда таза жана тыкан, айрымдарында кемчиликтер бар." },
  { key: "neutral-15", label: "Жыйынтык катышуу деңгээли дагы эле ар башка экенин көрсөттү." },
  { key: "neutral-16", label: "Туруктуу тазалоо дайыма жакшы упай алып келет." },
  { key: "neutral-17", label: "Кээ бирлери жогорку деңгээлди кармайт, кээ бирлери дагы жетишип жатат." },
  { key: "neutral-18", label: "Айрым квартиралар тартипти үзгүлтүксүз сактап келет." },
  { key: "neutral-19", label: "Кээ бир жерде баары тыкан, кээ бир жерде шашылыш жасалганы көрүнөт." },
  { key: "neutral-20", label: "Квартиралар ортосунда айырма бар, бирок аны азайтууга болот." },
  { key: "neutral-21", label: "Жума сайын аракет кылгандарга өзүнчө рахмат." },
  { key: "neutral-22", label: "Бул жумада өткөрүп жибергендер кийинки жума активдүү катышсын." },
  { key: "neutral-23", label: "Жалпысынан, бир бөлүгү туруктуу иштеп жатат, бир бөлүгү азырынча жок." },
  { key: "neutral-24", label: "Системалуу тазалагандар упай боюнча дайыма жогору турат." },
  { key: "neutral-25", label: "Эскертүүсүз эле тартип кармаган квартиралар - мыкты үлгү." },
  { key: "neutral-26", label: "Бүгүн упай төмөн болсо, кийинки жумада оңдоого болот." },
  { key: "neutral-27", label: "Кээ бирлери сапаттуу тазалайт, кээ бирлери формалдуу эле кылат." },
  { key: "neutral-28", label: "Текшерүү көрсөткөндөй: аракет бар жерде тазалык да жакшы." },
  { key: "neutral-29", label: "Алдыңкы квартираларга рахмат, калгандары деталдарга көбүрөөк көңүл бурсун." },
  { key: "neutral-30", label: "Жуманын жыйынтыгы жөнөкөй: ким тазаласа, ошонун жыйынтыгы көрүнөт." },
  { key: "neutral-31", label: "Чаң бул жолу да отурукташкысы келди, бирок айрым квартиралар мүмкүнчүлүк берген жок." },
  { key: "neutral-32", label: "Кээ бир жерде пол ушунчалык жалтырайт - күзгү кереги жок." },
  { key: "neutral-33", label: "Айрым квартиралар парадга даярдай таза, айрымдары квесттен жаңы чыккандай." },
  { key: "neutral-34", label: "Кээ бир командалар толук генеральный жасады, кээ бирлери демо-режимде калды." },
  { key: "neutral-35", label: "Кээ бир бөлмөлөрдө ушунчалык таза - микротолкундуу меш да ыраазы." },
  { key: "neutral-36", label: "Кээ жерде тазалоо 10дон 10, кээ жерде шыпыргы эс алууга кеткендей." },
  { key: "neutral-37", label: "Кээ бир квартираларда \"турбо-тазалык\" режими иштеп тургандай." },
  { key: "neutral-38", label: "Айрым жерлерде чаңга катуу бан берилген окшойт." },
  { key: "neutral-39", label: "Кээ бир квартираларда полдогу байпактар эми өз алдынча жашабай калды." },
  { key: "neutral-40", label: "Жыйынтык: айрым жерде жарнамадай таза, айрым жерде кийинки жумага жакшы шанс бар." },
];

const SCORE_CAPTIONS_KO = [
  { key: "neutral-01", label: "이번 주는 호실별 편차가 큽니다. 아주 깨끗한 곳도 있고 보완이 필요한 곳도 있습니다." },
  { key: "neutral-02", label: "책임감 있게 청소해 준 분들께 감사합니다. 결과에서 바로 보입니다." },
  { key: "neutral-03", label: "일부 호실은 매주 꾸준히 정돈 상태를 유지하고 있습니다." },
  { key: "neutral-04", label: "꾸준히 청소하는 팀도 있지만, 아직 빠지는 팀도 있습니다." },
  { key: "neutral-05", label: "어떤 곳은 확실히 좋아졌고, 어떤 곳은 추가 관리가 필요합니다." },
  { key: "neutral-06", label: "점수를 보면 누가 꼼꼼히 청소했는지 분명히 보입니다." },
  { key: "neutral-07", label: "매주 청소하는 곳은 점수가 안정적으로 높습니다." },
  { key: "neutral-08", label: "이번 주에도 다른 곳이 참고할 만한 좋은 사례가 있습니다." },
  { key: "neutral-09", label: "어떤 호실은 상태가 매우 좋고, 어떤 호실은 아직 아쉽습니다." },
  { key: "neutral-10", label: "꼼꼼히 한 곳도 있고, 최소한만 한 곳도 있습니다." },
  { key: "neutral-11", label: "청소를 미루지 않고 제때 끝낸 분들께 감사드립니다." },
  { key: "neutral-12", label: "어디에 실제 노력이 들어갔는지 바로 확인됩니다." },
  { key: "neutral-13", label: "흐름을 잘 유지하는 팀도 있고, 뒤처지는 팀도 있습니다." },
  { key: "neutral-14", label: "정돈이 잘된 곳도 있고, 아직 미흡한 부분이 남은 곳도 있습니다." },
  { key: "neutral-15", label: "결과를 보면 참여 수준이 아직 고르지 않습니다." },
  { key: "neutral-16", label: "꾸준한 청소는 결국 더 좋은 점수로 이어집니다." },
  { key: "neutral-17", label: "높은 청결 기준을 유지하는 곳도 있고, 따라가는 중인 곳도 있습니다." },
  { key: "neutral-18", label: "일부 호실은 매주 안정적으로 질서를 유지하고 있습니다." },
  { key: "neutral-19", label: "어떤 곳은 깔끔하지만, 어떤 곳은 급하게 처리한 느낌이 납니다." },
  { key: "neutral-20", label: "호실 간 차이는 분명하지만 충분히 줄일 수 있습니다." },
  { key: "neutral-21", label: "매주 성실히 참여해 주는 분들께 특별히 감사합니다." },
  { key: "neutral-22", label: "이번 주 청소를 놓친 분들은 다음 주에 꼭 함께해 주세요." },
  { key: "neutral-23", label: "전체적으로는 꾸준한 팀과 아직 불안정한 팀이 함께 보입니다." },
  { key: "neutral-24", label: "체계적으로 청소하는 곳이 점수도 꾸준히 높습니다." },
  { key: "neutral-25", label: "안내 없이도 질서를 유지하는 호실은 좋은 본보기입니다." },
  { key: "neutral-26", label: "이번 주 점수가 낮아도 다음 주에 충분히 만회할 수 있습니다." },
  { key: "neutral-27", label: "품질 있게 하는 곳도 있고, 형식적으로 끝내는 곳도 있습니다." },
  { key: "neutral-28", label: "점검 결과는 명확합니다. 노력이 있는 곳이 더 깨끗합니다." },
  { key: "neutral-29", label: "상위 호실은 정말 잘했습니다. 다른 곳은 디테일을 더 챙겨 주세요." },
  { key: "neutral-30", label: "이번 주 결론은 간단합니다. 청소하면 결과가 보입니다." },
  { key: "neutral-31", label: "먼지가 자리 잡으려 했지만, 몇몇 호실은 기회를 주지 않았습니다." },
  { key: "neutral-32", label: "어떤 바닥은 머리 모양을 확인할 수 있을 만큼 반짝입니다." },
  { key: "neutral-33", label: "어떤 호실은 퍼레이드 준비 완료, 어떤 호실은 퀘스트 직후 분위기입니다." },
  { key: "neutral-34", label: "어떤 팀은 대청소를 했고, 어떤 팀은 데모 버전으로 끝냈습니다." },
  { key: "neutral-35", label: "어떤 방은 너무 깔끔해서 전자레인지도 뿌듯해 보입니다." },
  { key: "neutral-36", label: "어떤 곳은 10점 만점 청소, 어떤 곳은 빗자루가 휴가를 간 느낌입니다." },
  { key: "neutral-37", label: "몇몇 호실은 \"터보 청소 모드\"를 켠 것 같습니다." },
  { key: "neutral-38", label: "몇몇 곳에서는 먼지에게 영구 출입 금지가 내려졌습니다." },
  { key: "neutral-39", label: "어떤 호실은 바닥의 양말들과 평화협정을 끝냈습니다." },
  { key: "neutral-40", label: "요약하면, 어떤 곳은 광고처럼 깔끔하고 어떤 곳은 다음 주 반등 기회가 큽니다." },
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
    case "Caller has no Telegram":
      return t("cleanup.test.noTelegram");
    case "Telegram disabled":
      return t("cleanup.test.telegramDisabled");
    case "Test send failed":
      return t("cleanup.test.sendFailed");
    case "Only super admin can use self test":
      return t("cleanup.test.onlySuperAdmin");
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
    case "Missing required fields":
    case "Missing result_id":
      return t("errors.fillRequired");
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
    case "Caller has no Telegram":
      return t("cleanup.test.noTelegram");
    case "Telegram disabled":
      return t("cleanup.test.telegramDisabled");
    case "Test send failed":
      return t("cleanup.test.sendFailed");
    case "Only super admin can use self test":
      return t("cleanup.test.onlySuperAdmin");
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
    case "Not allowed to edit result":
      return t("cleanup.errors.results.notAllowed");
    case "Only super admin can delete result":
      return t("cleanup.errors.results.onlySuperAdminDelete");
    case "Only super admin can sync coupons":
      return t("cleanup.resultCard.syncOnlySuperAdmin");
    case "Result not found":
      return t("cleanup.errors.results.notFound");
    case "Missing result_id":
      return t("errors.fillRequired");
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
    case "Invalid token":
    case "Missing or invalid Authorization header":
      return t("errors.sessionExpired");
    case "Coupon not found":
      return t("cleanup.errors.transfer.couponNotFound");
    case "Coupon expired":
      return t("cleanup.errors.transfer.couponExpired");
    case "Missing coupon_id or to_student_id":
    case "Source and target students must be different":
      return t("cleanup.transfer.missingSelection");
    case "Not allowed":
    case "Insufficient permissions":
    case "Only super admin can transfer coupons":
      return t("cleanup.errors.transfer.notAllowed");
    case "Target student not found":
      return t("cleanup.transfer.selectStudent");
    case "Coupon is reserved or used":
      return t("cleanup.errors.transfer.couponReservedOrUsed");
    case "Different apartment":
      return t("cleanup.errors.transfer.differentApartment");
    case "Internal server error":
      return t("errors.internalServer");
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

type CouponSummary = {
  active: number;
  reserved: number;
  used: number;
  expired: number;
  total: number;
  valid: number;
  valid_until?: string | null;
  valid_until_list?: string[];
};

type CouponSummaryRow = {
  id: string;
  name: string;
  room: string | null;
  block: Block | null;
  stats: CouponSummary;
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

const formatRecipientLabel = (recipient: ReminderRecipient, fallback: string) => {
  const name = (recipient.name || "").trim();
  const safeName = name ? name : fallback;
  return recipient.room ? `${safeName} (${recipient.room})` : safeName;
};

const parseReminderRecipients = (value: unknown): ReminderRecipient[] =>
  Array.isArray(value) ? (value as ReminderRecipient[]) : [];

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
  const [resultApartments, setResultApartments] = useState<Apartment[]>([]);
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
  const [couponSummaryByStudent, setCouponSummaryByStudent] = useState<Record<string, CouponSummary>>({});
  const [couponSummaryLoading, setCouponSummaryLoading] = useState(false);
  const [couponSummaryNotice, setCouponSummaryNotice] = useState<string | null>(null);
  const [couponSummaryFilter, setCouponSummaryFilter] = useState<"all" | Block>("all");
  const [recipients, setRecipients] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [secondaryLoadsEnabled, setSecondaryLoadsEnabled] = useState(false);
  const [adminBlock, setAdminBlock] = useState<Block | null>(null);
  const [weekStart, setWeekStart] = useState(getNextWednesdayISO());
  const [selectedBlock, setSelectedBlock] = useState<Block>("A");
  const [selectedApartment, setSelectedApartment] = useState<string>("");
  const [announcementText, setAnnouncementText] = useState("");
  const [announcementMode, setAnnouncementMode] = useState("manual");
  const [isBuildConfirmed, setIsBuildConfirmed] = useState(false);
  const [publishNotice, setPublishNotice] = useState<string | null>(null);
  const [publishTestNotice, setPublishTestNotice] = useState<string | null>(null);
  const [publishDelivery, setPublishDelivery] = useState<{
    sent: ReminderRecipient[];
    failed: ReminderRecipient[];
    skipped: ReminderRecipient[];
    attempted: number;
    total: number;
    telegramEnabled: boolean;
  } | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublishTesting, setIsPublishTesting] = useState(false);
  const [editingResultId, setEditingResultId] = useState<string | null>(null);
  const [editingResultText, setEditingResultText] = useState("");
  const [savingResultId, setSavingResultId] = useState<string | null>(null);
  const [deletingResultId, setDeletingResultId] = useState<string | null>(null);
  const [syncCouponsResultId, setSyncCouponsResultId] = useState<string | null>(null);
  const [transferCouponId, setTransferCouponId] = useState("");
  const [transferRecipientId, setTransferRecipientId] = useState("");
  const [superTransferFromStudentId, setSuperTransferFromStudentId] = useState("");
  const [superTransferCoupons, setSuperTransferCoupons] = useState<Coupon[]>([]);
  const [superTransferCouponsLoading, setSuperTransferCouponsLoading] = useState(false);
  const [transferSubmitting, setTransferSubmitting] = useState(false);
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
  const [scoreCaptionKey, setScoreCaptionKey] = useState("");
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
  const [resultsNotice, setResultsNotice] = useState<Record<Block, string | null>>({
    A: null,
    B: null,
  });
  const [reminderNotice, setReminderNotice] = useState<Record<Block, string | null>>({
    A: null,
    B: null,
  });
  const [reminderTestNotice, setReminderTestNotice] = useState<Record<Block, string | null>>({
    A: null,
    B: null,
  });
  const [reminderSending, setReminderSending] = useState<Record<Block, boolean>>({
    A: false,
    B: false,
  });
  const [reminderTestSending, setReminderTestSending] = useState<Record<Block, boolean>>({
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
    [...resultApartments, ...apartments].forEach((apt) => {
      map[apt.id] = apt;
    });
    return map;
  }, [apartments, resultApartments]);

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

  const couponSummaryRows = useMemo(() => {
    if (!canManageCleanup) return [];
    const rows: CouponSummaryRow[] = [];
    const knownIds = new Set<string>();

    (students || []).forEach((student) => {
      const stats = couponSummaryByStudent[student.id];
      if (!stats || stats.valid <= 0) return;
      const nameParts = [student.first_name, student.last_name, student.middle_name].filter(Boolean);
      const name = (student.full_name || nameParts.join(" ") || t("cleanup.couponsSummary.unknownStudent")).trim();
      const room = student.room ?? null;
      const blockValue = room ? room.trim().charAt(0).toUpperCase() : "";
      const block = blockValue === "A" || blockValue === "B" ? (blockValue as Block) : null;

      rows.push({
        id: student.id,
        name: name || t("cleanup.couponsSummary.unknownStudent"),
        room,
        block,
        stats,
      });
      knownIds.add(student.id);
    });

    Object.entries(couponSummaryByStudent).forEach(([studentId, stats]) => {
      if (knownIds.has(studentId) || stats.valid <= 0) return;
      rows.push({
        id: studentId,
        name: t("cleanup.couponsSummary.unknownStudent"),
        room: null,
        block: null,
        stats,
      });
    });

    rows.sort((a, b) => {
      const blockA = a.block ?? "Z";
      const blockB = b.block ?? "Z";
      if (blockA !== blockB) {
        return blockA.localeCompare(blockB);
      }
      const roomA = parseInt(a.room?.slice(1) || "9999", 10);
      const roomB = parseInt(b.room?.slice(1) || "9999", 10);
      if (roomA !== roomB) return roomA - roomB;
      return a.name.localeCompare(b.name);
    });

    return rows;
  }, [students, couponSummaryByStudent, canManageCleanup, t]);

  const filteredCouponSummaryRows = useMemo(() => {
    if (couponSummaryFilter === "all") return couponSummaryRows;
    return couponSummaryRows.filter((row) => row.block === couponSummaryFilter);
  }, [couponSummaryRows, couponSummaryFilter]);

  useEffect(() => {
    if (
      scoreCaptionKey &&
      !scoreCaptions.some((caption) => caption.key === scoreCaptionKey)
    ) {
      setScoreCaptionKey("");
    }
  }, [scoreCaptions, scoreCaptionKey]);

  const selectedScoreCaption =
    scoreCaptions.find((caption) => caption.key === scoreCaptionKey)?.label || "";
  const isAnnouncementBuilt =
    isBuildConfirmed && announcementText.trim().length > 0;

  const loadApartments = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("apartments")
      .select("id, code, block")
      .order("code", { ascending: true });

    const apartmentsList = (data as Apartment[]) || [];

    let studentRows: Array<{ apartment_id: string | null; room: string | null }> = [];

    if (students && students.length > 0) {
      studentRows = students.map((student) => ({
        apartment_id: student.apartment_id ?? null,
        room: student.room ?? null,
      }));
    } else {
      const { data: slimRows, error: slimError } = await supabase
        .from("students")
        .select("apartment_id, room");

      if (!slimError && slimRows) {
        studentRows = (slimRows as Array<{ apartment_id: string | null; room: string | null }>) || [];
      } else if (canManageCleanup) {
        try {
          const response = await authedFetch("/api/students/list");
          if (response.ok) {
            const result = await response.json();
            studentRows = (result.students || []).map((student: any) => ({
              apartment_id: student.apartment_id ?? null,
              room: student.room ?? null,
            }));
          }
        } catch (error) {
          console.error("Failed to load students list for apartments", error);
        }
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
    const { data, error } = await supabase
      .from("cleanup_results")
      .select(
        "id, week_start, block, announcement_text, announcement_mode, template_key, announced_by, announced_by_name, published_at, winning_apartment_id, created_at"
      )
      .order("week_start", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading cleanup results:", error);
      return;
    }

    const rows = (data as CleanupResult[]) || [];
    setResults(rows);
    await loadResultApartments(rows);

    const announcerIds = Array.from(
      new Set(
        rows
          .filter((row) => !row.announced_by_name)
          .map((row) => row.announced_by)
          .filter(Boolean)
      )
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

  const loadCouponSummary = async () => {
    if (!canManageCleanup) return;
    setCouponSummaryLoading(true);
    setCouponSummaryNotice(null);
    try {
      const response = await authedFetch("/api/admin/coupons/summary");
      const result = await response.json();
      if (!response.ok) {
        const message =
          typeof result?.error === "string" && result.error.trim()
            ? result.error.trim()
            : t("cleanup.couponsSummary.loadError");
        setCouponSummaryNotice(message);
        setCouponSummaryByStudent({});
        return;
      }
      setCouponSummaryByStudent(result.stats || {});
    } catch (error: any) {
      const message =
        typeof error?.message === "string" && error.message.trim()
          ? error.message.trim()
          : t("cleanup.couponsSummary.loadError");
      setCouponSummaryNotice(message);
      setCouponSummaryByStudent({});
    } finally {
      setCouponSummaryLoading(false);
    }
  };

  const loadResultApartments = async (rows: CleanupResult[]) => {
    if (!supabase) return;
    const ids = Array.from(
      new Set(rows.map((row) => row.winning_apartment_id).filter(Boolean))
    ) as string[];
    if (ids.length === 0) {
      setResultApartments([]);
      return;
    }
    const { data } = await supabase
      .from("apartments")
      .select("id, code, block")
      .in("id", ids);
    setResultApartments((data as Apartment[]) || []);
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

  const loadSuperTransferCoupons = useCallback(
    async (fromStudentId: string) => {
      if (!supabase || !isSuperAdmin || !fromStudentId) {
        setSuperTransferCoupons([]);
        return;
      }

      try {
        setSuperTransferCouponsLoading(true);
        const nowIso = new Date().toISOString();
        const { data, error } = await supabase
          .from("coupons")
          .select(
            "id, owner_student_id, source_type, source_id, issued_by, issued_at, valid_from, expires_at, reserved_queue_id, reserved_at, used_in_queue_id, used_at, note"
          )
          .eq("owner_student_id", fromStudentId)
          .is("reserved_queue_id", null)
          .is("used_at", null)
          .is("used_in_queue_id", null)
          .gt("expires_at", nowIso)
          .order("expires_at", { ascending: true })
          .order("issued_at", { ascending: true });

        if (error) {
          throw error;
        }

        setSuperTransferCoupons((data as Coupon[]) || []);
      } catch (error: any) {
        setSuperTransferCoupons([]);
        setTransferNotice(mapTransferError(t, error?.message));
      } finally {
        setSuperTransferCouponsLoading(false);
      }
    },
    [isSuperAdmin, t]
  );

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
    if (!hasLoadedOnce) return;
    const timerId = window.setTimeout(() => {
      setSecondaryLoadsEnabled(true);
    }, 250);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [hasLoadedOnce]);

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
  }, [user?.student_id]);

  useEffect(() => {
    if (!secondaryLoadsEnabled || !user?.student_id) return;
    loadRecipients();
  }, [secondaryLoadsEnabled, user?.student_id]);

  useEffect(() => {
    if (!secondaryLoadsEnabled || !canManageCleanup || !user?.student_id) {
      setCouponSummaryByStudent({});
      return;
    }
    loadCouponSummary();
  }, [secondaryLoadsEnabled, canManageCleanup, user?.student_id]);

  useEffect(() => {
    if (!secondaryLoadsEnabled) return;
    loadTransfers();
  }, [secondaryLoadsEnabled, user?.student_id, isAdmin, isSuperAdmin]);

  useEffect(() => {
    if (!secondaryLoadsEnabled || !isSuperAdmin) return;
    loadGrantStudents();
  }, [secondaryLoadsEnabled, isSuperAdmin]);

  useEffect(() => {
    if (!isSuperAdmin) {
      setSuperTransferFromStudentId("");
      setSuperTransferCoupons([]);
      setSuperTransferCouponsLoading(false);
      return;
    }

    setTransferCouponId("");
    if (!superTransferFromStudentId) {
      setSuperTransferCoupons([]);
      return;
    }
    loadSuperTransferCoupons(superTransferFromStudentId);
  }, [isSuperAdmin, superTransferFromStudentId, loadSuperTransferCoupons]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    if (transferRecipientId && transferRecipientId === superTransferFromStudentId) {
      setTransferRecipientId("");
    }
  }, [isSuperAdmin, transferRecipientId, superTransferFromStudentId]);

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
    if (canManageCleanup) {
      await loadCouponSummary();
    }
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
      setReminderTestNotice((prev) => ({ ...prev, [block]: null }));
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

      const sentList = parseReminderRecipients(result?.sent_to);
      const failedList = parseReminderRecipients(result?.failed_to);
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

  const getBlockKey = (block: string): Block | null =>
    block === "A" || block === "B" ? block : null;

  const handleStartEditResult = (item: CleanupResult) => {
    setEditingResultId(item.id);
    setEditingResultText(item.announcement_text || "");
    const blockKey = getBlockKey(item.block);
    if (blockKey) {
      setResultsNotice((prev) => ({ ...prev, [blockKey]: null }));
    }
  };

  const handleSendReminderTest = async (block: Block) => {
    if (!supabase) return;
    const draft = scheduleDrafts[block];
    if (!draft?.date) {
      setReminderTestNotice((prev) => ({ ...prev, [block]: t("cleanup.schedule.missingDate") }));
      return;
    }

    try {
      setReminderTestSending((prev) => ({ ...prev, [block]: true }));
      setReminderTestNotice((prev) => ({ ...prev, [block]: null }));

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
        setReminderTestNotice((prev) => ({
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
        body: JSON.stringify({ block, notify_self_only: true }),
      });
      const result = await response.json();

      if (!response.ok) {
        setReminderTestNotice((prev) => ({
          ...prev,
          [block]: mapReminderError(t, result.error),
        }));
        return;
      }

      const sentList = parseReminderRecipients(result?.sent_to);
      const failedList = parseReminderRecipients(result?.failed_to);
      if (sentList.length > 0) {
        const recipientsText = sentList
          .map((recipient) => formatRecipientLabel(recipient, t("cleanup.publish.noName")))
          .join(", ");
        setReminderTestNotice((prev) => ({
          ...prev,
          [block]: t("cleanup.test.sentTo", { recipients: recipientsText }),
        }));
      } else if (failedList.length > 0) {
        setReminderTestNotice((prev) => ({
          ...prev,
          [block]: t("cleanup.test.sendFailed"),
        }));
      } else {
        setReminderTestNotice((prev) => ({
          ...prev,
          [block]: t("cleanup.test.noTelegram"),
        }));
      }
      await loadSchedules();
    } catch (error: any) {
      setReminderTestNotice((prev) => ({
        ...prev,
        [block]: mapReminderError(t, error?.message),
      }));
    } finally {
      setReminderTestSending((prev) => ({ ...prev, [block]: false }));
    }
  };

  const handleCancelEditResult = () => {
    setEditingResultId(null);
    setEditingResultText("");
  };

  const handleSaveEditedResult = async (item: CleanupResult) => {
    if (!supabase || !editingResultId) return;
    const trimmedText = editingResultText.trim();
    if (!trimmedText) {
      const blockKey = getBlockKey(item.block);
      if (blockKey) {
        setResultsNotice((prev) => ({
          ...prev,
          [blockKey]: t("errors.fillRequired"),
        }));
      }
      return;
    }

    try {
      setSavingResultId(item.id);
      const response = await authedFetch("/api/admin/cleanup/results/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          result_id: item.id,
          announcement_text: trimmedText,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(mapResultsError(t, result.error));
      }

      const blockKey = getBlockKey(item.block);
      if (blockKey) {
        setResultsNotice((prev) => ({
          ...prev,
          [blockKey]: t("cleanup.resultCard.updated"),
        }));
      }
      setEditingResultId(null);
      setEditingResultText("");
      await loadResults();
    } catch (error: any) {
      const blockKey = getBlockKey(item.block);
      if (blockKey) {
        setResultsNotice((prev) => ({
          ...prev,
          [blockKey]: mapResultsError(t, error?.message),
        }));
      }
    } finally {
      setSavingResultId(null);
    }
  };

  const handleDeleteResult = async (item: CleanupResult) => {
    if (!supabase || !isSuperAdmin) return;
    if (!window.confirm(t("cleanup.resultCard.deleteConfirm"))) return;

    try {
      setDeletingResultId(item.id);
      const response = await authedFetch("/api/admin/cleanup/results/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          result_id: item.id,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(mapResultsError(t, result.error));
      }

      if (editingResultId === item.id) {
        setEditingResultId(null);
        setEditingResultText("");
      }

      const blockKey = getBlockKey(item.block);
      if (blockKey) {
        setResultsNotice((prev) => ({
          ...prev,
          [blockKey]:
            (result.deleted_coupons || 0) > 0
              ? t("cleanup.resultCard.deletedWithCoupons", {
                  count: result.deleted_coupons || 0,
                })
              : t("cleanup.resultCard.deleted"),
        }));
      }

      await loadResults();
      await refreshCoupons();
      if (canManageCleanup) {
        await loadCouponSummary();
      }
    } catch (error: any) {
      const blockKey = getBlockKey(item.block);
      if (blockKey) {
        setResultsNotice((prev) => ({
          ...prev,
          [blockKey]: mapResultsError(t, error?.message),
        }));
      }
    } finally {
      setDeletingResultId(null);
    }
  };

  const handleSyncResultCoupons = async (item: CleanupResult) => {
    if (!supabase || !isSuperAdmin) return;
    if (!window.confirm(t("cleanup.resultCard.syncConfirm"))) return;

    try {
      setSyncCouponsResultId(item.id);
      const response = await authedFetch("/api/admin/cleanup/coupons/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          result_id: item.id,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(mapResultsError(t, result.error));
      }

      const blockKey = getBlockKey(item.block);
      if (blockKey) {
        setResultsNotice((prev) => ({
          ...prev,
          [blockKey]: t("cleanup.resultCard.syncDone", {
            count: result.updated_coupons || 0,
            date: formatDateTime(result.expires_at, locale),
          }),
        }));
      }
      await refreshCoupons();
      if (canManageCleanup) {
        await loadCouponSummary();
      }
    } catch (error: any) {
      const blockKey = getBlockKey(item.block);
      if (blockKey) {
        setResultsNotice((prev) => ({
          ...prev,
          [blockKey]: mapResultsError(t, error?.message),
        }));
      }
    } finally {
      setSyncCouponsResultId(null);
    }
  };

  const handlePublish = async () => {
    if (!supabase || !selectedApartment || !weekStart) {
      setPublishNotice(t("errors.fillRequired"));
      return;
    }

    if (!canManageCleanup) return;
    if (!isAnnouncementBuilt) {
      setPublishNotice(t("cleanup.publish.buildMessageFirst"));
      return;
    }

    try {
      setIsPublishing(true);
      setPublishNotice(null);
      setPublishTestNotice(null);
      setPublishDelivery(null);
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
      const sentList = parseReminderRecipients(result?.sent_to);
      const failedList = parseReminderRecipients(result?.failed_to);
      const skippedList = parseReminderRecipients(result?.skipped_to);
      const telegramEnabled = result?.telegram_enabled !== false;
      const attempted =
        typeof result?.attempted === "number"
          ? result.attempted
          : sentList.length + failedList.length;
      const total =
        typeof result?.recipients_total === "number"
          ? result.recipients_total
          : attempted + skippedList.length;
      setPublishDelivery({
        sent: sentList,
        failed: failedList,
        skipped: skippedList,
        attempted,
        total,
        telegramEnabled,
      });
      await refreshResults();
      await refreshCoupons();
    } catch (error: any) {
      setPublishNotice(mapPublishError(t, error?.message));
    } finally {
      setIsPublishing(false);
    }
  };

  const handleRandomScoreCaption = () => {
    if (scoreCaptions.length === 0) return;
    const random = scoreCaptions[Math.floor(Math.random() * scoreCaptions.length)];
    setScoreCaptionKey(random.key);
    setIsBuildConfirmed(false);
    setAnnouncementMode("manual");
    setPublishNotice(null);
    setPublishTestNotice(null);
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
    setIsBuildConfirmed(true);
    setAnnouncementMode("scores");
    setPublishNotice(null);
    setPublishTestNotice(null);
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
            {canManageCleanup && (
              <button
                type="button"
                onClick={() => handleSendReminderTest(block)}
                disabled={!!reminderTestSending[block]}
                className="w-full btn btn-ghost md:w-auto"
              >
                {reminderTestSending[block]
                  ? t("cleanup.reminders.testSending")
                  : t("cleanup.reminders.testSelf")}
              </button>
            )}
          </div>
        </div>
        {scheduleNotice[block] && (
          <p className="text-xs text-blue-600">{scheduleNotice[block]}</p>
        )}
        {reminderNotice[block] && (
          <p className="text-xs text-emerald-600">{reminderNotice[block]}</p>
        )}
        {reminderTestNotice[block] && (
          <p className="text-xs text-indigo-600">{reminderTestNotice[block]}</p>
        )}
        {reminderRecipients[block].length > 0 && (
          <p className="text-xs text-emerald-700">
            {t("cleanup.reminders.recipients", {
              recipients: reminderRecipients[block]
                .map((recipient) => formatRecipientLabel(recipient, t("cleanup.publish.noName")))
                .join(", "),
            })}
          </p>
        )}
        {reminderFailures[block].length > 0 && (
          <p className="text-xs text-rose-600">
            {t("cleanup.reminders.notDelivered", {
              recipients: reminderFailures[block]
                .map((recipient) => formatRecipientLabel(recipient, t("cleanup.publish.noName")))
                .join(", "),
            })}
          </p>
        )}
      </div>
    );
  };

  const handleTransfer = async () => {
    if (
      !supabase ||
      !transferCouponId ||
      !transferRecipientId ||
      (isSuperAdmin && !superTransferFromStudentId)
    ) {
      setTransferNotice(t("cleanup.transfer.missingSelection"));
      return;
    }

    try {
      setTransferSubmitting(true);
      setTransferNotice(null);
      if (isSuperAdmin) {
        const response = await authedFetch("/api/admin/coupons/transfer", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            coupon_id: transferCouponId,
            to_student_id: transferRecipientId,
          }),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Internal server error");
        }
      } else {
        const { error } = await supabase.rpc("transfer_coupon", {
          p_coupon_id: transferCouponId,
          p_to_student_id: transferRecipientId,
        });

        if (error) {
          throw new Error(error.message);
        }
      }

      setTransferCouponId("");
      setTransferRecipientId("");
      setTransferNotice(t("cleanup.transfer.success"));
      await refreshCoupons();
      if (isSuperAdmin && superTransferFromStudentId) {
        await loadSuperTransferCoupons(superTransferFromStudentId);
      }
    } catch (error: any) {
      setTransferNotice(mapTransferError(t, error?.message));
    } finally {
      setTransferSubmitting(false);
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

  const handlePublishTest = async () => {
    if (!supabase || !selectedApartment || !weekStart || !announcementText.trim()) {
      setPublishTestNotice(t("errors.fillRequired"));
      return;
    }
    if (!canManageCleanup) return;
    if (!isAnnouncementBuilt) {
      setPublishTestNotice(t("cleanup.publish.buildMessageFirst"));
      return;
    }

    try {
      setIsPublishTesting(true);
      setPublishTestNotice(null);
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
          notify_self_only: true,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(mapPublishError(t, result.error));
      }
      const sentList = parseReminderRecipients(result?.sent_to);
      const failedList = parseReminderRecipients(result?.failed_to);
      if (sentList.length > 0) {
        const recipientsText = sentList
          .map((recipient) => formatRecipientLabel(recipient, t("cleanup.publish.noName")))
          .join(", ");
        setPublishTestNotice(t("cleanup.test.sentTo", { recipients: recipientsText }));
      } else if (failedList.length > 0) {
        setPublishTestNotice(t("cleanup.test.sendFailed"));
      } else {
        setPublishTestNotice(t("cleanup.test.noTelegram"));
      }
      await refreshResults();
      await refreshCoupons();
      if (canManageCleanup) {
        await loadCouponSummary();
      }
    } catch (error: any) {
      setPublishTestNotice(mapPublishError(t, error?.message));
    } finally {
      setIsPublishTesting(false);
    }
  };

  const canEditResultForBlock = (block: string) => {
    if (isSuperAdmin) return true;
    return !!adminBlock && block === adminBlock;
  };

  const renderResultCard = (item: CleanupResult) => {
    const apartment = apartmentMap[item.winning_apartment_id];
    const announcer =
      (item.announced_by_name || "").trim() ||
      (item.announced_by ? announcers[item.announced_by] : null);
    const isEditing = editingResultId === item.id;
    const canEditResult = canEditResultForBlock(item.block);
    const isSaving = savingResultId === item.id;
    const isDeleting = deletingResultId === item.id;
    const isSyncingCoupons = syncCouponsResultId === item.id;

    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
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
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editingResultText}
              onChange={(e) => setEditingResultText(e.target.value)}
              rows={5}
              className="w-full rounded-lg border-2 border-slate-200 bg-white p-3 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100"
              placeholder={t("cleanup.resultCard.editPlaceholder")}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleSaveEditedResult(item)}
                disabled={isSaving}
                className="btn btn-primary px-3 py-2 text-xs"
              >
                {isSaving ? t("common.saving") : t("common.save")}
              </button>
              <button
                type="button"
                onClick={handleCancelEditResult}
                disabled={isSaving}
                className="btn btn-ghost px-3 py-2 text-xs"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-700 whitespace-pre-line dark:text-slate-200">{item.announcement_text}</p>
        )}
        {(canEditResult || isSuperAdmin) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {canEditResult && !isEditing && (
              <button
                type="button"
                onClick={() => handleStartEditResult(item)}
                className="btn btn-secondary px-3 py-2 text-xs"
              >
                {t("cleanup.resultCard.edit")}
              </button>
            )}
            {isSuperAdmin && !isEditing && (
              <button
                type="button"
                onClick={() => handleSyncResultCoupons(item)}
                disabled={isSyncingCoupons || isDeleting}
                className="btn btn-ghost px-3 py-2 text-xs"
              >
                {isSyncingCoupons
                  ? t("common.loading")
                  : t("cleanup.resultCard.syncCoupons")}
              </button>
            )}
            {isSuperAdmin && !isEditing && (
              <button
                type="button"
                onClick={() => handleDeleteResult(item)}
                disabled={isDeleting}
                className="btn btn-danger px-3 py-2 text-xs"
              >
                {isDeleting ? t("cleanup.results.clearing") : t("cleanup.resultCard.delete")}
              </button>
            )}
          </div>
        )}
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
        </div>
        {resultsNotice[block] && (
          <p className="text-xs text-slate-600">{resultsNotice[block]}</p>
        )}

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

  const transferCouponOptions = isSuperAdmin ? superTransferCoupons : transferableCoupons;
  const transferRecipientOptions = isSuperAdmin
    ? grantStudents.filter((student) => student.id !== superTransferFromStudentId)
    : recipients;
  const canUseTransferForm = isSuperAdmin ? grantStudents.length > 1 : recipients.length > 0;

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
                  onChange={(e) => {
                    setSelectedBlock(e.target.value as Block);
                    setSelectedApartment("");
                    setIsBuildConfirmed(false);
                    setAnnouncementMode("manual");
                    setPublishNotice(null);
                    setPublishTestNotice(null);
                  }}
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
                  onChange={(e) => {
                    setSelectedApartment(e.target.value);
                    setIsBuildConfirmed(false);
                    setAnnouncementMode("manual");
                    setPublishNotice(null);
                    setPublishTestNotice(null);
                  }}
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
                        {
                          setScoreInputs((prev) => ({
                            ...prev,
                            [apt.id]: e.target.value,
                          }));
                          setIsBuildConfirmed(false);
                          setAnnouncementMode("manual");
                          setPublishNotice(null);
                          setPublishTestNotice(null);
                        }
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
                  onChange={(e) => {
                    setScoreCaptionKey(e.target.value);
                    setIsBuildConfirmed(false);
                    setAnnouncementMode("manual");
                    setPublishNotice(null);
                    setPublishTestNotice(null);
                  }}
                  className="w-full rounded-lg border-2 border-slate-200 bg-white p-2 text-sm text-gray-900 md:w-auto dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100"
                >
                  <option value="">{t("cleanup.caption.none")}</option>
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
                  setPublishNotice(null);
                  setPublishTestNotice(null);
                }}
                rows={4}
                className="w-full rounded-lg border-2 border-slate-200 bg-white p-3 text-gray-900 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100"
                placeholder={t("cleanup.messagePlaceholder")}
              />
            </div>

            {!isAnnouncementBuilt && (
              <p className="text-xs text-amber-700">
                {t("cleanup.publish.buildMessageFirst")}
              </p>
            )}

            {publishNotice && (
              <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {publishNotice}
              </div>
            )}
            {publishTestNotice && (
              <div className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
                {publishTestNotice}
              </div>
            )}
            {publishDelivery && publishDelivery.telegramEnabled && publishDelivery.total > 0 && (
              <p className="text-xs text-slate-600">
                {t("cleanup.publish.summary", {
                  sent: publishDelivery.sent.length,
                  attempted: publishDelivery.attempted,
                })}
              </p>
            )}
            {publishDelivery && !publishDelivery.telegramEnabled && (
              <p className="text-xs text-amber-700">
                {t("cleanup.publish.telegramDisabled")}
              </p>
            )}
            {publishDelivery &&
              publishDelivery.telegramEnabled &&
              publishDelivery.sent.length > 0 && (
                <p className="text-xs text-emerald-700">
                  {t("cleanup.publish.recipients", {
                    recipients: publishDelivery.sent
                      .map((recipient) => formatRecipientLabel(recipient, t("cleanup.publish.noName")))
                      .join(", "),
                  })}
                </p>
            )}
            {publishDelivery &&
              publishDelivery.telegramEnabled &&
              publishDelivery.failed.length > 0 && (
                <p className="text-xs text-rose-600">
                  {t("cleanup.publish.notDelivered", {
                    recipients: publishDelivery.failed
                      .map((recipient) => formatRecipientLabel(recipient, t("cleanup.publish.noName")))
                      .join(", "),
                  })}
                </p>
            )}
            {publishDelivery &&
              !publishDelivery.telegramEnabled &&
              publishDelivery.skipped.length > 0 && (
                <p className="text-xs text-slate-600">
                  {t("cleanup.publish.skipped", {
                    recipients: publishDelivery.skipped
                      .map((recipient) => formatRecipientLabel(recipient, t("cleanup.publish.noName")))
                      .join(", "),
                  })}
                </p>
            )}
            {publishDelivery &&
              publishDelivery.telegramEnabled &&
              publishDelivery.total === 0 && (
                <p className="text-xs text-slate-600">
                  {t("cleanup.publish.noRecipientsWithTelegram")}
                </p>
            )}

            <div className="flex flex-col gap-2 md:flex-row">
              {canManageCleanup && (
                <button
                  type="button"
                  onClick={handlePublishTest}
                  disabled={isPublishTesting || (!isSuperAdmin && !adminBlock) || !isAnnouncementBuilt}
                  className="w-full btn btn-ghost md:w-auto"
                >
                  {isPublishTesting
                    ? t("cleanup.publish.testingSelf")
                    : t("cleanup.publish.testSelf")}
                </button>
              )}
              <button
                type="button"
                onClick={handlePublish}
                disabled={isPublishing || (!isSuperAdmin && !adminBlock) || !isAnnouncementBuilt}
                className="w-full btn btn-primary btn-glow"
              >
                {isPublishing ? t("cleanup.publish.publishing") : t("cleanup.publish.publish")}
              </button>
            </div>
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

              {!canUseTransferForm ? (
                <p className="text-sm text-gray-500">{t("cleanup.transfer.noRecipients")}</p>
              ) : (
                <>
                  {isSuperAdmin && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        {t("cleanup.grant.student")}
                      </label>
                      <select
                        value={superTransferFromStudentId}
                        onChange={(e) => {
                          setSuperTransferFromStudentId(e.target.value);
                          setTransferNotice(null);
                        }}
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
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">{t("cleanup.transfer.coupon")}</label>
                    <select
                      value={transferCouponId}
                      onChange={(e) => {
                        setTransferCouponId(e.target.value);
                        setTransferNotice(null);
                      }}
                      disabled={(isSuperAdmin && !superTransferFromStudentId) || superTransferCouponsLoading}
                      className="w-full rounded-lg border-2 border-slate-200 bg-white p-2 text-gray-900 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100"
                    >
                      <option value="">
                        {isSuperAdmin && !superTransferFromStudentId
                          ? t("cleanup.grant.selectStudentOption")
                          : t("cleanup.transfer.selectCoupon")}
                      </option>
                      {transferCouponOptions.map((coupon) => (
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
                      onChange={(e) => {
                        setTransferRecipientId(e.target.value);
                        setTransferNotice(null);
                      }}
                      className="w-full rounded-lg border-2 border-slate-200 bg-white p-2 text-gray-900 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100"
                    >
                      <option value="">{t("cleanup.transfer.selectStudent")}</option>
                      {transferRecipientOptions.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.full_name} {student.room ? `(${student.room})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {isSuperAdmin && superTransferCouponsLoading && (
                    <p className="text-sm text-slate-600">{t("common.loading")}</p>
                  )}

                  {transferNotice && (
                    <p className="text-sm text-blue-600">{transferNotice}</p>
                  )}

                  <button
                    type="button"
                    onClick={handleTransfer}
                    disabled={transferSubmitting || (isSuperAdmin && !superTransferFromStudentId)}
                    className="w-full btn btn-primary"
                  >
                    {transferSubmitting ? t("common.saving") : t("cleanup.transfer.send")}
                  </button>
                </>
              )}
            </div>

            {canManageCleanup && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 dark:border-slate-700 dark:bg-slate-800 lg:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <TicketIcon className="w-5 h-5 text-purple-600" />
                    <h3 className="text-lg font-bold text-gray-900">{t("cleanup.couponsSummary.title")}</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600">
                      {t("cleanup.couponsSummary.filterLabel")}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCouponSummaryFilter("all")}
                      className={`rounded-full px-3 py-1 text-xs font-semibold border ${
                        couponSummaryFilter === "all"
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white/50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                      }`}
                      aria-pressed={couponSummaryFilter === "all"}
                    >
                      {t("cleanup.couponsSummary.filter.all")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCouponSummaryFilter("A")}
                      className={`rounded-full px-3 py-1 text-xs font-semibold border ${
                        couponSummaryFilter === "A"
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white/50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                      }`}
                      aria-pressed={couponSummaryFilter === "A"}
                    >
                      {t("cleanup.couponsSummary.filter.blockA")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCouponSummaryFilter("B")}
                      className={`rounded-full px-3 py-1 text-xs font-semibold border ${
                        couponSummaryFilter === "B"
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white/50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                      }`}
                      aria-pressed={couponSummaryFilter === "B"}
                    >
                      {t("cleanup.couponsSummary.filter.blockB")}
                    </button>
                  </div>
                </div>

                {couponSummaryNotice && (
                  <p className="text-sm text-rose-600">{couponSummaryNotice}</p>
                )}

                {couponSummaryLoading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <WashingSpinner className="w-4 h-4" />
                    <span>{t("common.loading")}</span>
                  </div>
                ) : filteredCouponSummaryRows.length === 0 ? (
                  <p className="text-sm text-gray-500">{t("cleanup.couponsSummary.empty")}</p>
                ) : (
                  <div className="space-y-2">
                    {filteredCouponSummaryRows.map((row) => {
                      const validUntilItems =
                        row.stats.valid_until_list && row.stats.valid_until_list.length > 0
                          ? row.stats.valid_until_list
                          : row.stats.valid_until
                            ? [row.stats.valid_until]
                            : [];
                      return (
                      <div
                        key={row.id}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-gray-700 dark:border-slate-700 dark:bg-slate-900/40"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <span className="font-semibold text-gray-900">
                            {row.name}
                            {row.room ? ` (${row.room})` : ""}
                          </span>
                          <div className="text-xs font-semibold text-slate-600 space-y-0.5 sm:text-right">
                            <div>{t("students.coupons", { count: row.stats.valid })}</div>
                            {validUntilItems.length > 0 && (
                              <div className="text-[11px] font-medium text-slate-500">
                                {t("cleanup.couponsSummary.validUntilList", {
                                  dates: validUntilItems
                                    .map((date) => formatDateTime(date, locale))
                                    .join(", "),
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700">
                          <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
                            {t("cleanup.coupons.stats.active", { count: row.stats.active })}
                          </span>
                          <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">
                            {t("cleanup.coupons.stats.reserved", { count: row.stats.reserved })}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                            {t("cleanup.coupons.stats.used", { count: row.stats.used })}
                          </span>
                          <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">
                            {t("cleanup.coupons.stats.expired", { count: row.stats.expired })}
                          </span>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
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








