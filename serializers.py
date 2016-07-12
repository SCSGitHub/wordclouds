from rest_framework import serializers
from .models import *

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

class ProblemSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    desc = serializers.CharField()
    words = WordSenseSerializer(many=True)
