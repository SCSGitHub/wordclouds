from __future__ import unicode_literals
from datetime import datetime
from django.core.exceptions import ObjectDoesNotExist
from django.db import models
from nltk.corpus import wordnet
from nltk.stem.wordnet import WordNetLemmatizer
from random import randint
import string

class ModelGlobals():
    #the total number of cloud completions we want per problem
    completions_threshold = 3

class CompletionCode(models.Model):
    id = models.AutoField(primary_key=True)
    code = models.CharField(max_length=64)
    user = models.CharField(max_length=100, blank=True, null=True)
    problem = models.ForeignKey('Problem', verbose_name="source problem")
    trial = models.IntegerField(null=True)
    task = models.CharField(max_length=20)
    submit_date = models.DateTimeField(null=True)
    
    @classmethod
    def get_trial(cls, user):
        cnt = CompletionCode.objects.filter(user__contains=user).count()
        return cnt + 1
    
    class Meta:
        managed = True #let migrations create the table if it doesn't exist
        db_table = 'wc_completion_codes'

class Feedback(models.Model):
    id = models.AutoField(primary_key=True)
    user = models.CharField(max_length=100, blank=True, null=True)
    trial = models.IntegerField(null=True)
    task = models.CharField(max_length=20)
    problem_id = models.IntegerField(null=True)
    text = models.TextField(blank=True, null=True)
    submit_date = models.DateTimeField(null=True)

    class Meta:
        managed = True #let migrations create the table if it doesn't exist
        db_table = 'wc_feedback'

class ProblemManager(models.Manager):
    char_excl = [',','.','?','!', '(',')', '[', ']', '{', '}', '\\', '/', '"', ':' ,'&', '=', '+', '#', '$', '%', '^', '*', '<', '>', ';', '`', '~', '|']

    def get_problem_with_words(self, id):
        problem = self.get(id=id)
        #string.punctuation below also has '-' and '_', which is undesirable
        punc_replace = problem.desc.maketrans({key: None for key in self.char_excl
        })
        clean_desc = problem.desc.translate(punc_replace)
        word_forms = clean_desc.split(" ")

        #get lemma forms of words
        lemmatizer = WordNetLemmatizer()
        lemmas = {form: lemmatizer.lemmatize(form) for form in word_forms}
        
        problem.words = [WordSense(form, get_hypernyms=True) for form in word_forms]
        return problem

class Problem(models.Model):
    """
    Attributes:
        id: identifier for the problem
        desc: string of the full problem description
        words: array of word sense objects in the order as they appear in desc
    """
    
    id = models.IntegerField(primary_key=True)
    turk_id = models.CharField(max_length=45, blank=True, null=True)
    #paper_id = models.IntegerField(null=True)
    abstract = models.TextField()
    #HIT1: Depending on the data recieved, this data type might change
    desc = models.CharField(max_length=255)
    user = models.CharField(max_length=100, blank=True, null=True)
    trial = models.IntegerField(null=True)
    type = models.CharField(max_length=20, blank=True, null=True)
    completions = models.IntegerField(default=0)
    submit_date = models.DateTimeField(null=True)
    objects = ProblemManager()
    
    @classmethod
    def reached_max_completions(cls, problem_id):
        completions = Problem.objects.get(id=problem_id).completions
        return completions >= ModelGlobals.completions_threshold
        
    
    @classmethod
    def get_max_id(cls):
        max_item = Problem.objects.all().aggregate(models.Max('id'))
        if max_item:
            return max_item['id__max']
        else:
            return 0
            
    def __str__(self):
        return self.desc

    """
    Return a list of Word objects for a problem
    @type senses: list
    @param senses: The word senses to pull for each word object in WordNet
    """
    def __get_word_senses(self, word_forms):
        return [WordSense(form, get_hypernyms=True) for form in word_forms]
        
    class Meta:
        managed = True #let migrations create the table if it doesn't exist
        db_table = 'wc_problems'
        
class ProblemAttempts(models.Model):
    id = models.AutoField(primary_key=True)
    problem = models.ForeignKey('Problem', verbose_name="source problem")
    user = models.CharField(max_length=100, blank=True, null=True)
    trial = models.IntegerField(null=True)
    start_date = models.DateTimeField(null=True)

    @classmethod
    def get_last_problem_id(cls):
        try:
            last_code = ProblemAttempts.objects.latest('start_date')
            if last_code.problem_id:
                return last_code.problem_id
            else:
                return 0
        except ObjectDoesNotExist:
            return 0

    @classmethod
    def get_new_id(cls):
        problem_id = cls.get_last_problem_id()
        max_problem_id = Problem.get_max_id()
        new_problem_id = problem_id + 1
        if new_problem_id > max_problem_id:
            new_problem_id = 1

        if not Problem.reached_max_completions(new_problem_id):      
            return new_problem_id
        else:
            #return cls.__ordered_assigned_id(new_problem_id)
            return cls.__randomly_assigned_id(new_problem_id)


    #helper to get new id
    @classmethod
    def __ordered_assigned_id(cls, new_id):

        try:
            pool = Problem.objects.filter(completions__lt=ModelGlobals.completions_threshold).values('id','completions').order_by('id')

            if len(pool) <= 0:
                return new_id

            #assign the first one
            pick = pool[0]['id']
            return pick
        except (IndexError, TypeError) as e:
            return new_id

    @classmethod
    def __randomly_assigned_id(cls, new_id):

        try:
            pool = Problem.objects.filter(completions__lt=ModelGlobals.completions_threshold).values('id','completions')

            #we've met our global threshold. continue to evenly distribute problems
            if len(pool) <= 0:
                return randint(1, Problem.get_max_id())

            #randomly pick an object for id
            pick_index = randint(0, len(pool)-1)
            pick = pool[pick_index]['id']
            return pick
        except (IndexError, TypeError) as e:
            return new_id

    class Meta:
        managed = True #let migrations create the table if it doesn't exist
        db_table = 'wc_problems_attempts'
    

class Synonym(models.Model):
    id = models.AutoField(primary_key=True)
    problem = models.ForeignKey('Problem', verbose_name="source problem")
    problem_word_index = models.IntegerField()
    problem_word_form = models.CharField(max_length=50)
    word_abstraction = models.CharField(max_length=10, blank=True, null=True)
    word_form = models.CharField(max_length=50)
    word_lemma = models.CharField(max_length=50, blank=True, null=True)
    word_sense = models.CharField(max_length=50, blank=True, null=True)
    user = models.CharField(max_length=100)
    trial = models.IntegerField(null=True)
    submit_date = models.DateTimeField(null=True)
    

    def __str__(self):
        return self.word_form

    @classmethod
    def store_words(cls, cloud_input, user='', trial=0, problem_id=0, submit_date=None):
        synonyms = []
        key = 0
        problem_id = problem_id if problem_id > 0 else cloud_input['problem_id']
        submit_date = submit_date if submit_date else datetime.now()
        cloud = cloud_input['cloud']

        #create list of Synonym objects
        for cloud_item in cloud:
            key += 1

            for syn_item in cloud_item['syn_list']:
                synonym = Synonym(
                    problem_id= problem_id,
                    problem_word_index = key,
                    problem_word_form = cloud_item['sentence_word'],
                    word_abstraction = syn_item['abstraction_level'],
                    word_form = syn_item['word'],
                    word_lemma = syn_item['lemma'],
                    word_sense = syn_item['sense'],
                    user = user,
                    trial = trial,
                    submit_date = submit_date
                )
                #synonym.save()
                synonyms.append(synonym)

        #batch save
        cls.objects.bulk_create(synonyms)

    class Meta:
        managed = True #let migrations create the table if it doesn't exist
        db_table = 'wc_synonyms'    

class Word():
    """
    RB 07/06/2016: surface_form should be required after we have some data.
    Attributes:
        surface_form: word forms as it appears in a problem (optional)
        sense: Synset name to represent a specific word sense
        sense_number: The sense number from 'sense'
        pos: The POS from 'sense'
        lemma: The base form to represent a lexeme.
        brothers: "Lemmas" returned by wordnet. "Brother" lexical forms
        hypernyms: List of hypernym Word objects (optional)
    """

    def __init__(self, rep_str, surface_form='', search_form='', get_hypernyms=False):

        if rep_str:
            synset = wordnet.synset(rep_str)
            self.sense = synset.name()
            self.pos = synset.pos()
            self.sense_number = synset.name().split('.')[-1]
            self.brothers = synset.lemma_names()
            self.brothers = [brother.replace("_", " ") for brother in self.brothers]
            if type(search_form) is str and len(search_form) > 0:
                self.lemma = search_form
                self.surface_form = surface_form
            elif type(surface_form) is str and len(surface_form) > 0:
                self.lemma = WordNetLemmatizer().lemmatize(surface_form, self.pos)
                self.surface_form = surface_form
            else:
                self.lemma = self.brothers[0]
                self.surface_form = self.lemma

            if get_hypernyms:
                self.__set_all_hypernyms(synset)
        else:
            self.surface_form = surface_form
            self.lemma = WordNetLemmatizer().lemmatize(surface_form)
            self.sense = None
            self.pos = None
            self.sense_number = None
            self.brothers = None

    """
    This will retrieve all hypernyms for a word.
    """
    def __set_all_hypernyms(self, synset):
        hyper_func = lambda x: x.hypernyms()
        self.hypernyms = [Word(hypernym.name()) for hypernym in synset.closure(hyper_func)]

class WordSense():
    """
    surface_form: The word form of a word as it appears in a problem.
    search_form: The word form (lemma derived from surface_form) used to search WordNet
    senses: List of Word objects for each word sense (via WordNet) of the lemma in search_form
    """
    def __init__(self, surface_form, get_hypernyms=False):
        lemmatizer = WordNetLemmatizer()
        lemma = lemmatizer.lemmatize(surface_form)
        self.surface_form = surface_form
        self.search_form = lemma
        self.__set_senses(lemma, get_hypernyms)

    def __set_senses(self, lemma, get_hypernyms):
        synsets = wordnet.synsets(lemma)
        if len(synsets) < 1:
            self.senses = []
        else:
            self.senses = [Word(synset.name(), surface_form = self.surface_form, search_form = lemma, get_hypernyms=get_hypernyms) for synset in synsets]
