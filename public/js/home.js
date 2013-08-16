$(document).ready(function() {

	//position cursor
	var input = $('#search-input');
	input[0].selectionStart = input[0].selectionEnd = input.val().length;

	$('#search-input').keypress(function(e) {
	    if(e.which == 13) {
	        $(this).blur();
	        $('#search').focus().click();
	    }
	});

	$('#search').click(function() {
		var query = $('#search-input').val();
		window.location = '/search?q=' + encodeURIComponent(query);
	})
})