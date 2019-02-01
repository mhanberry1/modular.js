var modularjs = {
	// Syncs a modules contents with the corresponding shadowModule
	"syncModules" : function(module){
		// Ascend the DOM until the first parent module is found
		if(module.tagName.toLowerCase() != "module"){
			modularjs.syncModules(module.parentElement);
			return;
		}
		// If there is nothing to update, return
		if(module.innerHTML == modularjs.shadowModules[module.id].innerHTML){
			return;
		}
		module.innerHTML = modularjs.shadowModules[module.id].innerHTML;
	},
	"shadowModules" : {},
	"functions" : {},
	"main" : function(){
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
						applyScripts(shadowModule, this.module);
						applyStyle(shadowModule);
						modularjs.shadowModules[this.module.id] = shadowModule;
						this.module.innerHTML = shadowModule.innerHTML;
						// Invoke modularjs.main to take care of nested modules
						modularjs.main();
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

		// Extract all function instantiations from the supplied src
		function extractAllFunctionInstantiations(src){
			return src.match(/(function\s*[a-zA-Z0-9_]+|[a-zA-Z0-9_]+\s*=\s*function)\s*\([a-zA-Z0-9_,.\[\]\s]*\)/g);
		}

		// Extract all function invocations from the supplied src
		function extractAllFunctionInvocations(src){
			return src.match(/[a-zA-Z0-9_.\[\]]+\s*\([a-zA-Z0-9_,.\[\]\s]*\)/g);
		}

		// Extract a function name from the supplied function context instantiations or invocations)
		function extractFunctionName(functionInstantiation){
			return functionInstantiation.replace(/(( =)?\s*function\s*|\([a-zA-Z0-9_,.\[\]\s]*\))/g, "");
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
						if(!modularjs.functions[shadowModule.id].localFunctionNames.includes(functionName)){
							continue;
						}
						var functionAccessor = `modularjs.functions["${shadowModule.id}"].localFunctions["${functionName}"]`
						var sanitizedInstantiation = invocation.replace(functionName, functionAccessor) + "; modularjs.syncModules(this);";
						element.setAttribute(attribute.name, attribute.value.replace(invocation, sanitizedInstantiation));
					}
				}
			}
			module.innerHTML = shadowModule.innerHTML;
		}

		// Format the scripts so that they are isolated to the given module
		function applyScripts(shadowModule, module){
			var scripts = shadowModule.getElementsByTagName("script");
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
						modularjs.functions[shadowModule.id].localFunctionNames = functionNames;
					}
					var moduleFunc = new Function("module", "document", functionSrc);
					var localFunctions = moduleFunc(module, shadowDocument);
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
				"return {";
				// Iterate through functionNames
				for(var i = 0; i < functionNames.length; i++){
					result += `"${functionNames[i]}":${functionNames[i]}`;
					// If it is not the last iteration, add a comma
					if(i != functionNames.length - 1){
						result += ",";
					}
				}
				result += "};";
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
			// Iterate through scripts and construct functionSrc
			var functionSrc = new Array(scripts.length);
			functionSrc.emptySlots = functionSrc.length;
			// Create shadowDocument
			var shadowDocument = document.implementation.createHTMLDocument(shadowModule.id);
			shadowDocument.body.setAttribute("id", shadowModule.id);
			shadowDocument.body.setAttribute("name", shadowModule.getAttribute("name"));
			shadowDocument.body.appendChild(shadowModule);
			for(var i = 0; i < scripts.length; i++){
				// If the src attribute is defined, get the source file
				if(scripts[i].src != undefined){
					var xhttp = new XMLHttpRequest();
					xhttp.index = i;
					xhttp.srcPath = scripts[i].src;
					xhttp.onreadystatechange = function(){
						if(this.readyState == 4){
							// If the request is successful, load the source code into a function
							if(this.status == 200){
								functionSrc[i] = adjustNavigation(this.responseText);
								constructFunc();
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
				// Else, get the inline code
				}else{
					functionSrc[i] = adjustNavigation(scripts[i].innerText);
					constructFunc();
				}
				scripts[i].remove();
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
				links[i].href = links[i].getAttribute("href");
				// If the link references a css file, add it to styles
				if(links[i].href.includes(".css")){
					styles.push(links[i]);
				}
			}
			// Iterate through styles
			for(var i = 0; i < styles.length; i++){
				// If the src attribute is defined, get the source file
				if(styles[i].href != undefined){
					var xhttp = new XMLHttpRequest();
					xhttp.hrefPath = styles[i].src;
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
								var errorMessage = "There was an error loading '" + this.hrefPath + "'";
								alert(errorMessage);
								throw errorMessage;
							}
						}
					};
					xhttp.open("GET", styles[i].href, true);
					xhttp.send();
					styles[i].remove();
				// Else, get the inline code
				}else{
					globalStyle.innerHTML += styles[i].innerHTML;
				}
			}
		}
	}
}
modularjs.main();
