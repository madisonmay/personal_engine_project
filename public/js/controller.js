$(document).ready(function() {

	$('.logo').mouseover(function() {
		//switch to color logo
		if (!$(this).attr('color')) {
			var source = $(this).attr('src').split('.')[0];
			$(this).attr('src', source + '-color.png');
			$(this).attr('color', true);		
		}
	})

	$('.logo').mouseout(function() {
		if (!$(this).attr('active') && $(this).attr('color')) {
			var source = $(this).attr('src').split('-')[0];
			$(this).attr('src', source + '.png');
			$(this).removeAttr('color');
		}
	})

	$('.logo').click(function() {
		$('#arrow-right').css('top', $(this).position().top + 59);	
		var old = $('.logo[active=true]')
		old.removeAttr('active');
		var source = old.attr('src').split('-')[0];
		old.attr('src', source + '.png');
		old.removeAttr('color');
		$(this).attr('active', true);
	})

	//highlight the first option
	var primary = $('.logo').first();
	var source = primary.attr('src').split('.')[0];
	primary.attr('src', source + '-color.png');
	primary.attr('color', true);
	primary.attr('active', true);
})

function LinkCtrl($scope) {
  $scope.links = links;
}