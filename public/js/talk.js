/*
	TODO: 
	- Scroll to bottom on message receive & when page loads

*/

var STTalk = angular.module('STTalk',[]);

STTalk.controller('TalkController',function($scope, $http, $timeout){
	$scope.token = token;
	$scope.roomName = room.roomName;
	$scope.roomId = room._id;
	$scope.onlineUsers = [];
	$scope.messages = [];
	$scope.profile = profile;
	$scope.inputMessage;
	var menuOpen = false;
	var socketURL;
	if(dev){
		socketURL = "http://localhost:1337";
	}else{
		socketURL = "http://summittalks.herokuapp.com";
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

	if(socket){

		socket.on('inmessage',function(data){
			if(data.sender._id==$scope.profile._id){
				data.isSelf = true;
			}
			$scope.messages.push(data);
			$scope.$apply();
			$(".talk-stream").animate({ scrollTop: $('.talk-stream')[0].scrollHeight}, 1000);
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
				socket.emit('outmessage',{content: $scope.inputMessage});
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

STTalk.directive('message',function(){
	return {
		restrict: 'E',
		transclude: true,
		replace: true,
		scope: {
			message: '=message'
		},
		link: function(scope,element,attrs){
			 var content = scope.message.content;
			 var imageMatches = content.match(/(http:\/\/[\w\-\.]+\.[a-zA-Z]{2,3}(?:\/\S*)?(?:[\w])+\.(?:jpg|png|gif|jpeg|bmp))/ig);
			 var urlMatches = content.match(/https?:\/\/(?:www\.|(?!www))[^\s\.]+\.[^\s]{2,}|www\.[^\s]+\.[^\s]{2,}/ig);
			 var desmosMatches = content.match(/https?:\/\/www.desmos.com\/calculator\/[a-zA-Z0-9]+/ig);
			 var youtubeMatches = content.match(/(?:.+?)?(?:\/v\/|watch\/|\?v=|\&v=|youtu\.be\/|\/v=|^youtu\.be\/)([a-zA-Z0-9_-]{11})+/ig)

			 if(imageMatches){
			 	for(var i=0; i<imageMatches.length; i++){
			 		scope.message.content = scope.message.content.replace(imageMatches[i],"");
			 		element.append("<img class='talk-message-image' src='"+imageMatches[i]+"'></br>");
			 	}
			}
			if(desmosMatches){
				for(var d=0; d<desmosMatches.length; d++){
					scope.message.content = scope.message.content.replace(desmosMatches[d],"");
					element.append("<iframe class='talk-message-desmos' src='"+desmosMatches[d]+"'>");
				}
			}
			if(youtubeMatches){
				for(var y=0; y<youtubeMatches.length; y++){
					scope.message.content = scope.message.content.replace(youtubeMatches[y],"");
					var video_id = youtubeMatches[y].match(/^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/)[7];
					element.append("<iframe class='talk-message-youtube' width='560' height='315' src='http://www.youtube.com/embed/"+video_id+"' frameborder='0' allowfullscreen></iframe>");
				}
			}
 		},
		template:'<div><b class="talk-message-title">{{ message.sender.displayName }}</b><p class="talk-message-content">{{ message.content }}</p></div>',
	};
});
