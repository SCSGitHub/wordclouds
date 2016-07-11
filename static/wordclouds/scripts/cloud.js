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
var problem_id = 2; //get as an input
var score = 0; 
var min_score = 1;
var completion_code = getRandomInt(0,10000000);

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
			$(sense_div).find("h4").html((j+1)+": " +sense.synonym_list[0].word);
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
	            	score++;
	            	$("#score").html(score);
	            }else if($(ui.item).parents().eq(2).hasClass("sense_div") && $(ev.target).parents().eq(3).hasClass("word_column_div")){
	            	score--;
	            	$("#score").html(score);
	            }
	        },
		}).disableSelection();
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
	var url = '../submit';
	$.post(url, output, function(data){
		completion_code = data;
		alert("Your response has been recorded. Your completion code is "+completion_code);
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
	return input_sentence;
}

function getSynonyms(problem_no){
	var url = 'http://scsweb-d11.andrew.cmu.edu:81/wordclouds/problem/'+problem_no;
	// $.get(url, function(data){
	// 	input_sentence = getSentenceFromInput(data);
	// 	input_senses = getSensesFromInput(data);
	// }); 
	//using ajax synchronous because it needs to load before dom elements (maybe there's a better way)
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

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

$(document).ready(function() {
	cloud = [];
	getSynonyms(problem_id);//get input data from api

	loadSenses(0); //display suggestions for the first word
	loadSentence();

	$(".sort").sortable({
		cancel: ".add_button",
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
	}).disableSelection();

	$('#instructions').collapsible({
		collapse: function(ev, ui){
	        var $btn_text  = $(ev.target).find('.ui-btn');
	        $btn_child = $btn_text.find('.ui-collapsible-heading-status');
	        $btn_text.text('Instructions (Click to expand)').append($btn_child);
		},
		expand: function(ev, ui){
	        var $btn_text  = $(ev.target).find('.ui-btn');
	        $btn_child = $btn_text.find('.ui-collapsible-heading-status');
        	$btn_text.text('Instructions (Click to collapse)').append($btn_child);
		},

	});

});


//event handlers
$('body').on('click', '.ui-icon-delete', function(){
	if(! ($(this).parents().eq(3).hasClass("sense_div"))){
		score--;
		$("#score").html(score);
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

// $(document).on("scroll", function(e) {
// 	var hidden_on_top = $(window).scrollTop();
// 	var $el = $('.active_word'); //active word 
// 	if($el.length==0){
// 		//alert("no item found");
// 		return;
// 	}
// 	var bottom = $el.offset().top + $el.outerHeight(true);

// 	var near_bottom, scrolled_past_bin;
// 	if( $(document).height() - $(window).scrollTop() - $(window).height() < $("#foot").height()){
// 		near_bottom=true;
// 	}
// 	if(hidden_on_top>bottom ){
// 		scrolled_past_bin=true;
// 	}
// 	if(scrolled_past_bin && !near_bottom){
// 		$('#word_bin').show();
// 	}else{
// 		$('#word_bin').hide();
// 	}
// });

// $(window).mousemove(function (e) {
//     var x = $(window).innerHeight() - 50,
//         y = $(window).scrollTop() + 50;
//     if ($('.im_being_dragged').length>0){
// 	    if ($('.im_being_dragged').offset().top > x) {
// 	        //Down
// 	        $('html, body').animate({
// 	            scrollTop: 300 // adjust number of px to scroll down
// 	        }, 600);
// 	    }
// 	    if ($('.im_being_dragged').offset().top < y) {
// 	        //Up
// 	        $('html, body').animate({
// 	            scrollTop: 0
// 	        }, 600);
// 	    } else {
// 	        $('html, body').animate({

// 	        });
// 	    }
// 	}
// });
