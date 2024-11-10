import os
import errno
import requests
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.forms import UserCreationForm
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from .forms import CustomUserCreationForm, ProjectCreationForm, ProjectJoinForm
from .models import Project
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password, check_password

# ログイン画面の制御関数
def login_view(request):
    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return redirect('home')
        else:
            messages.error(request, 'Invalid username or password')
    return render(request, 'accounts/login.html')

# ログアウト時の関数
def logout_view(request):
    logout(request)
    jupyterhub_logout_url = "http://192.168.1.53:7010/hub/logout"
    try:
        requests.get(jupyterhub_logout_url, timeout=5)
    except requests.RequestException:
        pass
    return redirect('login')

# サインインの際の画面制御関数
def signup_view(request):
    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, 'Create your account perfectly')
            return redirect('login')
    else:
        form = CustomUserCreationForm()
    return render(request, 'accounts/signup.html', {'form': form})

# ログイン後に行ける画面制御関数
@login_required
def users_home(request):
    projects = Project.objects.filter(member=request.user)
    return render(request, 'home.html', {'projects': projects})

# ログインアウト前に移動する画面制御関数
@login_required
def logout_confirm(request):
    return render(request, 'accounts/logout.html')

# JupyterHub用のディレクトリ作成関数
def create_jupyter_dir(parent_dir, dir_name):
    parent_dir = f"/data/{parent_dir}"
    try:
        os.makedirs(f"{parent_dir}/{dir_name}", exist_ok=True)
    except OSError as e:
        if e.errno != errno.EEXIST:
            raise

# プロジェクト作成の関数
@login_required
def create_project(request):
    if request.method == 'POST':
        form = ProjectCreationForm(request.POST)
        if form.is_valid():
            name = form.cleaned_data['name']
            if Project.objects.filter(name=name).exists():
                messages.error(request, 'This project already exists')
            else:
                password = form.cleaned_data['password']
                password_hash = make_password(password)
                project = Project(name=name, password=password_hash)
                project.save()
                project.admin.add(request.user)
                project.member.add(request.user)

                # JupyterHub用ディレクトリ作成
                create_jupyter_dir('groups', name)
                create_jupyter_dir('users', request.user.username)

                # シンボリックリンク作成
                user_dir = f"/data/users/{request.user.username}"
                link_path = f"{user_dir}/{name}"
                if not os.path.exists(link_path):  # リンクが存在しない場合のみ作成
                    os.symlink(f"/data/groups/{name}", link_path)

                messages.success(request, 'Create new project')
                return redirect('home')
    else:
        form = ProjectCreationForm()
    return render(request, 'accounts/create_project.html', {'form': form})

# プロジェクト参加の関数
@login_required
def join_project(request):
    if request.method == 'POST':
        form = ProjectJoinForm(request.POST)
        if form.is_valid():
            name = form.cleaned_data['name']
            password = form.cleaned_data['password']
            try:
                project = Project.objects.get(name=name)
                if project.member.filter(id=request.user.id).exists():
                    messages.info(request, 'You have already joined this project.')
                elif check_password(password, project.password):
                    project.member.add(request.user)

                    # JupyterHub用ディレクトリ作成とシンボリックリンク作成
                    create_jupyter_dir('users', request.user.username)
                    user_dir = f"/data/users/{request.user.username}"
                    link_path = f"{user_dir}/{name}"
                    if not os.path.exists(link_path):  # リンクが存在しない場合のみ作成
                        os.symlink(f"/data/groups/{name}", link_path)

                    messages.success(request, 'You participate in the project')
                    return redirect('home')
                else:
                    messages.error(request, 'Mistake password')
            except Project.DoesNotExist:
                messages.error(request, 'This project does not exist')
    else:
        form = ProjectJoinForm()
    return render(request, 'accounts/join_project.html', {'form': form})
