from __future__ import unicode_literals
from django.db import models
from nltk.corpus import wordnet
from nltk.stem.wordnet import WordNetLemmatizer

class Synonym(models.Model):
    id = models.IntegerField(primary_key=True)
    problem_id = models.IntegerField()
    problem_word_id = models.IntegerField()
    problem_word_form = models.CharField(max_length=50)
    word_abstraction = models.CharField(max_length=10, blank=True, null=True)
    word_form = models.CharField(max_length=50)
    word_lemma = models.CharField(max_length=50, blank=True, null=True)
    word_sense = models.CharField(max_length=50, blank=True, null=True)

    def __str__(self):
        return ""
        #return "{{id: {}, source: {}, target: {}}}".format(self.id, self.source_node_id, self.target_node_id)

    class Meta:
        managed = True #let migrations create the table if it doesn't exist
        db_table = 'wc_synonyms'

class Problem():
    """
    Attributes:
        id: identifier for the problem
        desc: string of the full problem description
        words: array of word objects in the order as they appear in desc
    """

    """
    Temporary test problem. These will be pulled from the DB once we have data.
    """
    def __init__(self, id):

        self.id = id

        #get desc. would pull form DB
        if id == 1:
            self.desc = "selecting colors that evoke semantics to represent data"
        elif id == 2:
            self.desc = "grayscaling color reduce saliency of object regions in image"
        elif id == 3:
            self.desc = "person perceives personalities that differ when reading typefaces"
        elif id == 4:
            self.desc = "properties of clothing affect how people perceive another person's height"
        else:
            self.desc = ""

        #split desc into words
        word_forms = self.desc.split(" ")

        #get lemma forms of words
        lemmatizer = WordNetLemmatizer()
        lemmas = {form: lemmatizer.lemmatize(form) for form in word_forms}

        #get the word senses
        #senses = {form: wordnet.synsets(lemma) for form, lemma in lemmas.items()}
        #senses = {'selecting': 'select.v.01', 'colors': 'color.n.01', 'that': '', 'resonate': 'evoke.v.01',
        #    'semantics': 'semantics.n.02', 'to': '', 'represent':'represent.v.02', 'data': 'data.n.01'}

        #construct array of word objects based on senses
        self.__get_word_senses(word_forms)

    """
    Return a list of Word objects for a problem
    @type senses: list
    @param senses: The word senses to pull for each word object in WordNet
    """
    def __get_word_senses(self, word_forms):
        self.words = [WordSense(form, get_hypernyms=True) for form in word_forms]

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

    def __init__(self, rep_str, surface_form='', get_hypernyms=False):
        lemmatizer = WordNetLemmatizer()

        if rep_str:
            synset = wordnet.synset(rep_str)
            self.sense = synset.name()
            self.pos = synset.pos()
            self.sense_number = synset.name().split('.')[-1]
            #self.brothers = [lemma.name() for lemma in synset.lemmas()]
            self.brothers = synset.lemma_names()
            self.brothers = [brother.replace("_", " ") for brother in self.brothers]
            if type(surface_form) is str and len(surface_form) > 0:
                self.lemma = lemmatizer.lemmatize(surface_form, self.pos)
                self.surface_form = surface_form
            else:
                self.lemma = self.brothers[0]
                self.surface_form = self.lemma

            if get_hypernyms:
                self.__set_all_hypernyms(synset)
        else:
            self.surface_form = surface_form
            self.lemma = lemmatizer.lemmatize(surface_form)
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
            self.senses = [Word(synset.name(), surface_form = self.surface_form, get_hypernyms=get_hypernyms) for synset in synsets]
