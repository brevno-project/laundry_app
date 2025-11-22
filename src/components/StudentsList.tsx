"use client";

import { useLaundry } from '@/contexts/LaundryContext';

export default function StudentsList() {
  const { students } = useLaundry();

  if (!students || students.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">👥 Список студентов</h2>
        <p className="text-gray-700 text-lg">Студентов нет.</p>
      </div>
    );
  }

  // Сортируем по фамилии
  const sortedStudents = [...students].sort((a, b) => {
    const lastNameA = a.last_name?.toLowerCase() || '';
    const lastNameB = b.last_name?.toLowerCase() || '';
    return lastNameA.localeCompare(lastNameB);
  });

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">👥 Список студентов ({students.length})</h2>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-gray-300">
              <th className="text-left p-3 font-bold text-gray-900">#</th>
              <th className="text-left p-3 font-bold text-gray-900">Фамилия</th>
              <th className="text-left p-3 font-bold text-gray-900">Имя</th>
              <th className="text-left p-3 font-bold text-gray-900">Комната</th>
              <th className="text-left p-3 font-bold text-gray-900">Telegram</th>
            </tr>
          </thead>
          <tbody>
            {sortedStudents.map((student, index) => (
              <tr 
                key={student.id} 
                className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <td className="p-3 text-gray-700">{index + 1}</td>
                <td className="p-3 font-semibold text-gray-900">{student.last_name || '—'}</td>
                <td className="p-3 text-gray-900">{student.first_name || '—'}</td>
                <td className="p-3 text-gray-900">
                  {student.room ? (
                    <span className="bg-blue-100 text-blue-900 px-2 py-1 rounded font-semibold">
                      {student.room}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="p-3">
                  {student.telegram_chat_id ? (
                    <span className="text-green-600 font-semibold">✅ Подключен</span>
                  ) : (
                    <span className="text-gray-400">❌ Не подключен</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
