# -*- coding: utf-8 -*-
# Generated by Django 1.9.6 on 2016-07-15 16:03
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('wordclouds', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Feedback',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('user', models.CharField(blank=True, max_length=100, null=True)),
                ('trial', models.IntegerField(null=True)),
                ('task', models.CharField(max_length=20)),
                ('problem_id', models.IntegerField(null=True)),
                ('text', models.TextField(blank=True, null=True)),
                ('submit_date', models.DateTimeField(null=True)),
            ],
            options={
                'db_table': 'wc_feedback',
                'managed': True,
            },
        ),
    ]