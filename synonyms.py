from nltk.corpus import wordnet
from rest_framework import serializers

class SynonymSerializer(serializers.Serializer):
    lemmas = serializers.ListField()
    hypernyms = serializers.ListField()
    hyponyms = serializers.ListField()
    inherited_hypernyms = serializers.ListField()
    inherited_hyponyms = serializers.ListField()
    sisters = serializers.ListField()

"""
Add properties and methods to modify those properties as needed.
Ex. Could probably use transitive closures or root_hypernyms to get more hypernyms.
"""

class Synonym():
    lemmas = []
    hypernyms = []
    hyponyms = []
    inherited_hypernyms = [] #2nd level only
    inherited_hyponyms = [] #2nd level only
    sisters = []

    def __init__(self, rep_str):
        synset = wordnet.synset(rep_str)

        self.lemmas = self.get_nym_names(synset, sort=True)
        self.hypernyms = self.get_nym_names(synset, 'hypernyms', sort=True)
        self.hyponyms = self.get_nym_names(synset, 'hyponyms', sort=True)
        self.inherited_hypernyms = self.get_nested_nym_names(synset, 'hypernyms', sort=True)
        self.inherited_hyponyms = self.get_nested_nym_names(synset, 'hyponyms', sort=True)
        self.sisters = self.get_nym_names(synset, 'sisters', sort=True)

    def get_nym_names(self, synset, synset_relationship = '', sort=False):
        nyms = []
        if synset_relationship == 'hypernyms':
            s_set = synset.hypernyms()
        elif synset_relationship == 'hyponyms':
            s_set = synset.hyponyms()
        elif synset_relationship == 'sisters':
            s_set = [sister for hypernyms in synset.hypernyms() for sister in hypernyms.hyponyms() if sister != synset]
        elif isinstance(synset,(list, tuple, set, dict)):
            s_set = synset
        else:
            s_set = [synset]

        for item in s_set:
            for lemma in item.lemmas():
                #print(lemma.name().replace("_", " "))
                nyms.append(lemma.name().replace("_", " "))

        if sort:
            nyms.sort(key=str.lower)
        return nyms

    def get_nested_nym_names(self, synset, synset_relationship='hypernyms', sort=False):
        initial_call_nyms = getattr(synset, synset_relationship)
        s_set = initial_call_nyms()
        nyms_of_nyms = []

        for item in s_set:
            call_nyms = getattr(item, synset_relationship)
            if len(call_nyms()) > 0:
                for nested_hyp in call_nyms():
                    nyms_of_nyms.append(nested_hyp)

        nyms_of_nyms_names = self.get_nym_names(nyms_of_nyms)
        if sort:
            nyms_of_nyms_names.sort(key=str.lower)
        return nyms_of_nyms_names
