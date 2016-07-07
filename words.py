from nltk.corpus import wordnet
from nltk.stem.wordnet import WordNetLemmatizer
from rest_framework import serializers

class WordSerializer(serializers.Serializer):
    surface_form = serializers.CharField(required=False)
    sense = serializers.CharField(required=False)
    sense_number = serializers.IntegerField(required=False)
    pos = serializers.CharField(required=False)
    lemma = serializers.CharField(required=False)
    brothers = serializers.ListField(required=False)

class WordExtendedSerializer(WordSerializer):
    hypernyms = WordSerializer(many=True, required=False)

class WordSenseSerializer(serializers.Serializer):
    surface_form = serializers.CharField()
    search_form = serializers.CharField()
    senses = WordExtendedSerializer(many=True)

"""
Add properties and methods to modify those properties as needed.
"""

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
