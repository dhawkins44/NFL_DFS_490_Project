from django.urls import path
from .views import (
    upload_file,
    run_optimizer_view,
    download_output_view,
    lineups_table_view,
    get_players,
    optimizer_stats_view,
    get_optimizer_stats_data,
)

urlpatterns = [
    path('', upload_file, name='upload_file'),
    path('upload/', upload_file, name='upload_file'),
    path('run_optimizer/', run_optimizer_view, name='run_optimizer'),
    path('download/<path:output_file>/', download_output_view, name='download_output'),
    path('lineups/', lineups_table_view, name='lineups_table'),
    path('get_players/', get_players, name='get_players'),
    path('optimizer_stats/', optimizer_stats_view, name='optimizer_stats'),
     path('optimizer_stats/data/', get_optimizer_stats_data, name='optimizer_stats_data'),
]
