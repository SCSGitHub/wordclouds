function go(){
	var username = "";
	username = $("#username").val();
	if(username.length > 0){
		return true;//$.post(url, username);
	}else{
		alert("Please enter your Mechanical Turk username.");
		return false;
	}
}