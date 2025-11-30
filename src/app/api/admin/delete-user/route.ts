import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ✅ Используем Service Role Key (только на сервере!)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    // Получаем данные из запроса
    const { userId, adminUserId } = await request.json();

    if (!userId || !adminUserId) {
      return NextResponse.json(
        { error: 'Missing userId or adminUserId' },
        { status: 400 }
      );
    }

    // Проверяем, что запрос делает админ
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('students')
      .select('is_admin, is_super_admin')
      .eq('user_id', adminUserId)
      .single();

    if (adminError || !adminData) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 403 }
      );
    }

    if (!adminData.is_admin && !adminData.is_super_admin) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Удаляем пользователя через Admin API
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
