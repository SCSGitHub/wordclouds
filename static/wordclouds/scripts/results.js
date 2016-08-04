/*
	Interface for exploring results of wordclous and finding connections

	Several scoring mechanisms and query-customization tools are implemented

*/

var data = data3; //contained in a separate file /data3.js

var myPaper = {}; //The paper selected for exploration, with all the original cloud synonyms
var myCustomPaper = {}; //customized word-cloud with words added/subtracted 
var currentRelatedPapers = []; //all related papers that were found, ordered by matching score

var favorite_papers = []; //list of paper_id of starred papers

//scoring (the overlap of) papers
var score_mode = "dumbo";
var tfidf_scores = {};
var lsi_scores = {};
var lsi_dimensions = 100;
var connection_scores = {};
var highest_score = 0;
var entropy_strength = 0; //0-1, 1 is 100%
var parallel_preference_scoring_weight = 0; //0-1, 1 is 100%

var paper_order_number = 1;


var parallel_preference_scoring_weight = 0; //0-1, 1 is 100%

var paper_order_number = 1; //for putting numbers (1,2,3...) on results

//for debugging and extraction of the connections found:
var all_papers = [];
var all_connections = [], cutoff_score = 0.05;

$(document).ready(function(){

	//find all the connections for all papers (is it expensive?)
	//console.log("number of papers: "+data.length);


	//find All the connections for All papers round-robin (kind of expensive)
	//console.log("number of papers: "+data.length);
	for (paper of data){
		//	if(paper != data[0]){break;}//just get the first one, for DEBUGGING only
		filterAbstractWords(paper);
		rs = getSimilarPapers(paper);

		paper.highest_score = highest_score;

		all_papers.push({id:paper.id, extraction: paper.extraction });
	}

	data.sort(function(a,b){ //sort by the papers highest-scoring connection
		return b.highest_score - a.highest_score;
	});
	var problems_by_top_score=""; //a text-y list of all the problems so you can ctrl+F to find one
	for (paper of data){
		//add the problem extractions to the dropdown at top of page (ordered by top score)
		$("#dropdown").append("<option value="+paper.extraction+" paperid="+paper.id+"> "+ " ("+paper.highest_score+") " + paper.extraction +"</option>");
		problems_by_top_score = problems_by_top_score.concat(paper.highest_score.toString() + " : "+paper.id+" : "+paper.extraction + "<br>");
	}
	$("#problems_by_top_score").html(problems_by_top_score);
	myPaper = copy({}, data[0]);
	myCustomPaper = copy({}, myPaper);

});

/*
	Load the terms of the problem extraction being examined in the cloud customization pane
		For each term in myPaper:
			- add a row in word_table_template for the term
			- sort the synonyms for the term alphabetically
			- add the synonyms into the editable text box

	Parameters:
		myPaper: the paper selected for exploration,including its original word cloud synonyms
*/
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

/*
	Main scoring function for comparing the similarity of two clouds and returning results
		- get a list (mylist) of all the synonyms in cloud of 
			this_paper_terms (source, paper being explored)
		- also get a list (this_paper_terms) of thisPaper's synonyms 
			sorted in bins for each term of thisPaper
		- check if the user has 'forbidden' any terms in the query
		- execute a scoring method: tfidf, lsi or "dumb-matching"
		- add weights for entropy, parallel-word-scoring
		- accumulate list of papers, their overlapping words and their score

	Parameters:
		thisPaper: the paper being explored in the interface, including original word-cloud

	Special cases:
		Target problem is same as source problem: not included in results
		Problem extraction has forbidden word: Problem is not included in results
	
	Returns: 
		an array with an element for each paper in the database (excluding thisPaper)
		each paper's element is an array with three elements: [paper, overlap, score]
			paper is the object with the original word cloud and problem extraction
			overlap is the set of words contained in the source and target paper's clouds
			score is the final numerical value after applying a scoring method and weights

*/
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

	//scoring functions
	// create an array with element for each paper like: {paper_id:score, paper_id: score}
	if(score_mode=="tfidf"){
		score_tfidf(); 
	}else if(score_mode=="lsi"){
		score_lsi();
	}

	mylist = mylist.sort();

	//for each paper in the data-set, find overlapping synonyms and score the relevance
	for(var i=0; i<data.length; i++){
		var theirPaper = data[i];
		if (theirPaper.id == thisPaper.id){ continue; } //is this my paper?
		//remove papers which contain any words the user has "forbidden" in the extraction
		var forbidden = false;
		for (f_word of forbidden_words){ //contains forbidden word? don't include it in the results
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
			//get the synonyms for this term:
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

		//add a weight for entropyScoringFunction (if entropy_weight=0, nothing happens)
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
				//mapping: which term in the other paper has the most overlap with this term?
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
					//check: if [0->3] & [1->4], parallel match
					if(mapping[source_index+1] == mapping[source_index]+1){p_score +=1;} 
				}catch(e){}//tryed to access unavailable element

				//for debugging and seeing parallel connections: print the parallel word matches
				var target_index = mapping[source_index];
				if(target_index !=null ){
					if(mapping[source_index+1] == target_index + 1) { //score!
						// console.log(thisPaper.terms[source_index].term + " :: " + theirPaper.terms[target_index].term)
						// console.log(thisPaper.terms[source_index+1].term + " :: " + theirPaper.terms[target_index+1].term);
					}
				}
			}
			var P = 1 + 5*p_score/p_score_max; //(>=1) , 5 is arbitrary but 1 wasn't strong enough
			score = parallel_preference_scoring_weight*(score*P) + (1 - parallel_preference_scoring_weight)*(score);
		}

		//all_connections isn't used in the interface, only as a storage bin for exporting the connections found (eg to d3 network graph)
		if(score>cutoff_score){
			all_connections.push({"source":thisPaper.id, "target":theirPaper.id, "value":score*100})
		}
		score = score.toFixed(3); //round to 3 decimals
		if(score>highest_score){ highest_score = score; } //what is the "best match" score for this paper?
		results.push([theirPaper,overlap,score]);
	}

	results.sort(function(a, b) {
        return b[2] - a[2]; //sort all the papers by score, high to low
    });
    return results;
}

/*
	Add a paper to the results section of the interface
		- fill in the paper_template with the paper's info
		- write in the overlapping synonyms, grouped by term in this paper
		- append to the list of results
		- reset paper_template

	Parameters:
		paper_and_overlap: paper to add, like: [paper_object, overlap, score]
				paper_object: contains original word cloud and extraction for the paper
				overlap: overlapping synonyms grouped by the terms of this paper (not exploration paper)
				score: numerical value for degree of similarity to exploration paper
*/
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

//// "save state" functions ////

/*
	log the customized cloud query (myCustomPaper) and the top 20 results to the console
*/
function saveQuery(){
	console.log("Customized cloud query: ")
	console.log(myCustomPaper);
	topRelatedPapers = currentRelatedPapers.slice(0,20);
	console.log("Top related papers: ")
	console.log(topRelatedPapers);
}

/*
	Add a 'starred' paper to the list of starred papers

	Issues: 
		Does not retain star when you perform a new search
		The starred-papers div is uninformative, only has the paper's id

	Parameters: 
		me: div that holds both the filled and empty star elements 
*/
function starClicked(me){
	//console.log("clicked star");
	star = $(me).find(".star_filled");
	//toggle the visibility of the yellow star on click (yellow star is on top of empty star)
	$(star).toggle(); 
	var favorite_paper_id = $(me).parent().find(".paper_id").html();
	var favorite_papers_div = $("#favorite_papers_div");
	if($(star).is(":visible")){
		//add paper to favorites
		favorite_papers.push(favorite_paper_id);
		console.log("star paper: " + favorite_paper_id);
	}else{
		//paper was un-starred; remove paper from favorites (if its there)
		var index = favorite_papers.indexOf(favorite_paper_id);
		if(index>-1){
			favorite_papers.splice(index,1);
		}
	}
	favorite_papers_txt = "";
	for(p of favorite_papers){favorite_papers_txt = favorite_papers_txt.concat(p + "<br>");}
	$(favorite_papers_div).html(favorite_papers_txt);
}

//// "Update" type functions ////

/*
	Update the customized query when the user adds/removes words
		- tokenize by comma to create new synonym list for term
		- sort the new list of synonyms
		- update the synonyms for this term in the customized cloud (myCustomPaper)

	Parameters:
		text: the list of synonyms in the editable text-box for a term
		word: (string) term who's synonyms have changed 
*/
function newTextSynonyms(text, word){
	syns = text.split(", ");
	newSynonyms = [];
	for (s of syns){
		s=s.trim();
		if(s.length>0){
			newSynonyms.push({synonym:s, pos:"v", abstraction:"concrete"});
		}
	}
	newSynonyms.sort(function(a,b){ //sort synonym list alphabetically
		return a.synonym.localeCompare(b.synonym);
	});
	//pointer to the term in the customized cloud:
	var thisTerm = myCustomPaper.terms.find(function(a){return a.term==word})
	thisTerm.synonyms = newSynonyms; //update the synonym list for this term
	//updateRelatedPapers(); //nah, better not to re-search every time they change the query
}

/*
	update the global variable score_mode with user's choice
	for LSI, allow them to change the number of dimensions
*/
function changeScoringFunction(me){
	score_mode = me.value;
	(score_mode=="lsi") ? $("#lsi_dimensions_input").show() : $("#lsi_dimensions_input").hide()
	//console.log("score mode: "+score_mode);
}
function changeLsiDimensions(me){ //default: 100
	lsi_dimensions = me.value;
	if(isNaN(lsi_dimensions) || lsi_dimensions<1) {lsi_dimensions = 100; }
}

/*
	When a new problem is chosen for exploration:
		update the information about the current paper (abstract, extraction, etc)
		perform the search for related papers
		add the terms of the problem extraction to the customization pane

*/
function changeProblem(me){
	var option = me.options[me.selectedIndex]; //what problem did they choose from dropdown?
	var id = $(option).attr("paperid"); //the html element from dropdown has id=paper_id
	var value = $(option).html();
	console.log("new problem id: "+id);

	for(var i=0; i<data.length; i++){ //find this paper's object in our datases from id
		if(data[i].id == id ){
			myPaper = copy(myPaper, data[i]);
			myCustomPaper = copy({}, myPaper);
			break;
		}
	}

	//update the info about the paper at the top of the page
	$("#problem").html(myPaper.extraction);
	$("#my_abstract").html(myPaper.abstract);
	$("#related_papers").html("");
	$("#sentence_list").html("");

	//perform search and find related papers
	currentRelatedPapers = getSimilarPapers(myPaper);
	paper_order_number = 1;

	//show the results to the user
	for (paper_and_overlap of currentRelatedPapers){
		addPaper(paper_and_overlap);
	}

	addWordsOfSentence(myPaper); //add terms + synonyms to customization pane
	lightning(); // baBANG!
	saveQuery(); //log the query state and top results to the console
}

/*
	perform search and show the resulting papers
*/
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

//// scoring functions ////

/*
	Entropy scoring weight:
		entropy prefers the overlapping terms to be spread out over the extraction,
		as opposed to being concentrated on one term.
		It is applied first from found_paper->origin paper, then origin_paper->found_paper

	Parameters:
		overlap: array with the list of overlapping synonyms for each term
	   		eg. overlap = [["synonyms","for","term","one"], ["syns","for","2nd","word"]];
		overlap count: total number of overlapping synonyms 
		score: the Jaccard overlap scoring, intersection/union
	
	Returns: the new score value
*/
function entropyScoringFunction(overlap, overlap_count, score){		
	if(entropy_strength>0){
			//Shannon entropy: H(A) = sum_i=0_to_n: -1 * p_i * log_2 (p_i) 
			//where p_i is probablility of a synonym coming from each bin

			probabilities = []; //list of probabilities of overlapping synonym belonging to bins
			for(word_overlap of overlap){
				probabilities.push(word_overlap.length/overlap_count); //overlaps in bin / total 
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

/*
	Find vector similarity of two word clouds with tf-idf
		for each paper in the database
			- call to server, sends word cloud of source, target papers
			- recieves a numerical value for the similarity

	Updates global variable tfidf_scores: object with {paper_id:score, paper_id2:score...}
*/
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
/*
	Find vector similarity of two word clouds with lsi (dimension reduction)
		for each paper in the database
			- call to server, sends word cloud of source, target papers, and # dimensions
			- recieves a numerical value for the similarity

	Updates global variable tfidf_scores: object with {paper_id:score, paper_id2:score...}
*/
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

//// small helper functions ////

/*
	remove unwated words from a paper's word cloud
*/
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

/* 
	find the intersection of two arrays

	Parmeters:
		a,b: arrays of strings to compare

	Return: list of overlapping terms (strings)
*/
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
//(WHY IS THIS SO HARD IN JS???)
function copy(target, source) {
	target = JSON.parse(JSON.stringify(source));
	return target;
}

//You know what it is... (blackandyellowblackandyellowblackandyellowblackandyellow)
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


//sliders for entropy and parallel-scoring weight
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

//// Event Handlers ////

/*
	logic for when a filtering checkbox is changed:
		ends up being kind of complicated, but basically filters the words
		based on abstraction level and part of speech
		
		the issue is when we don't know pos (user typed word): I keep the word unless
		BOTH 'noun' and 'verb/other' are UNchecked for that word's abstraction level
		(causes some confusing results in the interface)

	steps: 
		find out what check boxes are checked (boolean va, vc, na, nc)
		sort the synonym list into 6 bins: 
			[concrete(c), abstract(a)] x [noun(n),verb(v),unknown(x)]
		create a new synonym list, and add the words from desired bins
		sort synonyms alphabetically
		update the editable text box with the new synonyms

*/
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

	keepSynonyms.sort(function(a,b){ //sort synonyms alphabetically
		return a.synonym.localeCompare(b.synonym);
	});

	for(var i=0; i<keepSynonyms.length; i++){ //add all synonyms
		text_synonyms+= keepSynonyms[i].synonym+", ";
	}

	$(li).find(".edit").html(text_synonyms);

	//update myCustomPaper: 
	var thisTerm = myCustomPaper.terms.find(function(a){return a.term==thisWord})
	thisTerm.synonyms = keepSynonyms;
	//updateRelatedPapers(); //lets not re-search every time they change something
});

//when user leaves editable text box, update the customized query
$("body").on("blur", ".edit", function(){
	word = $(this).parent().attr("word");
	text = $(this).html();
	newTextSynonyms(text, word);
});

//perform search button
$("#update_related_papers_button").on("click", function(){
	updateRelatedPapers();
});

//if they hit 'enter' on forbidden words div, perform new search
$("#forbidden_words").keydown(function(e){
	if (e.keyCode === 13) {
		//console.log("blur");
		$(e.target).blur();
		updateRelatedPapers();
		return false;
	}
});

//expand and collapse the cloud-customization pane
$("#toggle_options").click(function(){
	$("#options").toggle();
});

//expand and collapse the text-y list of problem extractions, ids, scores
$("#problems_by_top_score_btn").click(function(){
	$("#problems_by_top_score").toggle();
});

//expand and collapse favorite papers div
$("#favorite_papers_btn").click(function(){
	$("#favorite_papers_div").toggle();
});

//expand and collapse the exploration paper's abstract
$("body").on("click", "#toggle_abstract", function(){
	$("#my_abstract").toggle();
});

//expand and collapse more info (abstract, id) on a search result paper
$("body").on("click", ".more_info_btn", function(me){
	$(me.target).parent().find(".more_info").toggle();
});