'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { ChatMessage } from '@/hooks/useWorkspaceChat';

type BrandingData = NonNullable<NonNullable<ChatMessage['metadata']>['brandingData']>;

interface BrandingDataCardProps {
  brandingData: BrandingData;
  sourceUrl?: string;
}

function ColorSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-6 h-6 rounded-md border border-white/[0.08] shrink-0"
        style={{ backgroundColor: color }}
      />
      <div className="min-w-0">
        <div className="text-[10px] text-zinc-500 font-medium">{label}</div>
        <div className="text-[10px] text-zinc-400 font-mono truncate">{color}</div>
      </div>
    </div>
  );
}

export function BrandingDataCard({ brandingData, sourceUrl }: BrandingDataCardProps) {
  const t = useTranslations('generation');

  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-white/[0.06] bg-black/40 max-w-[420px]">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/[0.06] bg-white/[0.02] flex items-center gap-2">
        <Image
          src={`https://www.google.com/s2/favicons?domain=${sourceUrl}&sz=32`}
          alt=""
          width={16}
          height={16}
          className="w-4 h-4 rounded"
        />
        <span className="text-xs font-medium text-zinc-300">{t('branding.title')}</span>
        {brandingData.colorScheme && (
          <span className="ml-auto text-[10px] text-zinc-500 capitalize">{t('branding.colorSchemeMode', { scheme: brandingData.colorScheme })}</span>
        )}
      </div>

      <div className="p-3 space-y-3">
        {/* Colors */}
        {brandingData.colors && (
          <div>
            <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-2">{t('branding.colors')}</div>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {brandingData.colors.primary && <ColorSwatch color={brandingData.colors.primary} label={t('branding.primary')} />}
              {brandingData.colors.accent && <ColorSwatch color={brandingData.colors.accent} label={t('branding.accent')} />}
              {brandingData.colors.background && <ColorSwatch color={brandingData.colors.background} label={t('branding.bg')} />}
              {brandingData.colors.textPrimary && <ColorSwatch color={brandingData.colors.textPrimary} label={t('branding.text')} />}
            </div>
          </div>
        )}

        {/* Typography */}
        {brandingData.typography && (
          <div>
            <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">{t('branding.typography')}</div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
              {brandingData.typography.fontFamilies?.primary && (
                <span><span className="text-zinc-500">{t('branding.primary')}:</span> {brandingData.typography.fontFamilies.primary}</span>
              )}
              {brandingData.typography.fontFamilies?.heading && (
                <span><span className="text-zinc-500">{t('branding.heading')}:</span> {brandingData.typography.fontFamilies.heading}</span>
              )}
              {brandingData.typography.fontSizes?.body && (
                <span><span className="text-zinc-500">{t('branding.body')}:</span> {brandingData.typography.fontSizes.body}</span>
              )}
            </div>
          </div>
        )}

        {/* Spacing */}
        {brandingData.spacing && (
          <div>
            <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">{t('branding.spacing')}</div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
              {brandingData.spacing.baseUnit && (
                <span><span className="text-zinc-500">{t('branding.base')}:</span> {brandingData.spacing.baseUnit}px</span>
              )}
              {brandingData.spacing.borderRadius && (
                <span><span className="text-zinc-500">{t('branding.radius')}:</span> {brandingData.spacing.borderRadius}</span>
              )}
            </div>
          </div>
        )}

        {/* Button preview */}
        {brandingData.components?.buttonPrimary && (
          <div>
            <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">{t('branding.button')}</div>
            <button
              className="px-3 py-1 text-xs font-medium rounded-md transition hover:opacity-90"
              style={{
                backgroundColor: brandingData.components.buttonPrimary.background,
                color: brandingData.components.buttonPrimary.textColor,
                borderRadius: brandingData.components.buttonPrimary.borderRadius,
              }}
            >
              {t('branding.sample')}
            </button>
          </div>
        )}

        {/* Personality */}
        {brandingData.personality && (
          <div className="text-xs text-zinc-400">
            <span className="text-zinc-500">{t('branding.tone')}:</span>{' '}
            <span className="text-zinc-300 capitalize">{brandingData.personality.tone}</span>
            {brandingData.personality.energy && (
              <>, <span className="text-zinc-500">{t('branding.energy')}:</span> <span className="text-zinc-300 capitalize">{brandingData.personality.energy}</span></>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
