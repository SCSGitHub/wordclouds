from datetime import datetime
from django.shortcuts import render, redirect
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.renderers import JSONRenderer
from .models import *
from .serializers import *
import hashlib, json, logging

from random import randint

logger = logging.getLogger(__name__)
logger.debug('Starting \'wordclouds\' app...')
hash_key = 'd41d8cd98f00b204e9800998ecf8427e'
task_desc = 'word clouds'

class JSONResponse(HttpResponse):
    """
    An HttpResponse that renders its contents into JSON
    """
    def __init__(self, data, **kwargs):
        content = JSONRenderer().render(data)
        kwargs['content_type'] = 'application/json'
        super(JSONResponse, self).__init__(content, **kwargs)

def index(request):
    return redirect("wordclouds:username")

def cloud(request):
    if "username" in request.session:
        problem_id = Problem.get_new_id()
        request.session["problem_id"] = problem_id
        abstract = Problem.objects.get(id=problem_id).abstract
        if type(abstract) != str or len(abstract) < 1:
            abstract = "Sorry, there is no abstract available."
        return render(request, 'wordclouds/cloud.html', { 'abstract': abstract, 'problem_id': problem_id })
    else:
        return redirect("wordclouds:username")

@csrf_exempt
def completed_cloud(request):
    #my_hash = "333" #request.session['completion_code']
    template_vars = {
        'completion_code': "not done with task",
        'username': '',
        'trial': 0,
        'problem_id': 0
    }
    
    if "done" in request.session and request.session["done"]==True :
        template_vars['username'] = request.session.pop("username") #removes username
        template_vars['completion_code'] = request.session.pop("completion_code")
        template_vars['trial'] = request.session.pop("trial")
        template_vars['problem_id'] = request.session.pop("problem_id")
        
        logger.debug("Completed by user {} with code {}".format(template_vars['username'], template_vars['completion_code']))

        #clear the session so that they have to restart
        request.session["done"]=False
        request.session["completion_code"]=None

        #return JSONResponse(md5_hash, status=200)
        return render(request, 'wordclouds/completed_cloud.html', template_vars)
    else:
        return render(request, 'wordclouds/completed_cloud.html', template_vars)

@csrf_exempt
def cloud_training(request):
    if "username" in request.session:
        return render(request, 'wordclouds/cloud_training.html')
    else:
        return redirect("wordclouds:username")

def username(request):
    return render(request, 'wordclouds/username.html')

def fetch_problem(request, problem_id):
    try:
        problem_id = int(problem_id)
    except:
        return HttpResponse(status=400)
        
    if request.method == 'GET' and problem_id > 0:
        #create problem object
        problem = Problem.objects.get_problem_with_words(problem_id)
        logger.debug("Problem fetched: {}".format(problem))
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
        if "username" in request.session and 'done' in request.session:
            problem_id =  request.session['problem_id']
            username = request.session["username"]
            trial = request.session["trial"] if request.session['trial'] else 0
            submit_date = datetime.now()

            hash_string = username + hash_key + str(trial) + str(problem_id)
            md5_hash = hashlib.md5(hash_string.encode('utf-8')).hexdigest()
            post = json.loads(request.POST['cloud_data'])

            #save synonym data
            Synonym.store_words(
                post,
                user = username,
                trial = trial,
                problem_id = problem_id,
                submit_date= submit_date
            )

            #save completion code data
            code = CompletionCode(code=md5_hash, user=username, problem_id=problem_id, trial=trial, task= task_desc, submit_date=submit_date)
            code.save()

            #store in session for next page
            request.session['completion_code'] = md5_hash
            request.session['completion_timestamp'] = '{:%m/%d/%Y %H:%M:%S}'.format(submit_date)

            logger.debug(post)
            logger.info("Hash created for {} ({}) at {}".format(username, md5_hash, request.session['completion_timestamp']))

            request.session["done"] = True
            #return JSONResponse(md5_hash, status=200)
            return HttpResponse("ok", status=200)
        else:
            return HttpResonse("No User", status=200)
    else:
        return HttpResponse(status=400)

def send_username(request):
    if request.method == 'POST':
        #validate
        username = request.POST["username"]
        request.session["username"] = username
        request.session["done"]= False

        #check how many times this turker has completed the HIT
        #for now, assign static value
        request.session["trial"] = CompletionCode.get_trial(username)
        logger.info("Username: {} Trial: {}".format(username, request.session["trial"]))
        return redirect("wordclouds:cloud_training")
    else:
        return HttpResponse(status=400)

def user_feedback(request):
    if request.method == 'POST':
        logger.debug("user feedback:")
        logger.debug(request.POST["feedback_text"])

        #POST data should be cleaned
        feedback_data = {
            'user': request.POST['username'],
            'problem_id': request.POST['problem_id'],
            'trial': request.POST['trial'],
            'text': request.POST['feedback_text'],
            'task': task_desc,
            'submit_date': datetime.now()
        }

        #store feedback
        fb = Feedback.objects.create(**feedback_data)
        fb.save()
        return HttpResponse(status=200)
    else:
        return HttpResponse(status=400)
