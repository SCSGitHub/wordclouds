/*
	User enters username and proceeds to cloud interface
	Username is stored in session and on backend
*/
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