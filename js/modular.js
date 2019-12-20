var modularjs = {
	// Syncs a modules contents with the corresponding shadowModule as specified by syncDirection
	"syncModules" : function(module, syncDirection, doOnce){
		var shadowModule = modularjs.shadowModules[module.id];
		inputValueQueue = [];

		// Define the source and destination based on syncDirection
		switch(syncDirection){
			case "fromShadow":
				var source = shadowModule;
				var destination = module;
				break;
			case "toShadow":
				var source = module;
				var destination = shadowModule;
				break;
			default:
				throw "The sync direction '" + syncDirection + "' is not valid.";
		}

		// Disable the source and the destination's mutation observer
		source.mutationObserver.disconnect();
		destination.mutationObserver.disconnect();

		// If there are any stray links in the shadow module, remove them
		var links = shadowModule.getElementsByTagName("link");
		for(var i = 0; i < links.length; i++){
			links[i].parentNode.removeChild(links[i]);
		}
		
		// Clone all children from the shadow module and put them in the module
		var children = source.childNodes;
		destination.innerHTML = "";
		for(var i = 0; i < children.length; i++){
			var clone = children[i].cloneNode(true);

			// Modify the onchange event in each input, textbox and select element so that changes are reflected in the HTML attributes
			var relevantCloneChildren = (clone.tagName) ? clone.querySelectorAll("input,textbox,select") : "";
			var relevantOriginalChildren = (children[i].tagName) ? children[i].querySelectorAll("input,textbox,select") : "";
			for(var j = 0; j < relevantCloneChildren.length; j++){
				var cloneChild = relevantCloneChildren[j];
				var originalChild = relevantOriginalChildren[j];
				
				// If syncDirection is fromShadow, specify onchange and mjs-original-onchange
				if(syncDirection == "fromShadow"){
					cloneChild.setAttribute("onchange", "this.setAttribute('value', this.value)");
					cloneChild.setAttribute("mjs-original-onchange", originalChild.getAttribute("onchange"));
					cloneChild.value = (originalChild.value) ? originalChild.value : cloneChild.value;
				
				// Else, queue changes to the value property, and modify the onchange attribute
				}else{
					cloneChild.setAttribute("onchange", cloneChild.getAttribute("onchange") + "; " + cloneChild.getAttribute("mjs-original-onchange"));
					cloneChild.onchange = new Function(cloneChild.getAttribute("onchange"));
					cloneChild.removeAttribute("mjs-original-onchange");
					inputValueQueue.push(
						{
							"element" : cloneChild,
							"value" : originalChild.value
						}
					);
				}
			}

			destination.appendChild(clone);
		}

		// If the style or scripts have not been applied,re-enable the source's mutations observer and return
		if(!shadowModule.hasAttribute("appliedStyle") || !shadowModule.hasAttribute("appliedScripts")){
			shadowModule.mutationObserver.observe(source, modularjs.mutationObserverConfig);
			return;
		}
		module.setAttribute("visible", "");

		// If all modules are visible, execute the functions in modularjs.doOnceLoaded
		var numModules = document.getElementsByTagName("module").length;
		var numVisibleModules = document.querySelectorAll('module[visible=""]').length;
		if(numModules == numVisibleModules){
			var func = modularjs.doOnceLoaded.shift();
			while(func){
				func();
				func = modularjs.doOnceLoaded.shift();
			}
		}
		modularjs.main();

		// Re-enable the source and the destination's mutation observer
		source.mutationObserver.observe(source, modularjs.mutationObserverConfig);
		destination.mutationObserver.observe(destination, modularjs.mutationObserverConfig);

		// Apply input changes from inputValueQueue
		for(var i = 0; i < inputValueQueue.length; i++){
			inputValueQueue[i].element.value = inputValueQueue[i].value;
			inputValueQueue[i].element.onchange();
		}

		if(doOnce){
			modularjs.syncModules(module, synchDirection, true);
		}
	},
	"newModule" : function(name, modularJSON){
		var module = document.createElement("module");
		module.setAttribute("name", name);
		module.innerHTML = JSON.stringify(modularJSON);

		// If the module staging area doesn't exist yet, create it
		var staging = document.getElementById("mjs-moduleStaging");
		if(!staging){
			staging = document.createElement("div");
			staging.id = "mjs-moduleStaging";
			staging.style.display = "none";
			document.body.appendChild(staging);
		}

		staging.appendChild(module);
		modularjs.main();
		return module;
	},
	"mainDoc" : document,
	"sharedInfo" : {},
	"shadowModules" : {},
	"functions" : {},
	"cache" : {"titlebar":{"scripts":["// Toggle the visibility of the menu, if a menu is present\r\nfunction toggleMenu(){\r\n\t\r\n\t// If the shared toggleMenu function is defined, call it\r\n\tif(modularjs.sharedInfo[\"toggleMenu\"]){\r\n\t\tmodularjs.sharedInfo[\"toggleMenu\"]();\r\n\t}\r\n}\r\n\r\n// Switch between the Application interface and the advanced interface\r\nfunction switchInterface(switchElement){\r\n\t// Show the loading icon\r\n\tmodularjs.mainDoc.getElementById(\"main\").innerHTML = '<img id=\"loading\" src=\"/img/loading.svg\">';\r\n\r\n\t// If the application interface is currently active, switch to the advanced interface\r\n\tif(switchElement.getAttribute(\"interface\") == \"application\"){\r\n\t\tswitchElement.setAttribute(\"interface\", \"advanced\");\r\n\t\tswitchElement.setAttribute(\"title\", \"Switch to application interface\");\r\n\r\n\t// Else, switch to the application interface\r\n\t}else{\r\n\t\tswitchElement.setAttribute(\"interface\", \"application\");\r\n\t\tswitchElement.setAttribute(\"title\", \"Switch to advanced interface\");\r\n\t}\r\n\r\n\tsetTimeout(createMenu, 0);\r\n}\r\n"],"style":" module[name=titlebar]{\r\n\tdisplay: block;\r\n\theight: 50px;\r\n}\r\n\r\n module[name=titlebar] h1 {\r\n\ttext-align: center;\r\n\twidth: calc(100% - 2 * (4 * 40px + 10px));\r\n}\r\n\r\n module[name=titlebar] #spacer {\r\n\tdisplay: block;\r\n\twidth: 50px;\r\n\theight: 50px;\r\n}\r\n\r\n module[name=titlebar] #titlebar {\r\n\tposition: fixed;\r\n\ttop: 0;\r\n\tleft: 0;\r\n\tline-height: 50px;\r\n\twidth: calc(100% - 10px);\r\n\theight: 50px;\r\n\tpadding-left: 10px;\r\n\tbackground: #ff6600;\r\n\tcolor: white;\r\n}\r\n\r\n module[name=titlebar] #titlebar > * {\r\n\tdisplay: inline-block;\r\n\tmargin: 0;\r\n}\r\n\r\n module[name=titlebar] .button {\r\n\theight: 48px;\r\n\twidth: 18px;\r\n\tpadding: 0 10px;\r\n\tmargin: 1px !important;\r\n\tvertical-align: top;\r\n}\r\n\r\n module[name=titlebar] .button:hover {\r\n\tcursor: pointer;\r\n\toutline: 1px solid white;\r\n}\r\n\r\n module[name=titlebar] .switch {\r\n\twidth: 50px;\r\n\theight: 20px;\r\n\tborder: 1px solid white;\r\n\tbackground: white;\r\n\tborder-radius: 10px;\r\n\tmargin: 0 10px 0 28px !important;\r\n}\r\n\r\n module[name=titlebar] .switch:hover {\r\n\tcursor: pointer;\r\n}\r\n\r\n module[name=titlebar] .switch:hover .switchKnob {\r\n\tbackground: var(--darkOrange);\r\n}\r\n\r\n module[name=titlebar] .switch[interface=\"advanced\"] .switchKnob {\r\n\tleft: 30px;\r\n}\r\n\r\n module[name=titlebar] .switchKnob {\r\n\ttransition: 0.5s;\r\n\tposition: relative;\r\n\tdisplay: block;\r\n\twidth: 20px;\r\n\theight: 20px;\r\n\tbackground: var(--orange);\r\n\tborder-radius: 10px;\r\n\tleft: 0;\r\n}\r\n\r\n module[name=titlebar] .logo {\r\n\theight: 30px;\r\n\tpadding: 0 20px 0 10px;\r\n}\r\n\r\n module[name=titlebar] .disabled {\r\n\tpointer-events: none;\r\n}\r\n","styleMarkers":[true],"body":"<link rel=\"stylesheet\" type=\"text/css\" href=\"index.css\">\n<script src=\"index.js\"></script>\n<div id=\"spacer\"></div>\n<div id=\"titlebar\">\n\t<img class=\"button\" onclick=\"toggleMenu()\" src=\"menuButton.svg\"><!--\n\t--><img class=\"button\" title='Download Terreform meta-file' onclick=\"downloadTerraform()\" src=\"download.svg\"><!--\n\t--><img class=\"button\" title='Save Changes to Console' onclick=\"saveMetadata()\" src=\"save.svg\"><!--\n\t--><img class=\"button\" title='Cancel Recent Changes' onclick=\"cancelChanges()\" src=\"trash.svg\"><!--\n\t--><h1>{{title}}</h1><!--\n\t--><div id=\"interfaceSwitch\" class=\"switch\" onclick=\"switchInterface(this);\" interface=\"application\" title=\"Switch to advanced interface\">\n\t\t<div class=\"switchKnob\"></div>\n\t</div><!--\n\t--><img class=\"logo\" src=\"FiservLogo_white.png\">\n</div>\n\n"},"menu":{"scripts":[null,"// Toggles the visibility of the menu\nmodularjs.sharedInfo[\"toggleMenu\"] = function(){\n\tvar menu = document.module;\n\tvar main = modularjs.mainDoc.getElementById(\"main\");\n\n\t// If the menu is visible, hide it\n\tif(!menu.classList.contains(\"hidden\")){\n\t\tmenu.classList.add(\"hidden\");\n\t\tmain.classList.add(\"grow\");\n\t\n\t// Else, make the menu visible\n\t}else{\n\t\tmenu.classList.remove(\"hidden\");\n\t\tmain.classList.remove(\"grow\");\n\t}\n}\n\n// Toggles the visibility of the subitems related to the specified menu item\nfunction toggleSubitems(menuItem){\n\tvar originalDepth = menuItem.getAttribute(\"depth\");\n\n\t// If the user is in the process of adding a key/value pair or menuItem is being edited, do nothing\n\tif(\n\t\tmenuItem.hasAttribute(\"adding-kv\") ||\n\t\tmenuItem.getElementsByTagName(\"input\").length > 0\n\t){\n\t\treturn;\n\t}\n\n\t// Rotate the arrow belonging to menuItem\n\tvar arrow = menuItem.getElementsByClassName(\"arrow\")[0];\n\tarrow.innerHTML = (arrow.innerHTML == \"▶\") ? \"▼\" : \"▶\";\n\n\t// Iterate over every sibling until one with an equal or lesser depth is reached\n\tnextSibling = menuItem.nextElementSibling;\n\twhile(\n\t\tnextSibling &&\n\t\tnextSibling.getAttribute(\"depth\") > originalDepth\n\t){\n\t\t\n\t\t// If the next sibling has an arrow, reset it\n\t\tvar arrow = nextSibling.getElementsByClassName(\"arrow\");\n\t\tif(arrow.length > 0){\n\t\t\tarrow[0].innerHTML = \"▶\";\n\t\t\n\t\t// Else, if the next sibling is being edited, continue\n\t\t}else if(nextSibling.getElementsByTagName(\"input\").length > 0){\n\t\t\tnextSibling = nextSibling.nextElementSibling;\n\t\t\tcontinue;\n\t\t}\n\n\t\t// If the next sibling is not at the next depth, hide it\n\t\tif(nextSibling.getAttribute(\"depth\") > parseInt(originalDepth) + 1){\n\t\t\tnextSibling.classList.add(\"hidden\");\n\n\t\t// Else, if it is hidden, unhide it\n\t\t}else if(nextSibling.classList.contains(\"hidden\")){\n\t\t\tnextSibling.classList.remove(\"hidden\");\n\t\t\n\t\t// Else, hide it\n\t\t}else{\n\t\t\tnextSibling.classList.add(\"hidden\");\n\t\t}\n\n\t\tnextSibling = nextSibling.nextElementSibling;\n\t}\n}\n"],"style":" module[name=menu]{\n\tdisplay: inline-block;\n\theight: calc(100vh - 50px);\n\tvertical-align: top;\n\tposition: fixed;\n\tleft: 0;\n\ttransition: 0.5s;\n}\n\n module[name=menu] .menuItem,  module[name=menu] h3 {\n\tpadding: 5px 20px;\n\twhite-space: nowrap;\n}\n\n module[name=menu] .menuItem:hover {\n\tbackground-color: white;\n\tcolor: #0e0e0e;\n}\n\n module[name=menu] .menuItem:hover {\n\tcursor: pointer;\n}\n\n module[name=menu] .indent {\n\tdisplay: inline-block;\n\twidth: 20px;\n}\n\n module[name=menu] .hidden {\n\tdisplay: none;\n}\n\n module[name=menu] .arrow {\n\tfont-size: 0.5em;\n\tpadding-right: 5px;\n\tvertical-align: middle;\n}\n\n module[name=menu] .plus {\n\tfloat:right;\n\tvertical-align: middle;\n\tfont-weight: bold;\n\tpadding-left: 5px;\n}\n\n module[name=menu] #menuItems {\n\ttransition: 0.5s;\n\toverflow: auto;\n\tdisplay: block;\n\theight: 100%;\n\tbackground-color: #ff6600;\n\tcolor: white;\n\tmargin-left: 0;\n}\n\n module[name=menu].hidden {\n\tdisplay: block;\n\tmargin-left: -500px;\n}\n\n module[name=menu] [id^='panel'] {\n\tdisplay: block;\n\tborder-top: 1px solid white;\n\tmargin-top: -1px;\n\toverflow: auto;\n\tscrollbar-color: white var(--orange);\n\tscrollbar-width: thin;\n\tmax-width: 500px;\n}\n","styleMarkers":[true],"body":"<link rel=\"stylesheet\" type=\"text/css\" href=\"index.css\">\n<script>\n\tvar panels = {{panels}};\n\tvar editable;\n\tvar panelHTML = \"\";\n\n\t// Creates menu items and adds them to the specified panel\n\tfunction addMenuItems(panel, items, depth, keyPath){\n\n\t\t// If depth is not defined, set it to 0\n\t\tif(!depth){\n\t\t\tdepth = 0;\n\t\t}\n\n\t\t// If keyPath is not defined, or if it is not editable, set it to \"\"\n\t\tif(!keyPath){\n\t\t\tkeyPath = \"\";\n\t\t}\n\n\t\t// Indent menuItem according to depth\n\t\tvar indent = \"\";\n\t\tfor(var i = 0; i < depth; i++){\n\t\t\tindent += '<span class=\"indent\"></span>';\n\t\t}\n\n\t\t// If items is a string and it is not a toplevel item, add the menu item and return\n\t\tif(\n\t\t\t(typeof items == \"string\" && items != \"\") ||\n\t\t\tJSON.stringify(items) == \"{}\"\n\t\t){\n\t\t\tpanelHTML += '<div class=\"menuItem' + ((depth == 0) ? '' : ' hidden') + '\" onclick=\"{{onclick}}\" depth=\"' + depth + '\" keyPath=\"' + keyPath.slice(0, -1) + '\" editable=\"' + editable + '\">' + indent + items + '</div>';\n\t\t\treturn;\n\t\t}\n\n\n\t\t// Iterate through items\n\t\tfor(var name in items){\n\t\t\t\n\t\t\t// If the items are in an array, do not add the index to the panel\n\t\t\tif(items.constructor == Array){\n\t\t\t\taddMenuItems(panel, items[name], depth, keyPath + name + \"/\");\n\t\t\t\tcontinue;\n\t\t\t}\n\n\t\t\t// If the current item is a toplevel item and has subitems, make it visible, reset keyPath, and make onclick = toggleSubitems\n\t\t\tif(\n\t\t\t\tdepth == 0 &&\n\t\t\t\t(\n\t\t\t\t\titems[name] != \"\" ||\n\t\t\t\t\tJSON.stringify(items[name]) != \"{}\"\n\t\t\t\t)\n\t\t\t){\n\t\t\t\t// If in BU panel, add \"+\" button for KV creation\n\t\t\t\tif (panel.id == \"panel0\" && typeof(items[name]) == \"object\") {\n\t\t\t\t\tpanelHTML += '<div class=\"menuItem\" onclick=\"event.stopPropagation(); toggleSubitems(this)\" depth=\"' + depth + '\" keyPath=\"' + keyPath + name + '\">' + indent + '<span class=\"arrow\">▶</span>' + name + '<span class=\"plus\" onclick=\"createKV(this)\">＋</span></div>';\n\t\t\t\t}\n\t\t\t\telse {\n\t\t\t\t\tpanelHTML += '<div class=\"menuItem\" onclick=\"toggleSubitems(this)\" depth=\"' + depth + '\">' + indent + '<span class=\"arrow\">▶</span>' + name + '</div>';\n\t\t\t\t}\n\n\t\t\t// Else, if the current item is a subitem and has subitems, make it invisible and make onclick = toggle Subitems\n\t\t\t}else if(\n\t\t\t\t(typeof items[name] == \"string\" && items[name] != \"\") ||\n\t\t\t\tJSON.stringify(items[name]) != \"{}\"\n\t\t\t){\n\t\t\t\tif (panel.id == \"panel0\" && typeof(items[name]) == \"object\") {\n\t\t\t\t\tpanelHTML += '<div class=\"menuItem hidden\" onclick=\"event.stopPropagation(); toggleSubitems(this)\" depth=\"' + depth + '\" keyPath=\"' + keyPath + name + '\">' + indent + '<span class=\"arrow\">▶</span>' + name + '<span class=\"plus\" onclick=\"createKV(this)\">＋</span></div>';\n\t\t\t\t}\n\t\t\t\telse {\n\t\t\t\t\tpanelHTML += '<div class=\"menuItem hidden\" onclick=\"toggleSubitems(this)\" depth=\"' + depth + '\">' + indent + '<span class=\"arrow\">▶</span>' + name + '</div>';\n\t\t\t\t}\n\t\t\t// Else, make the current item hidden, set onclick to the provided onclick function, and set keyPath\n\t\t\t}else{\n\t\t\t\tpanelHTML += '<div class=\"menuItem hidden\" onclick=\"{{onclick}}\" depth=\"' + depth + '\" keyPath=\"' + keyPath.slice(0, -1) + '\" editable=\"' + editable + '\">' + indent + name + '</div>';\n\t\t\t}\n\t\t\taddMenuItems(panel, items[name], depth + 1, keyPath + name + \"/\");\n\t\t}\n\t}\n\n\t// Set the panel height based on the number of panels\n\tvar numPanels = Object.keys(panels).length;\n\tvar panelHeight = (100 / numPanels) + \"%\";\n\n\t// Add the panels and menu items to the menu\n\tvar i = 0;\n\tfor(var title in panels){\n\t\tvar panel = document.createElement(\"div\");\n\t\tpanel.id = \"panel\" + i++;\n\t\tpanel.style = \"height: \" + panelHeight;\n\t\tpanelHTML += '<h3>' + title + '</h3>';\n\t\teditable = (title == \"All Metadata\") ? false : true;\n\t\taddMenuItems(panel, panels[title]);\n\t\tpanel.innerHTML = panelHTML;\n\t\tpanelHTML = \"\";\n\t\tdocument.getElementById(\"menuItems\").appendChild(panel);\n\t}\n</script>\n<script src=\"index.js\"></script>\n<div id=\"menuItems\"></div>\n\n"},"appData":{"scripts":[null,"var curApp;\r\n/*\r\nvar serviceNowOptions;\r\nvar buOptions;\r\nvar podOptions;\r\n*/\r\nif(!modularjs.sharedInfo.appDropdowns){\r\n\tmodularjs.sharedInfo.appDropdowns = {}\r\n}\r\n//modularjs.sharedInfo.optionLoadingStatus = [];\r\n\r\n// If no appName is specified, create a new app\r\nif(!appName){\r\n\tnewApp(); //newApp();\r\n}\r\n\r\n// Get the ServiceNow applications\r\nfunction getServiceNowOptions() { \r\n\t\r\n\t// If the ServiceNow options are already defined, set the options and return\r\n\tif(modularjs.sharedInfo.appDropdowns.serviceNowOptions){\r\n\t\tmodularjs.doOnceLoaded.push(\r\n\t\t\tfunction(){\r\n\t\t\t\tsnDropdown = document.getElementById(\"sn_drop\");\r\n\t\t\t\tsnDropdown.innerHTML = modularjs.sharedInfo.appDropdowns.serviceNowOptions;\r\n\t\t\t\tconsole.log(\"Getting Service Now Options from cache\");\r\n\t\t\t\tcheckLoadingStatus(\"serviceNowOptions\", snDropdown.innerHTML);\r\n\t\t\t}\r\n\t\t);\r\n\t\treturn;\r\n\t}\r\n\t\r\n\tvar xmlhttp = new XMLHttpRequest();\r\n\txmlhttp.open(\"GET\",\"/server-side/serviceNowOptions.html\",true);\r\n\txmlhttp.onreadystatechange = function() {\r\n\t\tif (xmlhttp.status == 200 && xmlhttp.readyState == 4) {\r\n\t\t\tvar response = this.responseText;\r\n\r\n\t\t\tresponse = response.replace(\"b'\", \"\");\r\n\t\t\tresponse = response.replace(\"'\", \"\");\r\n\r\n\t\t\tsnDropdown = modularjs.mainDoc.getElementById(\"sn_drop\");\r\n\t\t\tsnDropdown.innerHTML = response;\r\n\r\n\t\t\tcheckLoadingStatus(\"serviceNowOptions\", snDropdown.innerHTML);\r\n\t\t}\r\n\t};\r\n\r\n\txmlhttp.send();\r\n}\r\n\r\n// Get the BUs\r\nfunction getBUOptions(){\r\n\r\n\t// If the BU options are already defined, set the options and return\r\n\tif(modularjs.sharedInfo.appDropdowns.buOptions){\r\n\t\tmodularjs.doOnceLoaded.push(\r\n\t\t\tfunction(){\r\n\t\t\t\tbuDropdown = document.getElementById(\"bu_drop\");\r\n\t\t\t\tbuDropdown.innerHTML = modularjs.sharedInfo.appDropdowns.buOptions;\r\n\t\t\t\tconsole.log(\"Getting BU Options from cache\");\r\n\t\t\t\tcheckLoadingStatus(\"buOptions\", buDropdown.innerHTML);\r\n\t\t\t}\r\n\t\t);\r\n\t\treturn;\r\n\t}\r\n\r\n\tvar xmlhttp = new XMLHttpRequest();\r\n\txmlhttp.open(\"GET\",\"/server-side/buOptions.html\",true);\r\n\txmlhttp.onreadystatechange = function() {\r\n\t\tif (xmlhttp.status == 200 && xmlhttp.readyState == 4) {\r\n\t\t\tvar response = this.responseText;\r\n\r\n\t\t\tresponse = response.replace(\"b'\", \"\");\r\n\t\t\tresponse = response.replace(\"'\", \"\");\r\n\r\n\t\t\tbuDropdown = modularjs.mainDoc.getElementById(\"bu_drop\");\r\n\t\t\tbuDropdown.innerHTML = response;\r\n\r\n\t\t\tcheckLoadingStatus(\"buOptions\", buDropdown.innerHTML);\r\n\t\t}\r\n\t};\r\n\t\r\n\txmlhttp.send();\r\n}\r\n\r\n// Get the pods\r\nfunction getPodOptions(){\r\n\r\n\t// If the service now options are already defined, set the options and return\r\n\tif(modularjs.sharedInfo.appDropdowns.podOptions){\r\n\t\tmodularjs.doOnceLoaded.push(\r\n\t\t\tfunction(){\r\n\t\t\t\tpodDropdown = document.getElementById(\"pod_drop\");\r\n\t\t\t\tpodDropdown.innerHTML = modularjs.sharedInfo.appDropdowns.podOptions;\r\n\t\t\t\tconsole.log(\"Getting POD Options from cache\");\r\n\t\t\t\tcheckLoadingStatus(\"podOptions\", podDropdown.innerHTML);\r\n\t\t\t}\r\n\t\t);\r\n\t\treturn;\r\n\t}\r\n\r\n\tvar xmlhttp = new XMLHttpRequest();\r\n\txmlhttp.open(\"GET\",\"/server-side/podOptions.html\",true);\r\n\txmlhttp.onreadystatechange = function() {\r\n\t\tif (xmlhttp.status == 200 && xmlhttp.readyState == 4) {\r\n\t\t\tvar response = this.responseText;\r\n\r\n\t\t\tresponse = response.replace(\"b'\", \"\");\r\n\t\t\tresponse = response.replace(\"'\", \"\");\r\n\r\n\t\t\tpodDropdown = modularjs.mainDoc.getElementById(\"pod_drop\");\r\n\t\t\tpodDropdown.innerHTML = response;\r\n\r\n\t\t\tcheckLoadingStatus(\"podOptions\", podDropdown.innerHTML);\r\n\t\t}\r\n\t};\r\n\t\r\n\txmlhttp.send();\r\n}\r\n\r\n// Checks if all options have loaded\r\nfunction checkLoadingStatus(optionType, value){\r\n\tmodularjs.sharedInfo.appDropdowns[optionType] = value;\r\n\t\r\n\t// If the options have all loaded, enable selection and reset optionLoadingStatus\r\n\tif(\r\n\t\tObject.keys(modularjs.sharedInfo.appDropdowns).length == 3 &&\r\n\t\tObject.keys(modularjs.sharedInfo.serverRoleDropdowns).length == 4\r\n\t){\r\n\t\tmodularjs.mainDoc.body.classList.remove(\"disabled\");\r\n\t}\r\n}\r\n\r\n// Create a blank appData form\r\nfunction newApp() {\r\n\tmodularjs.mainDoc.body.classList.add(\"disabled\");\r\n\tgetServiceNowOptions();\r\n\tgetBUOptions();\r\n\tgetPodOptions();\r\n}\r\n\r\n// De-select all region checkboxes\r\nfunction clearChecklist() {\r\n\tvar checkArr = modularjs.mainDoc.getElementsByClassName(\"regionCheckbox\");\r\n\r\n\t// Iterate through all checkboxes\r\n\tfor (var i = 0; i < checkArr.length; i++) {\r\n\t\tmodularjs.mainDoc.getElementById(checkArr[i][\"id\"]).checked = false;\r\n\t}\r\n}\r\n\r\n// Set the default value for all dropdowns identified by list_id\r\nfunction setEmpty(list_id) {\r\n\r\n\t// iterate through the list of ids\r\n\tfor (var i = 0; i < list_id.length; i++) { \r\n\r\n\t\t// If the current id refers to the bu or pod dropdown, set its value to \"Select One\"\r\n\t\tif (list_id[i] == \"bu_drop\" || list_id[i] == \"pod_drop\") { \r\n\t\t\tmodularjs.mainDoc.getElementById(list_id[i]).value = \"Select One\";\r\n\r\n\t\t// Else, clear the value\r\n\t\t} else {\r\n\t\t\tmodularjs.mainDoc.getElementById(list_id[i]).value = \"\";\r\n\t\t}\r\n\t\t\r\n\t}\r\n}\r\n\r\n// Un-highlight the app name input\r\nfunction removeShade() {\r\n\tmodularjs.mainDoc.getElementById(\"app_text\").classList.remove(\"highlight\");\r\n}\r\n\r\n// Load the specified application details\r\nfunction loadApp(app) {\r\n\tvar appName = app.textContent;\r\n\tvar appData = sharedMetadataJSON[\"all_data\"][\"business_units\"][buMap.getConsulBU()][\"applications\"];\r\n\tvar bu;\r\n\r\n\t// Unhighlight all menu items\r\n\tvar arrayToNorm = modularjs.mainDoc.getElementsByClassName(\"menuItem highlight_menu\");\r\n\tfor (var i = 0; i < arrayToNorm.length; i++) {\r\n\t\tarrayToNorm[i].classList.remove(\"highlight_menu\");\r\n\t}\r\n\r\n\t// Highlight the selected menu entry\r\n\tapp.classList.add(\"highlight_menu\");\r\n\r\n\t// Prepare the interface for the app info\r\n\tcurApp = app.innerHTML.trim().toLowerCase();\r\n\tclearChecklist();\r\n\tvar id_list = [\"app_mne\", \"scr_num\", \"bu_drop\", \"pod_drop\"];\r\n\tsetEmpty(id_list);\r\n\t\r\n\t// Clear the server role info\r\n\tvar numServerRoles = modularjs.mainDoc.getElementsByName(\"serverRole\").length;\r\n\tfor(var i = 0; i < numServerRoles; i++){\r\n\t\tmodularjs.mainDoc.getElementById(\"removeFormButton\").click();\r\n\t}\r\n\r\n\r\n\t// Iterate throught buMap\r\n\tfor (buInd in buMap) {\r\n\r\n\t\t// If buInd matches the bu associated with the app, set it equal to the bu variable\r\n\t\tif (buMap[buInd] == appData[appName][\"BU Name\"]) {\r\n\t\t\tbu = buInd;\r\n\t\t}\r\n\t}\r\n\t\r\n\t// Show the application information\r\n\tmodularjs.mainDoc.getElementById(\"app_text\").value = appName;\r\n\tmodularjs.mainDoc.getElementById(\"app_mne\").value = appData[appName][\"App Mnemonic\"];\r\n\tmodularjs.mainDoc.getElementById(\"bu_drop\").value = (bu) ? bu : \"Select One\";\r\n\tmodularjs.mainDoc.getElementById(\"scr_num\").value = appData[appName][\"SCR Number\"];\r\n\tmodularjs.mainDoc.getElementById(\"pod_drop\").value = appData[appName][\"POD Naming Standard\"];\r\n\tmodularjs.mainDoc.getElementById(\"sn_drop\").value = appData[appName][\"Name of Application (ServiceNow)\"];\r\n\r\n\t// Select the appropriate regions\r\n\tvar regions = appData[appName].Regions.split(\",\");\r\n\tfor (var i = 0; i < regions.length; i++) { \r\n\r\n\t\tif (regions[i] == \"Production/DR\") {\r\n\t\t\tmodularjs.mainDoc.getElementById(\"production\").checked = true;\r\n\t\t}\r\n\r\n\t\tif (modularjs.mainDoc.getElementById(regions[i].toLowerCase()) == null) {\r\n\t\t\tcontinue;\r\n\t\t} else {\r\n\t\t\tmodularjs.mainDoc.getElementById(regions[i].toLowerCase()).checked = true;\r\n\t\t}\r\n\t\t\r\n\t}\r\n\r\n\t// If the BU dropdown value is blank, choose \"Select One\"\r\n\tif (modularjs.mainDoc.getElementById(\"bu_drop\").value == \"\") {\r\n\t\tmodularjs.mainDoc.getElementById(\"pod_drop\").value = \"Select One\";\r\n\r\n\t}\r\n\r\n\t// If the ServiceNow dropdown value is blank, choose \"Select One\"\r\n\tif (modularjs.mainDoc.getElementById(\"sn_drop\").value == \"\") {\r\n\t\tmodularjs.mainDoc.getElementById(\"sn_drop\").value = \"Select One\";\r\n\r\n\t}\r\n\r\n\t// If the pod dropdown value is blank, choose \"Select One\"\r\n\tif (modularjs.mainDoc.getElementById(\"pod_drop\").value == \"\") {\r\n\t\tmodularjs.mainDoc.getElementById(\"pod_drop\").value = \"Select One\";\r\n\r\n\t}\t\r\n\r\n\t// Display server role information\r\n\tvar serverRoleNames = appData[appName][\"Server Roles\"].split(\",\");\r\n\tfor(var i = 0; i < serverRoleNames.length; i++){\r\n\t\tvar moduleName = \"serverRole\";\r\n\t\tvar moduleContent = {\r\n\t\t\t\"serverRoleName\" : serverRoleNames[i]\r\n\t\t};\r\n\t\tvar serverRole = modularjs.newModule(moduleName, moduleContent);\r\n\t\tmodularjs.mainDoc.getElementById(\"serverRoles\").appendChild(serverRole);\r\n\t}\r\n\r\n\t// If there is at least one server role in the app, remove the extra server role form\r\n\tif(serverRoleNames.length > 0){\r\n\t\tmodularjs.mainDoc.getElementsByName(\"serverRole\")[0].remove();\r\n\t}\r\n}\r\n\r\nmodularjs.sharedInfo.loadApp = loadApp;\r\n"],"style":" module[name=appData] select {\n\tmin-width: 150px;\n\tmax-width: 250px;\n}\n module[name=appData] .highlight {\n\n\tbackground-color: pink;\n\t\n}\n\n module[name=appData] .highlight_menu {\n\n\tbackground-color: white;\n\t\n}\n\n module[name=appData] .group {\n\tdisplay: inline-block;\n\ttext-align: center;\n\tvertical-align: top;\n\tpadding: 0 10px;\n\tmargin: 10px 0;\n}\n\n module[name=appData] .group > label {\n\ttext-align: center;\n\tdisplay: block;\n}\n\n module[name=appData] .regions {\n\ttext-align: left;\n\tmax-width: 502px;\n\tpadding: 5px;\n\tmargin: 5px;\n\tborder: 1px solid var(--lightGray);\n}\n\n module[name=appData] .regions label {\n\tmargin: 0 2px;\n\twidth: 120px;\n\tdisplay: inline-block;\n}\n\n module[name=appData] .regionCheckbox {\n\tmargin: 0 40px 0 2px;\n}\n\n module[name=appData] .regionCheckbox:nth-child(3n) {\n\tmargin: 0 2px;\n}\n\n module[name=appData] #appData {\n \ttext-align: center;\n\twidth: calc(100% - 2 * 275px);\n\tmargin-left: 275px;\n}\n","styleMarkers":[true],"body":"<link rel=\"stylesheet\" type=\"text/css\" href=\"index.css\">\n\n<script>\n\tvar appName = \"{{appName}}\";\n</script>\n<script src=\"index.js\"></script>\n\n<form id=\"appData\">\n\t<div class=\"group\" id=\"bu_name\">\n\t\t<label>BU Name</label>\n\t\t<select id=\"bu_drop\"></select>\n\t</div><!--\n\t--><div class=\"group\">\n\t\t<label>Full Application Name</label>\n\t\t<input type=\"text\" id=\"app_text\" onclick=\"removeShade()\">\n\t</div><!--\n\t--><div class=\"group\">\n\t\t<label>App Mnemonic</label>\n\t\t<input type=\"text\" id=\"app_mne\">\n\t</div><!--\n\t--><div class=\"group\" class=\"app_name\">\n\t\t<label>Name of Application (ServiceNow)</label>\n\t\t<select id=\"sn_drop\"></select>\n\t</div><!--\n\t--><div class=\"group\">\n\t\t<label>SCR Number</label>\n\t\t<input type=\"text\" id=\"scr_num\">\n\t</div><!--\n\t--><div class=\"group\" id=\"pod_std\">\n\t\t<label>POD Naming Standard</label>\n\t\t<select id=\"pod_drop\"></select>\n\t</div>\n\t<br>\n\t<div class=\"group\">\n\t\t<label>Regions/Environment</label>\n\t\t<div class=\"regions\">\n\t\t\t<label>Alpha</label><input type=\"checkbox\" class=\"regionCheckbox\" id=\"alpha\"><!--\n\t\t\t--><label>Certification</label><input type=\"checkbox\" class=\"regionCheckbox\" id=\"certification\"><!--\n\t\t\t--><label>Production/DR</label><input type=\"checkbox\" class=\"regionCheckbox\" id=\"production\"><!--\n\t\t\t--><label>CMI</label><input type=\"checkbox\" class=\"regionCheckbox\" id=\"cmi\"><!--\n\t\t\t--><label>NonProduction</label><input type=\"checkbox\" class=\"regionCheckbox\" id=\"nonproduction\"><!--\n\t\t\t--><label>SharedServices</label><input type=\"checkbox\" class=\"regionCheckbox\" id=\"sharedservices\"><!--\n\t\t\t--><label>Testing</label><input type=\"checkbox\" class=\"regionCheckbox\" id=\"testing\"><!--\n\t\t\t--><label>Staging</label><input type=\"checkbox\" class=\"regionCheckbox\" id=\"staging\">\n\t\t</div>\n\t</div>\n</form>\n\n"},"serverRole":{"scripts":[null,"// If serverRoleName is not specefied, create a new server role form\nif(!serverRoleName) {\n\tmodularjs.doOnceLoaded.push(initialDropdown);\n\n// Else, load the specified server role\n} else {\n\tmodularjs.doOnceLoaded.push(\n\t\tfunction(){\n\t\t\tloadServerRole(serverRoleName);\n\t\t}\n\t);\n}\n\n// If modularjs.sharedInfo.serverRoleDropdowns is undefined, initialize it\nif(!modularjs.sharedInfo.serverRoleDropdowns){\n\tmodularjs.sharedInfo.serverRoleDropdowns = {};\n}\n\n// Populate dropdowns with their default values\nfunction initialDropdown() {\n\tpopulateDropdown(\"/server-side/genericServerRoleOptions.html\", \"gsr_drop\");\n\tpopulateDropdown(\"/server-side/securityZoneOptions.html\", \"sz_drop\");\n\tpopulateDropdown(\"/server-side/accessFromBUOptions.html\", \"afbu_drop\");\n\tpopulateDropdown(\"/server-side/accessToBUOptions.html\", \"atbu_drop\");\n}\n\n// Loads the specified server role\nfunction loadServerRole(serverRoleName){\n\tvar serverRoleData = sharedMetadataJSON[\"all_data\"][\"server_roles\"][serverRoleName];\n\n\tinitialDropdown();\n\t\n\tdocument.getElementsByClassName(\"gsr_drop\")[0].value = serverRoleData[\"Generic Server Role\"];\n\tdocument.getElementsByClassName(\"sz_drop\")[0].value = serverRoleData[\"Security Zone\"];\n\tdocument.getElementsByClassName(\"afbu_drop\")[0].value = serverRoleData[\"Access from BU\"];\n\tdocument.getElementsByClassName(\"atbu_drop\")[0].value = serverRoleData[\"Access to BU\"];\n\tdocument.getElementById(\"role_name\").value = serverRoleData[\"Role Name\"];\n\tdocument.getElementById(\"role_mne\").value = serverRoleData[\"Mnemonic Server Role\"];\n}\n\n// Interpolate the values from the input\nfunction getMaxModule() {\n\n\tvar moduleCount = modularjs.mainDoc.getElementsByTagName(\"module\");\n\ttemp = moduleCount[0].id.slice(-1)\n\tfor (var i = 0; i < moduleCount.length; i++) {\n\n\t\tmodCnt = moduleCount[i].id.slice(-1);\n\t\tif (modCnt > temp) {\n\t\t\ttemp = modCnt;\n\t\t}\n\t}\n\treturn temp;\n}\n\n// Add a server role to the current app\nfunction newServerRole() {\n\tvar currentForm = modularjs.mainDoc.getElementById(document.id);\n\tvar newForm = modularjs.newModule(document.name, {});\n\n\tcurrentForm.parentElement.appendChild(newForm);\n}\n\n// Remove the selected server role from the current app\nfunction removeServerRole() {\n\n\tvar serverRole = modularjs.mainDoc.getElementById(\"serverRole\");\n\tvar titlebar = modularjs.mainDoc.getElementsByName(\"titlebar\")[0];\n\n\t// If there is only one naming form on the page, clear the dropdown and return \n\tif (modularjs.mainDoc.getElementsByName(document.name).length == 1) {\n\t\tinitialDropdown();\n\t\treturn;\n\t}\n\n\t// Perform the removal\n\tmodularjs.shadowModules[document.id].mutationObserver.disconnect();\n\tmodularjs.mainDoc.getElementById(document.id).remove();\n\tmodularjs.shadowModules[document.id] = null;\n\n\t// Set the max-height and scroll style attributes\n\tvar maxHeight = modularjs.mainDoc.documentElement.clientHeight - serverRole.clientHeight - titlebar.clientHeight - (2 * 16 + 1);\n}\n\nfunction appendClasslist(dropId) {\n\n\tvar dropdown = modularjs.mainDoc.getElementsByClassName(dropId);\n\tfor (var i = 0; i < dropdown.length; i++) {\n\n\t\tdocument.getElementsByClassName(dropId).className = dropId + \"added\";\n\t}\n}\n\n// Checks if all options have loaded\nfunction checkLoadingStatus(){\n\t\n\t// If the options have all loaded, enable selection\n\tif(\n\t\tObject.keys(modularjs.sharedInfo.appDropdowns).length == 3 &&\n\t\tObject.keys(modularjs.sharedInfo.serverRoleDropdowns).length == 4\n\t){\n\t\tmodularjs.mainDoc.body.classList.remove(\"disabled\");\n\t}\n}\n\n// Populates the specified dropdown with contents from the specified html file\nfunction populateDropdown(htmlFile, dropId) {\n\n\t// If the info has already been retrieved, populate the dropdown and return\n\tif(modularjs.sharedInfo.serverRoleDropdowns[dropId]){\n\t\t\n\t\t// Populate the specified dropdown\n\t\tvar dropdown = document.getElementsByClassName(dropId)[0];\n\t\tdropdown.innerHTML = modularjs.sharedInfo.serverRoleDropdowns[dropId];\n\t\tmodularjs.syncModules(document.module, \"fromShadow\");\n\t\treturn;\n\t}\n\n\tvar xmlhttp = new XMLHttpRequest();\n\txmlhttp.open(\"GET\",htmlFile,true);\n\txmlhttp.onreadystatechange = function() {\n\t\tif (xmlhttp.status == 200 && xmlhttp.readyState == 4) {\n\t\t\tvar response = this.responseText;\n\t\t\tresponse = response.replace(\"b'\", \"\");\n\t\t\tresponse = response.replace(\"'\", \"\");\n\t\t\t\n\t\t\t// Populate the specified dropdown and cache the response\n\t\t\tvar dropdown = document.getElementsByClassName(dropId)[0];\n\t\t\tdropdown.innerHTML = response;\n\t\t\tmodularjs.sharedInfo.serverRoleDropdowns[dropId] = response;\n\t\t\tcheckLoadingStatus();\n\t\t}\n\t};\n\txmlhttp.send();\n}\n"],"style":" module[name=serverRole]{\n\tdisplay: block;\n\tborder-top: 1px solid var(--orange);\n}\n\n module[name=serverRole] select {\n\tmin-width: 150px;\n\tmax-width: 250px;\n}\n\n module[name=serverRole] .group {\n\tdisplay: inline-block;\n\ttext-align: center;\n\tvertical-align: top;\n\tpadding: 0 10px;\n\tmargin: 10px 0;\n}\n\n module[name=serverRole] .group > label {\n\ttext-align: center;\n\tdisplay: block;\n}\n\n module[name=serverRole] #serverRole {\n\tdisplay: inline-block;\n \ttext-align: center;\n\twidth: calc(100% - 2 * 275px);\n\tmargin-left: calc(275px - 30px);\n\tvertical-align: middle;\n}\n\n module[name=serverRole] #formQuantityButtons {\n\tdisplay: inline-block;\n\twidth: 30px;\n\tvertical-align: middle;\n}\n\n module[name=serverRole] #formQuantityButtons > * {\n\tdisplay: inline-block;\n\ttext-align: center;\n\twidth: 30px;\n\tcolor: var(--orange);\n\tfont-size: 1.5em;\n\tfont-weight: bold;\n\tpadding-bottom: 4px;\n\theight: calc(100% - 4px);\n}\n\n module[name=serverRole] #formQuantityButtons > *:hover {\n\tcolor: white;\n\tbackground-color: var(--orange);\n\tcursor: pointer;\n}\n","styleMarkers":[true],"body":"<link rel=\"stylesheet\" type=\"text/css\" href=\"index.css\">\n\n<script>\n\tvar serverRoleName = \"{{serverRoleName}}\";\n</script>\n<script src=\"index.js\"></script>\n\n<form id=\"serverRole\">\n\t<div class=\"group\">\n\t\t<label>Generic Server Role</label>\n\t\t<select class=\"gsr_drop\"></select>\n\t</div><!--\n\t--><div class=\"group\">\n\t\t<label>Security Zone</label>\n\t\t<select class=\"sz_drop\"></select>\n\t</div><!--\n\t--><div class=\"group\">\n\t\t<label>Access from BU</label>\n\t\t<select class=\"afbu_drop\"></select>\n\t</div><!--\n\t--><div class=\"group\">\n\t\t<label>Access to BU</label>\n\t\t<select class=\"atbu_drop\"></select>\n\t</div><!--\n\t--><div class=\"group\">\n\t\t<label>Role Name</label>\n\t\t<input type=\"text\" id=\"role_name\">\n\t</div><!--\n\t--><div class=\"group\">\n\t\t<label>Mnemonic Server Name</label>\n\t\t<input type=\"text\" id=\"role_mne\">\n\t</div>\n</form><!--\n--><div id=\"formQuantityButtons\">\n\t<div id=\"removeFormButton\" onclick=\"removeServerRole()\">-</div><!--\n\t--><div id=\"addFormButton\" onclick=\"newServerRole()\">+</div>\n</div>\n\n"},"namingForm":{"scripts":["labels = {\n//\t\"cloud_names\" : \"Fiserv Cloud Name\",\n\t\"azure_locations\" : \"Fiserv Location Name\",\n\t\"azure_resource_types\" : \"Resource Type\",\n\t\"business_units\" : \"Business Unit\",\n\t\"environments\" : \"Environment\",\n\t\"security_zones\" : \"Security Zone\",\n\t\"operating_systems\" : \"Operating System\"\n};\nvar inputs = document.getElementById(\"inputs\");\n\n// Populates the role and app name dropdowns based on the selected business unit\nfunction populateRoleAndAppNames(){\n\tvar bu = document.getElementsByName(\"business_units\")[0].value;\n\tvar roles = sharedMetadataJSON[\"all_data\"][\"business_units\"][bu][\"roles\"];\n\tvar rolesDropdown = document.getElementsByName(\"roles\")[0];\n\trolesDropdown.innerHTML = \"\";\n\tvar applications = sharedMetadataJSON[\"all_data\"][\"business_units\"][bu][\"applications\"];\n\tvar appsDropdown = document.getElementsByName(\"applications\")[0];\n\tappsDropdown.innerHTML = \"\";\n\n\t// Populate the roles dropdown\n\tvar defaultIsSet = false;\n\tfor(var role in roles){\n\t\tvar opt = document.createElement(\"option\");\n\t\topt.innerHTML = role;\n\t\topt.value = role;\n\t\trolesDropdown.appendChild(opt);\n\t}\n\n\t// Populate the applications dropdown\n\tvar defaultIsSet = false;\n\tfor(var app in applications){\n\t\tvar opt = document.createElement(\"option\");\n\t\topt.innerHTML = app;\n\t\topt.value = app;\n\t\tappsDropdown.appendChild(opt);\n\t}\n}\n\n// Shows the fields that are relevant to the selected resource type\nfunction showRelevantFields(){\n\tvar resourceType = document.getElementsByName(\"azure_resource_types\")[0].value;\n\t\n\t// Iterate through inputs to determine which ones should be visible\n\tvar dropdowns = document.getElementsByTagName(\"select\");\n\tfor(var i = 0; i < dropdowns.length; i++){\n\t\t\n\t\t// If the current dropdown is not needed, hide it\n\t\tif(\n\t\t\tresourceType != \"virtual_machine\" &&\n\t\t\t[\"operating_systems\", \"security_zones\", \"applications\"].includes(dropdowns[i].name)\n\t\t){\n\t\t\tdropdowns[i].parentElement.classList.add(\"hidden\");\n\t\t\n\t\t// Else, make the current input visible\n\t\t}else{\n\t\t\tdropdowns[i].parentElement.classList.remove(\"hidden\");\n\t\t}\n\t}\n}\n\n// Create a new form and insert it before the current one\nfunction addForm(){\n\tmodularjs.doOnceLoaded.push(interpolateValues);\n\n\tvar currentForm = modularjs.mainDoc.getElementById(document.id);\n\tvar newForm = modularjs.newModule(document.name, {});\n\tvar code = modularjs.mainDoc.getElementsByTagName(\"pre\")[0];\n\tvar namingForms = modularjs.mainDoc.getElementById(\"namingForms\");\n\tvar titlebar = modularjs.mainDoc.getElementsByName(\"titlebar\")[0];\n\n\t// Insert new form\n\tcurrentForm.parentElement.appendChild(newForm);\n\n\t// Set the max-height and scroll style attributes\n\tvar maxHeight = modularjs.mainDoc.documentElement.clientHeight - namingForms.clientHeight - titlebar.clientHeight - (2 * 16 + 1);\n\tcode.style = \"max-height: \" + maxHeight + \"px; overflow: auto;\";\n}\n\n// Remove the current form from the page\nfunction removeForm(){\n\tvar code = modularjs.mainDoc.getElementsByTagName(\"pre\")[0];\n\tvar namingForms = modularjs.mainDoc.getElementById(\"namingForms\");\n\tvar titlebar = modularjs.mainDoc.getElementsByName(\"titlebar\")[0];\n\t\n\t// If there is only one naming form on the page, do nothing\n\tif(modularjs.mainDoc.getElementsByName(document.name).length == 1){\n\t\treturn;\n\t}\n\n\t// Perform the removal\n\tmodularjs.shadowModules[document.id].mutationObserver.disconnect();\n\tmodularjs.mainDoc.getElementById(document.id).remove();\n\tmodularjs.shadowModules[document.id] = null;\n\tmodularjs.doOnceLoaded.push(interpolateValues);\n\n\t// Set the max-height and scroll style attributes\n\tvar maxHeight = modularjs.mainDoc.documentElement.clientHeight - namingForms.clientHeight - titlebar.clientHeight - (2 * 16 + 1);\n\tcode.style = \"max-height: \" + maxHeight + \"px; overflow: auto;\";\n}\n\n// Render the form from sharedMetadataJSON[\"all_data\"]\nfunction renderForm(){\n\tfor(var key in sharedMetadataJSON[\"all_data\"]){\n\n\t\t// If the key is not in labels, continue\n\t\tif(!labels.hasOwnProperty(key)){\n\t\t\tcontinue;\n\t\t}\n\n\t\t// Create the selection prompts\n\t\tvar select = document.createElement(\"SELECT\");\n\t\tselect.name = key;\n\t\tselect.setAttribute(\"onchange\", \"modularjs.doOnceLoaded.push(interpolateValues); showRelevantFields();\");\n\n\t\tfor(var val in sharedMetadataJSON[\"all_data\"][key]) {\n\t\t\tvar opt = document.createElement('option');\n\t\t\topt.innerHTML = val;\n\t\t\topt.value = val;\n\t\t\tselect.appendChild(opt);\n\t\t\t\n\t\t\t// If the current key is \"business_units\" and the value of opt is the user's bu, make opt the default selection\n\t\t\tif(key == \"business_units\" && opt.value == buMap.getConsulBU()){\n\t\t\t\topt.setAttribute(\"selected\", \"\");\n\t\t\t}\n\t\t}\n\n\t\t// If the current key is \"business_units\", add an onchange event\n\t\tif(key == \"business_units\"){\n\t\t\tselect.setAttribute(\"onchange\", \"populateRoleAndAppNames(); modularjs.doOnceLoaded.push(interpolateValues)\");\n\t\t}\n\n\t\t//Add label and dropdown to document\n\t\tvar p = document.createElement(\"p\");\n\t\tp.setAttribute(\"class\", \"boxed\");\n\t\tp.innerHTML = '<label>' + labels[key] + '</label>';\n\t\tp.appendChild(select);\n\t\tinputs.appendChild(p);\n\t}\n\tinputs.innerHTML += '<p class = \"boxed\"><label>Application</label><select name=\"applications\" onchange=\"interpolateValues()\"></select></p>';\n\tinputs.innerHTML += '<p class = \"boxed\"><label>Role Name</label><select name=\"roles\" onchange=\"interpolateValues()\"></select></p>';\n\tinputs.innerHTML += '<p class = \"boxed\"><label>Resource Number</label><input type=\"number\" value=\"1\" min=\"1\" max=\"999\" name=\"resource_number\" onchange=\"interpolateValues()\"></p>';\n}\n\nrenderForm();\npopulateRoleAndAppNames();\nshowRelevantFields();\n\nmodularjs.sharedInfo.addForm = addForm;\nmodularjs.sharedInfo.removeForm = removeForm;\n"],"style":" module[name=namingForm]{\n\tpadding: 0 275px;\n\tdisplay: inline-table;\n\ttable-layout: auto;\n\tborder-top: 1px solid #ff6600;\n\ttext-align: center;\n\twidth: calc(100% - 2 * 275px);\n\ttransition: 0.5s;\n}\n\n module[name=namingForm] label {\n\tdisplay: block;\n}\n\n module[name=namingForm] input[type=\"number\"] {\n\twidth: 50px;\n}\n\n module[name=namingForm] input{\n\tmargin: 5px;\n}\n\n module[name=namingForm] select{\n\tmargin: 5px 0;\n\twidth: 100%;\n}\n\n module[name=namingForm] p.boxed{\n\tdisplay: inline-block;\n\tpadding: 0px 10px 0px 10px;\n}\n\n module[name=namingForm] .hidden{\n\tdisplay: none !important;\n}\n\n module[name=namingForm] #inputs {\n\twidth: calc(100% - 40px);\n}\n\n module[name=namingForm] #formQuantityButtons {\n\tdisplay: table-cell;\n\twidth: 30px;\n\tvertical-align: middle;\n}\n\n module[name=namingForm] #formQuantityButtons > * {\n\tdisplay: inline-block;\n\ttext-align: center;\n\twidth: 30px;\n\tcolor: var(--orange);\n\tfont-size: 1.5em;\n\tfont-weight: bold;\n\tpadding-bottom: 4px;\n\theight: calc(100% - 4px);\n}\n\n module[name=namingForm] #formQuantityButtons > *:hover {\n\tcolor: white;\n\tbackground-color: var(--orange);\n\tcursor: pointer;\n}\n","styleMarkers":[true],"body":"<link rel=\"stylesheet\" type=\"text/css\" href=\"index.css\">\n<script src=\"index.js\"></script>\n<h3></h3>\n<div id=\"inputs\"></div><!--\n--><div id=\"formQuantityButtons\">\n\t<div id=\"removeFormButton\" onclick=\"removeForm()\">-</div><!--\n\t--><div id=\"addFormButton\" onclick=\"addForm()\">+</div>\n</div>\n\n"}},
	"storeCache" : function(){
		var xhttp = new XMLHttpRequest();
		xhttp.onreadystatechange = function(){
			if(this.readyState == 4 && this.status == 200){
				var modularjsSource = this.responseText;
				modularjsSource = modularjsSource.replace(/"cache" : {}/, '"cache" : ' + JSON.stringify(modularjs.cache));
				
				// Download the modularjs source packaged with the cache
				var blob = new Blob([modularjsSource], {"type" : "application/javascript"});
				var url = window.URL.createObjectURL(blob);
				var downloadLink = document.createElement("a");
				downloadLink.style = "display: none";
				downloadLink.href = url;
				downloadLink.download = "modular.js";
				document.body.appendChild(downloadLink);
				downloadLink.click();
				window.URL.revokeObjectURL(url);
			}else if(this.readyState == 4){
				alert("Error compiling cache");
				throw this.responseText;
			}
		}
		xhttp.open("GET", "/js/modular.js", true);
		xhttp.send();
	},
	"doOnceLoaded" : [],
	"setup" : function(){
		var globalStyle = document.head.getElementsByTagName("style")[0];

		// If there is not style tag, create one
		if(globalStyle == undefined){
			globalStyle = document.createElement("style");
			document.head.appendChild(globalStyle);
		}
		globalStyle.innerHTML += "\nmodule:not([visible]){\n" +
			"\tdisplay : none !important\n" +
		"}\n";
	},
	"mutationObserverConfig" : {
		"characterData" : true,
		"attributes" : true,
		"childList" : true,
		"subtree" : true
	},
	"main" : function(){
		// Get all modules
		var modules = document.getElementsByTagName("module");

		// Get untouched modules
		var untouchedModules = [];
		for(var i = 0; i < modules.length; i++){
			// If the module is untouched, add it to untouchedModules then touch it
			if(modules[i].getAttribute("touched") != "true"){
				untouchedModules.push(modules[i]);
				modules[i].setAttribute("touched", "true");
			}
		}

		// If there are no untouched modules, return
		if(untouchedModules.length == 0){
			return;
		}

		// Iterate through untouchedModules
		for(var i = 0; i < untouchedModules.length; i++){
			var xhttp = new XMLHttpRequest();
			xhttp.module = untouchedModules[i];

			// If there is no cache for the current module type set it up
			if(modularjs.cache[untouchedModules[i].getAttribute("name")] == undefined){
				modularjs.cache[untouchedModules[i].getAttribute("name")] = {};
			}

			// If the module is empty, xhttp.modularJSON = {}
			if(xhttp.module.innerHTML.replace(/\s+/, "") == ""){
				xhttp.modularJSON = {};
				
			// Else, sanitize modularJSON and parse it
			}else{
				var unsanitized = xhttp.module.innerHTML.match(/=\s*"(\\"|[^"])*"/g);
				unsanitized = (unsanitized == null) ? [] : unsanitized;
				// Sanitize the unsanitized bits
				var sanitizedJSON = xhttp.module.innerHTML;
				for(var j = 0; j < unsanitized.length; j++){
					var sanitized = '=\\"' + unsanitized[j].substring(2, unsanitized[j].length - 1) + '\\"';
					sanitizedJSON = sanitizedJSON.replace(unsanitized[j], sanitized);
				}
				sanitizedJSON = sanitizedJSON.replace(/(\n|\t)/g, "    ");
				xhttp.modularJSON = JSON.parse(sanitizedJSON);
			}

			// Render the specified module to the page using the supplied modularJSON and html as parameters
			function renderModule(module, modularJSON, html){
				moduleNumber = Object.keys(modularjs.shadowModules).length;
				module.id = "module" + moduleNumber;
				var moduleName = module.getAttribute("name");
				var shadowModule = document.createElement("module");
				shadowModule.id = module.id;
				shadowModule.setAttribute("name", moduleName);
				shadowModule.innerHTML = injectModularJSON(
					adjustPaths(html, moduleName),
					modularJSON
				);
				applyScripts(shadowModule, module, modularJSON);
				applyStyle(shadowModule, modularJSON);
				modularjs.shadowModules[module.id] = shadowModule;

				// Invoke modularjs.main to take care of nested modules
				modularjs.main();
				applyMutationObserver(shadowModule, module);

				// Sync the module with its shadow
				modularjs.syncModules(module, "fromShadow");
			}

			// Process the code once it has been retrieved
			xhttp.onreadystatechange = function(){
				if(this.readyState == 4){

					// If the call is successful, render the module to the page and update the cache
					if(this.status == 200){
						renderModule(this.module, this.modularJSON, this.responseText);
						modularjs.cache[this.module.getAttribute("name")].body = this.responseText;

					// Else, show an alert and throw an error
					}else{
						var errorMessage = "There was an error loading the module '" + this.module.getAttribute("name") + "'";
						alert(errorMessage);
						throw errorMessage;
					}
				}
			};

			var moduleName = xhttp.module.getAttribute("name");
			var directory = window.location.href.substring(0, window.location.href.lastIndexOf("/") + 1);
			xhttp.open("GET", directory + "/modules/" + moduleName + "/index.html", true);

			// If the module body is cached, use the cache
			if(modularjs.cache[moduleName].body){
				renderModule(xhttp.module, xhttp.modularJSON, modularjs.cache[moduleName].body);
				modularjs.syncModules(xhttp.module, "fromShadow");

			// Else, send the request
			}else{
				xhttp.send();
			}
		}

		// Adjusts relative src and href values
		function adjustPaths(html, moduleName){
			var paths = html.match(/\s(src|href)\s*=\s*["'][^"']*["']/g);

			// If there are no paths, return
			if(paths == null){
				return html;
			}

			// Remove paths that are not sane
			for(var i = 0; i < paths.length; i++){
				try{
					eval(paths[i]);
				}catch(e){
					paths.splice(i--, 1)
				}
			}

			var adjustedPaths = paths.map(
				function(path){
					var directory = window.location.href.substring(0, window.location.href.lastIndexOf("/") + 1);

					// If the path does not reference a network, adjust it
					if(!path.indexOf("://") != -1){
						cleanPath = path.replace(/(\ssrc|\shref|=|"|')/g, "");
						result = path.replace(/=.*/, '="' + directory + 'modules/' + moduleName + "/" + cleanPath + '"');
						return result;
					// Else, leave the path alone
					}else{
						return path;
					}
				}
			);

			// Replace all paths with their adjust counterpart
			var result = html;
			for(var i = 0; i < paths.length; i++){
				result = result.replace(paths[i], adjustedPaths[i]);
			}

			return result;
		}

		// Interpret values incapsulated in "{{ }}"
		function injectModularJSON(source, modularJSON){
			var values = source.match(/{{[^{}]*}}/g);

			// If "values" is not null, iterate through values and inject values from modularJSON
			if(values != null){
				for(var i = 0; i < values.length; i++){
					var key = values[i].replace(/({{|}})/g, "");
					var injection = (typeof modularJSON[key] != "string") ? JSON.stringify(modularJSON[key]) : modularJSON[key];
					injection = (!injection) ? "" : injection.replace(/(^"|"$)/g, "");
					source = source.replace(values[i], injection);
				}
			}

			return source;
		}

		// Extract all function instantiations from the supplied src
		function extractAllFunctionInstantiations(src){
			return src.match(/(function\s*[a-zA-Z0-9_]+|[a-zA-Z0-9_.]+\s*=\s*function)\s*\([a-zA-Z0-9_,.\[\]\s]*\)/g);
		}

		// Extract all function invocations from the supplied src
		function extractAllFunctionInvocations(src){
			return src.match(/[a-zA-Z0-9_.\[\]]+\s*\(([a-zA-Z0-9_,.\[\]\s]*|\\\(|\\\)|'.*'(,\s*('.*'|".*"))*|".*"(,\s*('.*'|".*"))*)\)/g);
		}

		// Extract a function name from the supplied function context instantiations or invocations)
		function extractFunctionName(functionInstantiation){
			return functionInstantiation.replace(/(( =)?\s*function\s*|\(.*\))/g, "");
		}
		
		// Modifies the scope of all functions embedded in the module's elements' attributes
		function modifyEmbeddedFunctions(shadowModule, module){
			var elements = shadowModule.getElementsByTagName("*");
			
			// Iterate through elements
			for(var i = 0; i < elements.length; i++){
				var element = elements[i];
				var attributes = element.attributes;
				
				// If there are no attributes, continue
				if(typeof(attributes) == "undefined"){
					continue;
				}
				
				// Iterate through attributes
				for(var j = 0; j < attributes.length; j++){
					var attribute = attributes[j];
					var functionInvocations = extractAllFunctionInvocations(attribute.value);
					
					// If there are no function invocations, continue
					if(functionInvocations == null){
						continue;
					}

					// Iterate through functionInvocations
					for(var k = 0; k < functionInvocations.length; k++){
						var invocation = functionInvocations[k];
						var functionName = extractFunctionName(invocation);
						
						// If the function name is not in the list of locally defined functions, continue
						if(modularjs.functions[shadowModule.id].localFunctionNames.indexOf(functionName) == -1){
							continue;
						}
						var functionAccessor = "modularjs.functions['" + shadowModule.id + "'].localFunctions['" + functionName + "']";
						
						var sanitizedInstantiation = invocation.replace(functionName, functionAccessor);
						element.setAttribute(attribute.name, attribute.value.replace(invocation, sanitizedInstantiation));
					}
				}
			}
			module.innerHTML = shadowModule.innerHTML;
		}

		// Format the scripts so that they are isolated to the given module
		function applyScripts(shadowModule, module, modularJSON){
			var scripts = shadowModule.getElementsByTagName("script");
			var cache = modularjs.cache[module.getAttribute("name")].scripts;

			// If the scripts cache doesn't exist, create it
			if(!cache){
				modularjs.cache[module.getAttribute("name")].scripts = new Array(scripts.length);
				cache = modularjs.cache[module.getAttribute("name")].scripts;
			}
			
			// Adjusts window navigation so that relative links become absolute links
			function adjustNavigation(script){
				var links = script.match(/window\s*\.\s*(location)\s*((.\s*(assign|reload)\s*\()|=)\s*("\/*[^"]*"|'\/*[^']*')/g);
				links = (links == null) ? [] : links;
				for(var i = 0; i < links.length; i++){
					
					// If the link does not reference a network, adjust it
					if(links[0].indexOf("://") == -1){
						var modifiedLink = links[i].match(/("\/*[^"]*"|'\/*[^']*')/g);
						modifiedLink = (modifiedLink == null) ? [] : modifiedLink;
						modifiedLink = modifiedLink[0];
						var coreLink = modifiedLink.substring(1, modifiedLink.length - 1);
						var hostlessLink = coreLink.replace(/^localhost\//, "");
						modifiedLink = links[i].replace(coreLink, "/shadowModules/" + module.getAttribute("name") + "/" + hostlessLink);
						script = script.replace(links[i], modifiedLink);
					}
				}
				return script;
			}
			
			// Constructs and executes the function
			function constructFunc(){
				
				// If there are no empty slots, construct the function
				if(!(--functionSrc.emptySlots)){
					modularjs.functions[shadowModule.id] = {};
					functionSrc = functionSrc.join("\n");
					var functionNames = getLocalFunctionNames();
					
					// If there are local functions defined in functionSrc, store their names for later and append code to functionSrc to return them
					if(functionNames != null){
						functionSrc += "\n" + returnLocalFunctions(functionNames);
					}
					var moduleFunc = new Function("module", "document", functionSrc);
					var localFunctions = moduleFunc(module, shadowDocument);
					
					// If localFunctions is not undefined, store the local function names
					if(localFunctions != undefined){
						modularjs.functions[shadowModule.id].localFunctionNames = Object.keys(localFunctions);
					
					// Else, store an empty  array
					}else{
						modularjs.functions[shadowModule.id].localFunctionNames = [];
					}
					storeLocalFunctions(localFunctions);
					modularjs.functions[shadowModule.id].main = moduleFunc;
					modifyEmbeddedFunctions(shadowModule, module);
				}
			}
			
			// Returns functions defined locally in functionSrc
			function getLocalFunctionNames(){
				var functions = extractAllFunctionInstantiations(functionSrc);
				
				// If there are functions defined in functionSrc, extract their names
				if(functions != null){
					functions = functions.map(
						extractFunctionName
					);
				}
				return functions;
			}
			
			// Generates code to append to functionSrc that returns functions defined locally
			function returnLocalFunctions(functionNames){
				var result = "// Return locally defined functions\n" +
				"var localFunctions = {};\n\n";
				
				// Iterate through functionNames
				for(var i = 0; i < functionNames.length; i++){
					result += "try{\n" +
						"\tlocalFunctions['" + functionNames[i] + "'] = " + functionNames[i] + ";\n" +
					"}catch(error){\n" +
					"\tconsole.warn(\"The function '" + functionNames[i] + "' was not defined in the current scope, so it will not be returned.\");\n" +
					"}\n\n";
				}
				result += "return localFunctions;";
				return result;
			}
			
			// Store local functions in modularjs
			function storeLocalFunctions(localFunctions){
				
				// If the localFunctions variable is undefined, return
				if(typeof(localFunctions) == "undefined"){
					return;
				}
				modularjs.functions[shadowModule.id].localFunctions = {};
				for(var functionName in localFunctions){
					modularjs.functions[shadowModule.id].localFunctions[functionName] = localFunctions[functionName];
				}
			}
			
			// Create shadowDocument
			var shadowDocument = document.implementation.createHTMLDocument(shadowModule.id);
			shadowDocument.module = module;
			shadowDocument.id = shadowModule.id;
			shadowDocument.name = shadowModule.getAttribute("name");
			shadowDocument.body.appendChild(shadowModule);
			
			// Set the parent
			if(module.getRootNode != undefined){
				shadowDocument.parent = module.getRootNode();
			}else{
				function getRootNode(node){
					
					// If the parent node is null or the node is a document, return the node
					if(
						node.parentNode == null ||
						node.toString().indexOf("HTMLDocument") != -1
					){
						return node;
					
					// Else, inspect parent node
					}else{
						return getRootNode(node.parentNode);
					}
				}
				shadowDocument.parent = getRootNode(module);
			}
			
			// Try to initialize functionSrc
			try{
				var functionSrc = new Array(scripts.length);

			// In the event of an error (due to a bug in IE), redefine scripts and try again
			}catch(e){
				var scripts = shadowModule.getElementsByTagName("script");
				var functionSrc = new Array(scripts.length);
			}

			// Iterate through scripts and construct functionSrc
			functionSrc.emptySlots = functionSrc.length;
			srcIndex = 0;
			while(scripts.length > 0){
				
				
				// If the current script does not have an src attribute, get the inline code
				if(!scripts[0].src){
					functionSrc[srcIndex] = adjustNavigation(scripts[0].innerText);
					constructFunc();

				// Else, if the current script is already cached, use the cache
				}else if(cache[srcIndex]){
					functionSrc[srcIndex] = injectModularJSON(
						adjustNavigation(cache[srcIndex]),
						modularJSON
					);
					constructFunc();

				// Else, get the source file
				}else{
					var xhttp = new XMLHttpRequest();
					xhttp.index = srcIndex;
					xhttp.srcPath = scripts[0].src;
					xhttp.onreadystatechange = function(){
						if(this.readyState == 4){
							
							// If the request is successful, load the source code into a function and update the cache
							if(this.status == 200){
								functionSrc[this.index] = injectModularJSON(
									adjustNavigation(this.responseText),
									modularJSON
								);
								cache[this.index] = this.responseText;
								constructFunc();

								// If all scripts have been processed, set the appliedScripts attribute
								if(typeof(functionSrc) == "string"){
									shadowModule.setAttribute("appliedScripts", "");
								}
							
							// Else, show an alert and throw an error
							}else{
								var errorMessage = "There was an error loading '" + this.srcPath + "'";
								alert(errorMessage);
								throw errorMessage;
							}
						}
					};
					xhttp.open("GET", scripts[0].src, true);
					xhttp.send();
				
				}
				scripts[0].parentNode.removeChild(scripts[0]);
				srcIndex++;
			}

			// If all scripts have been processed, set the appliedScripts attribute
			if(typeof(functionSrc) == "string" || functionSrc.length == 0){
				shadowModule.setAttribute("appliedScripts", "");
			}
		}

		// Apply the style so that it is isolated to the given module
		function applyStyle(module, modularJSON){
			
			// Get the head and global style tags
			var globalStyle = document.head.getElementsByTagName("style")[0];
			
			// If globalStyle is undefined, create it
			if(globalStyle == undefined){
				globalStyle = document.createElement("style");
				document.head.appendChild(globalStyle);
			}
			
			// Get styleElements
			var styleElements = module.getElementsByTagName("style");
			
			// Convert styleElements to an array
			var styles = [];
			for(var i = 0; i < styleElements.length; i++){
				styles.push(styleElements[i]);
			}
			
			// Get links
			var links = module.getElementsByTagName("link");
			
			// Iterate through links
			for(var i = 0; i < links.length; i++){
				links[i].href = links[i].getAttribute("href");
				
				// If the link references a css file, add it to styles
				if(links[i].href.indexOf(".css") != -1){
					styles.push(links[i]);
				}
			}
			
			// Confines the style to the module
			function confineStyle(styleSource, moduleName){
				var flags = {
					"{" : [],
					'"' : false,
					"@" : false,
					"moduleName" : false
				}
				
				// Remove comments
				styleSource = styleSource.replace(/\/\*((?!\*\/)[\s\S])*\*\//g, "");
				
				// Iterate through styleSource
				for(var i = 0; i < styleSource.length; i++){
					switch(styleSource[i]){
						case '"':
							flags['"'] = !flags['"'];
							flags["moduleName"] = true;
							break;

						case "{":
							
							// If the " flag and the @ flag is false, push "{" to the stack
							if(!flags['"'] && !flags["@"]){
								flags["{"].push("{");
							}

							// If the @ flag is true, set it to false
							if(flags["@"]){
								flags["@"] = false;

							// Else, set the moduleName tag to true
							}else{
								flags["moduleName"] = true;
							}

							break;

						case "}":
							
							// If the " flag is false, pop an element from the stack
							if(!flags['"']){
								flags["{"].pop();
							}

							// If the @ flag is true, set it to false
							if(flags["@"]){
								flags["@"] = false;
							}
							
							// If the stack is empty, set the moduleName to false
							if(flags["{"].length == 0){
								flags["moduleName"] = false;
							}
							
							break;

						case ",":
							
							// If the { and " flags are empty/false, toggle the module flag
							if(flags["{"].length == 0 && !flags['"']){
								flags["moduleName"] = !flags["moduleName"];
							}
							
							break;

						case "@":
							// If the " flag is false, set the @ flag to true
							if(!flags['"']){
								flags["@"] = true;
							}

							break;
						
						default:
							
							// If the moduleName flag is false, the @ flag is false, and the current character is not whitespace, insert the module id
							if(!flags["moduleName"] && !flags["@"] && !styleSource[i].match(/\s/g)){
								styleSource = [styleSource.slice(0, i), "module[name=" + moduleName + "]", styleSource.slice(i)].join(" ");
								flags["moduleName"] = !flags["moduleName"];
							}
					}
				}
				
				// Remove "body" and "html" selectors, then return
				styleSource = styleSource.replace(/\s+body\s+/g, "");
				styleSource = styleSource.replace(/\s+body{/g, "{");
				styleSource = styleSource.replace(/\s+body\./g, "\.");
				styleSource = styleSource.replace(/\s+html\s+/g, "");
				styleSource = styleSource.replace(/\s+html{/g, "{");
				styleSource = styleSource.replace(/\s+html\./g, "\.");
				return styleSource;
			}

			// If there are no style elements, set the appliedStyle attribute
			if(styles.length == 0){
				module.setAttribute("appliedStyle", "");
			}

			// Iterate through styles
			for(var i = 0; i < styles.length; i++){
				var cache = modularjs.cache[module.getAttribute("name")];
				
				// Remove styles[i] from the dom
				styles[i].parentNode.removeChild(styles[i]);

				// If the style was found in the cache, set the appliedStyle attribute and continue
				if(cache.style != undefined && cache.styleMarkers[i] != undefined){
					module.setAttribute("appliedStyle", "");
					continue;
				
				// Else, if no styles have been applied yet, initialize the style cache for the module
				}else if(cache.style == undefined){
					cache.style = "";
					cache.styleMarkers = new Array(styles.length);
					cache.styleMarkers[i] = true;

				// Else, mark that retrieval of the current style has commenced
				}else{
					cache.styleMarkers[i] = true;
				}
				
				// If the src attribute is defined, get the source file
				if(styles[i].href){
					var xhttp = new XMLHttpRequest();
					xhttp.hrefPath = styles[i].src;
					xhttp.index = i;
					xhttp.globalStyle = globalStyle;
					xhttp.moduleName = module.getAttribute("name");
					xhttp.onreadystatechange = function(){
						if(this.readyState == 4){
							
							// If the request is successful, add the source code to globalStyle and update the cache
							if(this.status == 200){
								var confinedStyle = injectModularJSON(
									confineStyle(this.responseText, this.moduleName),
									modularJSON
								);
								this.globalStyle.innerHTML += confinedStyle;
								cache.style += confinedStyle;
								
								// If all styles have been applied, add the appliedStyle attribute
								if(!cache.styleMarkers.includes(undefined)){
									module.setAttribute("appliedStyle", "");
								}
							
							// Else, show an alert and throw an error
							}else{
								var errorMessage = "There was an error loading '" + this.hrefPath + "'";
								alert(errorMessage);
								throw errorMessage;
							}
						}
					};
					xhttp.open("GET", styles[i].href, true);
					xhttp.send();
				
				// Else, get the inline code and update the cache
				}else{
					var confinedStyle = injectModularJSON(
						confineStyle(styles[i].innerHTML, module.getAttribute("name")),
						modularJSON
					);
					globalStyle.innerHTML += confinedStyle;
					cache.style += confinedStyle;
								
					// If all styles have been applied, add the appliedStyle attribute
					if(!cache.styleMarkers.includes(undefined)){
						module.setAttribute("appliedStyle", "");
					}
				}
			}
		}

		// Apply a mutation observer to the supplied module and its corresponding shadowModule
		function applyMutationObserver(shadowModule, module){

			// Syncs the module with its corresponding shadowModule
			function shadowCallback(mutations){
				modularjs.syncModules(module, "fromShadow");
			}

			var shadowObserver = new MutationObserver(shadowCallback);
			shadowObserver.observe(shadowModule, modularjs.mutationObserverConfig);

			// Syncs the shadowModule with its corresponding module
			function moduleCallback(){
				modularjs.syncModules(module, "toShadow");
			}

			var moduleObserver = new MutationObserver(moduleCallback);
			moduleObserver.observe(module, modularjs.mutationObserverConfig);

			// Store the mutation observers for future reference
			shadowModule.mutationObserver = shadowObserver;
			module.mutationObserver = moduleObserver;
		}
	}
}

// Applies polyfills where necessary
function applyPolyfills(){
	if(!Array.prototype.includes){
		 //or use Object.defineProperty
		 Array.prototype.includes = function(search){
			return this.indexOf(search);
		}
	}
}

document.documentElement.setAttribute("style", "display: none;");

waitForBody = setInterval(
	function(){
		if(document.body){
			clearInterval(waitForBody);
			applyPolyfills();
			modularjs.setup();
			modularjs.main();

			// Apply any cached style rules
			for(var moduleName in modularjs.cache){
				document.getElementsByTagName("style")[0].innerText += modularjs.cache[moduleName].style;
			}

			document.documentElement.removeAttribute("style");
		}
	},
	1000
);

/*
// If document.body does not exist, take action when document.body materializes
if(!document.body){
	modularjs.documentObserver = new MutationObserver(
		function(){
			
			// If document.body exists, disconnect documentObserver and execute modularjs.setup() and modularjs.main()
			if(document.body){
				modularjs.documentObserver.disconnect();
				modularjs.setup();
				modularjs.main();
			}
		}
	);
	var config = {
		childList : true
	};
	modularjs.documentObserver.observe(document.documentElement, config);

// Else, execute modularjs.setup and modularjs.main();
}else{
	modularjs.setup();
	modularjs.main();
}
*/
