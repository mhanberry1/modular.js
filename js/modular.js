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
	"cache" : {},
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

				// If there is no cache, continue
				if(!modularjs.cache[moduleName].style){
					continue;
				}

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
