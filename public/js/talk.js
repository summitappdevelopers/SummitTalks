/*
	TODO: 
	- Scroll to bottom on message receive & when page loads

*/

var STTalk = angular.module('STTalk',['ngSanitize']);

STTalk.controller('TalkController',function($scope, $http, $timeout, $sanitize){


	 if (Notification.permission !== "granted"){
	 	Notification.requestPermission();
	 }

	$scope.token = token;
	$scope.roomName = room.roomName;
	$scope.roomId = room._id;
	$scope.isMute = room.isMute;
	$scope.onlineUsers = [];
	$scope.messages = [];
	$scope.profile = profile;
	$scope.inputMessage;
	var menuOpen = false;
	var socketURL;
	
	if(dev){
		socketURL = "http://localhost:1337";
	}else{
		socketURL = "https://summittalks.herokuapp.com";
	}

	if($scope.isMute){
		$scope.talkPlaceholder = "Room temporarily disabled by "+room.creator.displayName;
	}else{
		$scope.talkPlaceholder = "Enter a message. Be nice!";
	}

	$http.get('/api/room/'+$scope.roomId+'/messages').success(function(data) {
		for(var i=0; i<data.messages.length; i++){
			if(data.messages[i].sender._id==$scope.profile._id){
				data.messages[i].isSelf = true;
			}
			$scope.messages.push(data.messages[i]);
		}
  	}).error(function(data){
  		console.log("Unable to get previous messages");
  	});

  	$(".talk-stream").animate({ scrollTop: $('.talk-stream')[0].scrollHeight+205}, 1000);

	var socket = io.connect(socketURL,{
		query: 'token='+token+'&roomName='+$scope.roomName+'&roomId='+$scope.roomId
	});

	window.onbeforeunload = function(){
		socket.disconnect();
		return "You are now disconnecting from this room";
	}

	if(socket && $scope.isMute==false){

		socket.on('inmessage',function(data){
			if(data.sender._id==$scope.profile._id){
				data.isSelf = true;
			}
			$scope.messages.push(data);
			$scope.$apply();
			$(".talk-stream").animate({ scrollTop: $('.talk-stream')[0].scrollHeight}, 1000);
			if(data.sender._id != $scope.profile._id){
				new Notification(data.sender.displayName, {
    				icon: '/images/logo.png',
    				body: data.content,
 				});
			}
		});

		socket.on('currentusers',function(data){
			$scope.onlineUsers = data.roomMembers;
			$scope.$apply();
		});

		socket.on('userleave',function(data){
			for(var i=0;i<$scope.onlineUsers.length;i++){
				if($scope.onlineUsers[i]._id==data){
					$scope.onlineUsers.splice(i,1);
					break;
				}
			}
			$scope.$apply();
		});

		socket.on('userjoin',function(data){
			$scope.onlineUsers.push(data);
			$scope.$apply();
		});

		$scope.sendMessage = function(){
			if($scope.inputMessage.length>0){
				socket.emit('outmessage',{content: $scope.inputMessage.replace(/(<([^>]+)>)/ig,"")});
			}
			$scope.inputMessage = '';
		};
	}

	$scope.toggleMenu = function(){
		menuOpen = !menuOpen;
	}

});

STTalk.directive('ngEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if(event.which === 13) {
                scope.$apply(function (){
                    scope.$eval(attrs.ngEnter);
                });
                event.preventDefault();
            }
        });
    };
});

STTalk.directive('message',function($compile){

	return {
		restrict: 'E',
		transclude: true,
		replace: true,
		scope: {
			message: '=message',
			index: '=index'
		},
		transclude: true,
		link: function(scope,element,attrs){
			
			var dateString = moment(scope.message.sendTime).fromNow();
			scope.message.sendTime = dateString;
			var content = scope.message.content;
			var imageMatches = content.match(/(http:\/\/[\w\-\.]+\.[a-zA-Z]{2,3}(?:\/\S*)?(?:[\w])+\.(?:jpg|png|gif|jpeg|bmp))/ig);
			var urlMatches = content.match(/https?:\/\/(?:www\.|(?!www))[^\s\.]+\.[^\s]{2,}|www\.[^\s]+\.[^\s]{2,}/ig);
			var desmosMatches = content.match(/https?:\/\/www.desmos.com\/calculator\/[a-zA-Z0-9]+/ig);
			var youtubeMatches = content.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(.+)/g);
			if(imageMatches){
			 	for(var i=0; i<imageMatches.length; i++){
			 		content = content.replace(imageMatches[i],"");
			 		element.append("<img class='talk-message-image' src='"+imageMatches[i]+"'></br>");
			 	}
			}
			if(desmosMatches){
				for(var d=0; d<desmosMatches.length; d++){
					content = content.replace(desmosMatches[d],"");
					element.append("<iframe class='talk-message-desmos' src='"+desmosMatches[d]+"'>");
				}
			}
			/* http://stackoverflow.com/a/3452617/896112 */
			if(youtubeMatches){
				for(var y=0; y<youtubeMatches.length; y++){
					content = content.replace(youtubeMatches[y],"");
					var video_id = youtubeMatches[y].split('v=')[1];
					var ampersandPosition = video_id.indexOf('&');
					if(ampersandPosition != -1) {
					  video_id = video_id.substring(0, ampersandPosition);
					}
					element.append("<iframe class='talk-message-youtube' width='560' height='315' src='https://www.youtube.com/embed/"+video_id+"'frameborder='0' allowfullscreen></iframe>");
				}
			}
			if(urlMatches){
				for(var u=0; u<urlMatches.length; u++){
					content = content.replace(urlMatches[u],"<a target='_blank' href="+urlMatches[u]+">"+urlMatches[u]+"</a>");
				}
			}

			scope.message.content = content;

 		},
		template:"<div><b class='talk-message-title'>{{ message.sender.displayName }}</b><span class='talk-message-time'>{{ message.sendTime }}</span><p class='talk-message-content' ng-bind-html='message.content'>{{ message.content }}</p></div>",
	};
});
