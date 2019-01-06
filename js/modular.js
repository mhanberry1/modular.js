function modularjs(){
	// Keep track of module numbers for asynchrous operations
	var moduleNumber = 0;
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
		// Get module documents
		var xhttp = new XMLHttpRequest();
		xhttp.module = untouchedModules[i];
		xhttp.onreadystatechange = function(){
			if(this.readyState == 4){
				// If the call is successful, render the module to the page
				if(this.status == 200){
					this.module.id = "module" + moduleNumber++;
					var moduleName = this.module.getAttribute("name");
					var shadowModule = document.createElement("module");
					shadowModule.id = this.module.id;
					shadowModule.setAttribute("name", moduleName);
					shadowModule.innerHTML = adjustPaths(this.responseText, moduleName);
					applyScripts(shadowModule);
					applyStyle(shadowModule);
					this.module.innerHTML = shadowModule.innerHTML;
					// Invoke modularjs to take care of nested modules
					modularjs();
				// Else, show an alert and throw an error
				}else{
					var errorMessage = "There was an error loading the module '" + this.module.getAttribute("name") + "'";
					alert(errorMessage);
					throw errorMessage;
				}
			}
		};
		var moduleName = xhttp.module.getAttribute("name");
		xhttp.open("GET", "/modules/" + moduleName + "/index.html", true);
		xhttp.send();
	}

	// Adjusts relative src and href values
	function adjustPaths(html, moduleName){
		var paths = html.match(/\s(src|href)\s*=\s*["'][^"']*["']/g);
		// If there are no paths, return
		if(paths == null){
			return html;
		}
		var adjustedPaths = paths.map(
			function(path){
				// If the path does not reference a network, adjust it
				if(!path.includes("://")){
					cleanPath = path.replace(/(\ssrc|\shref|=|"|')/g, "");
					result = path.replace(/=.*/, '="/modules/' + moduleName + "/" + cleanPath + '"');
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

	// Format the scripts so that they are isolated to the given module
	function applyScripts(module){
		var scripts = module.getElementsByTagName("script");
		// Adjusts window navigation so that relative links become absolute links
		function adjustNavigation(script){
			var links = script.match(/window\s*\.\s*(location)\s*((.\s*(assign|reload)\s*\()|=)\s*("\/*[^"]*"|'\/*[^']*')/g);
			links = (links == null) ? [] : links;
			for(var i = 0; i < links.length; i++){
				// If the link does not reference a network, adjust it
				if(!links[0].includes("://")){
					var modifiedLink = links[i].match(/("\/*[^"]*"|'\/*[^']*')/g);
					modifiedLink = (modifiedLink == null) ? [] : modifiedLink;
					modifiedLink = modifiedLink[0];
					var coreLink = modifiedLink.substring(1, modifiedLink.length - 1);
					var hostlessLink = coreLink.replace(/^localhost\//, "");
					modifiedLink = links[i].replace(coreLink, "/modules/" + module.getAttribute("name") + "/" + hostlessLink);
					script = script.replace(links[i], modifiedLink);
				}
			}
			return script;
		}
		// Iterate through scripts
		for(var i = 0; i < scripts.length; i++){
			// Create shadowDocument
			var shadowDocument = document.implementation.createHTMLDocument(module.id);
			shadowDocument.body.innerHTML = module.innerHTML;
			// If the src attribute is defined, get the source file
			if(scripts[i].src != undefined){
				var xhttp = new XMLHttpRequest();
				xhttp.srcPath = scripts[i].src;
				xhttp.onreadystatechange = function(){
					if(this.readyState == 4){
						// If the request is successful, load the source code into a function
						if(this.status == 200){
							var functionSrc = adjustNavigation(this.responseText);
							console.log(functionSrc);
							var moduleFunc = new Function("module", "document", functionSrc);
							moduleFunc(module, shadowDocument);
						// Else, show an alert and throw an error
						}else{
							var errorMessage = "There was an error loading '" + this.srcPath + "'";
							alert(errorMessage);
							throw errorMessage;
						}
					}
				};
				xhttp.open("GET", scripts[i].src, true);
				xhttp.send();
				scripts[i].remove();
			// Else, get the inline code
			}else{
				var functionSrc = adjustNavigation(scripts[i].innerText);
				var moduleFunc = new Function("module", "document", functionSrc);
				moduleFunc(module, shadowDocument);
			}
		}
	}

	// Apply the style so that it is isolated to the given module
	function applyStyle(module){
		// Get the head and global style tags
		var head = document.getElementsByTagName("head")[0];
		var globalStyle = head.getElementsByTagName("style")[0];
		// If globalStyle is undefined, create it
		if(globalStyle == undefined){
			globalStyle = document.createElement("style");
			head.appendChild(globalStyle);
		}
		// Get styles
		var styles = Array.from(module.getElementsByTagName("style"));
		// Get links
		var links = module.getElementsByTagName("link");
		// Iterate through links
		for(var i = 0; i < links.length; i++){
			links[i].src = links[i].getAttribute("src");
			// If the link references a css file, add it to styles
			if(links[i].src.includes(".css")){
				styles.push(links[i]);
			}
		}
		// Iterate through styles
		for(var i = 0; i < styles.length; i++){
			// If the src attribute is defined, get the source file
			if(styles[i].src != undefined){
				var xhttp = new XMLHttpRequest();
				xhttp.srcPath = styles[i].src;
				xhttp.globalStyle = globalStyle;
				xhttp.moduleId = module.id;
				xhttp.onreadystatechange = function(){
					if(this.readyState == 4){
						// If the request is successful, add the source code to globalStyle
						if(this.status == 200){
							var flags = {
								"{" : [],
								'"' : false,
								"moduleId" : false
							}
							var modifiedStyle = this.responseText
							// Iterate through modifiedStyle
							for(var i = 0; i < modifiedStyle.length; i++){
								switch(modifiedStyle[i]){
									case '"':
										flags['"'] = !flags['"'];
										flags["moduleId"] = true;
										break;
									case "{":
										// If the " flag is false, push "{" to the stack
										if(!flags['"']){
											flags["{"].push("{");
										}
										flags["moduleId"] = true;
										break;
									case "}":
										// If the " flag is false, pop an element from the stack
										if(!flags['"']){
											flags["{"].pop();
										}
										// If the stack is empty, set the moduleId to false
										if(flags["{"].length == 0){
											flags["moduleId"] = false;
										}
										break;
									case ",":
										// If the { and " flags are empty/false, toggle the module flag
										if(flags["{"].length == 0 && !flags['"']){
											flags["moduleId"] = !flags["moduleId"];
										}
									default:
										// If the moduleId flag is false and the current character is not whitespace, insert the module id
										if(!flags["moduleId"] && !modifiedStyle[i].match(/\s/g)){
											modifiedStyle = modifiedStyle.slice(0, i) + " #" + this.moduleId + " " + modifiedStyle.slice(i);
											flags["moduleId"] = !flags["moduleId"]
										}
								}
							}
							this.globalStyle.innerHTML += modifiedStyle;
						// Else, show an alert and throw an error
						}else{
							var errorMessage = "There was an error loading '" + this.srcPath + "'";
							alert(errorMessage);
							throw errorMessage;
						}
					}
				};
				xhttp.open("GET", styles[i].src, true);
				xhttp.send();
				styles[i].remove();
			// Else, get the inline code
			}else{
				globalStyle.innerHTML += styles[i].innerHTML;
			}
		}
	}
}
modularjs();
