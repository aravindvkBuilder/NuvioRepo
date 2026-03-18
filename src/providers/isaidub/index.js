// Isaidub Scraper for Nuvio Local Scrapers
// React Native compatible version - FIXED v3
// Stream host: dub.onestream.today → dubshare.one
const cheerio = require('cheerio-without-node-native');
const TMDB_API_KEY = '1b3113663c9004682ed61086cf967c44';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
let MAIN_URL = "https://isaidub.love";
const HEADERS = {
 "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like  "Referer": `${MAIN_URL}/`,
};
// =================================================================================
// UTILITY FUNCTIONS
// =================================================================================
async function fetchWithTimeout(url, options = {}, timeout = 10000) {
 const controller = new AbortController();
 const timeoutId = setTimeout(() => controller.abort(), timeout);
 try {
 const response = await fetch(url, { ...options, signal: controller.signal, redirect:  clearTimeout(timeoutId);
 return response;
 } catch (error) {
 clearTimeout(timeoutId);
 if (error.name === 'AbortError') throw new Error(`Request timeout after ${timeout}ms` throw error;
 }
}
function normalizeTitle(title) {
 if (!title) return '';
 return title.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}
function toTitleCase(str) {
 if (!str) return '';
 return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join}
function toSlug(str) {
 if (!str) return '';
 return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function calculateTitleSimilarity(title1, title2) {
 const norm1 = normalizeTitle(title1);
 const norm2 = normalizeTitle(title2);
 if (norm1 === norm2) return 1.0;
 if (norm1.length > 5 && norm2.length > 5 && (norm2.includes(norm1) || norm1.includes(norm const words1 = new Set(norm1.split(/\s+/).filter(w => w.length > 2));
 const words2 = new Set(norm2.split(/\s+/).filter(w => w.length > 2));
 if (words1.size === 0 || words2.size === 0) return 0;
 const intersection = new Set([...words1].filter(w => words2.has(w)));
 const union = new Set([...words1, ...words2]);
 return intersection.size / union.size;
}
function unpack(p, a, c, k) {
 while (c--) {
 if (k[c]) p = p.replace(new RegExp('\\b' + c.toString(a) + '\\b', 'g'), k[c]);
 }
 return p;
}
function findBestTitleMatch(mediaInfo, searchResults) {
 if (!searchResults || searchResults.length === 0) return null;
 const targetYear = mediaInfo.year ? parseInt(mediaInfo.year) : null;
 let bestMatch = null, bestScore = 0;
 for (const result of searchResults) {
 let score = calculateTitleSimilarity(mediaInfo.title, result.title);
 if (targetYear) {
 if (result.title.includes(targetYear.toString())) score += 0.2;
 else if (result.title.match(/\(\d{4}\)/)) {
 const m = result.title.match(/\((\d{4})\)/);
 if (m && parseInt(m[1]) !== targetYear) score -= 0.1;
 }
 }
 if (score > bestScore) { bestScore = score; bestMatch = result; }
 }
 if (bestMatch && bestScore > 0.45) {
 console.log(`[Isaidub] Best match: "${bestMatch.title}" (score: ${bestScore.toFixed(2 return bestMatch;
 }
 return null;
}
function formatStreamTitle(mediaInfo, stream) {
 const quality = stream.quality || "Unknown";
 const title = toTitleCase(mediaInfo.title || "Unknown");
 const year = mediaInfo.year || "";
 let size = stream.size || "";
 if (!size) {
 const sizeMatch = stream.text ? stream.text.match(/(\d+(?:\.\d+)?\s*(?:GB|MB))/i) : n if (sizeMatch) size = sizeMatch[1];
 }
 let type = "";
 const searchString = ((stream.text || "") + " " + (stream.url || "")).toLowerCase();
 if (searchString.includes('bluray') || searchString.includes('brrip')) type = "BluRay";
 else if (searchString.includes('web-dl')) type = "WEB-DL";
 else if (searchString.includes('webrip')) type = "WEBRip";
 else if (searchString.includes('hdrip')) type = "HDRip";
 else if (searchString.includes('dvdrip')) type = "DVDRip";
 else if (searchString.includes('bdrip')) type = "BDRip";
 else if (searchString.includes('hdtv')) type = "HDTV";
 let seInfo = "";
 const sMatch = searchString.match(/season\s*(\d+)/i);
 const eMatch = searchString.match(/epi\s*(\d+)|episode\s*(\d+)/i);
 if (sMatch) seInfo += ` S${sMatch[1].padStart(2, '0')}`;
 if (eMatch) seInfo += ` E${(eMatch[1] || eMatch[2]).padStart(2, '0')}`;
 if (!seInfo) {
 const sp = searchString.match(/s(\d+)e(\d+)|s(\d+)\s*e(\d+)/i);
 if (sp) seInfo = ` S${(sp[1] || sp[3]).padStart(2, '0')} E${(sp[2] || sp[4]).padStart }
 const typeLine = type ? ` : ${type}\n` : "";
 const sizeLine = size ? ` : ${size}\n` : "";
 const yearStr = year && year !== "N/A" ? ` ${year}` : "";
 const langMarkers = {
 'TAMIL': /tamil/i, 'HINDI': /hindi/i, 'TELUGU': /telugu/i,
 'MALAYALAM': /malayalam/i, 'KANNADA': /kannada/i,
 'ENGLISH': /english|eng/i, 'MULTI AUDIO': /multi/i
 };
 let language = "TAMIL";
 for (const [name, regex] of Object.entries(langMarkers)) {
 if (regex.test(searchString)) { language = name; break; }
 }
 return `Isaidub (Instant) (${quality})\n${typeLine} : ${title}${yearStr}${seInfo} ${qual}
// =================================================================================
// TMDB FUNCTIONS
// =================================================================================
async function getTMDBDetails(tmdbId, mediaType) {
 const type = mediaType === 'movie' ? 'movie' : 'tv';
 const url = `${TMDB_BASE_URL}/${type}/${tmdbId}?api_key=${TMDB_API_KEY}`;
 try {
 const response = await fetchWithTimeout(url, {}, 8000);
 if (!response.ok) throw new Error(`HTTP ${response.status}`);
 const data = await response.json();
 const info = {
 title: data.title || data.name,
 year: (data.release_date || data.first_air_date || "").split("-")[0]
 };
 console.log(`[Isaidub] TMDB Info: "${info.title}" (${info.year || 'N/A'})`);
 return info;
 } catch (error) {
 console.error("[Isaidub] Error fetching TMDB metadata:", error.message);
 throw error;
 }
}
async function searchTMDBByTitle(title, mediaType) {
 const type = mediaType === 'movie' ? 'movie' : 'tv';
 const url = `${TMDB_BASE_URL}/search/${type}?api_key=${TMDB_API_KEY}&query=${encodeURICom try {
 const response = await fetchWithTimeout(url, {}, 8000);
 if (!response.ok) throw new Error(`HTTP ${response.status}`);
 const data = await response.json();
 if (data.results && data.results.length > 0) {
 const r = data.results[0];
 return {
 title: r.title || r.name,
 year: (r.release_date || r.first_air_date || "").split("-")[0]
 };
 }
 return null;
 } catch (error) {
 console.error("[Isaidub] Error searching TMDB:", error.message);
 return null;
 }
}
// =================================================================================
// SEARCH
// =================================================================================
async function search(query, year = null, mediaType) {
 if (!year) {
 const yearMatch = query.match(/\b(19|20)\d{2}\b/);
 if (yearMatch) { year = yearMatch[0]; query = query.replace(year, '').trim(); }
 }
 console.log(`[Isaidub] Searching for: "${query}" (year: ${year || 'any'}, type: ${mediaTy try {
 const results = [];
 const slug = toSlug(query);
 if (slug) {
 const baseSuffixes = mediaType === 'tv'
 ? ['-tamil-dubbed-web-series']
 : ['-tamil-dubbed-movie'];
 const guesses = [];
 for (const suffix of baseSuffixes) {
 if (year) {
 guesses.push(`${slug}-${year}${suffix}`);
 guesses.push(`${slug}-720p-hd${suffix}`);
 }
 guesses.push(`${slug}${suffix}`);
 guesses.push(`${slug}-720p-hd${suffix}`);
 }
 const guessPromises = guesses.map(async (guess) => {
 const guessUrl = `${MAIN_URL}/movie/${guess}/`;
 try {
 const response = await fetchWithTimeout(guessUrl, { method: 'HEAD', heade if (response.ok) return { title: query + (year ? ` (${year})` : ""), href } catch (e) { }
 return null;
 });
 const guessedResults = (await Promise.all(guessPromises)).filter(r => r !== null) results.push(...guessedResults);
 }
 const categoriesToCheck = [`${MAIN_URL}/`];
 if (mediaType === 'tv') {
 categoriesToCheck.push(`${MAIN_URL}/tamil-dubbed-web-series/`);
 categoriesToCheck.push(`${MAIN_URL}/tamil-dubbed-web-series/2/`);
 } else {
 if (year) categoriesToCheck.push(`${MAIN_URL}/tamil-${year}-dubbed-movies/`);
 const currentYear = new Date().getFullYear();
 for (let y = currentYear; y >= currentYear - 1; y--) {
 const yearUrl = `${MAIN_URL}/tamil-${y}-dubbed-movies/`;
 if (!categoriesToCheck.includes(yearUrl)) {
 categoriesToCheck.push(yearUrl);
 categoriesToCheck.push(`${yearUrl}2/`);
 }
 }
 const firstChar = query.trim().charAt(0).toLowerCase();
 if (/[a-z]/.test(firstChar)) {
 categoriesToCheck.push(`${MAIN_URL}/tamil-atoz-dubbed-movies/${firstChar}/`);
 categoriesToCheck.push(`${MAIN_URL}/tamil-atoz-dubbed-movies/${firstChar}/2/`
 }
 }
 const catPromises = categoriesToCheck.map(async (categoryUrl) => {
 try {
 const response = await fetchWithTimeout(categoryUrl, { headers: HEADERS }, 60 if (!response.ok) return [];
 const html = await response.text();
 const $ = cheerio.load(html);
 const pageResults = [];
 $('a').each((i, el) => {
 const href = $(el).attr('href');
 let text = $(el).text().trim();
 if (!href || href === '/' || href === '#' || (text.length < 3 && !$(el).f if (text.length < 3) {
 text = $(el).find('img').attr('alt') || "";
 text = text.replace(/isaiDub\.me\s*-\s*/i, '').trim();
 }
 text = text.replace(/Download Now/i, '').replace(/\s+/g, ' ').trim();
 if (href.includes('/movie/') || href.includes('-dubbed-movie') || href.in if (href.includes('/genre/') || href.match(/\/\d+\/$/) || href.endsWi const fullUrl = href.startsWith('http') ? href : `${MAIN_URL}${href}` pageResults.push({ title: text, href: fullUrl });
 }
 });
 return pageResults;
 } catch (error) { return []; }
 });
 const allCatResults = await Promise.all(catPromises);
 for (const catResults of allCatResults) {
 for (const res of catResults) {
 if (!results.some(r => r.href === res.href)) results.push(res);
 }
 }
 console.log(`[Isaidub] Found ${results.length} total unique links`);
 return results;
 } catch (error) {
 console.error("[Isaidub] Search error:", error.message);
 return [];
 }
}
// =================================================================================
// KEY FIX: extractFromOnestreamPage
// Directly hits dub.onestream.today and extracts the dubshare.one mp4 URL
// This SKIPS all ad redirects entirely using the known ID pattern
// =================================================================================
async function extractFromOnestreamPage(streamId) {
 const streamUrl = `https://dub.onestream.today/stream/video/${streamId}`;
 console.log(`[Isaidub] Hitting onestream directly: ${streamUrl}`);
 try {
 const response = await fetchWithTimeout(streamUrl, {
 headers: {
 ...HEADERS,
 'Referer': 'https://dubpage.xyz/',
 'Origin': 'https://dubpage.xyz'
 }
 }, 15000);
 let html = await response.text();
 // Try unpacking obfuscated JS first
 const packerMatch = html.match(/eval\(function\(p,a,c,k,e,d\)\{.*?\}\s*\((.*)\)\s*\)/ if (packerMatch) {
 try {
 const rawArgs = packerMatch[1].trim();
 const pMatch = rawArgs.match(/^'(.*)',\s*(\d+),\s*(\d+),\s*'(.*?)'\.split\(/s if (pMatch) {
 const unpacked = unpack(pMatch[1], parseInt(pMatch[2]), parseInt(pMatch[3 html += "\n" + unpacked;
 console.log(`[Isaidub] Successfully unpacked JS`);
 }
 } catch (e) { }
 }
 // Pattern 1: dubshare.one .mp4 URL (confirmed from network analysis)
 const dubshareMatch = html.match(/https?:\/\/[^\s"'<>\\]*dubshare\.one[^\s"'<>\\]*\.m if (dubshareMatch) {
 console.log(`[Isaidub] Found dubshare.one URL: ${dubshareMatch[0]}`);
 return dubshareMatch[0];
 }
 // Pattern 2: Any .mp4 with ?stream=1 parameter (confirmed pattern)
 const streamParamMatch = html.match(/https?:\/\/[^\s"'<>\\]+\.mp4\?stream=1/i);
 if (streamParamMatch) {
 console.log(`[Isaidub] Found stream URL: ${streamParamMatch[0]}`);
 return streamParamMatch[0];
 }
 // Pattern 3: Broad .mp4 URL scan
 const mp4Match = html.match(/https?:\/\/[^\s"'<>\\]+\.mp4[^\s"'<>\\]*/i);
 if (mp4Match) {
 console.log(`[Isaidub] Found mp4 URL: ${mp4Match[0]}`);
 return mp4Match[0];
 }
 // Pattern 4: .m3u8 URL scan
 const m3u8Match = html.match(/https?:\/\/[^\s"'<>\\]+\.m3u8[^\s"'<>\\]*/i);
 if (m3u8Match) {
 console.log(`[Isaidub] Found m3u8 URL: ${m3u8Match[0]}`);
 return m3u8Match[0];
 }
 // Pattern 5: file/src/source in JS objects
 const jsPatterns = [
 /["']?file["']?\s*:\s*["']([^"']+\.mp4[^"']*)["']/i,
 /["']?src["']?\s*:\s*["']([^"']+\.mp4[^"']*)["']/i,
 /["']?source["']?\s*:\s*["']([^"']+\.mp4[^"']*)["']/i,
 /["']?file["']?\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i,
 ];
 for (const pattern of jsPatterns) {
 const match = html.match(pattern);
 if (match && match[1]) {
 console.log(`[Isaidub] Found via JS pattern: ${match[1]}`);
 return match[1];
 }
 }
 // Pattern 6: Check <video> tag src
 const $ = cheerio.load(html);
 const videoSrc = $('video source[src], video[src]').first().attr('src');
 if (videoSrc) {
 console.log(`[Isaidub] Found video src tag: ${videoSrc}`);
 return videoSrc;
 }
 console.warn(`[Isaidub] Could not extract stream from onestream page: ${streamUrl}`);
 return null;
 } catch (error) {
 console.error(`[Isaidub] extractFromOnestreamPage error: ${error.message}`);
 return null;
 }
}
// =================================================================================
// parseMoviePage — extracts download page IDs
// =================================================================================
async function parseMoviePage(url, depth = 0, contextText = "", season = null, episode = null if (depth > 5) return [];
 console.log(`[Isaidub] Parsing page (depth ${depth}): ${url}`);
 try {
 const response = await fetchWithTimeout(url, { headers: HEADERS }, 8000);
 const html = await response.text();
 const $ = cheerio.load(html);
 const pageTitle = $('title').text().trim() || "";
 const combinedContext = (contextText + " " + pageTitle).trim();
 const downloadLinks = [];
 $('a').each((i, el) => {
 const href = $(el).attr('href');
 const text = $(el).text().trim();
 if (!href) return;
 const isDownloadLink =
 href.includes('/download/page/') ||
 href.includes('/download/') ||
 href.includes('dubpage.xyz') ||
 href.includes('dubmv.top') ||
 href.includes('onestream') ||
 href.includes('dubshare');
 if (!isDownloadLink) return;
 if (season) {
 const otherSeasonMatch = (combinedContext + " " + text).match(/(?:season|s)\s if (otherSeasonMatch && parseInt(otherSeasonMatch[1]) !== parseInt(season)) r }
 if (episode) {
 const ePattern = new RegExp(`(?:epi|episode|e)\\s*0*${episode}\\b`, 'i');
 if (!ePattern.test(text) && !ePattern.test(combinedContext)) return;
 }
 const fullUrl = href.startsWith('http') ? href
 : href.startsWith('//') ? 'https:' + href
 : `${MAIN_URL}${href}`;
 const qualityMatch = (text + " " + href + " " + combinedContext).match(/\b(360p|4 const quality = qualityMatch ? qualityMatch[0] : "HD";
 // Only 720p and 1080p
 if (quality === '360p' || quality === '480p') return;
 downloadLinks.push({
 url: fullUrl,
 quality,
 type: "download",
 text: (combinedContext + " " + text).trim()
 });
 });
 if (downloadLinks.length > 0) {
 console.log(`[Isaidub] Found ${downloadLinks.length} download links`);
 return downloadLinks;
 }
 // Follow quality sub-links
 const subLinks = [];
 $('a').each((i, el) => {
 const href = $(el).attr('href');
 const text = $(el).text().trim().toLowerCase();
 if (!href || href === '/' || href === '#') return;
 const isQualityLink = /360p|480p|720p|1080p|4k|hd|dvd|scr|rip|bluray|brrip|web|we if (!isQualityLink) return;
 if (season) {
 const sMatch = text.match(/season\s*(\d+)/i);
 if (sMatch && parseInt(sMatch[1]) !== parseInt(season)) return;
 }
 const fullUrl = href.startsWith('http') ? href
 : href.startsWith('//') ? 'https:' + href
 : `${MAIN_URL}${href}`;
 subLinks.push({ url: fullUrl, text: $(el).text().trim() });
 });
 if (subLinks.length > 0) {
 console.log(`[Isaidub] Following ${subLinks.length} sub-links...`);
 const streams = [];
 for (const subLink of subLinks) {
 const subStreams = await parseMoviePage(subLink.url, depth + 1, (combinedCont streams.push(...subStreams);
 if (streams.length >= 10) break;
 }
 return streams;
 }
 return [];
 } catch (error) { return []; }
}
// =================================================================================
// extractFinalDownloadUrl — extracts stream ID from download page
// then jumps straight to dub.onestream.today skipping all ads
// =================================================================================
async function extractFinalDownloadUrl(downloadPageUrl) {
 console.log(`[Isaidub] Processing download page: ${downloadPageUrl}`);
 try {
 // Extract the numeric ID from the URL
 // e.g. isaidub.love/download/page/39101/ → ID = 39101
 const idMatch = downloadPageUrl.match(/\/(\d+)\/?$/);
 if (idMatch) {
 const streamId = idMatch[1];
 console.log(`[Isaidub] Extracted stream ID: ${streamId}`);
 // Jump directly to onestream, bypassing all ad redirects!
 const directUrl = await extractFromOnestreamPage(streamId);
 if (directUrl) {
 return { url: directUrl, needsExtraction: false, size: null };
 }
 }
 // Fallback: load the download page and look for links
 const response = await fetchWithTimeout(downloadPageUrl, { headers: HEADERS }, 10000) const html = await response.text();
 const $ = cheerio.load(html);
 let size = null;
 const sizeMatch = html.match(/File\s*Size\s*:?\s*<\/strong>\s*([^<\n]+)/i) ||
 html.match(/Size\s*:?\s*(\d+(?:\.\d+)?\s*(?:GB|MB))/i);
 if (sizeMatch) size = sizeMatch[1].trim();
 // Look for dubpage/dubmv/onestream links
 const downloadLinks = [];
 $('a').each((i, el) => {
 const href = $(el).attr('href');
 const text = $(el).text().trim().toLowerCase();
 if (!href || href.startsWith('#') || href.includes('javascript:')) return;
 if (href.includes('isaidub.love') || href.includes('isaidub.me')) return;
 const isStreamLink =
 text.includes('download') || text.includes('server') ||
 text.includes('watch') || text.includes('stream') || text.includes('play') ||
 href.includes('dubpage.xyz') || href.includes('dubmv.top') ||
 href.includes('onestream') || href.includes('dubshare');
 if (!isStreamLink) return;
 const fullUrl = href.startsWith('http') ? href
 : href.startsWith('//') ? 'https:' + href
 : `${MAIN_URL}${href}`;
 downloadLinks.push(fullUrl);
 });
 if (downloadLinks.length > 0) {
 // Try to extract ID from any found link and use onestream directly
 for (const link of downloadLinks) {
 const linkIdMatch = link.match(/\/(\d+)\/?$/);
 if (linkIdMatch) {
 const streamId = linkIdMatch[1];
 const directUrl = await extractFromOnestreamPage(streamId);
 if (directUrl) return { url: directUrl, needsExtraction: false, size };
 }
 }
 return { url: downloadLinks[0], needsExtraction: true, size };
 }
 return null;
 } catch (error) {
 console.error("[Isaidub] extractFinalDownloadUrl error:", error.message);
 return null;
 }
}
// =================================================================================
// MAIN getStreams FUNCTION
// =================================================================================
async function getStreams(tmdbId, mediaType, season, episode) {
 if (mediaType === 'movie') { season = null; episode = null; }
 console.log(`[Isaidub] Processing ${mediaType} ${tmdbId} (S:${season}, E:${episode})`);
 try {
 let mediaInfo;
 const isNumericId = /^\d+$/.test(tmdbId);
 if (isNumericId) {
 try { mediaInfo = await getTMDBDetails(tmdbId, mediaType); }
 catch (error) { mediaInfo = { title: tmdbId, year: null }; }
 } else {
 try { mediaInfo = (await searchTMDBByTitle(tmdbId, mediaType)) || { title: tmdbId catch (error) { mediaInfo = { title: tmdbId, year: null }; }
 }
 const searchResults = await search(mediaInfo.title, mediaInfo.year, mediaType);
 const bestMatch = findBestTitleMatch(mediaInfo, searchResults);
 if (!bestMatch) {
 console.warn("[Isaidub] No matching title found");
 return [];
 }
 const rawStreams = await parseMoviePage(bestMatch.href, 0, "", season, episode);
 if (rawStreams.length === 0) return [];
 const limitedStreams = rawStreams.slice(0, 10);
 console.log(`[Isaidub] Extracting streams from ${limitedStreams.length} links...`);
 const finalStreams = [];
 for (let i = 0; i < limitedStreams.length; i += 3) {
 const batch = limitedStreams.slice(i, i + 3);
 const batchResults = await Promise.all(batch.map(async (stream) => {
 let timeoutId;
 try {
 return await Promise.race([
 (async () => {
 let finalUrl = stream.url;
 let extractedSize = null;
 if (stream.type === "download") {
 const result = await extractFinalDownloadUrl(stream.url);
 if (!result) return null;
 extractedSize = result.size;
 finalUrl = result.url;
 }
 if (!finalUrl || !finalUrl.startsWith('http')) {
 console.warn(`[Isaidub] Invalid URL skipped: ${finalUrl}`);
 return null;
 }
 console.log(`[Isaidub] Returning stream: ${finalUrl}`);
 return {
 name: "Isaidub",
 title: formatStreamTitle(mediaInfo, { ...stream, size: extrac url: finalUrl,
 quality: stream.quality,
 headers: {
 "Referer": "https://dub.onestream.today/",
 "User-Agent": HEADERS["User-Agent"]
 },
 provider: 'Isaidub'
 };
 })(),
 new Promise((_, reject) => {
 timeoutId = setTimeout(() => reject(new Error('Timeout')), 30000) })
 ]).finally(() => { if (timeoutId) clearTimeout(timeoutId); });
 } catch (error) {
 console.warn(`[Isaidub] Failed: ${stream.url}: ${error.message}`);
 return null;
 }
 }));
 finalStreams.push(...batchResults.filter(r => r !== null));
 if (finalStreams.length >= 5) break;
 }
 console.log(`[Isaidub] Found ${finalStreams.length} final streamable links`);
 return finalStreams;
 } catch (error) {
 console.error("[Isaidub] getStreams error:", error.message);
 return [];
 }
}
if (typeof module !== 'undefined' && module.exports) {
 module.exports = { getStreams };
} else {
 global.getStreams = { getStreams };
}
