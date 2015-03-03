/** @jsx React.DOM */

/* TODO: setTimeout socket doesn't work */

var socketURL = "https://summittalks.herokuapp.com";
var blogURL = "https://summittalks-blog.herokuapp.com/welcome/";
if(dev){
	socketURL = "http://localhost:1337";
}
var socket = io.connect(socketURL,{query: 'token='+token});

if (Notification.permission !== "granted"){
 	Notification.requestPermission();
}

var TalkApp = React.createClass({displayName: "TalkApp",
	getInitialState: function(){
		if(socket){
			//socket.on('userjoin', this.inUserJoin);
			//socket.on('userleave', this.inUserLeave);
			socket.on('inmessage', this.inMessage);
			socket.on('inreply', this.inReply);
			socket.on('indeleteroom',this.inDeleteRoom);
			socket.on('inmuteroom', this.inMuteRoom);
			socket.on('increateroom',this.inCreateRoom);
		}
		return {
				joinedRooms: [], //roomName's of rooms the user has joined in this instance
				allRooms: [], //all rooms the server has fetched
				rooms: [], //rooms that are being displayed
				messages:[], 
				profile: profile, 
				room: null, 
				isNew: true,
				showMembers: false,
				filter: ''
			};
	},
	componentDidMount: function(){
		/* 
			Client never disconnects explicitly, but lets the server handle it when window is closed
			setTimeout() waits for "Stay on Page" click from dialog box.
		*/
		window.onbeforeunload = function(){
			//socket.emit('willdisconnect', this.state.joinedRooms);
			setTimeout(function() {
				/*socket = io.connect(socketURL,{query: 'token='+token});
				socket.emit('joinroom',{roomName: this.state.room.roomName});*/
			}.bind(this), 1);
			return "You are now disconnecting from Summit Talks";
		}.bind(this);
		this.getRooms();
	},
	inMessage: function(data){
		/*
			Display a Desktop notification only when someone else is talking
		*/
		if(data.sender._id==profile._id){
			data.isSelf = true;
		}else{
			this.postNotification(data);
		}
		var nextMessages = this.state.messages.concat([data]);
		this.setState({messages: nextMessages});
		this.scrollDown();
	},
	inReply: function(data){
		if(data.sender._id==profile._id){
			data.isSelf = true;
		}else{
			this.postNotification(data);
		}
		var nextMessages = this.state.messages;
		for(var i=0;i<nextMessages.length;i++){
			if(nextMessages[i]._id==data.parentId){
				nextMessages[i].replies.push(data);
				break;
			}
		}
		this.setState({messages: nextMessages});
		this.scrollDown();
	},
	/*inUserJoin: function(data){
		
		Update room members when a unique user joins
		
		var nextMembers = this.state.room.members;
		nextMembers.push(data);
		var nextRoom = this.state.room;
		nextRoom.members = nextMembers;
		this.setState({room: nextRoom});
	},
	inUserLeave: function(data){
		
		Update room members when a unique user leaves
		
		for(var m in this.state.room.members){
			if(this.state.room.members[m]._id==data){
				var nextMembers = this.state.room.members;
				nextMembers.splice(m,1);
				var nextRoom = this.state.room;
				nextRoom.members = nextMembers;
				this.setState({room: nextRoom});
				break;
			}
		}
	},*/
	inMuteRoom: function(data){
		var nextRoom = this.state.room;
		nextRoom.isMute = data;
		this.setState({room: nextRoom});
	},
	inDeleteRoom: function(data){
		for(var i in this.state.allRooms){
			if(this.state.allRooms[i]._id==data.roomId){
				var nextAllRooms = this.state.allRooms;
					nextAllRooms.splice(i,1);
					if(this.state.room){
						if(this.state.room._id==data.roomId){
							this.setState({room:null});
						}
					}
				break;
			}
		}
		this.setState({allRooms:nextAllRooms, rooms:nextAllRooms, filter:''});
	},
	inCreateRoom: function(data){
		var nextAllRooms = this.state.allRooms;
		nextAllRooms.unshift(data);
		this.setState({allRooms:nextAllRooms, rooms:nextAllRooms, filter:''});
	},
	handleJoinRoom: function(roomName){
		/*
			Fired when a room is selected in the sidebar
		*/
		this.getRoom(roomName);
	},
	handleCreateRoom: function(name, subject){
		$.post('/api/room/create',{displayName:name,subject:subject},function(data){
			socket.emit('outcreateroom',data);
		}.bind(this));
	},
	handleDeleteRoom: function(roomId){
		$.post('/api/room/delete', {id:roomId}, function(data){
			if(data){
				socket.emit('outdeleteroom',{roomId:this.state.room._id});
			}
		}.bind(this));
	},
	handleMuteRoom: function(roomId){
		$.post('/api/room/mute',{id:roomId}, function(data){
			if(data){
				var nextRoom = this.state.room;
				socket.emit('outmuteroom',{roomName:this.state.room.roomName, isMute:data.isMute});
			}
		}.bind(this));
	},
	handleHomeButton: function(){
		this.setState({room: null});
	},
	handleSearch: function(term){
		var nextRooms = this.state.rooms;
		if(term.length>0){
			nextRooms = nextRooms.filter(function(room){
				return room.displayName.toLowerCase().search(term.toLowerCase()) !== -1;
			});
		}else{
			nextRooms = this.state.allRooms;
		}
		this.setState({rooms: nextRooms});
	},
	handleFilter: function(subject){
		var nextRooms = [];
		if(subject.length>0){
			for(var i in this.state.allRooms){
				if(this.state.allRooms[i].subject==subject){
					nextRooms.push(this.state.allRooms[i]);
				}
			}
		}else{
			nextRooms = this.state.allRooms;
		}
		this.setState({rooms:nextRooms, filter:subject});
	},
	handleSend: function(content){
		socket.emit('outmessage',{content: content.replace(/(<([^>]+)>)/ig,""), roomId:this.state.room._id, roomName: this.state.room.roomName});
	},
	handleReply: function(content, parentId){
		socket.emit('outreply', {content: content.replace(/(<([^>]+)>)/ig,""), parentId: parentId, roomId:this.state.room._id, roomName: this.state.room.roomName});
	},
	scrollDown: function(){
		$(".talk-stream").animate({ scrollTop: $('.talk-stream')[0].scrollHeight}, 500);
	},
	loadOlder: function(){
		/*
			Fired when "Load older messages" button is clicked. 20 is the current limit
		*/
		this.getMessages(20, this.state.messages[0]._id);
	},
	getRooms: function(){
		/*
			Gets all the rooms
		*/
		$.get('/api/room/', function(data){
			this.setState({rooms: data, allRooms:data});
			if(window.location.hash){
				this.getRoom(window.location.hash.slice(1,window.location.hash.length));
			}
		}.bind(this));
	},
	getRoom: function(roomName){
		$.get('/api/room/'+roomName, function(data){
			/*
				Check if the user has already joined in another instance
			*/
			var alreadyJoined = false;
			for(var i in data.members){
				if(data.members[i]._id==profile._id){
					alreadyJoined = true;
					break;
				}
			}
			/*
				If this is the first join, then add user to the list
			*/
			if(alreadyJoined==false){
				data.members = data.members.concat([profile]);
			}
			/*
				Prevent joining a room more than once when clicking on them
			*/
			if(this.state.joinedRooms.indexOf(data.roomName)==-1){
				var nextJoinedRooms = this.state.joinedRooms.concat([data.roomName]);
			}else{
				nextJoinedRooms = this.state.joinedRooms;
			}
			this.setState({room: data, joinedRooms: nextJoinedRooms});
			this.getMessages(20,0);
			window.location.hash = roomName;
			socket.emit('joinroom',{roomName: roomName});
		}.bind(this));
	},
	getMessages: function(limit, before){
		$.get('/api/room/'+this.state.room._id+'/messages?limit='+limit+'&before='+before, function(data){
			/*
				The room is "new" if it has less than 20 messages.
			*/
			if(data.length < 20){
				this.setState({isNew: true});
			}else{
				this.setState({isNew: false});
			}
			/* Check if current user sent message */
			for(var i in data){
				if(data[i].sender._id == profile._id){
					data[i].isSelf = true;
				}
			}
			/* Check if loading new messages initially, or loading the old ones */
			if(!before){
				this.setState({messages: data});
				this.scrollDown();
			}else{
				var nextMessages = data.concat(this.state.messages);
				this.setState({messages: nextMessages});
			}
		}.bind(this));
	},
	postNotification: function(data){
		new Notification(data.sender.displayName, {
	    		icon: '/images/logo.png',
	    		body: data.content,
	 		});
	},
	toggleMemberList: function(){
		this.setState({showMembers: !this.state.showMembers});
	},
	render: function(){
		var ContentView;
		if (this.state.room) {
			ContentView = 
				(React.createElement("div", null, 
					React.createElement(TalkHeader, {handleMuteRoom: this.handleMuteRoom, handleDeleteRoom: this.handleDeleteRoom, profile: this.state.profile, showMembers: this.state.showMembers, room: this.state.room, toggleMemberList: this.toggleMemberList, picture: this.state.profile.picture}), 
					React.createElement(TalkStream, {isNew: this.state.isNew, loadOlder: this.loadOlder, messages: this.state.messages, handleReply: this.handleReply}), 
					React.createElement(TalkInput, {disabled: this.state.room.isMute, handleSend: this.handleSend})
				));
		}else{
			window.location.hash = "";
			ContentView =
				React.createElement("iframe", {className: "talk-blog", src: blogURL})
		}

		return (
			React.createElement("div", null, 
				React.createElement(TalkSideBar, {filter: this.state.filter, handleFilter: this.handleFilter, handleSearch: this.handleSearch, handleCreateRoom: this.handleCreateRoom, handleHomeButton: this.handleHomeButton, handleJoinRoom: this.handleJoinRoom, rooms: this.state.rooms}), 
				React.createElement("div", {className: "talk-container"}, 
					ContentView
				)
			)
		)
	}
});

var TalkHeader = React.createClass({displayName: "TalkHeader",
	render: function(){
		var membersListClass = "member-list";
		var banClass = "fa fa-ban";
		var trashClass = "fa fa-trash";
		if(!this.props.showMembers){
				membersListClass = "hidden";
		}
		if(!(this.props.profile._id == this.props.room.creator._id)){
			banClass = "hidden";
			trashClass = "hidden";
		}
		return (
			React.createElement("div", {className: "talk-header"}, 
				React.createElement("img", {className: "avi", src: this.props.profile.picture}), 
				React.createElement("span", {className: "talk-title"}, 
					this.props.room.displayName, " - ", React.createElement("i", null, this.props.room.creator.displayName), 
					React.createElement("i", {className: banClass, onClick: this.handleMuteRoom}), 
					React.createElement("i", {className: trashClass, onClick: this.handleDeleteRoom})
				)
				/*<div className="talk-members-button" onClick={this.handleMembersClick}>
					<i className="fa fa-user"></i>
					<span className="member-count">{this.props.room.members.length}</span>
					<div className={membersListClass}>
						{this.props.room.members.map(function(member){
							return <div key={member._id} className="member"><img className="avi" src={member.picture}></img><span className="member-name">{member.displayName}</span><br></br></div>
						}.bind(this))}
					</div>
				</div>*/ 
			)
		)
	},
	handleMuteRoom: function(){
		this.props.handleMuteRoom(this.props.room._id);
	},
	handleDeleteRoom: function(){
		this.props.handleDeleteRoom(this.props.room._id);
	},
	handleMembersClick: function(){
		this.props.toggleMemberList();
	}
});


var TalkSideBar = React.createClass({displayName: "TalkSideBar",
	getInitialState: function(){
		return {selected:""}
	},
	render: function(){
		var createRoom = null;
		if(profile.isTeacher){
			createRoom = React.createElement(TalkCreateRoom, {handleCreateRoom: this.handleCreateRoom})
		}
		return (
			React.createElement("div", {className: "sidebar"}, 
				React.createElement(TalkToolbar, {handleHomeButton: this.handleHomeButton}), 
				createRoom, 
				React.createElement(TalkFindRoom, {filter: this.props.filter, handleSearch: this.handleSearch, handleFilter: this.handleFilter}), 
				React.createElement(TalkRoomsList, {handleJoinRoom: this.handleJoinRoom, rooms: this.props.rooms}), 
				React.createElement(TalkUser, null)
			)
		)
	},
	handleSearch: function(term){
		this.props.handleSearch(term);
	},
	handleFilter: function(subject){
		this.props.handleFilter(subject);
	},
	handleCreateRoom: function(name, subject){
		this.props.handleCreateRoom(name, subject);
	},
	handleJoinRoom: function(roomName){
		this.props.handleJoinRoom(roomName);
	},
	handleHomeButton: function(){
		this.props.handleHomeButton();
	}
});

var TalkToolbar = React.createClass({displayName: "TalkToolbar",
	getInitialState: function(){
		return {isExpanded: false};
	},
	render: function(){
		var caretClass="fa fa-caret-down";
		var brandingClass="sidebar-branding";
		var toolbarElements = [];
		if(this.state.isExpanded){
			caretClass = "fa fa-caret-up";
			brandingClass="sidebar-branding-expanded";
			toolbarElements.push(
				React.createElement("a", {key: "logout-button", href: "/auth/logout"}, React.createElement("div", {className: "logout-button"}, React.createElement("i", {className: "fa fa-sign-out"})))
			)
		}
		return(
			React.createElement("div", {className: brandingClass}, 
				React.createElement("a", {className: "sidebar-link"}, 
				React.createElement("span", {className: "sidebar-branding-text", onClick: this.handleHomeButton}, "Summit Talks")), 
				React.createElement("i", {className: caretClass, onClick: this.handleCaretButton}), 
				toolbarElements
			)
		)
	},
	handleHomeButton: function(){
		this.props.handleHomeButton();
	},
	handleCaretButton: function(e){
		e.preventDefault();
		this.setState({isExpanded: !this.state.isExpanded});
	}
});

var TalkCreateRoom = React.createClass({displayName: "TalkCreateRoom",
  render: function(){
    if(profile.isTeacher){
      return (
        React.createElement("div", {className: "create-room"}, 
        	React.createElement("p", {className: "talk-heading"}, "Create a room"), 
        	React.createElement("select", {ref: "subject", className: "subject-selection"}, 
        		React.createElement("option", {value: ""}, "Choose a subject"), 
			    React.createElement("option", {value: "Math"}, "Math"), 
			    React.createElement("option", {value: "Science"}, "Science"), 
			    React.createElement("option", {value: "Social Studies"}, "Social Studies"), 
			    React.createElement("option", {value: "English"}, "English"), 
			    React.createElement("option", {value: "Foreign Language"}, "Foreign Language"), 
			    React.createElement("option", {value: "Other"}, "Other")
  			), 
       		React.createElement("input", {type: "text", value: this.state.value, placeholder: "Name it and hit enter", className: "create-room-input", onChange: this.handleText, onKeyPress: this.handleKeyPress})
        )
      )
    }
    return null;
  },
  getInitialState: function(){
    return {value: ''}
  },
  handleText: function(e){
    this.setState({value: e.target.value});
  },
  handleKeyPress: function(e){
    if(e.which==13){
    	var subjectSelection = this.refs.subject.getDOMNode().value;
      if(this.state.value.length>0 & subjectSelection.length>0){
        this.props.handleCreateRoom(this.state.value,subjectSelection);
        this.setState({value:''});
      }
    }
  }

});

var TalkFindRoom = React.createClass({displayName: "TalkFindRoom",
	render: function(){
		return (
			React.createElement("div", {className: "find-room"}, 
				React.createElement("p", {className: "talk-heading"}, "Rooms"), 
				React.createElement("select", {value: this.props.filter, ref: "filter", className: "subject-selection", onChange: this.handleFilter}, 
					React.createElement("option", {value: ""}, "Show All Rooms"), 
				    React.createElement("option", {value: "Math"}, "Math"), 
				    React.createElement("option", {value: "Science"}, "Science"), 
				    React.createElement("option", {value: "Social Studies"}, "Social Studies"), 
				    React.createElement("option", {value: "English"}, "English"), 
				    React.createElement("option", {value: "Foreign Language"}, "Foreign Language"), 
				    React.createElement("option", {value: "Other"}, "Other")
				), 
				React.createElement("input", {placeholder: "Search for a room", className: "search-field", type: "text", onChange: this.handleSearch})
			)
		)
	},
	handleSearch: function(e){
		this.props.handleSearch(e.target.value);
	},
	handleFilter: function(e){
		var selected = this.refs.filter.getDOMNode().value;
		this.props.handleFilter(selected);
	}
});

var TalkRoomsList = React.createClass({displayName: "TalkRoomsList",
	render: function(){
		return (
			React.createElement("div", {className: "talk-rooms-list"}, 
				this.props.rooms.map(function(room){
					if(this.props.rooms.length > 0){
						return React.createElement(TalkRoom, {key: room._id, handleJoinRoom: this.handleJoinRoom, room: room});
					}else{
						return null;
					}
				}.bind(this))
			)
		)
	},
	handleMuteRoom: function(roomId){
		this.props.handleMuteRoom(roomId);
	},
	handleDeleteRoom: function(roomId){
		this.props.handleDeleteRoom(roomId);
	},
	handleJoinRoom: function(roomName){
		this.props.handleJoinRoom(roomName);
	}
});

var TalkRoom = React.createClass({displayName: "TalkRoom",
	render: function(){
		return (
			React.createElement("div", null, 
				React.createElement("div", {className: "talk-room", onClick: this.handleJoinRoom.bind(this, this.props.room.roomName)}, React.createElement("p", {className: "room-name"}, this.props.room.displayName))
			)
		)
	},
	handleMuteRoom: function(roomId){
		this.props.handleMuteRoom(roomId);
	},
	handleDeleteRoom: function(roomId){
		this.props.handleDeleteRoom(roomId);
	},
	handleJoinRoom: function(roomName){
		this.props.handleJoinRoom(roomName);
	}
});

var TalkUser = React.createClass({displayName: "TalkUser",
	render: function(){
		return(
			React.createElement("div", {className: "talk-user"})
		)
	}
});

var TalkStream = React.createClass({displayName: "TalkStream",
	render: function(){
		var buttonClass = "talk-stream-button";

		if(this.props.isNew){
			buttonClass = "disabled";
		}

		return (
			React.createElement("div", {className: "talk-stream"}, 
				React.createElement("div", {onClick: this.handleClick, className: buttonClass}, 
					React.createElement("p", {className: "load-text"}, "Load older messages")
				), 
				this.props.messages.map(function(message){
					if(!message.parentId){
						return(React.createElement(TalkMessage, {handleReply: this.handleReply, key: message._id, message: message}));
					}
				}.bind(this))
			)
		)
	},
	handleReply: function(content, parentId){
		this.props.handleReply(content,parentId);
	},
	handleClick: function() {
		this.props.loadOlder();
	}
});

var TalkMessage = React.createClass({displayName: "TalkMessage",
	getInitialState: function(){
		return {elements: [],inputText:''}
	},
	componentWillMount: function(){
		var content = this.props.message.content;
		this.setState({elements: elementsFromContent(content)});

	},
	handleChange: function(e){
		this.setState({inputText: e.target.value});
	},
	handleKeyPress: function(e){
		if(e.which==13){
			if(this.state.inputText.trim().length > 0){
				this.handleSend(this.state.inputText.trim());
			}
			e.preventDefault();
			this.setState({inputText: ""});
		}
	},
	handleSend: function(content){
		this.props.handleReply(content, this.props.message._id);
	},
	render: function(){
		var talkMessageClass = "talk-message";
		if(this.props.message.isSelf){
			talkMessageClass = "talk-message-user";
		}

		return (
			React.createElement("div", {className: talkMessageClass}, 
				React.createElement("b", {className: "talk-message-title"}, this.props.message.sender.displayName), React.createElement("span", {className: "talk-message-time"}, moment(this.props.message.sendTime).calendar()), 
				React.createElement("p", {className: "talk-message-content"}, this.state.elements), 
				React.createElement("input", {type: "text", value: this.state.inputText, onChange: this.handleChange, onKeyPress: this.handleKeyPress}), 
				this.props.message.replies.map(function(reply){
					return (React.createElement(TalkReply, {reply: reply}));
				}.bind())
			)
		)
	}
});

var TalkReply = React.createClass({displayName: "TalkReply",
	getInitialState: function(){
		return {elements: []}
	},
	componentWillMount: function(){
		var content = this.props.reply.content;
		this.setState({elements: elementsFromContent(content)});
	},
	render: function(){
		return ( 
			React.createElement("div", null, 
				React.createElement("b", {className: "talk-message-title"}, this.props.reply.sender.displayName), React.createElement("span", {className: "talk-message-time"}, moment(this.props.reply.sendTime).calendar()), 
				React.createElement("p", {className: "talk-message-content"}, this.state.elements)
			)
		)
	}
});

var TalkInput = React.createClass({displayName: "TalkInput",
	getInitialState: function(){
		return ({inputText:''});
	},
	handleChange: function(e){
		this.setState({inputText: e.target.value});
	},
	handleKeyPress: function(e){
		if(e.which==13){
			if(this.state.inputText.trim().length > 0){
				this.handleSend(this.state.inputText.trim());
			}
			e.preventDefault();
			this.setState({inputText: ""});
		}
	},
	handleSend: function(content){
		this.props.handleSend(content);
	},
	render: function(){
		var placeholder = 'Press enter to send. Be nice!';
		if(this.props.disabled){
			placeholder = 'This room has been temporarily disabled';
		}
		return (
			React.createElement("textarea", {value: this.state.inputText, placeholder: placeholder, disabled: this.props.disabled, className: "talk-input", onChange: this.handleChange, onKeyPress: this.handleKeyPress})
		)
	}
});

function elementsFromContent(content){
	var regex = /https?:\/\/(?:www\.|(?!www))[^\s\.]+\.[^\s]{2,}|www\.[^\s]+\.[^\s]{2,}/ig;

	var tokens = content.split(regex);
	var matches = content.match(regex);

	/* Works thanks to @GreenJello & Ronak Gajrawala */
	function process(token){
		if (/(https?:\/\/[\w\-\.]+\.[a-zA-Z]{2,3}(?:\/\S*)?(?:[\w])+\.(?:jpg|png|gif|jpeg|bmp|svg))/ig.test(token)) {
			return React.createElement("img", {className: "talk-message-image", src: token})
		} else if (/https?:\/\/www.desmos.com\/calculator\/[a-zA-Z0-9]+/ig.test(token)) {
			return React.createElement("iframe", {className: "talk-message-desmos", src: token})
		} else if (/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(.+)/ig.test(token)) {
			var video_id = token.split('v=')[1];
			var ampersandPosition = video_id.indexOf('&');
			if(ampersandPosition != -1) {
					video_id = video_id.substring(0, ampersandPosition);
			}
			return React.createElement("iframe", {className: "talk-message-youtube", width: "560", height: "315", src: 'https://www.youtube.com/embed/'+video_id, frameBorder: "0", allowfullscreen: true});
		} else {
			return React.createElement("a", {target: "_blank", href: token}, token)
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
		return nextElements;
	}
}

React.render(React.createElement(TalkApp, null), $('.wrap').get(0));
