from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User

# アカウント作成時に使用するクラス
class CustomUserCreationForm(UserCreationForm):
    username = forms.CharField(
        label='Username:',
        max_length=20,
        # help_text='',
        widget=forms.TextInput(attrs={'placeholder': 'Username'})
    )
    password1 = forms.CharField(
        label='Password:',
        # max_length=30,
        min_length=8,
        help_text=(
            "<ul><li>Your password can't be too similar to your other personal information.</li>"
            "<li>Your password must contain at least 8 characters.</li>"
            "<li>Your password can't be a commonly used password.</li>"
            "<li>Your password can't be entirely numeric.</li></ul>"
        ),
        widget=forms.PasswordInput(attrs={'placeholder': 'Password'})
    )
    password2 = forms.CharField(
        label='Password(again):',
        # max_length=30,
        min_length=8,
        help_text='',
        widget=forms.PasswordInput(attrs={'placeholder': 'Password(again)'})
    )

    class Meta:
        model = User
        fields = ('username', 'password1', 'password2')


class ProjectCreationForm(forms.Form):
    name = forms.CharField(max_length=20)
    password = forms.CharField(widget=forms.PasswordInput)

class ProjectJoinForm(forms.Form):
    name = forms.CharField(max_length=20)
    password = forms.CharField(widget=forms.PasswordInput)