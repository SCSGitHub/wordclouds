"""companalogy URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/1.9/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  url(r'^$', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  url(r'^$', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.conf.urls import url, include
    2. Add a URL to urlpatterns:  url(r'^blog/', include('blog.urls'))
"""
from django.conf.urls import url
from . import views

app_name = 'wordclouds'
urlpatterns = [
    url(r'^$', views.index, name='index'),
    url(r'^cloud/$', views.cloud, name='cloud'),
    url(r'^cloud_training/?$', views.cloud_training, name='cloud_training'),
    url(r'^username/$', views.username, name='username'),
    url(r'^send_username/?$', views.send_username, name='send_username'),
    url(r'^user_feedback/?$', views.user_feedback, name='user_feedback'),
    url(r'^problem/(?P<problem_id>\d+)?$', views.fetch_problem, name='problem'),
    url(r'^submit/?$', views.submit, name='submit'),
    url(r'^completed_cloud/?$', views.completed_cloud, name='completed_cloud'),
    url(r'^synonyms/(?P<word>[\w\d._-]+)?$', views.fetch_synonyms, name='synonyms'),
    url(r'^word/(?P<word>[\w\d._-]+)?$', views.fetch_word, name='word'),
    url(r'^word_senses/(?P<word>[\w\d._-]+)?$', views.fetch_word_senses, name='word_senses'),
    url(r'^results/?$', views.results, name='results'),
    url(r'^tfidf/?$', views.tfidf, name='tfidf'),
]
