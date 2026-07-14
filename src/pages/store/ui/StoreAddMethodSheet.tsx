'use client';

import { PenLine, ScanText } from 'lucide-react';

import { BottomSheet } from '@/commons/ui';

interface StoreAddMethodSheetProps {
  open: boolean;
  onClose: () => void;
  onDirectAdd: () => void;
  onPromptAdd: () => void;
}

interface MethodItemProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  description: string;
  onClick: () => void;
}

function MethodItem({ icon, iconBg, label, description, onClick }: MethodItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl px-3 py-4 text-left text-gray-800 transition-colors active:bg-gray-100"
    >
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
        {icon}
      </span>
      <div className="flex flex-col">
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-xs text-gray-400">{description}</span>
      </div>
    </button>
  );
}

export function StoreAddMethodSheet({
  open,
  onClose,
  onDirectAdd,
  onPromptAdd,
}: StoreAddMethodSheetProps) {
  return (
    <BottomSheet.Root open={open} onClose={onClose}>
      <BottomSheet.Content className="flex flex-col gap-2 px-4 pt-3 pb-6">
        <MethodItem
          icon={<PenLine className="size-5 text-emerald-600" />}
          iconBg="bg-emerald-50"
          label="직접 입력"
          description="항목을 직접 입력해요"
          onClick={onDirectAdd}
        />
        <MethodItem
          icon={<ScanText className="size-5 text-blue-600" />}
          iconBg="bg-blue-50"
          label="영수증 업로드"
          description="영수증으로 한번에 입력해요"
          onClick={onPromptAdd}
        />
      </BottomSheet.Content>
    </BottomSheet.Root>
  );
}
