import React from 'react';

/** Editorial underlined tab group — replaces the gray pill switcher. */
export function Tabs({ items, active, onChange }) {
  return (
    <div className="flex flex-wrap items-end gap-7 border-b border-bone mb-8 overflow-x-auto">
      {items.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`relative pb-3 text-sm whitespace-nowrap tracking-wide transition-colors ${
              isActive ? 'text-ink font-medium' : 'text-slate2 hover:text-ink'
            }`}
          >
            {t.label}
            {isActive && (
              <span className="absolute left-0 right-0 -bottom-[1px] h-[2px] bg-land-600" />
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Large serif-numeral stat tile — replaces the boxed indigo count. */
export function StatRow({ items }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-bone border border-bone mb-8">
      {items.map((s) => (
        <div key={s.label} className="bg-paper px-5 py-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted">{s.label}</p>
          <p className={`font-serif text-4xl font-semibold tracking-tightest leading-none mt-3 ${s.accent || 'text-ink'}`}>
            {s.value}
          </p>
          {s.hint && <p className="text-[11px] text-slate2 mt-2">{s.hint}</p>}
        </div>
      ))}
    </div>
  );
}

/** Empty-state sheet. */
export function Empty({ title, hint, action }) {
  return (
    <div className="panel text-center py-14">
      <p className="font-serif text-xl font-semibold text-ink tracking-tightest">{title}</p>
      {hint && <p className="text-sm text-slate2 mt-2 max-w-md mx-auto">{hint}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

/** Loader spinner in brand color. */
export function Spinner({ size = 8 }) {
  return (
    <div className="flex items-center justify-center py-16">
      <div
        className="animate-spin rounded-full border-b-2 border-land-600"
        style={{ width: `${size * 0.25}rem`, height: `${size * 0.25}rem` }}
      />
    </div>
  );
}

/** Page header with eyebrow + serif title. */
export function PageHeader({ eyebrow, title, subtitle, right }) {
  return (
    <div className="flex items-start justify-between gap-6 mb-8 flex-wrap">
      <div>
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-ink tracking-tightest leading-tight">
          {title}
        </h1>
        {subtitle && <p className="text-sm text-slate2 mt-2 max-w-2xl">{subtitle}</p>}
      </div>
      {right && <div className="flex items-center gap-3 flex-wrap">{right}</div>}
    </div>
  );
}

/** Standard transaction message banner. */
export function TxBanner({ message }) {
  if (!message) return null;
  const isError = message.startsWith('Error');
  return (
    <div
      className={`mb-5 px-4 py-3 rounded-sm text-sm border animate-rise ${
        isError
          ? 'bg-rose2/10 border-rose2/30 text-rose2'
          : 'bg-land-50 border-land-100 text-land-700'
      }`}
    >
      {message}
    </div>
  );
}
