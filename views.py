from django.shortcuts import render
from django.http import HttpResponse
from django.template import loader
from rest_framework.renderers import JSONRenderer
from .synonyms import *

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

def fetch_synonyms(request, word=''):

    if request.method == 'GET' and len(request.GET) > 0 and len(request.GET['word']) > 0:
        word = request.GET['word']

    if len(word) > 0:
        return JSONResponse(SynonymSerializer(Synonym(word)).data)
    else:
        return HttpResponse(status=400)
