from gensim import corpora, models as gensim_models, similarities
from django.db import models
from .models import Problem
import logging

"""
Modeling the data
"""

class DocumentModeling():
    def query(self, problem):
        input_vector = self.dictionary.doc2bow(problem) #create vector like [ [0,1], [2,1], [4,2]]
        vec_model = self.model[input_vector]
        sims = self.index[vec_model]
        sims = sorted(enumerate(sims), key=lambda item: -item[1]) #[(1, 0.95783591), (3, 0.17758316),...]

        return sims

    def query_dict(self, problem):
        results = self.query(problem)
        results_dict = {}

        #convert to dict with turk_id's as the keys
        for result in results:
            problem = Problem.objects.get(id=result[0]+1)
            results_dict[problem.turk_id] = result[1]

        return results_dict


class TfIdf(DocumentModeling):

    def __init__(self,problems):

        #this dictionary lists each unique word with its word_id
        self.dictionary = corpora.Dictionary(problems) #eg {'an': 0, 'many': 1}

        #corpus is a list of vectors, each representing the frequency of each word [by id] in a problem
        self.corpus = [self.dictionary.doc2bow(problem) for problem in problems]

        #generate the tfidf index, which will be queried against input vectors
        self.model = gensim_models.TfidfModel(self.corpus)
        tfidf_corpus = self.model[self.corpus]
        self.index = similarities.MatrixSimilarity(tfidf_corpus)

class LSI(DocumentModeling):

    def __init__(self, problems, num_topics):

        #this dictionary lists each unique word with its word_id
        self.dictionary = corpora.Dictionary(problems) #eg {'an': 0, 'many': 1}

        #corpus is a list of vectors, each representing the frequency of each word [by id] in a problem
        self.corpus = [self.dictionary.doc2bow(problem) for problem in problems]

        #preprocess with tfidf
        tfidf_model = gensim_models.TfidfModel(self.corpus)
        tfidf_corpus = tfidf_model[self.corpus]

        #generate the lsi index, which will be queried against input vectors
        self.model = gensim_models.lsimodel.LsiModel(corpus=tfidf_corpus, id2word=self.dictionary, num_topics=num_topics)
        lsi_corpus = self.model[self.corpus]
        self.index = similarities.MatrixSimilarity(lsi_corpus)
