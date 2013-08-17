function urlParam(name) {
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

$(document).ready(function() {

	window.original_height = $(window).height()

	$('.logo').mouseover(function() {
		//switch to color logo
		if (!$(this).attr('color')) {
			var source = $(this).attr('src').split('.')[0];
			$(this).attr('src', source + '-color.png');
			$(this).attr('color', true);		
		}
	})

	$('.logo').mouseout(function() {
		//switch to black and white logo
		if (!$(this).attr('active') && $(this).attr('color')) {
			var source = $(this).attr('src').split('-')[0];
			$(this).attr('src', source + '.png');
			$(this).removeAttr('color');
		}
	})

	$('.logo').click(function() {
		//make logo active and change to color logo
		if (!$(this).attr('active')) {
			$('#arrow-right').css('top', $(this).position().top + 59);	
			var old = $('.logo[active=1]')
			old.removeAttr('active');
			var source = old.attr('src').split('-')[0];
			old.attr('src', source + '.png');
			old.removeAttr('color');
			$(this).attr('active', 1);

			//send jquery post request to server
			var service = $(this).attr('src').split('-')[0];
			var service = service.split('/')[2];
			$.post('/refresh', {'service': service, 'q': urlParam('q')}, function(html) {
				$('#content-container').html(html);
			});
		}
	})

	$('#content-container').on('click', 'a.result', function() {
		data = {search_type: search_type, q: urlParam('q')};
		$.post('/bayes', data, function(response) {
			console.log(response);
		})
	})

	//position logos centered vertically
	var height = $(window).height();
	var num_logos = $('.logo').length;
	var extra_space = height - 138 * num_logos;
	if (extra_space > 0) {
		$('#padding').height(extra_space/2 + 5 + 'px');
	}

	//position arrow
	$('#arrow-right').css('top', $('.logo[active=1]').position().top + 59);

	//move arrow with scrollbar
	$('.sidebar').scroll(function(){
	    var active = $('.logo[active=1]');
	    $('#arrow-right').css('top', active.position().top + 59);
	});
})


$(window).scroll(function() {
	$('.sidebar').height(window.original_height + $(window).scrollTop())
})

$(window).resize(function() {

	//position logos centered vertically
	var height = $(window).height();
	var num_logos = $('.logo').length;
	var extra_space = height - 138 * num_logos;
	if (extra_space > 0) {
		$('#padding').height(extra_space/2 + 5 + 'px');
	}

	//position arrow
	$('#arrow-right').css('top', $('.logo[active=1]').position().top + 59);
})

function LinkCtrl($scope) {
  $scope.links = links;
}