import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) throw new Error("Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)");
if (!serviceKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

export interface Caller {
  user_id: string;
  student_id: string;
  is_admin: boolean;
  is_super_admin: boolean;
  is_banned: boolean;
}

/**
 * Получает и проверяет JWT из Authorization header,
 * возвращает данные инициатора из БД
 */
export async function getCaller(req: NextRequest): Promise<{ caller: Caller; error?: never } | { caller?: never; error: NextResponse }> {
  // ✅ Получаем JWT из Authorization header
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      error: NextResponse.json(
        { error: "Missing or invalid Authorization header" },
        { status: 401 }
      ),
    };
  }

  const token = authHeader.substring(7);

  // ✅ Проверяем JWT и получаем user_id
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  
  if (authError || !user) {
    return {
      error: NextResponse.json(
        { error: "Invalid token", details: authError?.message ?? null },
        { status: 401 }
      ),
    };
  }

  // ✅ Получаем данные инициатора из БД
  const { data: callerData, error: callerError } = await supabaseAdmin
    .from("students")
    .select("id, is_admin, is_super_admin, is_banned")
    .eq("user_id", user.id)
    .maybeSingle();

  if (callerError || !callerData) {
    return {
      error: NextResponse.json(
        { error: "User not found in students table" },
        { status: 404 }
      ),
    };
  }

  // ✅ Проверка бана
  if (callerData.is_banned) {
    return {
      error: NextResponse.json(
        { error: "You are banned" },
        { status: 403 }
      ),
    };
  }

  // ✅ Проверка прав админа
  if (!callerData.is_admin && !callerData.is_super_admin) {
    return {
      error: NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      ),
    };
  }

  return {
    caller: {
      user_id: user.id,
      student_id: callerData.id,
      is_admin: callerData.is_admin || false,
      is_super_admin: callerData.is_super_admin || false,
      is_banned: callerData.is_banned || false,
    },
  };
}

/**
 * Проверяет, может ли caller выполнять операции над target студентом
 */
export async function canModifyStudent(
  caller: Caller,
  targetStudentId: string
): Promise<{ allowed: true; target: any; error?: never } | { allowed: false; target?: never; error: NextResponse }> {
  // ✅ Получаем целевого студента
  const { data: targetStudent, error: targetError } = await supabaseAdmin
    .from("students")
    .select("id, is_super_admin, is_admin, first_name, last_name, middle_name")
    .eq("id", targetStudentId)
    .maybeSingle();

  if (targetError || !targetStudent) {
    return {
      allowed: false,
      error: NextResponse.json(
        { error: "Target student not found" },
        { status: 404 }
      ),
    };
  }

  // ✅ Защита: обычный админ не может трогать суперадмина
  if (targetStudent.is_super_admin && !caller.is_super_admin) {
    return {
      allowed: false,
      error: NextResponse.json(
        { error: "Only super admin can modify super admin" },
        { status: 403 }
      ),
    };
  }

  return {
    allowed: true,
    target: targetStudent,
  };
}

/**
 * Проверяет, может ли caller выполнять операции над target queue item
 */
export async function canModifyQueueItem(
  caller: Caller,
  targetQueueItemId: string
): Promise<{ allowed: true; target: any; error?: never } | { allowed: false; target?: never; error: NextResponse }> {
  // ✅ Получаем целевой queue item
  const { data: targetQueueItem, error: targetError } = await supabaseAdmin
    .from("queue")
    .select("id, student_id")
    .eq("id", targetQueueItemId)
    .maybeSingle();

  if (targetError || !targetQueueItem) {
    return {
      allowed: false,
      error: NextResponse.json(
        { error: "Target queue item not found" },
        { status: 404 }
      ),
    };
  }

  // ✅ Получаем студента-владельца queue item
  const { data: targetStudent, error: studentError } = await supabaseAdmin
    .from("students")
    .select("id, is_super_admin, is_admin")
    .eq("id", targetQueueItem.student_id)
    .maybeSingle();

  if (studentError || !targetStudent) {
    return {
      allowed: false,
      error: NextResponse.json(
        { error: "Target student not found" },
        { status: 404 }
      ),
    };
  }

  // ✅ Защита: обычный админ не может трогать queue item суперадмина
  if (targetStudent.is_super_admin && !caller.is_super_admin) {
    return {
      allowed: false,
      error: NextResponse.json(
        { error: "Only super admin can modify super admin queue items" },
        { status: 403 }
      ),
    };
  }

  return {
    allowed: true,
    target: targetQueueItem,
  };
}

/**
 * Безопасно получает queue item без INNER JOIN
 * Возвращает 404 если не найден
 */
export async function getQueueItemOr404(queue_item_id: string) {
  const { data, error } = await supabaseAdmin
    .from("queue")
    .select("id, student_id")
    .eq("id", queue_item_id)
    .maybeSingle();

  if (error || !data) {
    return { 
      error: NextResponse.json(
        { error: "Queue item not found" }, 
        { status: 404 }
      ) 
    };
  }

  return { queueItem: data };
}

/**
 * Проверяет, является ли студент суперадмином
 * Возвращает false если студент не найден или student_id пустой
 */
export async function isTargetSuperAdmin(student_id: string | null | undefined): Promise<boolean> {
  if (!student_id) return false;
  
  const { data } = await supabaseAdmin
    .from("students")
    .select("is_super_admin")
    .eq("id", student_id)
    .maybeSingle();
  
  return !!data?.is_super_admin;
}

export { supabaseAdmin };
