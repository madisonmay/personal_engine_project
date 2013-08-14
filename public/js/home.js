$(document).ready(function() {
	var services = ['google', 'images'];

	$('#search-input').keypress(function(e) {
	    if(e.which == 13) {
	        $(this).blur();
	        $('#search').focus().click();
	    }
	});

	$('#search').click(function() {
		var query = $('#search-input').val();
		var service = services[0];
		window.location = '/' + service + '?q=' + encodeURIComponent(query);
	})
})