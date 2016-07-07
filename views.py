from django.shortcuts import render
from django.http import HttpResponse
from django.template import loader
from rest_framework.renderers import JSONRenderer
from .synonyms import *
from .words import *

class JSONResponse(HttpResponse):
    """
    An HttpResponse that renders its contents into JSON
    """
    def __init__(self, data, **kwargs):
        content = JSONRenderer().render(data)
        kwargs['content_type'] = 'application/json'
        super(JSONResponse, self).__init__(content, **kwargs)

def index(request):
    return render(request, 'wordclouds/index.html')

def search(request):
    template = loader.get_template('wordclouds/search.html')
    if request.method == 'GET' and len(request.GET) > 0:
        if len(request.GET['word_query']) > 0:
            word_obj = Synonym(request.GET['word_query'])
            return render(request, 'wordclouds/search.html',
                {'query': request.GET['word_query'],
                'word': word_obj})
        else:
            return render(request, 'wordclouds/index.html')

    return render(request, 'wordclouds/search.html')

def cloud(request):
    return render(request, 'wordclouds/cloud.html')

def cloud_training(request):
    return render(request, 'wordclouds/cloud_training.html')

def fetch_synonyms(request, word=''):
    if request.method == 'GET' and len(request.GET) > 0 and len(request.GET['word']) > 0:
        word = request.GET['word']

    if len(word) > 0:
        return JSONResponse(SynonymSerializer(Synonym(word)).data)
    else:
        return HttpResponse(status=400)

def fetch_word(request, word=''):
    if request.method == 'GET' and len(request.GET) > 0 and len(request.GET['word']) > 0:
        word = request.GET['word']

    if len(word) > 0:
        word_obj = Word(word, get_hypernyms=True)
        return JSONResponse(WordExtendedSerializer(word_obj).data)
    else:
        return HttpResponse(status=400)

def fetch_word_senses(request, word=''):
    if request.method == 'GET' and len(request.GET) > 0 and len(request.GET['word']) > 0:
        word = request.GET['word']

    if len(word) > 0:
        word_obj = WordSense(word)
        return JSONResponse(WordSenseSerializer(word_obj).data)
    else:
        return HttpResponse(status=400)
