var hello = "Hello, world!";
function helloWorld(){
	var h1 = document.getElementsByTagName("h1")[0];
	if(h1.style.color != "red"){
		h1.style = "color:red;";
	}else{
		h1.style = "color:black;";
	}
}
