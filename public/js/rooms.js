var STRooms = angular.module('STRooms',[]);

STRooms.controller('RoomsController',function($scope, $http){
	
	$scope.rooms = [];
	$scope.profile = profile;

	$http.get('/api/room').success(function(data) {
		$scope.rooms = data.data;
  	}).error(function(data){
  		console.log("Unable to get rooms");
  	});

  	$scope.createRoom = function(){
  		$http.post('/api/room/create',{displayName:$scope.roomDisplayName}).success(function(data){
  			console.log(data);
  			if(data){
  				$scope.rooms.push(data.data);
  			}
  		}).error(function(data){
  			console.log("Unable to create room");
  		});
  	}

  	$scope.deleteRoom = function(index){
  		$http.post('/api/room/delete',{id:$scope.rooms[index]._id}).success(function(data){
  			console.log(data);
  			if(data){
  				$scope.rooms.splice(index,1);
  			}
  		}).error(function(data){
  			console.log("Unable to delete room");
  		});
  	}

  	$scope.goToRoom = function(index){
  		var roomName = $scope.rooms[index].roomName;
  		if(roomName){
  			window.location.href="/room/"+roomName;
  		}
  	}

    $scope.muteRoom = function(index){
      $http.post('/api/room/mute',{id:$scope.rooms[index]._id}).success(function(data){
          
        console.log(data);

        if(data.data){
          alert($scope.rooms[index].roomName+" muted");
        }else{
          alert($scope.rooms[index].roomName+" note muted");
        }
      });
    }

});

STRooms.directive('ngEnter', function () {
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