
iris.path = {
	screen: {
		welcome: {js: 'screen/welcome.js', html: 'screen/welcome.html'},
		list: {js: 'screen/list.js', html: 'screen/list.html'},
		map: {js: 'screen/map.js', html: 'screen/map.html'}
	},
	ui: {
		list_item: {js: 'ui/list_item.js', html: 'ui/list_item.html'},
		notify: {js: 'ui/notify.js', html: 'ui/notify.html'},
		notify_item: {js: 'ui/notify_item.js', html: 'ui/notify_item.html'},
		shareMode: {js: 'ui/shareMode.js', html: 'ui/shareMode.html'},
		shareMode_item: {js: 'ui/shareMode_item.js', html: 'ui/shareMode_item.html'}
	},
	resource: {
		user: 'resource/user.js'
	}
};

iris.Resource.prototype.ajax = function(method, path, params) {

	var deferred = $.Deferred();
	var self = this;

	googleapi.getToken().done(function(data) {

		var url = geosharecfg.base_uri + self.setting('path') + path;

		iris.log('[iris.Resource.ajax] method[' + method + '] url[' + url + '] access_token[' + data.access_token + ']');

		iris.ajax({
			url: url,
			type: method,
			data: params,
			cache: false,
			dataType: self.setting('type'),
			async: true,
			beforeSend: function(xhr) {
				xhr.setRequestHeader('Authorization', 'Bearer ' + data.access_token)
			}
		}).done(function(data) {
			deferred.resolve(data);
		}).fail(function(jqXHR, textStatus, errorThrown) {
			var err = '[iris.Resource.ajax] ERROR[' + jqXHR.status + '] textStatus[' + textStatus + '] errorThrown[' + errorThrown + ']';
			iris.log(err);

			deferred.reject(err);

			iris.notify(iris.RESOURCE_ERROR, {request: jqXHR, status: textStatus, error: errorThrown});
		});

	}).fail(function(err) {
		iris.log('[iris.Resource.ajax] get access_token ERROR[' + err + ']');
		deferred.reject(err);
	});

	return deferred.promise();
};

function onReady() {
	iris.noCache('file://', 'localhost');
	iris.enableLog('file://', 'localhost');
	iris.baseUri('geoshare/');

	iris.on(iris.RESOURCE_ERROR, function(request, textStatus, errorThrown) {
		iris.notify('notify', {msg: '<strong>Sorry</strong>, an unexpected error has occurred! Please, try again later...', type: 'danger'});
		iris.log("resource error", request, textStatus, errorThrown);
	});

	window.onorientationchange = function() {
		//Need at least 800 milliseconds, TODO find a best solution...
		setTimeout(function resize() {
			iris.log('On resize');
			iris.notify('resize');
		}, 1000);
	}

	if (geoshare.isBrowser) {
		var hash = document.location.hash;
		if (hash && hash.indexOf('#at=') == 0) {
			var accessToken = hash.substr(4);
			localStorage.access_token = accessToken;
			document.location.hash = '#';
		} else {
			googleapi.reset();
			return document.location.href = 'http://localhost:3000/login';
		}
	} else {
		gnotification.listen(function(data) {
			iris.resource(iris.path.resource.user).addNearContact(data);
		});
	}

	iris.welcome(iris.path.screen.welcome.js);
}


//
// Exposes global geoshare object
//
var geoshare = {
	isBrowser: location.href.indexOf('http://') === 0
};

$(document).on(geoshare.isBrowser ? 'ready' : 'deviceready', onReady);