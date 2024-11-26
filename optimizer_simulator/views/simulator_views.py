from django.http import JsonResponse, HttpResponse, Http404
from django.conf import settings
from django.shortcuts import render, redirect
from ..models import UploadedFile
from optimizer_simulator.utils.optimizer import NFL_Optimizer
import pandas as pd
import os
import logging
import glob
import json

logger = logging.getLogger(__name__)