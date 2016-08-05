from gensim import corpora, models as gensim_models, similarities
from django.db import models
from nltk.corpus import stopwords
from nltk.stem.porter import PorterStemmer
from .models import Problem
import logging, string

"""
Modeling the data
"""

logger = logging.getLogger(__name__)

class DocumentModeling():
    def __init__(self):
        """
        Prepare instance vars to be reused by child classes
        """
        self.filter_chars = string.punctuation + "“”";
        self.stemmer = PorterStemmer()

    def prepare_words_from_list(self, problem_word_list):
        """
        Arguments:
        problem_word_list: list(list(str))
        """

        for problem_index, word_list in enumerate(problem_word_list):
            word_list = [word for word in word_list if word not in stopwords.words('english')]
            for word_index, word in enumerate(word_list):
                word = word.lower()
                punc_replace = word.maketrans({key: None for key in self.filter_chars})
                word = word.translate(punc_replace)
                word_list[word_index] = self.stemmer.stem(word)
            problem_word_list[problem_index] = word_list

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
        """
        Arguments:
            problems: list of words per problem (list(list(str)))
        """
        super().__init__()
        super().prepare_words_from_list(problems)

        #global logger
        #logger.debug("Excerpt of problem words stemmed: {}".format(problems[1]))

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
        """
        Arguments:
            problems: list of words per problem (list(list(str)))
        """

        super().__init__()
        super().prepare_words_from_list(problems)

        #global logger
        #logger.debug("Excerpt of problem words stemmed: {}".format(problems[1]))

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
