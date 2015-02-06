/** @jsx React.DOM */

/* TODO: setTimeout socket doesn't work */

var socketURL = "https://summittalks.herokuapp.com";
var blogURL = "https://summittalks.herokuapp.com/blog";
if(dev){
	socketURL = "http://localhost:1337";
	blogURL = "http://localhost:2368/blog";
}
var socket = io.connect(socketURL,{query: 'token='+token});

if (Notification.permission !== "granted"){
 	Notification.requestPermission();
}

var TalkApp = React.createClass({
	getInitialState: function(){
		if(socket){
			socket.on('userjoin', this.inUserJoin);
			socket.on('userleave', this.inUserLeave);
			socket.on('inmessage', this.inMessage);
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
				showMembers: false
			};
	},
	componentDidMount: function(){
		/* 
			Client never disconnects explicitly, but lets the server handle it when window is closed
			setTimeout() waits for "Stay on Page" click from dialog box.
		*/
		window.onbeforeunload = function(){
			socket.emit('willdisconnect', this.state.joinedRooms);
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
			new Notification(data.sender.displayName, {
	    		icon: '/images/logo.png',
	    		body: data.content,
	 		});
		}
		var nextMessages = this.state.messages.concat([data]);
		this.setState({messages: nextMessages});
		this.scrollDown();
	},
	inUserJoin: function(data){
		/*
			Update room members when a unique user joins
		*/
		var nextMembers = this.state.room.members;
		nextMembers.push(data);
		var nextRoom = this.state.room;
		nextRoom.members = nextMembers;
		this.setState({room: nextRoom});
	},
	inUserLeave: function(data){
		/*
			Update room members when a unique user leaves
		*/
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
	},
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
					if(this.state.room._id==data.roomId){
						this.setState({room:null});
					}
					this.setState({allRooms: nextAllRooms, rooms:nextAllRooms});
				break;
			}
		}
	},
	inCreateRoom: function(data){
		var nextAllRooms = this.state.allRooms;
		nextAllRooms.unshift(data);
		this.setState({allRooms:nextAllRooms, rooms:nextAllRooms});
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
		this.setState({rooms:nextRooms});
	},
	handleSend: function(message){
		socket.emit('outmessage',{content: message.replace(/(<([^>]+)>)/ig,""), roomId:this.state.room._id, roomName: this.state.room.roomName});
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
	toggleMemberList: function(){
		this.setState({showMembers: !this.state.showMembers});
	},
	render: function(){
		var ContentView;
		if (this.state.room) {
			ContentView = 
				(<div>
					<TalkHeader handleMuteRoom={this.handleMuteRoom} handleDeleteRoom={this.handleDeleteRoom} profile={this.state.profile} showMembers={this.state.showMembers} room={this.state.room} toggleMemberList={this.toggleMemberList} picture={this.state.profile.picture} />
					<TalkStream isNew={this.state.isNew} loadOlder={this.loadOlder} messages={this.state.messages}/>
					<TalkInput disabled={this.state.room.isMute} handleSend={this.handleSend}/>
				</div>);
		}else{

			ContentView =
				<iframe className="talk-blog" src={blogURL}></iframe>
		}

		return (
			<div>
				<TalkSideBar handleFilter={this.handleFilter} handleSearch={this.handleSearch} handleCreateRoom={this.handleCreateRoom} handleHomeButton={this.handleHomeButton} handleJoinRoom={this.handleJoinRoom} rooms={this.state.rooms}/>
				<div className="talk-container">
					{ContentView}
				</div>
			</div>
		)
	}
});

var TalkHeader = React.createClass({
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
			<div className="talk-header">
				<img className="avi" src={this.props.profile.picture}></img>
				<span className="talk-title">
					{this.props.room.displayName} - <i>{this.props.room.creator.displayName}</i> 
					<i className={banClass} onClick={this.handleMuteRoom}></i>
					<i className={trashClass} onClick={this.handleDeleteRoom}></i>
				</span>
				<div className="talk-members-button" onClick={this.handleMembersClick}>
					<i className="fa fa-user"></i>
					<span className="member-count">{this.props.room.members.length}</span>
					<div className={membersListClass}>
						{this.props.room.members.map(function(member){
							return <div key={member._id} className="member"><img className="avi" src={member.picture}></img><span className="member-name">{member.displayName}</span><br></br></div>
						}.bind(this))}
					</div>
				</div>
			</div>
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


var TalkSideBar = React.createClass({
	getInitialState: function(){
		return {selected:""}
	},
	render: function(){
		var createRoom = null;
		if(profile.isTeacher){
			createRoom = <TalkCreateRoom handleCreateRoom={this.handleCreateRoom} />
		}
		return (
			<div className="sidebar">
				<TalkToolbar handleHomeButton={this.handleHomeButton}/>
				{createRoom}
				<TalkFindRoom handleSearch={this.handleSearch} handleFilter={this.handleFilter}/>
				<TalkRoomsList handleJoinRoom={this.handleJoinRoom} rooms={this.props.rooms}/>
				<TalkUser/>
			</div>
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

var TalkToolbar = React.createClass({
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
				<a key="logout-button" href="/auth/logout"><div className="logout-button"><i className="fa fa-sign-out"></i></div></a>
			)
		}
		return(
			<div className={brandingClass}>
				<a className="sidebar-link">
				<span className="sidebar-branding-text" onClick={this.handleHomeButton}>Summit Talks</span></a>
				<i className={caretClass} onClick={this.handleCaretButton}></i>
				{toolbarElements}
			</div>
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

var TalkCreateRoom = React.createClass({
  render: function(){
    if(profile.isTeacher){
      return (
        <div className="create-room">
        	<p className="talk-heading">Create a room</p>
        	<select ref="subject" className="subject-selection">
        		<option value="">Choose a subject</option>
			    <option value="Math">Math</option>
			    <option value="Science">Science</option>
			    <option value="Social Studies">Social Studies</option>
			    <option value="English">English</option>
			    <option value="Foreign Language">Foreign Language</option>
			    <option value="Other">Other</option>
  			</select>
       		<input type="text" value={this.state.value} placeholder="Name it and hit enter" className="create-room-input" onChange={this.handleText} onKeyPress={this.handleKeyPress}></input>
        </div>
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

var TalkFindRoom = React.createClass({
	render: function(){
		return (
			<div className="find-room">
				<p className="talk-heading">Rooms</p>
				<select ref="filter" className="subject-selection" onChange={this.handleFilter}>
					<option value="">Show All Rooms</option>
				    <option value="Math">Math</option>
				    <option value="Science">Science</option>
				    <option value="Social Studies">Social Studies</option>
				    <option value="English">English</option>
				    <option value="Foreign Language">Foreign Language</option>
				    <option value="Other">Other</option>
				</select>
				<input placeholder="Search for a room" className="search-field" type="text" onChange={this.handleSearch} />
			</div>
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

var TalkRoomsList = React.createClass({
	render: function(){
		return (
			<div className="talk-rooms-list">
				{this.props.rooms.map(function(room){
					if(this.props.rooms.length > 0){
						return <TalkRoom key={room._id} handleJoinRoom={this.handleJoinRoom} room={room}/>;
					}else{
						return null;
					}
				}.bind(this))}
			</div>
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

var TalkRoom = React.createClass({
	render: function(){
		return (
			<div>
				<div className="talk-room" onClick={this.handleJoinRoom.bind(this, this.props.room.roomName)}><p className="room-name">{this.props.room.displayName}</p></div>
			</div>
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

var TalkUser = React.createClass({
	render: function(){
		return(
			<div className="talk-user"></div>
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
			<div className="talk-stream">
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

var TalkMessage = React.createClass({
	getInitialState: function(){
		return {elements: [],inputText:''}
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
				<b className='talk-message-title'>{this.props.message.sender.displayName}</b><span className='talk-message-time'>{moment(this.props.message.sendTime).calendar()}</span>
				<p className='talk-message-content'>{this.state.elements}</p>
			</div>
		)
	}
});

var TalkInput = React.createClass({
	getInitialState: function(){
		return ({inputText:''});
	},
	handleChange: function(e){
		this.setState({inputText: e.target.value});
	},
	handleKeyPress: function(e){
		if(e.which==13){
			if(this.state.inputText.trim().length > 0){
				this.props.handleSend(this.state.inputText.trim());
			}
			e.preventDefault();
			this.setState({inputText: ""});
		}
	},
	render: function(){
		var placeholder = 'Press enter to send. Be nice!';
		if(this.props.disabled){
			placeholder = 'This room has been temporarily disabled';
		}
		return (
			<textarea value={this.state.inputText} placeholder={placeholder} disabled={this.props.disabled} className="talk-input" onChange={this.handleChange} onKeyPress={this.handleKeyPress}></textarea>
		)
	}
});

React.render(<TalkApp/>, $('.wrap').get(0));
