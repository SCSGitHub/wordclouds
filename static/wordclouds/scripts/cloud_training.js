//input data structures
var input_sentence = getSentence(); 
var input_senses={
	"dog":{
		sense_number: 0,
		sense_type: "n",
		synonym_list: [ 
			[
				{word:"animal", sense:"animal.n.1", lemma:"animal"},
				{word:"Golden Retriever", sense:"Golden_Retriever.v.1", lemma:"Golden_Retriever"},
			],
		],
	},	
	"run":{
		sense_number: 1,
		sense_type: "v",
		synonym_list: [ 
			[
				{word:"go", sense:"go.n.1", lemma:"go"},
				{word:"jog", sense:"jog.n.1", lemma:"jog"},
				{word:"sprint", sense:"sprint.v.1", lemma:"sprint"},
				{word:"move", sense:"move.v.1", lemma:"move"},
			],
		],
	},
	"cook":{
		sense_number: 1,
		sense_type: "v",
		synonym_list: [ 
			[
				{word:"fry", sense:"fry.n.1", lemma:"fry", correct_abstraction:"concrete"},
				{word:"boil", sense:"boil.n.1", lemma:"boil", correct_abstraction:"concrete"},
				{word:"make", sense:"make.v.1", lemma:"make", correct_abstraction:"abstract"},
				{word:"bake", sense:"bake.v.1", lemma:"bake", correct_abstraction:"concrete"},
			],
		],
	},
};

var sentence = input_sentence.words;
//output data structure:
var cloud = [ 
	{
		sentence_word:"sample word",
		syn_list:
			[ 
				{word:"similar_word", sense:"similar_word.n.1", lemma:"lemma", abstraction_level: "concrete"},
			]
	},
];


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
}

function addWordManual(ul, word){
	var word_text = word;
	if(/\S/.test(word_text)==false){
		return; //don't enter empty words
	}
	var new_word_text = $("#word_item_template_ex").find("li").find(".word_text");
	new_word_text.html(word_text);
	new_word_text.parent().attr("sense","");//we don't know the sense and type
	new_word_text.parent().attr("lemma","");//we don't know the sense and type
	var new_word = $("#word_item_template_ex").html();
	ul.append(new_word);

	$('div[data-role=collapsible]').collapsible();
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

		//bins for synonym and abstract
		var concrete_list = sentence_div.find(".concrete");
		var abstract_list = sentence_div.find(".abstract");
		if(i>1){
			var add_button = $("#add_button_template").html();
			$(concrete_list).append(add_button);
			$(abstract_list).append(add_button);
		}else{
			$(concrete_list).removeClass("sort");//no drag/drop
			$(abstract_list).removeClass("sort");//no drag/drop

		}
		
		var prepared_column = $("#word_sentence_template").html();
		
		$("#sentence").append(prepared_column);
		$('div[id=word_sentence_'+i+']').collapsible({
			// expand: function(event){
			// 	var word = $(event.target).parent().attr("word");
			// 	loadSenses(word);
			// 	//collapse the other columns
			// 	var allColumns = $('.word_column_div');
			// 	for(var j=0; j<allColumns.length; j++){
			// 		var aColumn = allColumns[j];
			// 		if($(aColumn).attr("id")!=event.target.id ){
			// 			try{
			// 				$(aColumn).collapsible("collapse");
			// 			}catch(err){
			// 				//element doesnt exist yet. no problem
			// 			}
			// 		}
			// 	}
			//},
		});
		$('.collapsible3').collapsible({
			collapsed: false,
		});

		$("#word_sentence_template").html(original_template);//reset
		//also add it into the output structure
		var sentence_word = { sentence_word: word_of_sentence, syn_list: []};
		cloud.push(sentence_word);
	}


	//add words:
	var ul = $("#word_sentence_0").find(".concrete");
	addWordManual(ul, "Golden Retriever");
	ul = $("#word_sentence_0").find(".abstract");
	addWordManual(ul, "animal");
	ul = $("#word_sentence_1").find(".concrete");
	addWordManual(ul, "jog");
	addWordManual(ul, "spring");
	ul = $("#word_sentence_1").find(".abstract");
	addWordManual(ul, "move");
	addWordManual(ul, "go");
}

//function to load word sense (suggestion list):
function loadSenses(word_with_senses){

  	var original_template = $("#word_sense_template").html();
	var target = $("#left-menu").find(".ui-collapsible-content");
	$(target[0]).html("");

	try{
		var senses = input_senses[word_with_senses].synonym_list;
	  	for(var j=0; j<senses.length; j++){
			var sense = senses[j];
			var sense_div = $("#word_sense_template").find("div");
			var sense_list = sense_div.find("ul");
			for (var i=0; i<sense.length; i++){
				synonym = sense[i];
				var new_word_li = $("#word_item_template").find("li");
				var new_word_text = new_word_li.find(".word_text");
				new_word_text.html(synonym.word);
				new_word_li.attr("sense",synonym.sense);
				new_word_li.attr("lemma",synonym.lemma);
				var new_word = $(new_word_text).parent().parent().html();
				$(sense_list).append(new_word);
			}
			$(sense_div).attr("id", "sense_"+j+"");
			//$(sense_div).find("h4").html("Sense "+(j+1)+"");
			//now add the sense to the list
			var new_sense = $("#word_sense_template").html();
			var target = $("#left-menu").find(".ui-collapsible-content");
			$(target[0]).append(new_sense);
			$('div[id=sense_'+j+']').collapsible({});
			//reset the template
			$("#word_sense_template").html(original_template);
		}

		$(".sort").sortable({
			connectWith: '.word1',
			dropOnEmpty: true,
			beforeStop: function(ev, ui) {
	            // if ($(ui.item).hasClass('number') && $(ui.placeholder).parent()[0] != this) {
	            //     $(this).sortable('cancel');
	            // }
	            var lemma=ui.item.attr("lemma");
	            var group = ui.item.parent().attr("abstraction");
	            var word_object = $.grep(input_senses["cook"].synonym_list[0], function(e){ return e.lemma == lemma; });
	            var correct_group = word_object[0].correct_abstraction;
	            if(group != correct_group){
	            	$(this).sortable('cancel');
	            	alert("that's not the correct abstraction level. Try again");
	            }
	        },
		}).disableSelection();
	}catch(err){
		//no senses defined
	}

}

// function submitCloud(){
// 	//what do we need to do? 
// 	//for each word-object in cloud, fill in syn_list[] with each {word, sense, lemma}
// 	var words_array = $("#sentence").find(".word_column");

// 	for(var j = 0; j<words_array.length; j++){
// 		var cloud_column = {sentence_word: "", syn_list:[]};
// 		var column_li = words_array[j];
// 		var sentence_word_ = $(column_li).attr("word");
// 		cloud_column.sentence_word = sentence_word_;

// 		word_li_array = $("#word_sentence_"+j).find("li");
// 		for (var i=0; i<word_li_array.length; i++){ 
// 		//don't include the "add word" <li> element
// 			word_li = word_li_array[i];
// 			if(! $(word_li).hasClass("add_button")){
// 				word_ = $(word_li).find(".word_text").html();
// 				sense_ = $(word_li).attr("sense");
// 				lemma_ = $(word_li).attr("lemma"); //add this
// 				abstraction_level_ = $(word_li).parent().attr("abstraction");

// 				var word_to_add = {word:word_, sense:sense_, lemma:lemma_, abstraction_level:abstraction_level_};
// 				cloud_column.syn_list.push(word_to_add);	
// 			}			
// 		}
// 		cloud[j]=cloud_column;
// 	}
// 	console.log(cloud);
// 	alert("Your response has been recorded");
// }

function next(){
	if($("#sense_0").find("li").length==0){
		alert("you may continue");
	}else{
		console.log("not done");
	}
}

function getSentence(){
	//get sentence for api
	return {sentence_id: 0, user_id: 0, words: ["dog", "run", "cook"]};

}

function getSynonyms(){
	var url = 'http://scsweb-d11.andrew.cmu.edu:81/wordclouds/synonyms/entropy.n.02';

	$.get(url, function(data){
		entropy_response = data;
	});
}

window.onload = $(function() {
	cloud = [];
	loadSentence();
	loadSenses(input_sentence.words[2]);

	$(".sort").sortable({
		cancel: ".add_button",
		connectWith: '.word1',
		dropOnEmpty: true,
	}).disableSelection();

});

//event handlers
$('body').on('click', '.ui-icon-delete', function(){
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

