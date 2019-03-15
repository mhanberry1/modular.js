// Toggles the menu visibility
function toggleMenu(){
	var menu = modularjs.mainDoc.getElementById(document.id);

	// If the menu is deactivated, activate it
	if(!menu.classList.contains("active")){
		menu.classList.add("active");
	// Else, deactivate it
	}else{
		menu.classList.remove("active");
	}
}

// Share the toggleMenu function
modularjs.sharedInfo.toggleMenu = toggleMenu;
