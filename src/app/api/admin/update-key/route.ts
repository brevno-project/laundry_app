import { NextRequest, NextResponse } from "next/server";
import { getCaller, requireLaundryAdmin } from "../../_utils/adminAuth";

export async function POST(request: NextRequest) {
  try {
    const { caller, error: authError } = await getCaller(request);
    if (authError) return authError;

    const roleError = requireLaundryAdmin(caller);
    if (roleError) return roleError;

    if (!caller.is_super_admin) {
      return NextResponse.json(
        { error: "Only super admin can update the key" },
        { status: 403 }
      );
    }

    const { newKey } = await request.json();

    if (!newKey || newKey.length < 6) {
      return NextResponse.json(
        { error: "Ключ должен быть минимум 6 символов" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Ключ обновлён",
    });
  } catch (error) {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
