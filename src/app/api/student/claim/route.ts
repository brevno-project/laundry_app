import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/supabase-admin";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { student_id, pin } = await request.json();

    if (!student_id || !pin) {
      return NextResponse.json(
        { error: "student_id и pin обязательны" },
        { status: 400 }
      );
    }

    // 1) Получаем студента по student_id
    const { data: student, error: studentError } = await admin
      .from("students")
      .select("id, user_id, is_banned, ban_reason, claim_code_hash, claim_code_issued_at")
      .eq("id", student_id)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { error: "Студент не найден" },
        { status: 404 }
      );
    }

    if (student.is_banned) {
      return NextResponse.json(
        { error: `Студент забанен${student.ban_reason ? `: ${student.ban_reason}` : ""}` },
        { status: 403 }
      );
    }

    // 2) Проверяем, что студент еще не привязан
    if (student.user_id) {
      return NextResponse.json(
        { error: "Студент уже привязан к аккаунту" },
        { status: 400 }
      );
    }

    // 3) Проверяем PIN (сравниваем хэш)
    const pinHash = crypto.createHash("sha256").update(pin).digest("hex");
    
    if (student.claim_code_hash !== pinHash) {
      return NextResponse.json(
        { error: "Неверный PIN" },
        { status: 401 }
      );
    }

    // 4) Проверяем срок действия PIN (24 часа)
    if (student.claim_code_issued_at) {
      const issuedAt = new Date(student.claim_code_issued_at);
      const now = new Date();
      const hoursDiff = (now.getTime() - issuedAt.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff > 24) {
        return NextResponse.json(
          { error: "PIN истек (действителен 24 часа)" },
          { status: 401 }
        );
      }
    }

    // 5) Получаем текущего auth пользователя
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Требуется авторизация" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    const { data: { user }, error: authError } = await admin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Неверный токен" },
        { status: 401 }
      );
    }

    // 6) Привязываем auth.uid() к студенту
    const { error: updateError } = await admin
      .from("students")
      .update({ 
        user_id: user.id,
        claim_code_hash: null,  // Очищаем PIN после использования
        claim_code_issued_at: null
      })
      .eq("id", student_id);

    if (updateError) {
      return NextResponse.json(
        { error: "Ошибка привязки" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: "Аккаунт успешно привязан"
    });

  } catch (error: any) {
    console.error("Claim error:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
