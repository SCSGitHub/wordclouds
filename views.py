from django.shortcuts import render
from django.http import HttpResponse
from django.template import loader
from nltk.corpus import wordnet

def get_nym_names(synset, synset_relationship):
    s_set = set()
    nyms = []
    if synset_relationship == 'hypernyms':
        s_set = synset.hypernyms()
    elif synset_relationship == 'hyponyms':
        s_set = synset.hyponyms()
    else:
        s_set = synset

    for item in s_set:
        for lemma in item.lemmas():
            #print(lemma.name().replace("_", " "))
            nyms.append(lemma.name().replace("_", " "))
    return nyms

def print_lemmas(x):
    print('Lemmas')
    for lemma in x.lemmas():
        print(str(lemma))
    for lemma in x.lemmas():
        print(lemma.name().replace("_", " "))

def get_nested_nym_names(synset, synset_relationship='hypernyms'):
    initial_call_nyms = getattr(synset, synset_relationship)
    s_set = initial_call_nyms()
    nyms_of_nyms = []

    for item in s_set:
        call_nyms = getattr(item, synset_relationship)
        if len(call_nyms()) > 0:
            for nested_hyp in call_nyms():
                nyms_of_nyms.append(nested_hyp)
    return get_nym_names(nyms_of_nyms, '')

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
            return render(request, 'wordclouds/search.html',
                {'lemmas': lemmas, 'lemma_names': lemma_names,
                'hypernyms': hypernyms, 'hyponyms': hyponyms,
                'hyper_hyper': hyper_hyper, 'hypo_hypo': hypo_hypo})
        else:
            return render(request, 'wordclouds/index.html')

    return render(request, 'wordclouds/search.html')
