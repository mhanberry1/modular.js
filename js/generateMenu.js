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
				ul.innerHTML += "<li class='subheader invisible' onclick=" + onclick + ">" +
					"<span>▸</span>" + subheader +
				"</li>";
			}
		}
	}
);

// Toggles the visibility of subheaders related to headerElement
function toggleSubheaders(headerElement){
	var current = headerElement.parentElement;

	// Toggle subheaders
	while(true){
		var next = current.nextElementSibling;
		
		// If the next element is null, or if it is a subheader, break
		if(next == null || !next.classList.contains("subheader")){
			break;
		// Else, make the next element the current element
		}else{
			current = next;
		}

		// If the subheader is invisible, make it visible
		if(next.classList.contains("invisible")){
			next.classList.remove("invisible");
		// Else, make the subheader invisible
		}else{
			next.classList.add("invisible");
		}
	}
}
