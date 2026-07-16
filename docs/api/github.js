// Cached GitHub release metadata for the AnchorCast website.
// Optional Vercel environment variable:
//   GITHUB_TOKEN=<fine-grained read-only token for public repository metadata>
// The browser never receives the token. Vercel's CDN caches successful responses.

const REPOSITORY = 'anchorcastapp-team/anchorcastapp';
const GITHUB_API = `https://api.github.com/repos/${REPOSITORY}`;
const CACHE_HEADER = 'public, max-age=0, s-maxage=600, stale-while-revalidate=60, stale-if-error=86400';

function githubHeaders() {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'AnchorCast-Website',
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

function extensionOf(name = '') {
  const match = String(name).toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : '';
}

function classifyAsset(name = '') {
  const lower = String(name).toLowerCase();
  const extension = extensionOf(lower);

  let platform = 'other';
  if (extension === 'exe' || /(?:^|[_\-.])(win|windows)(?:[_\-.]|$)/.test(lower)) platform = 'windows';
  else if (extension === 'dmg' || /(?:^|[_\-.])(mac|macos|darwin)(?:[_\-.]|$)/.test(lower)) platform = 'macos';
  else if (extension === 'deb' || extension === 'appimage' || /linux/.test(lower)) platform = 'linux';

  let variant = 'standard';
  if (/light|lite|minimal/.test(lower)) variant = 'light';
  else if (/full|offline|bundled/.test(lower)) variant = 'full';
  else if (/portable/.test(lower)) variant = 'portable';
  else if (/update|blockmap|latest.*\.ya?ml/.test(lower)) variant = 'update';

  let arch = 'universal';
  if (/arm64|aarch64|apple[-_ ]?silicon/.test(lower)) arch = 'arm64';
  else if (/x64|x86_64|amd64|intel/.test(lower)) arch = 'x64';
  else if (/ia32|x86(?!_64)/.test(lower)) arch = 'x86';

  return { platform, variant, arch, extension };
}

function normalizeAsset(asset) {
  const classified = classifyAsset(asset.name);
  return {
    id: asset.id,
    name: asset.name,
    url: asset.browser_download_url,
    size: asset.size || 0,
    downloadCount: asset.download_count || 0,
    contentType: asset.content_type || '',
    updatedAt: asset.updated_at || null,
    ...classified,
  };
}

async function githubJson(path) {
  const response = await fetch(`${GITHUB_API}${path}`, { headers: githubHeaders() });
  if (!response.ok) {
    const remaining = response.headers.get('x-ratelimit-remaining');
    const reset = response.headers.get('x-ratelimit-reset');
    const detail = await response.text().catch(() => '');
    const error = new Error(`GitHub request failed (${response.status})`);
    error.status = response.status;
    error.remaining = remaining;
    error.reset = reset;
    error.detail = detail.slice(0, 500);
    throw error;
  }
  return response.json();
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', CACHE_HEADER);
  res.setHeader('Vercel-CDN-Cache-Control', CACHE_HEADER);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Accept');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    // Three upstream calls per CDN cache fill. The dedicated /releases/latest
    // endpoint is the source of truth for the release GitHub marks as Latest.
    // The full releases list is used only for aggregate download totals.
    const [repository, releasesRaw, latestRaw] = await Promise.all([
      githubJson(''),
      githubJson('/releases?per_page=100'),
      githubJson('/releases/latest').catch((error) => {
        // A repository with no full release returns 404. Keep a conservative
        // fallback to the release list so the endpoint remains usable.
        if (error && error.status === 404) return null;
        throw error;
      }),
    ]);

    const releases = Array.isArray(releasesRaw)
      ? releasesRaw.filter((release) => !release.draft)
      : [];
    const latestFromGitHub = latestRaw && !latestRaw.draft ? latestRaw : null;
    const latest = latestFromGitHub
      || releases.find((release) => !release.prerelease)
      || releases[0]
      || null;

    if (!latest) {
      return res.status(404).json({ ok: false, error: 'No published GitHub release was found.' });
    }

    const totalDownloads = releases.reduce((releaseTotal, release) => {
      return releaseTotal + (release.assets || []).reduce((assetTotal, asset) => {
        return assetTotal + (Number(asset.download_count) || 0);
      }, 0);
    }, 0);

    const latestAssets = (latest.assets || []).map(normalizeAsset);
    const latestDownloads = latestAssets.reduce((sum, asset) => sum + asset.downloadCount, 0);

    return res.status(200).json({
      ok: true,
      fetchedAt: new Date().toISOString(),
      source: 'github-rest-api',
      latestSelection: latestFromGitHub
        ? 'github-releases-latest-endpoint'
        : 'release-list-fallback',
      repo: {
        name: repository.full_name || REPOSITORY,
        url: repository.html_url || `https://github.com/${REPOSITORY}`,
        stars: Number(repository.stargazers_count) || 0,
        forks: Number(repository.forks_count) || 0,
        watchers: Number(repository.subscribers_count) || 0,
        openIssues: Number(repository.open_issues_count) || 0,
        pushedAt: repository.pushed_at || null,
      },
      totals: {
        downloads: totalDownloads,
        releases: releases.length,
      },
      latest: {
        id: latest.id,
        tag: latest.tag_name || '',
        version: String(latest.tag_name || '').replace(/^v/i, ''),
        name: latest.name || latest.tag_name || 'Latest AnchorCast release',
        url: latest.html_url || `https://github.com/${REPOSITORY}/releases/latest`,
        publishedAt: latest.published_at || latest.created_at || null,
        prerelease: Boolean(latest.prerelease),
        body: latest.body || '',
        downloads: latestDownloads,
        assets: latestAssets,
      },
    });
  } catch (error) {
    console.error('[AnchorCast GitHub API]', error);
    const status = error && error.status === 403 ? 503 : 502;
    return res.status(status).json({
      ok: false,
      error: error && error.status === 403
        ? 'GitHub rate limit reached. Vercel may continue serving a cached response.'
        : 'Unable to refresh GitHub release data.',
      retryable: true,
    });
  }
};
