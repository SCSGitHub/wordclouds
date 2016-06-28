from django.shortcuts import render
from django.http import HttpResponse
from django.template import loader
from rest_framework.renderers import JSONRenderer
from rest_framework.views import APIView
from nltk.corpus import wordnet

class JSONResponse(HttpResponse):
    """
    An HttpResponse that renders its contents into JSON
    """
    def __init__(self, data, **kwargs):
        content = JSONRenderer().render(data)
        kwargs['content_type'] = 'application/json'
        super(JSONResponse, self).__init__(content, **kwargs)

class Word():
    hypernyms = []

def get_nym_names(synset, synset_relationship = '', sort=False):
    s_set = set()
    nyms = []
    if synset_relationship == 'hypernyms':
        s_set = synset.hypernyms()
    elif synset_relationship == 'hyponyms':
        s_set = synset.hyponyms()
    elif synset_relationship == 'sisters':
        s_set = [sister for hypernyms in synset.hypernyms() for sister in hypernyms.hyponyms() if sister != synset]
    else:
        s_set = synset

    for item in s_set:
        for lemma in item.lemmas():
            #print(lemma.name().replace("_", " "))
            nyms.append(lemma.name().replace("_", " "))

    if sort:
        nyms.sort(key=str.lower)
    return nyms

def get_nested_nym_names(synset, synset_relationship='hypernyms', sort=False):
    initial_call_nyms = getattr(synset, synset_relationship)
    s_set = initial_call_nyms()
    nyms_of_nyms = []

    for item in s_set:
        call_nyms = getattr(item, synset_relationship)
        if len(call_nyms()) > 0:
            for nested_hyp in call_nyms():
                nyms_of_nyms.append(nested_hyp)

    nyms_of_nyms_names = get_nym_names(nyms_of_nyms, '')
    if sort:
        nyms_of_nyms_names.sort(key=str.lower)
    return nyms_of_nyms_names

def get_word_object(synset):
    word = {}
    word['hypernyms'] = get_nym_names(synset, 'hypernyms', sort=True)
    word['hyponyms'] = get_nym_names(synset, 'hyponyms', sort=True)
    word['inherited_hypernyms'] = get_nested_nym_names(synset, 'hypernyms', sort=True)
    word['inherited_hyponyms'] = get_nested_nym_names(synset, 'hyponyms', sort=True)
    word['sisters'] = get_nym_names(synset, 'sisters', sort=True)
    return word

def index(request):
    return render(request, 'wordclouds/index.html')

def search(request):
    template = loader.get_template('wordclouds/search.html')
    if request.method == 'GET' and len(request.GET) > 0:
        if len(request.GET['word_query']) > 0:
            synset = wordnet.synset(request.GET['word_query'])
            lemmas = [str(lemma) for lemma in synset.lemmas()]
            lemma_names = [lemma.name().replace("_", " ") for lemma in synset.lemmas()]
            hypernyms = get_nym_names(synset, 'hypernyms')
            hyponyms = get_nym_names(synset, 'hyponyms')
            hyper_hyper = get_nested_nym_names(synset, 'hypernyms')
            hypo_hypo = get_nested_nym_names(synset, 'hyponyms')
            sisters = get_nym_names(synset, 'sisters')
            return render(request, 'wordclouds/search.html',
                {'query': request.GET['word_query'],
                'lemmas': lemmas, 'lemma_names': lemma_names,
                'hypernyms': hypernyms, 'hyponyms': hyponyms,
                'hyper_hyper': hyper_hyper, 'hypo_hypo': hypo_hypo,
                'sisters': sisters})
        else:
            return render(request, 'wordclouds/index.html')

    return render(request, 'wordclouds/search.html')

def fetch_synonyms(request):
    synonyms = set()
    if request.method == 'GET' and len(request.GET) > 0 and len(request.GET['word']) > 0:
        synset = wordnet.synset(request.GET['word'])
        word = get_word_object(synset)
        return JSONResponse(word)
        #synonyms.append(synset.)
    else:
        return HttpResponse(status=400)
