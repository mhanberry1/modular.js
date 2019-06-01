var modularjs = {
	// Syncs a modules contents with the corresponding shadowModule
	"syncModules" : function(module){
		// If there are any stray links in the shadow module, remove them
		var links = modularjs.shadowModules[module.id].getElementsByTagName("link");
		for(var i = 0; i < links.length; i++){
			links[i].parentNode.removeChild(links[i]);
		}
		// If the content of module is different from that of shadowModule, update module
		if(module.innerHTML != modularjs.shadowModules[module.id].innerHTML){
			var links
			module.innerHTML = modularjs.shadowModules[module.id].innerHTML;
		}
		// If the style has not been applied, return
		if(!modularjs.shadowModules[module.id].hasAttribute("appliedStyle")){
			return;
		}
		module.setAttribute("visible", "");
		// If all modules are visible, execute the functions in modularjs.doOnceLoaded
		var numModules = document.getElementsByTagName("module").length;
		var numVisibleModules = document.querySelectorAll('module[visible=""]').length;
		if(numModules == numVisibleModules){
			var func = modularjs.doOnceLoaded.pop();
			while(func != undefined){
				func();
				func = modularjs.doOnceLoaded.pop();
			}
		}
		modularjs.main();
	},
	"newModule" : function(name, modularJSON){
		var module = document.createElement("module");
		module.setAttribute("name", name);
		module.innerHTML = JSON.stringify(modularJSON);
		document.body.appendChild(module);
		modularjs.main();
		return module;
	},
	"mainDoc" : document,
	"sharedInfo" : {},
	"shadowModules" : {},
	"functions" : {},
	"cache" : {},
	"doOnceLoaded" : [],
	"setup" : function(){
		var globalStyle = document.head.getElementsByTagName("style")[0];
		// If there is not style tag, create one
		if(globalStyle == undefined){
			globalStyle = document.createElement("style");
			document.head.appendChild(globalStyle);
		}
		globalStyle.innerHTML += "\nmodule:not([visible]){\n" +
			"\tdisplay : none\n" +
		"}\n";
	},
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
			// Else, increment moduleNumber
			}else{
				moduleNumber++;
			}
		}
		// If there are no untouched modules, return
		if(untouchedModules.length == 0){
			return;
		}
		// Iterate through untouchedModules
		for(var i = 0; i < untouchedModules.length; i++){
			// If there is no cache for the current module type set it up
			if(modularjs.cache[untouchedModules[i].getAttribute("name")] == undefined){
				modularjs.cache[untouchedModules[i].getAttribute("name")] = {};
			}
			// Get module documents
			var xhttp = new XMLHttpRequest();
			xhttp.module = untouchedModules[i];
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
			xhttp.onreadystatechange = function(){
				if(this.readyState == 4){
					// If the call is successful, render the module to the page
					if(this.status == 200){
						this.module.id = "module" + moduleNumber++;
						var moduleName = this.module.getAttribute("name");
						var shadowModule = document.createElement("module");
						shadowModule.id = this.module.id;
						shadowModule.setAttribute("name", moduleName);
						shadowModule.innerHTML = injectModularJSON(
							adjustPaths(this.responseText, moduleName),
							this.modularJSON
						);
						applyScripts(shadowModule, this.module);
						applyStyle(shadowModule);
						modularjs.shadowModules[this.module.id] = shadowModule;
						// Invoke modularjs.main to take care of nested modules
						modularjs.main();
						applyMutationObserver(shadowModule, this.module);
					// Else, show an alert and throw an error
					}else{
						var errorMessage = "There was an error loading the module '" + this.module.getAttribute("name") + "'";
						console.log(window.location.pathname);
						alert(errorMessage);
						throw errorMessage;
					}
				}
			};
			var moduleName = xhttp.module.getAttribute("name");
			xhttp.open("GET", window.location.pathname + "modules/" + moduleName + "/index.html", true);
			xhttp.send();
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
					// If the path does not reference a network, adjust it
					if(!path.indexOf("://") != -1){
						cleanPath = path.replace(/(\ssrc|\shref|=|"|')/g, "");
						result = path.replace(/=.*/, '="' + window.location.pathname + 'modules/' + moduleName + "/" + cleanPath + '"');
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
			var values = source.match(/{{.*}}/g);
			// If "values" is not null, terate through values and inject values from modularJSON
			if(values != null){
				for(var i = 0; i < values.length; i++){
					var key = values[i].replace(/({{|}})/g, "");
					source = source.replace(values[i], modularJSON[key]);
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
						//var sanitizedInstantiation = invocation.replace(functionName, functionAccessor) + "; modularjs.syncModules(this);";
						var sanitizedInstantiation = invocation.replace(functionName, functionAccessor);
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
					eval("function test(module, document){" + functionSrc + "}");
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
			shadowDocument.id = shadowModule.id;
			shadowDocument.name = shadowModule.getAttribute("name");
			shadowDocument.body.appendChild(shadowModule);
			// Set the parent
			if(module.getRootNode != undefined){
				shadowDocument.parent = module.getRootNode();
			}else{
				function getRootNode(node){
					// If the node is a document, return the node
					if(node.toString().indexOf("HTMLDocument") != -1){
						return node;
					// Else, inspect parent node
					}else{
						return getRootNode(node.parentNode);
					}
				}
				shadowDocument.parent = getRootNode(module);
			}
			// Iterate through scripts and construct functionSrc
			var scripts = shadowModule.getElementsByTagName("script");
			var functionSrc = new Array(scripts.length);
			functionSrc.emptySlots = functionSrc.length;
			var scriptIndex = 0;
			while(scripts.length > 0){
				// If the src attribute is defined, get the source file
				if(scripts[0].src){
					var xhttp = new XMLHttpRequest();
					xhttp.index = scriptIndex;
					xhttp.srcPath = scripts[0].src;
					xhttp.onreadystatechange = function(){
						if(this.readyState == 4){
							// If the request is successful, load the source code into a function
							if(this.status == 200){
								functionSrc[this.index] = adjustNavigation(this.responseText);
								constructFunc();
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
				// Else, get the inline code
				}else{
					functionSrc[scriptIndex] = adjustNavigation(scripts[0].innerText);
					constructFunc();
				}
				scripts[0].parentNode.removeChild(scripts[0]);
				scriptIndex++;
			}
		}

		// Apply the style so that it is isolated to the given module
		function applyStyle(module){
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
							// If the " flag is false, push "{" to the stack
							if(!flags['"']){
								flags["{"].push("{");
							}
							flags["moduleName"] = true;
							break;
						case "}":
							// If the " flag is false, pop an element from the stack
							if(!flags['"']){
								flags["{"].pop();
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
						default:
							// If the moduleName flag is false and the current character is not whitespace or a comma, insert the module id
							if(!flags["moduleName"] && !styleSource[i].match(/(\s|,)/g)){
								styleSource = [styleSource.slice(0, i), "module[name=" + moduleName + "]", styleSource.slice(i)].join(" ");
								flags["moduleName"] = !flags["moduleName"];
							}
					}
				}
				// Remove "body" and "html" selectors and return
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
				// Check the cache for the style
				var cachedStyle = modularjs.cache[module.getAttribute("name")].style;
				// If the style was found in the cache, set the appliedStyle attribute and continue
				if(cachedStyle != undefined){
					module.setAttribute("appliedStyle", "");
					continue;
				// Else, initialize the style cache for the module
				}else{
					modularjs.cache[module.getAttribute("name")].style = "";
				}
				// If the src attribute is defined, get the source file
				if(styles[i].href){
					var xhttp = new XMLHttpRequest();
					xhttp.hrefPath = styles[i].src;
					xhttp.globalStyle = globalStyle;
					xhttp.moduleName = module.getAttribute("name");
					xhttp.onreadystatechange = function(){
						if(this.readyState == 4){
							// If the request is successful, add the source code to globalStyle and update the cache
							if(this.status == 200){
								var confinedStyle = confineStyle(this.responseText, this.moduleName);
								this.globalStyle.innerHTML += confinedStyle;
								modularjs.cache[this.moduleName].style += confinedStyle;
								module.setAttribute("appliedStyle", "");
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
					styles[i].parentNode.removeChild(styles[i]);
				// Else, get the inline code and update the cache
				}else{
					var confinedStyle = confineStyle(styles[i].innerHTML, module.getAttribute("name"));
					globalStyle.innerHTML += confinedStyle;
					modularjs.cache[module.getAttribute("name")].style += confinedStyle;
					module.setAttribute("appliedStyle", "");
				}
			}
		}

		// Apply a mutation observer to the supplied module
		function applyMutationObserver(shadowModule, module){
			var config = {
				"characterData" : true,
				"attributes" : true,
				"childList" : true,
				"subtree" : true
			};

			// Syncs the module with its corresponding shadowModule
			function callback(mutations){
				modularjs.syncModules(module);
			}

			var observer = new MutationObserver(callback);
			observer.observe(shadowModule, config);

			// Sync module for good measure
			modularjs.syncModules(module);
		}
	}
}

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
