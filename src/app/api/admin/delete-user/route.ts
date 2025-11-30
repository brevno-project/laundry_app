import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false }
  }
);

export async function POST(request: NextRequest) {
  try {
    const { userId, adminStudentId } = await request.json();

    if (!userId || !adminStudentId) {
      return NextResponse.json(
        { error: 'Missing userId or adminStudentId' },
        { status: 400 }
      );
    }

    // проверяем админские права через students.id
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('students')
      .select('is_admin, is_super_admin')
      .eq('id', adminStudentId)
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

    // удаляем auth пользователя
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      if (deleteError.status === 404 || deleteError.message?.includes('not found')) {
        return NextResponse.json({ success: true, note: 'Auth already deleted' });
      }
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
