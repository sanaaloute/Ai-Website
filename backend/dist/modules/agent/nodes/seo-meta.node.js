"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSeoMeta = runSeoMeta;
exports.seoMetaNode = seoMetaNode;
const route_discovery_1 = require("../utils/route-discovery");
const stream_writer_1 = require("../tools/stream-writer");
async function generateMetaDescription(state, deps) {
    const siteName = state.designSpec?.brandName || state.websiteCategory || 'Website';
    const prompt = `Write a concise, compelling SEO title (max 60 chars) and meta description (max 160 chars) for a ${state.websiteCategory || 'website'} called "${siteName}". The site does: ${state.scope || 'serve users'}. Respond with JSON only: { "title": "...", "description": "..." }`;
    try {
        const raw = await deps.aiGateway.chatCompletionsStream([{ role: 'user', content: prompt }], deps.modelResolver.resolveSequence('seo_meta'), state.aiCredentials, undefined, deps.signal);
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
            const parsed = JSON.parse(match[0]);
            return {
                title: parsed.title || String(siteName),
                description: parsed.description || `Welcome to ${siteName}.`,
            };
        }
    }
    catch (err) {
        deps.logger.warn(`SEO meta generation failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    return {
        title: String(siteName),
        description: `Welcome to ${siteName}.`,
    };
}
async function runSeoMeta(state, deps, previewUrl, routesSource) {
    const sandboxId = state.sandboxId;
    try {
        await deps.emit({
            type: 'status',
            data: { status: 'reviewing', message: 'Generating SEO meta tags, robots.txt, and sitemap...' },
        });
        const routes = (0, route_discovery_1.discoverRoutes)(routesSource, state.needsIntegration);
        const { title, description } = await generateMetaDescription(state, deps);
        const metaBlock = [
            `<title>${title}</title>`,
            `<meta name="description" content="${description}">`,
            `<meta property="og:title" content="${title}">`,
            `<meta property="og:description" content="${description}">`,
            `<meta property="og:type" content="website">`,
            `<meta name="twitter:card" content="summary_large_image">`,
        ].join('\n    ');
        let indexHtml = (await deps.e2b.readFile(sandboxId, 'index.html')) ?? '';
        if (indexHtml.includes('</head>')) {
            indexHtml = indexHtml.replace('</head>', `    ${metaBlock}\n  </head>`);
        }
        else {
            indexHtml = `<head>\n    ${metaBlock}\n  </head>\n${indexHtml}`;
        }
        await deps.e2b.writeFile(sandboxId, 'index.html', indexHtml);
        await deps.emit((0, stream_writer_1.createFileUpdateEvent)('index.html', indexHtml, 'modified'));
        const robotsTxt = `User-agent: *\nAllow: /\nSitemap: ${previewUrl}/sitemap.xml`;
        await deps.e2b.writeFile(sandboxId, 'public/robots.txt', robotsTxt);
        await deps.emit((0, stream_writer_1.createFileUpdateEvent)('public/robots.txt', robotsTxt, 'modified'));
        const today = new Date().toISOString().split('T')[0];
        const urlEntries = routes
            .map((route) => `  <url>\n    <loc>${previewUrl}${route}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`)
            .join('\n');
        const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>`;
        await deps.e2b.writeFile(sandboxId, 'public/sitemap.xml', sitemapXml);
        await deps.emit((0, stream_writer_1.createFileUpdateEvent)('public/sitemap.xml', sitemapXml, 'modified'));
        return {
            seoGenerated: true,
            messages: [{ role: 'assistant', content: `SEO meta generated for ${routes.length} routes` }],
        };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        deps.logger.error(`SEO meta node failed: ${message}`);
        return {
            seoGenerated: false,
            verificationFailures: [`seo_meta: ${message}`],
            messages: [{ role: 'assistant', content: `SEO generation error: ${message}` }],
        };
    }
}
async function seoMetaNode(state, deps) {
    const previewUrl = await deps.e2b.getPreviewUrl(state.sandboxId);
    const routesSource = (await deps.e2b.readFile(state.sandboxId, 'src/lib/routes.ts')) ?? '';
    return runSeoMeta(state, deps, previewUrl, routesSource);
}
//# sourceMappingURL=seo-meta.node.js.map