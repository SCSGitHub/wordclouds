//input data structures
var input_sentence = { sentence_id: 0, words:[]};
var input_senses;//=[
// 	{ word:"can",
	//senses:[
// 		{
// 			sense_number: 0,
// 			pos: "n",
// 			synonym_list: 
// 				[
// 					{word:"tent", sense:"tent.n.1", lemma:"tent"},
// 					{word:"camp", sense:"camp.v.1", lemma:"camp"},
// 				],
// 		},
// 		{
// 			sense_number: 1,
// 			pos: "n",
// 			synonym_list:
// 				[
// 					{word:"be", sense:"be.v.1", lemma:"be"},
// 					{word:"stand", sense:"stand.v.1", lemma:"stand"},
// 				],
// 		},
// 	]},	{ word:"entropy",
// 		  senses:[ //array of senses
// 		{
// 			sense_number: 0,
// 			pos: "n",
// 			synonym_list: 
// 				[
// 					{word:"chaos", sense:"chaos.n.1", lemma:"chaos"},
// 					{word:"disorder", sense:"disorder.n.1", lemma:"disorder"},
// 					{word:"diffusion", sense:"diffusion.n.1", lemma:"diffusion"},
// 				]
// 		},
// 		{
// 			sense_number: 1,
// 			pos: "n",
// 			synonym_list:
// 				[
// 					{word:"wrong sense", sense:"wrong_sense.n.1", lemma:"wrond_sense"},
// 					{word:"information", sense:"information.n.1", lemma:"information"},
// 				],
// 		},
// 	]},
// ];

var sentence = []; 
//output data structure:
var cloud = [ 
	// {
	// 	sentence_word:"sample word",
	// 	syn_list:
	// 		[ 
	// 			{word:"similar_word", sense:"similar_word.n.1", lemma:"lemma", abstraction_level: "concrete"},
	// 		]
	// },
];

var problem_id = 1; //get as an input
var score = 0; 

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
	$(entry_box).val('');
	score++;
	$("#score").html(score);
}

//function to load sentence
function loadSentence(){
	var original_template = $("#word_sentence_template").html();

	for (var i = 0; i<sentence.length; i++){
		var word_of_sentence = sentence[i];

		var li = $("#word_sentence_template").find("li");
		$(li).attr("word",word_of_sentence);
		var sentence_div = li.find(".word_column_div");
		$(sentence_div).attr("id", "word_sentence_"+i+"");
		$(sentence_div).find(".word_name").html(word_of_sentence);

		if(input_senses[i].senses.length==0){//no synonyms
			$(sentence_div).addClass("no_synonyms");
			$(sentence_div).find("div").hide();
		}else{
			//bins for synonym and abstract
			var add_button = $("#add_button_template").html();
			var concrete_list = sentence_div.find(".concrete");
			var abstract_list = sentence_div.find(".abstract");
			$(concrete_list).append(add_button);
			$(abstract_list).append(add_button);
		}
		
		var prepared_column = $("#word_sentence_template").html();
		
		$("#sentence").append(prepared_column);
		$('div[id=word_sentence_'+i+']').collapsible({

			expand: function(event){
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
			$(sense_div).find("h4").html("Sense "+(j+1)+"");
			//now add the sense to the list
			var new_sense = $("#word_sense_template").html();
			var target = $("#left-menu").find(".ui-collapsible-content");
			$(target[0]).append(new_sense);
			$('div[id=sense_'+j+']').collapsible();
			//reset the template
			$("#word_sense_template").html(original_template);
		}

		$(".sort").sortable({
			connectWith: '.word1',
			dropOnEmpty: true,
			stop: function( ev, ui) {
	            if($(ev.target).parents().eq(1).hasClass("sense_div") && $(ui.item).parents().eq(4).hasClass("word_column_div")){//added word
	            	score++;
	            	$("#score").html(score);
	            }else if($(ui.item).parents().eq(2).hasClass("sense_div") && $(ev.target).parents().eq(3).hasClass("word_column_div")){
	            	score--;
	            	$("#score").html(score);
	            }
	        },
	        beforeStop: function(ev, ui) { 
	            if ($(ui.item).hasClass('number') && $(ui.placeholder).parent()[0] != this) {
	                $(this).sortable('cancel');
	            }
		    },
		}).disableSelection();
	}catch(err){
		//no senses defined
	}
}

function submitCloud(){

	if(score<1){
		alert("your score is only "+score+"! You can do better than that");
		return;
	}else if(confirm("Your score is "+score+". You should aim for a score of at least 40. Are you done with your cloud?")) {
		//continue
	} else {
	    return;
	}

	//what do we need to do? 
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
	
	$.post(url, output, function(){
		alert("Your response has been recorded");
		//give code for payment
	})
		.fail(function(){
			alert("failed");
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
	return input_senses;//{sentence_id: 0, words: ["can", "entropy", "be", "reversed?"]};
}

function getSentenceFromInput(data){
	var input_sentence = { sentence_id: problem_id, words:[]};
	var words = data.words;
	for(var i=0; i<words.length; i++){
		word = words[i];
		input_sentence.words.push(word.surface_form);
	}
	sentence = input_sentence.words;
	return input_sentence;
}

function getSynonyms(problem_no){
	var url = 'http://scsweb-d11.andrew.cmu.edu:81/wordclouds/problem/'+problem_no;
	// $.get(url, function(data){
	// 	input_sentence = getSentenceFromInput(data);
	// 	input_senses = getSensesFromInput(data);
	// });
	$.ajax({
	     async: false,
	     type: 'GET',
	     url: url,
	     success: function(data) {
			input_sentence = getSentenceFromInput(data);
			input_senses = getSensesFromInput(data);
	     }
	});
}

$(document).ready(function() {
	cloud = [];
	problem_id=1;//**
	getSynonyms(problem_id);//get input data from api


	loadSenses(0);
	loadSentence();

	$(".sort").sortable({
		connectWith: '.word1',
		dropOnEmpty: true,
		stop: function( ev, ui) { //change score
	        if($(ev.target).parents().eq(1).hasClass("sense_div") && $(ui.item).parents().eq(4).hasClass("word_column_div")){//added word
	        	score++;
	        	$("#score").html(score);
	        }else if($(ui.item).parents().eq(2).hasClass("sense_div") && $(ev.target).parents().eq(3).hasClass("word_column_div")){
	        	score--;
	        	$("#score").html(score);
	        }
    	},
    	cancel: ".add_button",
	}).disableSelection();

});

//event handlers
$('body').on('click', '.ui-icon-delete', function(){
	$(this).parent().remove();
	score--;
	$("#score").html(score);
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

