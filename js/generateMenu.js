// Add the menu population routine to modularjs.doOnceLoaded
modularjs.doOnceLoaded.push(
	function(){
		var menu = document.getElementsByName("menu")[0];
		var sections = document.getElementsByName("section");

		// Create a menu entry for each section
		var ul = menu.getElementsByTagName("ul")[0];
		for(var i = 0; i < sections.length; i++){
			var offsetTop = sections[i].offsetTop - 40;
			var options = JSON.stringify( 
				{
					"top" : offsetTop,
					"behavior" : "smooth"
				}
			);
			var onclick = "'window.scroll(" + options + ")'";
			var header = sections[i].firstElementChild.firstElementChild.textContent;
			ul.innerHTML += "<li onclick=" + onclick + ">" +
				"<span onclick='toggleSubheaders(this)'>▸</span>" + header +
			"</li>";

			// Create a submenu entry for each subheader
			var subheaders = sections[i].getElementsByClassName("subheader");
			for(var j = 0; j < subheaders.length; j++){
				var offsetTop = subheaders[j].offsetTop - 70;
				var options = JSON.stringify(
					{
						"top" : offsetTop,
						"behavior" : "smooth"
					}
				);
				var onclick = "'window.scroll(" + options + ")'";
				var subheader = subheaders[j].textContent;
				ul.innerHTML += "<li class='subheader invisible fixedPosition' onclick=" + onclick + ">" +
					"<span>▸</span>" + subheader +
				"</li>";
			}
		}
	}
);

// Toggles the visibility of subheaders related to headerElement
function toggleSubheaders(headerElement){
	var current = headerElement.parentElement;
	var subheaders = [];
	var i = 0;

	// If the header element is not rotated, rotate it
	if(!headerElement.classList.contains("rotated")){
		headerElement.classList.add("rotated");
	// Elese, unrotate it
	}else{
		headerElement.classList.remove("rotated");
	}

	// Toggle subheaders
	while(true){
		var next = current.nextElementSibling;
		
		// If the next element is null, or if it is a subheader, break
		if(next == null || !next.classList.contains("subheader")){
			break;
		}

		subheaders.push(next);

		// If the subheader is invisible, make it visible
		if(next.classList.contains("invisible")){
			next.classList.remove("fixedPosition");
			next.classList.remove("invisible");
		// Else, make the subheader invisible
		}else{
			next.classList.add("invisible");
			// Wait for the animation to end before making the position fixed
			setTimeout(
				function(){
					subheaders[i++].classList.add("fixedPosition");
				},
				500
			);
		}

		// Update the current element
		current = next;
	}
}
