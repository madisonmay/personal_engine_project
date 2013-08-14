$(document).ready(function() {
	$('.logo').mouseover(function() {
		var source = $(this).attr('src').split('.')[0];
		$(this).attr('src', source + '-color.png');
		$('#arrow-right').css('top', $(this).position().top + 59);
	})

	$('.logo').mouseout(function() {
		var source = $(this).attr('src').split('-')[0];
		$(this).attr('src', source + '.png');
	})
})

function LinkCtrl($scope) {
  $scope.links = links;
}