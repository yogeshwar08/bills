import { ConfidenceLevel } from '../types';

export function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 0.85) return 'high';
  if (score >= 0.60) return 'medium';
  return 'low';
}

export function getConfidenceBadgeProps(score: number): {
  level: ConfidenceLevel;
  label: string;
  badgeClasses: string;
  dotClasses: string;
  iconColor: string;
  description: string;
} {
  const level = getConfidenceLevel(score);
  const percentage = Math.round(score * 100);

  switch (level) {
    case 'high':
      return {
        level,
        label: `${percentage}% High`,
        badgeClasses: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dotClasses: 'bg-emerald-500',
        iconColor: 'text-emerald-600',
        description: 'High confidence. Field appears clear and verified.'
      };
    case 'medium':
      return {
        level,
        label: `${percentage}% Medium`,
        badgeClasses: 'bg-amber-50 text-amber-700 border-amber-200',
        dotClasses: 'bg-amber-500',
        iconColor: 'text-amber-600',
        description: 'Moderate confidence. Please review for potential minor inaccuracies.'
      };
    case 'low':
      return {
        level,
        label: `${percentage}% Low`,
        badgeClasses: 'bg-rose-50 text-rose-700 border-rose-200',
        dotClasses: 'bg-rose-500',
        iconColor: 'text-rose-600',
        description: 'Low confidence. Requires manual verification due to blur, damage, or ambiguity.'
      };
  }
}

