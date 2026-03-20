import React from 'react';
import { networkLast4, cardTypeLabels, presetColors, networkTierConfig, networkNames } from '../data';
import type { CardConfig } from '../types';

// ─── Helpers ─────────────────────────────────────────────────
export function getWalletCardStyle(config: {
  colorMode: string;
  solidColor: string;
  presetColor: string;
  gradientConfig: { stops: { color: string; position: number }[]; angle: number };
}): React.CSSProperties {
  if (config.colorMode === 'gradient') {
    const { stops, angle } = config.gradientConfig;
    const sorted = [...stops].sort((a, b) => a.position - b.position);
    const cssStops = sorted.map(s => `${s.color} ${s.position}%`).join(', ');
    return { background: `linear-gradient(${angle}deg, ${cssStops})` };
  }
  if (config.colorMode === 'preset') {
    const preset = presetColors[config.presetColor];
    if (preset?.gradient) {
      return {
        background: `linear-gradient(135deg, ${preset.gradient[0]}, ${preset.gradient[1]})`,
      };
    }
    return { background: preset?.value || '#0F172A' };
  }
  return { background: config.solidColor };
}

export function getWalletCardTextColor(config: {
  colorMode: string;
  solidColor: string;
  presetColor: string;
  textColorOverride: string | null;
  gradientConfig: { stops: { color: string; position: number }[] };
}): string {
  if (config.textColorOverride) return config.textColorOverride;

  let bgColor = config.solidColor;
  if (config.colorMode === 'preset') {
    const preset = presetColors[config.presetColor];
    if (preset) bgColor = preset.value;
  } else if (config.colorMode === 'gradient') {
    bgColor = config.gradientConfig.stops[0]?.color || '#0F172A';
  }
  const hex = bgColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#1a1a1a' : '#ffffff';
}

// ─── Phone Frame ─────────────────────────────────────────────
export function PhoneFrame({
  isDark,
  children,
}: {
  isDark: boolean;
  children: React.ReactNode;
}) {
  const frameColor = '#1a1a1a';
  const screenBg = isDark ? '#000000' : '#f2f2f7';

  return (
    <div
      className="relative rounded-[36px] p-[6px] shadow-2xl"
      style={{ background: frameColor, width: 280 }}
    >
      {/* Dynamic Island */}
      <div
        className="absolute top-[12px] left-1/2 -translate-x-1/2 w-[80px] h-[22px] rounded-full z-10"
        style={{ background: '#000' }}
      />

      {/* Screen */}
      <div
        className="rounded-[30px] overflow-hidden relative"
        style={{ background: screenBg, height: 560 }}
      >
        {/* Status Bar */}
        <div className="flex justify-between items-center px-6 pt-4 pb-1 relative z-20">
          <span
            className="text-xs font-semibold"
            style={{ color: isDark ? '#fff' : '#000' }}
          >
            9:41
          </span>
          <div className="flex items-center gap-1">
            <svg width="16" height="10" viewBox="0 0 16 10" fill={isDark ? '#fff' : '#000'}>
              <rect x="0" y="6" width="3" height="4" rx="0.5" />
              <rect x="4" y="4" width="3" height="6" rx="0.5" />
              <rect x="8" y="2" width="3" height="8" rx="0.5" />
              <rect x="12" y="0" width="3" height="10" rx="0.5" />
            </svg>
            <svg width="20" height="10" viewBox="0 0 20 10" fill={isDark ? '#fff' : '#000'}>
              <rect x="0" y="0" width="18" height="10" rx="2" stroke={isDark ? '#fff' : '#000'} strokeWidth="1" fill="none" />
              <rect x="2" y="2" width="12" height="6" rx="1" />
              <rect x="18" y="3" width="2" height="4" rx="0.5" />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="px-3 mt-1">{children}</div>
      </div>
    </div>
  );
}

// ─── Apple Wallet View ───────────────────────────────────────
export function AppleWalletView({ config }: { config: CardConfig }) {
  const isDark = config.walletDarkMode;
  const cardBgStyle = getWalletCardStyle(config);
  const cardTextColor = getWalletCardTextColor(config);
  const last4 = networkLast4[config.network];
  const textColor = isDark ? '#fff' : '#000';
  const subColor = isDark ? '#8e8e93' : '#6e6e73';
  const ct = cardTextColor;
  const ctSub = cardTextColor === '#ffffff' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';

  return (
    <div>
      {/* NFC indicator */}
      {config.contactless && (
        <div className="flex justify-center mb-2">
          <div className="px-3 py-1 rounded-full text-xs font-medium"
               style={{ background: isDark ? '#1c1c1e' : '#e5e5ea', color: subColor }}>
            Hold Near Reader
          </div>
        </div>
      )}

      {/* Card */}
      <div
        className="rounded-xl p-4 shadow-lg mb-3 relative overflow-hidden"
        style={{ ...cardBgStyle, minHeight: 160 }}
      >
        {config.cardArt && (
          <div
            className="absolute inset-0 bg-center bg-no-repeat bg-cover"
            style={{
              backgroundImage: `url(${config.cardArt})`,
              opacity: config.cardArtOpacity / 100,
            }}
          />
        )}
        {/* Issuer */}
        <div className="text-sm font-semibold mb-6 drop-shadow-sm relative" style={{ color: ct }}>
          {config.issuerName}
        </div>

        {/* Network badge */}
        <div className="absolute top-3 right-4 flex items-center gap-1.5 z-[1]">
          <img src={`/logos/${config.network}.svg`} alt="" className="h-3.5 object-contain" />
        </div>

        {/* Card number area */}
        <div className="absolute bottom-4 left-4 z-[1]">
          <div className="text-xs mb-0.5" style={{ color: ctSub }}>
            {cardTypeLabels[config.cardType]}
          </div>
          <div className="text-sm font-mono tracking-wider" style={{ color: ct }}>
            &bull;&bull;&bull;&bull; {last4}
          </div>
        </div>
      </div>

      {/* Card Details Section */}
      <div
        className="rounded-xl p-3"
        style={{ background: isDark ? '#1c1c1e' : '#ffffff' }}
      >
        <div className="text-xs font-semibold mb-2" style={{ color: textColor }}>
          Card Details
        </div>
        <div className="space-y-2">
          <DetailRow label="Cardholder" value={config.cardholderName} isDark={isDark} />
          <DetailRow label="Network" value={networkNames[config.network as keyof typeof networkNames]} isDark={isDark} />
          {config.tier && networkTierConfig[config.network as keyof typeof networkTierConfig] && (
            <DetailRow
              label="Tier"
              value={networkTierConfig[config.network as keyof typeof networkTierConfig]?.find(t => t.id === config.tier)?.fullLabel || config.tier}
              isDark={isDark}
            />
          )}
          <DetailRow label="Card Number" value={`\u2022\u2022\u2022\u2022 ${last4}`} isDark={isDark} />
        </div>
      </div>

      {/* Recent Transactions */}
      <div
        className="rounded-xl p-3 mt-2"
        style={{ background: isDark ? '#1c1c1e' : '#ffffff' }}
      >
        <div className="text-xs font-semibold mb-2" style={{ color: textColor }}>
          Latest Transactions
        </div>
        <div className="space-y-2">
          {[
            { name: 'Blue Bottle Coffee', amount: '-$5.40', date: 'Today' },
            { name: 'Whole Foods Market', amount: '-$67.23', date: 'Yesterday' },
            { name: 'Uber', amount: '-$18.50', date: 'Mar 10' },
          ].map(tx => (
            <div key={tx.name} className="flex justify-between items-center">
              <div>
                <div className="text-xs font-medium" style={{ color: isDark ? '#fff' : '#000' }}>{tx.name}</div>
                <div className="text-[9px]" style={{ color: subColor }}>{tx.date}</div>
              </div>
              <div className="text-xs font-medium" style={{ color: isDark ? '#fff' : '#000' }}>{tx.amount}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, isDark }: { label: string; value: string; isDark: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs" style={{ color: isDark ? '#8e8e93' : '#6e6e73' }}>
        {label}
      </span>
      <span
        className="text-xs font-medium"
        style={{ color: isDark ? '#fff' : '#000' }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Google Wallet View ──────────────────────────────────────
export function GoogleWalletView({ config }: { config: CardConfig }) {
  const isDark = config.walletDarkMode;
  const cardBgStyle = getWalletCardStyle(config);
  const cardTextColor = getWalletCardTextColor(config);
  const last4 = networkLast4[config.network];
  const textColor = isDark ? '#e3e3e3' : '#1f1f1f';
  const subColor = isDark ? '#9aa0a6' : '#5f6368';
  const surfaceColor = isDark ? '#303134' : '#ffffff';
  const ct = cardTextColor;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className="text-sm font-medium" style={{ color: textColor }}>
          Google Wallet
        </div>
      </div>

      {/* Card carousel */}
      <div className="overflow-hidden">
        <div
          className="rounded-2xl p-4 shadow-md relative overflow-hidden"
          style={{ ...cardBgStyle, minHeight: 140 }}
        >
          {config.cardArt && (
            <div
              className="absolute inset-0 bg-center bg-no-repeat bg-cover"
              style={{
                backgroundImage: `url(${config.cardArt})`,
                opacity: config.cardArtOpacity / 100,
              }}
            />
          )}
          <div className="text-sm font-medium drop-shadow-sm relative" style={{ color: ct }}>
            {config.issuerName}
          </div>
          <div className="absolute top-3 right-4 flex items-center gap-1.5 z-[1]">
            <img src={`/logos/${config.network}.svg`} alt="" className="h-3.5 object-contain" />
          </div>
          <div className="absolute bottom-3 left-4 text-xs font-mono z-[1]" style={{ color: ct, opacity: 0.8 }}>
            &bull;&bull;&bull;&bull; {last4}
          </div>
        </div>
      </div>

      {/* Tap to pay button */}
      <button
        className="w-full mt-3 py-2.5 rounded-full text-sm font-medium"
        style={{
          background: '#4285f4',
          color: '#ffffff',
        }}
      >
        Tap to pay
      </button>

      {/* Payment methods section */}
      <div className="mt-4 rounded-xl p-3" style={{ background: surfaceColor }}>
        <div className="text-xs font-medium mb-2" style={{ color: textColor }}>
          Payment methods
        </div>
        <div className="flex items-center gap-2 py-1.5">
          <div
            className="w-8 h-5 rounded"
            style={cardBgStyle}
          />
          <div>
            <div className="text-xs font-medium" style={{ color: textColor }}>
              {config.issuerName} &bull;&bull;&bull;&bull; {last4}
            </div>
            <div className="text-[9px]" style={{ color: subColor }}>
              Default
            </div>
          </div>
        </div>
      </div>

      {/* Passes section */}
      <div className="mt-2 rounded-xl p-3" style={{ background: surfaceColor }}>
        <div className="text-xs font-medium mb-2" style={{ color: textColor }}>
          Passes
        </div>
        <div className="flex items-center gap-2 py-1">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs" style={{ background: isDark ? '#1a73e8' : '#4285f4', color: '#fff' }}>
            SB
          </div>
          <div>
            <div className="text-xs font-medium" style={{ color: textColor }}>Starbucks Rewards</div>
            <div className="text-[9px]" style={{ color: subColor }}>142 Stars</div>
          </div>
        </div>
      </div>
    </div>
  );
}
