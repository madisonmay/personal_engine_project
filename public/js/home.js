$(document).ready(function() {
	$('#search-input').keypress(function(e) {
	    if(e.which == 13) {
	        $(this).blur();
	        $('#search').focus().click();
	    }
	});

	$('#search').click(function() {
		var query = $('#search-input').val();
		window.location = '/google?q=' + encodeURIComponent(query);
	})
})