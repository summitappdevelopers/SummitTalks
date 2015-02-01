/*
	newroom > scienceroom > newroom > reload = crash
*/

var socketURL = "https://summittalks.herokuapp.com";
var blogURL = "https://summittalks.herokuapp.com";
if(dev){
	socketURL = "http://localhost:1337";
	blogURL = "http://localhost:2368/blog";
}
var socket = io.connect(socketURL,{query: 'token='+token});;

if (Notification.permission !== "granted"){
 	Notification.requestPermission();
}

var TalkApp = React.createClass({
	getInitialState: function(){
		if(socket){
			socket.on('roomdata', this.getRoomData);
			socket.on('userjoin', this.userJoin);
			socket.on('userleave', this.userLeave);
			socket.on('inmessage', this.inMessage);
		}
		return {
				joinedRooms: [],
				messages:[], 
				profile: profile, 
				room: null, 
				subjects: [
							{name:"Math", rooms:[]}, 
							{name:"Science", rooms:[]}, 
							{name:"Social Studies", rooms: []}, 
							{name:"English", rooms:[]}, 
							{name:"Foreign Language", rooms:[]},
							{name:"Other", rooms:[]}
						  ], 
				isNew: true,
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
				socket.connect();
			}, 1);
			return "You are now disconnecting from Summit Talks";
		}.bind(this);
		this.getSubjects();
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
	handleSend: function(message){
		socket.emit('outmessage',{content: message.replace(/(<([^>]+)>)/ig,""), roomId:this.state.room._id, roomName: this.state.room.roomName});
	},
	userJoin: function(data){
		/*
			Update room members when a unique user joins
		*/
		console.log(data.displayName+" joined "+this.state.room.roomName);
		var nextMembers = this.state.room.members;
		nextMembers.push(data);
		var nextRoom = this.state.room;
		nextRoom.members = nextMembers;
		this.setState({room: nextRoom});
	},
	userLeave: function(data){
		/*
			Update room members when a unique user leaves
		*/
		for(var m in this.state.room.members){
			if(this.state.room.members[m]._id==data){
				console.log(this.state.room.members[m].displayName+" left "+this.state.room.roomName);
				var nextMembers = this.state.room.members;
				nextMembers.splice(m,1);
				var nextRoom = this.state.room;
				nextRoom.members = nextMembers;
				this.setState({room: nextRoom});
				break;
			}
		}
	},
	handleJoinRoom: function(roomName){
		/*
			Fired when a room is selected in the sidebar
		*/
		this.getRoom(roomName);
	},
	handleCreateRoom: function(name, subject){
		$.post('/api/room/create',{displayName:name,subject:subject},function(data){
			var nextSubjects = this.state.subjects;
			for(var i in nextSubjects){
				if(nextSubjects[i].name == data.subject){
					nextSubjects[i].rooms.unshift(data);
					break;
				}
			}
			this.setState({subjects:nextSubjects});
		}.bind(this));
	},
	handleHomeButton: function(){
		this.setState({room: null});
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
	getSubjects: function(){
		/*
			Sorts all the rooms into predefined "Subjects" to be rendered on the sidebar
		*/
		$.get('/api/room/', function(data){
			var nextSubjects = this.state.subjects;
			for(var i in data){
				switch(data[i].subject){
					case "Math":
						nextSubjects[0].rooms.push(data[i]);
						break;
					case "Science":
						nextSubjects[1].rooms.push(data[i]);
						break;
					case "Social Studies":
						nextSubjects[2].rooms.push(data[i]);
						break;
					case "English":
						nextSubjects[3].rooms.push(data[i]);
						break;
					case "Foreign Language":
						nextSubjects[4].rooms.push(data[i]);
						break;
					default:
						nextSubjects[5].rooms.push(data[i]);
						break;
				}
			}
			this.setState({subjects: nextSubjects});
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
					console.log("Already joined.");
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
	render: function(){
		var ContentView;
		if (this.state.room) {

			ContentView = 
				(<div>
					<div className="talk-header">
						<img className="avi" src={this.state.profile.picture}></img>
						<span className="talk-title">
							{this.state.room.displayName} - <i>{this.state.room.creator.displayName}</i> 
						</span>
						<div className="talk-members-button">
						</div>
					</div>
					<div className="talk-stream">
						<TalkStream isNew={this.state.isNew} loadOlder={this.loadOlder} messages={this.state.messages}/>
					</div>
					<TalkInput disabled={this.state.room.isMute} handleSend={this.handleSend}/>
				</div>);
		}else{

			ContentView =
				<iframe className="talk-blog" src={blogURL}></iframe>
		}

		return (
			<div>
				<TalkSideBar handleCreateRoom={this.handleCreateRoom} handleHomeButton={this.handleHomeButton} handleJoinRoom={this.handleJoinRoom} subjects={this.state.subjects}/>
				<div className="talk-container">
					{ContentView}
				</div>
			</div>
		)
	}
});


var TalkSideBar = React.createClass({

	render: function(){
		var createRoom = null;
		if(profile.isTeacher){
			createRoom = <TalkCreateRoom handleCreateRoom={this.handleCreateRoom} />
		}
		return (
			<div className="sidebar">
				<TalkToolbar handleHomeButton={this.handleHomeButton}/>
				{createRoom}
				<TalkSubjectsList handleJoinRoom={this.handleJoinRoom} subjects={this.props.subjects}/>
				<TalkUser/>
			</div>
		)
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
				<a href="/auth/logout"><div className="logout-button"><i className="fa fa-sign-out"></i></div></a>
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
        	<p className="talk-subject-name">Create a room</p>
        	<select className="subject-selection">
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
    	var subjectSelection = $('.subject-selection').val();
      if(this.state.value.length>0 & subjectSelection.length>0){
        this.props.handleCreateRoom(this.state.value,subjectSelection);
        this.setState({value:''});
      }
    }
  }

});

var TalkSubjectsList = React.createClass({
	render: function(){
		return (
			<div className="talk-subjects-list">
				{this.props.subjects.map(function(subject){
					if(subject.rooms.length > 0){
						return <TalkSubject key={subject.name} handleJoinRoom={this.handleJoinRoom} subject={subject}/>;
					}else{
						return null;
					}
				}.bind(this))}
			</div>
		)
	},
	handleJoinRoom: function(roomName){
		this.props.handleJoinRoom(roomName);
	}
});

var TalkSubject = React.createClass({
	render: function(){
		return (
			<div>
				<p className="talk-subject-name">{this.props.subject.name}</p>
				{this.props.subject.rooms.map(function(room){
					return <p className="talk-subject-room" key={room._id} onClick={this.handleJoinRoom.bind(this, room.roomName)}>{room.displayName}</p>
				}.bind(this))}
			</div>
		)
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

var TalkInput = React.createClass({
	getInitialState: function(){
		return {inputText: '', placeholder: ''}
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
				this.props.handleSend(this.state.inputText.trim());
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

React.render(<TalkApp/>, $('.wrap').get(0));
