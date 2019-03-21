// Add the menu population routine to modularjs.doOnceLoaded
modularjs.doOnceLoaded.push(
	function(){
		var menu = document.getElementsByName("menu")[0];
		var sections = document.getElementsByName("section");

		// Create a menu entry for each section
		for(var i = 0; i < sections.length; i++){
			var offsetTop = sections[i].offsetTop - 40;
			var options = "{" +
				"'top':" + offsetTop + "," +
				"'behavior':'smooth'" +
			"}"; 
			var onclick = '"window.scroll(' + options + ')"';
			var header = sections[i].firstElementChild.firstElementChild.textContent;
			menu.getElementsByTagName("ul")[0].innerHTML += "<li onclick=" + onclick + ">" +
				"<span>▸</span>" + header +
			"</li>";
		}
	}
);

function scrollTo(id){
	
}
