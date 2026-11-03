window.addEventListener('load', function () {

  var currentLocation = window.location.href;

  if ( currentLocation.includes( 'cyberspaziomaterialedidattico' ) ) {

    // Show a manual download button on every lesson page
    create_download_button();

    // Only trigger auto-advance (not auto-download) during normal navigation
    window.setInterval( function(){
      click_on_next_video();
    }, 30000 );

    // Check if this tab was opened as part of a bulk-download queue
    // If so, trigger the download automatically and then auto-close
    handle_bulk_download_tab();
  }

  if ( currentLocation.includes( 'cyberspaziovideotecaitems' ) && currentLocation.includes( 'type=11' ) ) {
    create_download_all_button();
  }

});

// ---------------------------------------------------------------------------
// Filename extraction
// ---------------------------------------------------------------------------

/**
 * Extracts the lesson filename from the page DOM.
 * Format: "Informatica giuridica - 2 - Evoluzione dell'informatica giuridica.mp4"
 *
 * - Subject name from: #ctl01_mainContent_ctl00_CyberSpazioNomeMateriaModule1_ltNomeMateria
 * - Lesson number + title from the navigation paragraph "Lezione n.2: ..."
 */
function get_lesson_filename( ext ) {
  ext = ext || 'mp4';

  // Subject name
  var nomeMateria = document.getElementById( 'ctl01_mainContent_ctl00_CyberSpazioNomeMateriaModule1_ltNomeMateria' );
  var subjectName = nomeMateria ? nomeMateria.textContent.trim() : 'Lezione';

  // Lesson number + title from the nav paragraph (contains "Lezione n.2:\n Titolo")
  var lessonNumber = '';
  var lessonTitle  = '';

  var centerDiv = document.querySelector( "div[style='text-align: center;']" );
  if ( centerDiv ) {
    var text = centerDiv.textContent;
    var match = text.match( /Lezione\s+n\.(\d+):\s*([\s\S]*?)(?:\s*Successiva|\s*$)/ );
    if ( match ) {
      lessonNumber = match[1].trim();
      lessonTitle  = match[2].replace( /\s+/g, ' ' ).trim();
    }
  }

  // Sanitise: remove characters that are illegal in file names
  function sanitise( s ) {
    return s.replace( /[\\/:*?"<>|]/g, '' ).replace( /\s{2,}/g, ' ' ).trim();
  }

  if ( lessonNumber && lessonTitle ) {
    return sanitise( subjectName ) + ' - ' + lessonNumber + ' - ' + sanitise( lessonTitle ) + '.' + ext;
  } else if ( lessonNumber ) {
    return sanitise( subjectName ) + ' - ' + lessonNumber + '.' + ext;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Video URL extraction
// ---------------------------------------------------------------------------

/**
 * Returns the best available direct MP4 URL from the page.
 *
 * The page always contains a hidden input #hidFileName with the HLS manifest
 * (.m3u8). Uninettuno also exposes a direct MP4 at the same base path with
 * a different extension — we swap .m3u8 → .mp4.
 *
 * If for some reason no URL can be derived, falls back to video.src.
 */
function get_video_url() {
  // 1. Try the hidden input that holds the manifest/video URL
  var hidFileName = document.getElementById( 'hidFileName' );
  if ( hidFileName && hidFileName.value ) {
    return hidFileName.value; // may be .m3u8 — background.js resolves it
  }

  // 2. Fallback: try the video element
  var video = document.getElementById( 'videojsplayer_html5_api' )
           || document.getElementById( 'videojsplayer' );
  if ( video && video.src && !video.src.startsWith('blob:') ) {
    return video.src;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Manual download button (on single lesson pages)
// ---------------------------------------------------------------------------

/**
 * Creates a "Scarica questa lezione" button injected below the video player.
 * Clicking it calls trigger_download() — no automatic download.
 */
function create_download_button() {
  // Wait a moment for the Angular video player to set hidFileName
  setTimeout( function() {
    var url = get_video_url();
    if ( !url ) {
      console.warn( '[Uninettuno] URL video non trovato, bottone download non aggiunto.' );
      return;
    }

    var ext      = url.split('?')[0].split('.').pop() || 'mp4';
    var filename = get_lesson_filename( ext ) || url.split('/').pop();

    var btn = document.createElement( 'a' );
    btn.id        = 'uninettuno-download-btn';
    btn.href      = url;
    btn.download  = filename;
    btn.target    = '_blank';
    btn.innerHTML = '⬇️ Scarica: ' + filename;
    btn.style.cssText = 'display:inline-block;margin:12px 0;padding:10px 20px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;box-shadow:0 4px 12px rgba(102,126,234,0.4);transition:transform 0.2s,box-shadow 0.2s;';
    btn.onmouseover = function() { btn.style.transform = 'translateY(-2px)'; btn.style.boxShadow = '0 6px 18px rgba(102,126,234,0.6)'; };
    btn.onmouseout  = function() { btn.style.transform = 'translateY(0)';    btn.style.boxShadow = '0 4px 12px rgba(102,126,234,0.4)'; };
    btn.onclick = function( e ) {
      e.preventDefault();
      btn.innerHTML = '⏳ Ricerca MP4 in corso...';
      btn.style.opacity = '0.75';
      // Send to background.js which resolves HLS → MP4 and calls chrome.downloads
      chrome.runtime.sendMessage( { url: url, filename: filename }, function(response) {
        if (response && response.status === 'error') {
          btn.innerHTML = '❌ Errore: ' + (response.error || 'Sconosciuto');
          btn.style.background = '#e53e3e';
          alert("Errore Download Nativo:\n" + (response.error || ''));
        } else {
          btn.innerHTML = '✅ Download completato in ~/Downloads!';
          btn.style.background = 'linear-gradient(135deg,#4CAF50,#2e7d32)';
        }
      } );
    };

    var container = document.getElementById( 'tdVideoContainer' );
    if ( container ) {
      var wrapper = document.createElement( 'div' );
      wrapper.style.cssText = 'text-align:center;padding:8px 0;';
      wrapper.appendChild( btn );
      container.appendChild( wrapper );
    }
  }, 2000 );
}


function trigger_download() {
  var url = get_video_url();
  if ( !url ) {
    console.warn( '[Uninettuno] Impossibile trovare l\'URL del video.' );
    return;
  }

  // Determine file extension
  var ext = url.split( '?' )[0].split( '.' ).pop() || 'mp4';
  var filename = get_lesson_filename( ext ) || url.split( '/' ).pop();

  console.log( '[Uninettuno] Download:', filename, '→', url );

  // Send to background.js which handles the chrome.downloads API
  chrome.runtime.sendMessage( { url: url, filename: filename } );
}

// ---------------------------------------------------------------------------
// Auto-advance to next lesson
// ---------------------------------------------------------------------------

function click_on_next_video() {
  var video = document.getElementById( 'videojsplayer_html5_api' );
  if ( !video ) return;

  console.log( '[Uninettuno] Tempo mancante:', ( video.duration - video.currentTime ) );

  if ( video.ended ) {
    var next_button = document.getElementById( 'ctl01_mainContent_ctl00_hlLezioneSuccessiva' );
    if ( next_button ) {
      console.log( '[Uninettuno] Click su Successiva' );
      next_button.click();
    }
  }
}

// ---------------------------------------------------------------------------
// Bulk-download queue handler (runs on each lesson tab opened by the queue)
// ---------------------------------------------------------------------------

/**
 * Called on lesson pages (cyberspaziomaterialedidattico).
 * If this tab was opened as part of a bulk-download queue, it:
 *   1. Waits a bit for the Angular video player to initialise
 *   2. Triggers the download via chrome.runtime
 *   3. Shows a status banner
 *   4. Closes itself after a delay so the next tab in the queue can open
 */
function handle_bulk_download_tab() {
  chrome.storage.local.get( 'uninettuno_bulk_queue', function( result ) {
    var queue = result && result.uninettuno_bulk_queue;
    if ( !queue || !queue.active ) return;

    console.log( '[Uninettuno] Bulk tab ' + ( queue.currentIndex + 1 ) + '/' + queue.total );

    // Banner
    var banner = document.createElement( 'div' );
    banner.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:99999;background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:10px 16px;border-radius:8px;font-size:13px;font-weight:bold;box-shadow:0 4px 12px rgba(0,0,0,0.3);min-width:280px;';
    banner.textContent = '⏳ Lezione ' + ( queue.currentIndex + 1 ) + '/' + queue.total + ' — preparazione download...';
    document.body.appendChild( banner );

    // Wait for the video player to render (Angular needs a moment)
    setTimeout( function() {
      trigger_download();
      banner.textContent = '⬇️ Download avviato — chiusura automatica tra poco...';

      setTimeout( function() {
        window.close();
      }, 5000 );
    }, 3000 );
  } );
}

// ---------------------------------------------------------------------------
// "Scarica tutte le lezioni" button (on the Videolezioni list page)
// ---------------------------------------------------------------------------

/**
 * Creates a "Scarica tutte le lezioni" button on the Videolezioni list page.
 *
 * Strategy: stores queue state in chrome.storage.local, then opens each
 * lesson in a new tab every ~9 seconds. Each new tab detects the queue flag,
 * downloads the video, and closes itself.
 */
function create_download_all_button() {
  // Main lesson links: cyberspaziomaterialedidattico + type=11, no numarg= (sub-chapters)
  var lessonLinks = document.querySelectorAll( 'a[href*="cyberspaziomaterialedidattico"]' );

  var videoLinks = Array.from( lessonLinks ).filter( function( a ) {
    return a.href.includes( 'type=11' ) && !a.href.includes( 'numarg=' );
  } );

  // Deduplicate by href
  var seen = {};
  var uniqueLinks = videoLinks.filter( function( a ) {
    if ( seen[a.href] ) return false;
    seen[a.href] = true;
    return true;
  } );

  if ( uniqueLinks.length === 0 ) {
    console.log( '[Uninettuno] Nessun link a lezioni trovato.' );
    return;
  }

  console.log( '[Uninettuno] Trovate ' + uniqueLinks.length + ' lezioni.' );

  // --- UI ---
  var container = document.createElement( 'div' );
  container.style.cssText = 'text-align:center;margin:20px 0;padding:16px;background:rgba(102,126,234,0.05);border-radius:12px;border:1px solid rgba(102,126,234,0.2);';

  var btn = document.createElement( 'button' );
  btn.id = 'uninettuno-download-all-btn';
  btn.textContent = '⬇️ Scarica tutte le ' + uniqueLinks.length + ' lezioni';
  btn.style.cssText = 'padding:12px 24px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;border:none;border-radius:8px;font-size:16px;font-weight:bold;cursor:pointer;box-shadow:0 4px 15px rgba(102,126,234,0.4);transition:transform 0.2s ease,box-shadow 0.2s ease;';
  btn.onmouseover = function() { btn.style.transform = 'translateY(-2px)'; btn.style.boxShadow = '0 6px 20px rgba(102,126,234,0.6)'; };
  btn.onmouseout  = function() { btn.style.transform = 'translateY(0)';    btn.style.boxShadow = '0 4px 15px rgba(102,126,234,0.4)'; };

  var progress = document.createElement( 'div' );
  progress.style.cssText = 'margin-top:12px;font-size:14px;color:#555;display:none;line-height:1.5;';

  var note = document.createElement( 'p' );
  note.style.cssText = 'margin-top:10px;font-size:12px;color:#888;display:none;';
  note.textContent = '⚠️ Ogni lezione si aprirà in un nuovo tab e si chiuderà automaticamente. Non chiudere questo tab durante il processo.';

  btn.addEventListener( 'click', function() {
    btn.disabled = true;
    btn.style.opacity = '0.7';
    btn.style.cursor  = 'not-allowed';
    progress.style.display = 'block';
    note.style.display     = 'block';

    var urls   = uniqueLinks.map( function( a ) { return a.href; } );
    var labels = uniqueLinks.map( function( a ) { return a.textContent.trim() || ''; } );
    var total  = urls.length;
    var idx    = 0;

    function openNextTab() {
      if ( idx >= total ) {
        progress.innerHTML = '✅ Completato! <strong>' + total + '</strong> lezioni inviate al download.';
        progress.style.color = '#4CAF50';
        btn.textContent     = '✅ Download completato!';
        btn.style.background = 'linear-gradient(135deg,#4CAF50,#2e7d32)';
        chrome.storage.local.remove( 'uninettuno_bulk_queue' );
        return;
      }

      progress.textContent = '⏳ Apertura lezione ' + ( idx + 1 ) + ' di ' + total + ( labels[idx] ? ': ' + labels[idx] : '' ) + '...';

      chrome.storage.local.set( {
        'uninettuno_bulk_queue': { active: true, currentIndex: idx, total: total }
      }, function() {
        window.open( urls[idx], '_blank' );
        idx++;
        // Wait 9 s for each tab to load, download, and close before opening the next
        setTimeout( openNextTab, 9000 );
      } );
    }

    openNextTab();
  } );

  container.appendChild( btn );
  container.appendChild( progress );
  container.appendChild( note );

  // Insert right after the subject name header
  var insertTarget =
    document.querySelector( '.nome-materia-container' ) ||
    document.querySelector( '.compatibility-layer' )    ||
    document.getElementById( 'main-content' )           ||
    document.querySelector( '.div-center' );

  if ( insertTarget ) {
    insertTarget.insertAdjacentElement( 'afterend', container );
  } else {
    document.body.insertBefore( container, document.body.firstChild );
  }
}