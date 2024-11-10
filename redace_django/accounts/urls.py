from django.urls import path,include
from . import views

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('signup/', views.signup_view, name='signup'),
    path('logout-confirm/', views.logout_confirm, name='logout_confirm'),
    
    path('home/', views.users_home, name='home'),
    path('project/create/', views.create_project, name='create_project'),
    path('project/join/', views.join_project, name='join_project'),
]
