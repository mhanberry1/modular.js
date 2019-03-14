// Toggles the menu visibility
function toggleMenu(){
	var menu = modularjs.mainDoc.getElementById(document.id);

	// If the menu is deactivated, activate it
	if(menu.getAttribute("class") != "active"){
		menu.setAttribute("class", "active");
	// Else, deactivate it
	}else{
		menu.setAttribute("class", "");
	}
}

// Share the toggleMenu function
modularjs.sharedInfo.toggleMenu = toggleMenu;
