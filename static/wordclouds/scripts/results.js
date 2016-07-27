var data = data3;

var myPaper = {};
var connection_scores = {};
var highest_score = 0;
var myCustomPaper = {};
var score_mode = "dumbo";
var tfidf_scores = {};
var lsi_scores = {};
var lsi_dimensions = 100;

$(document).ready(function(){
	//find all the connections for all papers (is it expensive?)
	console.log("number of papers: "+data.length);
	for (paper of data){
		filterCrappyWords(paper);
		getSimilarPapers(paper);
		paper.highest_score = highest_score;
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
	console.log("id: "+id);
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

	var similarPapers = getSimilarPapers(myPaper);
	for (paper_and_overlap of similarPapers){
		addPaper(paper_and_overlap);
	}

	addWordsOfSentence(myPaper);
	lightning();
}

function getSimilarPapers(thisPaper){
	var results = [];
	highest_score = 0;
	var mylist = [];
	for(term of thisPaper.terms){ 
		for(syn of term.synonyms){ mylist.push(syn.synonym.trim());};
	}
	//words to forbid in problem extraction:
	var forbidden_words = $("#forbidden_words").html().split(",");
	for(var i = 0; i<forbidden_words.length; i++){ //remove empty strings, white space
		f_word = forbidden_words[i].trim();
		if(f_word.length==0){forbidden_words.splice(i,1);}
	}

	//tfidf scores
	if(score_mode=="tfidf"){
		tfidf_scores = score_tfidf(); //{paper_id:score, paper_id: score}
	}else if(score_mode=="lsi_scores"){
		lsi_scores = score_lsi(); //{paper_id:score, paper_id: sc
	}

	//find overlapping synonyms
	mylist = mylist.sort();
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
		var overlap = [];
		var j=0, overlap_count = 0, syn_count = 0;
		for (term of theirPaper.terms){
			//get the terms for this word:
			var theirlist = [];
			for (wordobj of term.synonyms){ theirlist.push(wordobj.synonym); }
			var overlap_term = intersect_safe(mylist,theirlist.sort());
			overlap[j++] = overlap_term;
			overlap_count += overlap_term.length;
			syn_count += theirlist.length; 
		}

		//score the paper's relevance depending on the scoring mode
		var score = 0;
		switch(score_mode){
			case "dumbo": //count the overlapping words and normalize: intersection/union
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
		score = score.toFixed(3);
		if(score>highest_score){ highest_score = score; } //what is the "best match" score for this paper?
		results.push([theirPaper,overlap,score]);
	}

	results.sort(function(a, b) {
        return b[2] - a[2]; //sort by score
    });
    return results;
}

function score_tfidf(){
	var bow = []; //custom word cloud the user has made, like: ["array", "of", "strings"]
	for (term of myCustomPaper.terms){
		for (synonym of term.synonyms){bow.push(synonym.synonym);}
	}
	console.log(JSON.stringify(bow));
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
	for (term of myCustomPaper.terms){
		for (synonym of term.synonyms){bow.push(synonym.synonym);}
	}
	console.log(JSON.stringify(bow));
	//also pass the lsi scoring function a parameter with the number of dimensions desired
	$.ajax({
		async: false,
		type: 'GET',
		url: url_lsi,
		data: {query:JSON.stringify(bow), dimensions:lsi_dimensions.toString()}, 
		success: function(data){
			lsi_scores = data;
		}
	});
}

function addPaper(paper_and_overlap){
	var paper = paper_and_overlap[0];
	var overlap = paper_and_overlap[1];
	var myscore = paper_and_overlap[2];

	var template_reset = $("#paper_template").html();
	var template = $("#paper_template");
	$(template).find("h3").html(paper.extraction);
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

function updateRelatedPapers(){
	$("#related_papers").html("");
	var similarPapers = getSimilarPapers(myCustomPaper);
	for (paper_and_overlap of similarPapers){
		addPaper(paper_and_overlap);
	}
	lightning();
}

function filterCrappyWords(paper){
	var crappyWords = ["abstraction", "entity", "abstract entity"];
	for (term of paper.terms){
		for (var i = term.synonyms.length-1; i>=0; i--){
			if(crappyWords.indexOf(term.synonyms[i].synonym)>-1){
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
		//sort into 6 bins (va vc na nc xa xc)
		if(!(s.hasOwnProperty("pos"))){
			s.abstraction=="concrete" ? xc_s.push(s) : xa_s.push(s);
		}else if(s.pos=="n"){
			s.abstraction=="concrete" ? nc_s.push(s) : na_s.push(s);
		}else{
			s.abstraction=="concrete" ? vc_s.push(s) : va_s.push(s);
		}
	}

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
		console.log("blur");
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

$("body").on("click", "#toggle_abstract", function(){
	$("#my_abstract").toggle();
});

$("body").on("click", ".more_info_btn", function(me){
	$(me.target).parent().find(".more_info").toggle();
});


$("#scoring_function").change( function(a){

});
