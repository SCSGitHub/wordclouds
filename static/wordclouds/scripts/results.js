var data = data3; //contained in a separate file /data3.js

var myPaper = {};
var myCustomPaper = {};
var currentRelatedPapers = [];

var favorite_papers = [];

//scoring papers
var score_mode = "dumbo";
var tfidf_scores = {};
var lsi_scores = {};
var lsi_dimensions = 100;
var connection_scores = {};
var highest_score = 0;
var entropy_strength = 0; //0-1, 1 is 100%
var parallel_preference_scoring_weight = 0; //0-1, 1 is 100%

var paper_order_number = 1;

//for debugging and extraction:
var all_papers = [];
var all_connections = [], cutoff_score = 0.05;

$(document).ready(function(){

	//find all the connections for all papers (is it expensive?)
	//console.log("number of papers: "+data.length);

	for (paper of data){
		//	if(paper != data[0]){break;}//just get the first one, for DEBUGGING only
		filterAbstractWords(paper);
		rs = getSimilarPapers(paper);
		paper.highest_score = highest_score;

		all_papers.push({id:paper.id, extraction: paper.extraction });
	}

	data.sort(function(a,b){
		return b.highest_score - a.highest_score;
	});
	var problems_by_top_score="";
	for (paper of data){
		$("#dropdown").append("<option value="+paper.extraction+" paperid="+paper.id+"> "+ " ("+paper.highest_score+") " + paper.extraction +"</option>");
		problems_by_top_score = problems_by_top_score.concat(paper.highest_score.toString() + " : "+paper.id+" : "+paper.extraction + "<br>");
	}
	$("#problems_by_top_score").html(problems_by_top_score);
	myPaper = copy({}, data[0]);
	myCustomPaper = copy({}, myPaper);

});

function addWordsOfSentence(myPaper){
	var template = $("#word_table_template");
	$("#sentence_list").html("");
	myPaper.terms.forEach(function(term){
		thisWord = term.term;
		var template_reset = $("#word_table_template").html();
		$(template).find("li").attr("word",thisWord);
		$(template).find(".t_word").html(thisWord);
		var synonyms = "";
		term.synonyms.sort(function(a,b){
			return a.synonym.localeCompare(b.synonym);
		})
		for(var i=0; i<term.synonyms.length; i++){ //add all synonyms
			synonyms+= term.synonyms[i].synonym+", ";
		}
		$(template).find(".edit").html(synonyms);

		$("#sentence_list").append(template.html());
		$(template).html(template_reset);
	});
}


function getSimilarPapers(thisPaper){
	var results = [];

	highest_score = 0;
	var mylist = [], this_paper_terms = []; //mylist is all synonyms, this_paper_terms is synonyms grouped by word in source paper
	for(term of thisPaper.terms){
		var word_bin = [];
		for(syn of term.synonyms){
			var word = syn.synonym.trim();
			mylist.push(word);
			word_bin.push(word);
		}
		this_paper_terms.push(word_bin);
	}
	mylist = mylist.sort();

	//words to forbid in problem extraction:
	var forbidden_words = $("#forbidden_words").html().split(",");
	for(var i = 0; i<forbidden_words.length; i++){ //remove empty strings, white space
		f_word = forbidden_words[i].trim();
		if(f_word.length==0){forbidden_words.splice(i,1);}
	}

	//tfidf scores
	if(score_mode=="tfidf"){
		score_tfidf(); //{paper_id:score, paper_id: score}
	}else if(score_mode=="lsi"){
		score_lsi(); //{paper_id:score, paper_id: sc
	}

	//find overlapping synonyms
	for(var i=0; i<data.length; i++){
		var theirPaper = data[i];
		if (theirPaper.id == thisPaper.id){ continue; } //is this my paper?

		//remove papers which contain any words the user has "forbidden" in the extraction
		var forbidden = false;
		for (f_word of forbidden_words){ //contains forbidden word?
			if(theirPaper.extraction.indexOf(f_word) > -1){
				forbidden=true;
				break;
			}
		}
		if(forbidden){continue;}

		//get the overlapping synonyms
		var overlap = []; //overlapping words grouped by target problem terms
		var overlap_all = []; //all the overlapping terms in one bin
		var j=0, overlap_count = 0, syn_count = 0;
		for (term of theirPaper.terms){
			//get the terms for this word:
			var theirlist = [];
			for (wordobj of term.synonyms){ theirlist.push(wordobj.synonym); }
			var overlap_term = intersect_safe(mylist,theirlist.sort());
			overlap[j++] = overlap_term;
			overlap_all = overlap_all.concat(overlap_term);
			overlap_count += overlap_term.length;
			syn_count += theirlist.length;
		}

		//score the paper's relevance depending on the scoring mode
		var score = 0;
		switch(score_mode){
			case "dumbo": //count the overlapping words and normalize:Jaccard index = intersection/union
				score = overlap_count/(mylist.length + syn_count - overlap_count);
				break;
			case "tfidf": //see tfidf scoring method in views.py
				score = tfidf_scores[theirPaper.id]? tfidf_scores[theirPaper.id] : 0;
				break;
			case "lsi": //see lsi scoring method in views.py
				score = lsi_scores[theirPaper.id]? lsi_scores[theirPaper.id] : 0;
				break;
			default:
				score = 1;
		}

		score = entropyScoringFunction(overlap, overlap_count, score);

		var overlap_group_by_source = [];
		for(term_list of this_paper_terms){
			source_term_overlap = [];
			for(word of term_list){
				if(overlap_all.indexOf(word)> -1){
					source_term_overlap.push(word);
				}
			}
			overlap_group_by_source.push(source_term_overlap);
		}
		//needs to go in both directions. first we need to re-sort the synonyms into bins for the source problem's terms
		score = entropyScoringFunction(overlap_group_by_source, overlap_count, score);

		//"parallel preference" scoring:
		//prefer 1:1 mappings where, given mapping (a_1 -> b_3)
		//the best mapping of a_2 is (a_2 -> b_4)
		//eg, if two words in a row map to each other thats probably good

		//1. force 1:1 mapping of terms of the source paper to the target paper
		//2. for each mapping, check if there are "chained" sequential mappings. if so, keep looking for more

		//scoring:  score = score * [ 1+ (+1 for each chained mapping)/(max possible mappings) ]
		if(parallel_preference_scoring_weight>0){
			var mapping = []; //for each term in source extraction: the index of the term in the target extraction with best mapping
			p_score = 0, p_score_max = 0;


			for (term of thisPaper.terms){
				//find best mapping
				var my_term_synonyms = [];
				for(s of term.synonyms){my_term_synonyms.push(s.synonym);}
				my_term_synonyms.sort();
				var best_overlap_score = 0;
				var best_overlap_index = null;
				for (var j=0; j<overlap.length; j++){
					var overlap_one_term = overlap[j];
					var overlap_score = intersect_safe(my_term_synonyms,overlap_one_term).length;
					if(overlap_score > best_overlap_score){ 
						best_overlap_score = overlap_score; 
						best_overlap_index = j;
					}
				}
				mapping.push(best_overlap_index);
			} 
			for (var source_index = 0; source_index < mapping.length; source_index++){
				p_score_max +=1;
				try{
				 if(mapping[source_index+1] == mapping[source_index]+1){p_score +=1;}  //check: if [0->3], does [1->4] ? 
				}catch(e){}//tryed to access unavailable element

				//for debugging / seeing parallel connections: 
				var target_index = mapping[source_index];
				if(target_index !=null ){
					if(mapping[source_index+1] == target_index + 1) { //score!
						// console.log(thisPaper.terms[source_index].term + " :: " + theirPaper.terms[target_index].term)
						// console.log(thisPaper.terms[source_index+1].term + " :: " + theirPaper.terms[target_index+1].term);
					}
				}
			}
			var P = 1 + 5*p_score/p_score_max; //(>=1)
			score = parallel_preference_scoring_weight*(score*P) + (1 - parallel_preference_scoring_weight)*(score);
		}

		//all_connections isn't used in the interface, only as a storage bin for exporting the connections found (eg to d3 network graph)
		if(score>cutoff_score){
			all_connections.push({"source":thisPaper.id, "target":theirPaper.id, "value":score*100})
		}
		score = score.toFixed(3);
		if(score>highest_score){ highest_score = score; } //what is the "best match" score for this paper?
		results.push([theirPaper,overlap,score]);
	}

	results.sort(function(a, b) {
        return b[2] - a[2]; //sort by score
    });
    return results;
}

function addPaper(paper_and_overlap){
	var paper = paper_and_overlap[0];
	var overlap = paper_and_overlap[1];
	var myscore = paper_and_overlap[2];

	var template_reset = $("#paper_template").html();
	var template = $("#paper_template");
	$(template).find("h3").html(paper_order_number++ + ": "+paper.extraction);
	$(template).find(".score").html("score: " + myscore);
	$(template).find(".paper_id").html(paper.id);
	$(template).find(".abstract").html(paper.abstract);

	var synonyms = "";
	for(var i=0; i<overlap.length; i++){
		if(overlap[i].length>0){
			synonyms += "<b>" + paper.terms[i].term.toString() + "</b>: "
			for(var j=0; j<overlap[i].length; j++){
				synonyms+= overlap[i][j]+", ";
			}
			synonyms+= "<br>";
		}
	}
	$(template).find(".synonyms").html(synonyms);

	$("#related_papers").append(template.html());
	$(template).html(template_reset);
}

//"save state" functions
function saveQuery(){
	console.log("Customized cloud query: ")
	console.log(myCustomPaper);
	topRelatedPapers = currentRelatedPapers.slice(0,20);
	console.log("Top related papers: ")
	console.log(topRelatedPapers);
}

function starClicked(me){
	//console.log("clicked star");
	star = $(me).find(".star_filled");
	$(star).toggle();
	var favorite_paper_id = $(me).parent().find(".paper_id").html();
	var favorite_papers_div = $("#favorite_papers_div");
	if($(star).is(":visible")){
		//add paper to favorites
		favorite_papers.push(favorite_paper_id);
		console.log("star paper: " + favorite_paper_id);
	}else{
		//remove paper from favorites (if its there)
		var index = favorite_papers.indexOf(favorite_paper_id);
		if(index>-1){
			favorite_papers.splice(index,1);
		}
	}
	favorite_papers_txt = "";
	for(p of favorite_papers){favorite_papers_txt = favorite_papers_txt.concat(p + "<br>");}
	$(favorite_papers_div).html(favorite_papers_txt);
}

//"Update" type functions
function newTextSynonyms(text, word){
	syns = text.split(", ");
	newSynonyms = [];
	for (s of syns){
		s=s.trim();
		if(s.length>0){
			newSynonyms.push({synonym:s, pos:"v", abstraction:"concrete"});
		}
	}
	newSynonyms.sort(function(a,b){
		return a.synonym.localeCompare(b.synonym);
	});
	var thisTerm = myCustomPaper.terms.find(function(a){return a.term==word})
	thisTerm.synonyms = newSynonyms;
	//updateRelatedPapers();
}

function changeScoringFunction(me){
	score_mode = me.value;
	(score_mode=="lsi") ? $("#lsi_dimensions_input").show() : $("#lsi_dimensions_input").hide()
	//console.log("score mode: "+score_mode);
}
function changeLsiDimensions(me){
	lsi_dimensions = me.value;
	if(isNaN(lsi_dimensions) || lsi_dimensions<1) {lsi_dimensions = 100; }
}

function changeProblem(me){
	var option = me.options[me.selectedIndex];
	var id = $(option).attr("paperid");
	var value = $(option).html();
	console.log("new problem id: "+id);
	for(var i=0; i<data.length; i++){ //find this paper
		if(data[i].id == id ){
			myPaper = copy(myPaper, data[i]);
			myCustomPaper = copy({}, myPaper);
			break;
		}
	}

	$("#problem").html(myPaper.extraction);
	$("#my_abstract").html(myPaper.abstract);
	$("#related_papers").html("");
	$("#sentence_list").html("");

	currentRelatedPapers = getSimilarPapers(myPaper);
	paper_order_number = 1;
	for (paper_and_overlap of currentRelatedPapers){
		addPaper(paper_and_overlap);
	}

	addWordsOfSentence(myPaper);
	lightning();
	saveQuery();
}

function updateRelatedPapers(){
	$("#related_papers").html("");
	currentRelatedPapers = getSimilarPapers(myCustomPaper);
	paper_order_number = 1;
	for (paper_and_overlap of currentRelatedPapers){
		addPaper(paper_and_overlap);
	}
	lightning();
	saveQuery();
}

//scoring functions

//"Entropy scoring"
// - overlap is an array with the list of overlapping synonyms for each term
//     eg. overlap = [["synonyms","for","term","one"], ["syns","for","2nd","word"]];
// - overlap count is the total number of synonyms
// - score is the Jaccard overlap scoring.
//returns: the new score value
function entropyScoringFunction(overlap, overlap_count, score){		
	if(entropy_strength>0){
			//Shannon entropy: H(A) = sum_i=0_to_n: -1 * p_i * log_2 (p_i) 
			//where p_i is probablility of a synonym coming from each bin
			// probabilities = [];
			// for(word_overlap of overlap){
			// 	probabilities.push(word_overlap.length/overlap_count);
			// }
			// H = 0;
			// for (p of probabilities){
			// 	if(p>0){
			// 		H += (-1) * p * Math.log2(p);
			// 	}
			// }
			// var max_H = Math.log2(probabilities.length);
			// var H_normalized = H/max_H;
			// var shannon_score = H_normalized*score;
			// //console.log("Shannon score: "+ shannon_score);
			// score = (entropy_strength)*shannon_score + (1-entropy_strength)*score;

			probabilities = [];
			for(word_overlap of overlap){
				probabilities.push(word_overlap.length/overlap_count);
			}
			H = 0;
			for (p of probabilities){
				if(p>0){
					H += (-1) * p * Math.log2(p);
				}
			}
			var max_H = Math.log2(probabilities.length);
			var H_normalized = H/max_H;
			var shannon_score = H_normalized*score;
			//console.log("Shannon score: "+ shannon_score);
			score = (entropy_strength)*shannon_score + (1-entropy_strength)*score;

		}
	return score;
}

function score_tfidf(){
	var bow = []; //custom word cloud the user has made, like: ["array", "of", "strings"]
	for (term of myCustomPaper.terms){
		for (synonym of term.synonyms){bow.push(synonym.synonym);}
	}
	//console.log(JSON.stringify(bow));
	$.ajax({
		async: false,
		type: 'GET',
		url: url_tfidf,
		data: {query:JSON.stringify(bow)},
		success: function(data){
			tfidf_scores = data;
		}
	});
}
function score_lsi(){
	var bow = []; //custom word cloud the user has made, like: ["array", "of", "strings"]
	var query = "";

	for (term of myCustomPaper.terms){
		for (synonym of term.synonyms){bow.push(synonym.synonym);}
	}
	query = JSON.stringify(bow);

	//also pass the lsi scoring function a parameter with the number of dimensions desired
	$.ajax({
		async: false,
		type: 'GET',
		url: url_lsi,
		data: {query:query, dimensions:lsi_dimensions},
		success: function(data){
			lsi_scores = data;
		}
	})
	.fail(function() {
		// console.log("No response received from similarity_query request.");
		// console.log("URL used:" + url_lsi);
		// console.log("Dimensions:" + lsi_dimensions);
		// console.log("Query:" + query);
	});
}

//small helper functions
function filterAbstractWords(paper){
	var abstractWords = ["abstraction", "entity", "abstract entity"];
	for (term of paper.terms){
		for (var i = term.synonyms.length-1; i>=0; i--){
			if(abstractWords.indexOf(term.synonyms[i].synonym)>-1){
				term.synonyms.splice(i, 1);
			}
		}
	}
}

// find the intersection of two arrays
function intersect_safe(a, b)
{
  var ai=0, bi=0;
  var result = [];

  while( ai < a.length && bi < b.length )
  {
     if      (a[ai] < b[bi] ){ ai++; }
     else if (a[ai] > b[bi] ){ bi++; }
     else /* they're equal */
     {
       result.push(a[ai]);
       ai++;
       bi++;
     }
  }

  return result;
}

//create a copy of an object at a completely new location in memory
function copy(target, source) {
	target = JSON.parse(JSON.stringify(source));
	return target;
}

function lightning(){
	var lightning = $('#lightning');
	lightning.show();
	setTimeout(function(){
		lightning.hide();
		setTimeout(function(){
			lightning.show();
			setTimeout(function(){
				lightning.hide();
			}, 200);
		}, 100);
	}, 100);
}

//sliders
$("#entropy_slider").slider({
	change: function( event, ui ) {
		entropy_strength = ui.value/100;
		myCustomPaper.entropy_value = entropy_strength;
	},
	min:0,
	max:100,
	value:0,
});
$("#parallel_slider").slider({
	change: function( event, ui ) {
		parallel_preference_scoring_weight = ui.value/100;
		myCustomPaper.parallel_scoring_value = parallel_preference_scoring_weight;
	},
	min:0,
	max:100,
	value:0,
});

//event listeners

//logic for when a filtering checkbox is changed
$("body").on("change", ".check", function(){
	var li= $(this).parents().eq(1);
	var thisWord = $(li).attr("word");

	var term_data = copy({},myPaper.terms.find(function(t){return t.term==thisWord}));

	var va = $(li).find(".va_check").prop("checked"); //verb abstract
	var vc = $(li).find(".vc_check").prop("checked"); //verb concrete
	var na = $(li).find(".na_check").prop("checked"); //noun abstract
	var nc = $(li).find(".nc_check").prop("checked"); //noun concrete

	var text_synonyms = "";
	var keepSynonyms = [];
	var va_s = [], vc_s = [], na_s = [], nc_s = [], xa_s = [], xc_s = []; //synonyms for 6 categories
	for(var i=0; i<term_data.synonyms.length; i++){ //add synonyms according to check boxes
		s = Object.assign({}, term_data.synonyms[i]);
		//sort synonyms into 6 bins (va vc na nc xa xc)
		if(!(s.hasOwnProperty("pos"))){
			s.abstraction=="concrete" ? xc_s.push(s) : xa_s.push(s);
		}else if(s.pos=="n"){
			s.abstraction=="concrete" ? nc_s.push(s) : na_s.push(s);
		}else{
			s.abstraction=="concrete" ? vc_s.push(s) : va_s.push(s);
		}
	}

	//decide which of the 6 bins of synonyms should be included in the customized query
	if(va){keepSynonyms = keepSynonyms.concat(va_s);}
	if(vc){keepSynonyms = keepSynonyms.concat(vc_s);}
	if(na){keepSynonyms = keepSynonyms.concat(na_s);}
	if(nc){keepSynonyms = keepSynonyms.concat(nc_s);}
	if(na || va){keepSynonyms = keepSynonyms.concat(xa_s);}
	if(nc || vc){keepSynonyms = keepSynonyms.concat(xc_s);}

	keepSynonyms.sort(function(a,b){
		return a.synonym.localeCompare(b.synonym);
	});

	for(var i=0; i<keepSynonyms.length; i++){ //add all synonyms
		text_synonyms+= keepSynonyms[i].synonym+", ";
	}

	$(li).find(".edit").html(text_synonyms);

	//update myCustomPaper
	var thisTerm = myCustomPaper.terms.find(function(a){return a.term==thisWord})
	thisTerm.synonyms = keepSynonyms;
	//updateRelatedPapers();
});

$("body").on("blur", ".edit", function(){
	word = $(this).parent().attr("word");
	text = $(this).html();
	newTextSynonyms(text, word);
});

$("#update_related_papers_button").on("click", function(){
	updateRelatedPapers();
});

$("#forbidden_words").keydown(function(e){
	if (e.keyCode === 13) {
		//console.log("blur");
		$(e.target).blur();
		updateRelatedPapers();
		return false;
	}
});

$("#toggle_options").click(function(){
	$("#options").toggle();
});

$("#problems_by_top_score_btn").click(function(){
	$("#problems_by_top_score").toggle();
});

$("#favorite_papers_btn").click(function(){
	$("#favorite_papers_div").toggle();
});

$("body").on("click", "#toggle_abstract", function(){
	$("#my_abstract").toggle();
});

$("body").on("click", ".more_info_btn", function(me){
	$(me.target).parent().find(".more_info").toggle();
});