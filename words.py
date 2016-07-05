from nltk.corpus import wordnet
from nltk.stem.wordnet import WordNetLemmatizer
from rest_framework import serializers

class WordSerializer(serializers.Serializer):
    surface_form = serializers.CharField(required=False)
    sense = serializers.CharField()
    sense_number = serializers.IntegerField()
    pos = serializers.CharField()
    lemma = serializers.CharField()
    wordnet_lemmas = serializers.ListField()

class WordExtendedSerializer(WordSerializer):
    hypernyms = WordSerializer(many=True, required=False)

class WordSenseSerializer(serializers.Serializer):
    lemma = serializers.CharField()
    senses = WordSerializer(many=True)

"""
Add properties and methods to modify those properties as needed.
Ex. Could probably use transitive closures or root_hypernyms to get more hypernyms.
"""

class Word():
    """
    Attributes:
        surface_form: word as it appears in a problem (optional)
        sense: Synset name to represent a specific word sense
        sense_number: The sense number from 'sense'
        pos: The POS from 'sense'
        lemma: The base form of the word.
        wordnet_lemmas: Lemmas returned by wordnet
        hypernyms: List of hypernym Word objects (optional)
    """

    def __init__(self, rep_str, surface_form=None, get_hypernyms=False):
        synset = wordnet.synset(rep_str)

        self.sense = synset.name()
        self.pos = synset.pos()
        self.sense_number = synset.name().split('.')[-1]
        #self.wordnet_lemmas = [lemma.name() for lemma in synset.lemmas()]
        self.wordnet_lemmas = synset.lemma_names()
        if type(surface_form) is str and len(surface_form) > 0:
            lemmatizer = WordNetLemmatizer()
            self.lemma = lemmatizer.lemmatize(lemma)
            self.surface_form = surface_form
        else:
            self.lemma = self.wordnet_lemmas[0]
            self.surface_form = self.lemma

        if get_hypernyms:
            self.__set_all_hypernyms(synset)

    """
    This will retrieve all hypernyms for a word.
    """
    def __set_all_hypernyms(self, synset):
        hyper_func = lambda x: x.hypernyms()
        self.hypernyms = [Word(hypernym.name()) for hypernym in synset.closure(hyper_func)]

class WordSense():
    """

    """
    def __init__(self, surface_form):
        lemmatizer = WordNetLemmatizer()
        lemma = lemmatizer.lemmatize(surface_form)
        self.lemma = lemma
        self.__set_senses()

    def __set_senses(self):
        synsets = wordnet.synsets(self.lemma)
        self.senses = [Word(synset.name()) for synset in synsets]
