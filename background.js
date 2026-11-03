/**
 * background.js — service worker per Uninettuno automatic lesson viewer
 *
 * Flusso:
 *  1. Raccoglie i cookie CloudFront dal browser per il dominio di streaming
 *  2. Invia URL + cookies + filename al native messaging host (FFmpeg)
 *  3. Se il native host non è installato, fallback a chrome.downloads
 */

const NATIVE_HOST = 'com.uninettuno.downloader';
const STREAMING_DOMAINS = [
  'https://streaming2.uninettunouniversity.net',
  'https://streaming.uninettunouniversity.net',
  'https://uninettunouniversity.net',
  'https://www.uninettunouniversity.net',
];

// ---------------------------------------------------------------------------
// Message listener (from content script)
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  var url      = msg.url;
  var filename = msg.filename;

  if ( !url ) return;

  // Collect all relevant CloudFront cookies, then dispatch
  collectCookies().then(function (cookieStr) {
    downloadWithNativeHost( url, filename, cookieStr, sendResponse );
  });

  // Keep message channel open for async sendResponse
  return true;
});

// ---------------------------------------------------------------------------
// Cookie collection
// ---------------------------------------------------------------------------

/**
 * Gets all cookies for the Uninettuno streaming domains and returns them
 * as a single "Name=Value; Name2=Value2" string for FFmpeg -headers.
 */
function collectCookies() {
  var promises = STREAMING_DOMAINS.map(function (domain) {
    return new Promise(function (resolve) {
      chrome.cookies.getAll({ url: domain }, function (cookies) {
        resolve( cookies || [] );
      });
    });
  });

  return Promise.all( promises ).then(function (results) {
    var all = [];
    var seen = {};
    results.forEach(function (cookies) {
      cookies.forEach(function (c) {
        if ( !seen[c.name] ) {
          seen[c.name] = true;
          all.push( c.name + '=' + c.value );
        }
      });
    });
    return all.join('; ');
  });
}

// ---------------------------------------------------------------------------
// Native messaging (FFmpeg)
// ---------------------------------------------------------------------------

function downloadWithNativeHost( url, filename, cookies, sendResponse ) {
  var payload = { url: url, filename: filename, cookies: cookies };

  try {
    chrome.runtime.sendNativeMessage( NATIVE_HOST, payload, function (response) {
      if ( chrome.runtime.lastError ) {
        console.warn( '[Uninettuno BG] Native host non disponibile:', chrome.runtime.lastError.message );
        if ( sendResponse ) sendResponse({ status: 'error', error: 'Estensione nativa non installata o ID errato. Controlla install.sh' });
        return;
      }

      console.log( '[Uninettuno BG] Native host risposta:', response );
      if ( sendResponse ) sendResponse( response || { status: 'done' } );
    });
  } catch (e) {
    console.warn( '[Uninettuno BG] sendNativeMessage fallito:', e );
    if ( sendResponse ) sendResponse({ status: 'error', error: e.toString() });
  }
}

// ---------------------------------------------------------------------------
// Fallback: chrome.downloads (works only for direct .mp4 URLs)
// ---------------------------------------------------------------------------

function fallbackDownload( url, filename, sendResponse ) {
  if ( url.includes('.m3u8') ) {
    // Can't download HLS directly — try to resolve to MP4 first
    resolveM3u8ToMp4( url, filename, sendResponse );
  } else {
    startChromeDownload( url, filename );
    if ( sendResponse ) sendResponse({ status: 'fallback_download' });
  }
}

function startChromeDownload( url, filename ) {
  chrome.downloads.download({ url: url, filename: filename, saveAs: false });
}

// ---------------------------------------------------------------------------
// HLS → MP4 resolution (fallback only, when native host is absent)
// ---------------------------------------------------------------------------

function resolveM3u8ToMp4( m3u8url, filename, sendResponse ) {
  fetch( m3u8url, { credentials: 'include' } )
    .then(function (r) { return r.text(); })
    .then(function (text) {
      var candidates = buildCandidateUrls( m3u8url, text );
      tryNextCandidate( candidates, 0, filename, m3u8url, sendResponse );
    })
    .catch(function (err) {
      console.error( '[Uninettuno BG] Errore fetch m3u8:', err );
      // Last resort: download the .m3u8 itself (openable with VLC)
      startChromeDownload( m3u8url, filename.replace(/\.mp4$/, '.m3u8') );
      if ( sendResponse ) sendResponse({ status: 'fallback_m3u8' });
    });
}

function buildCandidateUrls( m3u8url, text ) {
  var base = m3u8url.substring( 0, m3u8url.lastIndexOf('/') + 1 );
  var stem = m3u8url.split('/').pop().replace('.m3u8', '');
  var candidates = [];

  // Variant playlist URIs from master manifest
  var re = /URI="([^"]+\.m3u8)"/g, m;
  while ( (m = re.exec(text)) !== null ) {
    var u = m[1].startsWith('http') ? m[1] : base + m[1];
    candidates.push( u.replace('.m3u8', '.mp4') );
  }

  // Direct MP4/M4S segment lines
  text.split('\n').forEach(function (line) {
    line = line.trim();
    if ( line && !line.startsWith('#') && (line.endsWith('.mp4') || line.endsWith('.m4s')) ) {
      candidates.push( line.startsWith('http') ? line : base + line );
    }
  });

  // Common suffix guesses
  ['', '_720p', '_1080p', '_480p', '_hd', '_sd', '_high', '_low'].forEach(function (s) {
    candidates.push( base + stem + s + '.mp4' );
  });

  var seen = {};
  return candidates.filter(function (u) {
    if (seen[u]) return false; seen[u] = true; return true;
  });
}

function tryNextCandidate( candidates, idx, filename, originalUrl, sendResponse ) {
  if ( idx >= candidates.length ) {
    console.warn( '[Uninettuno BG] Nessun MP4 trovato, scarico .m3u8' );
    startChromeDownload( originalUrl, filename.replace(/\.mp4$/, '.m3u8') );
    if ( sendResponse ) sendResponse({ status: 'fallback_m3u8' });
    return;
  }

  fetch( candidates[idx], { method: 'HEAD', credentials: 'include' } )
    .then(function (r) {
      var ct = r.headers.get('content-type') || '';
      if ( r.ok && (ct.includes('video') || ct.includes('octet-stream')) ) {
        console.log( '[Uninettuno BG] MP4 trovato:', candidates[idx] );
        startChromeDownload( candidates[idx], filename );
        if ( sendResponse ) sendResponse({ status: 'fallback_mp4' });
      } else {
        tryNextCandidate( candidates, idx + 1, filename, originalUrl, sendResponse );
      }
    })
    .catch(function () {
      tryNextCandidate( candidates, idx + 1, filename, originalUrl, sendResponse );
    });
}