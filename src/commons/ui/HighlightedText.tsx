'use client';

import { cn, splitByMatchedTerms } from '../lib';

interface HighlightedTextProps {
  text: string;
  /** 굵게 칠할 단어들. 비어 있으면 원문을 그대로 그린다 */
  terms?: string[];
  className?: string;
  /** 매칭 구간에 얹을 클래스 */
  matchClassName?: string;
}

/** 검색어와 일치하는 구간만 강조해서 그리는 텍스트 */
export function HighlightedText({
  text,
  terms,
  className,
  matchClassName = 'font-bold text-emerald-600',
}: HighlightedTextProps) {
  if (!terms || terms.length === 0) return <span className={className}>{text}</span>;

  const segments = splitByMatchedTerms(text, terms);

  return (
    <span className={className}>
      {segments.map((segment, index) => (
        <span key={`${segment.text}-${index}`} className={cn(segment.matched && matchClassName)}>
          {segment.text}
        </span>
      ))}
    </span>
  );
}
