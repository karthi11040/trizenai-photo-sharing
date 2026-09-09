from django import forms
from django.contrib.auth.models import User
from accounts.models import Profile, Role, MemberStatus


class RegisterForm(forms.ModelForm):
    """
    Public registration form.
    Strictly creates TEAM_MEMBER accounts only.
    No role selector is exposed or accepted from client input.
    """
    first_name = forms.CharField(
        label="First Name",
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'First Name (e.g. Alex)',
            'autocomplete': 'given-name',
            'style': 'border-radius: 10px; min-height: 44px;'
        })
    )
    last_name = forms.CharField(
        label="Last Name",
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Last Name (e.g. Kumar)',
            'autocomplete': 'family-name',
            'style': 'border-radius: 10px; min-height: 44px;'
        })
    )
    password = forms.CharField(
        label="Password",
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'Create a strong password (min 8 chars)',
            'autocomplete': 'new-password',
            'style': 'border-radius: 10px; min-height: 44px;'
        }),
        min_length=8
    )
    confirm_password = forms.CharField(
        label="Confirm Password",
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'Repeat password',
            'autocomplete': 'new-password',
            'style': 'border-radius: 10px; min-height: 44px;'
        })
    )

    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name']
        widgets = {
            'username': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Enter your username',
                'autocomplete': 'username',
                'style': 'border-radius: 10px; min-height: 44px;'
            }),
            'email': forms.EmailInput(attrs={
                'class': 'form-control',
                'placeholder': 'name@example.com',
                'autocomplete': 'email',
                'style': 'border-radius: 10px; min-height: 44px;'
            }),
        }

    def clean_username(self):
        username = self.cleaned_data.get('username')
        if User.objects.filter(username__iexact=username).exists():
            raise forms.ValidationError("A user with that username already exists.")
        return username

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if email and User.objects.filter(email__iexact=email).exists():
            raise forms.ValidationError("A user with that email already exists.")
        return email

    def clean(self):
        cleaned_data = super().clean()
        username = cleaned_data.get('username')
        email = cleaned_data.get('email')
        password = cleaned_data.get('password')
        confirm_password = cleaned_data.get('confirm_password')

        if password:
            try:
                from accounts.validators import validate_strong_password
                validate_strong_password(password, username=username, email=email)
            except forms.ValidationError as e:
                for error_msg in e.messages:
                    self.add_error('password', error_msg)

        if password and confirm_password and password != confirm_password:
            self.add_error('confirm_password', "Passwords do not match.")

        return cleaned_data

    def save(self, commit=True):
        """
        Saves the user with hashed password and strictly enforces TEAM_MEMBER role.
        """
        user = super().save(commit=False)
        user.set_password(self.cleaned_data['password'])
        if commit:
            user.save()
            profile, _ = Profile.objects.get_or_create(user=user)
            profile.role = Role.TEAM_MEMBER
            profile.status = MemberStatus.ACTIVE
            profile.save()
        return user


class LoginForm(forms.Form):
    """
    Standard session login form supporting Username or Email.
    """
    username = forms.CharField(
        label="Email or Username",
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'name@example.com or username',
            'autocomplete': 'username',
            'style': 'border-radius: 10px; min-height: 44px;'
        })
    )
    password = forms.CharField(
        label="Password",
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'Enter your password',
            'autocomplete': 'current-password',
            'style': 'border-radius: 10px; min-height: 44px;'
        })
    )
    remember_me = forms.BooleanField(
        label="Remember me",
        required=False,
        widget=forms.CheckboxInput(attrs={
            'class': 'form-check-input',
            'style': 'width: 18px; height: 18px; cursor: pointer;'
        })
    )


class AddAdminForm(forms.Form):
    """
    Admin-only protected form for creating another Administrator.
    Role is fixed to Role.ADMIN on the server side.
    """
    first_name = forms.CharField(
        label="First Name",
        required=True,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'e.g. Maya',
            'style': 'border-radius: 10px; min-height: 44px;'
        })
    )
    last_name = forms.CharField(
        label="Last Name",
        required=True,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'e.g. Lin',
            'style': 'border-radius: 10px; min-height: 44px;'
        })
    )
    email = forms.EmailField(
        label="Email Address",
        required=True,
        widget=forms.EmailInput(attrs={
            'class': 'form-control',
            'placeholder': 'maya@trizenai.studio',
            'style': 'border-radius: 10px; min-height: 44px;'
        })
    )
    phone_number = forms.CharField(
        label="Phone Number",
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': '+1 (555) 000-0000',
            'style': 'border-radius: 10px; min-height: 44px;'
        })
    )


class AccountActivationForm(forms.Form):
    """
    Form for invited team members activating their account via secure token.
    Role is permanently fixed to TEAM_MEMBER.
    """
    first_name = forms.CharField(
        label="First Name",
        required=True,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'First Name',
            'style': 'border-radius: 10px; min-height: 44px;'
        })
    )
    last_name = forms.CharField(
        label="Last Name",
        required=True,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Last Name',
            'style': 'border-radius: 10px; min-height: 44px;'
        })
    )
    password = forms.CharField(
        label="Create Password",
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'Minimum 8 characters',
            'style': 'border-radius: 10px; min-height: 44px;'
        }),
        min_length=8
    )
    confirm_password = forms.CharField(
        label="Confirm Password",
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'Confirm your password',
            'style': 'border-radius: 10px; min-height: 44px;'
        })
    )

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get('password')
        confirm_password = cleaned_data.get('confirm_password')

        if password and confirm_password and password != confirm_password:
            self.add_error('confirm_password', "Passwords do not match.")

        if password:
            try:
                from accounts.validators import validate_strong_password
                validate_strong_password(password)
            except forms.ValidationError as e:
                for error_msg in e.messages:
                    self.add_error('password', error_msg)

        return cleaned_data


class ChangePasswordForm(forms.Form):
    """
    Standard in-app password change form for authenticated users.
    """
    current_password = forms.CharField(
        label="Current Password",
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'Enter your current password',
            'style': 'border-radius: 10px; min-height: 44px;'
        })
    )
    new_password = forms.CharField(
        label="New Password",
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'Minimum 8 characters',
            'style': 'border-radius: 10px; min-height: 44px;'
        }),
        min_length=8
    )
    confirm_new_password = forms.CharField(
        label="Confirm New Password",
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'Repeat new password',
            'style': 'border-radius: 10px; min-height: 44px;'
        })
    )

    def clean(self):
        cleaned_data = super().clean()
        new_password = cleaned_data.get('new_password')
        confirm_new_password = cleaned_data.get('confirm_new_password')

        if new_password and confirm_new_password and new_password != confirm_new_password:
            self.add_error('confirm_new_password', "New passwords do not match.")

        if new_password:
            try:
                from accounts.validators import validate_strong_password
                validate_strong_password(new_password)
            except forms.ValidationError as e:
                for error_msg in e.messages:
                    self.add_error('new_password', error_msg)

        return cleaned_data
