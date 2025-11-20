import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ✅ Секретные переменные (только на сервере!)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    // Проверяем пароль
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Неверный пароль' },
        { status: 401 }
      );
    }

    // Создаем Supabase клиент
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Входим через Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL!,
      password: ADMIN_PASSWORD!,
    });

    if (error) {
      console.error('Auth error:', error);
      return NextResponse.json(
        { error: 'Ошибка аутентификации' },
        { status: 401 }
      );
    }

    const authUser = data.user;
    if (!authUser) {
      return NextResponse.json(
        { error: 'Auth user not found' },
        { status: 401 }
      );
    }

    // Получаем данные студента
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('user_id', authUser.id)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'Admin не найден в базе' },
        { status: 404 }
      );
    }

    if (!student.is_admin && !student.is_super_admin) {
      return NextResponse.json(
        { error: 'Пользователь не админ' },
        { status: 403 }
      );
    }

    // Возвращаем данные пользователя и сессию
    return NextResponse.json({
      success: true,
      user: {
        id: authUser.id,
        student_id: student.id,
        first_name: student.first_name,
        last_name: student.last_name,
        full_name: student.full_name,
        room: student.room,
        is_admin: student.is_admin,
        is_super_admin: student.is_super_admin,
      },
      session: data.session
    });
  } catch (error: any) {
    console.error('Error in admin login API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
