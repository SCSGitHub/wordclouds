# -*- coding: utf-8 -*-
# Generated by Django 1.9.6 on 2016-07-19 20:27
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('wordclouds', '0003_auto_20160719_1953'),
    ]

    operations = [
        migrations.AddField(
            model_name='problem',
            name='completions',
            field=models.IntegerField(default=0),
        ),
    ]