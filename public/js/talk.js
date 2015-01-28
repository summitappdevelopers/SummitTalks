var socketURL = "https://summittalks.herokuapp.com";

if(dev){
	socketURL = "http://localhost:1337";
}
var socket = io.connect(socketURL,{
	 query: 'token='+token+'&roomName='+room.roomName+'&roomId='+room._id
});

window.onbeforeunload = function(){
	socket.disconnect();
	return "You are now disconnecting from this room";
}

if (Notification.permission !== "granted"){
 	Notification.requestPermission();
}

var TalkUser = React.createClass({
	render: function(){
		return (
			<div className="userLabel">
				<img className="avi" src={this.props.picture}></img>
				<span className="userName">{this.props.displayName}</span>
			</div>
		)
	}
});

var TalkUserList = React.createClass({
	render: function(){
		return (

			<div>
			
			{this.props.users.map(function(user){
				return(<TalkUser key={user._id} picture={user.picture} displayName={user.displayName}/>)
			}.bind(this))}

			</div>
		)
	}
});

var TalkSideBar = React.createClass({

	render: function(){
		return (
			<div className="sidebar">
				<div className="sidebar-branding">
					<a className="sidebar-link" href="/">
					<span className="sidebar-branding-text">Summit Talks</span></a>
				</div>
				<TalkUserList users={this.props.users}/>
			</div>
		)
	}

});

var TalkMessage = React.createClass({
	getInitialState: function(){
		return {elements: []}
	},
	componentWillMount: function(){

		var content = this.props.message.content;

		var regex = /https?:\/\/(?:www\.|(?!www))[^\s\.]+\.[^\s]{2,}|www\.[^\s]+\.[^\s]{2,}/ig;

		var tokens = content.split(regex);
		var matches = content.match(regex);

		/* Works thanks to @GreenJello & Ronak Gajrawala */
		function process(token){
			if (/(https?:\/\/[\w\-\.]+\.[a-zA-Z]{2,3}(?:\/\S*)?(?:[\w])+\.(?:jpg|png|gif|jpeg|bmp|svg))/ig.test(token)) {
				return <img className="talk-message-image" src={token}></img>
			} else if (/https?:\/\/www.desmos.com\/calculator\/[a-zA-Z0-9]+/ig.test(token)) {
				return <iframe className="talk-message-desmos" src={token}></iframe>
			} else if (/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(.+)/ig.test(token)) {
				var video_id = token.split('v=')[1];
				var ampersandPosition = video_id.indexOf('&');
				if(ampersandPosition != -1) {
  					video_id = video_id.substring(0, ampersandPosition);
				}
				return <iframe className='talk-message-youtube' width='560' height='315' src={'https://www.youtube.com/embed/'+video_id} frameBorder='0' allowfullscreen></iframe>;
			} else {
				return <a target="_blank" href={token}>{token}</a>
			}
		}

		if(tokens){
			var nextElements = [];
			var addLength = 0;
			if(matches){
				addLength = matches.length
			}
			for(var j=0; j<(tokens.length+addLength); j++){
				if(j%2==0){
					nextElements.push(tokens[Math.floor(j/2)]);
				}else{
					nextElements.push(process(matches[Math.floor(j/2)]));
				}
			}

			this.setState({elements: nextElements});
		}

	},
	render: function(){
		
		var talkMessageClass = "talk-message";
		if(this.props.message.isSelf){
			talkMessageClass = "talk-message-user";
		}

		return (

			<div className={talkMessageClass}>
				<b className='talk-message-title'>{this.props.message.sender.displayName}</b><span className='talk-message-time'>{this.props.message.sendTime}</span>
				<p className='talk-message-content'>{this.state.elements}</p>
			</div>
		)
	}
});

var TalkStream = React.createClass({

	render: function(){

		var buttonClass = "talk-stream-button";

		if(this.props.isNew){
			buttonClass = "disabled";
		}

		return (
			<div>
				<div onClick={this.handleClick} className={buttonClass}>
					<p className="load-text">Load older messages</p>
				</div>
				{this.props.messages.map(function(message){
					return(<TalkMessage key={message._id} message={message}/>);
				}.bind(this))}
			</div>
		)
	},

	handleClick: function() {
		this.props.loadOlder();
	}

});

var TalkInput = React.createClass({
	getInitialState: function(){
		return {inputText: '',placeholder: ''}
	},
	componentDidMount: function(){
		if(this.props.disabled){
			this.setState({placeholder: 'This room has been temporarily disabled'});
		}else{
			this.setState({placeholder: 'Press enter to send. Be nice!'});
		}
	},
	handleChange: function(e){
		this.setState({inputText: e.target.value});
	},
	handleKeyPress: function(e){
		if(e.which==13){
			if(this.state.inputText.trim().length > 0){
				this.props.handleSend(this.state.inputText);
			}
			e.preventDefault();
			this.setState({inputText: ""});
		}
	},
	render: function(){
		var inputText = this.state.inputText;
		return (
			<textarea value={this.state.inputText} placeholder={this.state.placeholder} disabled={this.props.disabled} className="talk-input" onChange={this.handleChange} onKeyPress={this.handleKeyPress}></textarea>
		)
	}
});

var TalkApp = React.createClass({

	getInitialState: function(){
		if(socket){
			socket.on('currentusers', this.currentUsers);
			socket.on('userjoin', this.userJoin);
			socket.on('userleave', this.userLeave);
			socket.on('inmessage', this.inMessage);
		}
		return {users: [], messages:[], profile: profile, room: room, isNew: true};
	},
	componentDidMount: function(){
		this.getMessages(20,0);
	},
	currentUsers: function(data){
		this.setState({users: data});
	},
	userJoin: function(data){
		var nextUsers = this.state.users.concat([data]);
		this.setState({users: nextUsers});
	},
	userLeave: function(data){
		var nextUsers = this.state.users;
		for(var i in this.state.users){
			if(this.state.users[i]._id==data){
				nextUsers.splice(i,1);
				break;
			}
		}
		this.setState({users: nextUsers});
	},
	inMessage: function(data){
		if(data.sender._id==profile._id){
			data.isSelf = true;
		}else{
			new Notification(data.sender.displayName, {
	    		icon: '/images/logo.png',
	    		body: data.content,
	 		});
		}
		var nextMessages = this.state.messages.concat([data]);
		this.setState({messages: nextMessages});
		this.scrollDown();
	},
	handleSend: function(message){
		socket.emit('outmessage',{content: message.replace(/(<([^>]+)>)/ig,"")});
	},
	handleReply: function(message, parent){
		socket.emit('')
	},
	scrollDown: function(){
		$(".talk-stream").animate({ scrollTop: $('.talk-stream')[0].scrollHeight}, 1000);
	},
	render: function(){
		return (
			<div>
				<TalkSideBar users={this.state.users}/>
				<div className="talk-container">
					<div className="talk-header">
						<img className="avi" src={this.state.profile.picture}></img>
						<span className="talk-title">
							{this.state.room.displayName} - <i>{this.state.room.creator.displayName}</i> 
						</span>
					</div>
					<div className="talk-stream">
						<TalkStream isNew={this.state.isNew} loadOlder={this.loadOlder} messages={this.state.messages}/>
					</div>
					<TalkInput disabled={this.state.room.isMute} handleSend={this.handleSend}/>
				</div>
			</div>
		)
	},
	loadOlder: function(){
		this.getMessages(20, this.state.messages[0]._id);
	},
	getMessages: function(limit, before){
		$.get('/api/room/'+this.state.room._id+'/messages?limit='+limit+'&before='+before, function(data){
			if(data.length < 20){
				this.setState({isNew: true});
			}else{
				this.setState({isNew: false});
			}
			for(var i in data){
				if(data[i].sender._id == profile._id){
					data[i].isSelf = true;
				}
			}
			if(!before){
				this.setState({messages: data});
				this.scrollDown();
			}else{
				var nextMessages = data.concat(this.state.messages);
				this.setState({messages: nextMessages});
			}
		}.bind(this));
	}
});

React.render(<TalkApp/>, $('.wrap').get(0));


// /*
// 	TODO: 
// 	- Scroll to bottom on page load

// */

// (function() {
// var talkApp = {

// 	STTalk: {},
// 	token: token,
// 	room: room,
// 	socketURL: "",
// 	socket: {},
// 	profile: {},
// 	init: function(){

// 		talkApp.STTalk = angular.module('STTalk',['ngSanitize']);

// 		talkApp.STTalk.controller('TalkController',function($scope, $http, $timeout, $sanitize){

// 		talkApp.profile = profile;

// 		 if (Notification.permission !== "granted"){
// 		 	Notification.requestPermission();
// 		 }

// 		$scope.token = talkApp.token;
// 		$scope.roomName = talkApp.room.roomName;
// 		$scope.roomId = talkApp.room._id;
// 		$scope.isMute = talkApp.room.isMute;
// 		$scope.onlineUsers = [];
// 		$scope.messages = [];
// 		$scope.inputMessage;

// 		var menuOpen = false;
// 		var socketURL;
		
// 		if(dev){
// 			socketURL = "http://localhost:1337";
// 		}else{
// 			socketURL = "https://summittalks.herokuapp.com";
// 		}

// 		if($scope.isMute){
// 			$scope.talkPlaceholder = "Room temporarily disabled by "+room.creator.displayName;
// 		}else{
// 			$scope.talkPlaceholder = "Enter a message. Be nice!";
// 		}

// 		$http.get('/api/room/'+$scope.roomId+'/messages').success(function(data) {
// 			for(var i=0; i<data.messages.length; i++){
// 				if(data.messages[i].sender._id==talkApp.profile._id){
// 					data.messages[i].isSelf = true;
// 				}
// 				$scope.messages.push(data.messages[i]);
// 			}
// 	  	}).error(function(data){
// 	  		console.log("Unable to get previous messages");
// 	  	});

// 	  	$(".talk-stream").animate({ scrollTop: $('.talk-stream')[0].scrollHeight+205}, 1000);

// 		talkApp.socket = io.connect(socketURL,{
// 			query: 'token='+token+'&roomName='+$scope.roomName+'&roomId='+$scope.roomId
// 		});

// 		window.onbeforeunload = function(){
// 			socket.disconnect();
// 			return "You are now disconnecting from this room";
// 		}

// 		if(talkApp.socket && $scope.isMute==false){

// 			talkApp.socket.on('inmessage',function(data){
// 				if(data.sender._id==talkApp.profile._id){
// 					data.isSelf = true;
// 				}
// 				$scope.messages.push(data);
// 				$scope.$apply();
// 				talkApp.utils.scrollDown();
// 				if(data.sender._id != talkApp.profile._id){
// 					new Notification(data.sender.displayName, {
// 	    				icon: '/images/logo.png',
// 	    				body: data.content,
// 	 				});
// 				}
// 			});


// 			talkApp.socket.on('currentusers',function(data){
// 				$scope.onlineUsers = data.roomMembers;
// 				$scope.$apply();
// 			});

// 			talkApp.socket.on('userleave',function(data){
// 				for(var i=0;i<$scope.onlineUsers.length;i++){
// 					if($scope.onlineUsers[i]._id==data){
// 						$scope.onlineUsers.splice(i,1);
// 						break;
// 					}
// 				}
// 				$scope.$apply();
// 			});

// 			talkApp.socket.on('userjoin',function(data){
// 				$scope.onlineUsers.push(data);
// 				$scope.$apply();
// 			});

// 			$scope.sendMessage = function(inputMessage){
// 				if(inputMessage.length>0){
// 					talkApp.socket.emit('outmessage',{content: inputMessage.replace(/(<([^>]+)>)/ig,"")});
// 				}
// 				$scope.inputMessage = '';
// 			};

// 		}

// 		$scope.toggleMenu = function(){
// 			menuOpen = !menuOpen;
// 		}

// 		});

// 		talkApp.STTalk.directive('message',function(){
// 			return {
// 				restrict: 'E',
// 				transclude: true,
// 				replace: true,
// 				index: 0,
// 				scope: {
// 					message: '=message'
// 				},
// 				transclude: true,
// 				link: function(scope,element,attrs){
// 					var dateString = moment(scope.message.sendTime).fromNow();
// 					scope.message.sendTime = dateString;
					// var content = scope.message.content;
					// var imageMatches = content.match(/(https?:\/\/[\w\-\.]+\.[a-zA-Z]{2,3}(?:\/\S*)?(?:[\w])+\.(?:jpg|png|gif|jpeg|bmp|svg))/ig);
					// var urlMatches = content.match(/https?:\/\/(?:www\.|(?!www))[^\s\.]+\.[^\s]{2,}|www\.[^\s]+\.[^\s]{2,}/ig);
					// var desmosMatches = content.match(/https?:\/\/www.desmos.com\/calculator\/[a-zA-Z0-9]+/ig);
					// var youtubeMatches = content.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(.+)/g);
// 					if(imageMatches){
// 					 	for(var i=0; i<imageMatches.length; i++){
// 					 		content = content.replace(imageMatches[i],"");
// 					 		element.append("<img className='talk-message-image' src='"+imageMatches[i]+"'></br>");
// 					 	}
// 					}
// 					if(desmosMatches){
// 						for(var d=0; d<desmosMatches.length; d++){
// 							content = content.replace(desmosMatches[d],"");
// 							element.append("<iframe className='talk-message-desmos' src='"+desmosMatches[d]+"'>");
// 						}
// 					}
// 					/* http://stackoverflow.com/a/3452617/896112 */
// 					if(youtubeMatches){
// 						for(var y=0; y<youtubeMatches.length; y++){
// 							content = content.replace(youtubeMatches[y],"");
// 							var video_id = youtubeMatches[y].split('v=')[1];
// 							var ampersandPosition = video_id.indexOf('&');
// 							if(ampersandPosition != -1) {
// 							  video_id = video_id.substring(0, ampersandPosition);
// 							}
// 							element.append("<iframe className='talk-message-youtube' width='560' height='315' src='https://www.youtube.com/embed/"+video_id+"'frameborder='0' allowfullscreen></iframe>");
// 						}
// 					}

// 					if(urlMatches){
// 						for(var u=0; u<urlMatches.length; u++){
// 							content = content.replace(urlMatches[u],"<a target='_blank' href="+urlMatches[u]+">"+urlMatches[u]+"</a>");
// 						}
// 					}

// 					scope.message.content = content;

// 		 		},
// 				template:"<div><b className='talk-message-title'>{{ message.sender.displayName }}</b><span className='talk-message-time'>{{ message.sendTime }}</span><p className='talk-message-content' ng-bind-html='message.content'>{{ message.content }}</p></div>",
// 			};
// 		});

// 		talkApp.STTalk.directive('ngEnter', function () {
// 		    return function (scope, element, attrs) {
// 		        element.bind("keydown keypress", function (event) {
// 		            if(event.which === 13) {
// 		                scope.$apply(function (){
// 		                    scope.$eval(attrs.ngEnter);
// 		                });
// 		                event.preventDefault();
// 		            }
// 		        });
// 		    };
// 		});
// 	},
// 	utils: {

// 		scrollDown: function() {
// 			$(".talk-stream").animate({ scrollTop: $('.talk-stream')[0].scrollHeight}, 1000);
// 		}		

// 	}
// }

// talkApp.init();
// })();
