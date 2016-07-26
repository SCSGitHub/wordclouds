from gensim import corpora, models as gensim_models, similarities
from django.db import models
from .models import Problem
import logging

"""
Modeling the data
"""
class TfIdf():

    def __init__(self,problems):

        #filter out stopwords here, if we want to

        #sample
        #problems = [["problem", "number", "one"],["problem", "number", "two"],["problem","three"], ['one', 'number']]

        #this dictionary lists each unique word with its word_id
        self.dictionary = corpora.Dictionary(problems) #eg {'an': 0, 'many': 1}

        #corpus is a list of vectors, each representing the frequency of each word [by id] in a problem
        self.corpus = [self.dictionary.doc2bow(problem) for problem in problems]

        #generate the tfidf index, which will be queried against input vectors
        self.tfidf_model = gensim_models.TfidfModel(self.corpus)
        corpus_tfidf = self.tfidf_model[self.corpus]
        self.index = similarities.MatrixSimilarity(corpus_tfidf)

    def query(self, problem): #problem: ["list", "of", "words", "words"]
        input_vector = self.dictionary.doc2bow(problem) #create vector like [ [0,1], [2,1], [4,2]]
        vec_tfidf = self.tfidf_model[input_vector]
        sims = self.index[vec_tfidf]
        sims = sorted(enumerate(sims), key=lambda item: -item[1]) #[(1, 0.95783591), (3, 0.17758316),...]
        #sims = dict(sims)

        #sims is a sorted list (highest to lowest) of the vectors which
        return sims

    def query_dict(self, problem):
        results = self.query(problem)
        results_dict = {}

        #convert to dict with turk_id's as the keys
        for result in results:
            problem = Problem.objects.get(id=result[0]+1)
            results_dict[problem.turk_id] = result[1]

        return results_dict

class LSI():

    def __init__(self, problems, num_topics):

        #this dictionary lists each unique word with its word_id
        self.dictionary = corpora.Dictionary(problems) #eg {'an': 0, 'many': 1}

        #corpus is a list of vectors, each representing the frequency of each word [by id] in a problem
        self.corpus = [self.dictionary.doc2bow(problem) for problem in problems]

        #preprocess with tfidf
        self.tfidf_model = gensim_models.TfidfModel(self.corpus)
        corpus_tfidf = self.tfidf_model[self.corpus]

        #generate the lsi index, which will be queried against input vectors
        self.lsi_model = gensim_models.lsimodel.LsiModel(corpus=corpus_tfidf, id2word=self.dictionary, num_topics=num_topics)
        corpus_lsi = self.lsi_model[self.corpus]
        self.index = similarities.MatrixSimilarity(corpus_lsi)

    def query(self, problem): #problem: ["list", "of", "words", "words"]
        input_vector = self.dictionary.doc2bow(problem) #create vector like [ [0,1], [2,1], [4,2]]
        vec_lsi = self.lsi_model[input_vector]
        sims = self.index[vec_lsi]
        sims = sorted(enumerate(sims), key=lambda item: -item[1]) #[(1, 0.95783591), (3, 0.17758316),...]

        #sims is a sorted list (highest to lowest) of the vectors which
        return sims

    def query_dict(self, problem):
        results = self.query(problem)
        results_dict = {}

        #convert to dict with turk_id's as the keys
        for result in results:
            problem = Problem.objects.get(id=result[0]+1)
            results_dict[problem.turk_id] = result[1]

        return results_dict
