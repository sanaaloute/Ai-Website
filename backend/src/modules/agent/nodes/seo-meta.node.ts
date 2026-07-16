import { AgentState } from '../state';
import { GraphDependencies } from '../graph';
import { discoverRoutes } from '../utils/route-discovery';
import { createFileUpdateEvent } from '../tools/stream-writer';

export interface SeoMetaResult {
  seoGenerated: boolean;
  verificationFailures?: string[];
  messages: Array<{ role: string; content: string }>;
}

async function generateMetaDescription(state: AgentState, deps: GraphDependencies): Promise<{ title: string; description: string }> {
  const siteName = state.designSpec?.brandName || state.websiteCategory || 'Website';
  const prompt = `Write a concise, compelling SEO title (max 60 chars) and meta description (max 160 chars) for a ${state.websiteCategory || 'website'} called "${siteName}". The site does: ${state.scope || 'serve users'}. Respond with JSON only: { "title": "...", "description": "..." }`;

  try {
    const raw = await deps.aiGateway.chatCompletionsStream(
      [{ role: 'user', content: prompt }],
      deps.modelResolver.resolveSequence('seo_meta'),
      state.aiCredentials,
      undefined,
      deps.signal,
    );
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]) as { title?: string; description?: string };
      return {
        title: parsed.title || String(siteName),
        description: parsed.description || `Welcome to ${siteName}.`,
      };
    }
  } catch (err) {
    deps.logger.warn(`SEO meta generation failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  return {
    title: String(siteName),
    description: `Welcome to ${siteName}.`,
  };
}

export async function runSeoMeta(
  state: AgentState,
  deps: GraphDependencies,
  previewUrl: string,
  routesSource: string,
): Promise<SeoMetaResult> {
  const sandboxId = state.sandboxId;

  try {
    await deps.emit({
      type: 'status',
      data: { status: 'reviewing', message: 'Generating SEO meta tags, robots.txt, and sitemap...' },
    });

    const routes = discoverRoutes(routesSource, state.needsIntegration);

    const { title, description } = await generateMetaDescription(state, deps);

    const metaBlock = [
      `<title>${title}</title>`,
      `<meta name="description" content="${description}">`,
      `<meta property="og:title" content="${title}">`,
      `<meta property="og:description" content="${description}">`,
      `<meta property="og:type" content="website">`,
      `<meta name="twitter:card" content="summary_large_image">`,
    ].join('\n    ');

    // Update index.html
    let indexHtml = (await deps.e2b.readFile(sandboxId, 'index.html')) ?? '';
    if (indexHtml.includes('</head>')) {
      indexHtml = indexHtml.replace('</head>', `    ${metaBlock}\n  </head>`);
    } else {
      indexHtml = `<head>\n    ${metaBlock}\n  </head>\n${indexHtml}`;
    }
    await deps.e2b.writeFile(sandboxId, 'index.html', indexHtml);
    await deps.emit(createFileUpdateEvent('index.html', indexHtml, 'modified'));

    // robots.txt
    const robotsTxt = `User-agent: *\nAllow: /\nSitemap: ${previewUrl}/sitemap.xml`;
    await deps.e2b.writeFile(sandboxId, 'public/robots.txt', robotsTxt);
    await deps.emit(createFileUpdateEvent('public/robots.txt', robotsTxt, 'modified'));

    // sitemap.xml
    const today = new Date().toISOString().split('T')[0];
    const urlEntries = routes
      .map((route) => `  <url>\n    <loc>${previewUrl}${route}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`)
      .join('\n');
    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>`;
    await deps.e2b.writeFile(sandboxId, 'public/sitemap.xml', sitemapXml);
    await deps.emit(createFileUpdateEvent('public/sitemap.xml', sitemapXml, 'modified'));

    return {
      seoGenerated: true,
      messages: [{ role: 'assistant', content: `SEO meta generated for ${routes.length} routes` }],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    deps.logger.error(`SEO meta node failed: ${message}`);
    return {
      seoGenerated: false,
      verificationFailures: [`seo_meta: ${message}`],
      messages: [{ role: 'assistant', content: `SEO generation error: ${message}` }],
    };
  }
}

export async function seoMetaNode(
  state: AgentState,
  deps: GraphDependencies,
): Promise<Partial<AgentState>> {
  const previewUrl = await deps.e2b.getPreviewUrl(state.sandboxId);
  const routesSource = (await deps.e2b.readFile(state.sandboxId, 'src/lib/routes.ts')) ?? '';
  return runSeoMeta(state, deps, previewUrl, routesSource);
}
