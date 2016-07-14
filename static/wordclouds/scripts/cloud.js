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
var min_score = 1;
var completion_code = 0;

//helper functions
function addWord(me){
	var word_list_end = $(me).parent();
	var entry_box = $(me).parent().find('a').find('input')
	var word_text = entry_box.val();
	if(/\S/.test(word_text)==false){
		return; //don't enter empty words
	}
	var new_word_text = $("#word_item_template").find("li").find(".word_text");
	new_word_text.html(word_text);
	new_word_text.parent().attr("sense","");//we don't know the sense and type
	new_word_text.parent().attr("lemma","");//we don't know the sense and type
	var new_word = $("#word_item_template").html();
	word_list_end.before(new_word);

	$('div[data-role=collapsible]').collapsible();

	//update word and net score
	var word_div = $(me).parents().eq(5);
	updateWordScore(word_div, 1);

	$(entry_box).val('');
}

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

//function to load sentence
function loadSentence(){
	var original_template = $("#word_sentence_template").html();
	$("#sentence_text").html("\""+full_sentence+"\"");

	for (var i = 0; i<sentence.length; i++){
		var word_of_sentence = sentence[i];
		word_scores[word_of_sentence]=0;

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
		$('.no_synonyms').collapsible('disable');
		$("#word_sentence_0").collapsible('expand');

		$("#word_sentence_template").html(original_template);//reset
		//also add it into the output structure
		var sentence_word = { sentence_word: word_of_sentence, syn_list: []};
		cloud.push(sentence_word);
	}
}

//function to load word sense (suggestion list):
function loadSenses(word_number){

  	var original_template = $("#word_sense_template").html();
	var target = $("#left-menu").find(".ui-collapsible-content");
	$(target[0]).html("");

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

			for (var i=0; i<sense.synonym_list.length; i++){
				synonym = sense.synonym_list[i];
				var new_word_li = $("#word_item_template").find("li");
				var new_word_text = new_word_li.find(".word_text");
				new_word_text.html(synonym.word);
				new_word_li.attr("sense",synonym.sense);
				new_word_li.attr("lemma",synonym.lemma);
				var new_word = $(new_word_text).parent().parent().html();
				$(sense_list).append(new_word);
			}
			$(sense_div).attr("id", "sense_"+j+"");
			$(sense_div).find("h4").html((j+1)+": \"" +sense.synonym_list[0].word +"\"");
			//now add the sense to the list
			var new_sense = $("#word_sense_template").html();
			var target = $("#left-menu").find(".ui-collapsible-content");
			$(target[0]).append(new_sense);
			$('div[id=sense_'+j+']').collapsible();
			//reset the template
			$("#word_sense_template").html(original_template);
		}

		$(".sort").sortable({
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
		});//.disableSelection();
	}catch(err){
		//no senses defined. its ok
	}
}
function submitCloud(){

	if(score<min_score){
		alert("your score is only "+score+"! You need to enter at least "+min_score+" words.");
		return;
	}else if(confirm("Your score is "+score+". You should aim for a score of at least 40. Are you done with your cloud?")) {
		//continue
	} else {
	    return;
	}
	//for each word-object in cloud, fill in syn_list[] with each {word, sense, lemma}
	var words_array = $("#sentence").find(".word_column");
	for(var j = 0; j<words_array.length; j++){
		var cloud_column = {sentence_word: "", syn_list:[]};
		var column_li = words_array[j];
		var sentence_word_ = $(column_li).attr("word");
		cloud_column.sentence_word = sentence_word_;

		word_li_array = $("#word_sentence_"+j).find("li");
		for (var i=0; i<word_li_array.length; i++){ 
		//don't include the "add word" <li> element
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
	var output = {problem_id: problem_id, cloud: cloud};
	var output_str = JSON.stringify(output);

	$.post(url_submit, {cloud_data: output_str}, function(response){
		console.log("response: "+response);
		if (response == "ok" ){
			window.location.replace(url_completed);
		}else{
			alert("No user logged in");
		}
	});

}

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

function getSentenceFromInput(data){
	var input_sentence = { sentence_id: problem_id, words:[]};
	var words = data.words;
	for(var i=0; i<words.length; i++){
		word = words[i];
		input_sentence.words.push(word.surface_form);
	}
	sentence = input_sentence.words; //store just the word-strings in an array for easy access
	full_sentence = data.desc;
	return input_sentence;
}

function getSynonyms(url_problem){
	//using ajax synchronous because it needs to load before dom elements (maybe there's a better way)
	$.ajax({
	     async: false,
	     type: 'GET',
	     url: url_problem,
	     success: function(data) {
			input_sentence = getSentenceFromInput(data);
			input_senses = getSensesFromInput(data);
	     }
	});
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

$(document).ready(function() {
	cloud = [];
	getSynonyms(url_problem);//get input data from api

	loadSenses(0); //display suggestions for the first word
	loadSentence();

	$(".sort").sortable({
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
	});//.disableSelection();

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

var stopwords = ["a", "about", "above", "above", "across", "after", "afterwards", "again", "against", "all", "almost", "alone", "along", "already", "also","although","always","am","among", "amongst", "amoungst", "amount",  "an", "and", "another", "any","anyhow","anyone","anything","anyway", "anywhere", "are", "around", "as",  "at", "back","be","became", "because","become","becomes", "becoming", "been", "before", "beforehand", "behind", "being", "below", "beside", "besides", "between", "beyond", "bill", "both", "bottom","but", "by", "call", "can", "cannot", "cant", "co", "con", "could", "couldnt", "cry", "de", "describe", "detail", "do", "done", "down", "due", "during", "each", "eg", "eight", "either", "eleven","else", "elsewhere", "empty", "enough", "etc", "even", "ever", "every", "everyone", "everything", "everywhere", "except", "few", "fifteen", "fify", "fill", "find", "fire", "first", "five", "for", "former", "formerly", "forty", "found", "four", "from", "front", "full", "further", "get", "give", "go", "had", "has", "hasnt", "have", "he", "hence", "her", "here", "hereafter", "hereby", "herein", "hereupon", "hers", "herself", "him", "himself", "his", "how", "however", "hundred", "ie", "if", "in", "inc", "indeed", "interest", "into", "is", "it", "its", "itself", "keep", "last", "latter", "latterly", "least", "less", "ltd", "made", "many", "may", "me", "meanwhile", "might", "mill", "mine", "more", "moreover", "most", "mostly", "move", "much", "must", "my", "myself", "name", "namely", "neither", "never", "nevertheless", "next", "nine", "no", "nobody", "none", "noone", "nor", "not", "nothing", "now", "nowhere", "of", "off", "often", "on", "once", "one", "only", "onto", "or", "other", "others", "otherwise", "our", "ours", "ourselves", "out", "over", "own","part", "per", "perhaps", "please", "put", "rather", "re", "same", "see", "seem", "seemed", "seeming", "seems", "serious", "several", "she", "should", "show", "side", "since", "sincere", "six", "sixty", "so", "some", "somehow", "someone", "something", "sometime", "sometimes", "somewhere", "still", "such", "system", "take", "ten", "than", "that", "the", "their", "them", "themselves", "then", "thence", "there", "thereafter", "thereby", "therefore", "therein", "thereupon", "these", "they", "thickv", "thin", "third", "this", "those", "though", "three", "through", "throughout", "thru", "thus", "to", "together", "too", "top", "toward", "towards", "twelve", "twenty", "two", "un", "under", "until", "up", "upon", "us", "very", "via", "was", "we", "well", "were", "what", "whatever", "when", "whence", "whenever", "where", "whereafter", "whereas", "whereby", "wherein", "whereupon", "wherever", "whether", "which", "while", "whither", "who", "whoever", "whole", "whom", "whose", "why", "will", "with", "within", "without", "would", "yet", "you", "your", "yours", "yourself", "yourselves", "the"];
function isStopWord(word) {
    return stopwords.indexOf(word.toLowerCase()) > -1;
}

//event handlers
$('body').on('click', '.ui-icon-delete', function(){
	if(! ($(this).parents().eq(3).hasClass("sense_div"))){
		updateWordScore($(this).parents().eq(5),-1);
	}
	$(this).parent().remove();
});
$('body').on('click', '.new-word', function(){
	addWord(this);
});
$('body').on('keyup', '.add-word-input', function (e) {
	if (e.keyCode == 13) {
		var enter_button = $(this).parent().parent().parent().find(".new-word");
		addWord(enter_button);
	}
});
$('#to_abstract').on('click', function(){
	console.log("scroll");
	$('html, body').animate({
        scrollTop: $("#abstract").offset().top
    }, 1000);
	$( "#abstract" ).collapsible( "expand" );
});
