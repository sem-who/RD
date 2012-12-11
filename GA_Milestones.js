/****** YouTube Video Tracking *****/

// Load YouTube Frame API
(function(){ //Closure, to not leak to the scope
  var s = document.createElement("script");
  s.src = "http://www.youtube.com/player_api"; /* Load Player API*/
  var before = document.getElementsByTagName("script")[0];
  before.parentNode.insertBefore(s, before);
})();

/****** YouTube Tracking Helpers  ******/
//Get the frame ID
window.getFrameID = function(frameElem){
	var id = frameElem.id;
	if(id == "")
		frameElem.id = id = frameElem.src;
	else
		id = frameElem.id;
    var elem = document.getElementById(id);

    if (elem) {
        if(/^iframe$/i.test(elem.tagName)) return id; //Frame, OK
        // else: Look for frame
        var elems = elem.getElementsByTagName("iframe");
        if (!elems.length) return null; //No iframe found, FAILURE
        for (var i=0; i<elems.length; i++) {
           if (/^https?:\/\/(?:www\.)?youtube(?:-nocookie)?\.com(\/|$)/i.test(elems[i].src)) break;
        }
        elem = elems[i]; //The only, or the best iFrame
        if (elem.id) return elem.id; //Existing ID, return it
        // else: Create a new ID
        do { //Keep postfixing `-frame` until the ID is unique
            id += "-frame";
        } while (document.getElementById(id));
        elem.id = id;
        return id;
    }
    // If no element, return null.
    return null;
}

//Runs when API is ready
var yt_player;
window.YT_ready = function(){
	//Find the YouTube frame
	window.s_yt_vids = [];
	try{
		var vids = [];
		var allFrames = document.getElementsByTagName('iframe');
		for(var i=0; i< allFrames.length; i++){
			if(allFrames[i].src.indexOf('www.youtube.com')>-1){
				vids.push(allFrames[i]);
			}
		}
		for(var j=0; j< vids.length; j++)
		{
			var frameID = getFrameID(vids[j]);
			var video_id = frameID.substr(frameID.lastIndexOf('/')+1);
			$.getScript("http://gdata.youtube.com/feeds/api/videos/"+video_id+"?v=2&alt=json-in-script&format=5&callback=getVideoTitles");
			window._prevVidState = -10;
			if (frameID) { //If the frame exists
				vids.push( new YT.Player(frameID, {
					events: {
						"onStateChange": videoStateChange
					}
				})
				);
			}
		}
	}catch(e){}
};

// This function will be called when the API is fully loaded
window.onYouTubePlayerAPIReady = function() {YT_ready(true)}

//Track Video Resume
window.videoResume = function(){
	//var video_id=window.yt_current_vid.d.videoData["video_id"];
	var videoTitle =  window.yt_current_vid.title;
	var videoCurrentTime = window.yt_current_vid.getCurrentTime();
	trackVid = window.yt_current_vid;
	trackVid.is25 = false;
	trackVid.is50 = false;
	trackVid.is75 = false;
	
	if(window.yt_current_vid.pauseTime != -1 && Math.abs(window.yt_current_vid.pauseTime - videoCurrentTime) >1){
		_gaq.push(['_trackEvent', 'Videos', 'Seek From', videoTitle,parseInt(window.yt_current_vid.pauseTime)]);
		
		_gaq.push(['_trackEvent', 'Videos', 'Seek To', videoTitle,parseInt(videoCurrentTime)]);
	}
	else{
		_gaq.push(['_trackEvent', 'Videos', 'Resume', videoTitle,parseInt(videoCurrentTime)]);
	}
	window.yt_current_vid.pauseTime = -1;

}

function getVideoTitles(data){
	var title = data.entry.title.$t;
	var id = data.entry.id.$t.split(':')[3];
	s_yt_vids.push(id);
	s_yt_vids.push(title);
}

//Track Video Percent
var trackVid
function vidComplete(){
trackVid.isComplete = false;
trackVid.isReset = true;		
}//close vidComplete

function resetVid(){
	trackVid.is25 = false;
	trackVid.is50 = false;
	trackVid.is75 = false;
	trackVid.isReset = false;
	trackVid.isComplete = true;
	trackVid.videoBegun = false;
}//close resetVid

function trackPercent(){
	
	var videoTitle =  trackVid.videoTitle;
	var trackVideoCurrentTime = trackVid.getCurrentTime();
	var trackVideoDuration = trackVid.getDuration();
	var trackVideoPercentComplete = trackVideoCurrentTime/trackVideoDuration*100;
	trackVideoPercentComplete = Math.round(trackVideoPercentComplete);
	

if(trackVid.isReset){
//console.log(trackVideoPercentComplete);
if(!trackVid.is25){
	if(trackVideoPercentComplete==25){
	trackVid.is25 = true;	
	//console.log(videoTitle + ": 25% Complete");
	_gaq.push(['_trackEvent', 'Videos', 'Percent', videoTitle,25]);
	}//25%
}//is25
if(!trackVid.is50){
	if(trackVideoPercentComplete==50){
	trackVid.is50 = true;
	//console.log(videoTitle + ": 50% Complete");
	_gaq.push(['_trackEvent', 'Videos', 'Percent', videoTitle,50]);	
	}//50%
}//is50
if(!trackVid.is75){
	if(trackVideoPercentComplete==75){
	trackVid.is75 = true;	
	//console.log(videoTitle + ": 75% Complete");
	_gaq.push(['_trackEvent', 'Videos', 'Percent', videoTitle,75]);	
	}//75%	
}//is75
}//isReset
}//trackPercent


/***** Main YouTube Tracking Code ******/

function getVideoId(vidObj, ytDelim, ytParam) {
	var videoId='';
	
	var params = vidObj.getVideoUrl().split(ytDelim)
	for ( var i=0; i < params.length; i++) {
		if (params[i].indexOf(ytParam) >= 0) {
			videoId = params[i].split(ytParam)[1]
		}
	}
	
	return videoId;
}
window.videoStateChange = function(event) {
	//Grab video info
	var vid = event.target;
	
	if(typeof(vid._prevVidState) == 'undefined') {
		vid._prevVidState = -10;
		vid.videoBegun = false;
	}
	
	if(vid._prevVidState != event.data)
	{				
		//Get Title
		var videoTitle = "not yet loaded";
//		var video_id=vid.g.videoData["video_id"];		
		var video_id = getVideoId(vid, '&', 'v=');
//		var video_id=vid.getVideoUrl().split('v=')[1];
		if(typeof(vid.title) != 'undefined')
			videoTitle = vid.title;
		else{
			for(var k=0; k<s_yt_vids.length; k+=2){
				if(s_yt_vids[k] == video_id)
					videoTitle = vid.title = s_yt_vids[k+1];
			}
		}
		
		var videoCurrentTime = vid.getCurrentTime();
		switch(event.data)
		{
			case -1:
				// ready
				break;
			case 3:
				// buffering
				break;
			case 1:
				// playing
				if(vid.videoBegun){
					//RESUME
					if (vid._prevVidState == 2) {
						// Video was paused and not just playing after a buffer event
						window.yt_current_vid = vid;
						setTimeout('videoResume()', 300);
					}
				}
				else{
					//BEGIN PLAYING
					//Pull information about the video
					try{
						var videoDuration = vid.getDuration();
					}catch(e){}
							//Set in the video object
							vid.videoDuration = videoDuration;
							
							//TRACK PLAY
							trackVid = vid;
							trackVid.videoTitle = videoTitle;
							trackVid.isReset = true;
							vid.videoBegun = true;
							setInterval(trackPercent, 100);	
							_gaq.push(['_trackEvent', 'Videos', 'Play', videoTitle,parseInt(videoDuration)]);
	

				}	
				break;
			case 2:
				if(vid.videoDuration != videoCurrentTime)
				{
					//PAUSE
					vid.pauseTime = videoCurrentTime;
					_gaq.push(['_trackEvent', 'Videos', 'Pause', videoTitle,parseInt(videoCurrentTime)]);
				}	
				break;
			case 0:
				//CLOSE
				_gaq.push(['_trackEvent', 'Videos', 'Complete', videoTitle,parseInt(vid.videoDuration)]);
				break;	
		}
    }
    vid._prevVidState = event.data;
}


/****** END Video Tracking ******/
