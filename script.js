window.addEventListener('load', function () {

  var currentLocation = window.location.href;

  if ( currentLocation.includes( "cyberspaziomaterialedidattico" ) ) {
    create_download_video();
    // create_download_video_two();
  
    window.setInterval( function(){
      click_on_next_video();
    }, 30000 );
  }

  if ( currentLocation.includes( ".mp4" ) ) {

  }

});

function create_download_video() {
  var video = document.getElementById("videojsplayer_html5_api");
  var url = video.src;
  var filename = url.split('/').pop();

  if ( url.endsWith( '.mp4' ) ) {
    var a = document.createElement('a');
    a.setAttribute( 'href', url );
    a.setAttribute( 'download', filename );
    a.setAttribute( 'target', '_blank' );
    a.innerHTML = 'download';
    document.getElementById("tdVideoContainer").appendChild(a);

    var param = {
      url: url,
      filename: filename
    };

    chrome.runtime.sendMessage( param );
  }
}

// function create_download_video_two() {
//   var video = document.getElementById("videojsplayer_html5_api");
//   var url = video.src;

//   console.log( url );

//   if ( url.endsWith( '.mp4' ) ) {
//     var iframe = document.createElement('iframe');
//     iframe.style.display = 'none';
//     iframe.setAttribute( 'id', 'my_iframe' );
//     iframe.setAttribute( 'sandbox', 'allow-scripts allow-downloads' );
//     document.getElementById("tdVideoContainer").appendChild( iframe );
//     iframe.src = url;
//   }
// }

function click_on_next_video() {
  var video = document.getElementById("videojsplayer_html5_api");

  var duration = video.duration
  var currentTime = video.currentTime
  var ended = video.ended

  console.log( 'missing time: ', ( duration - currentTime ) );

  if ( ended ) {
    var next_button = document.getElementById("ctl01_mainContent_ctl00_hlLezioneSuccessiva");
    console.log( 'click next button' );
    next_button.click();
  }

}