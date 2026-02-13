import { redirect } from 'next/navigation';

import { format } from 'date-fns';

import { createClient } from '@/commons/api/supabase/server';

export default async function MealPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const today = format(new Date(), 'yyyy년 M월 d일');

  return (
    <div className="flex flex-col gap-6 px-5 py-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{today}</p>
          <h1 className="text-xl font-bold">식단표</h1>
        </div>
      </header>

      <section className="flex flex-col gap-3">
        {['아침', '점심', '저녁'].map((meal) => (
          <div key={meal} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <h2 className="mb-2 text-sm font-semibold text-gray-700">{meal}</h2>
            <p className="text-sm text-gray-400">아직 등록된 식단이 없습니다</p>
          </div>
        ))}
      </section>
    </div>
  );
}
