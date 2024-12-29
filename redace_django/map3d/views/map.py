from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from accounts.models import Project


@login_required
def default(request):
    user = request.user
    projects = Project.objects.filter(member=user).values_list('name', flat=True)

    context = {
        'username': user.username,
        'projects': list(projects),
    }
    return render(request, 'map3d/index.html', context)