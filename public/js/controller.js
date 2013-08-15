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
		//switch to black and white logo
		if (!$(this).attr('active') && $(this).attr('color')) {
			var source = $(this).attr('src').split('-')[0];
			$(this).attr('src', source + '.png');
			$(this).removeAttr('color');
		}
	})

	$('.logo').click(function() {
		//make logo active and change to color logo
		$('#arrow-right').css('top', $(this).position().top + 59);	
		var old = $('.logo[active=true]')
		old.removeAttr('active');
		var source = old.attr('src').split('-')[0];
		old.attr('src', source + '.png');
		old.removeAttr('color');
		$(this).attr('active', true);
	})

	//position logos centered vertically
	var height = $(window).height();
	var num_logos = $('.logo').length;
	var extra_space = height - 138 * num_logos;
	if (extra_space > 0) {
		$('#padding').height(extra_space/2 + 5 + 'px');

		//position arrow
		$('#arrow-right').css('top', $('.logo').first().position().top + 59);
	}
})

function LinkCtrl($scope) {
  $scope.links = links;
}