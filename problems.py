from rest_framework import serializers
from nltk.stem.wordnet import WordNetLemmatizer
from .words import *

class ProblemSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    desc = serializers.CharField()
    words = WordSenseSerializer(many=True)

"""
Add properties and methods to modify those properties as needed.
"""

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
        self.desc = "selecting colors that evoke semantics to represent data"

        #split desc into words
        word_forms = self.desc.split(" ")

        #get lemma forms of words
        lemmatizer = WordNetLemmatizer()
        lemmas = {form: lemmatizer.lemmatize(form) for form in word_forms}

        #get the word senses
        #senses = {form: wordnet.synsets(lemma) for form, lemma in lemmas.items()}
        senses = {'selecting': 'select.v.01', 'colors': 'color.n.01', 'that': '', 'resonate': 'evoke.v.01',
            'semantics': 'semantics.n.02', 'to': '', 'represent':'represent.v.02', 'data': 'data.n.01'}

        #construct array of word objects based on senses
        self.__get_word_senses(word_forms)

    """
    Return a list of Word objects for a problem
    @type senses: list
    @param senses: The word senses to pull for each word object in WordNet
    """
    def __get_word_senses(self, word_forms):
        self.words = [WordSense(form, get_hypernyms=True) for form in word_forms]
