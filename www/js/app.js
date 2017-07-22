var PROX_UNKNOWN = 'ProximityUnknown';
var PROX_FAR = 'ProximityFar';
var PROX_NEAR = 'ProximityNear';
var PROX_IMMEDIATE = 'ProximityImmediate';

var app = angular.module('myApp', ['onsen']);

app.service('iBeaconService', function() {
    this.message = "";
    this.currentBeaconUuid = null;
    this.onDetectCallback = function(){};
    this.endStationNum = 2;
    this.startStationNum = 0;
    this.diff = null;
    
    var beacons = {
        "00000000-E9C0-1001-B000-001C4DAB649D": {icon: 'img/train.jpg', rssi: -63, proximity: PROX_UNKNOWN, id:'00000000-E9C0-1001-B000-001C4DAB649D', name: 'train', number: '0', major: 2, minor: 10},
        "0FF26226-0000-4E1B-94DE-2451E4FCB329": {icon: 'img/enkai.jpg', rssi: -63, proximity: PROX_UNKNOWN, id:'0FF26226-0000-4E1B-94DE-2451E4FCB329', name: 'えんかい', number: '1', major: 2, minor: 4},
        "6523B796-0000-47DE-B0C3-43228BF36717": {icon: 'img/doudesyo.jpg', rssi: -63, proximity: PROX_UNKNOWN, id:'6523B796-0000-47DE-B0C3-43228BF36717', name: 'どうでしょう', number: '2', major: 2, minor: 2},
        "A7E74238-0000-4342-81EC-E0029BE0B76C": {icon: 'img/kiminona.jpg', rssi: -63, proximity: PROX_UNKNOWN, id:'A7E74238-0000-4342-81EC-E0029BE0B76C', name: '君の名は。', number: '3', major: 2, minor: 3}
       };
    this.beacons = beacons;
    
    var src1 = "horror_piano3.mp3"; //音素材
    var alerm = null;
    
    createBeacons = function() {
        var result = [];
        try {
            angular.forEach(beacons, function(value, key) {
                result.push(new cordova.plugins.locationManager.BeaconRegion(value.id, key, value.major, value.minor));
            });
        } catch (e) {
            console.log('createBeacon err: ' + e);
        }
        return result;
    };

    this.watchBeacons = function(callback){
        document.addEventListener("deviceready", function(){
            var beacons = createBeacons();
            
            try {    
                var delegate = new cordova.plugins.locationManager.Delegate();

                delegate.didDetermineStateForRegion = function (pluginResult) {
                
                    console.log('[DOM] didDetermineStateForRegion: ' + JSON.stringify(pluginResult));
                
                    cordova.plugins.locationManager.appendToDeviceLog('[DOM] didDetermineStateForRegion: '
                        + JSON.stringify(pluginResult));
                };
                
                delegate.didStartMonitoringForRegion = function (pluginResult) {
                    console.log('didStartMonitoringForRegion:', pluginResult);
                
                    console.log('didStartMonitoringForRegion:' + JSON.stringify(pluginResult));
                };
                
                delegate.didRangeBeaconsInRegion = function (pluginResult) {
                    var beaconData = pluginResult.beacons[0];
                    var uuid = pluginResult.region.uuid.toUpperCase();
                    if (!beaconData || !uuid) {
                        return;
                    }
                    
                    callback(beaconData, uuid);
                    console.log('[DOM] didRangeBeaconsInRegion: ' + JSON.stringify(pluginResult));
                };
                
                cordova.plugins.locationManager.setDelegate(delegate);
                
                // required in iOS 8+
                cordova.plugins.locationManager.requestWhenInUseAuthorization(); 
                // or cordova.plugins.locationManager.requestAlwaysAuthorization()
                
                beacons.forEach(function(beacon) {
                    cordova.plugins.locationManager.startRangingBeaconsInRegion(beacon);
                });
                
            } catch (e) {
                console.log('Delegate err: ' + e);   
            }
        }, false);
    };
});

app.controller('InfoPageCtrl', ['$scope', 'iBeaconService', function($scope, iBeaconService) {
    $scope.beacon = iBeaconService.beacons[iBeaconService.currentBeaconUuid];
    $scope.beaconUuid = iBeaconService.currentBeaconUuid;
    $scope.message = iBeaconService.message;
}]);

app.controller('TopPageCtrl', ['$scope', 'iBeaconService', function($scope, iBeaconService) {        
    
    $scope.beacons = iBeaconService.beacons;
    
    var callback = function(deviceData, uuid)
    {
        var beacon = $scope.beacons[uuid];
        $scope.$apply(function()
        {
            beacon.rssi = deviceData.rssi;
            switch (deviceData.proximity)
            {
                case PROX_IMMEDIATE:
                    beacon.proximity = 'めっちゃ近い-Immediate';
                    alerm.play();
                    break;
                case PROX_NEAR:
                    beacon.proximity = '近い-Near';
                    break;
                case PROX_FAR:
                    beacon.proximity = '遠い-Far';
                    break;
                case PROX_UNKNOWN:
                default:
                    break;
            }

            if (iBeaconService.currentBeaconUuid === null && beacon.rssi > -85) {

                if (iBeaconService.endStation != "") {
                    var endStationNum = iBeaconService.endStationNum;
                    var diff = endStationNum - beacon.number;
                    if(iBeaconService.diff != diff){
                        if (diff == 1) {
                            iBeaconService.message = "次の駅で降ります！";
                        } else if (diff == 0) {
                            iBeaconService.message = "降りる駅です！";
                        } else if (diff < 0) {
                            iBeaconService.message = "乗り過ごしています！";
                        } else {
                            iBeaconService.message = "";
                        }
                        $('.location').hide();
                        $('.' + beacon.name).show();
                        iBeaconService.diff = diff;
                        $scope.enterInfoPage(uuid); //別画面の表示。
                    }
                }
            }
        });
    };
    iBeaconService.watchBeacons(callback);

    $scope.onClick = function(passStatus, number){
        if (passStatus == 'START') {
            iBeaconService.startStationNum = 0;
        } else if (passStatus == 'END') {
            iBeaconService.endStationNum = 2;
        }
        alert(passStatus + '駅に設定しました。');
    }

    
    $scope.enterInfoPage = function(currentUuid) {
        iBeaconService.currentBeaconUuid = currentUuid;
        $scope.ons.navigator.pushPage('info-page.html');
        $scope.ons.navigator.on("prepop", function() {
        	iBeaconService.currentBeaconUuid = null;
        });
    };
    
}]);

