//global data structures
//input information
var input_sentence = { sentence_id: 0, words:[]};
var input_senses;
//[
// 	{ word:"can",
//		senses:[
// 		{
// 			sense_number: 0,
// 			pos: "n",
// 			synonym_list:
// 				[
// 					{word:"tent", sense:"tent.n.1", lemma:"tent"},
// 					{word:"camp", sense:"camp.v.1", lemma:"camp"},
// 				],
// 		},
// 	]},
// ];
var sentence = [];
var word_scores = {};
var full_sentence = "";

//output data structure:
var cloud = [];
	//[ {
	// 	sentence_word:"sample word",
	// 	syn_list:
	// 		[
	// 			{word:"similar_word", sense:"similar_word.n.1", lemma:"lemma", abstraction_level: "concrete"},
	// 		]
	// },]

//global variables
//var problem_id = 2;//getRandomInt(1,5); //get as an input
var score = 0;
var min_score = 40;
var target_score = 40;
var min_per_word = 3;
var completion_code = 0;

//helper functions

/*
	Adds a word to a term's abstract or concrete bin
		-fills in the components of the word_item_template
		-it inserts the element into the word bin

	Called when user enters a word in the input field and:
		Clicks plus sign
		Hits Enter

	Does not add the word if:
		the text field is blank 
		the word is the same as the extraction term

	Parameters: 
		me: the 'submit' button (plus sign) that is clicked to add the word
*/
function addWord(me){
	var word_list_end = $(me).parent(); //this is where we will insert the new word element
	var entry_box = $(me).parent().find('a').find('input')
	var word_text = entry_box.val();
	if(/\S/.test(word_text)==false || word_text==$(me).parents().find(".word_column").attr("word")){
		$(entry_box).val('');
		return; //don't enter empty words or the same word
	}
	var new_word_text = $("#word_item_template").find("li").find(".word_text");
	new_word_text.html(word_text);
	//we don't know the word-sense or part of speech for user's own words
	new_word_text.parent().attr("sense","");
	new_word_text.parent().attr("lemma","");
	var new_word = $("#word_item_template").html();
	word_list_end.before(new_word); //insert the element
	$('div[data-role=collapsible]').collapsible(); //re-create the collapsible functionality

	//update word- and net- score
	var word_div = $(me).parents().eq(5);
	updateWordScore(word_div, 1);

	//reset the text of the add-word entry box
	$(entry_box).val('');
}

/*
	keep track of how many synonyms are in each term's bins
	also track total number of synonyms in the cloud

	Parameters:
		word_div: the HTML element of the term which has gained/lost a word
		change: +1 for adding a word, -1 for losing a word

	Changes the values of global variables word_score[] and score
*/
function updateWordScore(word_div, change){
	var word = $(word_div).parent().attr("word");
	var word_score = word_scores[word] + change;
	word_scores[word]= word_score;
	var title = $(word_div).find("h4 a").eq(0);
	title.text("("+word_score+") "+word);
	//console.log("Words: "+word_score);
	//update total score
	score = score + change;
	$("#score").html(score);
}

/*
	Load the terms of a selected problem extraction into the customization pane
		for each term in the problem extraction:
			- fills in the componenets of word_sentence_template element 
				(has genera/specific word bins)
			- adds an 'add word' input field to the word_sentence_div
			- inserts the term in the HTML document
			- adds jquery.collapsible functionality
			- resets the word_sentence_template to a blank template
			- adds the term to the output 'cloud' data structure

	Special Cases:
		if the term is a 'stop-word', it is grey and cannot recieve synonyms
*/
function loadSentence(){
	var original_template = $("#word_sentence_template").html();
	$("#sentence_text").html("\""+full_sentence+"\"");

	//word scores:
	min_score = sentence.length > 5 ? 40 : 8*sentence.length;
	target_score = min_score;

	for (var i = 0; i<sentence.length; i++){ //for each term in the problem extraction:
		var word_of_sentence = sentence[i];
		word_scores[word_of_sentence]=0; //reset 

		var li = $("#word_sentence_template").find("li");
		$(li).attr("word",word_of_sentence);
		var sentence_div = li.find(".word_column_div");
		$(sentence_div).attr("id", "word_sentence_"+i+"");

		if(isStopWord(word_of_sentence)){//stop word. gray-out, no synonyms
			$(sentence_div).addClass("no_synonyms");
			$(sentence_div).find("div").hide();
			$(sentence_div).find(".word_name").html(word_of_sentence);
		}else{
			//bins for synonym and abstract
			var add_button = $("#add_button_template").html();
			var concrete_list = sentence_div.find(".concrete");
			var abstract_list = sentence_div.find(".abstract");
			$(concrete_list).append(add_button);
			$(abstract_list).append(add_button);
			$(sentence_div).find(".word_name").html("(0) "+word_of_sentence);
		}

		var prepared_column = $("#word_sentence_template").html();

		$("#sentence").append(prepared_column);
		$('div[id=word_sentence_'+i+']').collapsible({

			 /*
				when a word is clicked: 
					the word's suggested synonyms are loaded in the Word Bank
					All other terms' bins should be collapsed
					Add the class "active_word" to identify the word in focus
			*/
			expand: function(event, ui){
				$(event.target).addClass("active_word");
				var word = $(event.target).parent().attr("word");
				var wordNumber = sentence.findIndex(function(val){return (val==word)});
				loadSenses(wordNumber);
				//collapse the other columns
				var allColumns = $('.word_column_div');
				for(var j=0; j<allColumns.length; j++){
					var aColumn = allColumns[j];
					if($(aColumn).attr("id")!=event.target.id ){
						try{
							$(aColumn).collapsible("collapse");
						}catch(err){
							//element doesnt exist yet. no problem
						}
					}
				}
			},
			collapse: function(event, ui){
				$(event.target).removeClass("active_word");
			},
		});
		$('.collapsible3').collapsible({
			collapsed: false,
		});
		//stop words (have class no_synonyms) are not collapsible
		$('.no_synonyms').collapsible('disable');
		//on initialization, expand the first term
		$("#word_sentence_0").collapsible('expand');

		$("#word_sentence_template").html(original_template);//reset template
		
		//also add the term into the output structure
		var sentence_word = { sentence_word: word_of_sentence, syn_list: []};
		cloud.push(sentence_word);
	}
}

/*
	Load the suggested synonyms for a term into the Word Bank
		- look in the input_senses data structure for the term's synonyms
		For each word-sense in input_senses:
			- create a word_sense_div to hold its synonyms 
			For each synonym in the word-sense:
				- add the synonym to word_sense_div
			- append the word_sense_div to the Word Bank
			- add jquery.sortable functionality

	Special Cases:
		synonym is same as term: do not include
		word-sense does not have any synonyms: do not include

	Parameters:
		word_number: the 0-indexed position of the word in sentence[]
			(sentence[] is an array of the terms in the problem extraction)

*/
function loadSenses(word_number){

  	var original_template = $("#word_sense_template").html();
	var target = $("#left-menu").find(".ui-collapsible-content");
	$(target[0]).html("");
	var this_word = sentence[word_number];

	try{
		var senses = input_senses[word_number].senses;

		if(senses.length<1){
			$(target).html("No suggestions available")
			return;
		}
	  	for(var j=0; j<senses.length; j++){
			var sense = senses[j];
			var sense_div = $("#word_sense_template").find("div");
			var sense_list = sense_div.find("ul");

			for (var i=0; i<sense.synonym_list.length; i++){ //each synonym:
				synonym = sense.synonym_list[i];
				if(synonym.word == this_word){
					continue;
				}
				//fill in the word_item_template element
				var new_word_li = $("#word_item_template").find("li");
				var new_word_text = new_word_li.find(".word_text");
				new_word_text.html(synonym.word);
				new_word_li.attr("sense",synonym.sense);
				new_word_li.attr("lemma",synonym.lemma);
				var new_word = $(new_word_text).parent().parent().html();
				$(sense_list).append(new_word);
			}
			if($(sense_list).find("li").length<1){
				continue; //don't include senses with 0 synonyms
			}
			$(sense_div).attr("id", "sense_"+j+""); //id is sense_0, sense_1 etc
			$(sense_div).find("h4").html((j+1)+": \"" +sense.synonym_list[0].word +"\"");
			//now add the sense to the Word Bank
			var new_sense = $("#word_sense_template").html();
			var target = $("#left-menu").find(".ui-collapsible-content");
			$(target[0]).append(new_sense);
			$('div[id=sense_'+j+']').collapsible(); //add jquery.collapsible functionality
			$("#word_sense_template").html(original_template); //reset template
		}

		$(".sort").sortable({ //add juqery.sortable (drag and drop lists) functionality
			cancel: ".add_button",
			connectWith: '.word1',
			dropOnEmpty: true,
			stop: function( ev, ui) {
	            if($(ev.target).parents().eq(1).hasClass("sense_div") && $(ui.item).parents().eq(4).hasClass("word_column_div")){//added word
	            	updateWordScore($(ui.item).parents().eq(4), 1);
	            }else if($(ui.item).parents().eq(2).hasClass("sense_div") && $(ev.target).parents().eq(3).hasClass("word_column_div")){
	            	updateWordScore($(ev.target).parents().eq(3), -1);
	            }
	        },
		});
	}catch(err){
		//no senses defined. its ok, don't do anything
	}
}

/*
	Send cloud to the database and forward user to the completion code
		- check that the user has the required number of synonyms (total and per-word)
		- aggregate the data from the html page into an output cloud data structure
		- send results to the server
		- server redirects to the completion page

	Special cases: 
		- user does not have enough synonyms: alert message, don't send cloud to server

*/
function submitCloud(){
	//check if they've scored enough synonyms on each word and in total
	if(score<min_score){
		alert("your score is only "+score+"! You need to enter at least "+min_score+" words.");
		return;
	}else if(min_word_score()<min_per_word){
		alert("you must score at least 3 synonyms for each word that isn't grayed out");
		return;
	}else if(score<target_score){
		if(confirm("Your score is "+score+". You should aim for a score of at least "+target_score+". Are you done with your cloud?")) {
		} else {
		    return;
		}
	}else{
		//continue
	}
	//create output:
	//for each word-object in cloud, fill in syn_list[] with each {word, sense, lemma}
	var words_array = $("#sentence").find(".word_column");
	for(var j = 0; j<words_array.length; j++){
		var cloud_column = {sentence_word: "", syn_list:[]};
		var column_li = words_array[j];
		var sentence_word_ = $(column_li).attr("word");
		cloud_column.sentence_word = sentence_word_;

		word_li_array = $("#word_sentence_"+j).find("li");
		for (var i=0; i<word_li_array.length; i++){
			word_li = word_li_array[i];
			if(! $(word_li).hasClass("add_button")){
				word_ = $(word_li).find(".word_text").html();
				sense_ = $(word_li).attr("sense");
				lemma_ = $(word_li).attr("lemma"); //add this
				abstraction_level_ = $(word_li).parent().attr("abstraction");

				var word_to_add = {word:word_, sense:sense_, lemma:lemma_, abstraction_level:abstraction_level_};
				cloud_column.syn_list.push(word_to_add);
			}
		}
		cloud[j]=cloud_column;
	}
	console.log(cloud);
	var output = {problem_id: problem_id, cloud: cloud}; //to send to the back-end
	var output_str = JSON.stringify(output);
	var form = document.getElementById("cloud_form");
	var cd_elem = form.elements["cloud_data"]
	cd_elem.value = output_str;

	if(cd_elem.value.length > 0) {
		form.submit();
	}
	//There should be something here to paste output_str into a visible
	//div for the user. For copy and paste into an email if something is wrong.
	else { alert("No cloud data was submitted!"); }
}

/*
	Take the data supplied by the server and re-structure it into the format of input_senses

	Parameters: 
		data: problem and WordNet data from server
*/
function getSensesFromInput(data){
	input_senses = [];
	var words = data.words;
	for(var i=0; i<words.length; i++){
		word = words[i];
		input_senses[i]={word: word.surface_form, senses: []};
		var senses = words[i].senses;
		for(var j=0; j<senses.length; j++){
			var sense = senses[j];
			var new_sense =
			{
				sense_number: sense.sense_number,
				pos: sense.pos,
				synonym_list: [],
			};
			var synonyms=[];
			var brothers = sense.brothers;
			for(var k=0; k<brothers.length; k++){ //add brothers of word
				new_sense.synonym_list.push( { word: brothers[k], sense: sense.sense, lemma: brothers[k] } );
			}
			var hypernyms = sense.hypernyms;
			for(var l=0; l<hypernyms.length; l++){
				var brothers = hypernyms[l].brothers;
				for(var m=0; m<brothers.length; m++){ //add brothers of hypernyms
					new_sense.synonym_list.push( { word: brothers[m], sense: hypernyms[l].sense, lemma: brothers[m] } );
				}
			}
			input_senses[i].senses.push(new_sense);
		}
	}
	return input_senses;
}

/*
	Take the data supplied by the server and get the problem extraction

	Parameters: 
		data: problem and WordNet data from server
*/
function getSentenceFromInput(data){
	var input_sentence = { sentence_id: problem_id, words:[]};
	var words = data.words;
	for(var i=0; i<words.length; i++){
		word = words[i];
		input_sentence.words.push(word.surface_form);
	}
	sentence = input_sentence.words; //store just the word-strings in an array for easy access
	var realWords = sentence.length;
	for (s of sentence){
		if(isStopWord(s)){realWords=realWords-1;}
	}
	//minimum total score is 8*number of words, up to a max of 40
	//(stop-words are not included in the length number of words)
	min_score = realWords < 5 ? realWords * 8 : min_score;
	target_score = min_score;
	full_sentence = data.desc;
	return input_sentence;
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

var stopwords = ["a", "about", "above", "above", "across", "after", "afterwards", "again", "against", "all", "almost", "alone", "along", "already", "also","although","always","am","among", "amongst", "amoungst", "amount",  "an", "and", "another", "any","anyhow","anyone","anything","anyway", "anywhere", "are", "around", "as",  "at", "back","be","became", "because","become","becomes", "becoming", "been", "before", "beforehand", "behind", "being", "below", "beside", "besides", "between", "beyond", "bill", "both", "bottom","but", "by", "call", "can", "cannot", "cant", "co", "con", "could", "couldnt", "cry", "de", "describe", "detail", "do", "done", "down", "due", "during", "each", "eg", "eight", "either", "eleven","else", "elsewhere", "empty", "enough", "etc", "even", "ever", "every", "everyone", "everything", "everywhere", "except", "few", "fifteen", "fify", "fill", "find", "fire", "first", "five", "for", "former", "formerly", "forty", "found", "four", "from", "front", "full", "further", "get", "give", "go", "had", "has", "hasnt", "have", "he", "hence", "her", "here", "hereafter", "hereby", "herein", "hereupon", "hers", "herself", "him", "himself", "his", "how", "however", "hundred", "ie", "if", "in", "inc", "indeed", "interest", "into", "is", "it", "its", "itself", "keep", "last", "latter", "latterly", "least", "less", "ltd", "made", "many", "may", "me", "meanwhile", "might", "mill", "mine", "more", "moreover", "most", "mostly", "move", "much", "must", "my", "myself", "name", "namely", "neither", "never", "nevertheless", "next", "nine", "no", "nobody", "none", "noone", "nor", "not", "nothing", "now", "nowhere", "of", "off", "often", "on", "once", "one", "only", "onto", "or", "other", "others", "otherwise", "our", "ours", "ourselves", "out", "over", "own","part", "per", "perhaps", "please", "put", "rather", "re", "same", "see", "seem", "seemed", "seeming", "seems", "serious", "several", "she", "should", "show", "side", "since", "sincere", "six", "sixty", "so", "some", "somehow", "someone", "something", "sometime", "sometimes", "somewhere", "still", "such", "system", "take", "ten", "than", "that", "the", "their", "them", "themselves", "then", "thence", "there", "thereafter", "thereby", "therefore", "therein", "thereupon", "these", "they", "thickv", "thin", "third", "this", "those", "though", "three", "through", "throughout", "thru", "thus", "to", "together", "too", "top", "toward", "towards", "twelve", "twenty", "two", "un", "under", "until", "up", "upon", "us", "very", "via", "was", "we", "well", "were", "what", "whatever", "when", "whence", "whenever", "where", "whereafter", "whereas", "whereby", "wherein", "whereupon", "wherever", "whether", "which", "while", "whither", "who", "whoever", "whole", "whom", "whose", "why", "will", "with", "within", "without", "would", "yet", "you", "your", "yours", "yourself", "yourselves", "the"];
function isStopWord(word) {
    return stopwords.indexOf(word.toLowerCase()) > -1;
}

function min_word_score(){ //what is the score of the term with the least # of synonyms?
	var min_word_score = 99999999;
	var words = Object.getOwnPropertyNames(word_scores);
	for (var i=0; i<words.length; i++){
		if(!isStopWord(words[i]) && word_scores[words[i]]<min_word_score){
			min_word_score = word_scores[words[i]];
			console.log("Min score:" +min_word_score);
		}
	}
	return min_word_score;
}

$(document).ready(function() {
	cloud = [];
	//get the problem sentence and word senses (synonyms) from JSON in template
	input_sentence = getSentenceFromInput(problem_data);
	input_senses = getSensesFromInput(problem_data);

	loadSenses(0); //display suggestions for the first word
	loadSentence(); //insert word-bins for each word in the problem extraction

	$(".sort").sortable({ //jquery.sortable allows drag-and-drop list elements
		cancel: ".add_button",
		connectWith: '.word1',
		dropOnEmpty: true,
		stop: function( ev, ui) { //change score
	        if($(ev.target).parents().eq(1).hasClass("sense_div") && $(ui.item).parents().eq(4).hasClass("word_column_div")){//added word
	        	updateWordScore($(ui.item).parents().eq(4), 1);
	        }else if($(ui.item).parents().eq(2).hasClass("sense_div") && $(ev.target).parents().eq(3).hasClass("word_column_div")){
	        	updateWordScore($(ev.target).parents().eq(3), -1);
	        }
    	},
	});

	$('#instructions, #abstract').collapsible({
		collapse: function(ev, ui){
			var title = $(ev.target).attr("title");
	        var $btn_text  = $(ev.target).find('.ui-btn');
	        $btn_child = $btn_text.find('.ui-collapsible-heading-status');
	        $btn_text.text(title + ' (Click to expand)').append($btn_child);
		},
		expand: function(ev, ui){
			var title = $(ev.target).attr("title");
	        var $btn_text  = $(ev.target).find('.ui-btn');
	        $btn_child = $btn_text.find('.ui-collapsible-heading-status');
	        $btn_text.text(title + ' (Click to collapse)').append($btn_child);
		},

	});

});

//event handlers

//Delete Button next to word: remove word element from list
$('body').on('click', '.ui-icon-delete', function(){
	if(! ($(this).parents().eq(3).hasClass("sense_div"))){
		updateWordScore($(this).parents().eq(5),-1);
	}
	$(this).parent().remove();
});
//Add word (+) button: add the word in the input field
$('body').on('click', '.new-word', function(){
	addWord(this);
});
//Hitting enter after typing word should also add the word 
$('body').on('keyup', '.add-word-input', function (e) {
	if (e.keyCode == 13) { //'Enter' key
		var enter_button = $(this).parent().parent().parent().find(".new-word");
		addWord(enter_button);
	}
});
//scroll to the div with the paper's abstract, and expand it
$('#to_abstract').on('click', function(){
	//console.log("scroll");
	$('html, body').animate({
        scrollTop: $("#abstract").offset().top
    }, 1000);
	$( "#abstract" ).collapsible( "expand" );
});