from gensim import corpora, models, similarities
#from .models import *

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
        self.tfidf_model = models.TfidfModel(self.corpus)
        corpus_tfidf = self.tfidf_model[self.corpus]
        self.index = similarities.MatrixSimilarity(corpus_tfidf)

    def query(self, problem): #problem: ["list", "of", "words", "words"]
        input_vector = self.dictionary.doc2bow(problem) #create vector like [ [0,1], [2,1], [4,2]] 
        vec_tfidf = self.tfidf_model[input_vector]
        sims = self.index[vec_tfidf]
        sims = sorted(enumerate(sims), key=lambda item: -item[1]) #[(1, 0.95783591), (3, 0.17758316),...]

        #sims is a sorted list (highest to lowest) of the vectors which 
        return sims  

class LSI():

    def __init__(self, problems):

        #this dictionary lists each unique word with its word_id 
        self.dictionary = corpora.Dictionary(problems) #eg {'an': 0, 'many': 1}

        #corpus is a list of vectors, each representing the frequency of each word [by id] in a problem
        self.corpus = [self.dictionary.doc2bow(problem) for problem in problems]

        #LSA with 200 dimensions is reasonable naive starting point. may want to allow for variable parameters in future, but this should be good for now.
        #generate the lsi index, which will be queried against input vectors
        self.lsi_model = models.lsimodel.LsiModel(corpus=self.corpus, id2word=self.dictionary, num_topics=200)
        corpus_lsi = self.lsi_model[self.corpus]
        self.index = similarities.MatrixSimilarity(corpus_lsi)

    def query(self, problem): #problem: ["list", "of", "words", "words"]
        input_vector = self.dictionary.doc2bow(problem) #create vector like [ [0,1], [2,1], [4,2]] 
        vec_lsi = self.lsi_model[input_vector]
        sims = self.index[vec_lsi]
        sims = sorted(enumerate(sims), key=lambda item: -item[1]) #[(1, 0.95783591), (3, 0.17758316),...]

        #sims is a sorted list (highest to lowest) of the vectors which 
        return sims  