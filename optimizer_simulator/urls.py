from django.urls import path
from .views import (
    upload_file,
    run_optimizer_view,
    download_output_view,
    lineups_table_view,
    get_players,
)

urlpatterns = [
    path('', upload_file, name='upload_file'),
    path('upload/', upload_file, name='upload_file'),
    path('run_optimizer/', run_optimizer_view, name='run_optimizer'),
    path('download/<path:output_file>/', download_output_view, name='download_output'),
    path('lineups/', lineups_table_view, name='lineups_table'),
    path('get_players/', get_players, name='get_players'),
]
