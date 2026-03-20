import { useState, useMemo } from 'react';
import { useCardConfig } from '../context';
import { validateCompliance } from '../compliance';
import type { ComplianceRule, ComplianceSeverity } from '../compliance/types';
import type { CardConfig } from '../types';
import ComplianceFixPreview, { getFieldLabel, formatValue } from './ComplianceFixPreview';
import type { FixChange } from './ComplianceFixPreview';

function severityIcon(severity: ComplianceSeverity) {
  switch (severity) {
    case 'error': return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 mt-0.5">
        <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 4v3.5M7 9.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
    case 'warning': return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 mt-0.5">
        <path d="M7 1.5L13 12.5H1L7 1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M7 6v2.5M7 10.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    );
    case 'info': return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 mt-0.5">
        <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3" />
        <path d="M7 6v4M7 4v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    );
  }
}

function severityColors(severity: ComplianceSeverity, isDark: boolean) {
  switch (severity) {
    case 'error': return {
      border: isDark ? 'border-red-500/40' : 'border-red-300',
      bg: isDark ? 'bg-red-500/5' : 'bg-red-50',
      icon: isDark ? 'text-red-400' : 'text-red-500',
      title: isDark ? 'text-red-300' : 'text-red-700',
      text: isDark ? 'text-red-400/80' : 'text-red-600',
      badge: isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-700',
    };
    case 'warning': return {
      border: isDark ? 'border-amber-500/30' : 'border-amber-300',
      bg: isDark ? 'bg-amber-500/5' : 'bg-amber-50',
      icon: isDark ? 'text-amber-400' : 'text-amber-500',
      title: isDark ? 'text-amber-300' : 'text-amber-700',
      text: isDark ? 'text-amber-400/80' : 'text-amber-600',
      badge: isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700',
    };
    case 'info': return {
      border: isDark ? 'border-sky-500/20' : 'border-sky-200',
      bg: isDark ? 'bg-sky-500/5' : 'bg-sky-50',
      icon: isDark ? 'text-sky-400' : 'text-sky-500',
      title: isDark ? 'text-sky-300' : 'text-sky-700',
      text: isDark ? 'text-sky-400/80' : 'text-sky-600',
      badge: isDark ? 'bg-sky-500/15 text-sky-300' : 'bg-sky-100 text-sky-700',
    };
  }
}

function ScoreBadge({ score, isDark }: { score: number; isDark: boolean }) {
  const color = score >= 80
    ? (isDark ? 'text-emerald-400' : 'text-emerald-600')
    : score >= 50
      ? (isDark ? 'text-amber-400' : 'text-amber-600')
      : (isDark ? 'text-red-400' : 'text-red-600');

  const ringColor = score >= 80
    ? 'stroke-emerald-500'
    : score >= 50
      ? 'stroke-amber-500'
      : 'stroke-red-500';

  const circumference = 2 * Math.PI * 18;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex items-center gap-2">
      <div className="relative w-11 h-11">
        <svg width="44" height="44" viewBox="0 0 44 44" className="transform -rotate-90">
          <circle cx="22" cy="22" r="18" fill="none" stroke={isDark ? '#334155' : '#e2e8f0'} strokeWidth="3" />
          <circle
            cx="22" cy="22" r="18" fill="none"
            className={ringColor}
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${color}`}>
          {score}
        </span>
      </div>
    </div>
  );
}

function RuleCard({
  rule,
  isDark,
  onAutoFix,
}: {
  rule: ComplianceRule;
  isDark: boolean;
  onAutoFix?: (fix: Partial<CardConfig>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const colors = severityColors(rule.severity, isDark);

  return (
    <div className={`rounded-lg border ${colors.border} ${colors.bg} p-2.5`}>
      <div className="flex items-start gap-2">
        <span className={colors.icon}>{severityIcon(rule.severity)}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <p className={`text-xs font-semibold leading-tight ${colors.title}`}>
              {rule.title}
            </p>
            <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${colors.badge}`}>
              {rule.jurisdiction}
            </span>
          </div>
          <p className={`text-xs mt-0.5 leading-relaxed ${colors.text}`}>
            {rule.message}
          </p>

          {/* Expandable explanation */}
          <button
            onClick={() => setExpanded(!expanded)}
            className={`text-xs mt-1.5 font-medium flex items-center gap-0.5 transition-colors ${
              isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <svg
              width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5"
              className={`transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
            >
              <path d="M2 1L5.5 4L2 7" />
            </svg>
            {expanded ? 'Hide details' : 'Why?'}
          </button>

          {expanded && (
            <div className={`mt-2 text-xs leading-relaxed space-y-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <p>{rule.explanation}</p>
              {rule.regulationRef && (
                <p className={`text-xs font-mono ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                  Ref: {rule.regulationRef}
                </p>
              )}
              {rule.suggestedFix && (
                <p className={`text-xs ${isDark ? 'text-sky-400/80' : 'text-sky-600'}`}>
                  Fix: {rule.suggestedFix}
                </p>
              )}
            </div>
          )}

          {/* Auto-fix button */}
          {rule.autoFixable && rule.autoFix && onAutoFix && (
            <button
              onClick={() => onAutoFix(rule.autoFix!)}
              className={`mt-2 text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${
                isDark
                  ? 'bg-sky-500/20 text-sky-300 hover:bg-sky-500/30'
                  : 'bg-sky-100 text-sky-700 hover:bg-sky-200'
              }`}
            >
              Apply fix
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CompliancePanel({ isDark }: { isDark: boolean }) {
  const { config, updateConfig } = useCardConfig();
  const result = useMemo(() => validateCompliance(config), [config]);
  const [showInfos, setShowInfos] = useState(false);
  const [showFixPreview, setShowFixPreview] = useState(false);

  const fixableRules = useMemo(
    () => result.rules.filter(r => r.autoFixable && r.autoFix),
    [result.rules],
  );

  const mergedFix = useMemo(
    () => Object.assign({}, ...fixableRules.map(r => r.autoFix!)) as Partial<CardConfig>,
    [fixableRules],
  );

  const fixChanges = useMemo<FixChange[]>(() => {
    return Object.entries(mergedFix)
      .filter(([key, value]) => {
        const current = config[key as keyof CardConfig];
        return current !== value;
      })
      .map(([key, value]) => ({
        field: key,
        label: getFieldLabel(key),
        currentValue: formatValue(config[key as keyof CardConfig]),
        newValue: formatValue(value),
      }));
  }, [mergedFix, config]);

  if (result.rules.length === 0) {
    return (
      <div className={`flex items-center gap-3 px-1 py-2 ${isDark ? 'text-emerald-400/80' : 'text-emerald-600'}`}>
        <ScoreBadge score={100} isDark={isDark} />
        <div>
          <p className="text-xs font-semibold">All checks pass</p>
          <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>No compliance issues found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="flex items-center gap-3">
        <ScoreBadge score={result.score} isDark={isDark} />
        <div className="flex-1">
          <div className="flex flex-wrap gap-2 text-xs font-medium">
            {result.errors.length > 0 && (
              <span className={isDark ? 'text-red-400' : 'text-red-600'}>
                {result.errors.length} error{result.errors.length !== 1 ? 's' : ''}
              </span>
            )}
            {result.warnings.length > 0 && (
              <span className={isDark ? 'text-amber-400' : 'text-amber-600'}>
                {result.warnings.length} warning{result.warnings.length !== 1 ? 's' : ''}
              </span>
            )}
            {result.infos.length > 0 && (
              <span className={isDark ? 'text-sky-400' : 'text-sky-600'}>
                {result.infos.length} info
              </span>
            )}
          </div>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
            {result.passesNetworkCert ? 'Passes network certification' : 'Fails network certification'}
          </p>
        </div>
      </div>

      {/* Fix All button */}
      {fixChanges.length > 0 && (
        <button
          onClick={() => setShowFixPreview(true)}
          className={`w-full text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
            isDark
              ? 'bg-sky-500/20 text-sky-300 hover:bg-sky-500/30'
              : 'bg-sky-100 text-sky-700 hover:bg-sky-200'
          }`}
        >
          Fix All ({fixChanges.length} issue{fixChanges.length !== 1 ? 's' : ''})
        </button>
      )}

      {/* Fix preview modal */}
      <ComplianceFixPreview
        open={showFixPreview}
        onClose={() => setShowFixPreview(false)}
        onApply={() => updateConfig(mergedFix)}
        changes={fixChanges}
        isDark={isDark}
      />

      {/* Errors */}
      {result.errors.length > 0 && (
        <div className="space-y-2">
          {result.errors.map(r => (
            <RuleCard key={r.id} rule={r} isDark={isDark} onAutoFix={updateConfig} />
          ))}
        </div>
      )}

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="space-y-2">
          {result.warnings.map(r => (
            <RuleCard key={r.id} rule={r} isDark={isDark} onAutoFix={updateConfig} />
          ))}
        </div>
      )}

      {/* Info toggle */}
      {result.infos.length > 0 && (
        <div>
          <button
            onClick={() => setShowInfos(!showInfos)}
            className={`text-xs font-medium flex items-center gap-1 transition-colors ${
              isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <svg
              width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5"
              className={`transition-transform duration-150 ${showInfos ? 'rotate-90' : ''}`}
            >
              <path d="M2 1L5.5 4L2 7" />
            </svg>
            {result.infos.length} best practice suggestion{result.infos.length !== 1 ? 's' : ''}
          </button>
          {showInfos && (
            <div className="mt-2 space-y-2">
              {result.infos.map(r => (
                <RuleCard key={r.id} rule={r} isDark={isDark} onAutoFix={updateConfig} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Badge for the section header — shows error/warning count
export function ComplianceBadge({ isDark }: { isDark: boolean }) {
  const { config } = useCardConfig();
  const result = useMemo(() => validateCompliance(config), [config]);

  if (result.errors.length === 0 && result.warnings.length === 0) {
    return <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>OK</span>;
  }

  if (result.errors.length > 0) {
    return <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700'}`}>{result.errors.length + result.warnings.length}</span>;
  }

  return <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>{result.warnings.length}</span>;
}
