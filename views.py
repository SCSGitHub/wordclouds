from django.shortcuts import render
from django.http import HttpResponse
from django.http import HttpResponseRedirect
from django.template import loader
from django.views.decorators.csrf import csrf_exempt
from rest_framework.renderers import JSONRenderer
from .problems import *
from .synonyms import *
from .words import *
import hashlib, logging

logger = logging.getLogger(__name__)
logger.debug('Starting \'wordclouds\' app...')
hash_key = 'd41d8cd98f00b204e9800998ecf8427e'

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
        if request.GET['word_query']:
            word_obj = Synonym(request.GET['word_query'])
            return render(request, 'wordclouds/search.html',
                {'query': request.GET['word_query'],
                'word': word_obj})
        else:
            return render(request, 'wordclouds/index.html')

    return render(request, 'wordclouds/search.html')

def cloud(request):
    return render(request, 'wordclouds/cloud.html')

@csrf_exempt
def cloud_training(request):
    return render(request, 'wordclouds/cloud_training.html')

def username(request):
    return render(request, 'wordclouds/username.html')

def fetch_problem(request, problem_id):
    try:
        problem_id = int(problem_id)
    except:
        return HttpResponse(status=400)
        
    if request.method == 'GET' and problem_id > 0:
        #create problem object
        problem = Problem(problem_id)
        return JSONResponse(ProblemSerializer(problem).data)
    else:
        return HttpResponse(status=400)

def fetch_synonyms(request, word=''):
    if request.method == 'GET' and len(request.GET) > 0 and len(request.GET['word']) > 0:
        word = request.GET['word']

    if word:
        return JSONResponse(SynonymSerializer(Synonym(word)).data)
    else:
        return HttpResponse(status=400)

def fetch_word(request, word=''):
    if request.method == 'GET' and len(request.GET) > 0 and len(request.GET['word']) > 0:
        word = request.GET['word']

    if word:
        word_obj = Word(word, get_hypernyms=True)
        return JSONResponse(WordExtendedSerializer(word_obj).data)
    else:
        return HttpResponse(status=400)

def fetch_word_senses(request, word=''):
    #if query string used
    if request.method == 'GET' and len(request.GET) > 0 and len(request.GET['word']) > 0:
        word = request.GET['word']

    if word:
        word_obj = WordSense(word)
        return JSONResponse(WordSenseSerializer(word_obj).data)
    else:
        return HttpResponse(status=400)

"""
Validate and store POST data
"""
#remove this decorator when functionality is complete
@csrf_exempt
def submit(request):
    if request.method == 'POST':
        #Format for hash string
        #user id + hash key + trial num
        hash_string = "TEMP" + hash_key + str(1)
        md5_hash = hashlib.md5(hash_string.encode('utf-8')).hexdigest()
        logger.debug("Retrieved POST data...")
        logger.debug(request.POST)
        logger.debug("Hash created.")
        logger.debug(md5_hash)
        #return HttpResponse('All good.', status=200)
        return JSONResponse(md5_hash, status=200)
    else:
        return HttpResponse(status=400)

@csrf_exempt
def send_username(request):
    if request.method == 'POST':
        logger.debug("Retrieved POST data...")
        user = list(request.POST.keys())[0] #this is the mechanical turk username
        logger.debug(user)
        return HttpResponseRedirect("../cloud_training")
    else:
        return HttpResponse(status=400)
