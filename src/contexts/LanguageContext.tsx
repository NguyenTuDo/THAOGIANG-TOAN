import React, { createContext, useContext, useState } from 'react';

export type Lang = 'vi' | 'en';

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Trả về bản tiếng Anh nếu đang ở chế độ EN và có bản dịch, ngược lại trả tiếng Việt */
  t: (vi: string, en?: string) => string;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('vi');

  const t = (vi: string, en?: string): string =>
    lang === 'en' && en ? en : vi;

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within LangProvider');
  return ctx;
}

/** Map category VI → EN */
export const CATEGORY_EN: Record<string, string> = {
  'Di sản học đường': 'Academic Heritage',
  'Danh lam thắng cảnh': 'Landmark',
  'Ẩm thực': 'Food & Dining',
  'Mua sắm': 'Shopping',
  'Bảo tàng': 'Museum',
  'Công viên': 'Park',
  'Khách sạn': 'Hotel',
};
