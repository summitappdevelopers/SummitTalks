/*
 * @jsx React.DOM 
 */

//FIX SEARCH!

var RoomCreateInput = React.createClass({
  render: function(){
    if(profile.isTeacher){
      return (
        <div className="create-room">
              <input type="text" placeholder="Give a room name and hit enter" className="create-room-input" onChange={this.handleChange} onKeyPress={this.handleKeyPress}></input>
        </div>
      )
    }
    return null;
  },
  getInitialState: function(){
    return {value: ''}
  },
  handleChange: function(e){
    this.setState({value: e.target.value});
  },
  handleKeyPress: function(e){
    if(e.which==13){
      if(this.state.value.length>0){
        this.props.handleAdd(this.state.value);
      }
    }
  }

});

var RoomHeader = React.createClass({
  render: function(){
    var className = "rooms-list-header"
    if(!profile.isTeacher){
      className+=" rooms-list-header-push";
    }
    return (
      <div className={className}>
        <span className="rooms-list-header-title">Rooms</span>
        <RoomSearch />
      </div>
    )
  }
});

var RoomSearch = React.createClass({
  render: function(){
     return (
        <input type="text" placeholder="Search for a room name" className="rooms-list-search-input"></input>
      )
  }
});

var Room = React.createClass({
  render: function(){
    
    var utilDisplay={};
    if(!this.props.isTeacher){
      utilDisplay.display = 'none';
    }

    return(
      <div className="room-box-container">  
            <div className='room-box' onClick={this.handleClick}>
              <img className="avi-room" src={this.props.room.creator.picture}></img>
              <div className="room-name-box">
                <span className="room-name">{this.props.room.displayName}<br></br><i>{this.props.room.creator.displayName}</i></span>
              </div>
              <div className="room-details-box">
                <span className="room-utils">
                  <i className="fa fa-users"></i>
                  {this.props.room.members.length}  
                  <span style={utilDisplay}>
                    <i className="fa fa-button fa-ban" onClick={this.handleMute}></i>
                    <i className="fa fa-button fa-trash" onClick={this.handleDelete}></i>
                  </span>
                </span>
              </div>
            </div>
      </div>   
    )
  },
  handleMute: function(e){
    e.stopPropagation();
    $.post('/api/room/mute', {id:this.props.room._id}, function(data){
      console.log(data);
    });
  },
  handleDelete: function(e){
    e.stopPropagation();
    this.props.handleDelete(this.props.room._id);
  },
  handleClick: function(e){
    this.props.handleClick(this.props.room.roomName);
  }

});

var RoomList = React.createClass({

  render: function(){

    return(
      <div className='rooms-list'>
          
        {this.props.rooms.map(function(room) {
          return <Room key={room._id} isTeacher={profile.isTeacher} handleClick={this.handleClick} handleDelete={this.handleDelete} room={room}/>
        }.bind(this))}

      </div>
    )
  },

  handleDelete: function(id){
    this.props.handleDelete(id);
  },

  handleClick: function(roomName){
    this.props.handleClick(roomName);
  }

});

var RoomApp = React.createClass({

  getInitialState: function(){
    return {rooms: []}
  },
  componentDidMount: function() {
    $.get('/api/room', function(data) {
      var rooms = data;
      if (this.isMounted()) {
        this.setState({
          rooms: rooms
        });
      }
    }.bind(this));
  },
  render: function(){
    return (
      <div>
        <RoomCreateInput handleAdd={this.handleAdd}/>
        <RoomHeader/>
        <RoomList handleClick={this.handleClick} handleDelete={this.handleDelete} rooms={this.state.rooms} />
      </div>
    );
  },
  handleClick: function(roomName){
    var win = window.open('/room/'+roomName, '_blank');
    win.focus();
  },
  handleAdd: function(displayName){
    $.post('/api/room/create', {displayName: displayName}, function(data){
      this.state.rooms.push(data);
      this.setState();
    }.bind(this));
  },
  handleDelete: function(id){
    for(var i=0;i<this.state.rooms.length;i++){
      if(this.state.rooms[i]._id==id){
        this.state.rooms.splice(i,1);
        this.setState();
        break;
      }
    }
    $.post('/api/room/delete',{id:id}, function(data){
      console.log(data);
    });
  }
});

React.render(<RoomApp/>, $('.rooms-wrap').get(0));
