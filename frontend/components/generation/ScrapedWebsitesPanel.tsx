'use client';

interface ScrapedSiteContent {
  metadata?: {
    sourceURL?: string;
    favicon?: string;
    ogSiteName?: string;
    title?: string;
  };
  screenshot?: string;
}

interface ScrapedWebsite {
  url: string;
  content?: unknown;
}

interface ScrapedWebsitesPanelProps {
  scrapedWebsites: ScrapedWebsite[];
  screenshotCollapsed: boolean;
  setScreenshotCollapsed: (collapsed: boolean) => void;
}

export function ScrapedWebsitesPanel({
  scrapedWebsites,
  screenshotCollapsed,
  setScreenshotCollapsed,
}: ScrapedWebsitesPanelProps) {
  if (scrapedWebsites.length === 0) return null;

  return (
    <div className="shrink-0 border-b border-white/[0.06] bg-white/[0.02] p-3">
      <div className="flex flex-col gap-2">
        {scrapedWebsites.map((site, idx) => {
          const siteContent = (site.content || {}) as ScrapedSiteContent;
          const metadata = siteContent.metadata || {};
          const sourceURL = metadata.sourceURL || site.url;
          let sourceHost = sourceURL;
          try {
            sourceHost = new URL(sourceURL).hostname;
          } catch {
            // Keep fallback host
          }
          const favicon =
            metadata.favicon ||
            `https://www.google.com/s2/favicons?domain=${sourceHost}&sz=128`;
          const siteName = metadata.ogSiteName || metadata.title || sourceHost;
          const screenshot =
            siteContent.screenshot || (typeof window !== 'undefined' ? sessionStorage.getItem('websiteScreenshot') : null);

          return (
            <div key={idx} className="flex flex-col gap-2">
              {/* Site info with favicon */}
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={favicon}
                  alt={siteName}
                  className="w-4 h-4 rounded"
                  onError={(e) => {
                    e.currentTarget.src = `https://www.google.com/s2/favicons?domain=${sourceHost}&sz=128`;
                  }}
                />
                <a
                  href={sourceURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate max-w-[200px] text-xs font-medium text-zinc-400 transition hover:text-glow-cyan"
                  title={sourceURL}
                >
                  {siteName}
                </a>
              </div>

              {/* Pinned screenshot */}
              {screenshot && (
                <div className="w-full">
                  <button
                    onClick={() => setScreenshotCollapsed(!screenshotCollapsed)}
                    className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors mb-1"
                    aria-label={screenshotCollapsed ? 'Expand screenshot' : 'Collapse screenshot'}
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 16 16"
                      fill="none"
                      className={`transition-transform duration-200 ${screenshotCollapsed ? 'rotate-180' : ''}`}
                    >
                      <path
                        d="M4 6L8 10L12 6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Screenshot
                  </button>
                  <div
                    className="w-full overflow-hidden rounded-lg border border-white/[0.06] transition-all duration-300"
                    style={{
                      opacity: screenshotCollapsed ? 0 : 1,
                      transform: screenshotCollapsed ? 'translateY(-8px)' : 'translateY(0)',
                      pointerEvents: screenshotCollapsed ? 'none' : 'auto',
                      maxHeight: screenshotCollapsed ? '0' : '160px',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={screenshot}
                      alt={`${siteName} preview`}
                      className="w-full h-auto object-cover"
                      style={{ maxHeight: '160px' }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
