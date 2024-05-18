window.addEventListener('load', function () {
  window.setInterval( function(){
    clickon_next_video();
  }, 30000 );
});


function clickon_next_video() {
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